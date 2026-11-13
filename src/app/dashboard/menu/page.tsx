'use client';

import { useState, useEffect } from 'react';
import {
  UtensilsCrossed, Plus, Search, Edit2, Trash2, CheckCircle2,
  XCircle, Loader2, X, FolderPlus, Tag
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  displayOrder: number;
  itemCount: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string;
  isAvailable: boolean;
  category: { id: string; name: string };
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('waiter');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Forms
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    isAvailable: true,
  });

  const [categoryName, setCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRole(d.role || 'waiter'));
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/menu-items'),
      ]);
      const cats = await catRes.json();
      const its = await itemRes.json();
      setCategories(Array.isArray(cats) ? cats : []);
      setItems(Array.isArray(its) ? its : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  async function handleSaveItem() {
    if (!itemForm.name.trim()) {
      setError('Item name is required');
      return;
    }
    if (!itemForm.price || isNaN(Number(itemForm.price)) || Number(itemForm.price) < 0) {
      setError('A valid non-negative price is required');
      return;
    }
    if (!itemForm.categoryId) {
      setError('Please select a category');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = '/api/menu-items';
      const method = editingItem ? 'PUT' : 'POST';
      const payload = {
        ...(editingItem ? { id: editingItem.id } : {}),
        name: itemForm.name,
        description: itemForm.description,
        price: Number(itemForm.price),
        categoryId: itemForm.categoryId,
        imageUrl: itemForm.imageUrl,
        isAvailable: itemForm.isAvailable,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save menu item');
        return;
      }

      setShowItemModal(false);
      setEditingItem(null);
      await loadData();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    if (role !== 'admin') return;
    try {
      await fetch('/api/menu-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isAvailable: !item.isAvailable }),
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i))
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Are you sure you want to remove this menu item?')) return;
    try {
      const res = await fetch(`/api/menu-items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateCategory() {
    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName.trim() }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to create category');
        return;
      }

      setCategoryName('');
      setShowCategoryModal(false);
      await loadData();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  function openAddItem() {
    setEditingItem(null);
    setItemForm({
      name: '',
      description: '',
      price: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      imageUrl: '',
      isAvailable: true,
    });
    setError('');
    setShowItemModal(true);
  }

  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      categoryId: item.categoryId,
      imageUrl: item.imageUrl || '',
      isAvailable: item.isAvailable,
    });
    setError('');
    setShowItemModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7355]" />
          <input
            type="text"
            placeholder="Search food or beverage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {role === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setError('');
                setCategoryName('');
                setShowCategoryModal(true);
              }}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FolderPlus className="w-4 h-4" /> Add Category
            </button>
            <button
              onClick={openAddItem}
              disabled={categories.length === 0}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Menu Item
            </button>
          </div>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-[#E5AE45] text-white'
              : 'bg-white text-[#3C2A20] border border-[#E8DCC8] hover:bg-[#F2E8D5]'
          }`}
        >
          All Items ({items.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === c.id
                ? 'bg-[#E5AE45] text-white'
                : 'bg-white text-[#3C2A20] border border-[#E8DCC8] hover:bg-[#F2E8D5]'
            }`}
          >
            {c.name} ({c.itemCount})
          </button>
        ))}
      </div>

      {/* Warning if no categories */}
      {categories.length === 0 && (
        <div className="card p-8 text-center bg-amber-50/50 border-amber-200">
          <Tag className="w-10 h-10 mx-auto text-[#E5AE45] mb-2" />
          <h3 className="text-base font-semibold text-[#3C2A20]">No Categories Created</h3>
          <p className="text-sm text-[#8B7355] mt-1 mb-4">
            Create at least one category (e.g. &quot;Coffee&quot;, &quot;Snacks&quot;) before adding menu items.
          </p>
          {role === 'admin' && (
            <button
              onClick={() => {
                setError('');
                setCategoryName('');
                setShowCategoryModal(true);
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" /> Create Category
            </button>
          )}
        </div>
      )}

      {/* Menu Item Grid */}
      {filteredItems.length === 0 && categories.length > 0 ? (
        <div className="card p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-[#E8DCC8] mb-3" />
          <h3 className="text-base font-semibold text-[#3C2A20]">No Items Found</h3>
          <p className="text-sm text-[#8B7355] mt-1">
            {search ? 'Try modifying your search query.' : 'Add items to this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`card p-4 flex flex-col justify-between transition-all duration-200 ${
                !item.isAvailable ? 'opacity-65 bg-gray-50/70' : 'hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#F2E8D5] text-[#8B7355] mb-1">
                      {item.category.name}
                    </span>
                    <h4 className="font-semibold text-base text-[#3C2A20]">{item.name}</h4>
                  </div>
                  <span className="font-bold text-base text-[#E5AE45] whitespace-nowrap">
                    NPR {item.price.toFixed(2)}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-[#8B7355] line-clamp-2 mb-3">{item.description}</p>
                )}
              </div>

              <div className="border-t border-[#E8DCC8]/60 pt-3 mt-2 flex items-center justify-between">
                {/* Manual Availability Toggle */}
                {role === 'admin' ? (
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      item.isAvailable
                        ? 'bg-green-100 text-[#4A7C59] hover:bg-green-200'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title="Click to toggle availability"
                  >
                    {item.isAvailable ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Available
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Unavailable
                      </>
                    )}
                  </button>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      item.isAvailable ? 'bg-green-100 text-[#4A7C59]' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                )}

                {/* Admin Actions */}
                {role === 'admin' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditItem(item)}
                      className="p-1.5 text-[#8B7355] hover:text-[#3C2A20] rounded-lg hover:bg-[#F2E8D5] transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-[#8B7355] hover:text-[#C44536] rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Modal (Add / Edit) */}
      {showItemModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowItemModal(false)}
        >
          <div
            className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#3C2A20]">
                {editingItem ? 'Edit Menu Item' : 'New Menu Item'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C44536] p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label-text">Item Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Caramel Latte, Club Sandwich"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-text">Category *</label>
                <select
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="input-field"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-text">Selling Price (NPR, Tax Inclusive) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="0.00"
                  className="input-field"
                />
                <p className="text-xs text-[#8B7355] mt-1">
                  Tax inclusive. This is the exact customer-facing price.
                </p>
              </div>

              <div>
                <label className="label-text">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Ingredients or description..."
                  className="input-field"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={itemForm.isAvailable}
                  onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                  className="w-4 h-4 text-[#E5AE45] rounded border-[#E8DCC8] focus:ring-[#E5AE45]"
                />
                <label htmlFor="isAvailable" className="text-sm font-medium text-[#3C2A20]">
                  Available to order immediately
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingItem ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCategoryModal(false)}
        >
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#3C2A20]">Add Category</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-[#8B7355] hover:text-[#3C2A20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C44536] p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label-text">Category Name *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Hot Coffee, Bakery, Desserts"
                  className="input-field"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
