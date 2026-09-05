import { NextResponse } from 'next/server';

let cachedBotUsername: string | null = null;

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({
      username: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'our_couple_bot',
    });
  }

  if (cachedBotUsername) {
    return NextResponse.json({ username: cachedBotUsername });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (data.ok && data.result?.username) {
      cachedBotUsername = data.result.username;
      return NextResponse.json({ username: cachedBotUsername });
    }
  } catch (e) {
    console.warn('Failed to fetch bot username:', e);
  }

  return NextResponse.json({
    username: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'our_couple_bot',
  });
}
