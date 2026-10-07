import { NextResponse } from 'next/server';
import { IDP_COOKIE, isUseIdpAuth } from '@/lib/idp-config';

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out user
 *     description: Logs out the currently authenticated user
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
export async function POST() {
  const res = NextResponse.json({ message: 'Logged out successfully' });
  if (isUseIdpAuth()) {
    res.cookies.delete(IDP_COOKIE.sessionHandoff);
  }
  res.cookies.delete('auth-token');
  res.cookies.delete('pmo-user-id');
  return res;
}