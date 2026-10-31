import React, { useEffect } from 'react';
import { BlackCard } from './BlackCard';
import { WhiteCard } from './WhiteCard';
import { Trophy, ArrowRight, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playWinChime, playCardClick } from '../utils/audio';

export function RoundEndView({
  roundWinner,
  blackCard,
  onNextRound = null,
  isHost = false
}) {
  useEffect(() => {
    playWinChime();
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }, []);

  if (!roundWinner) return null;

  return (
    <div className="w-full max-w-lg flex flex-col items-center pb-24 animate-fadeIn">
      {/* Winner Spotlight Header */}
      <div className="w-full bg-gradient-to-b from-amber-500/20 to-zinc-900 border border-amber-500/40 rounded-2xl p-6 text-center mb-6 shadow-2xl relative overflow-hidden">
        <div className="w-16 h-16 bg-amber-400 text-black rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg animate-bounce">
          <Trophy size={32} />
        </div>

        <div className="text-xs uppercase font-black tracking-widest text-amber-400 mb-1">
          Vencedor da Rodada
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {roundWinner.playerName}
        </h2>
        <div className="inline-block mt-2 px-3 py-1 bg-amber-400/20 border border-amber-400/40 rounded-full text-xs font-bold text-amber-300">
          +1 Ponto Conquistado! ⭐
        </div>
      </div>

      {/* Winning Combination Spotlight */}
      <div className="w-full mb-6">
        <div className="text-xs uppercase font-black tracking-wider text-zinc-400 mb-2 px-1">
          Combinação Campeã:
        </div>
        <BlackCard
          card={blackCard}
          filledCards={roundWinner.cards}
          className="ring-2 ring-amber-400/50"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {roundWinner.cards && roundWinner.cards.map((c, i) => (
            <WhiteCard
              key={c.id || i}
              card={c}
              isSmall={true}
              selectionOrder={roundWinner.cards.length > 1 ? i + 1 : null}
            />
          ))}
        </div>
      </div>

      {/* Next Round CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-zinc-950/95 to-transparent backdrop-blur-md z-40 border-t border-zinc-800/80">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => { playCardClick(); onNextRound && onNextRound(); }}
            className="w-full py-4 px-6 rounded-xl font-black text-sm tracking-wide uppercase bg-white hover:bg-zinc-200 text-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Iniciar Próxima Rodada</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
