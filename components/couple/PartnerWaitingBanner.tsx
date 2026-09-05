'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Send, Copy, Check, Sparkles, UserPlus } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { haptic } from '@/lib/telegram';

export const PartnerWaitingBanner: React.FC = () => {
  const { couple, partnerUser, botUsername } = useAppStore();
  const [copied, setCopied] = useState(false);

  // Only show if partner has not joined yet
  if (partnerUser.id !== 'waiting') return null;

  const inviteCode = couple?.inviteCode || couple?.id || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      haptic.success();
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      haptic.warning();
    }
  };

  const getInviteLink = () => {
    if (botUsername) {
      return `https://t.me/${botUsername}?start=${inviteCode}`;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://couple-app-phi-ruddy.vercel.app';
    return `${origin}/?couple=${inviteCode}`;
  };

  const handleShare = async () => {
    haptic.medium();
    const link = getInviteLink();
    const shareText = `Любимая, заходи в наше приложение «Мы Вместе» ❤️\nВход в 1 клик: ${link}\nКод нашей пары: ${inviteCode}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: '«Мы Вместе» — наше пространство',
          text: shareText,
          url: link,
        });
        return;
      } catch {}
    }

    // Fallback if Web Share is unavailable
    if (typeof window !== 'undefined') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-[24px] bg-gradient-to-br from-primary/15 via-rose-500/10 to-amber-500/10 border border-primary/25 shadow-sm space-y-3 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-rose-400 text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Heart size={20} className="fill-current animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black tracking-tight text-foreground flex items-center gap-1.5">
              <span>Позовите половинку</span>
              <Sparkles size={13} className="text-primary" />
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              Отправьте приглашение, чтобы вести общий список дел и сейф документов вместе!
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-card/80 border border-border/60 text-xs font-mono">
        <div className="flex items-center space-x-1.5 pl-1 text-[11px] font-medium text-muted-foreground">
          <span>Код пары:</span>
          <strong className="text-foreground font-bold tracking-wider">{inviteCode}</strong>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1 rounded-xl bg-secondary hover:bg-secondary-hover text-foreground text-[11px] font-bold flex items-center space-x-1 transition-colors ios-press"
          title="Скопировать код"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="w-full py-2.5 px-4 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary-hover flex items-center justify-center space-x-2 ios-press transition-all"
      >
        <Send size={14} className="fill-current" />
        <span>Отправить приглашение в Telegram ❤️</span>
      </button>
    </motion.div>
  );
};
