'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  History, Search, Filter, Calendar, Printer,
  Eye, Loader2, ArrowRight, X, Clock
} from 'lucide-react';
import ThermalReceipt from '@/components/ThermalReceipt';

interface HistoricalOrder {
  id: string;
  orderNumber: string;
  tableId: string;
  tableName: string;
  status: 'open' | 'paid' | 'cancelled';
  createdAt: string;
  itemCount: number;
  total: number;
  createdBy: string;
  payment?: {
    receiptNumber: string;
    amount: number;
    method: string;
    paidAt: string;
  } | null;
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<HistoricalOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all'); // today, 7days, 30days, all
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, dateRange]);

  async function loadOrders() {
    setLoading(true);
    try {
      let query = `/api/orders?status=${statusFilter}`;

      const now = new Date();
      if (dateRange === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        query += `&startDate=${start.toISOString()}`;
      } else if (dateRange === '7days') {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        query += `&startDate=${start.toISOString()}`;
      } else if (dateRange === '30days') {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        query += `&startDate=${start.toISOString()}`;
      }

      const res = await fetch(query);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrintReceipt(orderId: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const fullOrder = await res.json();
        setSelectedReceipt(fullOrder);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.tableName.toLowerCase().includes(q) ||
      (order.payment?.receiptNumber && order.payment.receiptNumber.toLowerCase().includes(q)) ||
      order.createdBy.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3C2A20]">Order History</h2>
          <p className="text-xs text-[#8B7355]">
            Archive of all dine-in orders, payments, and cancellations
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7355]" />
            <input
              type="text"
              placeholder="Search order#, receipt#, table, waiter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs py-2"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs py-2"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid & Settled</option>
              <option value="open">Active / Open</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-field text-xs py-2"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card p-12 text-center text-[#8B7355]">
          <History className="w-12 h-12 mx-auto text-[#E8DCC8] mb-3" />
          <h3 className="text-base font-bold text-[#3C2A20]">No Historical Orders</h3>
          <p className="text-xs mt-1">Try adjusting your filters or date range.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FFF8EB] border-b border-[#E8DCC8] text-[#8B7355] font-semibold">
                <tr>
                  <th className="py-3 px-4 text-left">Order Ref</th>
                  <th className="py-3 px-3 text-left">Receipt No</th>
                  <th className="py-3 px-3 text-left">Table</th>
                  <th className="py-3 px-3 text-left">Date & Time</th>
                  <th className="py-3 px-3 text-left">Waiter</th>
                  <th className="py-3 px-3 text-left">Status</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DCC8]/50">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-[#3C2A20]">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#8B7355]">
                      {order.payment?.receiptNumber || '—'}
                    </td>
                    <td className="py-3 px-3 font-semibold">{order.tableName}</td>
                    <td className="py-3 px-3 text-[#8B7355]">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">{order.createdBy}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.status === 'open'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'paid'
                            ? 'bg-green-100 text-[#4A7C59]'
                            : 'bg-red-100 text-[#C44536]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#3C2A20]">
                      NPR {order.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                          className="btn-secondary py-1 px-2 text-[11px] inline-flex items-center gap-1"
                          title="View Order Details"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {order.status === 'paid' && (
                          <button
                            onClick={() => handlePrintReceipt(order.id)}
                            className="btn-secondary py-1 px-2 text-[11px] inline-flex items-center gap-1"
                            title="Reprint Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#E5AE45]" /> Receipt
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
      )}

      {/* Reprint Receipt Modal */}
      {selectedReceipt && (
        <ThermalReceipt
          type="receipt"
          receiptNumber={selectedReceipt.payment?.receiptNumber}
          orderNumber={selectedReceipt.orderNumber}
          tableName={selectedReceipt.tableName}
          waiterName={selectedReceipt.payment?.paidBy?.fullName || selectedReceipt.createdBy.fullName}
          createdAt={selectedReceipt.createdAt}
          paidAt={selectedReceipt.payment?.paidAt}
          paymentMethod={selectedReceipt.payment?.method}
          items={selectedReceipt.items.map((i: any) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))}
          total={selectedReceipt.payment?.amount || selectedReceipt.total}
          business={{
            cafeName: selectedReceipt.payment?.cafeName || selectedReceipt.businessSettings?.cafeName || 'Cafe POS',
            businessName: selectedReceipt.payment?.businessName || selectedReceipt.businessSettings?.businessName,
            address: selectedReceipt.payment?.address || selectedReceipt.businessSettings?.address,
            contactNumber: selectedReceipt.payment?.contactNumber || selectedReceipt.businessSettings?.contactNumber,
            panLabel: selectedReceipt.payment?.panLabel || selectedReceipt.businessSettings?.panLabel,
            panNumber: selectedReceipt.payment?.panNumber || selectedReceipt.businessSettings?.panNumber,
            receiptFooter: selectedReceipt.payment?.receiptFooter || selectedReceipt.businessSettings?.receiptFooter,
            taxNote: selectedReceipt.payment?.taxNote || selectedReceipt.businessSettings?.taxNote,
            receiptPaperSize: selectedReceipt.businessSettings?.receiptPaperSize || '80mm',
          }}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
