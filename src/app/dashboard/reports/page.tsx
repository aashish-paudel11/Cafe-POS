'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, Download, Calendar, DollarSign, ShoppingBag,
  TrendingUp, CreditCard, Banknote, QrCode, Loader2, ArrowUpRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ReportData {
  totalSales: number;
  paidOrdersCount: number;
  salesByMethod: {
    cash: { count: number; total: number };
    qr: { count: number; total: number };
    card: { count: number; total: number };
    other: { count: number; total: number };
  };
  bestSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  timeline: Array<{ date: string; amount: number }>;
  exportRows: Array<{
    receiptNumber: string;
    orderNumber: string;
    tableName: string;
    paidAt: string;
    method: string;
    amount: number;
    settledBy: string;
    itemCount: number;
  }>;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [period]);

  async function loadReport() {
    setLoading(true);
    try {
      let url = `/api/reports?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const report = await res.json();
        setData(report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    if (!data || !data.exportRows || data.exportRows.length === 0) {
      alert('No sales data available to export for this period.');
      return;
    }

    const headers = [
      'Receipt Number',
      'Order Number',
      'Table',
      'Paid Date & Time',
      'Payment Method',
      'Items Count',
      'Amount (NPR)',
      'Settled By',
    ];

    const rows = data.exportRows.map((r) => [
      `"${r.receiptNumber}"`,
      `"${r.orderNumber}"`,
      `"${r.tableName}"`,
      `"${new Date(r.paidAt).toLocaleString()}"`,
      `"${r.method.toUpperCase()}"`,
      r.itemCount,
      r.amount.toFixed(2),
      `"${r.settledBy}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cafe-sales-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const averageOrderValue =
    data && data.paidOrdersCount > 0
      ? data.totalSales / data.paidOrdersCount
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3C2A20]">Sales Analytics & Reports</h2>
          <p className="text-xs text-[#8B7355]">
            Comprehensive breakdown of settled revenue, payment channels, and item volume
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={!data || data.exportRows?.length === 0}
          className="btn-secondary flex items-center justify-center gap-2 text-xs py-2 px-4 font-semibold"
        >
          <Download className="w-4 h-4 text-[#E5AE45]" /> Export CSV
        </button>
      </div>

      {/* Period Filter Bar */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[#FFF8EB] p-1 rounded-xl border border-[#E8DCC8]">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'custom', label: 'Custom Range' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === btn.id
                  ? 'bg-[#E5AE45] text-white shadow-sm'
                  : 'text-[#8B7355] hover:text-[#3C2A20]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field text-xs py-1.5 px-2"
            />
            <span className="text-xs text-[#8B7355]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field text-xs py-1.5 px-2"
            />
            <button onClick={loadReport} className="btn-primary text-xs py-1.5 px-3">
              Filter
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
        </div>
      ) : !data ? (
        <div className="card p-8 text-center text-[#8B7355]">Failed to load sales report</div>
      ) : (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 border-l-4 border-l-[#E5AE45]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#8B7355]">Total Paid Sales</p>
                  <p className="text-2xl font-black text-[#3C2A20] mt-1">
                    NPR {data.totalSales.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#E5AE45]">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card p-5 border-l-4 border-l-[#4A7C59]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#8B7355]">Settled Orders</p>
                  <p className="text-2xl font-black text-[#3C2A20] mt-1">
                    {data.paidOrdersCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-[#4A7C59]">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card p-5 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#8B7355]">Average Order Value</p>
                  <p className="text-2xl font-black text-[#3C2A20] mt-1">
                    NPR {averageOrderValue.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="card p-5">
            <h3 className="font-bold text-base text-[#3C2A20] mb-4">Payment Method Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Cash', data: data.salesByMethod.cash, icon: Banknote },
                { label: 'QR Payment', data: data.salesByMethod.qr, icon: QrCode },
                { label: 'Card', data: data.salesByMethod.card, icon: CreditCard },
                { label: 'Other', data: data.salesByMethod.other, icon: ArrowUpRight },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="p-4 rounded-xl border border-[#E8DCC8] bg-[#FFF8EB]/30">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#8B7355] mb-2">
                      <Icon className="w-4 h-4 text-[#E5AE45]" />
                      <span>{m.label}</span>
                    </div>
                    <p className="text-lg font-bold text-[#3C2A20]">
                      NPR {m.data?.total.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-[11px] text-[#8B7355] mt-0.5">
                      {m.data?.count || 0} transaction(s)
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Chart and Best Sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <div className="card p-5">
              <h3 className="font-bold text-base text-[#3C2A20] mb-4">Sales Daily Distribution</h3>
              {data.timeline.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-[#8B7355]">
                  No sales timeline points in this period
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.timeline}>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B7355' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8B7355' }} />
                      <Tooltip
                        formatter={(val: any) => [`NPR ${Number(val || 0).toFixed(2)}`, 'Sales']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E8DCC8' }}
                      />
                      <Bar dataKey="amount" fill="#E5AE45" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Best Sellers */}
            <div className="card p-5">
              <h3 className="font-bold text-base text-[#3C2A20] mb-4">Top 10 Best Selling Items</h3>
              {data.bestSellingItems.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-[#8B7355]">
                  No item sales recorded
                </div>
              ) : (
                <div className="overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#FFF8EB] border-b border-[#E8DCC8] text-[#8B7355] sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left">Item</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8DCC8]/50">
                      {data.bestSellingItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-[#3C2A20]">{item.name}</td>
                          <td className="py-2 px-2 text-center font-bold text-[#8B7355]">{item.quantity}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#3C2A20]">
                            NPR {item.revenue.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
