'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Edit2, Loader2, Users as UsersIcon, X, Coffee,
  CircleDot, Ban, ChevronRight
} from 'lucide-react';

interface TableData {
  id: string;
  tableName: string;
  capacity: number;
  section: string;
  displayOrder: number;
  status: 'available' | 'occupied' | 'disabled';
  activeOrder: { orderId: string; total: number; itemCount: number } | null;
}

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [form, setForm] = useState({ tableName: '', capacity: 4, section: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    loadTables();
    fetch('/api/auth/me').then(r => r.json()).then(d => setRole(d.role || ''));
  }, []);

  async function loadTables() {
    setLoading(true);
    const res = await fetch('/api/tables');
    const data = await res.json();
    setTables(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.tableName.trim()) { setError('Table name is required.'); return; }
    setSaving(true);
    setError('');
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to add table.');
    } else {
      setShowAdd(false);
      setForm({ tableName: '', capacity: 4, section: '' });
      await loadTables();
    }
    setSaving(false);
  }

  async function handleEdit() {
    if (!editTable) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editTable.id,
        tableName: form.tableName,
        capacity: form.capacity,
        section: form.section,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to update table.');
    } else {
      setEditTable(null);
      await loadTables();
    }
    setSaving(false);
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this table? It will be hidden from the active tables list.')) return;
    const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || 'Failed to deactivate table.');
    } else {
      await loadTables();
    }
  }

  function handleTableClick(table: TableData) {
    if (table.status === 'occupied' && table.activeOrder) {
      router.push(`/dashboard/orders/${table.activeOrder.orderId}`);
    } else if (table.status === 'available') {
      router.push(`/dashboard/orders/new?tableId=${table.id}&tableName=${encodeURIComponent(table.tableName)}`);
    }
  }

  function openEdit(table: TableData) {
    setEditTable(table);
    setForm({ tableName: table.tableName, capacity: table.capacity, section: table.section });
    setError('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  const sections = [...new Set(tables.map(t => t.section).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#8B7355]">{tables.length} active table{tables.length !== 1 ? 's' : ''}</p>
        </div>
        {role === 'admin' && (
          <button onClick={() => { setShowAdd(true); setError(''); setForm({ tableName: '', capacity: 4, section: '' }); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Table
          </button>
        )}
      </div>

      {/* Tables grid */}
      {tables.length === 0 ? (
        <div className="card p-12 text-center">
          <Coffee className="w-12 h-12 mx-auto text-[#E8DCC8] mb-3" />
          <h3 className="text-lg font-semibold text-[#3C2A20] mb-1">No Tables Yet</h3>
          <p className="text-sm text-[#8B7355] mb-4">Add your cafe&apos;s physical tables to get started.</p>
          {role === 'admin' && (
            <button onClick={() => setShowAdd(true)} className="btn-primary">Add Your First Table</button>
          )}
        </div>
      ) : (
        <>
          {sections.length > 0 && sections.map(section => (
            <div key={section}>
              <h3 className="text-sm font-semibold text-[#8B7355] uppercase tracking-wider mb-3">{section}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables.filter(t => t.section === section).map(table => (
                  <TableCard key={table.id} table={table} onClick={() => handleTableClick(table)} onEdit={role === 'admin' ? () => openEdit(table) : undefined} onDeactivate={role === 'admin' ? () => handleDeactivate(table.id) : undefined} />
                ))}
              </div>
            </div>
          ))}
          {/* Tables without section */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tables.filter(t => !t.section).map(table => (
              <TableCard key={table.id} table={table} onClick={() => handleTableClick(table)} onEdit={role === 'admin' ? () => openEdit(table) : undefined} onDeactivate={role === 'admin' ? () => handleDeactivate(table.id) : undefined} />
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {(showAdd || editTable) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowAdd(false); setEditTable(null); }}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[#3C2A20]">{editTable ? 'Edit Table' : 'Add New Table'}</h2>
              <button onClick={() => { setShowAdd(false); setEditTable(null); }} className="text-[#8B7355] hover:text-[#3C2A20]"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-[#C44536] px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label-text">Table Name / Number *</label>
                <input type="text" value={form.tableName} onChange={(e) => setForm({ ...form, tableName: e.target.value })} className="input-field" placeholder="e.g. Table 1, A1, Patio 3" />
              </div>
              <div>
                <label className="label-text">Seating Capacity</label>
                <input type="number" min={1} max={50} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 4 })} className="input-field" />
              </div>
              <div>
                <label className="label-text">Section (optional)</label>
                <input type="text" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="input-field" placeholder="e.g. Indoor, Outdoor, Patio" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setEditTable(null); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={editTable ? handleEdit : handleAdd} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editTable ? 'Save Changes' : 'Add Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TableCard({
  table,
  onClick,
  onEdit,
  onDeactivate,
}: {
  table: TableData;
  onClick: () => void;
  onEdit?: () => void;
  onDeactivate?: () => void;
}) {
  const isOccupied = table.status === 'occupied';
  const statusColor = isOccupied ? 'border-blue-300 bg-blue-50/50' : 'border-[#E8DCC8] bg-white';
  const statusBadge = isOccupied
    ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-[#4A7C59]';

  return (
    <div
      className={`relative rounded-xl border-2 ${statusColor} p-4 cursor-pointer hover:shadow-md transition-all duration-200 group`}
      onClick={onClick}
    >
      {/* Admin actions */}
      {onEdit && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-7 h-7 rounded-full bg-white border border-[#E8DCC8] flex items-center justify-center text-[#8B7355] hover:text-[#3C2A20] hover:border-[#3C2A20]"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table icon */}
      <div className="flex justify-center mb-3">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isOccupied ? 'bg-blue-100' : 'bg-[#F2E8D5]'}`}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={isOccupied ? 'text-blue-600' : 'text-[#8B7355]'}>
            <rect x="4" y="12" width="24" height="4" rx="2" fill="currentColor" />
            <rect x="7" y="16" width="3" height="10" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="22" y="16" width="3" height="10" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="6" y="8" width="20" height="4" rx="1" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
      </div>

      {/* Table info */}
      <div className="text-center">
        <h3 className="font-semibold text-[#3C2A20] text-sm">{table.tableName}</h3>
        <div className="flex items-center justify-center gap-1 text-xs text-[#8B7355] mt-0.5">
          <UsersIcon className="w-3 h-3" />
          <span>{table.capacity}</span>
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${statusBadge}`}>
          <CircleDot className="w-3 h-3" />
          {isOccupied ? 'Occupied' : 'Available'}
        </div>
        {isOccupied && table.activeOrder && (
          <p className="text-xs font-medium text-blue-700 mt-1">
            NPR {table.activeOrder.total.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}
