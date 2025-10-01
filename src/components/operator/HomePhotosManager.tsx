"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function HomePhotosManager({ homeId, photos }: { homeId: string; photos: Array<{ id: string; url: string; isPrimary: boolean; caption?: string | null }> }) {
  const [items, setItems] = useState(photos);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const res = await fetch(`/api/operator/homes/${homeId}`);
      if (res.ok) {
        const { data } = await res.json();
        setItems(data.photos);
      }
    } catch {}
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      const res = await fetch(`/api/operator/homes/${homeId}/photos`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      toast.success('Photo uploaded');
      (form.querySelector('input[type=file]') as HTMLInputElement).value = '';
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function setPrimary(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/operator/homes/${homeId}/photos/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to set primary');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this photo?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/operator/homes/${homeId}/photos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onUpload} className="flex items-center gap-2">
        <input name="file" type="file" accept="image/*" className="form-input" required />
        <label className="inline-flex items-center gap-1 text-sm"><input type="checkbox" name="isPrimary" /> Primary</label>
        <button className="btn btn-secondary" disabled={busy}>Upload</button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((p) => (
          <div key={p.id} className="border rounded p-2">
            {/* We display via backend primary hero; thumbnails can be blurred without signed URLs */}
            <div className="text-xs mb-1">{p.isPrimary ? 'Primary' : ''}</div>
            <div className="flex gap-2">
              <button className="btn btn-xs" disabled={busy || p.isPrimary} onClick={() => setPrimary(p.id)}>Make Primary</button>
              <button className="btn btn-xs btn-danger" disabled={busy} onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
