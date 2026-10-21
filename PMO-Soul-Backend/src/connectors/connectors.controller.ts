import { Body, Controller, Delete, ForbiddenException, Get, HttpException, HttpStatus, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { assertFeature } from '../guards/features';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConnectorError, connectorCatalog, deleteConnection, listConnections, saveConnection, testConnection,
} from './connector-runtime';

const STATUS: Record<string, number> = {
  NotEnabled: HttpStatus.NOT_FOUND, NotFound: HttpStatus.NOT_FOUND, NotInstalled: HttpStatus.SERVICE_UNAVAILABLE,
};

/**
 * The app's connections to outside systems. ADMIN ONLY (the same rule as the AI provider settings:
 * a platform admin, or whoever may change roles and permissions). No route ever returns a secret.
 */
@ApiTags('Connectors')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('connectors')
export class ConnectorsController {
  constructor(private readonly prisma: PrismaService) {}

  /** The role's "Connections" switch (src/guards/features.ts). */
  private assertAdmin(req: any) {
    assertFeature(req, 'connections');
  }

  private secret(): string {
    return process.env.JWT_SECRET || '';
  }

  private async answer<T>(work: () => Promise<T> | T): Promise<T> {
    try {
      return await work();
    } catch (err) {
      if (err instanceof ConnectorError) {
        throw new HttpException({ error: err.code, message: err.message }, STATUS[err.code] ?? HttpStatus.BAD_REQUEST);
      }
      throw err;
    }
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Enabled connectors: their actions and what a connection needs' })
  catalog(@Request() req: any) {
    this.assertAdmin(req);
    return connectorCatalog();
  }

  @Get('connections')
  @ApiOperation({ summary: "The app's connections (never their secrets)" })
  list(@Request() req: any) {
    this.assertAdmin(req);
    return this.answer(() => listConnections(this.prisma));
  }

  @Post('connections')
  @ApiOperation({ summary: 'Add a connection' })
  create(@Request() req: any, @Body() body: any) {
    this.assertAdmin(req);
    return this.answer(() => saveConnection(this.prisma, { ...(body ?? {}), id: undefined }, this.secret(), req?.user?.email));
  }

  @Patch('connections/:id')
  @ApiOperation({ summary: 'Change a connection (empty values keep what is saved)' })
  update(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    this.assertAdmin(req);
    return this.answer(() => saveConnection(this.prisma, { ...(body ?? {}), id }, this.secret(), req?.user?.email));
  }

  @Delete('connections/:id')
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    this.assertAdmin(req);
    return this.answer(() => deleteConnection(this.prisma, id));
  }

  @Post('connections/:id/test')
  @ApiOperation({ summary: "Check a connection with the connector's own test" })
  test(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    this.assertAdmin(req);
    return this.answer(() => testConnection(this.prisma, id, this.secret()));
  }
}
