import webpush from 'web-push';

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BD3NZvXXSP4uC3QZ0HyenKZ52Y_g2_oHDG1d_TTMlfV1x9iwBpxjNaq7zaLxbCzLABrhgjkazH9YS8HW_X4x_eM';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'C7CmLklrYI_lify9SsaDtOnaHEVLKVv-af0OS2fBxCE';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:coupleapp@example.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.warn('Failed to configure webpush VAPID:', e);
}

// In-memory subscription storage fallback (coupleId -> array of subscriptions)
export const globalPushSubscriptions = new Map<string, { userId: string; coupleId: string; subscription: any }[]>();

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: any;
}

export async function sendWebPush(subscription: webpush.PushSubscription, payload: PushPayload) {
  try {
    const stringified = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon.svg',
      badge: payload.badge || '/icon.svg',
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
    });

    const result = await webpush.sendNotification(subscription, stringified);
    return { success: true, statusCode: result.statusCode };
  } catch (err: any) {
    console.warn('Web push send error:', err?.statusCode, err?.message);
    // 404 or 410 means subscription expired/unsubscribed
    return { success: false, error: err?.message, statusCode: err?.statusCode };
  }
}
