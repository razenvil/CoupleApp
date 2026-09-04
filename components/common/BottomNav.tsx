'use client';

import React from 'react';
import {
  CheckSquare,
  Gift,
  Shield,
  Heart,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/telegram';

export type TabType = 'tasks' | 'wishlist' | 'documents' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  tasksBadgeCount?: number;
  wishlistBadgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  tasksBadgeCount = 0,
  wishlistBadgeCount = 0,
}) => {
  const tabs = [
    {
      id: 'tasks' as TabType,
      label: 'Задачи',
      icon: CheckSquare,
      badge: tasksBadgeCount,
    },
    {
      id: 'wishlist' as TabType,
      label: 'Хотелки',
      icon: Gift,
      badge: wishlistBadgeCount,
    },
    {
      id: 'documents' as TabType,
      label: 'Сейф',
      icon: Shield,
    },
    {
      id: 'settings' as TabType,
      label: 'Пара',
      icon: Heart,
    },
  ];

  const handleTabClick = (tabId: TabType) => {
    if (tabId !== activeTab) {
      haptic.selection();
      onChangeTab(tabId);
    }
  };

  return (
    <nav className="fixed bottom-5 left-0 right-0 z-40 px-4 pointer-events-none">
      {/* Floating Island Glass Capsule */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="max-w-[340px] mx-auto h-[62px] px-3.5 rounded-[32px] ios-floating-glass flex items-center justify-around pointer-events-auto shadow-2xl"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex flex-col items-center justify-center w-14 h-full ios-press focus:outline-none"
            >
              <div className="relative">
                <motion.div
                  animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.4 : 1.6}
                    className={`transition-colors duration-200 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </motion.div>

                {/* Apple Style Micro Badge */}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 bg-primary text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>

              <span
                className={`text-[10px] mt-1 font-semibold tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </motion.div>
    </nav>
  );
};
