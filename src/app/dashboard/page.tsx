'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Grid3X3, DollarSign, ShoppingBag, TrendingUp, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  todaySales: number;
  todayOrderCount: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    tableName: string;
    status: string;
    total: number;
    createdBy: string;
    createdAt: string;
  }>;
  bestSelling: Array<{ name: string; quantity: number }>;
  dailySales: Array<{ date: string; sales: number }>;
  role: string;
}

export default function DashboardPage() {
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

  const stats = [
    {
      label: "Today's Sales",
      value: `NPR ${data.todaySales.toFixed(2)}`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-50 text-[#4A7C59]',
    },
    {
      label: "Today's Orders",
      value: data.todayOrderCount,
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
  ];

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-[#8B7355]">{stat.label}</p>
                <p className="text-xl font-bold text-[#3C2A20]">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales chart */}
        {data.role === 'admin' && (
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-base font-semibold text-[#3C2A20] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#E5AE45]" />
              Last 7 Days Sales
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailySales}>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#8B7355' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#8B7355' }} />
                  <Tooltip
                    formatter={(value: any) => [`NPR ${Number(value || 0).toFixed(2)}`, 'Sales']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E8DCC8' }}
                  />
                  <Bar dataKey="sales" fill="#E5AE45" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Best selling items */}
        <div className="card p-5">
          <h3 className="text-base font-semibold text-[#3C2A20] mb-4">🏆 Best Sellers</h3>
          {data.bestSelling.length === 0 ? (
            <p className="text-sm text-[#8B7355]">No sales data yet</p>
          ) : (
            <ul className="space-y-3">
              {data.bestSelling.map((item, i) => (
                <li key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F2E8D5] text-xs flex items-center justify-center font-semibold text-[#3C2A20]">
                      {i + 1}
                    </span>
                    <span className="text-sm text-[#3C2A20]">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-[#8B7355]">{item.quantity} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <h3 className="text-base font-semibold text-[#3C2A20] mb-4">Recent Orders</h3>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-[#8B7355]">No orders yet. Start by creating tables and taking orders!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8DCC8]">
                  <th className="text-left py-2 px-3 text-[#8B7355] font-medium">Order #</th>
                  <th className="text-left py-2 px-3 text-[#8B7355] font-medium">Table</th>
                  <th className="text-left py-2 px-3 text-[#8B7355] font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-[#8B7355] font-medium">Total</th>
                  <th className="text-left py-2 px-3 text-[#8B7355] font-medium hidden sm:table-cell">By</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[#E8DCC8]/50">
                    <td className="py-2.5 px-3 font-medium">{order.orderNumber}</td>
                    <td className="py-2.5 px-3">{order.tableName}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'open'
                            ? 'bg-blue-50 text-blue-700'
                            : order.status === 'paid'
                            ? 'bg-green-50 text-[#4A7C59]'
                            : 'bg-red-50 text-[#C44536]'
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">NPR {order.total.toFixed(2)}</td>
                    <td className="py-2.5 px-3 hidden sm:table-cell text-[#8B7355]">{order.createdBy}</td>
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
