'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Grid3X3, DollarSign, ShoppingBag, TrendingUp,
  Loader2, ArrowRight, ClipboardList, CheckCircle2, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  role: 'admin' | 'waiter';
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  activeOrdersCount?: number;
  todaySales?: number;
  todayOrderCount?: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    tableName: string;
    status: string;
    total: number;
    itemCount: number;
    createdBy: string;
    createdAt: string;
  }>;
  bestSelling?: Array<{ name: string; quantity: number }>;
  dailySales?: Array<{ date: string; sales: number }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  // Stat Cards tailored to Role
  const stats =
    data.role === 'admin'
      ? [
          {
            label: "Today's Paid Sales",
            value: `NPR ${(data.todaySales || 0).toFixed(2)}`,
            icon: <DollarSign className="w-6 h-6" />,
            color: 'bg-green-50 text-[#4A7C59]',
          },
          {
            label: "Today's Settled Orders",
            value: data.todayOrderCount || 0,
            icon: <ShoppingBag className="w-6 h-6" />,
            color: 'bg-amber-50 text-[#E5AE45]',
          },
          {
            label: 'Occupied Tables',
            value: `${data.occupiedTables} / ${data.totalTables}`,
            icon: <Grid3X3 className="w-6 h-6" />,
            color: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Available Tables',
            value: data.availableTables,
            icon: <LayoutDashboard className="w-6 h-6" />,
            color: 'bg-emerald-50 text-emerald-600',
          },
        ]
      : [
          {
            label: 'Available Tables',
            value: data.availableTables,
            icon: <CheckCircle2 className="w-6 h-6" />,
            color: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Occupied Tables',
            value: data.occupiedTables,
            icon: <Clock className="w-6 h-6" />,
            color: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Active Orders',
            value: data.activeOrdersCount || 0,
            icon: <ClipboardList className="w-6 h-6" />,
            color: 'bg-amber-50 text-[#E5AE45]',
          },
          {
            label: 'Floor Seating Capacity',
            value: `${data.totalTables} Tables`,
            icon: <Grid3X3 className="w-6 h-6" />,
            color: 'bg-purple-50 text-purple-600',
          },
        ];

  return (
    <div className="space-y-6">
      {/* Waiter Prominent Floor Operations Banner */}
      {data.role === 'waiter' && (
        <div className="card p-6 bg-gradient-to-r from-amber-500/10 via-[#FFF8EB] to-amber-500/10 border-[#E5AE45]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#3C2A20]">Floor & Table Service</h2>
            <p className="text-xs text-[#8B7355] mt-1">
              Select an available table to take an order, or tap an occupied table to add food and drinks.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/tables')}
            className="btn-primary py-2.5 px-6 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <Grid3X3 className="w-4 h-4" /> Open Tables Screen <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#8B7355]">{stat.label}</p>
                <p className="text-xl font-black text-[#3C2A20] mt-0.5">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Charts and Best Sellers */}
      {data.role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales chart */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-base font-semibold text-[#3C2A20] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#E5AE45]" />
              Last 7 Days Revenue (Paid Sales)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailySales || []}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B7355' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8B7355' }} />
                  <Tooltip
                    formatter={(value: any) => [`NPR ${Number(value || 0).toFixed(2)}`, 'Sales']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E8DCC8' }}
                  />
                  <Bar dataKey="sales" fill="#E5AE45" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Best selling items */}
          <div className="card p-5">
            <h3 className="text-base font-semibold text-[#3C2A20] mb-4">🏆 Best Sellers (30 Days)</h3>
            {!data.bestSelling || data.bestSelling.length === 0 ? (
              <p className="text-xs text-[#8B7355]">No sales recorded yet</p>
            ) : (
              <ul className="space-y-3">
                {data.bestSelling.map((item, i) => (
                  <li key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#F2E8D5] text-xs flex items-center justify-center font-bold text-[#3C2A20]">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-[#3C2A20]">{item.name}</span>
                    </div>
                    <span className="font-bold text-[#8B7355]">{item.quantity} sold</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders List */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#3C2A20]">Recent Dine-In Orders</h3>
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="text-xs font-semibold text-[#E5AE45] hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data.recentOrders.length === 0 ? (
          <p className="text-xs text-[#8B7355]">No orders placed yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E8DCC8] text-[#8B7355]">
                  <th className="text-left py-2 px-3 font-semibold">Order Ref</th>
                  <th className="text-left py-2 px-3 font-semibold">Table</th>
                  <th className="text-left py-2 px-3 font-semibold">Status</th>
                  <th className="text-left py-2 px-3 font-semibold">Items</th>
                  {data.role === 'admin' && (
                    <th className="text-right py-2 px-3 font-semibold">Amount</th>
                  )}
                  <th className="text-left py-2 px-3 font-semibold">Taken By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DCC8]/50">
                {data.recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    className="hover:bg-gray-50/60 cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-[#3C2A20]">
                      {order.orderNumber}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{order.tableName}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                    <td className="py-2.5 px-3 text-[#8B7355]">{order.itemCount} items</td>
                    {data.role === 'admin' && (
                      <td className="py-2.5 px-3 text-right font-bold text-[#3C2A20]">
                        NPR {order.total.toFixed(2)}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-[#8B7355]">{order.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
