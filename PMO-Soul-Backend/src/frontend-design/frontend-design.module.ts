import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FrontendDesignController } from './frontend-design.controller';
import { FrontendDesignService } from './frontend-design.service';

@Module({
  // AuthModule: the builder token is minted by AuthService, with the same payload as a sign-in.
  imports: [PrismaModule, AuthModule],
  controllers: [FrontendDesignController],
  providers: [FrontendDesignService],
})
export class FrontendDesignModule {}
