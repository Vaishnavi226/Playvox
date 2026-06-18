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

// Initialize
fetchInitialSongs();

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
      songImage: track.image || 'Images/1.jpg',
      songPath: track.audio
    }));

    // Initialize recently played list using fetched recentTracks as default, or from localStorage
    const defaultRecentSongs = recentTracks.map(track => ({
      songName: track.name,
      songDes: `By ${track.artist_name}`,
      songImage: track.image || 'Images/1.jpg',
      songPath: track.audio
    }));
    initRecentlyPlayed(defaultRecentSongs);

    // Overwrite the bottom 6 cards (Recently Played) with the user's actual recently played tracks
    for (let i = 0; i < 6; i++) {
      if (recentlyPlayed[i]) {
        songs[12 + i] = recentlyPlayed[i];
      }
    }

    order = [...songs];

    // Reset section headers
    const popularHeader = document.getElementById('popular-header');
    if (popularHeader) popularHeader.innerText = 'Popular songs';
    
    const recommendedHeader = document.querySelector('#recommended-section h2');
    if (recommendedHeader) recommendedHeader.innerText = 'Recommended songs';
    
    const recentHeader = document.querySelector('#recent-section h2');
    if (recentHeader) recentHeader.innerText = 'Recently played';

    updateUI();
    updateSectionsVisibility();
    
    if (songs.length > 0) {
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

// Recently played tracking helpers
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
  // Prevent duplicate items - remove the existing occurrence to move it to the front
  recentlyPlayed = recentlyPlayed.filter(s => s.songPath !== song.songPath);
  
  // Prepend the song to the list
  recentlyPlayed.unshift(song);
  
  // Keep only the 6 most recent songs
  if (recentlyPlayed.length > 6) {
    recentlyPlayed = recentlyPlayed.slice(0, 6);
  }
  
  // Persist to localStorage
  localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
  
  // If we are not currently displaying search results, update the bottom section (Recently Played section)
  const isSearchActive = searchInput.value.trim() !== '';
  if (!isSearchActive && songs.length >= 18) {
    for (let i = 0; i < 6; i++) {
      if (recentlyPlayed[i]) {
        songs[12 + i] = recentlyPlayed[i];
      }
    }
    order = [...songs];
    updateUI();
  }
}

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
  } else {
    audio.pause();
    play.classList.remove('fa-circle-pause');
    play.classList.add('fa-circle-play');
    
    let cardPlayBtn = document.getElementById(currentSong.toString());
    if (cardPlayBtn) {
      cardPlayBtn.classList.remove('fa-circle-pause');
      cardPlayBtn.classList.add('fa-circle-play');
    }
  }
});

// Update progress bar
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  let progress = (audio.currentTime / audio.duration) * 100;
  progressBar.value = progress;
  progressBar.style.background = `linear-gradient(to right, #21a600ff ${progress}%, #333 ${progress}%)`;
});

progressBar.addEventListener('input', function () {
  if (!audio.duration) return;
  let value = this.value;
  this.style.background = `linear-gradient(to right, #21a600ff ${value}%, #333 ${value}%)`;
  audio.currentTime = (value * audio.duration) / 100;
});

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

  // Set all cards to loading
  allMusic.forEach(el => el.classList.add('loading'));

  try {
    // Using Jamendo API general 'search' parameter to find terms in titles, artist, tags
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=18&search=${encodeURIComponent(query)}&imagesize=200`;
    const res = await fetch(url).then(r => r.json());

    if (res.headers && res.headers.status === 'success') {
      const results = res.results || [];
      
      if (results.length === 0) {
        alert(`No songs found matching "${query}"`);
        allMusic.forEach(el => el.classList.remove('loading'));
        return;
      }

      songs = results.map(track => ({
        songName: track.name,
        songDes: `By ${track.artist_name}`,
        songImage: track.image || 'Images/1.jpg',
        songPath: track.audio
      }));

      order = [...songs];

      // Update headers to show search results
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
    performSearch(searchInput.value.trim());
  }
});

if (searchIcon) {
  searchIcon.style.cursor = 'pointer';
  searchIcon.addEventListener('click', () => {
    performSearch(searchInput.value.trim());
  });
}

searchInput.addEventListener('input', (e) => {
  if (e.target.value.trim() === '') {
    fetchInitialSongs();
  }
});