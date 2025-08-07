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
const maxScaler = 5;

function GetBoostLimit(scaler){
    return (-2 * scaler) + 15;
} 

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

            // Function to initialize or reset a game room
    const initGame = (room, player1Id, player2Id) => {
        rooms[room] = {
            pos: 50,
            isGameOver: false,
            players: {
                [player1Id]: { id: player1Id, role: 'Player 1', username:'', step: baseStep, mass: 0, scaler: 0, tapCount: 0, boost: 1, boostState: false, boostOpacity: 0},
                [player2Id]: { id: player2Id, role: 'Player 2', username:'', step: baseStep, mass: 0, scaler: 0, tapCount: 0, boost: 1, boostState: false, boostOpacity: 0}
            }
        };
    };

    socket.on('joinRoom', (data) => {
        //const username = data.username; // Simpan username di objek socket
        let roomId = data?.roomId
        // --- Pemain mencari lawan dan memulai game ---
        if (roomId) {
            // Bergabung ke room dengan ID spesifik
            const room = rooms[roomId];
            if (room && room.isWaiting) {
                const player1Id = Object.keys(room.players)[0];
                const player2Id = socket.id;
                // Hapus room lama dengan ID sederhana
                delete rooms[roomId];

                // Buat ID room baru dengan format yang konsisten
                const newRoomId = `${player1Id}#${player2Id}`;

                // Player 1 (creator) dan Player 2 (joiner) bergabung ke room baru
                socket.join(newRoomId);
                io.sockets.sockets.get(player1Id)?.join(newRoomId);

                // Inisialisasi game dengan ID room baru
                initGame(newRoomId, player1Id, player2Id);

                // Mengirimkan event 'startGame' ke kedua pemain
                io.to(player1Id).emit('startGame', {
                    room: newRoomId,
                    role: rooms[newRoomId].players[player1Id].role,
                    state: rooms[newRoomId],
                    status: 'creator'
                });
                io.to(player2Id).emit('startGame', {
                    room: newRoomId,
                    role: rooms[newRoomId].players[player2Id].role,
                    state: rooms[newRoomId],
                    status: 'visitor',
                    roomId: data?.roomId
                });
                //console.log(`Joined room ${roomId}. Game started!`);
            } else {
                socket.emit('roomNotFound', { message: 'Room not found or already full.' });
            }
        } else {
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
        }
    });

    // --- Pemain membuat room baru ---
    socket.on('createRoom', () => {
       // const username = data.username;
        const room = socket.id;
        socket.join(room);
        rooms[room] = {
            players: {
                [socket.id]: { id: socket.id, role: 'Player 1', username: '', step: baseStep, mass: 0, scaler: 0, tapCount: 0, boost: 1, boostState: false, boostOpacity: 0 }
            },
            isWaiting: true // Menandai room ini sedang menunggu pemain lain
        };
        
        // Mengirimkan Room ID kembali ke klien yang membuat room
        socket.emit('roomCreated', { roomId: room });
        //console.log(`Room created with ID: ${room} by ${username}`);
    });

    // --- Menangani aksi 'tap' dari client ---
    socket.on('tap', (room) => {
        if (!rooms[room]) return;
        if (rooms[room].isGameOver) return;

        const player = rooms[room].players[socket.id];
        const playerIds = room.split('#');
        const opponentId = playerIds.find(id => id !== socket.id);
        const opponent = rooms[room].players[opponentId];

        if (rooms[room].pos > 0 && rooms[room].pos < 100) {
            player.tapCount++;
            if (player.role === 'Player 1') {
                rooms[room].pos += (player.step - opponent.mass)/2;
                if(rooms[room].pos < 15 && !player.boostState && player.boost >= 1.1){
                    player.boostState = true;
                    player.step *= player.boost;
                    player.boostOpacity = 1;
                }
            } else {
                rooms[room].pos -= (player.step - opponent.mass)/2;
                if(rooms[room].pos > 85 && !player.boostState && player.boost >= 1.1){
                    player.boostState = true;
                    player.step *= player.boost;
                    player.boostOpacity = 1;
                }
            }
        }        
        if (rooms[room].pos > 0 && rooms[room].pos < 100) {
            let massScale = opponent.mass > 0 ? (player.mass + 1) / (opponent.mass + 1) : player.mass;
            const stepScale = player.step / opponent.step;
            const posScale = player.role === 'Player 1' ? rooms[room].pos / 100 : (100 - rooms[room].pos) / 100;
            const boostLimit = GetBoostLimit(opponent.scaler);
            if(!opponent.boostState && opponent.boost <= boostLimit){
                opponent.boost += ((player.step - opponent.mass) * massScale * stepScale * posScale * 0.05);
            }
            if(opponent.boost > boostLimit){
                opponent.boost = boostLimit;
            }

            if(player.boostState && (player.step > baseStep + player.scaler)){ //reduce to its normal step
                //player.step -= (((player.role === 'Player 1' ? rooms[room].pos / 100 : (100 - rooms[room].pos) / 100) * player.boost));
                player.step -= ((player.step - (baseStep + player.scaler)) * posScale);  
                player.boost = player.step / (baseStep + player.scaler);
                if(player.boost < 1) player.boost = 1;
                player.boostOpacity = player.boost >= 2 ? 1 : (player.boost - 1 > 0.5 ? player.boost - 1 : 0.5);     
            };

            if(player.step <= baseStep + player.scaler){
                player.step = baseStep + player.scaler;
                player.boostState = false;    
                player.boostOpacity = 0;
            }

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

                    // Set status game over
                rooms[room].isGameOver = true;  

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
        if (rooms[room].isGameOver) return;
        
        const player = rooms[room].players[socket.id];
        //const playerIds = room.split('#');
        //const opponentId = playerIds.find(id => id !== socket.id);
        //const opponent = rooms[room].players[opponentId];

        if (player.scaler < maxScaler) {
            player.scaler = Math.min(maxScaler, player.scaler + 0.1);

            const boostLimit = GetBoostLimit(player.scaler);
            if(player.boost > boostLimit) player.boost = boostLimit;

            player.step += 0.1;
            player.mass += 0.02;
            //opponent.step = opponent.step > 0 ? opponent.step - 0.02 : 0;
            //opponent.reducer += (opponent.step > 0 ? 0.02 : 0);
        }

        io.to(room).emit('updateGame', { state: rooms[room] });
    });

        // --- Menangani aksi 'boost' dari client ---
    socket.on('boost', (room) => {
        if (!rooms[room]) return;
        if (rooms[room].isGameOver) return;

        const player = rooms[room].players[socket.id];
        player.boostState = true;
        player.step *= player.boost;
        player.boostOpacity = 1;
        //player.boost = 1;

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