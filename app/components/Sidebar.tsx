// components/Sidebar.tsx
'use client';

import { entityConfig } from '@/lib/entities';
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="min-w-64 bg-gray-900 text-white p-4">
      <h1 className="text-xl font-bold mb-4">Admin Panel</h1>
      <nav className="space-y-2">
        {Object.entries(entityConfig).map(([key, val]) => (
          <Link key={key} href={`/admin/${key}`}>
            <div className="hover:bg-gray-700 px-2 py-1 rounded">
              {val.label}
            </div>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
