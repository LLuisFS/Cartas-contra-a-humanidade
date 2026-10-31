import React from 'react';
import { QrCode, Trophy, Crown, Wifi, WifiOff, Zap, Trash2 } from 'lucide-react';
import { playCardClick } from '../utils/audio';

export function TopBar({
  roomCode = 'LAN',
  roundNumber = 1,
  czar = null,
  isConnected = true,
  players = [],
  isHost = false,
  wakeLockActive = false,
  onOpenNetworkModal,
  onOpenScoreboard,
  onDisbandRoom = null,
  status = 'LOBBY'
}) {
  const connectedCount = players.filter(p => p.connected).length;
  const isGameActive = status !== 'LOBBY' && status !== 'GAME_OVER';

  return (
    <header className="sticky top-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-3 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Left: CAH Logo & Room Code */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white text-black font-black text-xs rounded-lg flex items-center justify-center tracking-tighter shadow-sm">
            CAH
          </div>

          <button
            onClick={() => { playCardClick(); onOpenNetworkModal(); }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-300 transition active:scale-95"
            title="Ver QR Code / Link da Rede"
          >
            <QrCode size={14} className="text-zinc-400" />
            <span className="font-mono">{roomCode}</span>
          </button>

          {/* Connection dot */}
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-red-500 animate-ping'
            }`}
            title={isConnected ? 'Conectado à LAN' : 'Reconectando...'}
          />

          {/* WakeLock indicator */}
          {wakeLockActive && (
            <span className="text-emerald-400 flex items-center" title="Tela ativa (WakeLock)">
              <Zap size={13} className="fill-emerald-400" />
            </span>
          )}
        </div>

        {/* Center: Round & Czar info if in-game */}
        {isGameActive && (
          <div className="flex items-center gap-2 text-xs truncate max-w-[140px] sm:max-w-xs">
            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 font-bold hidden xs:inline">
              R{roundNumber}
            </span>
            {czar && (
              <div className="flex items-center gap-1 text-amber-400 font-bold truncate">
                <Crown size={13} className="shrink-0" />
                <span className="truncate">{czar.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Host quick reset during match */}
          {isHost && isGameActive && onDisbandRoom && (
            <button
              onClick={() => {
                if (window.confirm('Desfazer a partida e retornar todos os jogadores ao Lobby?')) {
                  playCardClick();
                  onDisbandRoom();
                }
              }}
              className="p-1.5 bg-red-950/40 hover:bg-red-900 border border-red-800/40 text-red-400 rounded-xl transition"
              title="Desfazer partida atual"
            >
              <Trash2 size={15} />
            </button>
          )}

          {/* Scoreboard Button */}
          <button
            onClick={() => { playCardClick(); onOpenScoreboard(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 transition active:scale-95 shadow-sm"
          >
            <Trophy size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Placar</span>
            <span className="bg-zinc-800 px-1.5 py-0.2 rounded text-[11px] font-mono text-amber-300">
              {connectedCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
