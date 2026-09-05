import { supabase } from './supabase';

export interface AuthSessionUser {
  id: string;
  telegram_id: number;
  name: string;
  avatar: string;
  couple_id: string;
  role: string;
}

export interface AuthSessionData {
  token: string;
  status: 'pending' | 'authorized' | 'expired';
  createdAt: number;
  user?: AuthSessionUser;
}

// Global in-memory cache preserved across module reloads in Node
const globalSessions = global as unknown as {
  __authSessions?: Map<string, AuthSessionData>;
};

if (!globalSessions.__authSessions) {
  globalSessions.__authSessions = new Map<string, AuthSessionData>();
}

const sessions = globalSessions.__authSessions;

export function createAuthSession(): AuthSessionData {
  const now = Date.now();
  // Cleanup sessions older than 10 minutes
  sessions.forEach((sess, key) => {
    if (now - sess.createdAt > 10 * 60 * 1000) {
      sessions.delete(key);
    }
  });

  const token = 'login_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).slice(-4);
  const session: AuthSessionData = {
    token,
    status: 'pending',
    createdAt: now,
  };
  sessions.set(token, session);
  return session;
}

export function getAuthSession(token: string): AuthSessionData | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > 10 * 60 * 1000) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export async function authorizeAuthSession(token: string, user: AuthSessionUser): Promise<boolean> {
  const session = getAuthSession(token);
  if (session) {
    session.status = 'authorized';
    session.user = user;
  } else {
    sessions.set(token, {
      token,
      status: 'authorized',
      createdAt: Date.now(),
      user,
    });
  }

  // Also broadcast via Supabase Realtime so client gets instant notification
  if (supabase) {
    try {
      const channel = supabase.channel(`auth_${token}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'authorized',
            payload: { token, user },
          });
        }
      });
    } catch (e) {
      console.warn('Failed to broadcast auth session:', e);
    }
  }

  return true;
}
