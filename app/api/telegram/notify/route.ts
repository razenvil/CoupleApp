import { NextRequest, NextResponse } from 'next/server';
import { partnerChatLinks } from '@/lib/telegram-bot';
import { supabase } from '@/lib/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://couple-app-phi-ruddy.vercel.app';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, senderName, itemTitle, recipientChatId, senderChatId, coupleId } = body;

    let targetChatId = recipientChatId;

    // 1. Try resolving partner from Supabase profiles if possible
    if (!targetChatId && supabase && senderChatId) {
      try {
        let query = supabase
          .from('profiles')
          .select('telegram_id')
          .neq('telegram_id', Number(senderChatId))
          .not('telegram_id', 'is', null);

        if (coupleId) {
          query = query.eq('couple_id', coupleId);
        }

        const { data: partnerProfile } = await query.limit(1).maybeSingle();

        if (partnerProfile?.telegram_id) {
          targetChatId = partnerProfile.telegram_id;
        }
      } catch (dbErr) {
        console.warn('[Notify Route] Supabase partner lookup error:', dbErr);
      }
    }

    // 2. Fallback to in-memory partnerChatLinks
    if (!targetChatId) {
      partnerChatLinks.forEach((chatId) => {
        if (!targetChatId && chatId !== Number(senderChatId)) {
          targetChatId = chatId;
        }
      });
    }

    // 3. If still no partner found, fallback to sending to sender (so user sees bot notification works!)
    const isSelfTest = !targetChatId && Boolean(senderChatId);
    if (!targetChatId && senderChatId) {
      targetChatId = senderChatId;
    }

    // Format notification text based on action
    let text = '';
    const prefix = isSelfTest ? '🔔 [Тест для вас / Партнёр ещё не вошёл]\n' : '';

    switch (action) {
      case 'task_created':
        text = `${prefix}📋 <b>${senderName}</b> добавил(а) задачу:\n«<b>${itemTitle}</b>»`;
        break;
      case 'task_updated':
        text = `${prefix}✏️ <b>${senderName}</b> обновил(а) задачу:\n«<b>${itemTitle}</b>»`;
        break;
      case 'task_completed':
        text = `${prefix}✅ <b>${senderName}</b> выполнил(а) задачу:\n«<b>${itemTitle}</b>» 🎉`;
        break;
      case 'wish_added':
        text = `${prefix}🎁 <b>${senderName}</b> добавил(а) в вишлист:\n«<b>${itemTitle}</b>» ✨`;
        break;
      case 'doc_added':
        text = `${prefix}🛡️ <b>${senderName}</b> сохранил(а) документ:\n«<b>${itemTitle}</b>»`;
        break;
      default:
        text = `${prefix}🔔 Обновление от <b>${senderName}</b>:\n«<b>${itemTitle}</b>»`;
    }

    if (!BOT_TOKEN) {
      console.log(`[Telegram Notification Local Log] ${text}`);
      return NextResponse.json({ ok: true, mocked: true, message: text });
    }

    if (!targetChatId) {
      console.log(`[Telegram Notification Warning] No target chat ID found, skipping delivery.`);
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
    return NextResponse.json({ ok: true, delivered: true, data });
  } catch (error) {
    console.error('Failed to dispatch notification:', error);
    return NextResponse.json({ ok: false, error: 'Internal notification error' }, { status: 500 });
  }
}
