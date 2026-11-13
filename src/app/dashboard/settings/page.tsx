'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Building2, Receipt, Globe, Save,
  CheckCircle2, Loader2, AlertCircle, FileText
} from 'lucide-react';

interface SettingsData {
  cafeName: string;
  businessName: string;
  address: string;
  contactNumber: string;
  email: string;
  panLabel: string;
  panNumber: string;
  currency: string;
  timezone: string;
  receiptPaperSize: '58mm' | '80mm';
  receiptFooter: string;
  taxNote: string;
  logoUrl: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsData>({
    cafeName: 'My Cafe',
    businessName: '',
    address: '',
    contactNumber: '',
    email: '',
    panLabel: 'PAN No.',
    panNumber: '',
    currency: 'NPR',
    timezone: 'Asia/Kathmandu',
    receiptPaperSize: '80mm',
    receiptFooter: 'Thank you for visiting!',
    taxNote: 'All prices are inclusive of applicable taxes.',
    logoUrl: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data) setForm(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to save settings');
        return;
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3C2A20]">Business Settings</h2>
          <p className="text-xs text-[#8B7355]">
            Configure cafe branding, PAN tax information, and receipt printing layouts
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center justify-center gap-2 text-xs py-2.5 px-5 font-bold shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving Changes...' : 'Save Settings'}
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-green-50 border border-green-200 text-[#4A7C59] p-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Business settings saved successfully. Future receipts will reflect these details.</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#C44536] p-3 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Cafe Information */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-sm text-[#3C2A20] flex items-center gap-2 pb-2 border-b border-[#E8DCC8]">
            <Building2 className="w-4 h-4 text-[#E5AE45]" /> Cafe & Legal Entity
          </h3>

          <div>
            <label className="label-text">Cafe Name (Display on receipts) *</label>
            <input
              type="text"
              value={form.cafeName}
              onChange={(e) => setForm({ ...form, cafeName: e.target.value })}
              className="input-field text-xs"
              placeholder="e.g. Himalayan Beans Cafe"
            />
          </div>

          <div>
            <label className="label-text">Business / Legal Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="input-field text-xs"
              placeholder="e.g. Himalayan Beans Pvt. Ltd."
            />
          </div>

          <div>
            <label className="label-text">Business Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field text-xs"
              placeholder="e.g. Ward No. 6, Lakeside, Pokhara"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Contact Number</label>
              <input
                type="text"
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                className="input-field text-xs"
                placeholder="+977-9800000000"
              />
            </div>
            <div>
              <label className="label-text">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field text-xs"
                placeholder="contact@cafe.com"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Tax Credentials & Print Layout */}
        <div className="space-y-6">
          {/* Tax / PAN */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#3C2A20] flex items-center gap-2 pb-2 border-b border-[#E8DCC8]">
              <FileText className="w-4 h-4 text-[#E5AE45]" /> PAN / Tax Details
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Tax Label</label>
                <input
                  type="text"
                  value={form.panLabel}
                  onChange={(e) => setForm({ ...form, panLabel: e.target.value })}
                  className="input-field text-xs"
                  placeholder="PAN No. or VAT"
                />
              </div>
              <div>
                <label className="label-text">PAN / VAT Number</label>
                <input
                  type="text"
                  value={form.panNumber}
                  onChange={(e) => setForm({ ...form, panNumber: e.target.value })}
                  className="input-field text-xs font-mono"
                  placeholder="e.g. 609823412"
                />
              </div>
            </div>
          </div>

          {/* Thermal Receipt Settings */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#3C2A20] flex items-center gap-2 pb-2 border-b border-[#E8DCC8]">
              <Receipt className="w-4 h-4 text-[#E5AE45]" /> Thermal Printer Specifications
            </h3>

            <div>
              <label className="label-text">Receipt Paper Size</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: '80mm', label: '80 mm (Standard POS)' },
                  { id: '58mm', label: '58 mm (Compact Roll)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm({ ...form, receiptPaperSize: s.id as any })}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                      form.receiptPaperSize === s.id
                        ? 'border-[#E5AE45] bg-[#FFF8EB] text-[#E5AE45]'
                        : 'border-[#E8DCC8] bg-white text-[#3C2A20]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label-text">Receipt Footer Message</label>
              <input
                type="text"
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                className="input-field text-xs"
                placeholder="e.g. Thank you for dining with us! Come again."
              />
            </div>

            <div>
              <label className="label-text">Tax-Inclusive Pricing Note</label>
              <input
                type="text"
                value={form.taxNote}
                onChange={(e) => setForm({ ...form, taxNote: e.target.value })}
                className="input-field text-xs"
                placeholder="All prices are inclusive of applicable taxes."
              />
            </div>
          </div>

          {/* Regional Settings */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#3C2A20] flex items-center gap-2 pb-2 border-b border-[#E8DCC8]">
              <Globe className="w-4 h-4 text-[#E5AE45]" /> Regional & Currency
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="input-field text-xs font-bold"
                />
              </div>
              <div>
                <label className="label-text">Timezone</label>
                <input
                  type="text"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="input-field text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
