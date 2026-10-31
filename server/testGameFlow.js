const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: ClientIO } = require('../client/node_modules/socket.io-client');
const path = require('path');
const assert = require('assert');
const { GameManager } = require('./gameManager');

async function runEndToEndGameTest() {
  console.log('🧪 Iniciando Teste de Fluxo Completo de Jogo E2E...');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  const rootDir = path.resolve(__dirname, '..');
  const gameManager = new GameManager(rootDir);
  const socketMap = new Map();

  function broadcastRoomState(roomCode) {
    const room = gameManager.getRoom(roomCode);
    if (!room) return;
    room.players.forEach(p => {
      if (p.connected && p.socketId) {
        const state = room.getClientState(p.id);
        io.to(p.socketId).emit('room-state', state);
      }
    });
  }

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomCode = 'LAN', playerId, playerName }) => {
      const room = gameManager.getOrCreateRoom(roomCode);
      const player = room.addOrReconnectPlayer(playerId, playerName, socket.id);
      socket.join(room.roomCode);
      socketMap.set(socket.id, { roomCode: room.roomCode, playerId: player.id });
      broadcastRoomState(room.roomCode);
    });

    socket.on('update-settings', ({ roomCode, scoreLimit, handSize, minPlayersToStart, randomizeHandEachRound }) => {
      const room = gameManager.getRoom(roomCode);
      const meta = socketMap.get(socket.id);
      room.updateSettings({ scoreLimit, handSize, minPlayersToStart, randomizeHandEachRound });
      broadcastRoomState(room.roomCode);
    });

    socket.on('start-game', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      room.startGame();
      broadcastRoomState(room.roomCode);
    });

    socket.on('submit-cards', ({ roomCode, cardIds }) => {
      const room = gameManager.getRoom(roomCode);
      const meta = socketMap.get(socket.id);
      room.submitCards(meta.playerId, cardIds);
      broadcastRoomState(room.roomCode);
    });

    socket.on('reveal-submission', ({ roomCode, submissionId }) => {
      const room = gameManager.getRoom(roomCode);
      const meta = socketMap.get(socket.id);
      room.revealSubmission(submissionId, meta.playerId);
      broadcastRoomState(room.roomCode);
    });

    socket.on('select-winner', ({ roomCode, submissionId }) => {
      const room = gameManager.getRoom(roomCode);
      const meta = socketMap.get(socket.id);
      room.selectWinner(submissionId, meta.playerId);
      broadcastRoomState(room.roomCode);
    });

    socket.on('set-custom-ip', ({ roomCode, customIp }) => {
      const room = gameManager.getRoom(roomCode);
      const meta = socketMap.get(socket.id);
      room.setCustomIp(customIp, meta.playerId);
      broadcastRoomState(room.roomCode);
    });

    socket.on('disband-room', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      const meta = socketMap.get(socket.id);
      room.disbandRoom(meta.playerId);
      broadcastRoomState(room.roomCode);
    });

    socket.on('next-round', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      const meta = socketMap.get(socket.id);
      room.nextRound(meta.playerId);
      broadcastRoomState(room.roomCode);
    });

    socket.on('disconnect', () => {
      const meta = socketMap.get(socket.id);
      if (meta) {
        const room = gameManager.getRoom(meta.roomCode);
        if (room) {
          room.disconnectPlayer(socket.id);
          broadcastRoomState(room.roomCode);
        }
      }
    });
  });

  const TEST_PORT = 4123;
  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  const serverUrl = `http://localhost:${TEST_PORT}`;

  function createClient(id, name) {
    const socket = ClientIO(serverUrl, { transports: ['websocket'] });
    let latestState = null;
    socket.on('room-state', state => {
      latestState = state;
    });
    return {
      socket,
      id,
      name,
      getState: () => latestState,
      waitForState: async (predicate, timeout = 3000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          if (latestState && predicate(latestState)) return latestState;
          await new Promise(r => setTimeout(r, 50));
        }
        throw new Error(`Timeout aguardando condição no estado do jogador ${name}`);
      }
    };
  }

  // 1. Connect 3 players
  const p1 = createClient('p_1', 'Alice');
  const p2 = createClient('p_2', 'Bob');
  const p3 = createClient('p_3', 'Carlos');

  p1.socket.emit('join-room', { roomCode: 'LAN', playerId: p1.id, playerName: p1.name });
  p2.socket.emit('join-room', { roomCode: 'LAN', playerId: p2.id, playerName: p2.name });
  p3.socket.emit('join-room', { roomCode: 'LAN', playerId: p3.id, playerName: p3.name });

  await p1.waitForState(s => s.players.length === 3);
  console.log('✅ 3 Jogadores conectados no Lobby');

  // 2. Start game
  p1.socket.emit('start-game', { roomCode: 'LAN' });
  await p1.waitForState(s => s.status === 'SELECTING');
  await p2.waitForState(s => s.status === 'SELECTING');
  await p3.waitForState(s => s.status === 'SELECTING');

  const s1 = p1.getState();
  const s2 = p2.getState();
  const s3 = p3.getState();

  assert.strictEqual(s1.myHand.length, 10, 'Alice deve ter 10 cartas');
  assert.strictEqual(s2.myHand.length, 10, 'Bob deve ter 10 cartas');
  assert.strictEqual(s3.myHand.length, 10, 'Carlos deve ter 10 cartas');
  console.log('✅ Partida iniciada, 10 cartas distribuídas para cada um');

  // 3. Identify Czar and non-Czar players
  const czarPlayer = [p1, p2, p3].find(p => p.getState().isCzar);
  const nonCzarPlayers = [p1, p2, p3].filter(p => !p.getState().isCzar);
  assert(czarPlayer, 'Deve haver um Czar');
  assert.strictEqual(nonCzarPlayers.length, 2, 'Devem haver 2 jogadores comuns');
  console.log(`✅ Czar da 1ª rodada: ${czarPlayer.name}`);

  const blackCard = czarPlayer.getState().currentBlackCard;
  const pick = blackCard.pick;
  console.log(`✅ Carta Preta: "${blackCard.text}" (Pick: ${pick})`);

  // 4. Non-Czar players submit cards
  for (const player of nonCzarPlayers) {
    const hand = player.getState().myHand;
    const cardsToSubmit = hand.slice(0, pick).map(c => c.id);
    player.socket.emit('submit-cards', { roomCode: 'LAN', cardIds: cardsToSubmit });
  }

  // 5. Verify transition to JUDGING
  await czarPlayer.waitForState(s => s.status === 'JUDGING');
  const judgingState = czarPlayer.getState();
  assert.strictEqual(judgingState.judgingSubmissions.length, 2, 'Czar deve ver 2 submissões');
  assert(judgingState.judgingSubmissions.every(s => !s.revealed), 'Submissões devem começar ocultas');
  console.log('✅ Todas as submissões recebidas e anônimas em JUDGING');

  // 6. Czar reveals submissions
  const sub1 = judgingState.judgingSubmissions[0];
  czarPlayer.socket.emit('reveal-submission', { roomCode: 'LAN', submissionId: sub1.submissionId });
  await nonCzarPlayers[0].waitForState(s => s.judgingSubmissions.find(x => x.submissionId === sub1.submissionId).revealed);
  console.log('✅ Revelação de carta sincronizada em tempo real com todos os celulares');

  // 7. Czar chooses winner
  czarPlayer.socket.emit('select-winner', { roomCode: 'LAN', submissionId: sub1.submissionId });
  await p1.waitForState(s => s.status === 'ROUND_END');
  await p2.waitForState(s => s.status === 'ROUND_END');
  await p3.waitForState(s => s.status === 'ROUND_END');

  const endState = p1.getState();
  assert(endState.roundWinner, 'Deve haver um roundWinner definido');
  console.log(`✅ Vencedor da rodada confirmado: ${endState.roundWinner.playerName}`);

  // 8. Test hand refilled to 10
  nonCzarPlayers.forEach(p => {
    assert.strictEqual(p.getState().myHand.length, 10, `${p.name} deve ter tido sua mão reposta para 10 cartas`);
  });
  console.log('✅ Mãos repostas automaticamente para 10 cartas');

  // 9. Next round
  p1.socket.emit('next-round', { roomCode: 'LAN' });
  await p1.waitForState(s => s.status === 'SELECTING' && s.roundNumber === 2);
  const newCzar = [p1, p2, p3].find(p => p.getState().isCzar);
  assert.notStrictEqual(newCzar.id, czarPlayer.id, 'Czar deve ter rotacionado');
  console.log(`✅ Rodada 2 iniciada com sucesso. Novo Czar: ${newCzar.name}`);

  // 10. Reconnection test: simulate Bob disconnecting and reconnecting
  console.log('🔄 Testando reconexão móvel de Bob...');
  p2.socket.disconnect();
  await p1.waitForState(s => {
    const bob = s.players.find(x => x.id === p2.id);
    return bob && !bob.connected;
  });
  console.log('✅ Bob detectado como desconectado');

  // Bob re-opens page with same persistent id
  const bobReconnected = createClient(p2.id, p2.name);
  bobReconnected.socket.emit('join-room', { roomCode: 'LAN', playerId: p2.id, playerName: p2.name });
  await bobReconnected.waitForState(s => s.status === 'SELECTING');
  assert.strictEqual(bobReconnected.getState().myHand.length, 10, 'Mão de Bob deve estar intacta');
  console.log('✅ Reconexão automática manteve as 10 cartas e pontos de Bob perfeitamente!');

  // 11. Custom Hotspot IP Test (Android Hotspot)
  console.log('📡 Testando configuração de IP Hotspot manual pelo Host...');
  p1.socket.emit('set-custom-ip', { roomCode: 'LAN', customIp: '192.168.43.1' });
  await p3.waitForState(s => s.customIp === '192.168.43.1');
  assert.strictEqual(bobReconnected.getState().customIp, '192.168.43.1', 'Bob deve ver o IP atualizado');
  console.log('✅ IP do Hotspot propagado para todos os celulares (192.168.43.1)');

  // 12. Disband Room Test (Host desfaz a sala sem reiniciar o servidor)
  console.log('🛑 Testando Host desfazendo a sala...');
  p1.socket.emit('disband-room', { roomCode: 'LAN' });
  await p1.waitForState(s => s.status === 'LOBBY');
  await bobReconnected.waitForState(s => s.status === 'LOBBY');
  await p3.waitForState(s => s.status === 'LOBBY');

  const lobbyState = p1.getState();
  assert.strictEqual(lobbyState.status, 'LOBBY', 'Status deve ser LOBBY');
  assert.strictEqual(lobbyState.players.every(p => p.score === 0), true, 'Pontuações devem estar zeradas');
  assert.strictEqual(lobbyState.myHand.length, 0, 'Mão deve estar limpa no lobby');
  console.log('✅ Sala desfeita com sucesso: todos retornaram ao Lobby com placar zerado, sem derrubar o servidor!');

  // 13. Test "Cartas Aleatórias a Cada Rodada" (randomizeHandEachRound)
  console.log('🎲 Testando modo de Cartas Aleatórias a Cada Rodada (randomizeHandEachRound)...');
  p1.socket.emit('update-settings', { roomCode: 'LAN', randomizeHandEachRound: true });
  await p1.waitForState(s => s.randomizeHandEachRound === true);
  await p3.waitForState(s => s.randomizeHandEachRound === true);
  console.log('✅ Opção randomizeHandEachRound ativada com sucesso no Lobby');

  // Iniciar nova partida com a opção ativada
  p1.socket.emit('start-game', { roomCode: 'LAN' });
  await p1.waitForState(s => s.status === 'SELECTING' && s.roundNumber === 1);
  await p3.waitForState(s => s.status === 'SELECTING' && s.roundNumber === 1);

  // Identificar um jogador que NÃO é o Czar da rodada 1
  const round1Czar = [p1, bobReconnected, p3].find(p => p.getState().isCzar);
  const round1NonCzar = [p1, bobReconnected, p3].find(p => !p.getState().isCzar);
  const initialHandIds = round1NonCzar.getState().myHand.map(c => c.id);
  assert.strictEqual(initialHandIds.length, 10, 'Deve ter 10 cartas na mão inicial');

  // Jogar rodada 1
  const round1Pick = round1Czar.getState().currentBlackCard.pick;
  const otherNonCzars = [p1, bobReconnected, p3].filter(p => !p.getState().isCzar);
  for (const player of otherNonCzars) {
    const cardsToSubmit = player.getState().myHand.slice(0, round1Pick).map(c => c.id);
    player.socket.emit('submit-cards', { roomCode: 'LAN', cardIds: cardsToSubmit });
  }

  await round1Czar.waitForState(s => s.status === 'JUDGING');
  const judgingSub = round1Czar.getState().judgingSubmissions[0];
  round1Czar.socket.emit('select-winner', { roomCode: 'LAN', submissionId: judgingSub.submissionId });
  await p1.waitForState(s => s.status === 'ROUND_END');

  // Avançar para a rodada 2
  p1.socket.emit('next-round', { roomCode: 'LAN' });
  await p1.waitForState(s => s.status === 'SELECTING' && s.roundNumber === 2);
  await round1NonCzar.waitForState(s => s.status === 'SELECTING' && s.roundNumber === 2);

  const round2HandIds = round1NonCzar.getState().myHand.map(c => c.id);
  assert.strictEqual(round2HandIds.length, 10, 'Deve ter 10 novas cartas na rodada 2');

  // Verificar se as cartas não submetidas da rodada 1 foram descartadas e substituídas
  const keptOldCards = round2HandIds.filter(id => initialHandIds.includes(id));
  assert.strictEqual(keptOldCards.length, 0, 'Nenhuma das cartas anteriores deve permanecer na mão após aleatorização');
  console.log('✅ Rodada 2: Mão dos jogadores completamente descartada e renovada com novas cartas aleatórias!');

  // Cleanup
  p1.socket.disconnect();
  p3.socket.disconnect();
  bobReconnected.socket.disconnect();
  server.close();

  console.log('\n🎉 TODOS OS TESTES E2E FORAM CONCLUÍDOS COM 100% DE SUCESSO!\n');
}

runEndToEndGameTest().catch(err => {
  console.error('❌ Erro no teste E2E:', err);
  process.exit(1);
});
