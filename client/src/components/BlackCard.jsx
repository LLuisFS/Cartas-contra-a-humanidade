import React from 'react';

export function BlackCard({ card, filledCards = null, isCompact = false, className = '' }) {
  if (!card) {
    return (
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center text-zinc-500">
        Aguardando carta preta...
      </div>
    );
  }

  const { text, pick = 1 } = card;

  // Render text with blanks filled by selected white cards if provided
  const renderCardContent = () => {
    if (!filledCards || filledCards.length === 0) {
      return <span>{text}</span>;
    }

    // Split text by underscore patterns (_+)
    const parts = text.split(/_+/g);

    if (parts.length > 1) {
      const elements = [];
      parts.forEach((part, index) => {
        elements.push(<span key={`part-${index}`}>{part}</span>);
        if (index < parts.length - 1) {
          const filled = filledCards[index];
          const fillText = typeof filled === 'string' ? filled : (filled ? filled.text : '____');
          elements.push(
            <span key={`fill-${index}`} className="blank-fill mx-1">
              {fillText}
            </span>
          );
        }
      });
      return <>{elements}</>;
    } else {
      // If there are no blanks in the text, append the answers
      return (
        <div>
          <span>{text}</span>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {filledCards.map((c, i) => (
              <span key={i} className="blank-fill">
                {typeof c === 'string' ? c : c.text}
              </span>
            ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div
      className={`relative bg-black text-white border border-zinc-800 rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden card-transition ${
        isCompact ? 'p-4 min-h-[120px]' : 'p-6 min-h-[170px] sm:min-h-[200px]'
      } ${className}`}
    >
      {/* Subtle top reflection accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-40" />

      {/* Main Card Text */}
      <div className={`font-black tracking-tight leading-snug ${
        isCompact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'
      }`}>
        {renderCardContent()}
      </div>

      {/* Card Footer */}
      <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
        {/* CAH Brand Watermark */}
        <div className="flex items-center gap-1.5 text-zinc-500">
          <div className="w-2.5 h-2.5 bg-white rounded-[2px]" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            Cartas Contra a Humanidade
          </span>
        </div>

        {/* Pick Badge */}
        {pick > 1 ? (
          <div className="px-2.5 py-0.5 rounded-full bg-white text-black font-black text-xs tracking-wider uppercase animate-pulse-subtle shadow-md">
            Escolha {pick}
          </div>
        ) : (
          <div className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold text-[10px] tracking-wider uppercase">
            Escolha 1
          </div>
        )}
      </div>
    </div>
  );
}
