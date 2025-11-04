"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type Contact = {
  id?: string;
  name: string;
  relationship?: string;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
  preferences?: any;
};

export function ContactsPanel({ residentId, disabled }: { residentId: string; disabled?: boolean }) {
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/residents/${residentId}/contacts`, { cache: "no-store" });
      if (!r.ok) throw new Error("load failed");
      const j = await r.json();
      setItems(j.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  const addEmpty = () => {
    setItems((prev) => [
      ...prev,
      { name: "", relationship: "", email: "", phone: "", isPrimary: prev.length === 0 }
    ]);
  };

  const removeAt = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const update = (idx: number, patch: Partial<Contact>) => {
    setItems((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      // Ensure only one primary
      let madePrimary = false;
      const normalized = items.map((c) => {
        const next = { ...c };
        if (next.isPrimary) {
          if (!madePrimary) {
            madePrimary = true;
          } else {
            next.isPrimary = false;
          }
        }
        // Normalize empty strings to undefined/null where appropriate
        if (typeof next.email === "string" && next.email.trim() === "") next.email = undefined as any;
        if (typeof next.phone === "string" && next.phone.trim() === "") next.phone = undefined as any;
        return next;
      });
      const r = await fetch(`/api/residents/${residentId}/contacts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: normalized }),
      });
      if (!r.ok) throw new Error("save failed");
      toast.success("Contacts saved");
      await load();
    } catch (e: any) {
      toast.error("Failed to save contacts");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-neutral-800">Contacts</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addEmpty}
            disabled={disabled}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-200"
          >
            Add contact
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || disabled}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-500">Loading contacts…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-neutral-500">No contacts yet.</div>
      ) : null}

      <div className="space-y-3">
        {items.map((c, idx) => (
          <div key={idx} className="rounded-md border p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="block text-neutral-700 mb-1">Name</span>
                <input
                  aria-label="Name"
                  className="w-full rounded-md border px-3 py-2"
                  value={c.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  disabled={disabled}
                />
              </label>
              <label className="text-sm">
                <span className="block text-neutral-700 mb-1">Relationship</span>
                <input
                  aria-label="Relationship"
                  className="w-full rounded-md border px-3 py-2"
                  value={c.relationship || ""}
                  onChange={(e) => update(idx, { relationship: e.target.value })}
                  disabled={disabled}
                />
              </label>
              <label className="text-sm">
                <span className="block text-neutral-700 mb-1">Email</span>
                <input
                  type="email"
                  aria-label="Email"
                  className="w-full rounded-md border px-3 py-2"
                  value={c.email || ""}
                  onChange={(e) => update(idx, { email: e.target.value })}
                  disabled={disabled}
                />
              </label>
              <label className="text-sm">
                <span className="block text-neutral-700 mb-1">Phone</span>
                <input
                  aria-label="Phone"
                  className="w-full rounded-md border px-3 py-2"
                  value={c.phone || ""}
                  onChange={(e) => update(idx, { phone: e.target.value })}
                  disabled={disabled}
                />
              </label>
              <label className="text-sm inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Primary"
                  checked={!!c.isPrimary}
                  onChange={(e) => update(idx, { isPrimary: e.target.checked })}
                  disabled={disabled}
                />
                <span>Primary</span>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => removeAt(idx)}
                disabled={disabled}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
