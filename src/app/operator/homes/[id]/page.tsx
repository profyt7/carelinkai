import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { PrismaClient, UserRole } from '@prisma/client';
import Link from 'next/link';
import { parseS3Url, createSignedGetUrl } from '@/lib/storage';
import React from 'react';
import HomePhotosManager from '@/components/operator/HomePhotosManager';
import HomeAlerts from '@/components/operator/HomeAlerts';

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
      <div className="p-6">Home not found.</div>
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
    <div className="p-4 sm:p-6 space-y-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Homes', href: '/operator/homes' },
          { label: home.name }
        ]} />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{home.name}</h2>
          <div className="flex gap-2">
            <Link href={`/operator/homes/${home.id}/analytics${operatorOverrideId ? `?operatorId=${operatorOverrideId}` : ''}`} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Analytics
            </Link>
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
            
            {/* Description Section */}
            <div className="mt-3">
              {home.aiGeneratedDescription && (
                <div className="mb-3 inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
                  <svg className="w-4 h-4 text-blue-600 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-xs font-medium text-blue-700">AI-Enhanced Profile</span>
                </div>
              )}
              <div className="text-sm text-neutral-600">
                {home.aiGeneratedDescription || home.description}
              </div>
            </div>
            
            {/* AI-Generated Highlights */}
            {home.highlights && home.highlights.length > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Key Highlights
                </h3>
                <ul className="space-y-2">
                  {home.highlights.map((highlight: string, index: number) => (
                    <li key={index} className="flex items-start text-sm text-neutral-700">
                      <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4">
              <HomePhotosManager homeId={home.id} photos={home.photos as any} />
            </div>
          </div>
          <div className="card space-y-3 text-sm">
            <form action={`/api/operator/homes/${home.id}`} method="post" className="space-y-3">
              <div className="font-medium text-neutral-800">Quick Actions</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Status</label>
                  <select name="status" defaultValue={home.status} className="form-select">
                    <option value="DRAFT">DRAFT</option>
                    <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Current Occupancy</label>
                  <input className="form-input" type="number" name="currentOccupancy" min={0} max={home.capacity} defaultValue={home.currentOccupancy} />
                </div>
              </div>
              <div>
                <label className="form-label">Amenities (comma-separated)</label>
                <input className="form-input" type="text" name="amenities" defaultValue={home.amenities.join(', ')} />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" name="_action" value="quick-update" type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>

        {/* Alerts Component */}
        <HomeAlerts homeId={home.id} maxAlerts={5} />
      </div>
  );
}
