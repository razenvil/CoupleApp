'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, ArrowRight, Loader2, Send, Check, X, Smartphone } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { PRESET_AVATARS } from '@/lib/avatars';
import { AvatarImage } from '@/components/common/AvatarImage';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/telegram';

export const LoginScreen: React.FC = () => {
  const { loginWithCoupleCode, loginAsNewCouple, botUsername } = useAppStore();
  const [mode, setMode] = useState<'join' | 'create'>('join');

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Telegram session handshake states
  const [isWaitingTg, setIsWaitingTg] = useState(false);
  const [tgSessionToken, setTgSessionToken] = useState<string | null>(null);
  const [tgBotUrl, setTgBotUrl] = useState<string>('');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Check URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('couple') || params.get('code');
      const urlName = params.get('name');
      const urlAvatar = params.get('avatar');

      if (urlCode) {
        let clean = urlCode.trim().toUpperCase();
        if (clean.startsWith('CP_')) clean = clean.replace('CP_', 'CP-');
        if (clean.startsWith('CP') && !clean.startsWith('CP-')) clean = `CP-${clean.slice(2)}`;
        setCode(clean);
        setMode('join');
      }

      if (urlName) {
        setName(urlName);
      }

      if (urlAvatar) {
        setSelectedAvatar(urlAvatar);
      }
    }

    // 2. Check for Telegram WebApp user
    const detectTgUser = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        try {
          window.Telegram.WebApp.ready?.();
          window.Telegram.WebApp.expand?.();
        } catch {}

        const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
        const startParam = window.Telegram.WebApp.initDataUnsafe?.start_param;

        if (tgUser?.first_name) {
          const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
          setName((prev) => prev || fullName);
        }

        if (startParam) {
          let clean = startParam.trim().toUpperCase();
          if (clean.startsWith('CP_')) clean = clean.replace('CP_', 'CP-');
          if (clean.startsWith('CP') && !clean.startsWith('CP-')) clean = `CP-${clean.slice(2)}`;
          if (clean.startsWith('CP-')) {
            setCode(clean);
            setMode('join');
          }
        }
      }
    };

    detectTgUser();
    const t1 = setTimeout(detectTgUser, 150);
    const t2 = setTimeout(detectTgUser, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Poll and listen for Telegram handshake authorization
  useEffect(() => {
    if (!isWaitingTg || !tgSessionToken) return;

    let isSubscribed = true;

    // 1. Supabase Realtime Channel
    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel(`auth_${tgSessionToken}`)
          .on('broadcast', { event: 'authorized' }, (payload: any) => {
            if (!isSubscribed) return;
            const user = payload?.payload?.user || payload?.user;
            if (user) {
              handleHandshakeSuccess(user);
            }
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    }

    // 2. Periodic Polling fallback (every 1.5s)
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/auth/session?token=${tgSessionToken}`);
        const data = await res.json();
        if (data.success && data.status === 'authorized' && data.user) {
          clearInterval(pollInterval);
          handleHandshakeSuccess(data.user);
        } else if (data.status === 'expired') {
          clearInterval(pollInterval);
          setIsWaitingTg(false);
          setErrorMsg('Время сессии входа истекло. Пожалуйста, попробуйте снова.');
        }
      } catch (e) {
        console.warn('Polling error:', e);
      }
    }, 1500);

    pollTimerRef.current = pollInterval;

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isWaitingTg, tgSessionToken]);

  const handleHandshakeSuccess = (user: any) => {
    haptic.success();
    // Redirect via URL parameter auth handler in app-store
    const authUrl = `/?auth_id=${user.id}&couple=${user.couple_id}&name=${encodeURIComponent(user.name)}&avatar=${encodeURIComponent(user.avatar || 'memoji_1')}`;
    window.location.href = authUrl;
  };

  const startTelegramLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    haptic.medium();

    try {
      const res = await fetch('/api/auth/session', { method: 'POST' });
      const data = await res.json();

      if (data.success && data.token) {
        setTgSessionToken(data.token);
        setTgBotUrl(data.botUrl);
        setIsWaitingTg(true);

        // Open Telegram in new tab or app
        if (typeof window !== 'undefined') {
          window.open(data.botUrl, '_blank');
        }
      } else {
        // Fallback to plain bot link if session endpoint fails
        if (botUsername && typeof window !== 'undefined') {
          window.open(`https://t.me/${botUsername}?start=join`, '_blank');
        }
      }
    } catch (e) {
      setErrorMsg('Не удалось связаться с Telegram. Проверьте подключение.');
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="w-full max-w-md z-10 space-y-5">
        {/* App Branding */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] bg-gradient-to-tr from-primary to-rose-400 text-white shadow-xl shadow-primary/30 mx-auto mb-1">
            <Heart size={32} className="fill-current animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Мы Вместе</h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Общий сейф документов, хотелки и список дел для вашей пары
          </p>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-center"
          >
            {errorMsg}
          </motion.div>
        )}

        {/* ============================================================= */}
        {/* STATE: WAITING FOR TELEGRAM AUTHENTICATION                     */}
        {/* ============================================================= */}
        {isWaitingTg ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ios-card p-6 border border-border shadow-ios text-center space-y-4"
          >
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#2AABEE]/20 animate-ping" />
              <div className="w-14 h-14 rounded-2xl bg-[#2AABEE] text-white flex items-center justify-center shadow-lg shadow-[#2AABEE]/30 relative z-10">
                <Send size={26} className="fill-current -rotate-12" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">
                Ожидаем подтверждения в Telegram...
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Откройте нашего бота в Telegram и нажмите кнопку <b>«Запустить» (/start)</b>. Вход на этом экране выполнится автоматически!
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-secondary/70 border border-border/60 flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <Loader2 size={15} className="animate-spin text-primary" />
              <span>Слушаем ответ от Telegram...</span>
            </div>

            <div className="space-y-2 pt-1">
              {tgBotUrl && (
                <a
                  href={tgBotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-[#2AABEE] text-white font-bold text-xs shadow-md hover:opacity-90 transition-all flex items-center justify-center space-x-1.5 ios-press block text-center"
                >
                  <Send size={14} className="inline mr-1" />
                  <span>Открыть Telegram-бота повторно</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  setIsWaitingTg(false);
                }}
                className="w-full py-2.5 rounded-2xl bg-secondary text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors ios-press"
              >
                Отмена
              </button>
            </div>
          </motion.div>
        ) : (
          /* ============================================================= */
          /* REGULAR LOGIN & PAIRING INTERFACE                             */
          /* ============================================================= */
          <div className="space-y-4">
            {/* Primary Action: Telegram 1-click login */}
            {botUsername && (
              <button
                type="button"
                onClick={startTelegramLogin}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-[22px] bg-gradient-to-r from-[#2AABEE] to-[#229ED9] text-white font-bold text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2.5 ios-press disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={17} className="fill-current -rotate-12" />
                    <span>Войти через Telegram (в 1 клик)</span>
                  </>
                )}
              </button>
            )}

            {/* Divider */}
            <div className="flex items-center space-x-3 px-2">
              <div className="flex-1 h-px bg-border/80" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                или по коду пары
              </span>
              <div className="flex-1 h-px bg-border/80" />
            </div>

            {/* 2-Option Segmented Control */}
            <div className="flex bg-secondary p-1 rounded-full border border-border">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setMode('join');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                  mode === 'join'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                У меня есть код
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setMode('create');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                  mode === 'create'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Создать новую пару
              </button>
            </div>

            {/* Mode 1: Join Existing Couple */}
            {mode === 'join' && (
              <motion.form
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleJoin}
                className="ios-card p-5 border border-border shadow-ios space-y-4"
              >
                {code && (
                  <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-center">
                    <span className="text-xs font-bold text-primary">
                      ❤️ Вы подключаетесь к паре: {code}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Код пары от половинки
                  </label>
                  <input
                    type="text"
                    placeholder="Например: CP-3832 или CP-XXXX-XXXX"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('auth_id=')) {
                        if (typeof window !== 'undefined') window.location.href = val;
                        return;
                      }
                      setCode(val.toUpperCase());
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border text-foreground font-mono text-center tracking-widest text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
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

                {/* Avatar selector with AvatarImage */}
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
                        <AvatarImage src={av.url} alt={av.name} fallbackSrc="/avatars/memoji_1.png" />
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
                      <span>Войти в пару</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* Mode 2: Create New Couple */}
            {mode === 'create' && (
              <motion.form
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleCreate}
                className="ios-card p-5 border border-border shadow-ios space-y-4"
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

                {/* Avatar selector with AvatarImage */}
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
                        <AvatarImage src={av.url} alt={av.name} fallbackSrc="/avatars/memoji_1.png" />
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  После входа мы сгенерируем код пары, и вы сможете пригласить партнера в 1 клик через Telegram прямо с главного экрана.
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
          </div>
        )}
      </div>
    </div>
  );
};
