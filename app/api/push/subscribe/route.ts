import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { globalPushSubscriptions } from '@/lib/web-push-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, coupleId, subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ ok: false, error: 'Invalid subscription' }, { status: 400 });
    }

    // 1. In-memory storage for immediate reliability
    if (coupleId) {
      const existing = globalPushSubscriptions.get(coupleId) || [];
      const filtered = existing.filter((item) => item.subscription.endpoint !== subscription.endpoint);
      filtered.push({ userId, coupleId, subscription });
      globalPushSubscriptions.set(coupleId, filtered);
    }

    // 2. Persist in Supabase if configured
    if (supabase) {
      try {
        // Try web_push_subscriptions table
        await supabase.from('web_push_subscriptions').upsert(
          {
            endpoint: subscription.endpoint,
            user_id: userId,
            couple_id: coupleId,
            subscription: subscription,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        );
      } catch (err) {
        // If table doesn't exist, try saving to profiles table as fallback
        try {
          await supabase
            .from('profiles')
            .update({ push_subscription: subscription })
            .eq('id', userId);
        } catch (subErr) {
          console.warn('Could not persist push subscription to Supabase:', subErr);
        }
      }
    }

    return NextResponse.json({ ok: true, message: 'Subscription saved' });
  } catch (error: any) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, coupleId } = body;

    if (coupleId && globalPushSubscriptions.has(coupleId)) {
      const current = globalPushSubscriptions.get(coupleId) || [];
      globalPushSubscriptions.set(
        coupleId,
        current.filter((item) => item.subscription.endpoint !== endpoint)
      );
    }

    if (supabase && endpoint) {
      await supabase.from('web_push_subscriptions').delete().eq('endpoint', endpoint);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
