import { Controller, Get, Post, Headers, UnauthorizedException } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
  import { PrismaService } from './prisma/prisma.service';

  @ApiTags('Health')
  @Controller()
  export class AppController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @ApiOperation({ summary: 'Get welcome message' })
    @ApiResponse({ status: 200, description: 'Returns a welcome message' })
    getHello(): { message: string } {
      return { message: 'Welcome to another test PMO API' };
    }

    @Get('health')
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({ status: 200, description: 'Returns health status' })
    getHealth(): { status: string; timestamp: string } {
      return {
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    }

    /**
     * Platform -> app call used by hot migration. There is no logged-in user on
     * this path, so it authenticates with the shared INTERNAL_API_TOKEN instead
     * of AuthGuard. It previously had no authentication at all, which let anyone
     * on the network cycle the database connection pool.
     */
    @Post('internal/refresh-prisma')
    @ApiExcludeEndpoint()
    async refreshPrisma(
      @Headers('x-soul-internal-token') token?: string,
    ): Promise<{ success: boolean; message: string }> {
      const expected = process.env.INTERNAL_API_TOKEN;
      if (!expected || token !== expected) {
        throw new UnauthorizedException('Invalid internal token');
      }
      try {
        await this.prisma.$disconnect();
        await this.prisma.$connect();
        return { success: true, message: 'Prisma client reconnected successfully' };
      } catch (error) {
        return { success: false, message: 'Failed to refresh Prisma client: ' + error.message };
      }
    }
  }
  