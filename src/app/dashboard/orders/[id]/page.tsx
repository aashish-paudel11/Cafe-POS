'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Minus, Trash2, Printer, CheckCircle,
  XCircle, Clock, User, AlertCircle, Loader2, CreditCard,
  QrCode, Banknote, HelpCircle, Utensils
} from 'lucide-react';
import ThermalReceipt from '@/components/ThermalReceipt';

interface OrderItem {
  id: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  notes: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  category: { id: string; name: string };
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  tableId: string;
  tableName: string;
  status: 'open' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: { fullName: string };
  createdBy: { id: string; fullName: string };
  updatedBy: { id: string; fullName: string };
  items: OrderItem[];
  total: number;
  payment?: {
    id: string;
    receiptNumber: string;
    amount: number;
    method: string;
    paidAt: string;
    cafeName: string;
    businessName: string;
    address: string;
    contactNumber: string;
    panLabel: string;
    panNumber: string;
    receiptFooter: string;
    taxNote: string;
    paidBy?: { fullName: string };
  };
  businessSettings?: {
    cafeName: string;
    businessName: string;
    address: string;
    contactNumber: string;
    panLabel: string;
    panNumber: string;
    receiptFooter: string;
    taxNote: string;
    receiptPaperSize: string;
  };
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Local items state for editing when open
  const [editableItems, setEditableItems] = useState<
    Array<{ menuItemId: string; itemName: string; unitPrice: number; quantity: number; notes: string }>
  >([]);

  // Modals
  const [showAddItem, setShowAddItem] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'card' | 'other'>('cash');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadOrder();
    fetch('/api/menu-items?availableOnly=true')
      .then((r) => r.json())
      .then((d) => setMenuItems(Array.isArray(d) ? d : []));
  }, [id]);

  async function loadOrder() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) {
        setError('Order not found');
        return;
      }
      const data: OrderDetail = await res.json();
      setOrder(data);
      setEditableItems(
        data.items.map((i) => ({
          menuItemId: i.menuItemId,
          itemName: i.itemName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          notes: i.notes || '',
        }))
      );
    } catch {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  function handleQuantityChange(menuItemId: string, delta: number) {
    if (order?.status !== 'open') return;
    setEditableItems((prev) =>
      prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as typeof prev
    );
  }

  function handleNotesChange(menuItemId: string, notes: string) {
    if (order?.status !== 'open') return;
    setEditableItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, notes } : i))
    );
  }

  function handleRemoveItem(menuItemId: string) {
    if (order?.status !== 'open') return;
    setEditableItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }

  function handleAddMenuItem(item: MenuItem) {
    if (order?.status !== 'open' || !item.isAvailable) return;
    setEditableItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          itemName: item.name,
          unitPrice: item.price,
          quantity: 1,
          notes: '',
        },
      ];
    });
    setShowAddItem(false);
  }

  async function handleSaveChanges() {
    if (order?.status !== 'open') return;
    if (editableItems.length === 0) {
      setError('An order must contain at least one item. Cancel the order instead if needed.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editableItems.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes,
          })),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to update order');
        return;
      }

      await loadOrder();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordPayment() {
    if (order?.status !== 'open') return;

    setPaying(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: paymentMethod }),
      });

      const d = await res.json();

      if (!res.ok) {
        setError(d.error || 'Failed to record payment');
        setPaying(false);
        return;
      }

      setShowBillModal(false);
      await loadOrder();
      setShowReceiptModal(true);
    } catch {
      setError('Network error during payment');
    } finally {
      setPaying(false);
    }
  }

  async function handleCancelOrder() {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancellation.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to cancel order');
        return;
      }

      setShowCancelModal(false);
      await loadOrder();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const currentTotal = editableItems.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  const hasUnsavedChanges =
    order?.status === 'open' &&
    JSON.stringify(editableItems) !==
      JSON.stringify(
        order.items.map((i) => ({
          menuItemId: i.menuItemId,
          itemName: i.itemName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          notes: i.notes || '',
        }))
      );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-[#C44536] mx-auto mb-2" />
        <h3 className="text-lg font-bold text-[#3C2A20]">Order Not Found</h3>
        <button onClick={() => router.push('/dashboard/orders')} className="btn-secondary mt-4">
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/tables')}
          className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tables
        </button>

        <div className="flex items-center gap-2">
          {order.status === 'open' && (
            <>
              <button
                onClick={() => {
                  setError('');
                  setCancelReason('');
                  setShowCancelModal(true);
                }}
                className="btn-danger py-1.5 px-3 text-xs"
              >
                Cancel Order
              </button>
              <button
                onClick={() => setShowBillModal(true)}
                className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> View Bill & Pay
              </button>
            </>
          )}

          {order.status === 'paid' && (
            <button
              onClick={() => setShowReceiptModal(true)}
              className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Reprint Paid Receipt
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#C44536] p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Order Summary Card */}
      <div className="card p-6 space-y-6">
        {/* Order Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E8DCC8]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[#3C2A20]">{order.tableName}</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  order.status === 'open'
                    ? 'bg-blue-100 text-blue-700'
                    : order.status === 'paid'
                    ? 'bg-green-100 text-[#4A7C59]'
                    : 'bg-red-100 text-[#C44536]'
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-[#8B7355] mt-1 font-mono">
              Ref: {order.orderNumber}
              {order.payment && ` | Receipt: ${order.payment.receiptNumber}`}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-[#8B7355] space-y-1">
            <div className="flex sm:justify-end items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Created: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex sm:justify-end items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>By: {order.createdBy.fullName}</span>
            </div>
          </div>
        </div>

        {/* Cancellation Banner */}
        {order.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-[#C44536] space-y-1">
            <p className="font-bold uppercase tracking-wide">Order Cancelled</p>
            <p>Reason: {order.cancelReason || 'No reason specified'}</p>
            {order.cancelledBy && <p>Cancelled by: {order.cancelledBy.fullName}</p>}
          </div>
        )}

        {/* Paid Details Banner */}
        {order.status === 'paid' && order.payment && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-xs text-[#4A7C59] flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Settled via {order.payment.method.toUpperCase()}</p>
              <p className="mt-0.5">
                Paid on {new Date(order.payment.paidAt).toLocaleString()}
              </p>
            </div>
            <span className="text-base font-bold">
              NPR {order.payment.amount.toFixed(2)}
            </span>
          </div>
        )}

        {/* Ordered Items Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base text-[#3C2A20]">Ordered Items</h3>
            {order.status === 'open' && (
              <button
                onClick={() => setShowAddItem(true)}
                className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Food/Drink
              </button>
            )}
          </div>

          <div className="border border-[#E8DCC8] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FFF8EB] border-b border-[#E8DCC8] text-[#8B7355] text-xs">
                <tr>
                  <th className="py-2.5 px-4 text-left">Item Name</th>
                  <th className="py-2.5 px-3 text-center w-28">Quantity</th>
                  <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                  <th className="py-2.5 px-4 text-right w-28">Total</th>
                  {order.status === 'open' && <th className="py-2.5 px-3 w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DCC8]/60">
                {editableItems.map((item) => (
                  <tr key={item.menuItemId} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#3C2A20]">{item.itemName}</p>
                      {order.status === 'open' ? (
                        <input
                          type="text"
                          placeholder="Add cooking note..."
                          value={item.notes}
                          onChange={(e) => handleNotesChange(item.menuItemId, e.target.value)}
                          className="mt-1 text-xs w-full max-w-xs px-2 py-0.5 border border-[#E8DCC8] rounded text-[#8B7355]"
                        />
                      ) : (
                        item.notes && <p className="text-xs text-[#8B7355] italic">{item.notes}</p>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {order.status === 'open' ? (
                        <div className="inline-flex items-center gap-1.5 border border-[#E8DCC8] rounded px-1.5 py-0.5 bg-white">
                          <button
                            onClick={() => handleQuantityChange(item.menuItemId, -1)}
                            className="p-0.5 hover:text-[#C44536]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.menuItemId, 1)}
                            className="p-0.5 hover:text-[#4A7C59]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-semibold">{item.quantity}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right text-[#8B7355]">
                      NPR {item.unitPrice.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-[#3C2A20]">
                      NPR {(item.unitPrice * item.quantity).toFixed(2)}
                    </td>

                    {order.status === 'open' && (
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.menuItemId)}
                          className="text-[#8B7355] hover:text-[#C44536]"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unsaved Changes Bar */}
        {hasUnsavedChanges && (
          <div className="bg-amber-50 border border-[#E5AE45] rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8B7355]">
              You have unsaved changes to this order.
            </span>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Updates
            </button>
          </div>
        )}

        {/* Bill Total Footer */}
        <div className="pt-4 border-t border-[#E8DCC8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-[#8B7355]">
            All prices are tax-inclusive. No additional surcharge is applied.
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <span className="text-sm font-semibold text-[#8B7355]">Total Payable:</span>
            <span className="text-2xl font-black text-[#E5AE45]">
              NPR {currentTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddItem(false)}
        >
          <div
            className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#3C2A20]">Add More Items</h3>
              <button
                onClick={() => setShowAddItem(false)}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddMenuItem(item)}
                  className="card p-3 border hover:border-[#E5AE45] cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-semibold text-xs text-[#3C2A20]">{item.name}</h5>
                    <p className="text-[10px] text-[#8B7355]">{item.category.name}</p>
                    <p className="text-xs font-bold text-[#E5AE45] mt-1">
                      NPR {item.price.toFixed(2)}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-[#E5AE45]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview & Payment Modal */}
      {showBillModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowBillModal(false)}
        >
          <div
            className="card p-6 w-full max-w-md space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8DCC8] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#3C2A20]">Settle Bill & Payment</h3>
                <p className="text-xs text-[#8B7355]">Table: {order.tableName}</p>
              </div>
              <button
                onClick={() => setShowBillModal(false)}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                ✕
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-[#FFF8EB] p-4 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between text-[#8B7355]">
                <span>Total Items:</span>
                <span>{editableItems.reduce((acc, i) => acc + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-[#3C2A20] border-t border-[#E8DCC8] pt-2">
                <span>Total Amount:</span>
                <span className="text-[#E5AE45]">NPR {currentTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="label-text">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'qr', label: 'QR Payment', icon: QrCode },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'other', label: 'Other', icon: HelpCircle },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === m.id
                          ? 'border-[#E5AE45] bg-[#FFF8EB] text-[#E5AE45]'
                          : 'border-[#E8DCC8] bg-white text-[#3C2A20]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Action */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowBillModal(false)}
                className="btn-secondary flex-1 text-xs"
              >
                Back
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={paying}
                className="btn-primary flex-1 text-xs font-bold flex items-center justify-center gap-2"
              >
                {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Payment & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCancelModal(false)}
        >
          <div className="card p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-[#C44536]">Cancel Active Order</h3>
            <p className="text-xs text-[#8B7355]">
              Please state why this order is being cancelled. This will be permanently recorded in history.
            </p>
            <div>
              <label className="label-text">Reason for Cancellation *</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer changed mind, entered wrong table..."
                className="input-field text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelModal(false)} className="btn-secondary flex-1 text-xs">
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={saving || !cancelReason.trim()}
                className="btn-danger flex-1 text-xs flex items-center justify-center gap-1"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {showReceiptModal && (
        <ThermalReceipt
          type={order.status === 'paid' ? 'receipt' : 'bill'}
          receiptNumber={order.payment?.receiptNumber}
          orderNumber={order.orderNumber}
          tableName={order.tableName}
          waiterName={order.payment?.paidBy?.fullName || order.createdBy.fullName}
          createdAt={order.createdAt}
          paidAt={order.payment?.paidAt}
          paymentMethod={order.payment?.method || paymentMethod}
          items={order.items.map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))}
          total={order.payment?.amount || currentTotal}
          business={{
            cafeName: order.payment?.cafeName || order.businessSettings?.cafeName || 'Cafe POS',
            businessName: order.payment?.businessName || order.businessSettings?.businessName,
            address: order.payment?.address || order.businessSettings?.address,
            contactNumber: order.payment?.contactNumber || order.businessSettings?.contactNumber,
            panLabel: order.payment?.panLabel || order.businessSettings?.panLabel,
            panNumber: order.payment?.panNumber || order.businessSettings?.panNumber,
            receiptFooter: order.payment?.receiptFooter || order.businessSettings?.receiptFooter,
            taxNote: order.payment?.taxNote || order.businessSettings?.taxNote,
            receiptPaperSize: order.businessSettings?.receiptPaperSize || '80mm',
          }}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
