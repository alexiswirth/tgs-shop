import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tag, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Discount = Database['public']['Tables']['discounts']['Row'];
type Item = Database['public']['Tables']['items']['Row'];

interface DiscountManagerProps {
  shopId: string;
}

export default function DiscountManager({ shopId }: DiscountManagerProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedDiscount, setExpandedDiscount] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    applies_to: 'all' as 'all' | 'category' | 'item',
    selectedItems: [] as string[],
    selectedCategories: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [selectedItemsForDiscount, setSelectedItemsForDiscount] = useState<{ [key: string]: string[] }>({});
  const [selectedCategoriesForDiscount, setSelectedCategoriesForDiscount] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    if (shopId) {
      loadDiscounts();
      loadItems();
    }
  }, [shopId]);

  const loadDiscounts = async () => {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading discounts:', error);
      return;
    }

    setDiscounts(data || []);

    if (data) {
      for (const discount of data) {
        await loadDiscountTargets(discount.id);
      }
    }
  };

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('shop_id', shopId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading items:', error);
      return;
    }

    setItems(data || []);

    const uniqueCategories = Array.from(new Set((data || []).map(item => item.category || 'General')));
    setCategories(uniqueCategories);
  };

  const loadDiscountTargets = async (discountId: string) => {
    const { data: itemsData } = await supabase
      .from('discount_items')
      .select('item_id')
      .eq('discount_id', discountId);

    const { data: categoriesData } = await supabase
      .from('discount_categories')
      .select('category')
      .eq('discount_id', discountId);

    if (itemsData) {
      setSelectedItemsForDiscount(prev => ({
        ...prev,
        [discountId]: itemsData.map(d => d.item_id)
      }));
    }

    if (categoriesData) {
      setSelectedCategoriesForDiscount(prev => ({
        ...prev,
        [discountId]: categoriesData.map(d => d.category)
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      discount_type: 'percentage',
      discount_value: '',
      applies_to: 'all',
      selectedItems: [],
      selectedCategories: [],
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: newDiscount, error: discountError } = await supabase
        .from('discounts')
        .insert([{
          shop_id: shopId,
          name: formData.name,
          discount_type: formData.discount_type,
          discount_value: parseFloat(formData.discount_value),
          applies_to: formData.applies_to,
          is_active: true,
        }])
        .select()
        .single();

      if (discountError || !newDiscount) {
        console.error('Error creating discount:', discountError);
        setLoading(false);
        return;
      }

      if (formData.applies_to === 'item' && formData.selectedItems.length > 0) {
        const itemInserts = formData.selectedItems.map(itemId => ({
          discount_id: newDiscount.id,
          item_id: itemId,
        }));
        const { error: itemError } = await supabase.from('discount_items').insert(itemInserts);
        if (itemError) {
          console.error('Error adding items to discount:', itemError);
        }
      } else if (formData.applies_to === 'category' && formData.selectedCategories.length > 0) {
        const categoryInserts = formData.selectedCategories.map(category => ({
          discount_id: newDiscount.id,
          category,
        }));
        const { error: categoryError } = await supabase.from('discount_categories').insert(categoryInserts);
        if (categoryError) {
          console.error('Error adding categories to discount:', categoryError);
        }
      }

      await loadDiscounts();
      resetForm();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (discount: Discount) => {
    const { error } = await supabase
      .from('discounts')
      .update({ is_active: !discount.is_active })
      .eq('id', discount.id);

    if (!error) {
      loadDiscounts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', id);

    if (!error) {
      loadDiscounts();
    }
  };

  const getDiscountTargetLabel = (discount: Discount) => {
    if (discount.applies_to === 'all') {
      return 'Applies to all items';
    }
    if (discount.applies_to === 'item') {
      const count = selectedItemsForDiscount[discount.id]?.length || 0;
      return `Applies to ${count} item${count !== 1 ? 's' : ''}`;
    }
    if (discount.applies_to === 'category') {
      const count = selectedCategoriesForDiscount[discount.id]?.length || 0;
      return `Applies to ${count} categor${count !== 1 ? 'ies' : 'y'}`;
    }
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-900">Discount Management</h2>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Discount'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Create New Discount</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., Holiday Sale"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-gray-500">
                    {formData.discount_type === 'percentage' ? '%' : '$'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Applies To
              </label>
              <select
                value={formData.applies_to}
                onChange={(e) => setFormData({
                  ...formData,
                  applies_to: e.target.value as 'all' | 'category' | 'item',
                  selectedItems: [],
                  selectedCategories: [],
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Items</option>
                <option value="category">Specific Categories</option>
                <option value="item">Specific Items</option>
              </select>
            </div>

            {formData.applies_to === 'category' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Categories
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                  {categories.map((category) => (
                    <label key={category} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.selectedCategories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedCategories: [...formData.selectedCategories, category]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedCategories: formData.selectedCategories.filter(c => c !== category)
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formData.applies_to === 'item' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Items
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                  {items.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedItems: [...formData.selectedItems, item.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedItems: formData.selectedItems.filter(i => i !== item.id)
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Discount'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {discounts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No discounts yet. Create your first discount!</p>
        ) : (
          discounts.map((discount) => (
            <div
              key={discount.id}
              className={`rounded-lg border-2 transition-all ${
                discount.is_active
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <button
                onClick={() => setExpandedDiscount(expandedDiscount === discount.id ? null : discount.id)}
                className="w-full p-4 text-left hover:bg-opacity-75 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{discount.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        discount.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {discount.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {discount.discount_type === 'percentage'
                        ? `${discount.discount_value}% off`
                        : `$${discount.discount_value.toFixed(2)} off`}
                      {' • '}
                      <span className="text-gray-500">{getDiscountTargetLabel(discount)}</span>
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedDiscount === discount.id ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {expandedDiscount === discount.id && (
                <div className="border-t border-orange-200 px-4 py-3 bg-white bg-opacity-50">
                  {discount.applies_to === 'item' && selectedItemsForDiscount[discount.id] && selectedItemsForDiscount[discount.id].length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Applied to items:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItemsForDiscount[discount.id].map(itemId => {
                          const item = items.find(i => i.id === itemId);
                          return item ? (
                            <span key={itemId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  {discount.applies_to === 'category' && selectedCategoriesForDiscount[discount.id] && selectedCategoriesForDiscount[discount.id].length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Applied to categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCategoriesForDiscount[discount.id].map(category => (
                          <span key={category} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-orange-100">
                    <button
                      onClick={() => toggleActive(discount)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        discount.is_active
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {discount.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(discount.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
