'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Copy, Check, Share, ExternalLink, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { haptic } from '@/lib/telegram';

interface PwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaModal: React.FC<PwaModalProps> = ({ isOpen, onClose }) => {
  const { couple, currentUser } = useAppStore();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://couple-app-phi-ruddy.vercel.app';
  const pwaUrl = `${origin}/?auth_id=${encodeURIComponent(currentUser.id)}&name=${encodeURIComponent(
    currentUser.name
  )}&couple=${encodeURIComponent(couple.id)}&avatar=${encodeURIComponent(currentUser.avatar)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pwaUrl);
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenBrowser = () => {
    haptic.light();
    if (typeof window !== 'undefined') {
      window.open(pwaUrl, '_blank');
    }
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

          {/* Icon & Title */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-rose-400 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/25">
            <Smartphone size={28} />
          </div>

          <h3 className="text-xl font-black tracking-tight text-foreground">
            Вход в PWA на телефоне
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
            Пользуйтесь «Мы Вместе» как отдельным приложением прямо с экрана смартфона без открытия Telegram!
          </p>

          {/* Step-by-step instructions */}
          <div className="p-3.5 rounded-2xl bg-secondary/80 border border-border text-left text-xs space-y-2.5 mb-4">
            <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <Sparkles size={14} className="text-primary" />
              <span>Как установить в 3 шага:</span>
            </div>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1.5 text-[11px] leading-relaxed">
              <li>Нажмите кнопку <b>«Скопировать ссылку»</b> ниже.</li>
              <li>Откройте её в браузере <b>Safari</b> (на iPhone) или <b>Chrome</b> (на Android).</li>
              <li>Нажмите кнопку <b>«Поделиться»</b> <Share size={11} className="inline mx-0.5 text-primary" /> и выберите <b>«На экран Домой»</b>.</li>
            </ol>
            <p className="text-[10px] text-primary/90 font-medium">
              ✨ Ваш аккаунт ({currentUser.name}) и пара ({couple.inviteCode}) подключатся автоматически!
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ios-press shadow-md ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary text-primary-foreground hover:bg-primary-hover'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Ссылка для входа скопирована!' : 'Скопировать персональную ссылку для PWA'}</span>
            </button>

            <button
              onClick={handleOpenBrowser}
              className="w-full py-2.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center justify-center space-x-1.5 ios-press"
            >
              <ExternalLink size={14} />
              <span>Открыть в браузере</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
