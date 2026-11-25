'use client'

import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type PhotoLightboxProps = {
  photos: string[];
  startIndex: number;
  title: string;
  onClose: () => void;
};

export default function PhotoLightbox({
  photos,
  startIndex,
  title,
  onClose,
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const touchX = useRef<number | null>(null);

  const total = photos.length;
  const anterior = () => setIndex((i) => (i - 1 + total) % total);
  const siguiente = () => setIndex((i) => (i + 1) % total);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + total) % total);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % total);
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onClose, total]);

  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  const alSoltar = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const recorrido = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(recorrido) < 50) return;
    if (recorrido > 0) anterior();
    else siguiente();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/85 backdrop-blur-md p-5 animar-fundido"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        autoFocus
        className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 active:scale-90 transition-transform"
      >
        <X size={20} />
      </button>

      <img
        key={photos[index]}
        src={`/${photos[index]}`}
        alt={`${title} — ejemplo ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={alSoltar}
        className="max-h-[70vh] max-w-full rounded-xl border border-slate-700 shadow-2xl animar-acercar"
      />

      {total > 1 && (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-6">
          <button
            type="button"
            onClick={anterior}
            aria-label="Foto anterior"
            className="p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 active:scale-90 transition-transform"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs text-slate-400 tabular-nums tracking-widest">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={siguiente}
            aria-label="Foto siguiente"
            className="p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 active:scale-90 transition-transform"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}