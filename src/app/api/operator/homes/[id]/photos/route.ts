import { NextResponse } from 'next/server';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { PrismaClient, UserRole } from '@prisma/client';
import { getS3Client, getBucket, toS3Url } from '@/lib/storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id } });
    if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await (req as any).formData();
    const file = form.get('file') as unknown as File | null;
    const caption = (form.get('caption') as string) || undefined;
    const isPrimary = (form.get('isPrimary') as string) === 'true';
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const client = getS3Client();
    const bucket = getBucket();
    const safeName = (file.name || 'photo').replace(/[^a-z0-9_.-]+/gi, '_').toLowerCase();
    const key = `homes/${home.id}/photos/${randomUUID()}-${safeName}`;

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
      ServerSideEncryption: (String(process.env['S3_ENABLE_SSE']).toLowerCase() === 'true' ? 'AES256' : undefined) as any,
    }));

    const created = await prisma.homePhoto.create({
      data: {
        homeId: home.id,
        url: toS3Url(bucket, key),
        caption,
        isPrimary: false,
      },
    });

    if (isPrimary) {
      await prisma.homePhoto.updateMany({ where: { homeId: home.id, isPrimary: true }, data: { isPrimary: false } });
      await prisma.homePhoto.update({ where: { id: created.id }, data: { isPrimary: true } });
    }

    return NextResponse.json({ photoId: created.id });
  } catch (e) {
    console.error('Upload home photo failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
