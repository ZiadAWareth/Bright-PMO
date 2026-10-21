import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { PLATFORM_ORG } from '../organization-scope/tenant-context';

/**
 * Object-storage client for user-uploaded attachments (PG-11, uploads arm).
 *
 * Files live in ONE central S3-compatible bucket shared by every generated app,
 * partitioned by key so nothing crosses a boundary by accident:
 *
 *   app-<projectId>/org-<organizationId>/attachments/<uuid>.<ext>
 *
 * Reads its config from APP_STORAGE_* (kept distinct from the platform's own
 * STORAGE_*, which points at a different bucket) so app containers never hold
 * the platform-artifact credentials. Isolation between organisations is enforced
 * by the uploads controller: uploads stamp the caller's own org into the key,
 * and downloads/deletes verify the org in the key matches the caller.
 */

const endpoint = process.env.APP_STORAGE_ENDPOINT_URL;
const region = process.env.APP_STORAGE_REGION || 'auto';
const bucket = process.env.APP_STORAGE_BUCKET_NAME;
const accessKeyId = process.env.APP_STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.APP_STORAGE_SECRET_ACCESS_KEY;

const PROJECT_ID = process.env.PROJECT_ID || 'app';

export interface StoredFile {
  key: string;
  url: string; // app-relative serve path; resolved against the API base by the client
  name: string;
  size: number;
  type: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;

  /** Uploads are only possible when the central bucket is fully configured. */
  isConfigured(): boolean {
    return Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
  }

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId: accessKeyId as string,
          secretAccessKey: secretAccessKey as string,
        },
        // S3-compatible providers (DO Spaces, R2, MinIO) use path-style addressing.
        forcePathStyle: true,
      });
    }
    return this.client;
  }

  /** Best-effort file extension from a mime type or the original filename. */
  private extFor(mimeType: string, originalName: string): string {
    const fromName = (originalName || '').split('.').pop();
    if (fromName && fromName !== originalName && /^[a-z0-9]{1,8}$/i.test(fromName)) {
      return fromName.toLowerCase();
    }
    const fromMime = (mimeType || '').split('/').pop();
    return fromMime && /^[a-z0-9.+-]{1,10}$/i.test(fromMime) ? fromMime : 'bin';
  }

  /**
   * Build a tenant-partitioned object key. `org` is the CALLER's organization —
   * the controller passes its own tenant context, never a client-supplied value,
   * so a user can only ever write under their own org prefix. A missing org
   * (platform-level actor) falls back to the platform sentinel.
   */
  buildKey(org: number | null | undefined, mimeType: string, originalName: string): string {
    const orgSegment = org == null ? PLATFORM_ORG : org;
    const ext = this.extFor(mimeType, originalName);
    return `app-${PROJECT_ID}/org-${orgSegment}/attachments/${randomUUID()}.${ext}`;
  }

  /** The organization id encoded in a key, or null if the key is not one of ours. */
  orgFromKey(key: string): number | null {
    const m = /(?:^|\/)org-(\d+)\//.exec(key || '');
    return m ? Number(m[1]) : null;
  }

  /** Does a key belong to THIS app? Blocks reaching into another app's prefix. */
  belongsToThisApp(key: string): boolean {
    return typeof key === 'string' && key.startsWith(`app-${PROJECT_ID}/`);
  }

  async upload(buffer: Buffer, mimeType: string, key: string): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      }),
    );
  }

  async getObject(key: string): Promise<{ body: any; contentType?: string }> {
    const res = await this.getClient().send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    return { body: res.Body, contentType: res.ContentType };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.getClient().send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    } catch (err: any) {
      this.logger.warn(`Failed to delete object "${key}": ${err?.message ?? err}`);
    }
  }

  /** App-relative serve URL for a stored key (client resolves against its API base). */
  serveUrl(key: string): string {
    return `/api/uploads/file?key=${encodeURIComponent(key)}`;
  }
}
