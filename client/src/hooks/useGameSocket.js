import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const STORAGE_KEY_ID = 'cah_player_id';
const STORAGE_KEY_NAME = 'cah_player_name';

function getOrCreatePlayerId() {
  let id = localStorage.getItem(STORAGE_KEY_ID);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'p_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    }
    localStorage.setItem(STORAGE_KEY_ID, id);
  }
  return id;
}

export function useGameSocket() {
  const [playerId] = useState(() => getOrCreatePlayerId());
  const [playerName, setPlayerNameState] = useState(() => localStorage.getItem(STORAGE_KEY_NAME) || '');
  const [roomCode, setRoomCode] = useState('LAN');
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const socketRef = useRef(null);

  const setPlayerName = useCallback((name) => {
    setPlayerNameState(name);
    localStorage.setItem(STORAGE_KEY_NAME, name);
  }, []);

  // Fetch LAN network info
  const fetchNetworkInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data);
      }
    } catch (e) {
      console.warn('Não foi possível obter network-info:', e);
    }
  }, []);

  useEffect(() => {
    fetchNetworkInfo();

    // Socket.io connection - uses Vite proxy in dev, direct origin in prod
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setErrorMsg(null);
      // Auto join / reconnect with persistent playerId
      socket.emit('join-room', {
        roomCode,
        playerId,
        playerName: playerName.trim() || undefined
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room-state', (state) => {
      setGameState(state);
    });

    socket.on('error-msg', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, [playerId, roomCode]);

  // Actions to emit
  const joinRoom = useCallback((name, code = 'LAN') => {
    const finalName = name.trim();
    if (finalName) {
      setPlayerName(finalName);
    }
    setRoomCode(code.toUpperCase());
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join-room', {
        roomCode: code.toUpperCase(),
        playerId,
        playerName: finalName || playerName
      });
    }
  }, [playerId, playerName, setPlayerName]);

  const updateSettings = useCallback((settings) => {
    if (socketRef.current) {
      socketRef.current.emit('update-settings', {
        roomCode,
        ...settings
      });
    }
  }, [roomCode]);

  const startGame = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('start-game', { roomCode });
    }
  }, [roomCode]);

  const submitCards = useCallback((cardIds) => {
    if (socketRef.current) {
      socketRef.current.emit('submit-cards', { roomCode, cardIds });
    }
  }, [roomCode]);

  const revealSubmission = useCallback((submissionId) => {
    if (socketRef.current) {
      socketRef.current.emit('reveal-submission', { roomCode, submissionId });
    }
  }, [roomCode]);

  const revealAll = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('reveal-all', { roomCode });
    }
  }, [roomCode]);

  const selectWinner = useCallback((submissionId) => {
    if (socketRef.current) {
      socketRef.current.emit('select-winner', { roomCode, submissionId });
    }
  }, [roomCode]);

  const nextRound = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('next-round', { roomCode });
    }
  }, [roomCode]);

  const restartGame = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('restart-game', { roomCode });
    }
  }, [roomCode]);

  const setCustomIp = useCallback((customIp) => {
    if (socketRef.current) {
      socketRef.current.emit('set-custom-ip', { roomCode, customIp });
    }
  }, [roomCode]);

  const disbandRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('disband-room', { roomCode });
    }
  }, [roomCode]);

  const kickPlayer = useCallback((targetPlayerId) => {
    if (socketRef.current) {
      socketRef.current.emit('kick-player', { roomCode, targetPlayerId });
    }
  }, [roomCode]);

  return {
    playerId,
    playerName,
    setPlayerName,
    roomCode,
    isConnected,
    gameState,
    networkInfo,
    errorMsg,
    refreshNetworkInfo: fetchNetworkInfo,
    joinRoom,
    updateSettings,
    startGame,
    submitCards,
    revealSubmission,
    revealAll,
    selectWinner,
    nextRound,
    restartGame,
    setCustomIp,
    disbandRoom,
    kickPlayer
  };
}
