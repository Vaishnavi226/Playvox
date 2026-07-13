// Playvox - Client JavaScript Application Logic
// Core state variables
let play = document.getElementById('play');
let progressBar = document.getElementById('progressBar');
let audio = new Audio();

let currentSong = 1;
let songs = [];
let order = [];
let recentlyPlayed = [];

const clientId = '3a8d8d65';
let allMusic = Array.from(document.getElementsByClassName('music-card'));
let playMusic = Array.from(document.getElementsByClassName('playMusic'));
let nowBar = document.querySelector('.now-bar');
let shuffle = document.getElementById('shuffle');
let repeat = document.getElementById('repeat');
let forward = document.getElementById('forward');
let backward = document.getElementById('backward');
let searchInput = document.querySelector('.input-box');
let searchIcon = document.querySelector('.search-icon');

let songOnRepeat = false;
let songOnShuffle = false;

// Custom UI Elements added
let currentTimeLabel = document.getElementById('currentTime');
let totalDurationLabel = document.getElementById('totalDuration');
let volumeBar = document.getElementById('volumeBar');
let volumeIcon = document.getElementById('volume-icon');

let currentVolume = 0.8;
let isMuted = false;

// SPA Routing & Authentication state
let token = localStorage.getItem('playvox_token') || null;
let currentUser = null;
let activePlaylist = null;
let userPlaylists = [];
let dbSongs = []; // Cache list of database songs for selection modals

// --- Initialize App ---
initApp();

async function initApp() {
  audio.volume = currentVolume;
  
  // Setup SPA Routing & modal handlers immediately
  setupSPA();
  setupModalEvents();
  
  if (window.location.protocol === 'file:') {
    setTimeout(() => {
      showToast('Running from file system. API calls will redirect to http://localhost:3000 (Ensure npm start is running).', 'warning');
    }, 1500);
  }
  
  try {
    // Setup Auth
    await initAuth();
  } catch (e) {
    console.error('Auth load failure:', e);
  }
  
  try {
    // Fetch home view tracks
    await fetchInitialSongs();
  } catch (e) {
    console.error('Catalog load failure:', e);
  }
  
  // Initial router check
  handleRouting();
}

// --- SPA Routing Router ---

function setupSPA() {
  window.addEventListener('popstate', handleRouting);
  if (window.location.protocol === 'file:') {
    window.addEventListener('hashchange', handleRouting);
  }
  
  // Intercept logo and home button clicks
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      searchInput.value = ''; // Reset search input
      navigateTo('/');
      fetchInitialSongs(); // Restore charts catalog
    });
  }
  
  const homeBtn = document.querySelector('.home-icon');
  if (homeBtn) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchInput.value = ''; // Reset search input
      navigateTo('/');
      fetchInitialSongs(); // Restore charts catalog
    });
  }
}

function navigateTo(path) {
  if (window.location.protocol === 'file:') {
    window.location.hash = path;
    return;
  }
  try {
    history.pushState(null, '', path);
    handleRouting();
  } catch (e) {
    console.error('pushState failed, falling back to hash:', e);
    window.location.hash = path;
  }
}

function handleRouting() {
  let path = window.location.pathname;
  if (window.location.protocol === 'file:') {
    const hash = window.location.hash;
    path = hash.startsWith('#') ? hash.substring(1) : '/';
  }
  const playlistMatch = path.match(/^\/playlist\/([a-zA-Z0-9]+)$/);
  
  // Deactivate all sidebar highlights
  document.querySelectorAll('.sidebar-playlist-item').forEach(el => {
    el.classList.remove('active-playlist');
  });
  
  // Hide all main containers first
  document.getElementById('home-view-container').style.display = 'none';
  document.getElementById('playlist-view-container').style.display = 'none';
  document.getElementById('auth-view-container').style.display = 'none';
  
  if (playlistMatch) {
    const playlistId = playlistMatch[1];
    loadPlaylist(playlistId);
    // Highlight sidebar playlist
    const activeItem = document.querySelector(`.sidebar-playlist-item[data-id="${playlistId}"]`);
    if (activeItem) activeItem.classList.add('active-playlist');
  } else if (path === '/login' || path === '/signup') {
    loadAuthView(path === '/login' ? 'login' : 'signup');
  } else {
    loadHomeView();
  }
}

function loadHomeView() {
  document.getElementById('home-view-container').style.display = 'block';
  activePlaylist = null;
}

function loadAuthView(mode) {
  const title = document.getElementById('auth-page-title');
  const submitBtn = document.getElementById('auth-page-submit-btn');
  const toggleLink = document.getElementById('auth-page-toggle-link');
  
  document.getElementById('auth-page-username').value = '';
  document.getElementById('auth-page-password').value = '';
  
  document.getElementById('auth-view-container').style.display = 'flex';
  document.getElementById('auth-view-container').setAttribute('data-mode', mode);
  
  if (mode === 'login') {
    title.innerText = 'Log in to Playvox';
    submitBtn.innerText = 'Log in';
    toggleLink.innerHTML = 'Sign up';
  } else {
    title.innerText = 'Sign up to Playvox';
    submitBtn.innerText = 'Sign up';
    toggleLink.innerHTML = 'Log in';
  }
}

// --- Fetch API helper ---
async function apiRequest(url, method = 'GET', body = null) {
  let targetUrl = url;
  if (window.location.protocol === 'file:' && url.startsWith('/')) {
    targetUrl = 'http://localhost:3000' + url;
  }
  
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const res = await fetch(targetUrl, config);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  return res.json();
}

// --- Authentication Controllers ---

async function initAuth() {
  if (token) {
    try {
      currentUser = await apiRequest('/api/auth/me');
      updateAuthUI();
      await loadUserPlaylists();
    } catch (e) {
      console.error('Failed to log in with cached token:', e);
      logout();
    }
  } else {
    updateAuthUI();
    await loadUserPlaylists(); // Load guest-accessible public playlists
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('playvox_token');
  updateAuthUI();
  loadUserPlaylists();
  showToast('Logged out successfully', 'info');
  navigateTo('/');
}

function updateAuthUI() {
  const guestState = document.getElementById('auth-guest-state');
  const loggedInState = document.getElementById('auth-logged-in-state');
  const userDisplayName = document.getElementById('user-display-name');
  
  if (currentUser) {
    guestState.style.display = 'none';
    loggedInState.style.display = 'flex';
    userDisplayName.innerText = currentUser.username;
  } else {
    guestState.style.display = 'flex';
    loggedInState.style.display = 'none';
    userDisplayName.innerText = '';
  }
}

// --- Playlist Operations ---

async function loadUserPlaylists() {
  try {
    userPlaylists = await apiRequest('/api/playlists');
    renderSidebarPlaylists();
  } catch (err) {
    console.error('Error fetching user playlists:', err);
  }
}

function renderSidebarPlaylists() {
  const emptyBox = document.getElementById('empty-library-box');
  const sidebarList = document.getElementById('sidebar-playlists-list');
  
  if (!sidebarList) return;
  sidebarList.innerHTML = '';
  
  // Keep the creation card section always visible
  emptyBox.style.display = 'block';
  
  if (userPlaylists.length === 0) {
    sidebarList.style.display = 'none';
  } else {
    sidebarList.style.display = 'flex';
    
    userPlaylists.forEach(playlist => {
      const item = document.createElement('div');
      item.className = 'sidebar-playlist-item';
      item.innerText = playlist.name;
      item.setAttribute('data-id', playlist._id);
      
      // Navigate to playlist page on click
      item.addEventListener('click', () => {
        navigateTo(`/playlist/${playlist._id}`);
      });
      
      sidebarList.appendChild(item);
    });
  }
}

async function loadPlaylist(id) {
  try {
    const playlist = await apiRequest(`/api/playlists/${id}`);
    activePlaylist = playlist;
    
    // Hide home, show playlist container
    document.getElementById('home-view-container').style.display = 'none';
    const playlistContainer = document.getElementById('playlist-view-container');
    playlistContainer.style.display = 'flex';
    
    // Render metadata
    document.getElementById('playlist-view-cover').src = playlist.coverImage || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23282828\'/><path d=\'M40 30v40c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V40l30-8v23c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V25z\' fill=\'%239d4edd\'/></svg>';
    document.getElementById('playlist-view-title').innerText = playlist.name;
    document.getElementById('playlist-view-description').innerText = playlist.description || 'No description provided.';
    document.getElementById('playlist-view-owner').innerText = playlist.ownerName || 'Unknown Owner';
    document.getElementById('playlist-view-count').innerText = `${playlist.songs.length} song${playlist.songs.length !== 1 ? 's' : ''}`;
    
    // Created date format
    const createdDate = new Date(playlist.createdAt);
    document.getElementById('playlist-view-date').innerText = `Created ${createdDate.toLocaleDateString()}`;
    
    // Total duration calculation
    const totalSecs = playlist.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalMins = Math.floor(totalSecs / 60);
    const remainingSecs = totalSecs % 60;
    document.getElementById('playlist-view-duration').innerText = `${totalMins} min ${remainingSecs} sec`;
    
    // Toggle action buttons depending on ownership
    const isOwner = currentUser && playlist.owner === currentUser._id;
    document.getElementById('playlist-edit-btn').style.display = isOwner ? 'flex' : 'none';
    document.getElementById('playlist-delete-btn').style.display = isOwner ? 'flex' : 'none';
    document.getElementById('playlist-add-songs-btn').style.display = isOwner ? 'flex' : 'none';
    
    // Render songs table list
    renderPlaylistSongsTable(playlist.songs);
  } catch (err) {
    console.error('Error loading playlist details:', err);
    showToast('Failed to load playlist', 'warning');
    navigateTo('/');
  }
}

function renderPlaylistSongsTable(playlistSongs) {
  const tbody = document.getElementById('playlist-songs-rows');
  const table = document.getElementById('playlist-songs-table');
  const emptyState = document.getElementById('playlist-empty-state');
  
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (playlistSongs.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'flex';
  } else {
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    playlistSongs.forEach((song, index) => {
      const row = document.createElement('tr');
      row.setAttribute('data-index', index);
      
      // Mark active row if playing this song
      const isSongPlayingNow = audio.src === song.songPath && !audio.paused;
      if (isSongPlayingNow) {
        row.classList.add('active-row');
      }
      
      row.innerHTML = `
        <td class="col-index">${index + 1}</td>
        <td class="col-title">
          <img src="${song.songImage || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23282828\'/><path d=\'M40 30v40c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V40l30-8v23c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V25z\' fill=\'%239d4edd\'/></svg>'}" alt="Art">
          <div class="song-info-wrapper">
            <span class="song-name-td">${song.songName}</span>
            <span class="song-artist-td">${song.songDes}</span>
          </div>
        </td>
        <td class="col-album">${song.albumName}</td>
        <td class="col-duration">${formatTime(song.duration)}</td>
        <td class="col-actions">
          <button class="row-three-dot-btn" data-index="${index}"><i class="fa-solid fa-ellipsis"></i></button>
        </td>
      `;
      
      // Double click to play
      row.addEventListener('dblclick', () => {
        playPlaylistSong(index);
      });
      
      // Action three dot listener
      const dotBtn = row.querySelector('.row-three-dot-btn');
      dotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openContextMenu(e, index);
      });
      
      tbody.appendChild(row);
    });
  }
}

// Play playlist song row
function playPlaylistSong(index) {
  if (!activePlaylist || !activePlaylist.songs || activePlaylist.songs.length === 0) return;
  
  // Set active play queue to playlist
  songs = activePlaylist.songs.map(track => ({
    songName: track.songName,
    songDes: track.songDes,
    songImage: track.songImage,
    songPath: track.songPath
  }));
  
  order = [...songs];
  currentSong = index + 1; // 1-indexed matching
  
  audio.src = order[currentSong - 1].songPath;
  audio.currentTime = 0;
  audio.play();
  
  updateNowBar();
  renderPlaylistSongsTable(activePlaylist.songs); // Refresh active row color
  
  // Sync deck player play buttons
  play.classList.remove('fa-circle-play');
  play.classList.add('fa-circle-pause');
  
  makeAllPlay();
  addToRecentlyPlayed(order[currentSong - 1]);
}

// Play Playlist main action
document.getElementById('playlist-play-btn').addEventListener('click', () => {
  if (!activePlaylist || !activePlaylist.songs || activePlaylist.songs.length === 0) return;
  
  playPlaylistSong(0); // Start from track 1
});

// Shuffle Playlist main action
document.getElementById('playlist-shuffle-btn').addEventListener('click', () => {
  if (!activePlaylist || !activePlaylist.songs || activePlaylist.songs.length === 0) return;
  
  songOnShuffle = true;
  songOnRepeat = false;
  shuffle.classList.add('active');
  repeat.classList.remove('active');
  
  // Set state
  songs = activePlaylist.songs.map(track => ({
    songName: track.songName,
    songDes: track.songDes,
    songImage: track.songImage,
    songPath: track.songPath
  }));
  
  order = shuffleSongs(songs);
  currentSong = 1;
  
  audio.src = order[0].songPath;
  audio.currentTime = 0;
  audio.play();
  
  updateNowBar();
  renderPlaylistSongsTable(activePlaylist.songs);
  
  play.classList.remove('fa-circle-play');
  play.classList.add('fa-circle-pause');
  makeAllPlay();
});

// --- Playlist creation/modification form modal handlers ---
let selectedSongIds = new Set();
let modalSubmitMode = 'create'; // 'create' | 'edit' | 'add-songs'

function setupModalEvents() {
  // Sidebar "+" trigger
  const sidebarAddBtn = document.getElementById('create-playlist-sidebar-btn');
  if (sidebarAddBtn) {
    sidebarAddBtn.addEventListener('click', () => triggerPlaylistFormModal('create'));
  }
  
  // Library guest box trigger
  const createBtn = document.getElementById('create-playlist-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => triggerPlaylistFormModal('create'));
  }
  
  // Actions edit details trigger
  const editBtn = document.getElementById('playlist-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => triggerPlaylistFormModal('edit'));
  }
  
  // Actions add songs trigger
  const addSongsBtn = document.getElementById('playlist-add-songs-btn');
  if (addSongsBtn) {
    addSongsBtn.addEventListener('click', () => triggerPlaylistFormModal('add-songs'));
  }
  
  const emptyAddBtn = document.getElementById('playlist-empty-add-songs-btn');
  if (emptyAddBtn) {
    emptyAddBtn.addEventListener('click', () => triggerPlaylistFormModal('add-songs'));
  }
  
  // Actions delete trigger
  const deleteBtn = document.getElementById('playlist-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', handleDeletePlaylist);
  }
}

// Trigger Form Modals
async function triggerPlaylistFormModal(mode) {
  if (!currentUser) {
    showToast('Please log in first', 'warning');
    navigateTo('/login');
    return;
  }
  
  modalSubmitMode = mode;
  selectedSongIds.clear();
  
  const modal = document.getElementById('playlist-modal');
  const title = document.getElementById('playlist-modal-title');
  const submitBtn = document.getElementById('playlist-submit-btn');
  
  const nameInput = document.getElementById('playlist-name');
  const descInput = document.getElementById('playlist-description');
  const coverInput = document.getElementById('playlist-cover-url');
  const publicCheck = document.getElementById('playlist-is-public');
  const pickerSec = document.getElementById('song-picker-section');
  const coverPreview = document.getElementById('playlist-cover-preview');
  
  // Reset cover preview
  coverPreview.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23282828'/><path d='M40 30v40c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V40l30-8v23c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V25z' fill='%239d4edd'/></svg>";
  
  // Live cover preview binding
  coverInput.addEventListener('input', () => {
    coverPreview.src = coverInput.value.trim() || coverPreview.src;
  });

  if (mode === 'create') {
    title.innerText = 'Create Playlist';
    submitBtn.innerText = 'Create Playlist';
    
    // Clear details
    nameInput.value = '';
    descInput.value = '';
    coverInput.value = '';
    publicCheck.checked = true;
    
    // Show details inputs and picker
    document.querySelector('.form-row').style.display = 'flex';
    document.querySelector('.checkbox-label').parentNode.style.display = 'flex';
    pickerSec.style.display = 'block';
    
    await loadPickerSongs();
  } 
  else if (mode === 'edit') {
    if (!activePlaylist) return;
    title.innerText = 'Edit Playlist Details';
    submitBtn.innerText = 'Save Details';
    
    // Populate details
    nameInput.value = activePlaylist.name;
    descInput.value = activePlaylist.description;
    coverInput.value = activePlaylist.coverImage;
    publicCheck.checked = activePlaylist.isPublic;
    coverPreview.src = activePlaylist.coverImage || coverPreview.src;
    
    // Show details inputs, hide picker
    document.querySelector('.form-row').style.display = 'flex';
    document.querySelector('.checkbox-label').parentNode.style.display = 'flex';
    pickerSec.style.display = 'none';
  } 
  else if (mode === 'add-songs') {
    if (!activePlaylist) return;
    title.innerText = 'Add Songs to Playlist';
    submitBtn.innerText = 'Add Selected Songs';
    
    // Pre-check song IDs already in playlist
    activePlaylist.songs.forEach(s => selectedSongIds.add(s._id));
    
    // Hide details inputs, show picker
    document.querySelector('.form-row').style.display = 'none';
    document.querySelector('.checkbox-label').parentNode.style.display = 'none';
    pickerSec.style.display = 'block';
    
    await loadPickerSongs();
  }
  
  modal.classList.add('show');
}

// Picker songs loader
async function loadPickerSongs(searchQuery = '') {
  try {
    const url = `/api/songs${searchQuery ? '?search=' + encodeURIComponent(searchQuery) : ''}`;
    dbSongs = await apiRequest(url);
    renderPickerSongs();
  } catch (e) {
    console.error('Failed to load database songs for selection:', e);
  }
}

function renderPickerSongs() {
  const tbody = document.getElementById('song-picker-rows');
  const emptyMsg = document.getElementById('song-picker-empty');
  
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (dbSongs.length === 0) {
    tbody.parentNode.style.display = 'none';
    emptyMsg.style.display = 'block';
  } else {
    tbody.parentNode.style.display = 'table';
    emptyMsg.style.display = 'none';
    
    dbSongs.forEach(song => {
      const isChecked = selectedSongIds.has(song._id);
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="col-check">
          <input type="checkbox" class="picker-check" data-id="${song._id}" ${isChecked ? 'checked' : ''}>
        </td>
        <td class="col-picker-title">${song.songName} - <span style="font-weight: 500; font-size: 0.8rem; color: var(--text-secondary);">${song.songDes}</span></td>
        <td class="col-picker-album">${song.albumName}</td>
        <td class="col-picker-duration">${formatTime(song.duration)}</td>
      `;
      
      // Bind checkbox toggle click action
      const checkInput = row.querySelector('.picker-check');
      checkInput.addEventListener('change', () => {
        if (checkInput.checked) {
          selectedSongIds.add(song._id);
        } else {
          selectedSongIds.delete(song._id);
        }
        document.getElementById('song-picker-counter').innerText = selectedSongIds.size;
      });
      
      tbody.appendChild(row);
    });
  }
  
  document.getElementById('song-picker-counter').innerText = selectedSongIds.size;
}

// Live search input handler in picker
document.getElementById('song-picker-search').addEventListener('input', (e) => {
  loadPickerSongs(e.target.value.trim());
});

// Modal close action
function closePlaylistModal() {
  document.getElementById('playlist-modal').classList.remove('show');
}
document.getElementById('playlist-modal-close').addEventListener('click', closePlaylistModal);
document.getElementById('playlist-cancel-btn').addEventListener('click', closePlaylistModal);

// Submit Playlist Form Actions
document.getElementById('playlist-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('playlist-name').value.trim();
  const description = document.getElementById('playlist-description').value.trim();
  const coverImage = document.getElementById('playlist-cover-url').value.trim();
  const isPublic = document.getElementById('playlist-is-public').checked;
  const songsArr = Array.from(selectedSongIds);
  
  try {
    if (modalSubmitMode === 'create') {
      const res = await apiRequest('/api/playlists', 'POST', {
        name,
        description,
        coverImage,
        isPublic,
        songs: songsArr
      });
      
      showToast('Playlist created successfully!', 'info');
      closePlaylistModal();
      await loadUserPlaylists();
      navigateTo(`/playlist/${res._id}`);
    } 
    else if (modalSubmitMode === 'edit') {
      if (!activePlaylist) return;
      const res = await apiRequest(`/api/playlists/${activePlaylist._id}`, 'PUT', {
        name,
        description,
        coverImage,
        isPublic
      });
      
      showToast('Playlist updated successfully!', 'info');
      closePlaylistModal();
      await loadUserPlaylists();
      await loadPlaylist(activePlaylist._id); // Refresh view details
    } 
    else if (modalSubmitMode === 'add-songs') {
      if (!activePlaylist) return;
      const originalSongs = activePlaylist.songs.map(s => s._id);
      
      // Determine what songs were added
      const toAdd = songsArr.filter(id => !originalSongs.includes(id));
      // Determine what songs were removed
      const toRemove = originalSongs.filter(id => !songsArr.includes(id));
      
      // Execute additions concurrently
      for (const id of toAdd) {
        await apiRequest(`/api/playlists/${activePlaylist._id}/add-song`, 'POST', { songId: id });
      }
      // Execute removals concurrently
      for (const id of toRemove) {
        await apiRequest(`/api/playlists/${activePlaylist._id}/remove-song/${id}`, 'DELETE');
      }
      
      showToast('Playlist songs updated successfully!', 'info');
      closePlaylistModal();
      await loadPlaylist(activePlaylist._id);
    }
  } catch (err) {
    console.error('Error submitting playlist form:', err);
    showToast(err.message || 'Error occurred', 'warning');
  }
});

// Delete Playlist Main Handler
async function handleDeletePlaylist() {
  if (!activePlaylist) return;
  const confirmDel = confirm(`Are you sure you want to delete the playlist "${activePlaylist.name}"?`);
  if (!confirmDel) return;
  
  try {
    await apiRequest(`/api/playlists/${activePlaylist._id}`, 'DELETE');
    showToast('Playlist deleted successfully!', 'info');
    await loadUserPlaylists();
    navigateTo('/');
  } catch (err) {
    console.error('Failed to delete playlist:', err);
    showToast('Failed to delete playlist', 'warning');
  }
}

// --- Dynamic Actions Context Popup menu on song rows ---
let contextMenuSongIndex = null;

function openContextMenu(e, index) {
  contextMenuSongIndex = index;
  const menu = document.getElementById('context-menu');
  const removeBtn = document.getElementById('menu-remove');
  
  // Determine if active row is inside a playlist we own
  const isOwnerOfActivePlaylist = activePlaylist && currentUser && activePlaylist.owner === currentUser._id;
  removeBtn.style.display = isOwnerOfActivePlaylist ? 'flex' : 'none';
  
  menu.style.display = 'block';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  
  // Close menu on next window click
  const closeMenu = () => {
    menu.style.display = 'none';
    window.removeEventListener('click', closeMenu);
  };
  setTimeout(() => window.addEventListener('click', closeMenu), 0);
}

// Bind context menu buttons actions
document.getElementById('menu-play').addEventListener('click', () => {
  if (contextMenuSongIndex !== null) {
    playPlaylistSong(contextMenuSongIndex);
  }
});

document.getElementById('menu-remove').addEventListener('click', async () => {
  if (contextMenuSongIndex === null || !activePlaylist) return;
  const song = activePlaylist.songs[contextMenuSongIndex];
  if (!song) return;
  
  try {
    await apiRequest(`/api/playlists/${activePlaylist._id}/remove-song/${song._id}`, 'DELETE');
    showToast('Song removed from playlist', 'info');
    await loadPlaylist(activePlaylist._id); // Refresh rows
  } catch (e) {
    console.error('Failed to remove song from playlist:', e);
    showToast('Failed to remove song', 'warning');
  }
});

document.getElementById('menu-share').addEventListener('click', () => {
  if (contextMenuSongIndex === null || !activePlaylist) return;
  const song = activePlaylist.songs[contextMenuSongIndex];
  if (!song) return;
  
  // Copy song URL to clipboard
  navigator.clipboard.writeText(song.songPath).then(() => {
    showToast('Song stream link copied to clipboard!', 'info');
  }).catch(() => {
    showToast('Failed to copy link', 'warning');
  });
});

// --- Auth Popup Modal handlers ---
function openAuthModal(mode) {
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleLink = document.getElementById('auth-toggle-link');
  
  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
  
  if (mode === 'login') {
    title.innerText = 'Log in to Playvox';
    submitBtn.innerText = 'Log in';
    toggleLink.innerHTML = 'Sign up';
    modal.setAttribute('data-mode', 'login');
  } else {
    title.innerText = 'Sign up to Playvox';
    submitBtn.innerText = 'Sign up';
    toggleLink.innerHTML = 'Log in';
    modal.setAttribute('data-mode', 'signup');
  }
  
  modal.classList.add('show');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('show');
}

document.getElementById('signup-btn').addEventListener('click', () => navigateTo('/signup'));
document.getElementById('login-btn').addEventListener('click', () => navigateTo('/login'));
document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);

// Toggle link in auth modal
document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
  e.preventDefault();
  const currentMode = document.getElementById('auth-modal').getAttribute('data-mode');
  openAuthModal(currentMode === 'login' ? 'signup' : 'login');
});

// Submit login/signup form (modal)
document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const mode = document.getElementById('auth-modal').getAttribute('data-mode');
  
  try {
    const url = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const res = await apiRequest(url, 'POST', { username, password });
    
    token = res.token;
    currentUser = res.user;
    localStorage.setItem('playvox_token', token);
    
    updateAuthUI();
    closeAuthModal();
    showToast(`Welcome back, ${currentUser.username}!`, 'info');
    await loadUserPlaylists();
    navigateTo('/');
  } catch (err) {
    console.error('Authentication failed:', err);
    showToast(err.message || 'Authentication failed', 'warning');
  }
});

// Submit login/signup form (dedicated page)
document.getElementById('auth-page-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('auth-page-username').value.trim();
  const password = document.getElementById('auth-page-password').value.trim();
  const mode = document.getElementById('auth-view-container').getAttribute('data-mode');
  
  try {
    const url = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const res = await apiRequest(url, 'POST', { username, password });
    
    token = res.token;
    currentUser = res.user;
    localStorage.setItem('playvox_token', token);
    
    updateAuthUI();
    showToast(`Welcome back, ${currentUser.username}!`, 'info');
    await loadUserPlaylists();
    navigateTo('/');
  } catch (err) {
    console.error('Authentication failed:', err);
    showToast(err.message || 'Authentication failed', 'warning');
  }
});

// Toggle link on dedicated page
document.getElementById('auth-page-toggle-link').addEventListener('click', (e) => {
  e.preventDefault();
  const currentMode = document.getElementById('auth-view-container').getAttribute('data-mode');
  navigateTo(currentMode === 'login' ? '/signup' : '/login');
});

// Logout trigger
document.getElementById('logout-btn').addEventListener('click', logout);

// Key Listeners for Modals (Esc to close, Enter is built into forms)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAuthModal();
    closePlaylistModal();
    document.getElementById('context-menu').style.display = 'none';
  }
});

// --- Existing Audio Player Controller logic (preserved and adapted) ---

// Play / Pause Master Button
play.addEventListener('click', () => {
  if (songs.length === 0) return;
  if (audio.paused || audio.currentTime == 0) {
    if (!audio.src || audio.src === window.location.href) {
      audio.src = order[currentSong - 1].songPath;
      addToRecentlyPlayed(order[currentSong - 1]);
    }
    audio.play();
    play.classList.remove('fa-circle-play');
    play.classList.add('fa-circle-pause');
    
    let cardPlayBtn = document.getElementById(currentSong.toString());
    if (cardPlayBtn) {
      cardPlayBtn.classList.remove('fa-circle-play');
      cardPlayBtn.classList.add('fa-circle-pause');
    }
    
    // Sync active playlist rows if viewing
    if (activePlaylist) renderPlaylistSongsTable(activePlaylist.songs);
  } else {
    audio.pause();
    play.classList.remove('fa-circle-pause');
    play.classList.add('fa-circle-play');
    
    let cardPlayBtn = document.getElementById(currentSong.toString());
    if (cardPlayBtn) {
      cardPlayBtn.classList.remove('fa-circle-pause');
      cardPlayBtn.classList.add('fa-circle-play');
    }
    
    if (activePlaylist) renderPlaylistSongsTable(activePlaylist.songs);
  }
});

// Helper to format seconds to M:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  let mins = Math.floor(seconds / 60);
  let secs = Math.floor(seconds % 60);
  if (secs < 10) secs = '0' + secs;
  return `${mins}:${secs}`;
}

// Update progress bar & time labels
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  let progress = (audio.currentTime / audio.duration) * 100;
  progressBar.value = progress;
  progressBar.style.background = `linear-gradient(to right, #9d4edd ${progress}%, #333 ${progress}%)`;
  if (currentTimeLabel) {
    currentTimeLabel.innerText = formatTime(audio.currentTime);
  }
});

// Update duration label on load
audio.addEventListener('durationchange', () => {
  if (totalDurationLabel && audio.duration) {
    totalDurationLabel.innerText = formatTime(audio.duration);
  }
});

progressBar.addEventListener('input', function () {
  if (!audio.duration) return;
  let value = this.value;
  this.style.background = `linear-gradient(to right, #9d4edd ${value}%, #333 ${value}%)`;
  audio.currentTime = (value * audio.duration) / 100;
  if (currentTimeLabel) {
    currentTimeLabel.innerText = formatTime(audio.currentTime);
  }
});

// Initialize volume slider
if (volumeBar) {
  volumeBar.value = currentVolume * 100;
  volumeBar.style.background = `linear-gradient(to right, var(--text-primary) ${currentVolume * 100}%, #333 ${currentVolume * 100}%)`;
  
  volumeBar.addEventListener('input', function() {
    currentVolume = this.value / 100;
    if (!isMuted) {
      audio.volume = currentVolume;
    }
    this.style.background = `linear-gradient(to right, var(--text-primary) ${this.value}%, #333 ${this.value}%)`;
    updateVolumeIcon();
  });
}

if (volumeIcon) {
  volumeIcon.addEventListener('click', () => {
    if (!isMuted) {
      isMuted = true;
      audio.volume = 0;
      updateVolumeIcon();
      if (volumeBar) {
        volumeBar.value = 0;
        volumeBar.style.background = `linear-gradient(to right, var(--text-primary) 0%, #333 0%)`;
      }
    } else {
      isMuted = false;
      audio.volume = currentVolume;
      updateVolumeIcon();
      if (volumeBar) {
        volumeBar.value = currentVolume * 100;
        volumeBar.style.background = `linear-gradient(to right, var(--text-primary) ${currentVolume * 100}%, #333 ${currentVolume * 100}%)`;
      }
    }
  });
}

function updateVolumeIcon() {
  if (!volumeIcon) return;
  volumeIcon.className = ''; // reset classes
  volumeIcon.classList.add('fa-solid');
  
  if (currentVolume === 0 || isMuted) {
    volumeIcon.classList.add('fa-volume-xmark');
  } else if (currentVolume < 0.3) {
    volumeIcon.classList.add('fa-volume-off');
  } else if (currentVolume < 0.7) {
    volumeIcon.classList.add('fa-volume-low');
  } else {
    volumeIcon.classList.add('fa-volume-high');
  }
}

// Helper to make all card play buttons show play icon
const makeAllPlay = () => {
  playMusic.forEach((element) => {
    element.classList.remove('fa-circle-pause');
    element.classList.add('fa-circle-play');
  });
};

// Card Play Button Event Listeners
playMusic.forEach((element) => {
  element.addEventListener('click', (e) => {
    if (songs.length === 0) return;
    const clickedId = parseInt(e.target.id);
    
    // Toggle play/pause if the same song is clicked
    if (clickedId === currentSong && audio.src !== '') {
      if (audio.paused || audio.currentTime == 0) {
        audio.play();
        e.target.classList.remove('fa-circle-play');
        e.target.classList.add('fa-circle-pause');
        play.classList.remove('fa-circle-play');
        play.classList.add('fa-circle-pause');
      } else {
        audio.pause();
        e.target.classList.remove('fa-circle-pause');
        e.target.classList.add('fa-circle-play');
        play.classList.remove('fa-circle-pause');
        play.classList.add('fa-circle-play');
      }
      return;
    }

    makeAllPlay();
    e.target.classList.remove('fa-circle-play');
    e.target.classList.add('fa-circle-pause');
    play.classList.remove('fa-circle-play');
    play.classList.add('fa-circle-pause');

    currentSong = clickedId;
    if (order[currentSong - 1]) {
      audio.src = order[currentSong - 1].songPath;
      audio.currentTime = 0;
      audio.play();
      updateNowBar();
      addToRecentlyPlayed(order[currentSong - 1]);
    }
  });
});

// Shuffle logic
function shuffleSongs(originalOrder) {
  let shuffled = [...originalOrder];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

shuffle.addEventListener('click', () => {
  if (songs.length === 0) return;
  if (!songOnShuffle) {
    songOnShuffle = true;
    songOnRepeat = false;
    shuffle.classList.add('active');
    repeat.classList.remove('active');
    order = shuffleSongs(songs);
  } else {
    songOnShuffle = false;
    shuffle.classList.remove('active');
    order = [...songs];
  }
});

// Repeat logic
repeat.addEventListener('click', () => {
  if (!songOnRepeat) {
    songOnRepeat = true;
    songOnShuffle = false;
    repeat.classList.add('active');
    shuffle.classList.remove('active');
  } else {
    songOnRepeat = false;
    repeat.classList.remove('active');
  }
});

// Play next song
const playNextSong = () => {
  if (songs.length === 0) return;
  makeAllPlay();
  
  if (!songOnRepeat) {
    currentSong = (currentSong % songs.length) + 1;
  }
  
  if (order[currentSong - 1]) {
    audio.src = order[currentSong - 1].songPath;
    audio.currentTime = 0;
    audio.play();
    updateNowBar();
    
    play.classList.remove('fa-circle-play');
    play.classList.add('fa-circle-pause');
    
    let cardPlayBtn = document.getElementById(currentSong.toString());
    if (cardPlayBtn) {
      cardPlayBtn.classList.remove('fa-circle-play');
      cardPlayBtn.classList.add('fa-circle-pause');
    }

    addToRecentlyPlayed(order[currentSong - 1]);
    if (activePlaylist) renderPlaylistSongsTable(activePlaylist.songs);
  }
};

// Play prev song
const playPrevSong = () => {
  if (songs.length === 0) return;
  makeAllPlay();
  
  currentSong = currentSong - 1;
  if (currentSong < 1) {
    currentSong = songs.length;
  }
  
  if (order[currentSong - 1]) {
    audio.src = order[currentSong - 1].songPath;
    audio.currentTime = 0;
    audio.play();
    updateNowBar();
    
    play.classList.remove('fa-circle-play');
    play.classList.add('fa-circle-pause');
    
    let cardPlayBtn = document.getElementById(currentSong.toString());
    if (cardPlayBtn) {
      cardPlayBtn.classList.remove('fa-circle-play');
      cardPlayBtn.classList.add('fa-circle-pause');
    }

    addToRecentlyPlayed(order[currentSong - 1]);
    if (activePlaylist) renderPlaylistSongsTable(activePlaylist.songs);
  }
};

forward.addEventListener('click', playNextSong);
backward.addEventListener('click', playPrevSong);
audio.addEventListener('ended', playNextSong);

// Search functionality
async function performSearch(query) {
  if (query === '') {
    fetchInitialSongs();
    return;
  }

  allMusic.forEach(el => el.classList.add('loading'));

  try {
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=18&search=${encodeURIComponent(query)}&imagesize=200`;
    const res = await fetch(url).then(r => r.json());

    if (res.headers && res.headers.status === 'success') {
      const results = res.results || [];
      
      if (results.length === 0) {
        showToast(`No songs found matching "${query}"`, 'warning');
        allMusic.forEach(el => el.classList.remove('loading'));
        return;
      }

      songs = results.map(track => ({
        songName: track.name,
        songDes: `By ${track.artist_name}`,
        songImage: track.image || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23282828\'/><path d=\'M40 30v40c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V40l30-8v23c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V25z\' fill=\'%239d4edd\'/></svg>',
        songPath: track.audio
      }));

      order = [...songs];

      const popularHeader = document.getElementById('popular-header');
      if (popularHeader) popularHeader.innerText = `Search results for "${query}"`;
      
      const recommendedHeader = document.querySelector('#recommended-section h2');
      if (recommendedHeader) recommendedHeader.innerText = 'More matches';
      
      const recentHeader = document.querySelector('#recent-section h2');
      if (recentHeader) recentHeader.innerText = 'Additional matches';

      updateUI();
      updateSectionsVisibility();

      if (songs.length > 0) {
        currentSong = 1;
        audio.src = order[0].songPath;
        updateNowBar();
        makeAllPlay();
        play.classList.remove('fa-circle-pause');
        play.classList.add('fa-circle-play');
      }
    }
  } catch (err) {
    console.error('Error searching Jamendo tracks:', err);
  } finally {
    allMusic.forEach(el => el.classList.remove('loading'));
  }
}

// Search triggers
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    navigateTo('/'); // Go to home view to display catalog search results
    performSearch(searchInput.value.trim());
  }
});

if (searchIcon) {
  searchIcon.style.cursor = 'pointer';
  searchIcon.addEventListener('click', () => {
    navigateTo('/');
    performSearch(searchInput.value.trim());
  });
}

searchInput.addEventListener('input', (e) => {
  if (e.target.value.trim() === '') {
    navigateTo('/');
    fetchInitialSongs();
  }
});

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;
  
  toastMsg.innerText = message;
  toast.classList.remove('warning', 'info');
  
  if (type === 'warning') {
    toast.classList.add('warning');
  } else {
    toast.classList.add('info');
  }
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// --- Home view tracks loading helpers ---
async function fetchInitialSongs() {
  allMusic.forEach(el => el.classList.add('loading'));

  try {
    const urls = [
      `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=6&order=popularity_week&imagesize=200`,
      `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=6&order=popularity_total&imagesize=200`,
      `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=6&order=releasedate_desc&imagesize=200`
    ];

    const responses = await Promise.all(urls.map(url => fetch(url).then(r => r.json())));
    
    const results = responses.map(res => {
      if (res.headers && res.headers.status === 'success') {
        return res.results;
      }
      return [];
    });

    const popularTracks = results[0];
    const recommendedTracks = results[1];
    const recentTracks = results[2];

    const allTracks = [...popularTracks, ...recommendedTracks, ...recentTracks];
    
    songs = allTracks.map(track => ({
      songName: track.name,
      songDes: `By ${track.artist_name}`,
      songImage: track.image || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23282828\'/><path d=\'M40 30v40c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V40l30-8v23c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V25z\' fill=\'%239d4edd\'/></svg>',
      songPath: track.audio
    }));

    const defaultRecentSongs = recentTracks.map(track => ({
      songName: track.name,
      songDes: `By ${track.artist_name}`,
      songImage: track.image || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23282828\'/><path d=\'M40 30v40c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V40l30-8v23c-3 0-6 2-6 5s3 5 6 5 6-2 6-5V25z\' fill=\'%239d4edd\'/></svg>',
      songPath: track.audio
    }));
    initRecentlyPlayed(defaultRecentSongs);

    // Overwrite bottom 6 cards (Recently Played)
    for (let i = 0; i < 6; i++) {
      if (recentlyPlayed[i]) {
        songs[12 + i] = recentlyPlayed[i];
      }
    }

    // Default queue order
    if (!activePlaylist) {
      order = [...songs];
    }

    const popularHeader = document.getElementById('popular-header');
    if (popularHeader) popularHeader.innerText = 'Popular songs';
    
    const recommendedHeader = document.querySelector('#recommended-section h2');
    if (recommendedHeader) recommendedHeader.innerText = 'Recommended songs';
    
    const recentHeader = document.querySelector('#recent-section h2');
    if (recentHeader) recentHeader.innerText = 'Recently played';

    updateUI();
    updateSectionsVisibility();
    
    if (songs.length > 0 && !activePlaylist && (!audio.src || audio.src === window.location.href)) {
      currentSong = 1;
      audio.src = order[0].songPath;
      updateNowBar();
    }
  } catch (err) {
    console.error('Error fetching initial songs:', err);
  } finally {
    allMusic.forEach(el => el.classList.remove('loading'));
  }
}

function updateUI() {
  allMusic.forEach((element, i) => {
    if (songs[i]) {
      element.style.display = 'block';
      element.getElementsByTagName('img')[0].src = songs[i].songImage;
      element.getElementsByClassName('img-title')[0].innerText = songs[i].songName;
      element.getElementsByClassName('img-description')[0].innerText = songs[i].songDes;
      element.classList.remove('loading');
    } else {
      element.style.display = 'none';
    }
  });
}

function updateSectionsVisibility() {
  const popularSec = document.getElementById('popular-section');
  const recommendedSec = document.getElementById('recommended-section');
  const recentSec = document.getElementById('recent-section');

  if (songs.length === 0) {
    if (popularSec) popularSec.style.display = 'none';
    if (recommendedSec) recommendedSec.style.display = 'none';
    if (recentSec) recentSec.style.display = 'none';
  } else {
    if (popularSec) popularSec.style.display = 'block';
    if (recommendedSec) recommendedSec.style.display = songs.length > 6 ? 'block' : 'none';
    if (recentSec) recentSec.style.display = songs.length > 12 ? 'block' : 'none';
  }
}

function updateNowBar() {
  if (songs.length === 0 || !order[currentSong - 1]) return;
  nowBar.getElementsByTagName('img')[0].src = order[currentSong - 1].songImage;
  nowBar.getElementsByClassName('img-title-info')[0].innerText = order[currentSong - 1].songName;
  nowBar.getElementsByClassName('img-des-info')[0].innerText = order[currentSong - 1].songDes;
}

function initRecentlyPlayed(defaultRecentTracks) {
  const stored = localStorage.getItem('recentlyPlayed');
  if (stored) {
    try {
      recentlyPlayed = JSON.parse(stored);
    } catch (e) {
      recentlyPlayed = defaultRecentTracks;
    }
  } else {
    recentlyPlayed = defaultRecentTracks;
  }
}

function addToRecentlyPlayed(song) {
  if (!song) return;
  recentlyPlayed = recentlyPlayed.filter(s => s.songPath !== song.songPath);
  recentlyPlayed.unshift(song);
  
  if (recentlyPlayed.length > 6) {
    recentlyPlayed = recentlyPlayed.slice(0, 6);
  }
  
  localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
  
  const isSearchActive = searchInput.value.trim() !== '';
  if (!isSearchActive && songs.length >= 18 && !activePlaylist) {
    for (let i = 0; i < 6; i++) {
      if (recentlyPlayed[i]) {
        songs[12 + i] = recentlyPlayed[i];
      }
    }
    order = [...songs];
    updateUI();
  }
}