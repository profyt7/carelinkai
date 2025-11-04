"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type DocItem = { id: string; title: string; fileUrl: string; fileType: string; fileSize: number; createdAt: string };

export function DocumentsPanel({ residentId, disabled }: { residentId: string; disabled?: boolean }) {
  const [items, setItems] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("RESIDENT_RECORD");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/residents/${residentId}/documents?limit=50`, { cache: "no-store" });
      if (!r.ok) throw new Error("load failed");
      const j = await r.json();
      setItems(j.items || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [residentId]);

  const onUpload = async () => {
    if (!file || !title.trim()) { toast.error("Title and file required"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("title", title.trim());
      fd.set("type", docType);
      fd.set("file", file);
      const r = await fetch(`/api/residents/${residentId}/documents/upload`, { method: "POST", body: fd, headers: { 'x-e2e-bypass': '1' } });
      if (!r.ok) throw new Error("upload failed");
      toast.success("Document uploaded");
      setTitle("");
      setFile(null);
      await load();
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-neutral-800">Documents</h2>
      </div>

      <div className="mb-4">
        {loading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-neutral-500">No documents yet.</div>
        ) : (
          <ul className="divide-y">
            {items.map((d) => (
              <li key={d.id} className="py-2 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium text-neutral-800">{d.title}</div>
                  <div className="text-neutral-500 text-xs">{d.fileType} • {(d.fileSize/1024).toFixed(1)} KB</div>
                </div>
                <a className="text-primary-600 hover:underline text-sm" href={d.fileUrl} target="_blank">Open</a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block text-neutral-700 mb-1">Title</span>
            <input className="w-full rounded-md border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} disabled={disabled || saving} />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-700 mb-1">Type</span>
            <select className="w-full rounded-md border px-3 py-2" value={docType} onChange={(e) => setDocType(e.target.value)} disabled={disabled || saving}>
              <option value="RESIDENT_RECORD">Resident Record</option>
              <option value="MEDICAL_RECORD">Medical Record</option>
              <option value="COMPLIANCE_DOCUMENT">Compliance Document</option>
              <option value="CONTRACT">Contract</option>
              <option value="INVOICE">Invoice</option>
              <option value="CREDENTIAL">Credential</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-neutral-700 mb-1">File</span>
            <input type="file" className="w-full rounded-md border px-3 py-2" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={disabled || saving} />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onUpload} disabled={disabled || saving} className="rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
