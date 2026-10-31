import React from 'react';
import { X, Trophy, Crown, Shield, Wifi, WifiOff, Check } from 'lucide-react';
import { playCardClick } from '../utils/audio';

export function ScoreboardDrawer({
  isOpen,
  onClose,
  players = [],
  scoreLimit = 7,
  currentStatus = 'SELECTING',
  selfPlayerId = null
}) {
  if (!isOpen) return null;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full sm:max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl text-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400" size={22} />
            <div>
              <h3 className="text-lg font-black tracking-tight">Placar da Partida</h3>
              <p className="text-xs text-zinc-400">Meta para vitória: {scoreLimit} pontos</p>
            </div>
          </div>
          <button
            onClick={() => { playCardClick(); onClose(); }}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {sortedPlayers.map((player, index) => {
            const isSelf = player.id === selfPlayerId;
            const progressPercent = Math.min(100, Math.round((player.score / scoreLimit) * 100));

            return (
              <div
                key={player.id}
                className={`p-3 rounded-xl border transition-all ${
                  isSelf
                    ? 'bg-zinc-800/80 border-sky-500/50'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 text-center text-xs font-black text-zinc-500">
                      {index + 1}º
                    </span>

                    {/* Online status */}
                    {player.connected ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-red-500/80 shrink-0" title="Desconectado (aguardando reconexão)" />
                    )}

                    <span className={`text-sm font-bold truncate ${isSelf ? 'text-sky-300' : 'text-white'}`}>
                      {player.name} {isSelf && '(Você)'}
                    </span>

                    {/* Badges */}
                    {player.isCzar && (
                      <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded text-[10px] font-black uppercase flex items-center gap-0.5">
                        <Crown size={10} /> Czar
                      </span>
                    )}

                    {player.isHost && (
                      <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] font-bold">
                        Host
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status icon during SELECTING */}
                    {currentStatus === 'SELECTING' && !player.isCzar && (
                      player.hasSubmitted ? (
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Check size={10} /> Jogou
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 italic">
                          Escolhendo...
                        </span>
                      )
                    )}

                    {/* Score */}
                    <div className="font-mono font-black text-base text-amber-400 min-w-[36px] text-right">
                      {player.score} <span className="text-[10px] text-zinc-500 font-sans font-normal">pts</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar towards scoreLimit */}
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-800 text-center text-xs text-zinc-500">
          Jogadores conectados: {players.filter(p => p.connected).length} de {players.length}
        </div>
      </div>
    </div>
  );
}
