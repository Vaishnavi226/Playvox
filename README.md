# 🎵 Playvox - Premium Music Player & Playlist System

Playvox is a premium, web-based music application inspired by dark-mode design and customized with a stunning **Cosmic Black & Neon Purple theme**. It streams high-quality independent music dynamically from the **Jamendo Developer API**, supports custom range progress bars, full playback queues (Shuffle, Repeat, Next/Prev), search filters, and persists user listening history.

This version has been upgraded with a complete **Spotify-style Playlist and User Authentication system** backed by a local persistent JSON database and a Node.js/Express server.

---

## 🎨 Playlist Interface Preview

```text
+--------------------------------------------------------------------------------+
|  [Logo] Playvox  (H) Home   [ Search for songs...               ]   [Sign Out] |
+--------------------------------------------------------------------------------+
|  YOUR LIBRARY    [+]        |  🎵 Playlist Title                               |
|  +-----------------------+  |  Created by Username • 5 songs • 15 min 20 sec   |
|  | [Create Playlist Box] |  |  +---------------------------------------------+ |
|  |-----------------------|  |  | [Play] [Shuffle] [Edit Details] [Delete]    | |
|  | My Rock Playlist      |  |  +---------------------------------------------+ |
|  | Chill Vibes           |  |  | # | Title           | Album         | Time  | |
|  +-----------------------+  |  | 1 | Believer        | Evolve        | 3:15  | |
|                             |  | 2 | Heat Waves      | Dreamland     | 3:58  | |
|                             |  +---------------------------------------------+ |
+--------------------------------------------------------------------------------+
|  [Artwork] Song Title - Artist   |   [Shuffle] [Prev] [Play/Pause] [Next] [Loop]  |
|  Description Details             |   [=== Progress Bar Track ==================]  |
+--------------------------------------------------------------------------------+
```

---

## 🚀 Key Features

*   **Cosmic Black & Neon Purple Design**: Redesigned design system featuring custom purple accents (`#9d4edd`, `#b86ff8`), dark cosmic black background gradients (`#040306`), and matching hover interactions.
*   **Custom Playvox Logo Branding**: Incorporates a clean vector-based play icon with progressive soundwave bars and a gradient fill matching the new theme color system.
*   **Dynamic API Seeding**: On startup, the backend automatically seeds the database with popular tracks from the Jamendo catalog if the database is empty, bridging the gap between local database playlist entries and catalog streams.
*   **Default Testing Credentials**: Auto-seeds a test account (`admin` / `password123`) on boot in the JSON database for quick validation.
*   **Dedicated Auth Pages & Modals**: Supports both standalone full-page form views (under `/login` and `/signup` SPA paths) and modal popups for signing in or registering.
*   **Persistent Custom Playlists**: Fully functional custom playlists (Create, Read, Update, Delete) synced in a local JSON database.
*   **Permanent Sidebar Creation Card**: Keeps the "Create your first playlist" card box permanently visible in the sidebar, with any user playlists dynamically listed beneath it separated by an elegant border line.
*   **Interactive Song Picker**: A searchable checklist interface listing database songs with real-time text filters, multi-select checkboxes, and total count indicators.
*   **Independent Content Scrolling**: Viewport-locked app shell (`100vh`) with fixed nav and player bar, while sidebar and main view scroll independently.
*   **Three-Dot Options Menu**: Click actions on track tables allowing users to Play, Remove from Playlist (owner-only), and copy the Stream Link to the clipboard.
*   **Custom Volume Deck**: Volume adjustment slider and mute toggle control integrated into the bottom player controller.
*   **Search Reset & Redirection**: Clearing the search input or clicking the Home/Logo buttons automatically resets the input and reloads the default popular weekly charts.
*   **Toast Notifications**: Replaces disruptive native browser `alert()` popups with sliding status toasts at the bottom of the viewport.

---

## 📂 Project Repository Structure

```bash
Playvox/
├── db.json          # Persistent JSON local database (auto-generated)
├── db.js            # JSON database controller & Jamendo seeder logic
├── server.js        # Express application API routes & wildcard fallback routing
├── index.html       # Visual markup structure & layout overlays
├── style.css        # Curated dark themes, modal designs, and animations
├── script.js        # Client auth helpers, SPA routing, player controllers
├── package.json     # Node scripts & module dependencies
├── package-lock.json# Auto-generated lockfile for npm resolved packages
├── .gitignore       # Specifies files/folders ignored by Git
└── README.md        # Project description & documentation (this file)
```

---

## 🗄️ Database Schemas

The application uses three local persistent JSON collections:

### 1. User Schema
```json
{
  "_id": "String (Auto-ID)",
  "username": "String",
  "password": "String (Bcrypt Hashed)",
  "createdAt": "ISO String",
  "updatedAt": "ISO String"
}
```

### 2. Playlist Schema
```json
{
  "_id": "String (Auto-ID)",
  "name": "String",
  "description": "String",
  "coverImage": "String (URL)",
  "owner": "String (User ID)",
  "ownerName": "String",
  "songs": ["String (Song ID)"],
  "isPublic": "Boolean",
  "createdAt": "ISO String",
  "updatedAt": "ISO String"
}
```

### 3. Song Schema
```json
{
  "_id": "String (Auto-ID)",
  "songName": "String",
  "songDes": "String (Artist Name)",
  "songImage": "String (Artwork URL)",
  "songPath": "String (Audio URL)",
  "albumName": "String",
  "duration": "Number (Seconds)",
  "createdAt": "ISO String",
  "updatedAt": "ISO String"
}
```

---

## 🔌 API Endpoints

### User Auth APIs
*   `POST /api/auth/signup` - Register a new user profile. Expects `{ username, password }`.
*   `POST /api/auth/login` - Authenticate credentials and return JWT token. Expects `{ username, password }`.
*   `GET /api/auth/me` - Retrieve the currently authenticated user details. (Requires Authorization header).

### Playlists APIs
*   `GET /api/playlists` - Retrieve public playlists, plus owned private playlists (if authenticated).
*   `POST /api/playlists` - Create a new playlist. Expects `{ name, description, coverImage, isPublic, songs }`. (Requires Authentication).
*   `GET /api/playlists/:id` - Fetch details and resolved song elements for a specific playlist.
*   `PUT /api/playlists/:id` - Edit playlist metadata. Expects `{ name, description, coverImage, isPublic }`. (Requires Ownership).
*   `DELETE /api/playlists/:id` - Delete a playlist. (Requires Ownership).
*   `POST /api/playlists/:id/add-song` - Add a song to the playlist. Expects `{ songId }`. (Requires Ownership).
*   `DELETE /api/playlists/:id/remove-song/:songId` - Remove a song from the playlist. (Requires Ownership).

### Songs APIs
*   `GET /api/songs` - List all tracks available in the database (supports search filters via `?search=query`).

---

## 💻 Setup & Start Instructions

To run Playvox locally:

### 1. Install Dependencies
Run npm install in the project folder to install the required packages:
```bash
npm install
```

### 2. Start the Server
Launch the Node development server:
```bash
# Run with nodemon for hot-reloads:
npm run dev

# Or run directly with node:
npm start
```

### 3. Open in Browser
Open `http://localhost:3000` in your web browser. 

---

## 🛠️ User Workflow Guide

1.  **Auth Registration**: Click **Sign up** in the header to visit `/signup`, or click **Log in** to visit `/login`. Enter the default testing credentials (`admin` / `password123`) or register a new account.
2.  **Create Playlist**: Click the **+** symbol in the left sidebar "Your Library" or the **Create playlist** button on the creation card. Enter a name, description, cover image URL, and select search-filtered songs from the picker checklist. Click **Create Playlist**.
3.  **Navigate & View**: Your new playlist dynamically displays below the creation card. Click it to navigate to `/playlist/:id` without page refresh. 
4.  **Audio Playback**: Click the green/purple **Play** or **Shuffle** button on the playlist page. The queue is overwritten and the playlist streams. Double-clicking any specific row plays that song.
5.  **Edit & Delete**: If you are the owner, click **Edit Details** to update metadata, **Add Songs** to append new tracks, or **Delete** to delete the playlist entirely.

---

## 🔮 Future Enhancements
*   **Cover Art Image Uploads**: Support uploading raw files directly to the server instead of specifying external URLs.
*   **Collaborative Playlists**: Allow multiple users to edit the same playlist.
*   **Custom Lyrics Sync**: Sync timed text subtitles with track audio playback positions.
