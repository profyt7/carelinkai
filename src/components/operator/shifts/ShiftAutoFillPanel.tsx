'use client';

import { useState } from 'react';
import ShiftAutoFill from './ShiftAutoFill';

interface Home {
  id: string;
  name: string;
}

interface Props {
  homes: Home[];
}

export default function ShiftAutoFillPanel({ homes }: Props) {
  const [selectedHomeId, setSelectedHomeId] = useState(homes[0]?.id ?? '');

  const selectedHome = homes.find((h) => h.id === selectedHomeId);

  if (!selectedHome) return null;

  return (
    <div className="space-y-3">
      {homes.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-600">AI Auto-fill for:</span>
          <select
            value={selectedHomeId}
            onChange={(e) => setSelectedHomeId(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {homes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <ShiftAutoFill homeId={selectedHome.id} homeName={selectedHome.name} />
    </div>
  );
}
