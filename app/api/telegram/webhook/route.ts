import { NextRequest, NextResponse } from 'next/server';

import { verifiedUsers, partnerChatLinks, pendingInvites } from '@/lib/telegram-bot';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://couple-app-phi-ruddy.vercel.app';

function getWebAppUrl(user: any, coupleCode?: string | null): string {
  const params = new URLSearchParams();
  if (user?.id) params.set('auth_id', String(user.id));
  if (user?.first_name) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    params.set('name', fullName);
  }
  if (coupleCode && coupleCode.startsWith('CP-')) {
    params.set('couple', coupleCode);
  }
  const queryString = params.toString();
  return queryString ? `${APP_URL}/?${queryString}` : APP_URL;
}

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN) {
    console.log(`[Telegram Bot Mock] To ${chatId}: ${text}`);
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // Check for message
    const message = update.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const fromUser = message.from;
    const text = message.text || '';

    // Register user chat ID for notifications
    if (fromUser?.id) {
      partnerChatLinks.set(String(fromUser.id), chatId);
    }

    // Parse /start parameter (e.g. /start CP-1234 or /start CP_1234)
    let startCode: string | null = null;
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        let rawParam = parts[1].trim().toUpperCase();
        if (rawParam.startsWith('CP_')) {
          rawParam = rawParam.replace('CP_', 'CP-');
        } else if (rawParam.startsWith('CP') && !rawParam.startsWith('CP-')) {
          rawParam = `CP-${rawParam.slice(2)}`;
        }
        if (rawParam.startsWith('CP-')) {
          startCode = rawParam;
          if (fromUser?.id) pendingInvites.set(String(fromUser.id), rawParam);
          pendingInvites.set(String(chatId), rawParam);
        }
      }
    }

    const userCoupleCode =
      startCode ||
      (fromUser?.id ? pendingInvites.get(String(fromUser.id)) : null) ||
      pendingInvites.get(String(chatId)) ||
      null;

    // 1. User shared contact (Authorization via phone number)
    if (message.contact) {
      const contact = message.contact;

      // ANTI-SPOOFING CHECK:
      // Ensure the shared contact belongs to the sender (contact.user_id === fromUser.id)
      if (contact.user_id && contact.user_id !== fromUser.id) {
        await sendTelegramMessage(
          chatId,
          '⚠️ <b>Ошибка авторизации:</b>\nВы отправили чужой контакт. Пожалуйста, поделитесь своим собственным номером телефона для входа.'
        );
        return NextResponse.json({ ok: true });
      }

      // Save verified user
      const phone = contact.phone_number.startsWith('+')
        ? contact.phone_number
        : `+${contact.phone_number}`;

      verifiedUsers.set(fromUser.id, {
        phone,
        name: contact.first_name || fromUser.first_name,
        username: fromUser.username,
        verifiedAt: new Date().toISOString(),
      });

      // Try to associate with couple in Supabase if code exists
      if (fromUser?.id && userCoupleCode) {
        try {
          const { supabase } = await import('@/lib/supabase');
          if (supabase) {
            await supabase.from('profiles').upsert({
              id: String(fromUser.id),
              telegram_id: fromUser.id,
              name: contact.first_name || fromUser.first_name || 'Пользователь',
              username: fromUser.username || null,
              couple_id: userCoupleCode,
              role: 'partner_b',
            }, { onConflict: 'id' });
          }
        } catch (err) {
          console.warn('Webhook profile upsert error:', err);
        }
      }

      const launchUrl = getWebAppUrl(fromUser, userCoupleCode);

      // Send success message with WebApp launch button and remove request keyboard
      await sendTelegramMessage(
        chatId,
        `✅ <b>Вход подтвержден!</b>\n\nНомер <code>${phone}</code> успешно верифицирован.${
          userCoupleCode ? `\n❤️ Вы подключаетесь к паре: <b>${userCoupleCode}</b>` : ''
        }\nТеперь вам открыт доступ к Сейфу документов, Хотелкам и Задачам в приложении пары.`,
        {
          remove_keyboard: true,
          inline_keyboard: [
            [
              {
                text: '📱 Открыть «Мы Вместе»',
                web_app: { url: launchUrl },
              },
            ],
          ],
        }
      );
      return NextResponse.json({ ok: true });
    }

    // 2. Command /start
    if (text.startsWith('/start')) {
      const isVerified = verifiedUsers.has(fromUser.id);

      // If not yet verified by phone number -> request contact
      if (!isVerified) {
        const welcomeInviteText = userCoupleCode
          ? `❤️ Вас пригласили в общее пространство пары (код <b>${userCoupleCode}</b>).\n\n`
          : '';

        await sendTelegramMessage(
          chatId,
          `👋 Привет, <b>${fromUser.first_name}</b>!\n\n${welcomeInviteText}Добро пожаловать в <b>«Мы Вместе»</b> — приватное пространство для вашей пары.\n\n🔒 <b>Безопасный вход:</b>\nЧтобы никто посторонний не получил доступ к вашим документам и билетам, подтвердите вход через номер телефона:`,
          {
            keyboard: [
              [
                {
                  text: '📱 Подтвердить номер телефона',
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          }
        );
        return NextResponse.json({ ok: true });
      }

      // Already verified -> send launch button with user details and couple code
      const launchUrl = getWebAppUrl(fromUser, userCoupleCode);
      await sendTelegramMessage(
        chatId,
        `❤️ С возвращением, <b>${fromUser.first_name}</b>!${
          userCoupleCode ? `\nКод пары: <b>${userCoupleCode}</b>` : ''
        }\n\nНажмите кнопку ниже, чтобы открыть приложение пары:`,
        {
          inline_keyboard: [
            [
              {
                text: '📱 Открыть «Мы Вместе»',
                web_app: { url: launchUrl },
              },
            ],
          ],
        }
      );
      return NextResponse.json({ ok: true });
    }

    // 3. Command /logout or /reset (Failsafe remote reset of active device)
    if (text.startsWith('/logout') || text.startsWith('/reset')) {
      if (fromUser?.id) {
        try {
          const { supabase } = await import('@/lib/supabase');
          if (supabase) {
            await supabase
              .from('profiles')
              .update({ active_device_id: null })
              .eq('telegram_id', fromUser.id);
          }
        } catch (e) {
          console.warn('Telegram webhook /logout reset error:', e);
        }
      }

      const launchUrl = getWebAppUrl(fromUser, userCoupleCode);
      await sendTelegramMessage(
        chatId,
        `🚪 <b>Привязка устройства сброшена!</b>\n\nАктивная сессия PWA успешно завершена. Теперь вы можете войти в приложение с нового телефона без блокировки.`,
        {
          inline_keyboard: [
            [
              {
                text: '📱 Открыть «Мы Вместе»',
                web_app: { url: launchUrl },
              },
            ],
          ],
        }
      );
      return NextResponse.json({ ok: true });
    }

    // Default reply for any other text
    const defaultLaunchUrl = getWebAppUrl(fromUser, userCoupleCode);
    await sendTelegramMessage(
      chatId,
      `❤️ Приложение для вашей пары готово к работе! Нажмите кнопку ниже:`,
      {
        inline_keyboard: [
          [
            {
              text: '📱 Открыть «Мы Вместе»',
              web_app: { url: defaultLaunchUrl },
            },
          ],
        ],
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
