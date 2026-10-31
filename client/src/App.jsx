import React, { useState } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { useWakeLock } from './hooks/useWakeLock';
import { TopBar } from './components/TopBar';
import { Lobby } from './components/Lobby';
import { BlackCard } from './components/BlackCard';
import { PlayerHand } from './components/PlayerHand';
import { JudgingView } from './components/JudgingView';
import { RoundEndView } from './components/RoundEndView';
import { GameOverModal } from './components/GameOverModal';
import { ScoreboardDrawer } from './components/ScoreboardDrawer';
import { NetworkInfoModal } from './components/NetworkInfoModal';
import { AlertCircle, Users, CheckCircle, Clock } from 'lucide-react';
import { playCardClick } from './utils/audio';

export function App() {
  const {
    playerId,
    playerName,
    setPlayerName,
    roomCode,
    isConnected,
    gameState,
    networkInfo,
    errorMsg,
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
  } = useGameSocket();

  // Screen Wake Lock API to prevent phone screen sleep and connection drop
  const { isActive: wakeLockActive } = useWakeLock(true);

  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [showInitialNamePrompt, setShowInitialNamePrompt] = useState(!playerName);
  const [initialNameInput, setInitialNameInput] = useState('');

  const status = gameState ? gameState.status : 'LOBBY';
  const isCzar = gameState ? gameState.isCzar : false;
  const isHost = gameState ? gameState.isHost : false;
  const currentBlackCard = gameState ? gameState.currentBlackCard : null;
  const myHand = gameState ? gameState.myHand : [];
  const hasSubmitted = gameState ? gameState.hasSubmitted : false;
  const roundWinner = gameState ? gameState.roundWinner : null;
  const gameWinner = gameState ? gameState.gameWinner : null;
  const judgingSubmissions = gameState ? gameState.judgingSubmissions : [];
  const submittedCount = gameState ? gameState.submittedCount : 0;
  const totalToSubmit = gameState ? gameState.totalToSubmit : 0;
  const customIp = gameState ? gameState.customIp : null;
  const randomizeHandEachRound = gameState ? !!gameState.randomizeHandEachRound : false;

  const handleInitialNameSubmit = (e) => {
    e.preventDefault();
    if (initialNameInput.trim()) {
      playCardClick();
      setPlayerName(initialNameInput.trim());
      joinRoom(initialNameInput.trim(), roomCode);
      setShowInitialNamePrompt(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0f0f0f] text-white">
      {/* Top Header Bar */}
      <TopBar
        roomCode={gameState ? gameState.roomCode : roomCode}
        roundNumber={gameState ? gameState.roundNumber : 1}
        czar={gameState ? gameState.czar : null}
        isConnected={isConnected}
        players={gameState ? gameState.players : []}
        isHost={isHost}
        wakeLockActive={wakeLockActive}
        onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
        onOpenScoreboard={() => setIsScoreboardOpen(true)}
        onDisbandRoom={disbandRoom}
        status={status}
      />

      {/* Floating Error Toast */}
      {errorMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce max-w-[90vw]">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Initial Player Name Modal (First-time join) */}
      {showInitialNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-white text-black font-black text-2xl rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              CAH
            </div>
            <h2 className="text-xl font-black text-white mb-1">Qual é o seu nome?</h2>
            <p className="text-xs text-zinc-400 mb-5">
              Escolha seu apelido para jogar com a galera na rede local.
            </p>

            <form onSubmit={handleInitialNameSubmit} className="space-y-3">
              <input
                type="text"
                value={initialNameInput}
                onChange={(e) => setInitialNameInput(e.target.value)}
                placeholder="Ex: Gabriel, Bia, Zé..."
                maxLength={20}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 font-bold text-center"
                autoFocus
              />
              <button
                type="submit"
                disabled={!initialNameInput.trim()}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wide transition ${
                  initialNameInput.trim()
                    ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                Entrar no Jogo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 pt-3 flex flex-col">
        {/* State: LOBBY */}
        {status === 'LOBBY' && (
          <Lobby
            gameState={gameState}
            networkInfo={networkInfo}
            playerName={playerName}
            setPlayerName={setPlayerName}
            selfPlayerId={playerId}
            isHost={isHost}
            wakeLockActive={wakeLockActive}
            onJoinRoom={joinRoom}
            onUpdateSettings={updateSettings}
            onSetCustomIp={setCustomIp}
            onDisbandRoom={disbandRoom}
            onKickPlayer={kickPlayer}
            onStartGame={startGame}
          />
        )}

        {/* State: SELECTING (Players choose white cards) */}
        {status === 'SELECTING' && (
          <div className="w-full flex flex-col items-center">
            {/* Black Card Top Sticky / Hero */}
            <div className="w-full max-w-lg mb-4">
              <BlackCard card={currentBlackCard} />
            </div>

            {/* Waiting status bar for submissions */}
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 mb-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Users size={15} className="text-zinc-400" />
                <span>Respostas enviadas:</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-sky-400 font-mono text-sm">{submittedCount}</span>
                <span className="text-zinc-500">/</span>
                <span className="text-zinc-400 font-mono text-sm">{totalToSubmit}</span>
                {submittedCount === totalToSubmit && totalToSubmit > 0 ? (
                  <CheckCircle size={14} className="text-emerald-400 ml-1" />
                ) : (
                  <Clock size={14} className="text-amber-400 ml-1 animate-spin" />
                )}
              </div>
            </div>

            {/* Player Hand / Czar Message */}
            <div className="w-full">
              <PlayerHand
                hand={myHand}
                pick={currentBlackCard ? currentBlackCard.pick : 1}
                hasSubmitted={hasSubmitted}
                isCzar={isCzar}
                onSubmit={submitCards}
                randomizeHandEachRound={randomizeHandEachRound}
              />
            </div>
          </div>
        )}

        {/* State: JUDGING (Czar reveals and picks winner) */}
        {status === 'JUDGING' && (
          <JudgingView
            blackCard={currentBlackCard}
            submissions={judgingSubmissions}
            isCzar={isCzar}
            czarName={gameState && gameState.czar ? gameState.czar.name : 'Czar'}
            onRevealSubmission={revealSubmission}
            onRevealAll={revealAll}
            onSelectWinner={selectWinner}
          />
        )}

        {/* State: ROUND_END (Winner announcement) */}
        {status === 'ROUND_END' && (
          <RoundEndView
            roundWinner={roundWinner}
            blackCard={currentBlackCard}
            onNextRound={nextRound}
            isHost={isHost}
          />
        )}

        {/* State: GAME_OVER (Podium and Play Again) */}
        {status === 'GAME_OVER' && (
          <GameOverModal
            gameWinner={gameWinner}
            players={gameState ? gameState.players : []}
            onRestart={restartGame}
            isHost={isHost}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <NetworkInfoModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        networkInfo={networkInfo}
        roomCode={gameState ? gameState.roomCode : roomCode}
        customIp={customIp}
        onSetCustomIp={setCustomIp}
        isHost={isHost}
      />

      <ScoreboardDrawer
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
        players={gameState ? gameState.players : []}
        scoreLimit={gameState ? gameState.scoreLimit : 7}
        currentStatus={status}
        selfPlayerId={playerId}
      />
    </div>
  );
}

export default App;
