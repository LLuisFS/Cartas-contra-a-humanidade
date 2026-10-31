const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getNetworkInfo } = require('./network');
const { GameManager } = require('./gameManager');

const app = express();
const server = http.createServer(app);

// Enable CORS for LAN access
app.use(cors());
app.use(express.json());

// In production or single-port mode (e.g. Termux on mobile), default to 3000.
// In concurrent dev mode, development sets PORT=3001, Vite dev runs on 3000.
const PORT = process.env.PORT || (process.env.NODE_ENV === 'development' ? 3001 : 3000);
const CLIENT_PORT = process.env.CLIENT_PORT || 3000;

// Initialize Socket.io with open CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Game Manager with root directory containing CSVs or precompiled JSON
const rootDir = path.resolve(__dirname, '..');
const gameManager = new GameManager(rootDir);

// Track socket to room & player mapping
// Map: socketId -> { roomCode, playerId }
const socketMap = new Map();

/**
 * Broadcasts personalized state to each player in a room.
 * Ensures hands and pending submissions remain secret.
 * @param {string} roomCode 
 */
function broadcastRoomState(roomCode) {
  const room = gameManager.getRoom(roomCode);
  if (!room) return;

  room.players.forEach(player => {
    if (player.connected && player.socketId) {
      const state = room.getClientState(player.id);
      io.to(player.socketId).emit('room-state', state);
    }
  });
}

// 1. Network Info Endpoint
app.get('/api/network-info', (req, res) => {
  const net = getNetworkInfo();
  // Check if room has custom hotspot IP set
  const roomCode = req.query.room || 'LAN';
  const room = gameManager.getRoom(roomCode);
  const effectiveIp = (room && room.customIp) ? room.customIp : net.primaryIp;

  const isDevMode = process.env.NODE_ENV === 'development';
  const targetPort = isDevMode ? CLIENT_PORT : PORT;

  res.json({
    ip: effectiveIp,
    detectedIp: net.primaryIp,
    customIp: room ? room.customIp : null,
    interfaces: net.interfaces,
    serverPort: PORT,
    clientPort: targetPort,
    fullUrl: `http://${effectiveIp}:${targetPort}`,
    localUrl: `http://localhost:${targetPort}`
  });
});

// 2. Health / Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    port: PORT,
    roomsCount: gameManager.rooms.size,
    whiteCardsCount: gameManager.masterDeck.whiteCards.length,
    blackCardsCount: gameManager.masterDeck.blackCards.length
  });
});

// 3. Static Cards JSON Endpoint
app.get('/api/cards', (req, res) => {
  res.json({
    counts: {
      white: gameManager.masterDeck.whiteCards.length,
      black: gameManager.masterDeck.blackCards.length
    },
    whiteCards: gameManager.masterDeck.whiteCards,
    blackCards: gameManager.masterDeck.blackCards
  });
});

// 4. Serve client static build from 'dist' or 'client/dist'
const distCandidates = [
  path.resolve(rootDir, 'dist'),
  path.resolve(rootDir, 'client/dist')
];
let activeDistPath = distCandidates.find(p => fs.existsSync(p));

if (activeDistPath) {
  console.log(`[Static] Servindo arquivos da pasta: ${activeDistPath}`);
  app.use(express.static(activeDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.resolve(activeDistPath, 'index.html'));
  });
}

// 5. Socket.io Event Handlers
io.on('connection', (socket) => {
  // Join or reconnect to a room
  socket.on('join-room', ({ roomCode = 'LAN', playerId, playerName }) => {
    try {
      if (!playerId) {
        return socket.emit('error-msg', 'playerId é obrigatório.');
      }

      const room = gameManager.getOrCreateRoom(roomCode);
      const player = room.addOrReconnectPlayer(playerId, playerName, socket.id);

      socket.join(room.roomCode);
      socketMap.set(socket.id, { roomCode: room.roomCode, playerId: player.id });

      console.log(`[Socket] Jogador ${player.name} (${player.id}) conectado na sala ${room.roomCode}`);

      // Broadcast fresh state to all room members
      broadcastRoomState(room.roomCode);
    } catch (err) {
      console.error('[Socket join-room Error]:', err.message);
      socket.emit('error-msg', err.message);
    }
  });

  // Host updates game settings
  socket.on('update-settings', ({ roomCode, scoreLimit, handSize, minPlayersToStart, randomizeHandEachRound }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      const player = room.getPlayer(meta.playerId);
      if (!player || !player.isHost) {
        return socket.emit('error-msg', 'Apenas o host pode alterar as configurações.');
      }

      room.updateSettings({ scoreLimit, handSize, minPlayersToStart, randomizeHandEachRound });
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Host sets custom hotspot IP
  socket.on('set-custom-ip', ({ roomCode, customIp }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.setCustomIp(customIp, meta.playerId);
      console.log(`[Socket] IP da sala ${roomCode} atualizado para: ${customIp}`);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Host disbands / resets the room
  socket.on('disband-room', ({ roomCode }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.disbandRoom(meta.playerId);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Host kicks a player
  socket.on('kick-player', ({ roomCode, targetPlayerId }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.kickPlayer(targetPlayerId, meta.playerId);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Host starts the game
  socket.on('start-game', ({ roomCode }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      const player = room.getPlayer(meta.playerId);
      if (!player || !player.isHost) {
        return socket.emit('error-msg', 'Apenas o host pode iniciar a partida.');
      }

      room.startGame();
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Player submits white cards
  socket.on('submit-cards', ({ roomCode, cardIds }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.submitCards(meta.playerId, cardIds);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Czar reveals a single submission
  socket.on('reveal-submission', ({ roomCode, submissionId }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.revealSubmission(submissionId, meta.playerId);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Czar reveals all submissions
  socket.on('reveal-all', ({ roomCode }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.revealAllSubmissions(meta.playerId);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Czar selects winning submission
  socket.on('select-winner', ({ roomCode, submissionId }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.selectWinner(submissionId, meta.playerId);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Next round requested
  socket.on('next-round', ({ roomCode }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.nextRound(meta.playerId);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Restart game after GAME_OVER
  socket.on('restart-game', ({ roomCode }) => {
    try {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;

      const meta = socketMap.get(socket.id);
      if (!meta) return;

      room.restartGame(meta.playerId);
      broadcastRoomState(room.roomCode);
    } catch (err) {
      socket.emit('error-msg', err.message);
    }
  });

  // Disconnection handler
  socket.on('disconnect', () => {
    const meta = socketMap.get(socket.id);
    if (meta) {
      const room = gameManager.getRoom(meta.roomCode);
      if (room) {
        room.disconnectPlayer(socket.id);
        console.log(`[Socket] Jogador ${meta.playerId} desconectou da sala ${meta.roomCode}`);
        broadcastRoomState(room.roomCode);
      }
      socketMap.delete(socket.id);
    }
  });
});

// Function to start server listening
function startServer() {
  server.listen(PORT, '0.0.0.0', () => {
    const net = getNetworkInfo();
    const isDevMode = process.env.NODE_ENV === 'development';
    const targetPort = isDevMode ? CLIENT_PORT : PORT;

    console.log('\n======================================================');
    console.log('🃏  CARTAS CONTRA A HUMANIDADE (PT-BR) - SERVIDOR LAN');
    console.log('======================================================');
    console.log(`📡 Servidor escutando em: 0.0.0.0:${PORT}`);
    console.log(`📱 Acesso Local:         http://localhost:${targetPort}`);
    console.log(`🔥 Acesso na Rede / LAN: http://${net.primaryIp}:${targetPort}`);
    console.log('======================================================\n');
  });
}

// Automatically start if executed directly
if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  server,
  io,
  gameManager,
  startServer
};
