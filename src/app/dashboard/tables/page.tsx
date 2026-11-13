'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Edit2, Loader2, Users as UsersIcon, X, Coffee,
  CircleDot, MapPin, Trash2, Save, Settings2
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

interface SectionData {
  id: string;
  name: string;
  displayOrder: number;
  tableCount: number;
}

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddTable, setShowAddTable] = useState(false);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [showManageLocations, setShowManageLocations] = useState(false);

  // Table form
  const [tableForm, setTableForm] = useState({
    tableName: '',
    capacity: 4,
    section: '',
    isActive: true,
  });

  // Location form
  const [newLocationName, setNewLocationName] = useState('');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingLocationName, setEditingLocationName] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    loadAll();
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRole(d.role || ''));
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/sections'),
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      setTables(Array.isArray(tData) ? tData : []);
      setSections(Array.isArray(sData) ? sData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // --- Location Management Handlers ---
  async function handleAddLocation() {
    if (!newLocationName.trim()) {
      setLocationError('Location name is required.');
      return;
    }
    setSaving(true);
    setLocationError('');
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocationName.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setLocationError(d.error || 'Failed to add location.');
        return;
      }
      setNewLocationName('');
      await loadAll();
    } catch {
      setLocationError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateLocation(id: string) {
    if (!editingLocationName.trim()) return;
    setSaving(true);
    setLocationError('');
    try {
      const res = await fetch('/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingLocationName.trim() }),
      });
      if (res.ok) {
        setEditingLocationId(null);
        await loadAll();
      }
    } catch {
      setLocationError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLocation(id: string, name: string, count: number) {
    const msg = count > 0
      ? `Remove "${name}"? ${count} table(s) in this location will be moved to General seating.`
      : `Remove location "${name}"?`;
    if (!confirm(msg)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/sections?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeSectionFilter === name) setActiveSectionFilter('all');
        await loadAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // --- Table CRUD Handlers ---
  async function handleAddTable() {
    if (!tableForm.tableName.trim()) {
      setError('Table name is required.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tableForm),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to add table.');
    } else {
      setShowAddTable(false);
      setTableForm({ tableName: '', capacity: 4, section: '', isActive: true });
      await loadAll();
    }
    setSaving(false);
  }

  async function handleEditTable() {
    if (!editTable) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editTable.id,
        tableName: tableForm.tableName,
        capacity: tableForm.capacity,
        section: tableForm.section,
        isActive: tableForm.isActive,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to update table.');
    } else {
      setEditTable(null);
      await loadAll();
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
      await loadAll();
    }
    setSaving(false);
  }

  function handleTableClick(table: TableData) {
    if (table.status === 'occupied' && table.activeOrder) {
      router.push(`/dashboard/orders/${table.activeOrder.orderId}`);
    } else {
      setSelectedTable(table);
    }
  }

  function openEdit(table: TableData) {
    setEditTable(table);
    setTableForm({
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

  const activeTablesCount = tables.filter((t) => t.status !== 'disabled').length;

  // Filtered tables based on selected location tab
  const filteredTables = tables.filter((t) => {
    if (activeSectionFilter === 'all') return true;
    if (activeSectionFilter === '__general__') return !t.section;
    return t.section === activeSectionFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3C2A20]">Floor & Table Management</h2>
          <p className="text-xs text-[#8B7355]">
            {activeTablesCount} active seating table{activeTablesCount !== 1 ? 's' : ''} •{' '}
            {sections.length} location{sections.length !== 1 ? 's' : ''} configured
          </p>
        </div>

        {role === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLocationError('');
                setNewLocationName('');
                setShowManageLocations(true);
              }}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 font-semibold"
            >
              <MapPin className="w-4 h-4 text-[#E5AE45]" /> Manage Locations
            </button>
            <button
              onClick={() => {
                setShowAddTable(true);
                setError('');
                setTableForm({ tableName: '', capacity: 4, section: sections[0]?.name || '', isActive: true });
              }}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Table
            </button>
          </div>
        )}
      </div>

      {/* Location Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveSectionFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeSectionFilter === 'all'
              ? 'bg-[#E5AE45] text-white shadow-sm'
              : 'bg-white text-[#3C2A20] border border-[#E8DCC8] hover:bg-[#F2E8D5]'
          }`}
        >
          All Locations ({tables.length})
        </button>

        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSectionFilter(s.name)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSectionFilter === s.name
                ? 'bg-[#E5AE45] text-white shadow-sm'
                : 'bg-white text-[#3C2A20] border border-[#E8DCC8] hover:bg-[#F2E8D5]'
            }`}
          >
            <MapPin className="w-3 h-3" />
            {s.name} ({s.tableCount})
          </button>
        ))}

        {tables.some((t) => !t.section) && (
          <button
            onClick={() => setActiveSectionFilter('__general__')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeSectionFilter === '__general__'
                ? 'bg-[#E5AE45] text-white shadow-sm'
                : 'bg-white text-[#3C2A20] border border-[#E8DCC8] hover:bg-[#F2E8D5]'
            }`}
          >
            General ({tables.filter((t) => !t.section).length})
          </button>
        )}
      </div>

      {/* Empty State */}
      {tables.length === 0 ? (
        <div className="card p-12 text-center">
          <Coffee className="w-12 h-12 mx-auto text-[#E8DCC8] mb-3" />
          <h3 className="text-lg font-semibold text-[#3C2A20] mb-1">No Tables Configured</h3>
          <p className="text-sm text-[#8B7355] mb-4">
            Add locations (e.g. Terrace, Indoor) and physical tables to begin floor operations.
          </p>
          {role === 'admin' && (
            <button
              onClick={() => {
                setShowAddTable(true);
                setError('');
                setTableForm({ tableName: '', capacity: 4, section: '', isActive: true });
              }}
              className="btn-primary text-xs py-2 px-4"
            >
              Add Your First Table
            </button>
          )}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="card p-12 text-center text-[#8B7355]">
          <MapPin className="w-10 h-10 mx-auto text-[#E8DCC8] mb-2" />
          <p className="text-sm font-semibold">No tables assigned to this location.</p>
        </div>
      ) : (
        /* Tables Visual Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={() => handleTableClick(table)}
              onEdit={role === 'admin' ? () => openEdit(table) : undefined}
            />
          ))}
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
                <p className="text-xs text-[#8B7355] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-[#E5AE45]" />
                  <span>{selectedTable.section || 'General Seating'}</span> •{' '}
                  <span>{selectedTable.capacity} Seats</span>
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
                  This table is available and ready for arriving guests.
                </p>
              )}

              {selectedTable.status === 'disabled' && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  This physical table is out of service. New orders cannot be started on it.
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
      {(showAddTable || editTable) && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowAddTable(false);
            setEditTable(null);
          }}
        >
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-[#3C2A20]">
                {editTable ? 'Edit Physical Table' : 'Add New Physical Table'}
              </h2>
              <button
                onClick={() => {
                  setShowAddTable(false);
                  setEditTable(null);
                }}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C44536] px-3.5 py-2.5 rounded-lg text-xs mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label-text">Table Name / Number *</label>
                <input
                  type="text"
                  value={tableForm.tableName}
                  onChange={(e) => setTableForm({ ...tableForm, tableName: e.target.value })}
                  className="input-field text-xs"
                  placeholder="e.g. Table 1, Terrace-04, Rooftop 3"
                />
              </div>

              <div>
                <label className="label-text">Seating Capacity (Guests)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tableForm.capacity}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 4 })
                  }
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="label-text">Location / Area</label>
                <select
                  value={tableForm.section}
                  onChange={(e) => setTableForm({ ...tableForm, section: e.target.value })}
                  className="input-field text-xs"
                >
                  <option value="">General Seating (No Location)</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#8B7355] mt-1">
                  You can add or remove locations (Terrace, Rooftop, etc.) via &quot;Manage Locations&quot;.
                </p>
              </div>

              {editTable && (
                <div className="pt-2 border-t border-[#E8DCC8]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tableForm.isActive}
                      onChange={(e) => setTableForm({ ...tableForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#E5AE45] rounded border-[#E8DCC8]"
                    />
                    <span className="text-xs font-semibold text-[#3C2A20]">
                      Active for Customer Seating (Uncheck to Disable Table)
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddTable(false);
                  setEditTable(null);
                }}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={editTable ? handleEditTable : handleAddTable}
                disabled={saving}
                className="btn-primary flex-1 text-xs font-bold flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editTable ? 'Save Changes' : 'Create Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Locations Modal (Add, Rename, Remove Locations i.e. Terrace, Indoor, etc.) */}
      {showManageLocations && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowManageLocations(false)}
        >
          <div
            className="card p-6 w-full max-w-md max-h-[85vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DCC8]">
              <div>
                <h3 className="font-bold text-base text-[#3C2A20]">Manage Cafe Locations</h3>
                <p className="text-xs text-[#8B7355]">Add or remove seating sections (e.g. Terrace, Rooftop, Garden)</p>
              </div>
              <button
                onClick={() => setShowManageLocations(false)}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {locationError && (
              <div className="bg-red-50 border border-red-200 text-[#C44536] p-2.5 rounded-lg text-xs">
                {locationError}
              </div>
            )}

            {/* Add New Location */}
            <div className="space-y-1.5">
              <label className="label-text">Add New Location / Section</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="e.g. Terrace, Rooftop, Garden Patio"
                  className="input-field text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  disabled={saving || !newLocationName.trim()}
                  className="btn-primary text-xs px-3.5 py-2 font-bold whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>

            {/* List of Locations */}
            <div className="space-y-2 pt-2 border-t border-[#E8DCC8]">
              <label className="label-text">Configured Locations ({sections.length})</label>
              {sections.length === 0 ? (
                <p className="text-xs text-[#8B7355]">No custom locations added yet.</p>
              ) : (
                <div className="divide-y divide-[#E8DCC8]/60 border border-[#E8DCC8] rounded-lg overflow-hidden">
                  {sections.map((sec) => (
                    <div key={sec.id} className="p-2.5 flex items-center justify-between bg-white">
                      {editingLocationId === sec.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingLocationName}
                            onChange={(e) => setEditingLocationName(e.target.value)}
                            className="input-field text-xs py-1 px-2"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateLocation(sec.id)}
                            className="btn-primary p-1.5 rounded"
                            title="Save Rename"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingLocationId(null)}
                            className="btn-secondary p-1.5 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#E5AE45]" />
                          <div>
                            <p className="font-semibold text-xs text-[#3C2A20]">{sec.name}</p>
                            <p className="text-[10px] text-[#8B7355]">{sec.tableCount} table(s) in this location</p>
                          </div>
                        </div>
                      )}

                      {editingLocationId !== sec.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingLocationId(sec.id);
                              setEditingLocationName(sec.name);
                            }}
                            className="p-1 text-[#8B7355] hover:text-[#3C2A20]"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(sec.id, sec.name, sec.tableCount)}
                            className="p-1 text-[#8B7355] hover:text-[#C44536]"
                            title="Remove Location"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowManageLocations(false)}
                className="btn-secondary w-full text-xs"
              >
                Done
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

        <div className="flex items-center justify-center gap-1.5 text-xs text-[#8B7355] mt-0.5">
          <UsersIcon className="w-3 h-3" />
          <span>{table.capacity} Seats</span>
          {table.section && (
            <span className="inline-flex items-center text-[10px] bg-amber-50 text-[#8B7355] px-1.5 py-0.2 rounded border border-[#E8DCC8]/60">
              {table.section}
            </span>
          )}
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
