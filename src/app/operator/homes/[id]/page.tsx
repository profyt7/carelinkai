import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PrismaClient, UserRole } from '@prisma/client';
import Link from 'next/link';
import { parseS3Url, createSignedGetUrl } from '@/lib/storage';
import React from 'react';
import HomePhotosManager from '@/components/operator/HomePhotosManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorHomeManagePage({ params, searchParams }: { params: { id: string }, searchParams?: { operatorId?: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;
  const operatorOverrideId = user?.role === UserRole.ADMIN ? (searchParams?.operatorId || null) : null;

  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: params.id, ...(operatorOverrideId ? { operatorId: operatorOverrideId } : (op ? { operatorId: op.id } : {})) },
    include: { address: true, photos: { orderBy: { isPrimary: 'desc' } } },
  });
  if (!home) {
    return (
      <DashboardLayout title="Manage Home" showSearch={false}>
        <div className="p-6">Home not found.</div>
      </DashboardLayout>
    );
  }

  async function signed(url: string | null) {
    if (!url) return null;
    const parsed = parseS3Url(url);
    if (!parsed) return url;
    return await createSignedGetUrl({ bucket: parsed.bucket, key: parsed.key, expiresIn: 60 * 10 });
  }

  const primaryRaw = home.photos.find(p => p.isPrimary) || home.photos[0] || null;
  const primaryUrl = await signed(primaryRaw?.url || null);

  return (
    <DashboardLayout title="Manage Home" showSearch={false}>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{home.name}</h2>
          <div className="flex gap-2">
            <Link href={`/operator/homes/${home.id}/edit${operatorOverrideId ? `?operatorId=${operatorOverrideId}` : ''}`} className="btn btn-primary">Edit</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card">
            {primaryUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primaryUrl} alt={primaryRaw?.caption || 'Home photo'} className="w-full h-60 object-cover rounded" />
            ) : (
              <div className="h-60 flex items-center justify-center text-neutral-500">No photos yet</div>
            )}
            <div className="mt-3 text-sm text-neutral-600">{home.description}</div>
            <div className="mt-4">
              <HomePhotosManager homeId={home.id} photos={home.photos as any} />
            </div>
          </div>
          <div className="card space-y-2 text-sm">
            <div><span className="text-neutral-500">Status:</span> {home.status}</div>
            <div><span className="text-neutral-500">Capacity:</span> {home.capacity}</div>
            <div><span className="text-neutral-500">Current Occupancy:</span> {home.currentOccupancy}</div>
            <div><span className="text-neutral-500">Care Level:</span> {home.careLevel.join(', ')}</div>
            <div><span className="text-neutral-500">Amenities:</span> {home.amenities.join(', ')}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
