'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt, Printer, Search, DollarSign, CheckCircle2,
  Clock, ArrowRight, Loader2, CreditCard, Banknote, QrCode
} from 'lucide-react';
import ThermalReceipt from '@/components/ThermalReceipt';

interface OpenBill {
  id: string;
  orderNumber: string;
  tableName: string;
  total: number;
  itemCount: number;
  createdAt: string;
  createdBy: string;
}

interface PaidTransaction {
  id: string;
  orderNumber: string;
  tableName: string;
  total: number;
  createdAt: string;
  createdBy: string;
  payment: {
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
  };
  items: Array<{ itemName: string; quantity: number; unitPrice: number }>;
}

export default function BillingPage() {
  const router = useRouter();
  const [openBills, setOpenBills] = useState<OpenBill[]>([]);
  const [paidTransactions, setPaidTransactions] = useState<PaidTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<PaidTransaction | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    setLoading(true);
    try {
      const [openRes, paidRes] = await Promise.all([
        fetch('/api/orders?status=open'),
        fetch('/api/orders?status=paid'),
      ]);

      const openData = await openRes.json();
      const paidData = await paidRes.json();

      setOpenBills(Array.isArray(openData) ? openData : []);
      // For paid transactions, fetch full details for reprinting
      const detailedPaid: PaidTransaction[] = [];
      if (Array.isArray(paidData)) {
        for (const p of paidData.slice(0, 20)) {
          const detailRes = await fetch(`/api/orders/${p.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            detailedPaid.push(detail);
          }
        }
      }
      setPaidTransactions(detailedPaid);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const todayTotal = paidTransactions.reduce(
    (sum, t) => sum + (t.payment?.amount || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3C2A20]">Billing & Cash Register</h2>
          <p className="text-xs text-[#8B7355]">
            Settle active table bills, record payments, and print customer receipts
          </p>
        </div>

        <div className="card p-3 px-5 flex items-center gap-3 bg-amber-50/70 border-amber-200">
          <div className="w-10 h-10 rounded-lg bg-[#E5AE45] flex items-center justify-center text-white font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#8B7355]">Settled Sales Loaded</p>
            <p className="text-lg font-bold text-[#3C2A20]">NPR {todayTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Pending Settlement Cards */}
      <div>
        <h3 className="font-bold text-base text-[#3C2A20] mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#E5AE45]" /> Tables Awaiting Settlement ({openBills.length})
        </h3>

        {openBills.length === 0 ? (
          <div className="card p-8 text-center text-[#8B7355] text-xs">
            No active open bills. All current tables are either settled or available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {openBills.map((bill) => (
              <div
                key={bill.id}
                className="card p-4 border-l-4 border-l-[#E5AE45] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-base text-[#3C2A20]">{bill.tableName}</h4>
                    <span className="text-xs font-mono text-[#8B7355]">{bill.orderNumber}</span>
                  </div>
                  <div className="text-xs text-[#8B7355] mt-2 space-y-0.5">
                    <p>{bill.itemCount} item(s) ordered</p>
                    <p>Waiter: {bill.createdBy}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E8DCC8] flex items-center justify-between">
                  <span className="font-bold text-base text-[#3C2A20]">
                    NPR {bill.total.toFixed(2)}
                  </span>
                  <button
                    onClick={() => router.push(`/dashboard/orders/${bill.id}`)}
                    className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 font-bold"
                  >
                    Settle Bill <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Finalized Receipts */}
      <div>
        <h3 className="font-bold text-base text-[#3C2A20] mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4A7C59]" /> Recently Settled Receipts
        </h3>

        {paidTransactions.length === 0 ? (
          <div className="card p-8 text-center text-[#8B7355] text-xs">
            No paid transactions recorded yet.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#FFF8EB] border-b border-[#E8DCC8] text-[#8B7355] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Receipt #</th>
                    <th className="py-2.5 px-3 text-left">Table</th>
                    <th className="py-2.5 px-3 text-left">Method</th>
                    <th className="py-2.5 px-3 text-left">Settled Date & Time</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DCC8]/50">
                  {paidTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-[#3C2A20]">
                        {tx.payment?.receiptNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-3 font-semibold">{tx.tableName}</td>
                      <td className="py-3 px-3 uppercase font-semibold text-[#8B7355]">
                        {tx.payment?.method || 'CASH'}
                      </td>
                      <td className="py-3 px-3 text-[#8B7355]">
                        {tx.payment ? new Date(tx.payment.paidAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#3C2A20]">
                        NPR {tx.payment?.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedReceipt(tx)}
                          className="btn-secondary py-1 px-2.5 text-[11px] inline-flex items-center gap-1 font-medium"
                          title="Reprint Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reprint Thermal Receipt Modal */}
      {selectedReceipt && (
        <ThermalReceipt
          type="receipt"
          receiptNumber={selectedReceipt.payment?.receiptNumber}
          orderNumber={selectedReceipt.orderNumber}
          tableName={selectedReceipt.tableName}
          waiterName={selectedReceipt.createdBy}
          createdAt={selectedReceipt.createdAt}
          paidAt={selectedReceipt.payment?.paidAt}
          paymentMethod={selectedReceipt.payment?.method}
          items={selectedReceipt.items.map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))}
          total={selectedReceipt.payment?.amount || selectedReceipt.total}
          business={{
            cafeName: selectedReceipt.payment?.cafeName || 'Cafe POS',
            businessName: selectedReceipt.payment?.businessName,
            address: selectedReceipt.payment?.address,
            contactNumber: selectedReceipt.payment?.contactNumber,
            panLabel: selectedReceipt.payment?.panLabel,
            panNumber: selectedReceipt.payment?.panNumber,
            receiptFooter: selectedReceipt.payment?.receiptFooter,
            taxNote: selectedReceipt.payment?.taxNote,
            receiptPaperSize: '80mm',
          }}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
