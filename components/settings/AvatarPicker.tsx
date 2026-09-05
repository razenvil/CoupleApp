'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { PRESET_AVATARS } from '@/lib/avatars';
import { AvatarImage } from '@/components/common/AvatarImage';
import { Check, Sparkles } from 'lucide-react';
import { haptic } from '@/lib/telegram';

export const AvatarPicker: React.FC = () => {
  const { couple, updateUserProfile } = useAppStore();

  const handleSelect = (userId: string, avatarId: string) => {
    haptic.selection();
    updateUserProfile(userId, { avatar: avatarId });
  };

  const boyAvatars = PRESET_AVATARS.filter((a) => a.category === 'boys');
  const girlAvatars = PRESET_AVATARS.filter((a) => a.category === 'girls');

  return (
    <div className="bg-card text-card-foreground rounded-ios-card p-4 border border-border shadow-ios space-y-5">
      <div className="flex items-center space-x-2">
        <Sparkles size={18} className="text-primary" />
        <div>
          <h4 className="text-sm font-bold tracking-tight">3D Memoji Аватарки Apple</h4>
          <p className="text-[11px] text-muted-foreground">
            Оригинальные 3D персонажи Memoji в высоком разрешении
          </p>
        </div>
      </div>

      {/* Partner A */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Аватар для <strong className="text-foreground">{couple.partnerA.name}</strong>:
          </span>
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/40 bg-secondary shrink-0 shadow-sm">
            <AvatarImage
              src={couple.partnerA.avatar}
              alt={couple.partnerA.name}
              className="w-full h-full object-cover"
              fallbackSrc="/avatars/memoji_1.png"
            />
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2.5">
          {boyAvatars.map((avatar) => {
            const isSelected = couple.partnerA.avatar === avatar.id;
            return (
              <button
                key={avatar.id}
                onClick={() => handleSelect(couple.partnerA.id, avatar.id)}
                className={`relative rounded-full aspect-square overflow-hidden border-2 transition-all ios-tap-scale p-0.5 bg-secondary/50 ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/40 scale-105 shadow-md bg-primary-light/40'
                    : 'border-border/60 hover:border-primary/50'
                }`}
                title={avatar.name}
              >
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="w-full h-full object-cover rounded-full"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/25 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Partner B */}
      <div className="pt-3 border-t border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Аватар для <strong className="text-foreground">{couple.partnerB.name}</strong>:
          </span>
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/40 bg-secondary shrink-0 shadow-sm">
            <AvatarImage
              src={couple.partnerB.avatar}
              alt={couple.partnerB.name}
              className="w-full h-full object-cover"
              fallbackSrc="/avatars/memoji_2.png"
            />
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2.5">
          {girlAvatars.map((avatar) => {
            const isSelected = couple.partnerB.avatar === avatar.id;
            return (
              <button
                key={avatar.id}
                onClick={() => handleSelect(couple.partnerB.id, avatar.id)}
                className={`relative rounded-full aspect-square overflow-hidden border-2 transition-all ios-tap-scale p-0.5 bg-secondary/50 ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/40 scale-105 shadow-md bg-primary-light/40'
                    : 'border-border/60 hover:border-primary/50'
                }`}
                title={avatar.name}
              >
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="w-full h-full object-cover rounded-full"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/25 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
