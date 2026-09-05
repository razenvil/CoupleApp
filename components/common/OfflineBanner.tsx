'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkSync } from '@/lib/use-network-sync';

export const OfflineBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount } = useNetworkSync();
  const [showSyncingNotice, setShowSyncingNotice] = useState<boolean>(false);
  const [showSyncedNotice, setShowSyncedNotice] = useState<boolean>(false);
  const [prevPending, setPrevPending] = useState<number>(0);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  // Track offline status so we only celebrate sync after truly being offline
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    }
  }, [isOnline]);

  // Debounce the "Syncing..." banner by 1.2s so fast normal mutations don't flash in the UI
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOnline && (isSyncing || pendingCount > 0)) {
      timer = setTimeout(() => {
        setShowSyncingNotice(true);
      }, 1200);
    } else {
      setShowSyncingNotice(false);
    }
    return () => clearTimeout(timer);
  }, [isOnline, isSyncing, pendingCount]);

  // Only show "Синхронизировано" if we were offline or if the sync notice was actually shown
  useEffect(() => {
    if (isOnline && prevPending > 0 && pendingCount === 0 && (wasOffline || showSyncingNotice)) {
      setShowSyncedNotice(true);
      setWasOffline(false);
      const timer = setTimeout(() => {
        setShowSyncedNotice(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    setPrevPending(pendingCount);
  }, [pendingCount, isOnline, prevPending, wasOffline, showSyncingNotice]);

  const shouldShow = !isOnline || showSyncingNotice || showSyncedNotice;
  if (!shouldShow) {
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
              : showSyncingNotice
              ? 'bg-blue-600/90 text-white border-blue-400/50'
              : 'bg-emerald-600/90 text-white border-emerald-400/50'
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff size={14} className="shrink-0" />
              <span>Оффлайн-режим • Сейф и задачи сохранены</span>
            </>
          ) : showSyncingNotice ? (
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
