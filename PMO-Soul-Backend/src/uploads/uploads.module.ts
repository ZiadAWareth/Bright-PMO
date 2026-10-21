import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { StorageService } from './storage.service';

/**
 * Attachment uploads: a tenant-scoped proxy over the central S3-compatible
 * bucket (upload / delete / serve). Exports StorageService so other modules
 * (e.g. a future cleanup job) can reach object storage without re-wiring it.
 */
@Module({
  controllers: [UploadsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class UploadsModule {}
