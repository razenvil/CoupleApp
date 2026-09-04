'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, Sparkles, Send, Smartphone } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { haptic } from '@/lib/telegram';

interface InvitePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvitePartnerModal: React.FC<InvitePartnerModalProps> = ({ isOpen, onClose }) => {
  const { couple } = useAppStore();
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const inviteLink = `https://t.me/our_couple_bot?start=${couple.inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    haptic.success();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/65 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm rounded-[32px] ios-glass-card p-6 border border-white/20 shadow-2xl overflow-hidden flex flex-col text-center"
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

          {/* Header */}
          <div className="mb-4">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold mb-2">
              <Share2 size={12} />
              <span>Синхронизация пары</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Пригласить партнера
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Отправьте персональную ссылку своей второй половинке
            </p>
          </div>

          {/* Instructions Inset List */}
          <div className="rounded-2xl ios-inset-grouped p-3.5 space-y-2.5 text-left mb-4">
            <div className="flex items-start space-x-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <span className="text-xs text-foreground font-medium">
                Скопируйте ссылку приглашения ниже
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <span className="text-xs text-foreground font-medium">
                Отправьте ее партнеру в Telegram личным сообщением
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <span className="text-xs text-foreground font-medium">
                Партнер перейдет по ссылке и мгновенно подключится к вашему общему пространству!
              </span>
            </div>
          </div>

          {/* Code Badge */}
          <div className="mb-3 p-3 rounded-2xl bg-secondary/50 border border-border/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Код вашей пары
            </span>
            <span className="font-mono text-base font-black text-foreground tracking-widest">
              {couple.inviteCode}
            </span>
          </div>

          {/* Link Box with Copy Button */}
          <div className="space-y-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/60 text-[11px] text-foreground font-mono select-all focus:outline-none text-center"
            />
            <button
              onClick={handleCopy}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs shadow-md transition-all ios-press flex items-center justify-center space-x-2 ${
                copiedLink
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary text-primary-foreground hover:opacity-95'
              }`}
            >
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedLink ? 'Ссылка скопирована!' : 'Скопировать ссылку'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
