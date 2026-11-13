'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, Plus, Minus, Trash2, ArrowLeft, Loader2,
  UtensilsCrossed, AlertCircle, Check
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

interface OrderDraftItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  notes: string;
}

interface TableOption {
  id: string;
  tableName: string;
  status: string;
}

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get('tableId') || '';
  const preselectedTableName = searchParams.get('tableName') || '';

  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTableId, setSelectedTableId] = useState(preselectedTableId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [draftItems, setDraftItems] = useState<OrderDraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [tablesRes, catsRes, itemsRes] = await Promise.all([
          fetch('/api/tables'),
          fetch('/api/categories'),
          fetch('/api/menu-items'),
        ]);

        const tData = await tablesRes.json();
        const cData = await catsRes.json();
        const iData = await itemsRes.json();

        setTables(Array.isArray(tData) ? tData : []);
        setCategories(Array.isArray(cData) ? cData : []);
        setItems(Array.isArray(iData) ? iData : []);

        if (!selectedTableId && Array.isArray(tData)) {
          const firstAvailable = tData.find((t) => t.status === 'available');
          if (firstAvailable) setSelectedTableId(firstAvailable.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [selectedTableId]);

  function addItemToDraft(item: MenuItem) {
    if (!item.isAvailable) return;

    setDraftItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [
          ...prev,
          {
            menuItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            quantity: 1,
            notes: '',
          },
        ];
      }
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setDraftItems((prev) =>
      prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderDraftItem[]
    );
  }

  function updateNotes(menuItemId: string, notes: string) {
    setDraftItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, notes } : i))
    );
  }

  function removeItem(menuItemId: string) {
    setDraftItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }

  const orderTotal = draftItems.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  async function handleCreateOrder() {
    if (!selectedTableId) {
      setError('Please select a physical table for this order.');
      return;
    }

    if (draftItems.length === 0) {
      setError('Please select at least one item for the order.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTableId,
          items: draftItems.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.orderId) {
          // Table already has open order - prompt or redirect
          setError(data.error + '. Redirecting to active order...');
          setTimeout(() => {
            router.push(`/dashboard/orders/${data.orderId}`);
          }, 1200);
          return;
        }
        setError(data.error || 'Failed to start order');
        return;
      }

      router.push(`/dashboard/orders/${data.id}`);
    } catch {
      setError('Network error. Could not create order.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedTableObj = tables.find((t) => t.id === selectedTableId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-[#8B7355] hover:text-[#3C2A20] rounded-lg hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#3C2A20]">Take New Order</h2>
            <p className="text-xs text-[#8B7355]">Select table, pick items, and start order</p>
          </div>
        </div>

        {/* Table Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#8B7355] whitespace-nowrap">
            Physical Table:
          </label>
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            className="input-field py-1.5 px-3 text-sm font-semibold max-w-[200px]"
          >
            {tables.map((t) => (
              <option
                key={t.id}
                value={t.id}
                disabled={t.status === 'occupied' && t.id !== preselectedTableId}
              >
                {t.tableName} {t.status === 'occupied' ? '(Occupied)' : '(Available)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#C44536] p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Menu Items (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Pills */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7355]" />
              <input
                type="text"
                placeholder="Search food or beverage..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 text-sm py-2"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#E5AE45] text-white'
                    : 'bg-white text-[#3C2A20] border border-[#E8DCC8]'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === c.id
                      ? 'bg-[#E5AE45] text-white'
                      : 'bg-white text-[#3C2A20] border border-[#E8DCC8]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const draftCount = draftItems.find((i) => i.menuItemId === item.id)?.quantity || 0;
              return (
                <div
                  key={item.id}
                  onClick={() => item.isAvailable && addItemToDraft(item)}
                  className={`relative card p-3 flex flex-col justify-between transition-all duration-150 select-none ${
                    !item.isAvailable
                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                      : 'cursor-pointer hover:border-[#E5AE45] active:scale-[0.98]'
                  }`}
                >
                  {draftCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#E5AE45] text-white font-bold text-xs flex items-center justify-center shadow">
                      {draftCount}
                    </span>
                  )}
                  <div>
                    <h4 className="font-semibold text-sm text-[#3C2A20] line-clamp-1">{item.name}</h4>
                    <p className="text-[11px] text-[#8B7355] mt-0.5">{item.category.name}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-xs text-[#E5AE45]">
                      NPR {item.price.toFixed(2)}
                    </span>
                    {!item.isAvailable && (
                      <span className="text-[10px] text-red-500 font-medium">Out</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Current Order Slip (5 cols) */}
        <div className="lg:col-span-5">
          <div className="card p-5 sticky top-20 flex flex-col h-[680px]">
            {/* Slip Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC8]">
              <div>
                <h3 className="font-bold text-base text-[#3C2A20]">
                  {selectedTableObj?.tableName || preselectedTableName || 'Selected Table'}
                </h3>
                <p className="text-xs text-[#8B7355]">Current Order Slip</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-[#E5AE45]">
                {draftItems.reduce((acc, i) => acc + i.quantity, 0)} Items
              </span>
            </div>

            {/* Slip Items List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {draftItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8B7355]">
                  <UtensilsCrossed className="w-10 h-10 mb-2 text-[#E8DCC8]" />
                  <p className="text-sm font-medium">No items added yet</p>
                  <p className="text-xs mt-1">Tap items on the left to add them to this order.</p>
                </div>
              ) : (
                draftItems.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="p-2.5 rounded-lg border border-[#E8DCC8]/70 bg-[#FFF8EB]/40 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-semibold text-sm text-[#3C2A20]">{item.name}</h5>
                        <p className="text-xs text-[#8B7355]">
                          NPR {item.unitPrice.toFixed(2)} each
                        </p>
                      </div>
                      <span className="font-bold text-sm text-[#3C2A20]">
                        NPR {(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-white border border-[#E8DCC8] rounded-md px-1.5 py-0.5">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, -1)}
                          className="p-1 hover:text-[#C44536] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#3C2A20]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, 1)}
                          className="p-1 hover:text-[#4A7C59] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Notes Input */}
                      <input
                        type="text"
                        placeholder="Add note (e.g. less ice)..."
                        value={item.notes}
                        onChange={(e) => updateNotes(item.menuItemId, e.target.value)}
                        className="flex-1 text-xs px-2 py-1 rounded border border-[#E8DCC8] bg-white focus:outline-none focus:ring-1 focus:ring-[#E5AE45]"
                      />

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.menuItemId)}
                        className="p-1 text-[#8B7355] hover:text-[#C44536] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Slip Summary & Action */}
            <div className="border-t border-[#E8DCC8] pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[#8B7355]">Total Amount (Tax Incl.):</span>
                <span className="text-xl font-bold text-[#E5AE45]">
                  NPR {orderTotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={submitting || draftItems.length === 0}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-bold text-sm shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Order...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Start Order (Occupies Table)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
        </div>
      }
    >
      <NewOrderContent />
    </Suspense>
  );
}
