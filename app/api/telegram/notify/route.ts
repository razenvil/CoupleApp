import { NextRequest, NextResponse } from 'next/server';
import { partnerChatLinks } from '@/lib/telegram-bot';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, senderName, itemTitle, recipientChatId } = body;

    // Determine target chat ID: direct or mapped
    let targetChatId = recipientChatId;

    if (!targetChatId) {
      // Find chat link from registered links
      partnerChatLinks.forEach((chatId) => {
        if (!targetChatId) targetChatId = chatId;
      });
    }

    // Format notification text based on action
    let text = '';
    switch (action) {
      case 'task_created':
        text = `📋 <b>${senderName}</b> добавил(а) новую задачу:\n«<b>${itemTitle}</b>»`;
        break;
      case 'task_completed':
        text = `✅ <b>${senderName}</b> выполнил(а) задачу:\n«<b>${itemTitle}</b>» 🎉`;
        break;
      case 'wish_added':
        text = `🎁 <b>${senderName}</b> добавил(а) новую хотелку:\n«<b>${itemTitle}</b>» ✨`;
        break;
      case 'doc_added':
        text = `🛡️ <b>${senderName}</b> сохранил(а) новый документ:\n«<b>${itemTitle}</b>»`;
        break;
      default:
        text = `🔔 Новое обновление от <b>${senderName}</b>:\n«<b>${itemTitle}</b>»`;
    }

    if (!BOT_TOKEN) {
      console.log(`[Telegram Notification Local Log] ${text}`);
      return NextResponse.json({ ok: true, mocked: true, message: text });
    }

    if (!targetChatId) {
      console.log(`[Telegram Notification Warning] No recipient chat ID found, skipping delivery.`);
      return NextResponse.json({ ok: true, delivered: false, reason: 'no_recipient' });
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📱 Открыть в «Мы Вместе»',
                web_app: { url: APP_URL },
              },
            ],
          ],
        },
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Failed to dispatch notification:', error);
    return NextResponse.json({ ok: false, error: 'Internal notification error' }, { status: 500 });
  }
}
