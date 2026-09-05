'use client';

import { Heart, Sparkles, UserCheck, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store/app-store';
import { getAvatarUrl } from '@/lib/avatars';
import { haptic, isTelegramWebApp, isStandalonePwa } from '@/lib/telegram';

interface HeaderWidgetProps {
  onOpenPwa?: () => void;
}

export const HeaderWidget: React.FC<HeaderWidgetProps> = ({ onOpenPwa }) => {
  const { couple, currentUser, partnerUser, switchUser, headerStyle } = useAppStore();

  const isTg = isTelegramWebApp();
  const isPwa = isStandalonePwa();
  const showPwaButton = onOpenPwa && isTg && !isPwa;

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

  const formattedDate = start.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="px-5 pt-safe pt-2 pb-1 max-w-md mx-auto">
      {headerStyle === 'widget' ? (
        /* Expanded "Widget" Style: Top control row + prominent couple counter card */
        <div className="space-y-2.5">
          {/* Top minimal bar with status & user profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-muted-foreground">
              <Sparkles size={13} className="text-primary" />
              <span>{couple.anniversaryTitle || 'Мы вместе'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {showPwaButton && (
                <button
                  onClick={() => {
                    haptic.light();
                    onOpenPwa();
                  }}
                  className="px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[11px] font-bold flex items-center gap-1 ios-press transition-colors shadow-xs"
                  title="Установить PWA на экран Домой"
                >
                  <Smartphone size={13} />
                  <span>PWA</span>
                </button>
              )}

              <div className="flex items-center space-x-2 pl-2.5 pr-1.5 py-1 rounded-full bg-secondary/70 border border-border/40 text-xs font-medium text-foreground shadow-xs select-none">
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
          </div>

          {/* Prominent Counter Widget Card */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-[24px] bg-gradient-to-br from-card via-card/95 to-primary/10 border border-border/70 shadow-sm flex items-center justify-between relative overflow-hidden"
          >
            <div className="space-y-0.5 z-10">
              <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Вместе уже
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {daysTogether}
                </span>
                <span className="text-sm font-bold text-primary">{daysWord}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 font-medium">
                с {formattedDate}
              </p>
            </div>

            {/* Overlapping partner avatars with glowing heart */}
            <div className="relative flex items-center pr-2 z-10">
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-background bg-secondary shadow-sm shrink-0">
                <img
                  src={getAvatarUrl(couple.partnerA.avatar)}
                  alt={couple.partnerA.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-background bg-secondary shadow-sm -ml-4 shrink-0">
                <img
                  src={getAvatarUrl(couple.partnerB.avatar)}
                  alt={couple.partnerB.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                <Heart size={10} className="fill-current text-white animate-pulse" />
              </div>
            </div>

            {/* Background subtle decoration */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          </motion.div>
        </div>
      ) : (
        /* Compact Capsule Header */
        <div className="flex items-center justify-between gap-2">
          {/* Dynamic Island Couple Pill */}
          <motion.div
            whileTap={{ scale: 0.96 }}
            onClick={() => haptic.light()}
            className="ios-dynamic-island px-3 py-1.5 flex items-center space-x-2.5 cursor-pointer shadow-lg ios-press"
            title={`Вы вместе с ${formattedDate}`}
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

          {/* Right side: PWA Button + Profile Pill */}
          <div className="flex items-center gap-1.5">
            {showPwaButton && (
              <button
                onClick={() => {
                  haptic.light();
                  onOpenPwa();
                }}
                className="px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[11px] font-bold flex items-center gap-1 ios-press transition-colors shadow-xs"
                title="Установить PWA на экран Домой"
              >
                <Smartphone size={13} />
                <span>PWA</span>
              </button>
            )}

            {/* Current User Authenticated Profile Pill */}
            <div className="flex items-center space-x-2 pl-2.5 pr-1.5 py-1 rounded-full bg-secondary/70 border border-border/40 text-xs font-medium text-foreground shadow-xs select-none">
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
        </div>
      )}
    </header>
  );
};
