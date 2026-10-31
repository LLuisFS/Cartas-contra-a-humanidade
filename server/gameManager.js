const { loadCards } = require('./csvParser');

/**
 * Fisher-Yates shuffle
 * @param {Array} array 
 * @returns {Array}
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class Room {
  constructor(roomCode, masterDeck) {
    this.roomCode = roomCode;
    this.masterDeck = masterDeck; // { whiteCards: [...], blackCards: [...] }

    // Settings
    this.scoreLimit = 7;
    this.handSize = 10;
    this.minPlayersToStart = 3;
    this.randomizeHandEachRound = false;
    this.customIp = null;

    // State: 'LOBBY' | 'SELECTING' | 'JUDGING' | 'ROUND_END' | 'GAME_OVER'
    this.status = 'LOBBY';
    this.roundNumber = 0;

    // Players: Array<{ id: string, name: string, score: number, socketId: string, isHost: boolean, connected: boolean, hand: Array }>
    this.players = [];

    // Czar rotation index in this.players
    this.czarIndex = -1;

    // Deck states
    this.whiteDeck = [];
    this.whiteDiscard = [];
    this.blackDeck = [];
    this.blackDiscard = [];

    // Current Round state
    this.currentBlackCard = null;
    // Map of playerId -> Array<{ id, text }>
    this.currentSubmissions = new Map();
    // Shuffled anonymous submissions for judging: Array<{ submissionId: string, playerId: string, cards: Array, revealed: boolean }>
    this.judgingSubmissions = [];
    // Round winner details
    this.roundWinner = null;
    // Game winner details
    this.gameWinner = null;
  }

  // Find player by persistent UUID
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  // Find player by current socketId
  getPlayerBySocketId(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  getCurrentCzar() {
    if (this.czarIndex < 0 || this.czarIndex >= this.players.length) return null;
    return this.players[this.czarIndex];
  }

  // Add or reconnect player
  addOrReconnectPlayer(playerId, playerName, socketId) {
    let player = this.getPlayer(playerId);

    if (player) {
      // Reconnection
      player.socketId = socketId;
      player.connected = true;
      if (playerName && playerName.trim()) {
        player.name = playerName.trim();
      }
    } else {
      // New player
      const isFirst = this.players.length === 0;
      player = {
        id: playerId,
        name: (playerName && playerName.trim()) ? playerName.trim() : `Jogador ${this.players.length + 1}`,
        score: 0,
        socketId,
        isHost: isFirst,
        connected: true,
        hand: []
      };
      this.players.push(player);

      // If game is already running, deal cards to new player
      if (this.status !== 'LOBBY' && this.status !== 'GAME_OVER') {
        this.dealToPlayer(player, this.handSize);
      }
    }

    return player;
  }

  disconnectPlayer(socketId) {
    const player = this.getPlayerBySocketId(socketId);
    if (player) {
      player.connected = false;
      // If host disconnected, promote next connected player if possible
      if (player.isHost) {
        const nextConnected = this.players.find(p => p.connected && p.id !== player.id);
        if (nextConnected) {
          player.isHost = false;
          nextConnected.isHost = true;
        }
      }
    }
    return player;
  }

  // Draw white cards
  drawWhiteCards(count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.whiteDeck.length === 0) {
        if (this.whiteDiscard.length === 0) {
          // Deck exhausted, re-clone from master
          this.whiteDiscard = [...this.masterDeck.whiteCards];
        }
        this.whiteDeck = shuffle(this.whiteDiscard);
        this.whiteDiscard = [];
      }
      drawn.push(this.whiteDeck.pop());
    }
    return drawn;
  }

  // Draw 1 black card
  drawBlackCard() {
    if (this.blackDeck.length === 0) {
      if (this.blackDiscard.length === 0) {
        this.blackDiscard = [...this.masterDeck.blackCards];
      }
      this.blackDeck = shuffle(this.blackDiscard);
      this.blackDiscard = [];
    }
    return this.blackDeck.pop();
  }

  dealToPlayer(player, targetCount) {
    const needed = Math.max(0, targetCount - player.hand.length);
    if (needed > 0) {
      const newCards = this.drawWhiteCards(needed);
      player.hand.push(...newCards);
    }
  }

  updateSettings({ scoreLimit, handSize, minPlayersToStart, randomizeHandEachRound }) {
    if (scoreLimit && scoreLimit >= 3 && scoreLimit <= 30) {
      this.scoreLimit = scoreLimit;
    }
    if (handSize && handSize >= 5 && handSize <= 15) {
      this.handSize = handSize;
    }
    if (minPlayersToStart !== undefined && minPlayersToStart >= 2) {
      this.minPlayersToStart = minPlayersToStart;
    }
    if (typeof randomizeHandEachRound === 'boolean') {
      this.randomizeHandEachRound = randomizeHandEachRound;
    }
  }

  startGame() {
    if (this.players.length < this.minPlayersToStart) {
      throw new Error(`Mínimo de ${this.minPlayersToStart} jogadores necessários para iniciar a partida.`);
    }

    // Initialize decks
    this.whiteDeck = shuffle(this.masterDeck.whiteCards);
    this.whiteDiscard = [];
    this.blackDeck = shuffle(this.masterDeck.blackCards);
    this.blackDiscard = [];

    // Reset scores & hands
    this.players.forEach(p => {
      p.score = 0;
      p.hand = [];
    });

    // Deal initial hands
    this.players.forEach(p => {
      this.dealToPlayer(p, this.handSize);
    });

    this.roundNumber = 0;
    this.czarIndex = -1;
    this.gameWinner = null;

    this.startNewRound();
  }

  startNewRound() {
    this.roundNumber += 1;
    this.currentSubmissions.clear();
    this.judgingSubmissions = [];
    this.roundWinner = null;

    // Pick next Czar (rotate cyclically among connected players, or all players if needed)
    if (this.players.length > 0) {
      let attempts = 0;
      do {
        this.czarIndex = (this.czarIndex + 1) % this.players.length;
        attempts++;
      } while (!this.players[this.czarIndex].connected && attempts < this.players.length);
    }

    // Draw next black card
    this.currentBlackCard = this.drawBlackCard();
    this.status = 'SELECTING';

    // Deal/replenish cards to players
    if (this.randomizeHandEachRound && this.roundNumber > 1) {
      this.players.forEach(p => {
        if (p.hand && p.hand.length > 0) {
          this.whiteDiscard.push(...p.hand);
          p.hand = [];
        }
        this.dealToPlayer(p, this.handSize);
      });
    } else {
      this.players.forEach(p => {
        this.dealToPlayer(p, this.handSize);
      });
    }
  }

  // Submit white cards by a non-czar player
  submitCards(playerId, cardIds) {
    if (this.status !== 'SELECTING') {
      throw new Error('Não é o momento de enviar cartas.');
    }

    const czar = this.getCurrentCzar();
    if (czar && czar.id === playerId) {
      throw new Error('O Czar não pode jogar cartas nesta rodada.');
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Jogador não encontrado.');
    }

    if (this.currentSubmissions.has(playerId)) {
      throw new Error('Você já enviou suas cartas nesta rodada.');
    }

    const requiredPick = this.currentBlackCard ? this.currentBlackCard.pick : 1;
    if (!Array.isArray(cardIds) || cardIds.length !== requiredPick) {
      throw new Error(`Você deve selecionar exatamente ${requiredPick} carta(s).`);
    }

    // Validate that player owns these cards in order
    const chosenCards = [];
    for (const cardId of cardIds) {
      const idx = player.hand.findIndex(c => c.id === cardId);
      if (idx === -1) {
        throw new Error(`Carta não encontrada na sua mão: ID ${cardId}`);
      }
      chosenCards.push(player.hand[idx]);
    }

    // Remove chosen cards from player's hand
    for (const cardId of cardIds) {
      const idx = player.hand.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        const [removed] = player.hand.splice(idx, 1);
        this.whiteDiscard.push(removed);
      }
    }

    // Store submission
    this.currentSubmissions.set(playerId, chosenCards);

    // Check if all non-czar connected players have submitted
    const czarId = czar ? czar.id : null;
    const eligiblePlayers = this.players.filter(p => p.connected && p.id !== czarId);
    const allSubmitted = eligiblePlayers.length > 0 &&
      eligiblePlayers.every(p => this.currentSubmissions.has(p.id));

    if (allSubmitted) {
      this.prepareJudging();
    }

    return { allSubmitted };
  }

  prepareJudging() {
    this.status = 'JUDGING';

    const submissions = [];
    let counter = 1;

    for (const [playerId, cards] of this.currentSubmissions.entries()) {
      submissions.push({
        submissionId: `sub_${counter++}_${Math.random().toString(36).substring(2, 7)}`,
        playerId,
        cards,
        revealed: false
      });
    }

    // Anonymize and shuffle with Fisher-Yates
    this.judgingSubmissions = shuffle(submissions);
  }

  revealSubmission(submissionId, requestingPlayerId) {
    if (this.status !== 'JUDGING') {
      throw new Error('Fase de julgamento não está ativa.');
    }

    const czar = this.getCurrentCzar();
    if (!czar || czar.id !== requestingPlayerId) {
      throw new Error('Apenas o Czar pode revelar as respostas.');
    }

    const sub = this.judgingSubmissions.find(s => s.submissionId === submissionId);
    if (!sub) {
      throw new Error('Submissão não encontrada.');
    }

    sub.revealed = true;
    return sub;
  }

  revealAllSubmissions(requestingPlayerId) {
    if (this.status !== 'JUDGING') {
      throw new Error('Fase de julgamento não está ativa.');
    }
    const czar = this.getCurrentCzar();
    if (!czar || czar.id !== requestingPlayerId) {
      throw new Error('Apenas o Czar pode revelar as respostas.');
    }
    this.judgingSubmissions.forEach(s => s.revealed = true);
  }

  selectWinner(submissionId, requestingPlayerId) {
    if (this.status !== 'JUDGING') {
      throw new Error('Fase de julgamento não está ativa.');
    }

    const czar = this.getCurrentCzar();
    if (!czar || czar.id !== requestingPlayerId) {
      throw new Error('Apenas o Czar pode escolher a carta vencedora.');
    }

    const winningSub = this.judgingSubmissions.find(s => s.submissionId === submissionId);
    if (!winningSub) {
      throw new Error('Submissão vencedora inválida.');
    }

    // Award point to winning player
    const winningPlayer = this.getPlayer(winningSub.playerId);
    if (winningPlayer) {
      winningPlayer.score += 1;
    }

    // Ensure all are revealed for closure
    this.judgingSubmissions.forEach(s => s.revealed = true);

    this.roundWinner = {
      playerId: winningSub.playerId,
      playerName: winningPlayer ? winningPlayer.name : 'Jogador Desconhecido',
      cards: winningSub.cards,
      submissionId: winningSub.submissionId
    };

    // Refill hands for all players up to handSize if not randomizing hands each round
    if (!this.randomizeHandEachRound) {
      this.players.forEach(p => {
        this.dealToPlayer(p, this.handSize);
      });
    }

    // Check if game over
    if (winningPlayer && winningPlayer.score >= this.scoreLimit) {
      this.status = 'GAME_OVER';
      this.gameWinner = {
        playerId: winningPlayer.id,
        playerName: winningPlayer.name,
        score: winningPlayer.score
      };
    } else {
      this.status = 'ROUND_END';
    }

    return this.roundWinner;
  }

  nextRound(requestingPlayerId) {
    if (this.status !== 'ROUND_END') {
      throw new Error('A rodada atual ainda não foi concluída.');
    }

    // Allow host or current czar or any connected player if czar/host is offline
    this.startNewRound();
  }

  restartGame(requestingPlayerId) {
    const player = this.getPlayer(requestingPlayerId);
    if (!player || !player.isHost) {
      const hasConnectedHost = this.players.some(p => p.isHost && p.connected);
      if (hasConnectedHost) {
        throw new Error('Apenas o Host pode reiniciar a partida.');
      }
    }
    this.startGame();
  }

  disbandRoom(requestingPlayerId) {
    const player = this.getPlayer(requestingPlayerId);
    if (!player || !player.isHost) {
      const hasConnectedHost = this.players.some(p => p.isHost && p.connected);
      if (hasConnectedHost) {
        throw new Error('Apenas o Host pode desfazer a sala.');
      }
    }

    // Completely reset room state to LOBBY
    this.status = 'LOBBY';
    this.roundNumber = 0;
    this.czarIndex = -1;
    this.currentBlackCard = null;
    this.currentSubmissions.clear();
    this.judgingSubmissions = [];
    this.roundWinner = null;
    this.gameWinner = null;

    // Reset scores & hands of all players
    this.players.forEach(p => {
      p.score = 0;
      p.hand = [];
    });

    // Reinitialize decks
    this.whiteDeck = shuffle(this.masterDeck.whiteCards);
    this.whiteDiscard = [];
    this.blackDeck = shuffle(this.masterDeck.blackCards);
    this.blackDiscard = [];

    console.log(`[Room ${this.roomCode}] Sala desfeita e retornada ao Lobby pelo Host.`);
  }

  kickPlayer(targetPlayerId, requestingPlayerId) {
    const player = this.getPlayer(requestingPlayerId);
    if (!player || !player.isHost) {
      throw new Error('Apenas o Host pode remover jogadores.');
    }
    const targetIdx = this.players.findIndex(p => p.id === targetPlayerId);
    if (targetIdx !== -1) {
      const [removed] = this.players.splice(targetIdx, 1);
      return removed;
    }
    return null;
  }

  setCustomIp(ip, requestingPlayerId) {
    const player = this.getPlayer(requestingPlayerId);
    if (!player || !player.isHost) {
      throw new Error('Apenas o Host pode alterar o IP do Hotspot.');
    }
    this.customIp = ip ? ip.trim() : null;
  }

  /**
   * Generates sanitized client state.
   * Crucially, hides other players' hands and hides submission playerIds during JUDGING phase!
   */
  getClientState(forPlayerId) {
    const czar = this.getCurrentCzar();
    const selfPlayer = this.getPlayer(forPlayerId);

    // List of players with public info
    const playersList = this.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
      connected: p.connected,
      isCzar: czar ? czar.id === p.id : false,
      hasSubmitted: this.currentSubmissions.has(p.id),
      cardsCount: p.hand ? p.hand.length : 0
    }));

    // Submissions sanitized for anonymity
    const sanitizedSubmissions = this.judgingSubmissions.map(s => {
      // In ROUND_END or GAME_OVER, reveal who made each submission
      const isPostRound = this.status === 'ROUND_END' || this.status === 'GAME_OVER';
      const player = isPostRound ? this.getPlayer(s.playerId) : null;

      return {
        submissionId: s.submissionId,
        revealed: s.revealed,
        // Only include cards if revealed or if it's post-round
        cards: s.revealed || isPostRound ? s.cards : [],
        playerName: player ? player.name : null,
        isWinner: this.roundWinner ? this.roundWinner.submissionId === s.submissionId : false
      };
    });

    return {
      roomCode: this.roomCode,
      customIp: this.customIp,
      status: this.status,
      roundNumber: this.roundNumber,
      scoreLimit: this.scoreLimit,
      handSize: this.handSize,
      minPlayersToStart: this.minPlayersToStart,
      randomizeHandEachRound: this.randomizeHandEachRound,
      czar: czar ? { id: czar.id, name: czar.name } : null,
      currentBlackCard: this.currentBlackCard,
      players: playersList,
      myHand: selfPlayer ? selfPlayer.hand : [],
      hasSubmitted: selfPlayer ? this.currentSubmissions.has(selfPlayer.id) : false,
      isCzar: czar && selfPlayer ? czar.id === selfPlayer.id : false,
      isHost: selfPlayer ? selfPlayer.isHost : false,
      judgingSubmissions: sanitizedSubmissions,
      roundWinner: this.roundWinner,
      gameWinner: this.gameWinner,
      submittedCount: this.currentSubmissions.size,
      totalToSubmit: Math.max(0, this.players.filter(p => p.connected && (!czar || p.id !== czar.id)).length)
    };
  }
}

class GameManager {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.masterDeck = loadCards(rootDir);
    console.log(`[GameManager] Baralhos carregados: ${this.masterDeck.whiteCards.length} brancas, ${this.masterDeck.blackCards.length} pretas.`);
    this.rooms = new Map();
  }

  getOrCreateRoom(roomCode = 'LAN') {
    const code = (roomCode || 'LAN').toUpperCase().trim();
    if (!this.rooms.has(code)) {
      this.rooms.set(code, new Room(code, this.masterDeck));
      console.log(`[GameManager] Nova sala criada: ${code}`);
    }
    return this.rooms.get(code);
  }

  getRoom(roomCode) {
    if (!roomCode) return this.rooms.get('LAN');
    return this.rooms.get(roomCode.toUpperCase().trim());
  }

  removeRoom(roomCode) {
    this.rooms.delete(roomCode.toUpperCase().trim());
  }
}

module.exports = {
  GameManager,
  Room
};
