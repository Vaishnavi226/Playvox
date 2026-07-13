const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'playvox_super_secret_key_123';

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.static(__dirname));

// Middlware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Optional middleware to decode JWT user if present
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

// --- Auth Endpoints ---

// Signup
app.post('/api/auth/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Check if user already exists
  const existingUser = db.users.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = db.users.create({
    username,
    password: hashedPassword
  });
  
  // Create token
  const token = jwt.sign({ _id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { _id: newUser._id, username: newUser.username } });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const user = db.users.findOne({ username });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  // Create token
  const token = jwt.sign({ _id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { _id: user._id, username: user.username } });
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.users.findOne({ _id: req.user._id });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ _id: user._id, username: user.username });
});

// --- Playlist Endpoints ---

// Create playlist
app.post('/api/playlists', authenticateToken, (req, res) => {
  const { name, description, coverImage, isPublic, songs } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  
  const playlist = db.playlists.create({
    name,
    description: description || '',
    coverImage: coverImage || '',
    isPublic: isPublic !== undefined ? isPublic : true,
    songs: songs || [], // array of song IDs
    owner: req.user._id,
    ownerName: req.user.username
  });
  
  res.status(201).json(playlist);
});

// Get playlists (public + owned private)
app.get('/api/playlists', optionalAuthenticateToken, (req, res) => {
  const allPlaylists = db.playlists.find();
  
  // Filter: show all public playlists, plus owned private ones
  const filtered = allPlaylists.filter(playlist => {
    if (playlist.isPublic) return true;
    if (req.user && playlist.owner === req.user._id) return true;
    return false;
  });
  
  res.json(filtered);
});

// Get single playlist (including detailed song objects)
app.get('/api/playlists/:id', optionalAuthenticateToken, (req, res) => {
  const playlist = db.playlists.findOne({ _id: req.params.id });
  
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  
  // Check authorization for private playlists
  if (!playlist.isPublic) {
    if (!req.user || playlist.owner !== req.user._id) {
      return res.status(403).json({ error: 'Access denied to this private playlist' });
    }
  }
  
  // Resolve song objects from song IDs
  const resolvedSongs = (playlist.songs || [])
    .map(songId => db.songs.findOne({ _id: songId }))
    .filter(Boolean);
  
  res.json({
    ...playlist,
    songs: resolvedSongs
  });
});

// Edit playlist
app.put('/api/playlists/:id', authenticateToken, (req, res) => {
  const { name, description, coverImage, isPublic } = req.body;
  const playlist = db.playlists.findOne({ _id: req.params.id });
  
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  
  // Ensure user owns this playlist
  if (playlist.owner !== req.user._id) {
    return res.status(403).json({ error: 'Unauthorized to edit this playlist' });
  }
  
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (coverImage !== undefined) updates.coverImage = coverImage;
  if (isPublic !== undefined) updates.isPublic = isPublic;
  
  const updatedPlaylist = db.playlists.update(req.params.id, updates);
  res.json(updatedPlaylist);
});

// Delete playlist
app.delete('/api/playlists/:id', authenticateToken, (req, res) => {
  const playlist = db.playlists.findOne({ _id: req.params.id });
  
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  
  // Ensure user owns this playlist
  if (playlist.owner !== req.user._id) {
    return res.status(403).json({ error: 'Unauthorized to delete this playlist' });
  }
  
  db.playlists.delete(req.params.id);
  res.json({ success: true, message: 'Playlist deleted successfully' });
});

// Add song to playlist
app.post('/api/playlists/:id/add-song', authenticateToken, (req, res) => {
  const { songId } = req.body;
  const playlist = db.playlists.findOne({ _id: req.params.id });
  
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  
  if (playlist.owner !== req.user._id) {
    return res.status(403).json({ error: 'Unauthorized to edit this playlist' });
  }
  
  if (!songId) {
    return res.status(400).json({ error: 'Song ID is required' });
  }
  
  // Validate song exists
  const song = db.songs.findOne({ _id: songId });
  if (!song) {
    return res.status(404).json({ error: 'Song not found' });
  }
  
  // Check if song already in playlist
  const songList = playlist.songs || [];
  if (songList.includes(songId)) {
    return res.status(400).json({ error: 'Song already in this playlist' });
  }
  
  songList.push(songId);
  db.playlists.update(req.params.id, { songs: songList });
  
  res.json({ success: true, message: 'Song added to playlist', songs: songList });
});

// Remove song from playlist
app.delete('/api/playlists/:id/remove-song/:songId', authenticateToken, (req, res) => {
  const { songId } = req.params;
  const playlist = db.playlists.findOne({ _id: req.params.id });
  
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  
  if (playlist.owner !== req.user._id) {
    return res.status(403).json({ error: 'Unauthorized to edit this playlist' });
  }
  
  const songList = playlist.songs || [];
  const index = songList.indexOf(songId);
  if (index === -1) {
    return res.status(404).json({ error: 'Song not found in this playlist' });
  }
  
  songList.splice(index, 1);
  db.playlists.update(req.params.id, { songs: songList });
  
  res.json({ success: true, message: 'Song removed from playlist', songs: songList });
});

// --- Song Endpoints ---

// Get all database songs (supports search query)
app.get('/api/songs', (req, res) => {
  const { search } = req.query;
  let songs = db.songs.find();
  
  if (search) {
    const query = search.toLowerCase();
    songs = songs.filter(s => 
      s.songName.toLowerCase().includes(query) || 
      s.songDes.toLowerCase().includes(query) ||
      (s.albumName && s.albumName.toLowerCase().includes(query))
    );
  }
  
  res.json(songs);
});

// Wildcard SPA Fallback Router (serves index.html for frontend routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database and boot up server
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Playvox server booting on port http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
