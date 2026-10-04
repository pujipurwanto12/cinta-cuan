# ❤️ Cinta & Cuan — Final

Realtime 2-player couple board game built with Node.js, Express and Socket.IO.

## Features
- Laptop ↔ HP realtime multiplayer
- Room code + reconnect session token
- Server-side dice and game state
- 21-space board
- Property purchase + rent
- Love & Chaos cards
- Chained movement effects resolve destination tile
- Turn phases: roll → resolve → buy/skip → next turn
- Animated dice, pawn movement, event/card modal
- Money/property/winner feedback
- Reactions + lightweight chat
- Optional sound effects via Web Audio
- Mobile-first responsive UI
- Room auto-expiry after inactivity

## Run locally
```bash
npm install
npm start
```
Open `http://localhost:3000`.

## Deploy
Use a Node/WebSocket capable host such as Render. Connect the GitHub repository and use:
- Build Command: `npm install`
- Start Command: `npm start`

Do not deploy this as a GitHub Pages-only site because Socket.IO requires a running Node server.
