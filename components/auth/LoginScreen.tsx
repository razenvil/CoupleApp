'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowRight, Loader2, Send } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { PRESET_AVATARS } from '@/lib/avatars';
import { haptic } from '@/lib/telegram';

export const LoginScreen: React.FC = () => {
  const { loginWithCoupleCode, loginAsNewCouple } = useAppStore();
  const [tab, setTab] = useState<'join' | 'create' | 'telegram'>('join');

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMsg('Пожалуйста, заполните код пары и ваше имя');
      haptic.warning();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    haptic.medium();

    const res = await loginWithCoupleCode(code, name, selectedAvatar);
    if (!res.success) {
      setErrorMsg(res.message || 'Ошибка входа');
      haptic.warning();
    } else {
      haptic.success();
    }
    setIsLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Пожалуйста, введите ваше имя');
      haptic.warning();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    haptic.medium();

    const res = await loginAsNewCouple(name, selectedAvatar);
    if (!res.success) {
      setErrorMsg(res.message || 'Ошибка создания пары');
      haptic.warning();
    } else {
      haptic.success();
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-primary/20">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] bg-gradient-to-tr from-primary to-rose-400 text-white shadow-xl shadow-primary/30 mx-auto mb-2">
            <Heart size={32} className="fill-current animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Мы Вместе</h1>
          <p className="text-sm text-muted-foreground">
            Общий сейф документов, хотелки и задачи для вашей пары
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-secondary p-1 rounded-full border border-border">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setTab('join');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
              tab === 'join'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Войти по коду
          </button>
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setTab('create');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
              tab === 'create'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Создать пару
          </button>
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setTab('telegram');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
              tab === 'telegram'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Telegram
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-center"
          >
            {errorMsg}
          </motion.div>
        )}

        {/* Tab 1: Join Existing Couple */}
        {tab === 'join' && (
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleJoin}
            className="ios-card p-6 border border-border shadow-ios space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Код пары от половинки
              </label>
              <input
                type="text"
                placeholder="CP-7482"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border text-foreground font-mono text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase"
                maxLength={7}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Ваше имя
              </label>
              <input
                type="text"
                placeholder="Как вас зовут?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Avatar selector */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                Выберите аватарку
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {PRESET_AVATARS.slice(0, 10).map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setSelectedAvatar(av.id);
                    }}
                    className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 transition-transform ios-press ${
                      selectedAvatar === av.id
                        ? 'border-primary ring-2 ring-primary/30 scale-105'
                        : 'border-border/60 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary-hover transition-all flex items-center justify-center space-x-2 ios-press disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Присоединиться к паре</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </motion.form>
        )}

        {/* Tab 2: Create New Couple */}
        {tab === 'create' && (
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreate}
            className="ios-card p-6 border border-border shadow-ios space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Ваше имя
              </label>
              <input
                type="text"
                placeholder="Как вас зовут?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Avatar selector */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                Выберите аватарку
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {PRESET_AVATARS.slice(0, 10).map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setSelectedAvatar(av.id);
                    }}
                    className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 transition-transform ios-press ${
                      selectedAvatar === av.id
                        ? 'border-primary ring-2 ring-primary/30 scale-105'
                        : 'border-border/60 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Мы сгенерируем для вас уникальный код пары, который вы сможете отправить партнеру после входа.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary-hover transition-all flex items-center justify-center space-x-2 ios-press disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Создать пространство пары</span>
                </>
              )}
            </button>
          </motion.form>
        )}

        {/* Tab 3: Telegram Info & Connect */}
        {tab === 'telegram' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="ios-card p-6 border border-border shadow-ios text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center mx-auto">
              <Send size={22} className="fill-current -rotate-12" />
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">Вход через Telegram</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Если вы открываете приложение через Telegram-бота, авторизация происходит мгновенно и без ввода паролей!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-secondary/80 border border-border text-left text-xs space-y-2">
              <div className="font-semibold text-foreground">💡 Как пользоваться PWA с Telegram:</div>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-[11px]">
                <li>Откройте приложение внутри нашего Telegram-бота.</li>
                <li>В настройках нажмите «Установить PWA на экран Домой».</li>
                <li>Откройте персональную ссылку в Safari или Chrome — вход выполнится автоматически!</li>
              </ol>
            </div>

            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-2xl bg-[#2AABEE] text-white font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center space-x-2 ios-press block"
            >
              <Send size={16} />
              <span>Открыть Telegram</span>
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
};
