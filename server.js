const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/public'));

let waitingPlayer = null;
const rooms = {};

const baseStep = 2;
const baseScaler = 0.2;
const maxScaler = 5;

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Function to initialize or reset a game room
    const initGame = (room, player1Id, player2Id) => {
        rooms[room] = {
            pos: 50,
            players: {
                [player1Id]: { id: player1Id, role: 'Player 1', step: baseStep, scaler: baseScaler, tapCount: 0 },
                [player2Id]: { id: player2Id, role: 'Player 2', step: baseStep, scaler: baseScaler, tapCount: 0 }
            }
        };
    };

    // --- Pemain mencari lawan dan memulai game ---
    if (waitingPlayer) {
        const room = `${waitingPlayer.id}#${socket.id}`;
        socket.join(room);
        waitingPlayer.join(room);

        initGame(room, waitingPlayer.id, socket.id);

        io.to(waitingPlayer.id).emit('startGame', {
            room,
            role: rooms[room].players[waitingPlayer.id].role,
            state: rooms[room]
        });
        io.to(socket.id).emit('startGame', {
            room,
            role: rooms[room].players[socket.id].role,
            state: rooms[room]
        });
        waitingPlayer = null;
    } else {
        waitingPlayer = socket;
    }

    // --- Menangani aksi 'tap' dari client ---
    socket.on('tap', (room) => {
        if (!rooms[room]) return;

        const player = rooms[room].players[socket.id];
        
        if (player.role === 'Player 1') {
            rooms[room].pos += player.step;
        } else {
            rooms[room].pos -= player.step;
        }
        player.tapCount++;
        
        // Cek kondisi game over
        if (rooms[room].pos <= 0 || rooms[room].pos >= 100) {
            io.to(room).emit('gameOver', { 
                state: rooms[room],
                winnerId: socket.id 
            });
            //delete rooms[room]; 
        } else {
            io.to(room).emit('updateGame', { state: rooms[room] });
        }
    });

    // --- Menangani aksi 'power' dari client ---
    socket.on('power', (room) => {
        if (!rooms[room]) return;
        
        const player = rooms[room].players[socket.id];

        const playerIds = room.split('#');
        const opponentId = playerIds.find(id => id !== socket.id);
        const opponent = rooms[room].players[opponentId];

        if (player.scaler < maxScaler) {
            player.scaler = Math.min(maxScaler, player.scaler + 0.1);
            player.step = Math.min(baseStep + (maxScaler - baseScaler), player.step + 0.1);
            opponent.step = Math.min(baseStep + (maxScaler - baseScaler), opponent.step - 0.02);
        }

        io.to(room).emit('updateGame', { state: rooms[room] });
    });

    // --- Menangani rematch ---
    socket.on('rematchSame', (room) => {
        const playerIds = room.split('#');
        const player1Id = playerIds[0];
        const player2Id = playerIds[1];
        
        // Inisialisasi ulang room
        initGame(room, player1Id, player2Id);
        
        io.to(room).emit('resetGame', { state: rooms[room] });
    });

    // --- Menangani pencarian lawan baru ---
    socket.on('findNewOpponent', () => {
        if (waitingPlayer === null) {
            waitingPlayer = socket;
        } else if (waitingPlayer.id !== socket.id) {
            const room = `${waitingPlayer.id}#${socket.id}`;
            socket.join(room);
            waitingPlayer.join(room);

            initGame(room, waitingPlayer.id, socket.id);

            io.to(waitingPlayer.id).emit('startGame', {
                room,
                role: rooms[room].players[waitingPlayer.id].role,
                state: rooms[room]
            });
            io.to(socket.id).emit('startGame', {
                room,
                role: rooms[room].players[socket.id].role,
                state: rooms[room]
            });
            waitingPlayer = null;
        }
    });

    // --- Menangani diskoeksi ---
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
        let roomToLeave = Object.keys(rooms).find(room => room.includes(socket.id));
        if(roomToLeave){
            socket.to(roomToLeave).emit('opponentLeft');
            delete rooms[roomToLeave];
        }
    });
});

server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
});