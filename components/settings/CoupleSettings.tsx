'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { Heart, Share2, Copy, Check, Lock, Calendar, Users, Smartphone } from 'lucide-react';
import { haptic } from '@/lib/telegram';

export const CoupleSettings: React.FC = () => {
  const {
    couple,
    currentUser,
    botUsername,
    updateCoupleInfo,
    updateUserProfile,
    lockDocuments,
    isDocumentsUnlocked,
    logout,
  } = useAppStore();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPwa, setCopiedPwa] = useState(false);
  const [partnerAName, setPartnerAName] = useState(couple?.partnerA?.name || '');
  const [partnerBName, setPartnerBName] = useState(couple?.partnerB?.name || '');
  const [startDate, setStartDate] = useState(couple?.startDate ? couple.startDate.split('T')[0] : '');

  const inviteCode = couple?.inviteCode || couple?.id || '';
  const inviteLink = botUsername
    ? `https://t.me/${botUsername}?start=${inviteCode}`
    : `https://t.me/our_couple_bot?start=${inviteCode}`;

  const copyText = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {}
  };

  const handleCopyInvite = async () => {
    await copyText(inviteLink);
    setCopiedLink(true);
    haptic.success();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPwaLink = async () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const pwaUrl = `${origin}/?auth_id=${encodeURIComponent(currentUser.id)}&name=${encodeURIComponent(
      currentUser.name
    )}&couple=${encodeURIComponent(inviteCode)}&avatar=${encodeURIComponent(currentUser.avatar)}`;

    await copyText(pwaUrl);
    setCopiedPwa(true);
    haptic.success();
    setTimeout(() => setCopiedPwa(false), 2500);
  };

  const handleSaveNames = () => {
    updateUserProfile(couple.partnerA.id, { name: partnerAName });
    updateUserProfile(couple.partnerB.id, { name: partnerBName });
    haptic.success();
  };

  const handleDateChange = (val: string) => {
    setStartDate(val);
    updateCoupleInfo({ startDate: new Date(val).toISOString() });
    haptic.light();
  };

  const handleLockVault = () => {
    lockDocuments();
    haptic.heavy();
    alert('Сейф документов успешно заблокирован!');
  };

  return (
    <div className="space-y-4">
      {/* Invite Partner Card */}
      <div className="bg-gradient-to-br from-primary/15 via-card to-card text-card-foreground rounded-ios-card p-4 border border-primary/20 shadow-ios">
        <div className="flex items-center space-x-2 mb-1.5">
          <Share2 size={18} className="text-primary" />
          <h4 className="text-sm font-bold tracking-tight">Пригласить партнера</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Отправьте код <b>{couple.inviteCode}</b> или ссылку своей второй половинке, чтобы подключиться к общему пространству.
        </p>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 px-3 py-2 rounded-[12px] bg-secondary border border-border text-xs text-foreground font-mono select-all focus:outline-none"
          />
          <button
            onClick={handleCopyInvite}
            className={`px-3.5 py-2 rounded-[12px] text-xs font-semibold flex items-center space-x-1 transition-all ios-tap-scale shadow-sm ${
              copiedLink
                ? 'bg-emerald-500 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary-hover'
            }`}
          >
            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedLink ? 'Скопировано!' : 'Копировать'}</span>
          </button>
        </div>
      </div>

      {/* PWA Home Screen Sync */}
      <div className="bg-card text-card-foreground rounded-ios-card p-4 border border-border shadow-ios space-y-2.5">
        <div className="flex items-center space-x-2">
          <Smartphone size={18} className="text-primary" />
          <h4 className="text-sm font-bold tracking-tight">Установить PWA на экран «Домой»</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Чтобы пользоваться приложением на iPhone/Android вне Telegram: скопируйте персональную ссылку, откройте в Safari/Chrome и нажмите «На экран Домой».
        </p>
        <button
          type="button"
          onClick={handleCopyPwaLink}
          className="w-full py-2.5 px-3 rounded-[12px] bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center justify-center space-x-2 ios-press"
        >
          {copiedPwa ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          <span>{copiedPwa ? 'Ссылка скопирована!' : 'Скопировать персональную ссылку для PWA'}</span>
        </button>
      </div>

      {/* Couple Profiles */}
      <div className="bg-card text-card-foreground rounded-ios-card p-4 border border-border shadow-ios space-y-3">
        <div className="flex items-center space-x-2">
          <Users size={18} className="text-primary" />
          <h4 className="text-sm font-bold tracking-tight">Имена пары</h4>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Партнер 1
            </label>
            <input
              type="text"
              value={partnerAName}
              onChange={(e) => setPartnerAName(e.target.value)}
              onBlur={handleSaveNames}
              className="w-full px-3 py-2 rounded-[12px] bg-secondary border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Партнер 2
            </label>
            <input
              type="text"
              value={partnerBName}
              onChange={(e) => setPartnerBName(e.target.value)}
              onBlur={handleSaveNames}
              className="w-full px-3 py-2 rounded-[12px] bg-secondary border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Start Date of Dating */}
        <div className="pt-2 border-t border-border/50">
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1 flex items-center gap-1">
            <Calendar size={13} className="text-primary" />
            <span>Дата начала отношений (для счетчика дней вместе):</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-[12px] bg-secondary border border-border text-xs font-medium text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Vault Security */}
      <div className="bg-card text-card-foreground rounded-ios-card p-4 border border-border shadow-ios flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Lock size={18} className="text-primary" />
          <div>
            <span className="text-xs font-bold text-foreground block">
              Безопасность сейфа
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isDocumentsUnlocked ? 'Сейф сейчас разблокирован' : 'Сейф защищен PIN-кодом'}
            </span>
          </div>
        </div>

        {isDocumentsUnlocked && (
          <button
            onClick={handleLockVault}
            className="px-3 py-1.5 rounded-[10px] bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border ios-tap-scale"
          >
            Заблокировать сейчас
          </button>
        )}
      </div>

      {/* Account logout */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            if (confirm('Вы действительно хотите выйти из аккаунта?')) {
              logout();
            }
          }}
          className="w-full py-2.5 rounded-[12px] text-destructive hover:bg-destructive/10 text-xs font-semibold border border-destructive/20 ios-press transition-colors text-center"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
};
