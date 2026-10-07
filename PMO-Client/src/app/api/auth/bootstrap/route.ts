import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import {
  IDP_COOKIE,
  SESSION_HANDOFF_MAX_AGE,
  cookieBaseOptions,
  isUseIdpAuth,
} from '@/lib/idp-config';

/**
 * One-time: reads app JWT from httpOnly handoff cookie, returns it for localStorage mirroring.
 * Clears the handoff cookie. Only when USE_IDP_AUTH=true.
 */
export async function GET() {
  if (!isUseIdpAuth()) {
    return NextResponse.json({ error: 'IdP auth disabled' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const handoff = cookieStore.get(IDP_COOKIE.sessionHandoff)?.value;

  if (!handoff) {
    return NextResponse.json({ error: 'No session handoff' }, { status: 401 });
  }

  const payload = await verifyToken(handoff);
  if (!payload || typeof payload.userId !== 'number' || typeof payload.role !== 'string') {
    const res = NextResponse.json({ error: 'Invalid handoff token' }, { status: 401 });
    res.cookies.delete(IDP_COOKIE.sessionHandoff);
    return res;
  }

  const res = NextResponse.json({ token: handoff });
  res.cookies.delete(IDP_COOKIE.sessionHandoff);

  const cookieOpts = {
    ...cookieBaseOptions(),
    maxAge: SESSION_HANDOFF_MAX_AGE,
  };
  res.cookies.set('auth-token', handoff, cookieOpts);
  res.cookies.set('pmo-user-id', String(payload.userId), cookieOpts);

  return res;
}
