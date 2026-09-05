/**
 * Telegram Bot API helper utilities
 */

export interface NotificationPayload {
  coupleId?: string;
  senderId?: string;
  recipientChatId?: number | string;
  senderChatId?: number | string;
  senderName: string;
  action: 'task_created' | 'task_updated' | 'task_completed' | 'wish_added' | 'doc_added' | 'match_date' | 'grocery_ping';
  itemTitle: string;
  details?: string;
}

// In-memory registry of verified users, chat links, and pending couple invitations
export const verifiedUsers = new Map<number, { phone: string; name: string; username?: string; verifiedAt: string }>();
export const partnerChatLinks = new Map<string, number>(); // userId -> chatId
export const pendingInvites = new Map<string, string>(); // userId or chatId -> coupleCode

/**
 * Sends an asynchronous notification request to our Next.js backend endpoint
 */
export async function sendPartnerNotification(payload: NotificationPayload) {
  try {
    // If senderChatId not provided, grab it from Telegram WebApp
    if (!payload.senderChatId && typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      payload.senderChatId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }

    // If senderId not provided, try reading from localStorage
    if (!payload.senderId && typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('couple_app_current_user');
      if (savedUser) payload.senderId = savedUser;
    }

    await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (err) {
    // Non-blocking: fail silently on client side so UI is not interrupted
    console.warn('Telegram notification dispatch error:', err);
  }
}

let cachedBotUsername: string | null = null;

export async function getTelegramBotUsername(): Promise<string> {
  if (cachedBotUsername) return cachedBotUsername;

  if (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) {
    cachedBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    return cachedBotUsername;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return 'our_couple_bot';

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (data.ok && data.result?.username) {
      const uname = String(data.result.username);
      cachedBotUsername = uname;
      return uname;
    }
  } catch (e) {
    console.warn('Failed to fetch bot username:', e);
  }

  return 'our_couple_bot';
}


