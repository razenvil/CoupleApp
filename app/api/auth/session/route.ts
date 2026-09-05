import { NextRequest, NextResponse } from 'next/server';
import { createAuthSession, getAuthSession } from '@/lib/auth-session';
import { getTelegramBotUsername } from '@/lib/telegram-bot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = createAuthSession();
    const botUsername = await getTelegramBotUsername();
    const botUrl = `https://t.me/${botUsername}?start=${session.token}`;

    return NextResponse.json({
      success: true,
      token: session.token,
      botUsername,
      botUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    const session = getAuthSession(token);
    if (!session) {
      return NextResponse.json({ success: false, status: 'expired' });
    }

    return NextResponse.json({
      success: true,
      status: session.status,
      user: session.user || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
