# 🎵 Playvox - Premium Music Player

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Glossary/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![API](https://img.shields.io/badge/API-Jamendo-blue?style=for-the-badge&logo=api)](https://developer.jamendo.com/v3.0)

Playvox is a premium, web-based music application inspired by Spotify's dark-mode design. It streams high-quality independent music dynamically from the **Jamendo Developer API**, supports custom range progress bars, full playback queues (Shuffle, Repeat, Next/Prev), search filters, and persists user listening history across browser reloads using local storage.

---

## 🎨 Interface Preview

```text
+--------------------------------------------------------------------------------+
|  [Logo] Spotify  (H) Home   [ Search for songs...               ] [Sign Up] [Login] |
+--------------------------------------------------------------------------------+
|  YOUR LIBRARY               |  POPULAR SONGS                                   |
|  +-----------------------+  |  +------------+  +------------+  +------------+  |
|  | Create first playlist |  |  | [Artwork]  |  | [Artwork]  |  | [Artwork]  |  |
|  | Create playlist [btn] |  |  | Song Title |  | Song Title |  | Song Title |  |
|  +-----------------------+  |  +------------+  +------------+  +------------+  |
|                             |  RECOMMENDED SONGS                               |
|  +-----------------------+  |  +------------+  +------------+  +------------+  |
|  | Find podcasts         |  |  | [Artwork]  |  | [Artwork]  |  | [Artwork]  |  |
|  | Browse podcasts [btn] |  |  | Song Title |  | Song Title |  | Song Title |  |
|  +-----------------------+  |  +------------+  +------------+  +------------+  |
+--------------------------------------------------------------------------------+
|  [Artwork] Song Title - Artist   |   [Shuffle] [Prev] [Play/Pause] [Next] [Loop]  |
|  Description Details             |   [=== Progress Bar Track ==================]  |
+--------------------------------------------------------------------------------+
```

---

## 🚀 Key Features

*   **Dynamic API Integration**: Fetching weekly popular tracks, total popular tracks, and recent releases directly from the Jamendo catalog.
*   **Persistent Listening History**: Saves up to 6 unique recently-played tracks in `localStorage`.
*   **Fully Functional Playback Controller**:
    *   Play / Pause toggles (synced across grid cards and bottom panel).
    *   Forward / Backward buttons.
    *   **Shuffle Mode** using a Fisher-Yates shuffle algorithm.
    *   **Repeat Mode** to loop a single track.
*   **Custom Styled Seeker**: Interactive progress slider filled with Spotify-green color representing elapsed audio duration.
*   **Real-time Search Filter**: Instant Jamendo search query updates track listings and headers on the fly.
*   **Modern CSS Dark Styling**: Smooth scale hover animations, custom styling for ranges/scrollbars, and Montserrat font layouts.

---

## 📂 Project Repository Structure

```bash
Playvox/
├── index.html       # Visual markup structure & layout skeleton
├── style.css        # Theme variables, responsive styles, animations
├── script.js        # API requests, audio logic, user queue state, events
├── .gitignore       # Specifies files/folders ignored by Git
└── README.md        # Project description & documentation (this file)
```

---

## 💻 Tech Architecture & Key Logic

### 1. File Summaries

*   **`index.html`**: Handles DOM structures. Divided into standard sections: `<nav>` layout, `.main-left-part` for library management, `.main-right-part` for song categories, and `.player-bar` for audio deck controls.
*   **`style.css`**: Defines layout specifications using Flexbox grid structures. Incorporates interactive transformations and specific animations on cards (`.music-card`) and controller hover selectors (`.player-btns:hover`).
*   **`script.js`**: Drives client-side actions. Stores active player state:
    *   `songs`: Array of currently displayed music objects.
    *   `order`: Sequence representation of current queue (randomized in shuffle).
    *   `recentlyPlayed`: Deduplicated array storing user's play history.

### 2. Primary JavaScript Methods

*   `fetchInitialSongs()`: Executes concurrent track fetches (weekly popularity, total popularity, newest release) from Jamendo API.
*   `updateUI()`: Syncs DOM cards display, title texts, descriptions, and artist images with the loaded song index.
*   `addToRecentlyPlayed(song)`: Prepends a track, keeps it unique, clips index size to 6, and saves to browser `localStorage`.
*   `performSearch(query)`: Fires an API call with search query limits, dynamically repopulating category headers and cards.
*   `shuffleSongs(originalOrder)`: Implements Fisher-Yates array shuffling logic.

---

## 🛠️ Jamendo API Integration

Playvox uses the client credential token: `3a8d8d65` to request JSON audio streams.
*   **Featured tracks query parameters**: `popularity_week`, `popularity_total`, `releasedate_desc`.
*   **Search endpoint pattern**: `https://api.jamendo.com/v3.0/tracks/?client_id=3a8d8d65&format=json&limit=18&search=${query}&imagesize=200`

---

## 🏁 How to Run Locally

Since this project consists of standard static files, you can launch it with any local server.

### Option A: Using Python (Recommended)
Launch a local server inside the folder:
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your web browser.

### Option B: VS Code Live Server
*   Install the **Live Server** extension in VS Code.
*   Right-click `index.html` and click **Open with Live Server**.
*   Access the interface at `http://127.0.0.1:5500`.

---

