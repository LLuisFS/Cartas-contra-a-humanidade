import React, { useState } from 'react';
import { BlackCard } from './BlackCard';
import { WhiteCard } from './WhiteCard';
import { Crown, Eye, Trophy, Sparkles } from 'lucide-react';
import { playCardFlip, playCardClick, playWinChime } from '../utils/audio';

export function JudgingView({
  blackCard,
  submissions = [],
  isCzar = false,
  czarName = 'Czar',
  onRevealSubmission = null,
  onRevealAll = null,
  onSelectWinner = null
}) {
  const [selectedWinnerSubId, setSelectedWinnerSubId] = useState(null);

  const handleCardClick = (sub) => {
    if (!sub.revealed) {
      if (isCzar && onRevealSubmission) {
        playCardFlip();
        onRevealSubmission(sub.submissionId);
      }
    } else {
      if (isCzar) {
        playCardClick();
        setSelectedWinnerSubId(sub.submissionId);
      }
    }
  };

  const handleConfirmWinner = () => {
    if (!selectedWinnerSubId || !onSelectWinner) return;
    playWinChime();
    onSelectWinner(selectedWinnerSubId);
  };

  const revealedCount = submissions.filter(s => s.revealed).length;
  const allRevealed = revealedCount === submissions.length && submissions.length > 0;

  return (
    <div className="w-full flex flex-col items-center pb-28">
      {/* Black Card on Top */}
      <div className="w-full max-w-lg mb-5">
        <BlackCard card={blackCard} />
      </div>

      {/* Judging Phase Banner */}
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="text-amber-400" size={18} />
          <div>
            <span className="text-xs font-bold text-white block">
              {isCzar ? 'Você é o Juiz (Czar)!' : `Juiz da Rodada: ${czarName}`}
            </span>
            <span className="text-[11px] text-zinc-400">
              {allRevealed
                ? 'Todas as respostas foram reveladas!'
                : `${revealedCount} de ${submissions.length} cartas reveladas`}
            </span>
          </div>
        </div>

        {isCzar && !allRevealed && onRevealAll && (
          <button
            onClick={() => { playCardFlip(); onRevealAll(); }}
            className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-semibold flex items-center gap-1 transition active:scale-95"
          >
            <Eye size={14} />
            <span>Revelar Todas</span>
          </button>
        )}
      </div>

      {/* Submissions Grid */}
      <div className="w-full max-w-lg space-y-4">
        {submissions.map((sub, index) => {
          const isSelectedWinner = selectedWinnerSubId === sub.submissionId;

          return (
            <div
              key={sub.submissionId}
              onClick={() => handleCardClick(sub)}
              className={`relative rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                isSelectedWinner
                  ? 'border-amber-400 ring-4 ring-amber-400/30 bg-zinc-900 shadow-2xl scale-[1.01]'
                  : sub.revealed
                  ? 'border-zinc-700 bg-zinc-900/90 hover:border-zinc-500'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
              } p-4`}
            >
              {!sub.revealed ? (
                /* Face-down Card */
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-16 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center justify-center mb-2 shadow-inner">
                    <span className="font-black text-xs text-zinc-500">CAH</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-300">
                    Resposta #{index + 1} (Oculta)
                  </span>
                  <span className="text-xs text-zinc-500 mt-1">
                    {isCzar ? 'Toque para revelar ao vivo' : 'Aguardando o Czar revelar...'}
                  </span>
                </div>
              ) : (
                /* Revealed Submission */
                <div className="space-y-3">
                  {/* Top indicator */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-zinc-800">
                    <span className="font-semibold text-zinc-300">Opção #{index + 1}</span>
                    {isCzar && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isSelectedWinner ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {isSelectedWinner ? 'Vencedor Escolhido!' : 'Toque para escolher'}
                      </span>
                    )}
                  </div>

                  {/* Filled Preview */}
                  <div className="p-3 bg-black/60 rounded-xl border border-zinc-800/80">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
                      Prévia do Encaixe:
                    </div>
                    <BlackCard
                      card={blackCard}
                      filledCards={sub.cards}
                      isCompact={true}
                    />
                  </div>

                  {/* Individual White Cards */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                      Cartas Brancas Jogadas:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sub.cards.map((c, i) => (
                        <WhiteCard
                          key={c.id || i}
                          card={c}
                          isSmall={true}
                          selectionOrder={sub.cards.length > 1 ? i + 1 : null}
                          isSelected={isSelectedWinner}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Czar Confirmation Bar */}
      {isCzar && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-zinc-950/95 to-transparent backdrop-blur-md z-40 border-t border-zinc-800/80">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleConfirmWinner}
              disabled={!selectedWinnerSubId}
              className={`w-full py-4 px-6 rounded-xl font-black text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-xl ${
                selectedWinnerSubId
                  ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/30 scale-[1.01] active:scale-95 animate-pulse-subtle'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Trophy size={18} />
              <span>Confirmar Escolha Vencedora 🏆</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
