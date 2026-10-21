import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HandoffCodeStore } from './handoff-codes';
import type { HandoffUser } from './handoff-codes';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { hashBuilderKey, newBuilderKey } from './builder-keys';

/**
 * The builder handoff.
 *
 * Thin: every rule lives in HandoffCodeStore, which is a plain module and is therefore testable.
 */
@Injectable()
export class FrontendDesignService {
  private readonly store = new HandoffCodeStore();

  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}

  /** A builder key for the person who opened the builder. Null when the hand-off carried no user. */
  async issueBuilderKey(user: Partial<HandoffUser> | undefined): Promise<string | null> {
    const userId = Number(user && user.id);
    const email = String((user && user.email) || '').trim();
    if (!Number.isFinite(userId) || !email) return null;
    const key = newBuilderKey();
    await (this.prisma as any).builderKey.create({ data: { userId, email, keyHash: hashBuilderKey(key) } });
    return key;
  }

  /** A key → a 10-minute builder token. One answer for unknown and revoked keys. */
  async exchangeBuilderKey(key: string): Promise<{ accessToken: string; expiresIn: number }> {
    const keyHash = hashBuilderKey(key);
    const row = keyHash ? await (this.prisma as any).builderKey.findUnique({ where: { keyHash } }) : null;
    if (!row || row.revokedAt) throw new UnauthorizedException('This builder connection is not valid. Open the builder again from the app.');
    await (this.prisma as any).builderKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
    return { accessToken: await this.auth.builderAccessToken(row.email), expiresIn: 600 };
  }

  /** The builder connections a person made (an administrator sees everyone's). Never the key. */
  listBuilderKeys(userId: number, everyone: boolean) {
    return (this.prisma as any).builderKey.findMany({
      where: everyone ? { revokedAt: null } : { userId, revokedAt: null },
      select: { id: true, userId: true, email: true, label: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeBuilderKey(id: string, userId: number, everyone: boolean) {
    const row = await (this.prisma as any).builderKey.findUnique({ where: { id: String(id) } });
    if (!row || (!everyone && row.userId !== userId)) throw new UnauthorizedException('No such builder connection.');
    await (this.prisma as any).builderKey.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }

  /**
   * The identity is taken here, while the authenticated request is still in hand. It cannot be
   * looked up at redeem time: that call carries no session, only the code.
   */
  issue(userId: string, token: string, user?: Partial<HandoffUser>) {
    return this.store.issue(userId, token, user);
  }

  redeem(code: string) {
    return this.store.redeem(code);
  }
}
