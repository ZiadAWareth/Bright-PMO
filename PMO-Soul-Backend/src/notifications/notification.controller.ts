import { Controller, Get, Patch, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A user's own notification inbox.
 *
 * Deliberately NOT permission-matrix guarded: every authenticated user may read
 * and dismiss THEIR OWN notifications, and every query is scoped by the
 * authenticated userId so one user can never read another's.
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "List the authenticated user's notifications" })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Number(limit) > 0 ? Number(limit) : 50, 200);
    return this.prisma.notification.findMany({
      where: {
        userId: String(req.userId),
        ...(unreadOnly === 'true' ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of unread notifications' })
  async unreadCount(@Request() req: any) {
    const count = await this.prisma.notification.count({
      where: { userId: String(req.userId), isRead: false },
    });
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markRead(@Request() req: any, @Param('id') id: string) {
    // Scoped by userId in the WHERE clause, so marking another user's
    // notification read is not merely forbidden — it matches nothing.
    const result = await this.prisma.notification.updateMany({
      where: { id, userId: String(req.userId) },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  async markAllRead(@Request() req: any) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: String(req.userId), isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }
}
