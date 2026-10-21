import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConnectorsController } from './connectors.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ConnectorsController],
})
export class ConnectorsModule {}
