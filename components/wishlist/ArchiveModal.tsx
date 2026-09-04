'use client';

import React from 'react';
import { ModalDrawer } from '../common/ModalDrawer';
import { WishlistItem } from '@/lib/types';
import { Sparkles, Trash2, Calendar, Gift } from 'lucide-react';
import { haptic } from '@/lib/telegram';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedItems: WishlistItem[];
  onDeleteArchived: (id: string) => void;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  isOpen,
  onClose,
  archivedItems,
  onDeleteArchived,
}) => {
  return (
    <ModalDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Исполненные мечты ✨"
      subtitle="История подарков, которые вы подарили друг другу"
    >
      {archivedItems.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
          <Gift size={40} className="text-muted/60 mb-2" strokeWidth={1.3} />
          <p className="text-sm font-medium">Пока нет подаренных желаний</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
            Когда партнер подарит подарок и нажмет «Подарено!», он появится здесь на долгую память.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {archivedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-[16px] bg-secondary/60 border border-border"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                <div className="w-12 h-12 rounded-[12px] bg-card overflow-hidden shrink-0 border border-border flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sparkles size={20} className="text-primary" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-foreground truncate">
                    {item.title}
                  </h5>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    {item.price && (
                      <span className="font-semibold text-primary">
                        {item.price.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                    {item.giftedAt && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <Calendar size={10} />
                        {new Date(item.giftedAt).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-[10px] text-muted-foreground truncate italic mt-0.5">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm(`Удалить «${item.title}» из архива навсегда?`)) {
                    haptic.warning();
                    onDeleteArchived(item.id);
                  }
                }}
                className="p-2 text-muted-foreground hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"
                title="Удалить из архива"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalDrawer>
  );
};
