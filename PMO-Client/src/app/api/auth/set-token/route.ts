import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/auth/set-token
 * Sets auth-token (and pmo-user-id) cookie from a valid IdP token.
 * Used after client-side IdP refresh so the app cookie stays in sync.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const payload = await verifyToken(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { idp_user_id: payload.sub as string },
      select: { user_id: true },
    });
    const pmoUserId = user?.user_id?.toString();

    const res = NextResponse.json({ success: true });
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      ...(isProduction && process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
    };

    res.cookies.set('auth-token', token, cookieOptions);
    if (pmoUserId) res.cookies.set('pmo-user-id', pmoUserId, cookieOptions);

    await prisma.$disconnect();
    return res;
  } catch (e) {
    await prisma.$disconnect().catch(() => {});
    return NextResponse.json({ error: 'Failed to set token' }, { status: 500 });
  }
}
