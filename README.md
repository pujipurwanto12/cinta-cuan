# Cinta & Cuan — Couple Property Board Game

Realtime 2-player browser board game inspired by classic property board games.

## Stack
- Node.js + Express
- Socket.IO realtime multiplayer
- Responsive HTML/CSS/JS
- 3D-style board, dice and pawns using CSS/SVG-like UI (no image asset dependency)

## Local
```bash
npm install
npm start
```
Open http://localhost:3000 in two browser windows/devices.

## Render
Repository root must contain `package.json`, `server.js`, and `public/` directly.
- Root Directory: leave blank
- Build Command: `npm install`
- Start Command: `npm start`

## Multiplayer
Create a room on device 1, then join with the 5-character room code on device 2. The server is authoritative for dice, turns, money, properties and card effects.
