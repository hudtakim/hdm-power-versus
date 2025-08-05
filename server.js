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
                [player1Id]: { id: player1Id, role: 'Player 1', step: baseStep, mass: 0, scaler: baseScaler, tapCount: 0, boost: 1, boostState: false},
                [player2Id]: { id: player2Id, role: 'Player 2', step: baseStep, mass: 0, scaler: baseScaler, tapCount: 0, boost: 1, boostState: false}
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
        const playerIds = room.split('#');
        const opponentId = playerIds.find(id => id !== socket.id);
        const opponent = rooms[room].players[opponentId];
        
        if (rooms[room].pos > 0 && rooms[room].pos < 100) {
            if (player.role === 'Player 1') {
                rooms[room].pos += (player.step - opponent.mass);
            } else {
                rooms[room].pos -= (player.step - opponent.mass);
            }
        

            if(player.boostState && player.step > baseStep + player.scaler - baseScaler){ //reduce to base + current scale
                player.step -= (((player.role === 'Player 1' ? rooms[room].pos / 100 : (100 - rooms[room].pos) / 100) / 10) * (player.scaler/baseScaler));
            }
            if(player.step <= baseStep + player.scaler - baseScaler){
                player.boostState = false;
                player.step = baseStep + player.scaler - baseScaler;
            }

            player.tapCount++;

            opponent.boost += ((baseStep + player.scaler - baseScaler - opponent.mass + (player.mass*5)) * 0.01);

            io.to(room).emit('updateGame', { state: rooms[room] });
            //delete rooms[room]; 

        }else{
        // Cek kondisi game over
            if (rooms[room].pos <= 0 || rooms[room].pos >= 100) {
                let winnerId = null; // Inisialisasi winnerId

                if (rooms[room].pos <= 0) {
                    // Jika pos <= 0, pemenangnya adalah Player 2
                    for (const playerId in rooms[room].players) {
                        if (rooms[room].players[playerId].role === 'Player 2') {
                            winnerId = playerId;
                            break;
                        }
                    }
                } else if (rooms[room].pos >= 100) {
                    // Jika pos >= 100, pemenangnya adalah Player 1
                    for (const playerId in rooms[room].players) {
                        if (rooms[room].players[playerId].role === 'Player 1') {
                            winnerId = playerId;
                            break;
                        }
                    }
                }

                io.to(room).emit('gameOver', { 
                    state: rooms[room],
                    winnerId: winnerId 
                });

            }
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
            player.step = player.step + 0.1;
            player.mass += 0.02;
            //opponent.step = opponent.step > 0 ? opponent.step - 0.02 : 0;
            //opponent.reducer += (opponent.step > 0 ? 0.02 : 0);
        }

        io.to(room).emit('updateGame', { state: rooms[room] });
    });

        // --- Menangani aksi 'boost' dari client ---
    socket.on('boost', (room) => {
        if (!rooms[room]) return;
        const player = rooms[room].players[socket.id];
        player.step = player.step * player.boost;
        player.boostState = true;
        player.boost = 1;

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

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log('Server listening on http://localhost:' + port);
});