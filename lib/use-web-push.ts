'use client';

import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BD3NZvXXSP4uC3QZ0HyenKZ52Y_g2_oHDG1d_TTMlfV1x9iwBpxjNaq7zaLxbCzLABrhgjkazH9YS8HW_X4x_eM';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Register service worker if not already registered
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            setIsSubscribed(Boolean(sub));
          });
        })
        .catch((err) => {
          console.warn('Service Worker registration error:', err);
        });
    }
  }, []);

  const subscribe = useCallback(
    async (userId: string, coupleId: string): Promise<boolean> => {
      if (!isSupported) return false;

      try {
        setIsLoading(true);

        const perm = await Notification.requestPermission();
        setPermission(perm);

        if (perm !== 'granted') {
          setIsLoading(false);
          return false;
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }

        // Send to backend
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            coupleId,
            subscription: sub.toJSON(),
          }),
        });

        const data = await res.json();
        if (data.ok) {
          setIsSubscribed(true);
          setIsLoading(false);
          return true;
        }
      } catch (err) {
        console.error('Push subscribe error:', err);
      } finally {
        setIsLoading(false);
      }

      return false;
    },
    [isSupported]
  );

  const unsubscribe = useCallback(
    async (coupleId: string): Promise<boolean> => {
      if (!isSupported) return false;

      try {
        setIsLoading(true);
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();

          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint,
              coupleId,
            }),
          });
        }

        setIsSubscribed(false);
        setIsLoading(false);
        return true;
      } catch (err) {
        console.error('Push unsubscribe error:', err);
        setIsLoading(false);
        return false;
      }
    },
    [isSupported]
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
