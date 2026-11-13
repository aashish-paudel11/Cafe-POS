'use client';

import { useState, useEffect } from 'react';
import {
  User, Key, Shield, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';

interface ProfileData {
  userId: string;
  username: string;
  fullName: string;
  role: 'admin' | 'waiter';
}

export default function AccountPage() {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.isLoggedIn) setUser(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const d = await res.json();
      if (!res.ok) {
        setError(d.error || 'Failed to update password');
        return;
      }

      setMessage('Password changed successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#3C2A20]">My Account</h2>
        <p className="text-xs text-[#8B7355]">Manage your login credentials and profile details</p>
      </div>

      {/* Profile Overview Card */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#E5AE45] flex items-center justify-center text-white text-2xl font-bold">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-bold text-lg text-[#3C2A20]">{user.fullName}</h3>
          <p className="text-xs text-[#8B7355] font-mono">@{user.username}</p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-amber-100 text-[#E5AE45]'
              }`}
            >
              {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-base text-[#3C2A20] flex items-center gap-2 pb-2 border-b border-[#E8DCC8]">
          <Key className="w-4 h-4 text-[#E5AE45]" /> Change Password
        </h3>

        {message && (
          <div className="bg-green-50 border border-green-200 text-[#4A7C59] p-3 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-[#C44536] p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label-text">Current Password *</label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="input-field text-xs"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="label-text">New Password (min 6 characters) *</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="input-field text-xs"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="label-text">Confirm New Password *</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="input-field text-xs"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
