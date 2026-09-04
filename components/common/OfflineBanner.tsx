'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkSync } from '@/lib/use-network-sync';

export const OfflineBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount } = useNetworkSync();
  const [showSyncedNotice, setShowSyncedNotice] = useState<boolean>(false);
  const [prevPending, setPrevPending] = useState<number>(0);

  // Detect when pending drops to 0 while online to show a brief green checkmark
  useEffect(() => {
    if (isOnline && prevPending > 0 && pendingCount === 0) {
      setShowSyncedNotice(true);
      const timer = setTimeout(() => {
        setShowSyncedNotice(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
    setPrevPending(pendingCount);
  }, [pendingCount, isOnline, prevPending]);

  if (isOnline && !isSyncing && pendingCount === 0 && !showSyncedNotice) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed top-2 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`pointer-events-auto px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md border text-xs font-semibold flex items-center space-x-2 ${
            !isOnline
              ? 'bg-amber-500/90 text-white border-amber-400/50'
              : isSyncing || pendingCount > 0
              ? 'bg-blue-600/90 text-white border-blue-400/50'
              : 'bg-emerald-600/90 text-white border-emerald-400/50'
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff size={14} className="shrink-0" />
              <span>Оффлайн-режим • Сейф и задачи сохранены</span>
            </>
          ) : isSyncing || pendingCount > 0 ? (
            <>
              <RefreshCw size={13} className="animate-spin shrink-0" />
              <span>
                Синхронизация {pendingCount > 0 ? `(${pendingCount})` : ''}...
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Синхронизировано</span>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
