import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://couple-app-phi-ruddy.vercel.app';

// In-memory set to prevent duplicate automatic sends across server lifetime
const sentUserIds = new Set<number>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegramId, coupleId, userName, force = false } = body;

    const numTgId = Number(telegramId);
    if (!numTgId) {
      return NextResponse.json({ success: false, error: 'telegramId is required' }, { status: 400 });
    }

    // Check if already sent (unless explicitly requested via "force")
    if (!force && sentUserIds.has(numTgId)) {
      return NextResponse.json({ success: true, alreadySent: true });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
    }

    const cleanName = userName || 'Пользователь';
    const cleanCouple = coupleId || '';
    const pwaDirectUrl = `${APP_URL}/?auth_id=${numTgId}&couple=${cleanCouple}&name=${encodeURIComponent(cleanName)}`;

    const text = `✨ <b>Как установить «Мы Вместе» как приложение на телефон (PWA)?</b>\n\n` +
      `💡 <b>Что такое PWA?</b>\n` +
      `Это полноценное приложение, которое работает прямо с главного экрана вашего смартфона как отдельная программа (как из App Store / Google Play), но без скачивания из магазинов и без необходимости каждый раз заходить в Telegram!\n\n` +
      `🛒 <b>Пример из жизни:</b>\n` +
      `Вы стоите на кассе в супермаркете или нужно срочно посмотреть данные паспорта/СНИЛС в сейфе 🔒. Вы просто нажимаете на иконку «Мы Вместе» на экране «Домой» — и всё открывается моментально в один тап!\n\n` +
      `---\n\n` +
      `📲 <b>Как установить за 3 простых шага:</b>\n\n` +
      `1️⃣ <b>Нажмите кнопку «Установить на телефон»</b> внизу этого сообщения — откроется ваш браузер с вашим аккаунтом.\n\n` +
      `2️⃣ <b>Добавьте на домашний экран:</b>\n` +
      `• <b>На iPhone (Safari):</b>\n` +
      `  Нажмите кнопку <b>«Поделиться»</b> (квадратик со стрелочкой ⬆️ внизу экрана) ➔ выберите пункт <b>«На экран «Домой»»</b> ➕.\n` +
      `• <b>На Android (Chrome):</b>\n` +
      `  Нажмите <b>три точки ⋮</b> вверху справа ➔ выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b> ➕.\n\n` +
      `3️⃣ <b>Готово! 🎉</b>\n` +
      `На экране телефона появится иконка «Мы Вместе». Ваш профиль <b>${cleanName}</b> и пара <b>${cleanCouple}</b> подключатся автоматически!`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '📲 Установить приложение на телефон',
            url: pwaDirectUrl,
          },
        ],
      ],
    };

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: numTgId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      sentUserIds.add(numTgId);
      return NextResponse.json({ success: true, delivered: true });
    } else {
      return NextResponse.json({ success: false, error: data.description }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
