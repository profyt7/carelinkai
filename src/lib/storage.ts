import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// All S3 configuration uses AWS_S3_* env var names exclusively.
// These match the Render production environment variables.
// See HIPAA_PHASE_1_DESIGN.md §4 for the full standardization table.

let s3Client: S3Client | null = null;

function getRequired(name: string): string {
  const v = process.env[name];
  if (!v || !v.length) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  const region = process.env['AWS_S3_REGION'] || 'us-east-1';
  const endpoint = process.env['AWS_S3_ENDPOINT'];
  const forcePathStyle =
    String(process.env['AWS_S3_FORCE_PATH_STYLE'] || 'false').toLowerCase() === 'true';
  const accessKeyId = process.env['AWS_S3_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['AWS_S3_SECRET_ACCESS_KEY'];
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing S3 credentials: set AWS_S3_ACCESS_KEY_ID and AWS_S3_SECRET_ACCESS_KEY');
  }
  s3Client = new S3Client({ region, endpoint, forcePathStyle, credentials: { accessKeyId, secretAccessKey } });
  return s3Client;
}

export function getBucket(): string {
  return getRequired('AWS_S3_BUCKET');
}

export function hasS3Credentials(): boolean {
  return Boolean(
    process.env['AWS_S3_ACCESS_KEY_ID'] &&
    process.env['AWS_S3_SECRET_ACCESS_KEY'] &&
    process.env['AWS_S3_BUCKET']
  );
}

export function canUseS3(): boolean {
  if (process.env['AWS_S3_DISABLE'] === '1') return false;
  return hasS3Credentials();
}

export function buildFamilyDocumentKey(familyId: string, filename: string): string {
  return `family/${familyId}/documents/${filename}`;
}

export async function uploadBuffer(params: {
  bucket?: string;
  key: string;
  contentType: string;
  body: Buffer;
  metadata?: Record<string, string>;
}): Promise<{ bucket: string; key: string }> {
  const bucket = params.bucket || getBucket();
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata,
      // SSE-S3 always enforced for PHI compliance — no conditional flag.
      // See HIPAA_PHASE_1_DESIGN.md §2.2
      ServerSideEncryption: 'AES256',
    })
  );
  return { bucket, key: params.key };
}

export async function deleteObject(params: { bucket?: string; key: string }): Promise<void> {
  const bucket = params.bucket || getBucket();
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: params.key }));
}

export async function createSignedGetUrl(params: {
  bucket?: string;
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const bucket = params.bucket || getBucket();
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: params.key });
  return getSignedUrl(client, command, { expiresIn: params.expiresIn ?? 300 });
}

export function toS3Url(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`;
}

export function parseS3Url(url: string): { bucket: string; key: string } | null {
  if (!url.startsWith('s3://')) return null;
  const withoutScheme = url.replace('s3://', '');
  const slash = withoutScheme.indexOf('/');
  if (slash === -1) return null;
  return { bucket: withoutScheme.slice(0, slash), key: withoutScheme.slice(slash + 1) };
}
