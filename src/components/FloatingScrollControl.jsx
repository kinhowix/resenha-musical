import React from 'react';
import { Play, Pause, Plus, Minus, ArrowUpToLine } from 'lucide-react';

/**
 * Barra Flutuante Fixa na parte inferior da tela que NUNCA some quando a página desce!
 * Permite Pausar/Rolar e aumentar (+) ou diminuir (-) a velocidade em tempo real.
 */
export default function FloatingScrollControl({
  isAutoScrolling,
  onToggleScroll,
  scrollSpeed,
  onChangeSpeed,
}) {
  const handleDecrease = () => {
    const next = Math.max(0.5, Number((scrollSpeed - 0.5).toFixed(1)));
    onChangeSpeed(next);
  };

  const handleIncrease = () => {
    const next = Math.min(5.0, Number((scrollSpeed + 0.5).toFixed(1)));
    onChangeSpeed(next);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-zinc-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl px-3 py-2 shadow-2xl shadow-black/80">
      {/* Botão Play / Pause Rolagem */}
      <button
        type="button"
        onClick={onToggleScroll}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${isAutoScrolling
            ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25'
            : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
      >
        {isAutoScrolling ? (
          <>
            <Pause className="w-4 h-4 fill-current" />
            <span>Pausar</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>Rolar Música</span>
          </>
        )}
      </button>

      {/* Controle de Velocidade com - e + */}
      <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={scrollSpeed <= 0.5}
          title="Diminuir velocidade de rolagem (-)"
          className="p-1.5 rounded-lg text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-40 transition cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="px-2.5 text-center min-w-[4.2rem]">
          <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-bold leading-none">
            Velocidade
          </span>
          <span className="text-xs sm:text-sm font-mono font-extrabold text-amber-400">
            {scrollSpeed.toFixed(1)}x
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrease}
          disabled={scrollSpeed >= 5.0}
          title="Aumentar velocidade de rolagem (+)"
          className="p-1.5 rounded-lg text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-40 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Botão rápido de Voltar ao Topo */}
      <button
        type="button"
        onClick={scrollToTop}
        title="Voltar para o início da música"
        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 transition cursor-pointer"
      >
        <ArrowUpToLine className="w-4 h-4" />
      </button>
    </div>
  );
}

