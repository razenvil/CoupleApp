/**
 * Telegram Bot API helper utilities
 */

export interface NotificationPayload {
  recipientChatId?: number | string;
  senderChatId?: number | string;
  senderName: string;
  action: 'task_created' | 'task_updated' | 'task_completed' | 'wish_added' | 'doc_added' | 'match_date';
  itemTitle: string;
  details?: string;
}

// In-memory registry of verified users and chat links
export const verifiedUsers = new Map<number, { phone: string; name: string; username?: string; verifiedAt: string }>();
export const partnerChatLinks = new Map<string, number>(); // userId -> chatId

/**
 * Sends an asynchronous notification request to our Next.js backend endpoint
 */
export async function sendPartnerNotification(payload: NotificationPayload) {
  try {
    // If senderChatId not provided, grab it from Telegram WebApp
    if (!payload.senderChatId && typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      payload.senderChatId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }

    await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Non-blocking: fail silently on client side so UI is not interrupted
    console.warn('Telegram notification dispatch error:', err);
  }
}
