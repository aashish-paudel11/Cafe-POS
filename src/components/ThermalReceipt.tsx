'use client';

import { Printer, X } from 'lucide-react';

export interface ReceiptItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
}

export interface ReceiptProps {
  type: 'bill' | 'receipt';
  receiptNumber?: string;
  orderNumber: string;
  tableName: string;
  waiterName: string;
  createdAt: string | Date;
  paidAt?: string | Date;
  paymentMethod?: string;
  items: ReceiptItem[];
  total: number;
  business: {
    cafeName: string;
    businessName?: string;
    address?: string;
    contactNumber?: string;
    panLabel?: string;
    panNumber?: string;
    receiptFooter?: string;
    taxNote?: string;
    receiptPaperSize?: string;
  };
  onClose?: () => void;
}

export default function ThermalReceipt({
  type,
  receiptNumber,
  orderNumber,
  tableName,
  waiterName,
  createdAt,
  paidAt,
  paymentMethod,
  items,
  total,
  business,
  onClose,
}: ReceiptProps) {
  const is58mm = business.receiptPaperSize === '58mm';
  const widthClass = is58mm ? 'max-w-[320px]' : 'max-w-[420px]';

  const dateObj = new Date(paidAt || createdAt);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Printable Area Container */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-h-[90vh] flex flex-col items-center p-6 max-w-lg">
        {/* Modal Controls (Not printed) */}
        <div className="no-print w-full flex items-center justify-between pb-4 mb-4 border-b border-[#E8DCC8]">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                type === 'receipt'
                  ? 'bg-green-100 text-[#4A7C59]'
                  : 'bg-amber-100 text-[#E5AE45]'
              }`}
            >
              {type === 'receipt' ? 'Paid Receipt' : 'Unpaid Bill'}
            </span>
            <span className="text-xs text-[#8B7355]">
              Paper: {is58mm ? '58 mm' : '80 mm'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-[#8B7355] hover:text-[#3C2A20] rounded-lg hover:bg-[#F2E8D5]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Thermal Slip */}
        <div
          id="thermal-receipt"
          className={`w-full ${widthClass} mx-auto bg-white p-4 font-mono text-xs text-[#1A1A1A] border border-dashed border-gray-300 rounded shadow-sm print:border-none print:shadow-none print:p-0 print:m-0`}
        >
          {/* Header */}
          <div className="text-center pb-2">
            <h2 className="text-base font-bold uppercase tracking-wider text-black">
              {business.cafeName || 'CAFE POS'}
            </h2>
            {business.businessName && business.businessName !== business.cafeName && (
              <p className="text-[11px] text-gray-700">{business.businessName}</p>
            )}
            {business.address && (
              <p className="text-[11px] text-gray-700 whitespace-pre-line">{business.address}</p>
            )}
            {business.contactNumber && (
              <p className="text-[11px] text-gray-700">Tel: {business.contactNumber}</p>
            )}
            {business.panNumber && (
              <p className="text-[11px] font-semibold text-gray-900 mt-0.5">
                {business.panLabel || 'PAN'}: {business.panNumber}
              </p>
            )}
          </div>

          {/* Type Banner */}
          <div className="text-center my-1 border-t border-b border-dashed border-gray-500 py-1">
            <span className="font-extrabold uppercase text-[13px] tracking-widest">
              {type === 'receipt' ? '*** TAX INVOICE / RECEIPT ***' : '*** PROVISIONAL BILL ***'}
            </span>
          </div>

          {/* Order Details */}
          <div className="py-2 space-y-0.5 text-[11px]">
            {type === 'receipt' && receiptNumber && (
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <span className="font-bold">{receiptNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Order Ref:</span>
              <span>{orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Table:</span>
              <span className="font-bold">{tableName}</span>
            </div>
            <div className="flex justify-between">
              <span>Waiter:</span>
              <span>{waiterName}</span>
            </div>
          </div>

          {/* Item Table Header */}
          <div className="border-t border-b border-gray-800 py-1 my-1 flex justify-between font-bold text-[11px]">
            <span className="flex-1">ITEM</span>
            <span className="w-10 text-center">QTY</span>
            <span className="w-14 text-right">RATE</span>
            <span className="w-16 text-right">AMOUNT</span>
          </div>

          {/* Items */}
          <div className="space-y-1 py-1 text-[11px]">
            {items.map((item, idx) => {
              const lineTotal = (item.quantity * item.unitPrice).toFixed(2);
              return (
                <div key={idx} className="flex justify-between items-start">
                  <span className="flex-1 pr-1 break-words">{item.itemName}</span>
                  <span className="w-10 text-center">{item.quantity}</span>
                  <span className="w-14 text-right">{item.unitPrice.toFixed(2)}</span>
                  <span className="w-16 text-right font-medium">{lineTotal}</span>
                </div>
              );
            })}
          </div>

          {/* Financial Totals */}
          <div className="border-t border-gray-800 pt-2 mt-2 space-y-1 text-[12px]">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL AMOUNT:</span>
              <span>NPR {total.toFixed(2)}</span>
            </div>
            {business.taxNote && (
              <p className="text-[10px] text-gray-600 text-center italic mt-1">
                ({business.taxNote})
              </p>
            )}
          </div>

          {/* Payment Status & Details */}
          <div className="border-t border-dashed border-gray-500 pt-2 mt-2 text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={`font-bold uppercase ${type === 'receipt' ? 'text-black' : 'text-gray-800'}`}>
                {type === 'receipt' ? 'PAID' : 'PAYMENT DUE'}
              </span>
            </div>
            {type === 'receipt' && paymentMethod && (
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-bold uppercase">{paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 mt-2 border-t border-dashed border-gray-400 text-[10px] text-gray-700">
            <p className="font-medium">{business.receiptFooter || 'Thank you for visiting!'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
