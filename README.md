# 📓 Stickman War - Online Multiplayer Notebook Game

A nostalgic school notebook pencil-and-paper multiplayer stickman strategy battle game built with **React, Vite, TypeScript, Tailwind CSS, Web Audio API, PeerJS (WebRTC), and Firebase Realtime Database**.

---

## 🎮 Game Rules & Overview

- **Battlefield Layout:** Authentic 3-column lined school notebook page:
  - Column 1: Row Numbers `[0, 2, 4, 6, 8]`
  - Column 2: Player 1's Stickman Army (Blue Pen Ink)
  - Column 3: Player 2's Stickman Army (Red Pen Ink / StickBot)
- **The Notebook Die:**
  - Has 5 numbers: `0, 2, 4, 6, 8` with equal **20% uniform probabilities**.
  - Tumbling 3D paper die animation with authentic rattle sound effects.
- **Stickman Evolution:**
  - **1st Roll on Row:** **Stage 1 (Head)** - Hand-drawn doodle circle with smiling stickman face.
  - **2nd Roll on Row:** **Stage 2 (Body)** - Stick figure torso, arms, and legs.
  - **3rd Roll on Row:** **Stage 3 (Armed)** - Stickman completed! Opens the *Weapon Selection Modal* to choose:
    - 🗡️ **Ink Katana** (Classic pencil broadsword)
    - 🎯 **Ballpoint Sniper** (Long-range precision ink rifle)
    - 🚀 **Eraser Bazooka** (Explosive doodle rocket launcher)
    - 🏹 **Ruler Bow** (Curved wood ruler & sharp pencil arrows)
    - ⚡ **Highlighter Blaster** (Neon highlighter laser blaster)
  - **4th+ Roll on Armed Row:** **Attack Phase!** Stickman is ready to strike! Click *any valid opponent row* to cross it out with a frantic red scribble cross (`❌`)!
- **Dead Rolls:**
  - If a player rolls a row that has already been destroyed by an enemy attack, it is a **Dead Roll**! Turn skips to the opponent.
- **Victory Condition:**
  - Completely destroy all 5 rows of the opponent's stickman army to trigger the victory celebration with doodle trophy, confetti bursts, and fanfare!

---

## 🕹️ Supported Game Modes

1. **Pass & Play (Local 2-Player):**
   - Play side-by-side with a friend on the same computer screen, tablet, or smartphone.
2. **Solo vs StickBot (AI):**
   - Play against an automated stickman AI bot that rolls, selects weapons, and strategically targets your strongest stickmen!
3. **Online Real-Time Multiplayer (WebRTC P2P):**
   - **Zero setup required!** Instant peer-to-peer room system (`SM-XXXX`).
   - Host clicks **Create Room**, copies the 4-letter room code, and shares it with a friend.
   - Friend clicks **Join Room**, enters the code, and syncs moves in real-time.
4. **Online Multiplayer (Firebase Realtime Database):**
   - Enter your Firebase project credentials in the in-game setup modal to sync state using Google Firebase Realtime Database (`set()` and `onValue()` listeners).

---

## 🔊 Sound & Animations

- **Web Audio API Engine:** 100% procedurally synthesized audio with zero external asset dependencies:
  - Realistic pencil scribbles as stickmen are drawn.
  - Tumbling die rattle and click sounds.
  - Weapon fire whooshes, snipers, rockets, and sword slashes.
  - Red scribble tearing sounds when rows are destroyed.
  - Dead roll buzzes and victory fanfare.
  - Built-in audio mute/unmute toggle.
- **Visuals:**
  - Lined school notebook paper with blue horizontal ruling lines and left red margin.
  - Metal spiral binder punch rings down the left edge.
  - SVG stroke line-drawing animations.
  - Real-time reaction stamps (`✏️`, `💥`, `💀`, `🎯`, `🏆`, `🔥`).

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Open your browser at `http://localhost:5173/` (or `http://localhost:5174/`).

---

## 🌐 Deploy to Vercel or Netlify

### Vercel:
```bash
npm run build
# Deploy dist folder
npx vercel
```

### Netlify:
```bash
npm run build
# Deploy dist folder
npx netlify deploy --dir=dist --prod
```
