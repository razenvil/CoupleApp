'use client';

import React from 'react';
import { Palette, Moon, Sun, Layout, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { HeaderStyle, ThemeId } from '@/lib/types';
import { haptic } from '@/lib/telegram';

export const ThemePicker: React.FC = () => {
  const { theme, setTheme, headerStyle, setHeaderStyle, isDarkMode, toggleDarkMode } =
    useAppStore();

  const themes: Array<{
    id: ThemeId;
    name: string;
    description: string;
    colors: string[];
  }> = [
    {
      id: 'rose-gold',
      name: 'Rose Gold',
      description: 'Романтичное розовое золото и мягкий коралл',
      colors: ['#e06d75', '#ff8591', '#fbebee'],
    },
    {
      id: 'apple-classic',
      name: 'Apple Classic',
      description: 'Строгий минимализм и культовый синий iOS',
      colors: ['#007aff', '#1c1c1e', '#e5f2ff'],
    },
    {
      id: 'cozy-pastel',
      name: 'Cozy Pastel',
      description: 'Уютная лавандовая и пастельная гамма',
      colors: ['#8b5cf6', '#ec4899', '#f5f3ff'],
    },
  ];

  return (
    <div className="space-y-4">
      {/* 3 Color Themes Selector */}
      <div className="bg-card text-card-foreground rounded-ios-card p-4 border border-border shadow-ios">
        <div className="flex items-center space-x-2 mb-3">
          <Palette size={18} className="text-primary" />
          <h4 className="text-sm font-bold tracking-tight">Тема оформления (iOS)</h4>
        </div>

        <div className="space-y-2.5">
          {themes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  haptic.selection();
                  setTheme(t.id);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-[16px] border text-left transition-all ios-tap-scale ${
                  isSelected
                    ? 'border-primary bg-primary-light/30 shadow-sm ring-1 ring-primary'
                    : 'border-border/70 hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-1.5 items-center">
                    {t.colors.map((c, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 rounded-full border border-background shadow-xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {t.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {t.description}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                    <Check size={14} strokeWidth={2.5} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dark / Light Mode Toggle */}
      <div className="bg-card text-card-foreground rounded-ios-card p-4 border border-border shadow-ios flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {isDarkMode ? (
            <Moon size={18} className="text-primary" />
          ) : (
            <Sun size={18} className="text-amber-500" />
          )}
          <div>
            <span className="text-xs font-bold text-foreground block">
              {isDarkMode ? 'Темная тема (OLED Black)' : 'Светлая тема'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isDarkMode ? 'Идеально для экрана iPhone ночью' : 'Классический светлый вид'}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            haptic.medium();
            toggleDarkMode();
          }}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            isDarkMode ? 'bg-primary' : 'bg-muted/40'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
              isDarkMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Header Style (Widget vs Compact) */}
      <div className="bg-card text-card-foreground rounded-ios-card p-4 border border-border shadow-ios">
        <div className="flex items-center space-x-2 mb-2">
          <Layout size={18} className="text-primary" />
          <h4 className="text-sm font-bold tracking-tight">Стиль верхней шапки</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Выберите подходящий размер виджета для главного экрана
        </p>

        <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-[16px] border border-border">
          {[
            { id: 'widget' as HeaderStyle, label: 'Виджет пары (счетчик)' },
            { id: 'compact' as HeaderStyle, label: 'Компактная шапка' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                haptic.selection();
                setHeaderStyle(item.id);
              }}
              className={`py-2 px-1 text-center rounded-[12px] text-xs font-semibold transition-all ${
                headerStyle === item.id
                  ? 'bg-card text-foreground shadow-sm text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
