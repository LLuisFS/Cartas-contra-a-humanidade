import React, { useState, useEffect } from 'react';
import { WhiteCard } from './WhiteCard';
import { Send, CheckCircle2, RotateCcw, Shuffle } from 'lucide-react';
import { playCardClick, playErrorBuzz } from '../utils/audio';

export function PlayerHand({
  hand = [],
  pick = 1,
  hasSubmitted = false,
  isCzar = false,
  onSubmit = null,
  randomizeHandEachRound = false
}) {
  // Ordered array of selected card IDs
  const [selectedIds, setSelectedIds] = useState([]);

  // Reset selection when new round starts or cards change
  useEffect(() => {
    setSelectedIds([]);
  }, [pick, hasSubmitted]);

  const toggleSelectCard = (card) => {
    if (hasSubmitted || isCzar) return;

    setSelectedIds(prev => {
      const idx = prev.indexOf(card.id);
      if (idx !== -1) {
        // Deselect
        return prev.filter(id => id !== card.id);
      } else {
        // If already reached pick limit and pick is 1, swap selection
        if (pick === 1) {
          return [card.id];
        }
        // If reached limit for pick > 1, don't allow more
        if (prev.length >= pick) {
          playErrorBuzz();
          return prev;
        }
        return [...prev, card.id];
      }
    });
  };

  const clearSelection = () => {
    playCardClick();
    setSelectedIds([]);
  };

  const handleConfirm = () => {
    if (selectedIds.length !== pick) {
      playErrorBuzz();
      return;
    }
    if (onSubmit) {
      onSubmit(selectedIds);
    }
  };

  // If user is Czar
  if (isCzar) {
    return (
      <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 text-center my-4">
        <div className="text-3xl mb-2">👑</div>
        <h3 className="text-lg font-bold text-amber-400">Você é o Czar da Rodada!</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Aguarde os outros jogadores enviarem suas respostas. Depois você escolherá a combinação mais engraçada ou absurda!
        </p>
      </div>
    );
  }

  // If user already submitted
  if (hasSubmitted) {
    return (
      <div className="w-full bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-6 text-center my-4 animate-fadeIn">
        <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={32} />
        <h3 className="text-lg font-bold text-emerald-300">Jogada Confirmada!</h3>
        <p className="text-xs text-zinc-400 mt-1">
          Suas cartas foram enviadas anonimamente. Aguardando os demais jogadores e o veredito do Czar...
        </p>
      </div>
    );
  }

  const isComplete = selectedIds.length === pick;

  return (
    <div className="w-full flex flex-col pb-24">
      {/* Hand Header info */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Sua Mão ({hand.length} cartas)
          </span>
          {randomizeHandEachRound && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 border border-purple-800 text-purple-300 flex items-center gap-1 shadow-sm">
              <Shuffle size={10} /> Aleatórias toda rodada
            </span>
          )}
        </div>
        <div className="text-xs font-semibold text-zinc-300">
          Selecionadas: <span className={isComplete ? 'text-sky-400 font-bold' : 'text-zinc-400'}>{selectedIds.length}/{pick}</span>
        </div>
      </div>

      {/* Cards Grid: 2 columns on mobile, 3-4 on larger screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {hand.map((card) => {
          const selIndex = selectedIds.indexOf(card.id);
          const isSelected = selIndex !== -1;
          const order = isSelected ? selIndex + 1 : null;

          return (
            <WhiteCard
              key={card.id}
              card={card}
              isSelected={isSelected}
              selectionOrder={pick > 1 ? order : null}
              onClick={toggleSelectCard}
            />
          );
        })}
      </div>

      {/* Floating Bottom Action Bar for Easy Mobile Thumb Confirmation */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black via-zinc-950/95 to-transparent backdrop-blur-md z-40 border-t border-zinc-800/80">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {pick > 1 && selectedIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition active:scale-95"
              title="Limpar Seleção"
            >
              <RotateCcw size={18} />
            </button>
          )}

          <button
            onClick={handleConfirm}
            disabled={!isComplete}
            className={`flex-1 py-3.5 px-5 rounded-xl font-black text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
              isComplete
                ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30 scale-[1.01] active:scale-95 animate-pulse-subtle'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Send size={16} />
            {isComplete ? (
              <span>Confirmar Jogada ({pick === 1 ? '1 carta' : `${pick} cartas`})</span>
            ) : (
              <span>Selecione {pick - selectedIds.length} {pick - selectedIds.length === 1 ? 'carta' : 'cartas'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
