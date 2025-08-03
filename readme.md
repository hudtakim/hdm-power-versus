# HDM Power Versus ⚡

**HDM Power Versus** is a fast-paced, real-time multiplayer web game where two players compete by tapping to generate power and push a shared energy ball toward the opponent's side. It's a game of speed, focus, and stamina — built with **Node.js**, **Socket.IO**, and vanilla **HTML/JS**.

## 🎮 Gameplay Overview

Two players are matched in a private room. Each player taps rapidly to increase their energy level. The combined energy determines the position of a single energy ball. Whoever pushes the ball fully into the opponent's side wins the match.

## 📜 Game Rules

- The game is always played between **two players**.
- The central energy ball moves based on the net energy of both players.
- Each **tap** adds a fixed amount of energy to the player.
- The ball moves toward the player with **less energy**.
- The game ends when the ball reaches **either player's end**.
- Players can **rematch** once a game ends.

## 🚀 Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js with Express and Socket.IO
- **Realtime Communication**: WebSockets via Socket.IO

## 🛠️ Installation & Running Locally

1. **Clone this repository**:

    ```bash
    git clone https://github.com/yourusername/hdm-power-versus.git
    cd hdm-power-versus
    ```

2. **Install dependencies**:

    ```bash
    npm install
    ```

3. **Start the server**:

    ```bash
    node server.js
    ```

4. **Open in browser**:

    Go to [http://localhost:3000](http://localhost:3000) in two browser tabs or share the link with a friend on the same network.

## 📁 Project Structure

hdm-power-versus/
├── public/
│ ├── index.html
│ ├── client.js
│ └── style.css
├── server.js
├── package.json
└── README.md

markdown
Copy
Edit


## 🧠 Notes

- The server handles **all position and score calculations** to ensure fairness and prevent cheating.
- All players receive synchronized ball position updates via Socket.IO events.
- Room handling allows scalable matchmaking for multiple pairs of players.

## ✅ Features

- Realtime PvP gameplay
- Room-based matchmaking
- Central energy ball physics
- Simple tap-based input
- Game win detection and rematch support

## 📌 To-Do / Improvements

- Add lobby or matchmaking queue
- Improve UI/UX with animations and effects
- Add mobile responsiveness
- Sound effects and countdowns
- Scoreboard or ranking system

## 📄 License

This project is open-source and free to use for educational or personal projects.

---

Enjoy the battle of energy! ⚡🔥
