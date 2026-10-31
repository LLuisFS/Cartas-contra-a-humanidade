import React, { useEffect } from 'react';
import { Trophy, Crown, RotateCcw, Medal } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playWinChime, playCardClick } from '../utils/audio';

export function GameOverModal({
  gameWinner,
  players = [],
  onRestart = null,
  isHost = false
}) {
  useEffect(() => {
    playWinChime();
    try {
      const end = Date.now() + 3000;
      const interval = setInterval(() => {
        if (Date.now() > end) {
          return clearInterval(interval);
        }
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: {
            x: Math.random(),
            y: Math.random() - 0.2
          }
        });
      }, 250);
    } catch (e) {}
  }, []);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-white my-auto flex flex-col items-center">
        {/* Crown Icon */}
        <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-300 text-black rounded-3xl flex items-center justify-center mb-4 shadow-2xl shadow-amber-500/30 animate-bounce">
          <Crown size={44} />
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-amber-400">
          Grande Campeão
        </span>
        <h2 className="text-3xl font-black tracking-tight text-white mt-1 text-center">
          {gameWinner ? gameWinner.playerName : (first ? first.name : 'Vencedor')}
        </h2>
        <p className="text-sm text-zinc-400 mb-6">
          Atingiu {gameWinner ? gameWinner.score : (first ? first.score : 0)} pontos primeiro!
        </p>

        {/* Podium */}
        <div className="w-full flex items-end justify-center gap-2 mb-6 pt-6">
          {/* 2nd Place */}
          {second && (
            <div className="flex-1 flex flex-col items-center">
              <div className="text-zinc-400 text-xs font-bold mb-1 truncate max-w-[80px]">
                {second.name}
              </div>
              <div className="w-full h-24 bg-zinc-800 border-t-2 border-zinc-400 rounded-t-xl flex flex-col items-center justify-center p-2">
                <span className="text-xl font-black text-zinc-300">2º</span>
                <span className="text-xs text-zinc-400">{second.score} pts</span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {first && (
            <div className="flex-1 flex flex-col items-center">
              <div className="text-amber-400 text-xs font-bold mb-1 truncate max-w-[90px]">
                {first.name}
              </div>
              <div className="w-full h-32 bg-gradient-to-t from-amber-950/60 to-zinc-800 border-t-4 border-amber-400 rounded-t-xl flex flex-col items-center justify-center p-2 shadow-lg">
                <Trophy className="text-amber-400 mb-1" size={24} />
                <span className="text-2xl font-black text-amber-400">1º</span>
                <span className="text-xs font-bold text-amber-300">{first.score} pts</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="flex-1 flex flex-col items-center">
              <div className="text-amber-700 text-xs font-bold mb-1 truncate max-w-[80px]">
                {third.name}
              </div>
              <div className="w-full h-16 bg-zinc-800 border-t-2 border-amber-700 rounded-t-xl flex flex-col items-center justify-center p-2">
                <span className="text-lg font-black text-amber-600">3º</span>
                <span className="text-xs text-zinc-400">{third.score} pts</span>
              </div>
            </div>
          )}
        </div>

        {/* Remaining standings list */}
        {sortedPlayers.length > 3 && (
          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-6 max-h-36 overflow-y-auto space-y-1.5">
            {sortedPlayers.slice(3).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 text-zinc-400 border-b border-zinc-900 last:border-0">
                <span>{i + 4}º. {p.name}</span>
                <span className="font-mono font-bold text-zinc-300">{p.score} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Restart Button */}
        <button
          onClick={() => { playCardClick(); onRestart && onRestart(); }}
          className="w-full py-4 px-6 rounded-xl font-black text-sm tracking-wide uppercase bg-sky-500 hover:bg-sky-400 text-white shadow-xl shadow-sky-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} />
          <span>Jogar Novamente</span>
        </button>
      </div>
    </div>
  );
}
