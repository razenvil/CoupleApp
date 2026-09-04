'use client';

import React from 'react';
import { Heart, Sparkles, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store/app-store';
import { getAvatarUrl } from '@/lib/avatars';
import { haptic } from '@/lib/telegram';

export const HeaderWidget: React.FC = () => {
  const { couple, currentUser, partnerUser, switchUser } = useAppStore();

  const start = new Date(couple.startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const daysTogether = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const getDaysLabel = (num: number) => {
    const mod10 = num % 10;
    const mod100 = num % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'дней';
    if (mod10 === 1) return 'день';
    if (mod10 >= 2 && mod10 <= 4) return 'дня';
    return 'дней';
  };

  const daysWord = getDaysLabel(daysTogether);

  const handleSwitchUser = () => {
    haptic.medium();
    switchUser(partnerUser.id);
  };

  return (
    <header className="px-5 pt-safe pt-2 pb-1 max-w-md mx-auto">
      {/* Top Bar: Dynamic Island Capsule (Left) + Persona Avatar Switcher (Right) */}
      <div className="flex items-center justify-between gap-2">
        {/* Dynamic Island Couple Pill */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          onClick={() => haptic.light()}
          className="ios-dynamic-island px-3 py-1.5 flex items-center space-x-2.5 cursor-pointer shadow-lg ios-press"
          title={`Вы вместе с ${start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        >
          {/* Overlapping 3D Memojis with Glowing Heart */}
          <div className="relative flex items-center">
            <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/30 bg-zinc-800 shrink-0">
              <img
                src={getAvatarUrl(couple.partnerA.avatar)}
                alt={couple.partnerA.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/30 bg-zinc-800 -ml-2 shrink-0">
              <img
                src={getAvatarUrl(couple.partnerB.avatar)}
                alt={couple.partnerB.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center shadow-xs">
              <Heart size={7} className="fill-current text-white animate-pulse" />
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold tracking-tight text-white/95">
            <span>{daysTogether} {daysWord}</span>
            <Sparkles size={11} className="text-primary" />
          </div>
        </motion.div>

        {/* Current User Authenticated Profile Pill */}
        <div
          className="flex items-center space-x-2 pl-2.5 pr-1.5 py-1 rounded-full bg-secondary/70 border border-border/40 text-xs font-medium text-foreground shadow-xs select-none"
        >
          <span className="font-bold text-xs">{currentUser.name}</span>
          <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-primary/50 bg-secondary shrink-0">
            <img
              src={getAvatarUrl(currentUser.avatar)}
              alt={currentUser.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
