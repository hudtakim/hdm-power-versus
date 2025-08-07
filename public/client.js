let debugMode = true;

let socket = null;
let room = null;
let role = null;
let startTime = Date.now();
let intervalId = null;

let pos = 50;
let tapCount = 0;
let myScaler = 0.2;
let opponentScaler = 0.2;

let arena = document.getElementById('arena');
let energy1 = document.getElementById('energy1');
let energy2 = document.getElementById('energy2');
let aura1 = document.getElementById('aura1');
let aura2 = document.getElementById('aura2');
let playerSign1 = document.getElementById('playerSign1');
let playerSign2 = document.getElementById('playerSign2');

// Pendaftaran event listener sekarang berada di luar fungsi atau blok apa pun.
// Mereka akan diaktifkan saat skrip dimuat dan menunggu koneksi.

function setupSocketEvents(){    
    // --- Event dari Server ---
    // Pindahkan semua event listener ke sini, setelah objek socket dibuat.
    
    socket.on('startGame', (data) => {

        if(data.status === 'visitor'){
            document.getElementById('landing').style.display = 'none';
            document.getElementById('ingameWrapper').style.display = 'block';
            document.getElementById('roomId').textContent = `Room ID: ${data.roomId}` 
        }

        //alert('Game Started!');
        resetTimer();
        intervalId = setInterval(updateElapsedTime, 1000);
        room = data.room;
        role = data.role;

        document.getElementById('crackLeft').style.opacity = 0;
        document.getElementById('crackRight').style.opacity = 0;
        energy1.style.animation = 'glowing1 2s ease-in-out infinite';
        energy2.style.animation = 'glowing2 2s ease-in-out infinite';
        
        updateVisuals(data.state);

        document.getElementById('status').textContent = `${role} - Tap Fast!`;
        if(role === 'Player 1'){
            const playerTextShadow = '0 0 1px #FFF, 0 0 10px #FFF, 0 0 15px #FFF, 0 0 20px #1976d2, 0 0 30px #1976d2, 0 0 40px #1976d2, 0 0 55px #1976d2, 0 0 75px #1976d2, 0px -5px 20px rgba(206,89,55,0)';
            document.getElementById('status').style.textShadow = playerTextShadow;
            playerSign1.textContent = 'Player 1 (You)';
            playerSign2.textContent = 'Player 2 (Opponent)';
            playerSign1.style.fontWeight = 600;
            playerSign2.style.fontWeight = 400;
        }else{
            const playerTextShadow = '0 0 1px #FFF, 0 0 10px #FFF, 0 0 15px #FFF, 0 0 20px #8a2be2, 0 0 30px #8a2be2, 0 0 40px #8a2be2, 0 0 55px #8a2be2, 0 0 75px #8a2be2, 0px -5px 20px rgba(206,89,55,0)';
            document.getElementById('status').style.textShadow = playerTextShadow;
            playerSign1.textContent = 'Player 1 (Opponent)';
            playerSign2.textContent = 'Player 2 (You)';
            playerSign1.style.fontWeight = 400;
            playerSign2.style.fontWeight = 600;
        }

        document.getElementById('rematch').style.display = 'none';
        document.getElementById('exitBtn').style.display = 'none';
        document.getElementById('rematchSameBtn').style.display = 'none';
        document.getElementById('tapBtn').style.display = 'inline';
        document.getElementById('powerBtn').style.display = 'inline';
        document.getElementById('boostBtn').style.display = 'inline';
        document.getElementById('tapBtn').disabled = false;
        document.getElementById('powerBtn').disabled = false;
        document.getElementById('boostBtn').disabled = true;
    });

    socket.on('updateGame', (data) => {
        updateVisuals(data.state);
    });

    socket.on('gameOver', (data) => {
        stopTimer(intervalId);
        startRematchCountdown(document.getElementById('rematchSameBtn'), 'Rematch');
        startRematchCountdown(document.getElementById('exitBtn'), 'Return');
        let state = data.state;
        updateVisuals(state);

        const myPlayer = state.players[socket.id];
        const opponentId = Object.keys(state.players).find(id => id !== socket.id);
        const opponentPlayer = state.players[opponentId];
        let avgScaler = (myPlayer.scaler + opponentPlayer.scaler) / 2;
        
        document.getElementById('tapBtn').style.display = 'none';
        document.getElementById('powerBtn').style.display = 'none';
        document.getElementById('boostBtn').style.display = 'none';
        document.getElementById('rematchSameBtn').style.display = 'inline';
        document.getElementById('exitBtn').style.display = 'inline';
        
        if (data.winnerId === socket.id) {
            document.getElementById('status').textContent = 'You Win!';
        } else {
            document.getElementById('status').textContent = 'You Lose!';
        }

        if (state.pos <= 0) {
            energy2.style.animation = 'explode 1.2s ease-out forwards';
            aura2.style.opacity = '0';
            setTimeout(() => {
                energy1.style.animation = 'explode 1.2s ease-out forwards';
                aura1.style.opacity = '0';
            }, 200);

            const crack = document.getElementById('crackLeft');
            crack.style.transform = `scale(-${1 + avgScaler})`;
            crack.style.opacity = 1;
        } else if (state.pos >= 100) {
            energy1.style.animation = 'explode 1.2s ease-out forwards';
            aura1.style.opacity = '0';
            setTimeout(() => {
                energy2.style.animation = 'explode 1.2s ease-out forwards';
                aura2.style.opacity = '0';
            }, 200);

            const crack = document.getElementById('crackRight');
            crack.style.transform = `scale(${1 + avgScaler})`;
            crack.style.opacity = 1;
        }
    });

    socket.on('resetGame', (data) => {
        updateVisuals(data.state);
        
        document.getElementById('status').textContent = `${role} - Tap Fast!`;
        document.getElementById('exitBtn').style.display = 'none';
        document.getElementById('rematch').style.display = 'none';
        document.getElementById('rematchSameBtn').style.display = 'none';
        document.getElementById('tapBtn').disabled = false;
        document.getElementById('powerBtn').disabled = false;
        document.getElementById('boostBtn').disabled = true;
        document.getElementById('tapBtn').style.display = 'inline';
        document.getElementById('powerBtn').style.display = 'inline';
        document.getElementById('boostBtn').style.display = 'inline';
        energy1.style.animation = 'glowing1 2s ease-in-out infinite';
        energy2.style.animation = 'glowing2 2s ease-in-out infinite';
        document.getElementById('crackLeft').style.opacity = 0;
        document.getElementById('crackRight').style.opacity = 0;
        
        resetTimer();
        intervalId = setInterval(updateElapsedTime, 1000);
    });

    socket.on('opponentLeft', () => {
        document.getElementById('exitBtn').style.display = 'inline';
        document.getElementById('rematchSameBtn').style.display = 'none';
        document.getElementById('status').textContent = 'Opponent left.';
        document.getElementById('rematch').style.display = 'inline';
        document.getElementById('tapBtn').style.display = 'none';
        document.getElementById('powerBtn').style.display = 'none';
        document.getElementById('boostBtn').style.display = 'none';
        document.getElementById('tapBtn').disabled = true;
        document.getElementById('powerBtn').disabled = true;
        document.getElementById('boostBtn').disabled = true;
        stopTimer(intervalId);
    });

    socket.on('roomCreated', (data) => {
        document.getElementById('landing').style.display = 'none';
        document.getElementById('ingameWrapper').style.display = 'block';
        document.getElementById('roomId').textContent = `Room ID: ${data.roomId}`;
    });

    socket.on('roomNotFound', (data) => {
        alert(data.message);
        if(socket){
            socket.disconnect();
            socket = null;
        }
    });
    
    // Kirim event joinRoom setelah koneksi dibuat
    //socket.emit('joinRoom');
}

// ... (semua fungsi lainnya) ...

function startRematchCountdown(btnElement, baseText) {
    let countdown = 3;
    btnElement.disabled = true;

    const interval = setInterval(() => {
        if (countdown > 0) {
            btnElement.textContent = `${baseText}(${countdown})`;
        } else {
            btnElement.textContent = baseText;
            btnElement.disabled = false;
            clearInterval(interval);
        }
        countdown--;
    }, 1000);
}

function removeWhitespace(str) {
    return str.replace(/\s+/g, '');
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

function roundDownToOneDecimal(number, isBoostActive) {
    const multiplied = number * 10;
    const floored = Math.floor(multiplied);
    let result = floored / 10;
    if (isBoostActive && result < 1.1) {
        result = 1.1;
    }
    return result.toFixed(1);
}

function GetBoostLimit(scaler){
    return (-2 * scaler) + 15;
} 

function copy() {
    let teks = document.getElementById("roomId").innerText;
    let roomId = teks.split(' ')[2];
    navigator.clipboard.writeText(roomId).then(function() {
        alert("Copy success!");
    }).catch(function(err) {
        alert("Copy Failed: " + err);
    });
}

function updateVisuals(state) {
    const myPlayer = state.players[socket.id];
    const opponentId = Object.keys(state.players).find(id => id !== socket.id);
    const opponentPlayer = state.players[opponentId];
    
    pos = state.pos;
    energy1.style.left = `${pos}%`;
    energy2.style.right = `${100 - pos}%`;
    let auraPosReducer1 = 14;
    let auraPosReducer2 = 14;
    if(myPlayer.role === 'Player 1'){
        auraPosReducer2 = (8.8 * myPlayer.scaler) - 14;
        auraPosReducer1 = (8.8 * opponentPlayer.scaler) - 14;
    }else{
        auraPosReducer2 = (8.8 * opponentPlayer.scaler) - 14;
        auraPosReducer1 = (8.8 * myPlayer.scaler) - 14;
    }
    aura1.style.left = `calc(${pos}% + ${auraPosReducer1}px)`;
    aura2.style.right = `calc(${100 - pos}% + ${auraPosReducer2}px)`;
    
    if (myPlayer) {
        tapCount = myPlayer.tapCount;
        myScaler = myPlayer.scaler;
        document.getElementById('tapCount').textContent = tapCount;
        if(myPlayer.boost >= 1.1 && !myPlayer.boostState){
            document.getElementById('boostBtn').disabled = false;
        }
        if(myPlayer.boostState && document.getElementById('boostBtn').disabled === false){
            document.getElementById('boostBtn').disabled = true;
        }
        const playerBoostLimit = GetBoostLimit(myPlayer.scaler);
        const fillColor = myPlayer.role === 'Player 1' ? '#ff3f20' : '#963cdbff';
        document.getElementById('boostBtn').style.background = `linear-gradient(to right, ${fillColor} ${100 * (myPlayer.boost-1) / (playerBoostLimit-1)}%, #f0f0f0 0%)`;
        document.getElementById('boostBtn').textContent = `Boost (x${roundDownToOneDecimal(myPlayer.boost, myPlayer.boostState)})`;
    }
    if (opponentPlayer) {
        opponentScaler = opponentPlayer.scaler;
    }

    if(role === 'Player 1'){
        if(myScaler > opponentScaler){
            energy1.style.zIndex = 10;
            energy2.style.zIndex = 2;
        }else if(myScaler < opponentScaler){
            energy1.style.zIndex = 2;
            energy2.style.zIndex = 10;
        }else{
            energy1.style.zIndex = 1;
            energy2.style.zIndex = 1;
        }
    }else{
        if(myScaler > opponentScaler){
            energy1.style.zIndex = 2;
            energy2.style.zIndex = 10;
        }else if(myScaler < opponentScaler){
            energy1.style.zIndex = 10;
            energy2.style.zIndex = 2;
        }else{
            energy1.style.zIndex = 2;
            energy2.style.zIndex = 2;
        }
    }
    
    if (role === 'Player 1') {
        energy1.style.transform = `scale(${1 + opponentScaler})`;
        energy2.style.transform = `scale(${1 + myScaler})`;
        aura1.style.transform = `scale(${1 + opponentScaler})`;
        aura2.style.transform = `scale(${1 + myScaler})`;

        if(myPlayer.boostState){
            energy2.style.animation = 'boost2 2s ease-in-out infinite';
            aura2.style.opacity = myPlayer.boostOpacity + '';
        }else if(!myPlayer.boostState && energy2.style.animation !== 'glowing2 2s ease-in-out infinite'){
            energy2.style.animation = 'glowing2 2s ease-in-out infinite';
            aura2.style.opacity = '0';
        }
        
        if(opponentPlayer.boostState){
            energy1.style.animation = 'boost1 2s ease-in-out infinite';
            aura1.style.opacity = opponentPlayer.boostOpacity + '';
        }else if(!opponentPlayer.boostState && energy1.style.animation !== 'glowing1 2s ease-in-out infinite'){
            energy1.style.animation = 'glowing1 2s ease-in-out infinite';
            aura1.style.opacity = '0';
        }
    } else { // Player 2
        energy1.style.transform = `scale(${1 + myScaler})`;
        energy2.style.transform = `scale(${1 + opponentScaler})`;
        aura1.style.transform = `scale(${1 + myScaler})`;
        aura2.style.transform = `scale(${1 + opponentScaler})`;

        if(myPlayer.boostState){
            energy1.style.animation = 'boost1 2s ease-in-out infinite';
            aura1.style.opacity = myPlayer.boostOpacity + '';
        }else if(!myPlayer.boostState && energy1.style.animation !== 'glowing1 2s ease-in-out infinite'){
            energy1.style.animation = 'glowing1 2s ease-in-out infinite';
            aura1.style.opacity = '0';
        }
        
        if(opponentPlayer.boostState){
            energy2.style.animation = 'boost2 2s ease-in-out infinite';
            aura2.style.opacity = opponentPlayer.boostOpacity + '';
        }else if(!opponentPlayer.boostState && energy2.style.animation !== 'glowing2 2s ease-in-out infinite'){
            energy2.style.animation = 'glowing2 2s ease-in-out infinite';
            aura2.style.opacity = '0';
        }
    }

    if(myScaler >= 5) document.getElementById('powerBtn').disabled = true;
}

// --- Event Aksi Client (hanya mengirim sinyal ke server) ---
document.getElementById('tapBtn').addEventListener('click', () => {
    if (!room) return;
    socket.emit('tap', room);
});

document.getElementById('powerBtn').addEventListener('click', () => {
    if (!room) return;
    socket.emit('power', room);
});

document.getElementById('boostBtn').addEventListener('click', () => {
    if (!room) return;
    document.getElementById('boostBtn').disabled = true;
    socket.emit('boost', room);
});

document.getElementById('rematch').addEventListener('click', () => {
    if(socket) socket.emit('findNewOpponent');
    document.getElementById('status').textContent = 'Waiting for opponent...';
    document.getElementById('status').style.textShadow = 'none';
    document.getElementById('rematch').style.display = 'none';
    document.getElementById('crackLeft').style.opacity = 0;
    document.getElementById('crackRight').style.opacity = 0;
});

document.getElementById('rematchSameBtn').addEventListener('click', () => {
    if (!room) return;
    if(socket) socket.emit('rematchSame', room);
});

document.getElementById('btnRandom').addEventListener('click', () => {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('ingameWrapper').style.display = 'block';
    socket = io();
    setupSocketEvents();
    socket.emit('joinRoom');
});

document.getElementById('btnCreate').addEventListener('click', () => {
    if(!socket){
        socket = io();
        setupSocketEvents();
        socket.emit('createRoom');
    }
});

document.getElementById('btnJoin').addEventListener('click', () => {
    let roomId = document.getElementById('roomInput').value;
    roomId = removeWhitespace(roomId);

    if(!socket && roomId){
        socket = io();
        setupSocketEvents();
        socket.emit('joinRoom', {roomId: roomId});
    }
});

document.getElementById('exitBtn').addEventListener('click', () => {
    if(socket){
        socket.disconnect();
        socket = null;
    }
    document.getElementById('ingameWrapper').style.display = 'none';
    document.getElementById('landing').style.display = 'flex';
});

document.getElementById('btnInstruction').addEventListener('click', () => {
    document.getElementById('instructionPopup').style.display = 'flex';
});

if(!debugMode){
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.onkeydown = function(e) {
        if(event.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0))) || (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0))){
            return false;
        }
    }
}
