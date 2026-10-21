
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';
import { AuthSettingsService } from './auth-settings.service';

@Module({
  imports: [
    // JwtModule.register({
    //   secret: process.env.JWT_SECRET,
    //   signOptions: { expiresIn: '30d' }
    // }),
    PrismaModule,
    // The app's one mail sender, for invitations and one-time codes. MailModule imports Prisma and
    // nothing else, so this direction can never become a cycle.
    MailModule,
  ],
  providers: [AuthService, AuthSettingsService],
  controllers: [AuthController],
  // The builder-key exchange (src/frontend-design) mints its short token through AuthService.
  exports: [AuthService],
})
export class AuthModule {}
