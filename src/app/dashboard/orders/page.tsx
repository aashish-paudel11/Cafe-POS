'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Plus, Search, Filter, Clock,
  CheckCircle2, XCircle, ArrowRight, Loader2, Calendar
} from 'lucide-react';

interface OrderItemSummary {
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

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'open' | 'all' | 'paid' | 'cancelled'>('open');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  async function loadOrders() {
    setLoading(true);
    try {
      const url = `/api/orders?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.tableName.toLowerCase().includes(query) ||
      (order.payment?.receiptNumber && order.payment.receiptNumber.toLowerCase().includes(query)) ||
      order.createdBy.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3C2A20]">Orders Management</h2>
          <p className="text-xs text-[#8B7355]">Manage active dine-in orders and settlements</p>
        </div>

        <button
          onClick={() => router.push('/dashboard/orders/new')}
          className="btn-primary flex items-center justify-center gap-2 text-sm py-2 px-4 font-bold"
        >
          <Plus className="w-4 h-4" /> Take New Order
        </button>
      </div>

      {/* Filter Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E8DCC8] w-fit">
          {[
            { id: 'open', label: 'Active Orders' },
            { id: 'all', label: 'All' },
            { id: 'paid', label: 'Paid' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#E5AE45] text-white shadow-sm'
                  : 'text-[#8B7355] hover:text-[#3C2A20]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7355]" />
          <input
            type="text"
            placeholder="Search by order#, table, waiter, or receipt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-xs py-2"
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-[#E8DCC8] mb-3" />
          <h3 className="text-base font-bold text-[#3C2A20]">No Orders Found</h3>
          <p className="text-xs text-[#8B7355] mt-1">
            {statusFilter === 'open'
              ? 'There are currently no active orders on tables.'
              : 'No orders match your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => router.push(`/dashboard/orders/${order.id}`)}
              className="card p-4 hover:shadow-md hover:border-[#E5AE45] cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-base text-[#3C2A20] group-hover:text-[#E5AE45] transition-colors">
                      {order.tableName}
                    </h4>
                    <span className="text-[11px] font-mono text-[#8B7355]">
                      {order.orderNumber}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
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

                <div className="text-xs text-[#8B7355] space-y-1 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>• {order.itemCount} items</span>
                  </div>
                  <p className="truncate">Waiter: {order.createdBy}</p>
                  {order.payment && (
                    <p className="text-[11px] text-[#4A7C59] font-medium">
                      Receipt: {order.payment.receiptNumber} ({order.payment.method.toUpperCase()})
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E8DCC8] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8B7355] block">
                    Total
                  </span>
                  <span className="font-bold text-base text-[#3C2A20]">
                    NPR {order.total.toFixed(2)}
                  </span>
                </div>

                <span className="text-xs font-semibold text-[#E5AE45] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
