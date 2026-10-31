import React from 'react';
import { playCardClick } from '../utils/audio';

export function WhiteCard({
  card,
  isSelected = false,
  selectionOrder = null, // 1, 2, 3
  onClick = null,
  disabled = false,
  className = '',
  isSmall = false
}) {
  if (!card) return null;

  const handleClick = () => {
    if (disabled || !onClick) return;
    playCardClick();
    onClick(card);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative bg-white text-zinc-950 rounded-2xl flex flex-col justify-between select-none cursor-pointer card-transition border transition-all ${
        isSelected
          ? 'border-sky-500 ring-4 ring-sky-500/30 scale-[1.03] shadow-2xl z-10 -translate-y-1'
          : 'border-zinc-300 hover:border-zinc-400 shadow-md active:scale-95'
      } ${
        disabled
          ? 'opacity-40 cursor-not-allowed pointer-events-none'
          : 'hover:shadow-xl'
      } ${
        isSmall
          ? 'p-3 min-h-[110px] w-full text-xs'
          : 'p-4 sm:p-5 min-h-[140px] sm:min-h-[170px] text-sm sm:text-base'
      } ${className}`}
    >
      {/* Selection Order Badge (1ª, 2ª, 3ª) */}
      {isSelected && selectionOrder !== null && (
        <div className="absolute -top-3 -right-2 bg-sky-500 text-white font-black text-xs sm:text-sm px-2.5 py-1 rounded-full shadow-lg flex items-center justify-center animate-bounce">
          {selectionOrder}ª
        </div>
      )}

      {/* Card Content Text */}
      <div className="font-extrabold tracking-tight leading-snug text-zinc-950 break-words">
        {card.text}
      </div>

      {/* Card Bottom CAH Watermark */}
      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center gap-1.5 text-zinc-400">
        <div className="w-2 h-2 bg-zinc-900 rounded-[2px]" />
        <span className="text-[9px] font-black uppercase tracking-wider">
          Cartas Contra a Humanidade
        </span>
      </div>
    </div>
  );
}
