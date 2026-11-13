'use client';

import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Key, Shield, User,
  CheckCircle2, XCircle, Loader2, X, AlertCircle
} from 'lucide-react';

interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'waiter';
  isActive: boolean;
  createdAt: string;
  _count?: {
    createdOrders: number;
    payments: number;
  };
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resettingUser, setResettingUser] = useState<StaffUser | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    password: '',
    role: 'waiter',
  });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStaff() {
    if (!createForm.fullName.trim() || !createForm.username.trim() || !createForm.password) {
      setError('All fields are required.');
      return;
    }

    if (createForm.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const d = await res.json();
      if (!res.ok) {
        setError(d.error || 'Failed to create staff member');
        return;
      }

      setShowCreateModal(false);
      setCreateForm({ fullName: '', username: '', password: '', role: 'waiter' });
      await loadStaff();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!resettingUser || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resettingUser.id, password: newPassword }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to reset password');
        return;
      }

      setResettingUser(null);
      setNewPassword('');
      alert('Password updated successfully.');
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(user: StaffUser) {
    if (!confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.fullName}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });

      if (res.ok) {
        await loadStaff();
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3C2A20]">Staff & Waiter Management</h2>
          <p className="text-xs text-[#8B7355]">
            Create and maintain waiter accounts for floor operations
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setShowCreateModal(true);
          }}
          className="btn-primary flex items-center justify-center gap-2 text-xs py-2 px-4 font-bold"
        >
          <UserPlus className="w-4 h-4" /> Add Waiter Account
        </button>
      </div>

      {/* Staff Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#FFF8EB] border-b border-[#E8DCC8] text-[#8B7355] font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Staff Member</th>
                <th className="py-3 px-3 text-left">Username</th>
                <th className="py-3 px-3 text-left">Role</th>
                <th className="py-3 px-3 text-left">Status</th>
                <th className="py-3 px-3 text-center">Orders Handled</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCC8]/50">
              {staff.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#F2E8D5] flex items-center justify-center text-[11px] font-bold text-[#3C2A20]">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-[#3C2A20]">{u.fullName}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono text-[#8B7355]">{u.username}</td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-amber-100 text-[#E5AE45]'
                      }`}
                    >
                      {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.isActive
                          ? 'bg-green-100 text-[#4A7C59]'
                          : 'bg-red-100 text-[#C44536]'
                      }`}
                    >
                      {u.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Inactive
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center text-[#8B7355]">
                    {u._count?.createdOrders || 0} orders
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setResettingUser(u);
                          setNewPassword('');
                          setError('');
                        }}
                        className="btn-secondary py-1 px-2.5 text-[11px] inline-flex items-center gap-1"
                        title="Reset Password"
                      >
                        <Key className="w-3 h-3" /> Reset Password
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`py-1 px-2.5 text-[11px] rounded-lg border font-medium transition-colors ${
                            u.isActive
                              ? 'border-red-200 text-[#C44536] hover:bg-red-50'
                              : 'border-green-200 text-[#4A7C59] hover:bg-green-50'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="card p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DCC8]">
              <h3 className="font-bold text-base text-[#3C2A20]">Add New Waiter Account</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C44536] p-3 rounded-lg text-xs">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="label-text">Full Name *</label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Thapa"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="label-text">Username *</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="e.g. ramesh"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="label-text">Password (min 6 chars) *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStaff}
                disabled={saving}
                className="btn-primary flex-1 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setResettingUser(null)}
        >
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DCC8]">
              <h3 className="font-bold text-base text-[#3C2A20]">Reset Password</h3>
              <button
                onClick={() => setResettingUser(null)}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#8B7355]">
              Setting new login password for <strong>{resettingUser.fullName}</strong> ({resettingUser.username}).
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C44536] p-2.5 rounded-lg text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="label-text">New Password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="input-field text-xs"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setResettingUser(null)}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={saving || newPassword.length < 6}
                className="btn-primary flex-1 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
