import {
  Controller,
  Post,
  Delete,
  Get,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { getTenantContext } from '../organization-scope/tenant-context';
import { StorageService, StoredFile } from './storage.service';

/** Reject files larger than this (bytes). Attachments are documents, not media libraries. */
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Attachment uploads (PG-11, uploads arm). Every route is authenticated, and
 * file access is tenant-scoped: a caller can only read/delete files whose key
 * carries THEIR organization (platform admins bypass), and uploads are always
 * stamped with the caller's own org — never a client-supplied value — so a user
 * cannot write into, read, or delete another organisation's files.
 */
@UseGuards(AuthGuard)
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly storage: StorageService) {}

  private ensureConfigured() {
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException(
        'File uploads are not configured for this app (APP_STORAGE_* is unset).',
      );
    }
  }

  /** Throw unless the current principal may touch this key. */
  private assertCanAccess(key: string) {
    if (!key || !this.storage.belongsToThisApp(key)) {
      // Either empty, or a key from another app's prefix — never serve it.
      throw new ForbiddenException('You do not have access to this file.');
    }
    const ctx = getTenantContext();
    if (ctx?.isPlatformAdmin || ctx?.system) return;
    const keyOrg = this.storage.orgFromKey(key);
    const callerOrg = ctx?.organizationId == null ? null : Number(ctx.organizationId);
    if (keyOrg == null || callerOrg == null || keyOrg !== callerOrg) {
      throw new ForbiddenException('You do not have access to this file.');
    }
  }

  // ── Upload one file → returns its stored metadata (the client stores this
  //    object, or pushes it into an array for a multiple-file field). ──
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  async upload(@UploadedFile() file: Express.Multer.File): Promise<StoredFile> {
    this.ensureConfigured();
    if (!file) throw new BadRequestException('No file provided (field name "file").');

    // Stamp the CALLER's own organization into the key — never trust the client.
    const org = getTenantContext()?.organizationId ?? null;
    const key = this.storage.buildKey(
      org == null ? null : Number(org),
      file.mimetype,
      file.originalname,
    );

    try {
      await this.storage.upload(file.buffer, file.mimetype, key);
    } catch (err: any) {
      this.logger.error(`Upload failed for ${key}: ${err?.message ?? err}`);
      throw new ServiceUnavailableException('Could not store the file. Try again.');
    }

    return {
      key,
      url: this.storage.serveUrl(key),
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }

  // ── Delete a file by key (tenant-checked). ──
  @Delete()
  async remove(@Query('key') key: string): Promise<{ deleted: boolean }> {
    this.ensureConfigured();
    this.assertCanAccess(key);
    await this.storage.delete(key);
    return { deleted: true };
  }

  // ── Serve/stream a file by key (tenant-checked). The client fetches this with
  //    its authenticated API client (as a blob) for preview/download. ──
  @Get('file')
  async serve(@Query('key') key: string, @Res() res: Response): Promise<void> {
    this.ensureConfigured();
    this.assertCanAccess(key);

    let object: { body: any; contentType?: string };
    try {
      object = await this.storage.getObject(key);
    } catch (err: any) {
      throw new NotFoundException('File not found.');
    }

    res.setHeader('Content-Type', object.contentType || 'application/octet-stream');
    const filename = key.split('/').pop() || 'file';
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    const body: any = object.body;
    if (body && typeof body.pipe === 'function') {
      body.pipe(res);
    } else {
      // Fallback for runtimes where the SDK returns a byte array / blob.
      const bytes = Buffer.from(await body.transformToByteArray());
      res.end(bytes);
    }
  }
}
