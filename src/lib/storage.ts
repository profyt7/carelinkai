import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

function getRequired(name: string): string {
  const v = process.env[name];
  if (!v || !v.length) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  const region = process.env["S3_REGION"] || "us-east-1";
  const endpoint = process.env["S3_ENDPOINT"]; // e.g. http://localhost:9002 for MinIO
  const forcePathStyle = String(process.env["S3_FORCE_PATH_STYLE"] || "true").toLowerCase() === "true";
  const accessKeyId = process.env["S3_ACCESS_KEY_ID"] || process.env["S3_ACCESS_KEY"];
  const secretAccessKey = process.env["S3_SECRET_ACCESS_KEY"] || process.env["S3_SECRET_KEY"];
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing S3 credentials: set S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY or S3_ACCESS_KEY/S3_SECRET_KEY");
  }
  const credentials = { accessKeyId, secretAccessKey };
  s3Client = new S3Client({ region, endpoint, forcePathStyle, credentials });
  return s3Client;
}

export function getBucket(): string {
  return getRequired("S3_BUCKET");
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
}): Promise<{ bucket: string; key: string }>{
  const bucket = params.bucket || getBucket();
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata,
      ServerSideEncryption: (String(process.env["S3_ENABLE_SSE"]).toLowerCase() === "true" ? "AES256" : undefined) as any,
    })
  );
  return { bucket, key: params.key };
}

export async function deleteObject(params: { bucket?: string; key: string }): Promise<void> {
  const bucket = params.bucket || getBucket();
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: params.key }));
}

export async function createSignedGetUrl(params: { bucket?: string; key: string; expiresIn?: number }): Promise<string> {
  const bucket = params.bucket || getBucket();
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: params.key });
  const expiresIn = params.expiresIn ?? 60 * 5; // 5 minutes
  return getSignedUrl(client, command, { expiresIn });
}

export function toS3Url(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`;
}

export function parseS3Url(url: string): { bucket: string; key: string } | null {
  if (!url.startsWith("s3://")) return null;
  const withoutScheme = url.replace("s3://", "");
  const slash = withoutScheme.indexOf("/");
  if (slash === -1) return null;
  const bucket = withoutScheme.slice(0, slash);
  const key = withoutScheme.slice(slash + 1);
  return { bucket, key };
}
