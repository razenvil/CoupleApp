'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, Sparkles, UserPlus, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { haptic } from '@/lib/telegram';

interface InvitePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvitePartnerModal: React.FC<InvitePartnerModalProps> = ({ isOpen, onClose }) => {
  const { couple, joinCoupleByCode } = useAppStore();
  const [activeMode, setActiveMode] = useState<'invite' | 'join'>('invite');
  const [copiedCode, setCopiedCode] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(couple.inviteCode);
    haptic.success();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const [copiedLink, setCopiedLink] = useState(false);

  const getInviteUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://couple-app-phi-ruddy.vercel.app';
    return `${origin}/?couple=${couple.inviteCode}`;
  };

  const handleCopyLink = () => {
    const url = getInviteUrl();
    navigator.clipboard.writeText(url);
    haptic.success();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareLink = () => {
    haptic.light();
    const inviteUrl = getInviteUrl();
    const shareText = `Любимая, заходи в наше приложение «Мы Вместе» ❤️\n\nСсылка для входа: ${inviteUrl}\nКод нашей пары: ${couple.inviteCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Приложение для нашей пары',
        text: shareText,
        url: inviteUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === couple.inviteCode) {
      setJoinError('Вы ввели свой собственный код пары. Введите код вашей второй половинки!');
      haptic.warning();
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setJoinSuccess(null);
    haptic.medium();

    try {
      const res = await joinCoupleByCode(cleanCode);
      if (res.success) {
        haptic.success();
        setJoinSuccess('🎉 Вы успешно объединились в пару!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        haptic.warning();
        setJoinError(res.message || 'Пара с таким кодом не найдена');
      }
    } catch {
      haptic.warning();
      setJoinError('Ошибка соединения с базой');
    } finally {
      setIsJoining(false);
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

          {/* Mode Switcher */}
          <div className="flex bg-secondary p-1 rounded-full mb-4 border border-border mt-2">
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setActiveMode('invite');
              }}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeMode === 'invite'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Мой код пары
            </button>
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setActiveMode('join');
              }}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeMode === 'join'
                  ? 'bg-card text-foreground shadow-xs text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ввести код партнера
            </button>
          </div>

          {activeMode === 'invite' ? (
            <>
              {/* Header */}
              <div className="mb-4">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold mb-2">
                  <Heart size={12} className="fill-current" />
                  <span>Ваша личная пара</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  Пригласить половинку
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Отправьте этот уникальный код своей второй половинке
                </p>
              </div>

              {/* Code Badge */}
              <div className="mb-4 p-4 rounded-2xl bg-secondary/60 border border-primary/20 relative">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Уникальный код вашей пары
                </span>
                <span className="font-mono text-3xl font-black text-primary tracking-widest block">
                  {couple.inviteCode}
                </span>
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleShareLink}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-xs shadow-md transition-all ios-press flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:opacity-95"
                >
                  <Share2 size={16} />
                  <span>Отправить ссылку половинке</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`w-full py-2.5 px-4 rounded-2xl font-semibold text-xs transition-all ios-press flex items-center justify-center space-x-1.5 ${
                    copiedLink
                      ? 'bg-emerald-500 text-white'
                      : 'text-foreground bg-secondary/80 hover:bg-secondary'
                  }`}
                >
                  {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedLink ? 'Ссылка скопирована!' : 'Скопировать ссылку для входа'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`w-full py-2.5 px-4 rounded-2xl font-semibold text-xs transition-all ios-press flex items-center justify-center space-x-1.5 ${
                    copiedCode
                      ? 'bg-emerald-500 text-white'
                      : 'text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary'
                  }`}
                >
                  {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedCode ? 'Код скопирован!' : `Скопировать только код (${couple.inviteCode})`}</span>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="mb-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
                  <UserPlus size={12} />
                  <span>Подключение</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  Ввести код пары
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Введите код, который вам отправил(а) ваш(а) партнер(ша)
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Например: CP-7482"
                  className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border font-mono text-center text-lg font-black tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase"
                />
              </div>

              {joinError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-1.5 text-left">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              {joinSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs flex items-center gap-1.5 text-left">
                  <Check size={14} className="shrink-0" />
                  <span>{joinSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining || !inputCode.trim()}
                className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-primary text-primary-foreground shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isJoining ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Подключение...</span>
                  </>
                ) : (
                  <>
                    <Heart size={16} className="fill-current" />
                    <span>Объединиться в пару</span>
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
