const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

let data = {
  users: [],
  playlists: [],
  songs: []
};

// Load database from file
function load() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      data = JSON.parse(content);
      // Ensure collections exist
      if (!data.users) data.users = [];
      if (!data.playlists) data.playlists = [];
      if (!data.songs) data.songs = [];
    } catch (e) {
      console.error('Error parsing db.json, using empty default:', e);
    }
  } else {
    save();
  }
}

// Save database to file
function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing to db.json:', e);
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Query helper constructor
function createCollection(collectionName) {
  return {
    find: (filter = {}) => {
      return data[collectionName].filter(item => {
        for (let key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
    },
    findOne: (filter = {}) => {
      return data[collectionName].find(item => {
        for (let key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
    },
    create: (doc) => {
      const newDoc = {
        _id: generateId(),
        ...doc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      data[collectionName].push(newDoc);
      save();
      return newDoc;
    },
    update: (id, updates) => {
      const index = data[collectionName].findIndex(item => item._id === id);
      if (index === -1) return null;
      
      data[collectionName][index] = {
        ...data[collectionName][index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      save();
      return data[collectionName][index];
    },
    delete: (id) => {
      const index = data[collectionName].findIndex(item => item._id === id);
      if (index === -1) return false;
      data[collectionName].splice(index, 1);
      save();
      return true;
    },
    count: () => {
      return data[collectionName].length;
    }
  };
}

const db = {
  users: createCollection('users'),
  playlists: createCollection('playlists'),
  songs: createCollection('songs'),
  init: async () => {
    load();
    
    // Seed default user if empty
    if (data.users.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('password123', 10);
      db.users.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('Seeded default user account: admin / password123');
    }
    
    if (data.songs.length === 0) {
      console.log('Songs collection is empty. Seeding from Jamendo API...');
      await seedSongs();
    } else {
      console.log(`Loaded ${data.songs.length} songs from db.json`);
    }
  }
};

async function seedSongs() {
  const clientId = '3a8d8d65';
  // Seed a combination of popular and recent tracks
  const urls = [
    `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=25&order=popularity_week&imagesize=200`,
    `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=25&order=popularity_total&imagesize=200`
  ];
  
  try {
    const songMap = new Map();
    for (const url of urls) {
      const res = await fetch(url).then(r => r.json());
      if (res.headers && res.headers.status === 'success' && res.results) {
        for (const track of res.results) {
          if (!track.audio) continue;
          // De-duplicate tracks based on audio URL path
          if (!songMap.has(track.audio)) {
            songMap.set(track.audio, {
              songName: track.name,
              songDes: `By ${track.artist_name}`,
              songImage: track.image || '',
              songPath: track.audio,
              albumName: track.album_name || 'Single',
              duration: track.duration || 180
            });
          }
        }
      }
    }
    
    // Insert into data
    for (const song of songMap.values()) {
      data.songs.push({
        _id: generateId(),
        ...song,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    save();
    console.log(`Seeded ${data.songs.length} songs to db.json successfully.`);
  } catch (err) {
    console.error('Error seeding songs from Jamendo API:', err);
    // Seed some static local defaults in case of network issues
    const defaultSongs = [
      {
        _id: 'seed-song-1',
        songName: 'Believer (Free Jamendo)',
        songDes: 'By Imagine Free',
        songImage: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23282828\'/><path d=\'M40 30v40c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V40l30-8v23c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V25z\' fill=\'%231DB954\'/></svg>',
        songPath: 'https://prod-1.storage.jamendo.com/?trackid=1886884&format=mp31&from=app',
        albumName: 'Evolve',
        duration: 195
      },
      {
        _id: 'seed-song-2',
        songName: 'Heat Waves',
        songDes: 'By Glass Fictional',
        songImage: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23282828\'/><path d=\'M40 30v40c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V40l30-8v23c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V25z\' fill=\'%231DB954\'/></svg>',
        songPath: 'https://prod-1.storage.jamendo.com/?trackid=1876543&format=mp31&from=app',
        albumName: 'Dreamland',
        duration: 238
      }
    ];
    data.songs = defaultSongs;
    save();
    console.log('Seeded fallback local songs due to API failure.');
  }
}

module.exports = db;
