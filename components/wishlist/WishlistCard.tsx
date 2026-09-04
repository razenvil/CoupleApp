'use client';

import React, { useState } from 'react';
import { ArrowUpRight, Gift, Trash2, Heart, Sparkles, CheckCircle, Maximize2, Minimize2, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { WishlistItem } from '@/lib/types';
import { useAppStore } from '@/lib/store/app-store';
import { haptic } from '@/lib/telegram';

interface WishlistCardProps {
  item: WishlistItem;
  onDelete: (id: string) => void;
  onToggleReserve: (id: string) => void;
  onMarkGifted: (id: string) => void;
}

function getStoreLabel(url?: string): string {
  if (!url) return 'Купить';
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host.includes('wildberries') || host.includes('wb.ru')) return 'Wildberries';
    if (host.includes('ozon')) return 'Ozon';
    if (host.includes('goldapple') || host.includes('gold-apple')) return 'Золотое Яблоко';
    if (host.includes('lamoda')) return 'Lamoda';
    if (host.includes('market.yandex') || host.includes('yandex')) return 'Яндекс Маркет';
    if (host.includes('aliexpress')) return 'AliExpress';
    const main = host.split('.')[0];
    return main.charAt(0).toUpperCase() + main.slice(1);
  } catch {
    return 'Магазин';
  }
}

export const WishlistCard: React.FC<WishlistCardProps> = ({
  item,
  onDelete,
  onToggleReserve,
  onMarkGifted,
}) => {
  const { currentUser } = useAppStore();

  const isAuthor = item.authorId === currentUser.id;
  const isReserved = Boolean(item.isReservedByPartner);

  // Fit mode state: 'contain' (clean studio stage, 100% visible) vs 'cover' (edge-to-edge)
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const handleReserve = () => {
    haptic.medium();
    onToggleReserve(item.id);
  };

  const handleGifted = () => {
    haptic.heavy();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#FF2D55', '#FF375F', '#FFD60A', '#30D158', '#0A84FF'],
    });
    onMarkGifted(item.id);
  };

  const toggleFitMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.light();
    setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="ios-card overflow-hidden flex flex-col justify-between group transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div>
          {/* Apple Studio Stage (Clean, crisp, no blurry duplicates) */}
          <div
            onClick={() => item.imageUrl && setIsPhotoModalOpen(true)}
            className="relative w-full aspect-[4/3] bg-[#F7F7F9] dark:bg-[#1A1A1D] overflow-hidden flex items-center justify-center cursor-pointer border-b border-border/30"
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className={`w-full h-full transition-all duration-300 ${
                  fitMode === 'cover'
                    ? 'object-cover'
                    : 'object-contain p-3'
                } group-hover:scale-105 drop-shadow-xs`}
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground p-6">
                <Gift size={36} strokeWidth={1.4} className="text-primary/70 mb-1" />
                <span className="text-[11px] font-medium">Без фото</span>
              </div>
            )}

            {/* Priority Heart Badge (Top Left) */}
            {item.priority === 'high' && (
              <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs pointer-events-none">
                <Heart size={10} className="fill-primary text-primary" />
                <span>Очень хочу</span>
              </div>
            )}

            {/* Controls (Top Right) */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center space-x-1.5">
              {/* Fit Mode Toggle Button */}
              {item.imageUrl && (
                <button
                  type="button"
                  onClick={toggleFitMode}
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white/90 flex items-center justify-center transition-colors ios-press shadow-xs"
                  title={fitMode === 'contain' ? 'Заполнить карточку полностью' : 'Вписать изображение целиком'}
                >
                  {fitMode === 'contain' ? (
                    <Maximize2 size={12} strokeWidth={2.2} />
                  ) : (
                    <Minimize2 size={12} strokeWidth={2.2} />
                  )}
                </button>
              )}

              {/* Secret Gift Badge for Partner */}
              {!isAuthor && isReserved && (
                <div className="bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse">
                  <Sparkles size={11} />
                  <span>Вы дарите!</span>
                </div>
              )}

              {/* Author Delete Button */}
              {isAuthor && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Удалить «${item.title}» из желаний?`)) {
                      haptic.warning();
                      onDelete(item.id);
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-red-500/90 backdrop-blur-md text-white/90 flex items-center justify-center transition-colors ios-press shadow-xs"
                  title="Удалить карточку"
                >
                  <Trash2 size={12} strokeWidth={2.2} />
                </button>
              )}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-3.5 pb-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
              <span>{isAuthor ? 'Ваше желание' : `Хочет ${item.authorName}`}</span>
            </div>

            <h4 className="text-[14px] font-bold tracking-tight text-foreground line-clamp-2 leading-snug">
              {item.title}
            </h4>

            {/* Price */}
            {item.price !== undefined && item.price > 0 && (
              <div className="mt-1.5 text-base font-black text-primary tracking-tight">
                {item.price.toLocaleString('ru-RU')} {item.currency || '₽'}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 italic">
                «{item.notes}»
              </p>
            )}
          </div>
        </div>

        {/* Action Footer (App Store Capsule Buttons) */}
        <div className="px-3.5 py-2.5 border-t border-border/40 flex items-center justify-between gap-2">
          {/* Store Link Capsule */}
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptic.light()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-foreground text-xs font-semibold transition-all ios-press shadow-2xs"
            >
              <span>{getStoreLabel(item.link)}</span>
              <ArrowUpRight size={12} className="text-muted-foreground" />
            </a>
          ) : (
            <div />
          )}

          {/* Secret Reservation / Gifted Action */}
          {!isAuthor && (
            <div className="flex items-center space-x-1.5">
              {isReserved ? (
                <>
                  <button
                    onClick={handleGifted}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm ios-press"
                  >
                    <CheckCircle size={13} strokeWidth={2.5} />
                    <span>Подарено!</span>
                  </button>
                  <button
                    onClick={handleReserve}
                    className="w-7 h-7 rounded-full bg-secondary text-muted-foreground hover:text-red-500 flex items-center justify-center text-xs ios-press"
                    title="Отменить бронь"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <button
                  onClick={handleReserve}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-hover ios-press"
                >
                  <Gift size={12} strokeWidth={2.4} />
                  <span>Подарить</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Fullscreen High-Res Photo Modal */}
      <AnimatePresence>
        {isPhotoModalOpen && item.imageUrl && (
          <div
            onClick={() => setIsPhotoModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full bg-card rounded-[28px] overflow-hidden shadow-2xl border border-border flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b border-border/50">
                <span className="font-bold text-sm truncate">{item.title}</span>
                <button
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground ios-press"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 max-h-[70vh] overflow-auto flex items-center justify-center bg-black/40">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="max-h-full max-w-full object-contain rounded-[14px]"
                />
              </div>

              <div className="p-3 bg-secondary/40 flex items-center justify-between">
                {item.price && (
                  <span className="text-base font-extrabold text-primary">
                    {item.price.toLocaleString('ru-RU')} {item.currency || '₽'}
                  </span>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold shadow-md flex items-center space-x-1.5 ios-press"
                  >
                    <span>Открыть в {getStoreLabel(item.link)}</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
