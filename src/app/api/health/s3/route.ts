export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getS3Client, getBucket, hasS3Credentials } from '@/lib/storage';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Gated by X-Health-Check-Token to prevent public enumeration.
// Performs a PUT → GET → DELETE round-trip on a sentinel object.
export async function GET(req: NextRequest) {
  const token = req.headers.get('x-health-check-token');
  const expected = process.env['HEALTH_CHECK_TOKEN'];
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasS3Credentials()) {
    return NextResponse.json({ ok: false, error: 'S3 credentials not configured' }, { status: 503 });
  }

  const key = `health-check/sentinel-${Date.now()}.txt`;
  const body = `carelinkai-health-${Date.now()}`;
  const startMs = Date.now();

  try {
    const s3 = getS3Client();
    const bucket = getBucket();

    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'text/plain' }));

    const getCmd = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of getCmd.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    const retrieved = Buffer.concat(chunks).toString('utf8');

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    const durationMs = Date.now() - startMs;
    const match = retrieved === body;
    return NextResponse.json({ ok: match, durationMs, match });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    console.error('S3 health check failed', err);
    return NextResponse.json(
      { ok: false, durationMs, error: err instanceof Error ? err.message : 'S3 error' },
      { status: 503 }
    );
  }
}
