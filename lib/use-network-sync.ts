'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingTaskMutations, processTaskQueue } from './offline-sync';

export interface NetworkSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncNow: () => void;
}

export function useNetworkSync(): NetworkSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    setPendingCount(getPendingTaskMutations().length);

    const handleOnline = () => {
      setIsOnline(true);
      processTaskQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChanged = (e: any) => {
      setPendingCount(e.detail !== undefined ? e.detail : getPendingTaskMutations().length);
    };

    const handleSyncStatus = (e: any) => {
      if (e.detail?.isSyncing !== undefined) {
        setIsSyncing(e.detail.isSyncing);
      }
      if (e.detail?.remaining !== undefined) {
        setPendingCount(e.detail.remaining);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('couple_sync_queue_changed', handleQueueChanged);
    window.addEventListener('couple_sync_status_changed', handleSyncStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('couple_sync_queue_changed', handleQueueChanged);
      window.removeEventListener('couple_sync_status_changed', handleSyncStatus);
    };
  }, []);

  const syncNow = useCallback(() => {
    if (navigator.onLine) {
      processTaskQueue();
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncNow,
  };
}
