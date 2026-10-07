import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION ?? "us-east-1";
const customEndpoint = process.env.AWS_S3_ENDPOINT;

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region,
      ...(customEndpoint && {
        endpoint: customEndpoint,
        forcePathStyle: true,
      }),
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return _client;
}

export function isS3Configured(): boolean {
  return !!(bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

/**
 * Upload a buffer to S3. Key = full object key (e.g. uploads/PROJ_CODE/closure/file.pdf).
 * Returns the S3 key to store in DB (use getPublicUrl or getSignedUrl when serving).
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType?: string
): Promise<string> {
  if (!bucket) throw new Error("AWS_S3_BUCKET is not set");
  const input: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
  };
  if (contentType) input.ContentType = contentType;
  await getClient().send(new PutObjectCommand(input));
  return key;
}

/**
 * Public URL for an object (use when bucket/objects are public).
 * For Railway or custom endpoint, uses path-style URL.
 */
export function getPublicUrl(key: string): string {
  if (!bucket) throw new Error("AWS_S3_BUCKET is not set");
  if (customEndpoint) {
    const base = customEndpoint.replace(/\/$/, "");
    return `${base}/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Signed URL for private bucket (e.g. 5-minute expiry for view/download).
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 300
): Promise<string> {
  if (!bucket) throw new Error("AWS_S3_BUCKET is not set");
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

/**
 * Stream object from S3 (for download API when bucket is private).
 */
export async function getObjectStream(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
}> {
  if (!bucket) throw new Error("AWS_S3_BUCKET is not set");
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  if (!response.Body) throw new Error("Empty S3 object body");
  return {
    body: response.Body as Readable,
    contentType: response.ContentType ?? undefined,
    contentLength: response.ContentLength ?? undefined,
  };
}
