'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, RefreshCw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAppStore } from '@/lib/store/app-store';
import { getAvatarUrl } from '@/lib/avatars';
import { haptic } from '@/lib/telegram';

interface CoinFlipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoinFlipModal: React.FC<CoinFlipModalProps> = ({ isOpen, onClose }) => {
  const { couple } = useAppStore();
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<{ name: string; avatar: string; id: string } | null>(null);

  if (!isOpen) return null;

  const partnerA = couple.partnerA;
  const partnerB = couple.partnerB;

  const flipCoin = () => {
    if (isFlipping) return;

    haptic.medium();
    setIsFlipping(true);
    setWinner(null);

    // Pick random winner: 0 = Partner A, 1 = Partner B
    const isPartnerA = Math.random() < 0.5;
    const selectedWinner = isPartnerA ? partnerA : partnerB;

    // We do at least 5-6 full spins (1800-2160 deg) + landing side:
    // Partner A is at 0 deg (or multiples of 360)
    // Partner B is at 180 deg (or multiples of 360 + 180)
    const baseSpins = 360 * 5; // 1800 deg
    const targetOffset = isPartnerA ? 0 : 180;
    const currentBase = Math.floor(rotation / 360) * 360;
    const finalRotation = currentBase + baseSpins + targetOffset;

    // Haptic tick pulses during spin
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      haptic.selection();
      if (tickCount >= 10) clearInterval(tickInterval);
    }, 120);

    setRotation(finalRotation);

    setTimeout(() => {
      clearInterval(tickInterval);
      setIsFlipping(false);
      setWinner(selectedWinner);
      haptic.success();

      // Confetti burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF2D55', '#34C759'],
      });
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/65 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm rounded-[32px] ios-glass-card p-6 border border-white/20 shadow-2xl overflow-hidden flex flex-col items-center text-center"
        >
          {/* Close button */}
          <button
            onClick={() => {
              haptic.light();
              onClose();
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground ios-press transition-colors"
          >
            <X size={18} />
          </button>

          {/* Title Header */}
          <div className="mb-6">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-500 text-xs font-semibold mb-2">
              <Sparkles size={12} />
              <span>Честный рандом для двоих</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Монетка судьбы
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Кто моет посуду? Кто встречает курьера? Бросайте!
            </p>
          </div>

          {/* 3D Coin Arena */}
          <div
            className="relative w-44 h-44 my-4 flex items-center justify-center cursor-pointer select-none"
            style={{ perspective: 1200 }}
            onClick={flipCoin}
          >
            <motion.div
              animate={{
                rotateY: rotation,
                y: isFlipping ? [-5, -120, -150, -80, 0] : 0,
                scale: isFlipping ? [1, 1.15, 1.25, 1.1, 1] : 1,
              }}
              transition={{
                rotateY: { duration: 1.8, ease: [0.15, 0.85, 0.35, 1] },
                y: { duration: 1.8, ease: [0.2, 0.7, 0.3, 1] },
                scale: { duration: 1.8, ease: 'easeInOut' },
              }}
              className="relative w-40 h-40 rounded-full"
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {/* SIDE A: Partner A (Front) */}
              <div
                className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-3 shadow-2xl border-4 border-amber-400 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-slate-900 overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                  boxShadow: '0 0 35px rgba(245, 158, 11, 0.45), inset 0 2px 8px rgba(255, 255, 255, 0.6)',
                }}
              >
                {/* Specular sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />

                <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/90 shadow-md bg-white/20 mb-1 shrink-0">
                  <img
                    src={getAvatarUrl(partnerA.avatar)}
                    alt={partnerA.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs font-black tracking-wide text-white drop-shadow-md uppercase">
                  {partnerA.name}
                </span>
              </div>

              {/* SIDE B: Partner B (Back) */}
              <div
                className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-3 shadow-2xl border-4 border-rose-400 bg-gradient-to-br from-rose-300 via-rose-500 to-pink-700 text-slate-900 overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  boxShadow: '0 0 35px rgba(244, 63, 94, 0.45), inset 0 2px 8px rgba(255, 255, 255, 0.6)',
                }}
              >
                {/* Specular sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />

                <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/90 shadow-md bg-white/20 mb-1 shrink-0">
                  <img
                    src={getAvatarUrl(partnerB.avatar)}
                    alt={partnerB.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs font-black tracking-wide text-white drop-shadow-md uppercase">
                  {partnerB.name}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Winner Banner / Prompt */}
          <div className="h-14 flex items-center justify-center w-full my-2">
            {winner ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-primary/15 border border-primary/30 text-primary font-bold text-sm shadow-xs"
              >
                <Trophy size={16} className="text-amber-500 shrink-0" />
                <span>Выпало: <strong className="font-black text-foreground">{winner.name}</strong>!</span>
              </motion.div>
            ) : isFlipping ? (
              <p className="text-xs font-semibold text-muted-foreground animate-pulse">
                Монетка в воздухе...
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Нажмите на монетку или кнопку снизу
              </p>
            )}
          </div>

          {/* Action Flip Button */}
          <button
            onClick={flipCoin}
            disabled={isFlipping}
            className="w-full py-3.5 px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:opacity-95 ios-press disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <RefreshCw size={16} className={isFlipping ? 'animate-spin' : ''} />
            <span>{winner ? 'Бросить еще раз' : 'Подбросить монетку'}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
