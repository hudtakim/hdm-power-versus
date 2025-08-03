const socket = io();
let debugMode = true;
let room = null;
let role = null;
let startTime = Date.now();
let intervalId = null;

// Variabel lokal untuk visual, akan diisi dari data server
let pos = 50;
let tapCount = 0;
let myScaler = 0.2;
let opponentScaler = 0.2;

let arena = document.getElementById('arena');
let energy1 = document.getElementById('energy1');
let energy2 = document.getElementById('energy2');

function startRematchCountdown(rematchBtn) {
    let countdown = 3;
    rematchBtn.disabled = true;

    const interval = setInterval(() => {
        if (countdown > 0) {
            rematchBtn.textContent = `Rematch(${countdown})`;
        } else {
            rematchBtn.textContent = 'Rematch';
            rematchBtn.disabled = false;
            clearInterval(interval);
        }
        countdown--;
    }, 1000);
}

function formatTime(seconds) {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

function updateElapsedTime() {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    document.getElementById("elapsed").textContent = formatTime(elapsedSeconds);
}

function stopTimer(intervalId) {
    clearInterval(intervalId);
}

function resetTimer() {
    startTime = Date.now();
    document.getElementById("elapsed").textContent = "00:00:00";
}

function updateVisuals(state) {
    // Cari data pemain kita dan lawan dari objek state
    const myPlayer = state.players[socket.id];
    const opponentId = Object.keys(state.players).find(id => id !== socket.id);
    const opponentPlayer = state.players[opponentId];
    
    // Memperbarui posisi
    pos = state.pos;
    energy1.style.left = `${pos}%`;
    energy2.style.right = `${100 - pos}%`;
    if(pos < 50){
        energy1.style.zIndex = 10;
        energy2.style.zIndex = 1;
    }else{
        energy1.style.zIndex = 1;
        energy2.style.zIndex = 10;
    }

    // Memperbarui hitungan tap dan scaler
    if (myPlayer) {
        tapCount = myPlayer.tapCount;
        myScaler = myPlayer.scaler;
        document.getElementById('tapCount').textContent = tapCount;
    }
    if (opponentPlayer) {
        opponentScaler = opponentPlayer.scaler;
    }
    
    // Memperbarui visual orb berdasarkan peran
    if (role === 'Player 1') {
        energy1.style.transform = `scale(${1 + opponentScaler})`;
        energy2.style.transform = `scale(${1 + myScaler})`;
    } else { // Player 2
        energy1.style.transform = `scale(${1 + myScaler})`;
        energy2.style.transform = `scale(${1 + opponentScaler})`;
    }

    if(myScaler >= 5)  document.getElementById('powerBtn').disabled = true;
}

// --- Event dari Server ---

socket.on('startGame', (data) => {
    resetTimer();
    intervalId = setInterval(updateElapsedTime, 1000);
    room = data.room;
    role = data.role;

    if(document.getElementById('crackLeft')) document.getElementById('crackLeft').remove();
    if(document.getElementById('crackRight')) document.getElementById('crackRight').remove();
    
    updateVisuals(data.state);

    document.getElementById('status').textContent = `${role} - Tap Fast!`;
    if(role === 'Player 1'){
        document.getElementById('status').style.textShadow = '0 0 1px #FFF, 0 0 10px #FFF, 0 0 15px #FFF, 0 0 20px #1976d2, 0 0 30px #1976d2, 0 0 40px #1976d2, 0 0 55px #1976d2, 0 0 75px #1976d2, 0px -5px 20px rgba(206,89,55,0)';
    }else{
        document.getElementById('status').style.textShadow = '0 0 1px #FFF, 0 0 10px #FFF, 0 0 15px #FFF, 0 0 20px #8a2be2, 0 0 30px #8a2be2, 0 0 40px #8a2be2, 0 0 55px #8a2be2, 0 0 75px #8a2be2, 0px -5px 20px rgba(206,89,55,0)';
    }

    document.getElementById('rematch').style.display = 'none';
    document.getElementById('rematchSameBtn').style.display = 'none';
    document.getElementById('tapBtn').disabled = false;
    document.getElementById('powerBtn').disabled = false;
});

socket.on('updateGame', (data) => {
    updateVisuals(data.state);
});

socket.on('gameOver', (data) => {
    let state = data.state;
    let role = data.role;
    updateVisuals(data.state);

    const myPlayer = state.players[socket.id];
    const opponentId = Object.keys(state.players).find(id => id !== socket.id);
    const opponentPlayer = state.players[opponentId];
    let avgScaler = (myPlayer.scaler + opponentPlayer.scaler) / 2;
    
    document.getElementById('tapBtn').disabled = true;
    document.getElementById('powerBtn').disabled = true;
    document.getElementById('rematchSameBtn').style.display = 'inline';
    
    // Menggunakan data winnerId dari server untuk menentukan menang/kalah
    if (data.winnerId === socket.id) {
      document.getElementById('status').textContent = 'You Win!';
    } else {
      document.getElementById('status').textContent = 'You Lose!';
    }

    // Menggunakan posisi akhir dari server untuk animasi
    if (data.state.pos <= 0) {
        energy2.style.animation = 'explode 1.2s ease-out forwards';
        setTimeout(() => {
            energy1.style.animation = 'explode 1.2s ease-out forwards';
        }, 300);
        let newElement = document.createElement('div');
        newElement.className = 'crackLeft';
        newElement.id = 'crackLeft';
        newElement.style.transform = `scale(-${1 + avgScaler})`;
        arena.appendChild(newElement);
    } else if (data.state.pos >= 100) {
        energy1.style.animation = 'explode 1.2s ease-out forwards';
        setTimeout(() => {
            energy2.style.animation = 'explode 1.2s ease-out forwards';
        }, 300);
        let newElement = document.createElement('div');
        newElement.className = 'crackRight';
        newElement.id = 'crackRight';
        newElement.style.transform = `scale(${1 + avgScaler})`;
        arena.appendChild(newElement);
    }

    stopTimer(intervalId);
    startRematchCountdown(document.getElementById('rematchSameBtn'));
});

socket.on('resetGame', (data) => {
    updateVisuals(data.state);
    
    document.getElementById('status').textContent = `${role} - Tap Fast!`;
    document.getElementById('rematch').style.display = 'none';
    document.getElementById('rematchSameBtn').style.display = 'none';
    document.getElementById('tapBtn').disabled = false;
    document.getElementById('powerBtn').disabled = false;
    if(document.getElementById('crackLeft')) document.getElementById('crackLeft').remove();
    if(document.getElementById('crackRight')) document.getElementById('crackRight').remove();
    energy1.style.animation = 'glowing1 2s ease-in-out infinite';
    energy2.style.animation = 'glowing2 2s ease-in-out infinite';
    
    resetTimer();
    intervalId = setInterval(updateElapsedTime, 1000);
});

socket.on('opponentLeft', () => {
    document.getElementById('rematchSameBtn').style.display = 'none';
    document.getElementById('status').textContent = 'Opponent left.';
    document.getElementById('rematch').style.display = 'inline';
    document.getElementById('tapBtn').disabled = true;
    document.getElementById('powerBtn').disabled = true;
    stopTimer(intervalId);
});

// --- Event Aksi Client (hanya mengirim sinyal ke server) ---

document.getElementById('tapBtn').addEventListener('click', () => {
    if (!room) return;
    socket.emit('tap', room);
});

document.getElementById('powerBtn').addEventListener('click', () => {
    if (!room) return;
    socket.emit('power', room);
});

document.getElementById('rematch').addEventListener('click', () => {
    socket.emit('findNewOpponent');
    energy1.style.animation = 'glowing1 2s ease-in-out infinite';
    energy2.style.animation = 'glowing2 2s ease-in-out infinite';
});

document.getElementById('rematchSameBtn').addEventListener('click', () => {
    if (!room) return;
    socket.emit('rematchSame', room);
});


if(!debugMode){
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.onkeydown = function(e) {
        if(event.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0))) || (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0))){
            return false;
        }
    }
}