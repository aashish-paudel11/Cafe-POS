'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Edit2, Loader2, Users as UsersIcon, X, Coffee,
  CircleDot, Ban, ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';

interface TableData {
  id: string;
  tableName: string;
  capacity: number;
  section: string;
  displayOrder: number;
  isActive: boolean;
  status: 'available' | 'occupied' | 'disabled';
  activeOrder: { orderId: string; total: number; itemCount: number } | null;
}

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [form, setForm] = useState({ tableName: '', capacity: 4, section: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    loadTables();
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRole(d.role || ''));
  }, []);

  async function loadTables() {
    setLoading(true);
    try {
      const res = await fetch('/api/tables');
      const data = await res.json();
      setTables(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!form.tableName.trim()) {
      setError('Table name is required.');
      return;
    }
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
      setForm({ tableName: '', capacity: 4, section: '', isActive: true });
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
        isActive: form.isActive,
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

  async function handleToggleActivate(tableId: string, currentStatus: boolean) {
    setSaving(true);
    const res = await fetch('/api/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tableId, isActive: !currentStatus }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || 'Failed to update table status.');
    } else {
      setSelectedTable(null);
      await loadTables();
    }
    setSaving(false);
  }

  function handleTableClick(table: TableData) {
    if (table.status === 'occupied' && table.activeOrder) {
      router.push(`/dashboard/orders/${table.activeOrder.orderId}`);
    } else {
      // For Available or Disabled, open Table Screen modal as required
      setSelectedTable(table);
    }
  }

  function openEdit(table: TableData) {
    setEditTable(table);
    setForm({
      tableName: table.tableName,
      capacity: table.capacity,
      section: table.section,
      isActive: table.isActive,
    });
    setError('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  const sections = [...new Set(tables.map((t) => t.section).filter(Boolean))];
  const activeTablesCount = tables.filter((t) => t.status !== 'disabled').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3C2A20]">Floor & Table Management</h2>
          <p className="text-xs text-[#8B7355]">
            {activeTablesCount} active seating table{activeTablesCount !== 1 ? 's' : ''} •{' '}
            {tables.length} total registered
          </p>
        </div>
        {role === 'admin' && (
          <button
            onClick={() => {
              setShowAdd(true);
              setError('');
              setForm({ tableName: '', capacity: 4, section: '', isActive: true });
            }}
            className="btn-primary flex items-center justify-center gap-2 text-xs py-2 px-4 font-bold"
          >
            <Plus className="w-4 h-4" /> Add Physical Table
          </button>
        )}
      </div>

      {/* Tables grid */}
      {tables.length === 0 ? (
        <div className="card p-12 text-center">
          <Coffee className="w-12 h-12 mx-auto text-[#E8DCC8] mb-3" />
          <h3 className="text-lg font-semibold text-[#3C2A20] mb-1">No Tables Configured</h3>
          <p className="text-sm text-[#8B7355] mb-4">
            Add your cafe&apos;s physical tables to begin taking dine-in orders.
          </p>
          {role === 'admin' && (
            <button
              onClick={() => {
                setShowAdd(true);
                setError('');
                setForm({ tableName: '', capacity: 4, section: '', isActive: true });
              }}
              className="btn-primary"
            >
              Add Your First Table
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sections.length > 0 &&
            sections.map((section) => (
              <div key={section} className="space-y-3">
                <h3 className="text-xs font-bold text-[#8B7355] uppercase tracking-wider">
                  {section}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tables
                    .filter((t) => t.section === section)
                    .map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onClick={() => handleTableClick(table)}
                        onEdit={role === 'admin' ? () => openEdit(table) : undefined}
                      />
                    ))}
                </div>
              </div>
            ))}

          {/* Tables without section */}
          {tables.some((t) => !t.section) && (
            <div className="space-y-3">
              {sections.length > 0 && (
                <h3 className="text-xs font-bold text-[#8B7355] uppercase tracking-wider">
                  General Seating
                </h3>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables
                  .filter((t) => !t.section)
                  .map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onClick={() => handleTableClick(table)}
                      onEdit={role === 'admin' ? () => openEdit(table) : undefined}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Details Modal (Available / Disabled Click Screen) */}
      {selectedTable && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTable(null)}
        >
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DCC8]">
              <div>
                <h3 className="font-bold text-lg text-[#3C2A20]">{selectedTable.tableName}</h3>
                <p className="text-xs text-[#8B7355]">
                  Capacity: {selectedTable.capacity} Seats{' '}
                  {selectedTable.section && `• ${selectedTable.section}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2 text-center space-y-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedTable.status === 'available'
                    ? 'bg-green-100 text-[#4A7C59]'
                    : selectedTable.status === 'occupied'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                <CircleDot className="w-3.5 h-3.5" />
                {selectedTable.status}
              </span>

              {selectedTable.status === 'available' && (
                <p className="text-xs text-[#8B7355]">
                  This table is currently clean and ready for arriving customers.
                </p>
              )}

              {selectedTable.status === 'disabled' && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  This physical table is currently out of service or archived. New orders cannot be
                  started on it.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {selectedTable.status === 'available' && (
                <button
                  onClick={() => {
                    const t = selectedTable;
                    setSelectedTable(null);
                    router.push(
                      `/dashboard/orders/new?tableId=${t.id}&tableName=${encodeURIComponent(
                        t.tableName
                      )}`
                    );
                  }}
                  className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Start Order
                </button>
              )}

              {selectedTable.status === 'disabled' && role === 'admin' && (
                <button
                  onClick={() => handleToggleActivate(selectedTable.id, false)}
                  disabled={saving}
                  className="btn-success w-full py-2.5 text-xs font-bold"
                >
                  Activate Table (Return to Service)
                </button>
              )}

              <button onClick={() => setSelectedTable(null)} className="btn-secondary w-full text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Table Modal */}
      {(showAdd || editTable) && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowAdd(false);
            setEditTable(null);
          }}
        >
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[#3C2A20]">
                {editTable ? 'Edit Physical Table' : 'Add New Physical Table'}
              </h2>
              <button
                onClick={() => {
                  setShowAdd(false);
                  setEditTable(null);
                }}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C44536] px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label-text">Table Name / Number *</label>
                <input
                  type="text"
                  value={form.tableName}
                  onChange={(e) => setForm({ ...form, tableName: e.target.value })}
                  className="input-field text-xs"
                  placeholder="e.g. Table 1, T-04, Garden Patio 2"
                />
              </div>

              <div>
                <label className="label-text">Seating Capacity (Guests)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: parseInt(e.target.value) || 4 })
                  }
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="label-text">Section / Floor Area (Optional)</label>
                <input
                  type="text"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="input-field text-xs"
                  placeholder="e.g. Main Hall, Balcony, Rooftop"
                />
              </div>

              {editTable && (
                <div className="pt-2 border-t border-[#E8DCC8]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#E5AE45] rounded border-[#E8DCC8]"
                    />
                    <span className="text-xs font-semibold text-[#3C2A20]">
                      Active for Customer Seating (Uncheck to Disable / Take Out of Service)
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setEditTable(null);
                }}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={editTable ? handleEdit : handleAdd}
                disabled={saving}
                className="btn-primary flex-1 text-xs font-bold flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editTable ? 'Save Table Changes' : 'Create Table'}
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
}: {
  table: TableData;
  onClick: () => void;
  onEdit?: () => void;
}) {
  const isOccupied = table.status === 'occupied';
  const isDisabled = table.status === 'disabled';

  const statusColor = isDisabled
    ? 'border-gray-200 bg-gray-50/60 opacity-60'
    : isOccupied
    ? 'border-blue-300 bg-blue-50/50'
    : 'border-[#E8DCC8] bg-white';

  const statusBadge = isDisabled
    ? 'bg-gray-200 text-gray-700'
    : isOccupied
    ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-[#4A7C59]';

  return (
    <div
      className={`relative rounded-xl border-2 ${statusColor} p-4 cursor-pointer hover:shadow-md transition-all duration-200 group select-none`}
      onClick={onClick}
    >
      {/* Admin edit action */}
      {onEdit && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-7 h-7 rounded-full bg-white border border-[#E8DCC8] flex items-center justify-center text-[#8B7355] hover:text-[#3C2A20] shadow-sm"
            title="Edit Table"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table icon */}
      <div className="flex justify-center mb-3">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isDisabled ? 'bg-gray-200' : isOccupied ? 'bg-blue-100' : 'bg-[#F2E8D5]'
          }`}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            className={
              isDisabled
                ? 'text-gray-500'
                : isOccupied
                ? 'text-blue-600'
                : 'text-[#8B7355]'
            }
          >
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
          <span>{table.capacity} Seats</span>
        </div>

        <div
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase mt-2 ${statusBadge}`}
        >
          <CircleDot className="w-3 h-3" />
          {table.status}
        </div>

        {isOccupied && table.activeOrder && (
          <p className="text-xs font-bold text-blue-700 mt-1">
            NPR {table.activeOrder.total.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}
