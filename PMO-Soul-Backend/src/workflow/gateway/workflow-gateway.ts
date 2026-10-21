import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/**
 * Instantiated directly rather than injected: WorkflowGateway is provided by
 * several modules, and requiring each of them to import JwtModule just to
 * authenticate a socket would be easy to forget — and a forgotten import here
 * means an unauthenticated socket, which is exactly the failure this guards.
 */
const jwt = new JwtService({});

@WebSocketGateway({
  // A wildcard origin on an authenticated socket lets any page open a stream on
  // a logged-in user's behalf. Pin it in production via WS_CORS_ORIGIN.
  cors: { origin: process.env.WS_CORS_ORIGIN || '*', credentials: true },
  namespace: '/workflow',
})
export class WorkflowGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkflowGateway.name);

  afterInit() {
    this.logger.log('Workflow WebSocket gateway initialized');
  }

  /**
   * Authenticate the handshake and put the socket in its own rooms.
   *
   * Without this every connected socket — including an unauthenticated one —
   * received every broadcast, so tenant isolation ended at the database and was
   * lost at the transport. Rooms are what let the server address one recipient
   * instead of trusting each client to discard what is not theirs.
   */
  handleConnection(client: Socket) {
    const raw =
      client.handshake?.auth?.token ||
      String(client.handshake?.headers?.authorization || '').replace(/^Bearer /i, '') ||
      client.handshake?.query?.token;

    if (!raw) {
      this.logger.warn(`Socket ${client.id} rejected: no token`);
      client.disconnect(true);
      return;
    }

    try {
      const verified: any = jwt.verify(String(raw), { secret: process.env.JWT_SECRET });
      const payload = verified?.payload || verified;
      const userId = payload?.userId;
      if (userId == null) throw new Error('token carries no userId');

      const organizationId =
        payload?.organizationId != null ? Number(payload.organizationId) : undefined;

      client.data.userId = String(userId);
      client.data.organizationId = organizationId;
      client.join(`user:${userId}`);
      if (organizationId != null) client.join(`org:${organizationId}`);

      this.logger.debug(
        `Client connected: ${client.id} (user ${userId}, org ${organizationId ?? 'none'})`,
      );
    } catch (err: any) {
      this.logger.warn(`Socket ${client.id} rejected: ${err?.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Push to exactly one user, across whatever devices they have open.
   * Used for anything addressed to a person (notifications), so the payload
   * never reaches another user — or another tenant — in the first place.
   */
  pushToUser(userId: string | number, eventType: string, payload: any) {
    this.server
      .to(`user:${userId}`)
      .emit('workflow:update', { eventType, payload, timestamp: new Date().toISOString() });
  }

  /** Push to every socket belonging to one tenant. */
  pushToOrg(organizationId: number, eventType: string, payload: any) {
    this.server
      .to(`org:${organizationId}`)
      .emit('workflow:update', { eventType, payload, timestamp: new Date().toISOString() });
  }

  /**
   * Push a UI update to all connected clients.
   * Called by the action registry when a "pushUiUpdate" action executes.
   *
   * NOTE: still a cross-tenant broadcast. Sockets are authenticated now, so a
   * stranger cannot listen, but an authenticated user in tenant A still receives
   * workflow updates raised in tenant B. Anything addressed to a person or a
   * tenant must use pushToUser/pushToOrg instead.
   */
  pushUpdate(eventType: string, payload: any) {
    this.server.emit('workflow:update', { eventType, payload, timestamp: new Date().toISOString() });
  }

  /**
   * Push a notification to all connected clients.
   */
  pushNotification(message: string, variant: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.server.emit('workflow:notification', { message, variant, timestamp: new Date().toISOString() });
  }

  /**
   * Push a data refresh signal (tells the frontend to re-fetch a specific resource).
   */
  pushRefresh(entityName: string) {
    this.server.emit('workflow:refresh', { entityName, timestamp: new Date().toISOString() });
  }
}
