"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function HomePhotosManager({ homeId, photos }: { homeId: string; photos: Array<{ id: string; url: string; isPrimary: boolean; caption?: string | null }> }) {
  const [items, setItems] = useState(photos);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

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

  async function persistOrder(newItems: typeof items) {
    const order = newItems.map((p) => p.id);
    try {
      const res = await fetch(`/api/operator/homes/${homeId}/photos/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error('Failed to save order');
      toast.success('Order updated');
      // Ensure local order matches server ordering (primary first, then sortOrder)
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save order');
    }
  }

  function onDragStart(id: string) {
    setDragId(id);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  async function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((p) => p.id === dragId);
    const to = items.findIndex((p) => p.id === targetId);
    if (from === -1 || to === -1) return;
    const next = items.slice();
    const removed = next.splice(from, 1);
    const moved = removed[0];
    if (!moved) return;
    next.splice(to, 0, moved);
    setItems(next);
    setDragId(null);
    await persistOrder(next);
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
          <div
            key={p.id}
            className="border rounded p-2 select-none"
            draggable
            onDragStart={() => onDragStart(p.id)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(p.id)}
            aria-grabbed={dragId === p.id}
          >
            {/* We display via backend primary hero; thumbnails can be blurred without signed URLs */}
            <div className="flex items-center justify-between mb-1 text-xs text-neutral-600">
              <span>{p.isPrimary ? 'Primary' : 'Photo'}</span>
              <span className="cursor-grab" title="Drag to reorder">≡</span>
            </div>
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
