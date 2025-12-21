"use client";
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { DocumentType, ValidationStatus, ReviewStatus } from '@prisma/client';
import ClassificationBadge from '@/components/documents/ClassificationBadge';
import { useRouter } from 'next/navigation';

type Doc = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt?: string;
  documentType?: DocumentType;
  classificationConfidence?: number;
  validationStatus?: ValidationStatus;
  reviewStatus?: ReviewStatus;
};

export function DocumentsPanel({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<{ title: string; fileUrl: string; fileType: string; fileSize: string; isEncrypted: boolean }>({
    title: '',
    fileUrl: '',
    fileType: '',
    fileSize: '',
    isEncrypted: true,
  });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/residents/${residentId}/documents?limit=50`, { cache: 'no-store' });
      if (!r.ok) throw new Error('load');
      const j = await r.json();
      setItems(j.items || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let payload: { title: string; fileUrl: string; fileType: string; fileSize: number; isEncrypted: boolean } | null = null;
      if (mode === 'link') {
        const size = Number(form.fileSize);
        if (!form.title || !form.fileUrl || !form.fileType || !Number.isFinite(size) || size <= 0) {
          toast.error('Please fill in Title, File URL, Type, and positive Size');
          return;
        }
        payload = { title: form.title, fileUrl: form.fileUrl, fileType: form.fileType, fileSize: size, isEncrypted: form.isEncrypted };
      } else {
        // Upload mode with presigned URL (S3); fallback to mock when S3 is disabled
        if (!file) { toast.error('Choose a file'); return; }
        const contentType = file.type || 'application/octet-stream';
        const presign = await fetch(`/api/uploads/presign`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType, residentId }),
        });
        if (!presign.ok) throw new Error('presign failed');
        const p = await presign.json() as { mode: string; uploadUrl: string | null; publicUrl: string };
        if (p.mode === 's3' && p.uploadUrl) {
          const put = await fetch(p.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
          if (!put.ok) throw new Error('upload failed');
        }
        payload = { title: form.title || file.name, fileUrl: p.publicUrl, fileType: contentType, fileSize: file.size, isEncrypted: form.isEncrypted };
      }
      const r = await fetch(`/api/residents/${residentId}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('create');
      toast.success('Document added');
      setForm({ title: '', fileUrl: '', fileType: '', fileSize: '', isEncrypted: true });
      setFile(null);
      await load();
    } catch (e) {
      toast.error('Failed to add document');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this document?')) return;
    try {
      const r = await fetch(`/api/residents/${residentId}/documents/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('delete');
      toast.success('Document deleted');
      await load();
    } catch (e) {
      toast.error('Failed to delete');
    }
  }

  const needsReviewCount = items.filter(d => 
    d.reviewStatus === 'PENDING_REVIEW' || 
    d.validationStatus === 'NEEDS_REVIEW' ||
    (d.classificationConfidence && d.classificationConfidence < 85)
  ).length;

  return (
    <div className="bg-white border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-neutral-800">Documents</h2>
          {needsReviewCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              {needsReviewCount} need review
            </span>
          )}
        </div>
        <button
          onClick={() => router.push('/operator/documents')}
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
        >
          View All Documents →
        </button>
      </div>
      <div className="flex items-center gap-3 mb-2 text-sm">
        <label className="flex items-center gap-1"><input type="radio" checked={mode==='link'} onChange={() => setMode('link')} /> Link URL</label>
        <label className="flex items-center gap-1"><input type="radio" checked={mode==='upload'} onChange={() => setMode('upload')} /> Upload file (presigned)</label>
      </div>
      <form onSubmit={onAdd} className="grid grid-cols-1 lg:grid-cols-5 gap-2 mb-4">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        {mode === 'link' ? (
          <>
            <input className="border rounded px-2 py-1 text-sm lg:col-span-2" placeholder="File URL (https://...)" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
            <input className="border rounded px-2 py-1 text-sm" placeholder="MIME Type (e.g. application/pdf)" value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })} />
            <input className="border rounded px-2 py-1 text-sm" placeholder="Size (bytes)" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} />
          </>
        ) : (
          <>
            <input className="border rounded px-2 py-1 text-sm lg:col-span-3" placeholder="MIME Type (e.g. application/pdf)" value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })} />
            <input type="file" className="border rounded px-2 py-1 text-sm lg:col-span-2" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isEncrypted} onChange={(e) => setForm({ ...form, isEncrypted: e.target.checked })} />
          <span>Encrypted</span>
        </label>
        <button disabled={saving} className="btn btn-sm lg:col-span-4" type="submit">{saving ? 'Saving…' : 'Add'}</button>
      </form>

      {loading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-neutral-500">No documents yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Title</th>
                <th className="text-left p-2">Classification</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Size</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-2">{d.title}</td>
                  <td className="p-2">
                    {d.documentType && d.classificationConfidence !== undefined ? (
                      <ClassificationBadge
                        documentType={d.documentType}
                        confidence={d.classificationConfidence}
                        size="sm"
                      />
                    ) : (
                      <span className="text-gray-500 text-xs">Not classified</span>
                    )}
                  </td>
                  <td className="p-2">{d.fileType}</td>
                  <td className="p-2">{d.fileSize?.toLocaleString?.() ?? d.fileSize}</td>
                  <td className="p-2">
                    {d.reviewStatus === 'PENDING_REVIEW' || d.validationStatus === 'NEEDS_REVIEW' ? (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        Review
                      </span>
                    ) : d.reviewStatus === 'REVIEWED' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        ✓ Reviewed
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-2 flex items-center gap-2">
                    <a className="text-primary-600 hover:underline" href={d.fileUrl} target="_blank" rel="noreferrer">Open</a>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => onDelete(d.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
