import { NextRequest, NextResponse } from 'next/server';

import { verifiedUsers, partnerChatLinks } from '@/lib/telegram-bot';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

      // Send success message with WebApp launch button and remove request keyboard
      await sendTelegramMessage(
        chatId,
        `✅ <b>Вход подтвержден!</b>\n\nНомер <code>${phone}</code> успешно верифицирован.\nТеперь вам открыт доступ к Сейфу документов, Хотелкам и Задачам в приложении пары.`,
        {
          remove_keyboard: true,
          inline_keyboard: [
            [
              {
                text: '📱 Открыть «Мы Вместе»',
                web_app: { url: APP_URL },
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
        await sendTelegramMessage(
          chatId,
          `👋 Привет, <b>${fromUser.first_name}</b>!\n\nДобро пожаловать в <b>«Мы Вместе»</b> — приватное пространство для вашей пары.\n\n🔒 <b>Безопасный вход:</b>\nЧтобы никто посторонний не получил доступ к вашим документам и билетам, подтвердите вход через номер телефона:`,
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

      // Already verified -> send launch button
      await sendTelegramMessage(
        chatId,
        `❤️ С возвращением, <b>${fromUser.first_name}</b>!\n\nНажмите кнопку ниже, чтобы открыть приложение пары:`,
        {
          inline_keyboard: [
            [
              {
                text: '📱 Открыть «Мы Вместе»',
                web_app: { url: APP_URL },
              },
            ],
          ],
        }
      );
      return NextResponse.json({ ok: true });
    }

    // Default reply for any other text
    await sendTelegramMessage(
      chatId,
      `❤️ Приложение для вашей пары готово к работе! Нажмите кнопку ниже:`,
      {
        inline_keyboard: [
          [
            {
              text: '📱 Открыть «Мы Вместе»',
              web_app: { url: APP_URL },
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
