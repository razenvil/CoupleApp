'use client';

import React from 'react';
import { ArrowLeftRight, UserCheck } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { getAvatarUrl } from '@/lib/avatars';
import { haptic } from '@/lib/telegram';

export const DemoSwitcher: React.FC = () => {
  const { currentUser, partnerUser, switchUser } = useAppStore();

  const handleToggle = () => {
    haptic.medium();
    switchUser(partnerUser.id);
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-2 pb-1 flex justify-end">
      <button
        onClick={handleToggle}
        className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border text-xs font-medium text-foreground ios-tap-scale shadow-sm transition-all"
        title="Нажмите, чтобы переключить пользователя и проверить работу приложения глазами партнера"
      >
        <span className="text-muted-foreground flex items-center gap-1">
          <UserCheck size={13} className="text-primary" />
          Вы:
        </span>
        <img
          src={getAvatarUrl(currentUser.avatar)}
          alt={currentUser.name}
          className="w-5 h-5 rounded-full object-cover bg-secondary"
        />
        <span className="font-semibold text-primary">{currentUser.name}</span>
        <ArrowLeftRight size={12} className="text-muted-foreground" />
        <span className="text-muted-foreground hover:text-foreground">
          Переключить на {partnerUser.name}
        </span>
      </button>
    </div>
  );
};
