import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Plus, Minus, Trash2, DollarSign } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Item = Database['public']['Tables']['items']['Row'];
type Discount = Database['public']['Tables']['discounts']['Row'];

interface CartItem {
  item: Item;
  quantity: number;
  discountId?: string;
}

interface PointOfSaleProps {
  shopId: string;
}

type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'other';

interface DiscountWithDetails extends Discount {
  items?: string[];
  categories?: string[];
}

export default function PointOfSale({ shopId }: PointOfSaleProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [discounts, setDiscounts] = useState<DiscountWithDetails[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<number | ''>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (shopId) {
      loadItems();
      loadDiscounts();
    }
  }, [shopId]);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('shop_id', shopId)
      .gt('quantity', 0)
      .order('name');

    if (!error && data) {
      setItems(data);
    }
  };

  const loadDiscounts = async () => {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      const discountsWithDetails: DiscountWithDetails[] = await Promise.all(
        data.map(async (discount) => {
          const details: DiscountWithDetails = { ...discount, items: [], categories: [] };

          if (discount.applies_to === 'item') {
            const { data: discountItems } = await supabase
              .from('discount_items')
              .select('item_id')
              .eq('discount_id', discount.id);
            details.items = discountItems?.map(di => di.item_id) || [];
          } else if (discount.applies_to === 'category') {
            const { data: discountCategories } = await supabase
              .from('discount_categories')
              .select('category')
              .eq('discount_id', discount.id);
            details.categories = discountCategories?.map(dc => dc.category) || [];
          }

          return details;
        })
      );

      setDiscounts(discountsWithDetails);
    }
  };

  const addToCart = (item: Item) => {
    const existingItem = cart.find((ci) => ci.item.id === item.id);
    if (existingItem) {
      if (existingItem.quantity < item.quantity) {
        setCart(
          cart.map((ci) =>
            ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
          )
        );
      }
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((ci) => {
          if (ci.item.id === itemId) {
            const newQuantity = ci.quantity + delta;
            if (newQuantity <= 0) return null;
            if (newQuantity > ci.item.quantity) return ci;
            return { ...ci, quantity: newQuantity };
          }
          return ci;
        })
        .filter((ci): ci is CartItem => ci !== null);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((ci) => ci.item.id !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, ci) => sum + ci.item.selling_price * ci.quantity, 0);
  };

  const isItemDiscountApplicable = (itemId: string) => {
    if (!selectedDiscount) return false;
    if (selectedDiscount.applies_to === 'all') return true;
    if (selectedDiscount.applies_to === 'item') {
      return selectedDiscount.items?.includes(itemId) || false;
    }
    return false;
  };

  const isCategoryDiscountApplicable = (category: string) => {
    if (!selectedDiscount) return false;
    if (selectedDiscount.applies_to === 'all') return true;
    if (selectedDiscount.applies_to === 'category') {
      return selectedDiscount.categories?.includes(category) || false;
    }
    return false;
  };

  const calculateDiscount = () => {
    if (!selectedDiscount) return 0;

    if (selectedDiscount.applies_to === 'all') {
      const total = calculateTotal();
      if (selectedDiscount.discount_type === 'percentage') {
        return (total * selectedDiscount.discount_value) / 100;
      }
      return selectedDiscount.discount_value;
    }

    let totalDiscount = 0;

    if (selectedDiscount.applies_to === 'item') {
      cart.forEach((ci) => {
        if (selectedDiscount.items?.includes(ci.item.id)) {
          const itemSubtotal = ci.item.selling_price * ci.quantity;
          if (selectedDiscount.discount_type === 'percentage') {
            totalDiscount += (itemSubtotal * selectedDiscount.discount_value) / 100;
          } else {
            totalDiscount += selectedDiscount.discount_value;
          }
        }
      });
    } else if (selectedDiscount.applies_to === 'category') {
      cart.forEach((ci) => {
        if (selectedDiscount.categories?.includes(ci.item.category || '')) {
          const itemSubtotal = ci.item.selling_price * ci.quantity;
          if (selectedDiscount.discount_type === 'percentage') {
            totalDiscount += (itemSubtotal * selectedDiscount.discount_value) / 100;
          } else {
            totalDiscount += selectedDiscount.discount_value;
          }
        }
      });
    }

    return totalDiscount;
  };

  const processSale = async () => {
    if (cart.length === 0) return;

    const totalAmount = calculateTotal();
    const discountAmount = calculateDiscount();
    const finalAmount = totalAmount - discountAmount;

    if (paymentMethod === 'cash' && (cashGiven === '' || cashGiven < finalAmount)) {
      alert('Please enter the correct cash amount');
      return;
    }

    setLoading(true);
    const changeAmount = paymentMethod === 'cash' ? Number(cashGiven) - finalAmount : 0;

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([
        {
          shop_id: shopId,
          total_amount: totalAmount,
          discount_id: selectedDiscount?.id || null,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          paidBy: paymentMethod,
          payment_method: paymentMethod,
          cash_given: paymentMethod === 'cash' ? Number(cashGiven) : null,
          change_amount: changeAmount,
        },
      ])
      .select()
      .single();

    if (saleError || !saleData) {
      console.error('Error creating sale:', saleError);
      setLoading(false);
      return;
    }

    const saleItems = cart.map((ci) => {
      const taxAmount = ci.item.tax * ci.quantity;
      return {
        sale_id: saleData.id,
        item_id: ci.item.id,
        item_name: ci.item.name,
        quantity: ci.quantity,
        unit_price: ci.item.selling_price,
        subtotal: ci.item.selling_price * ci.quantity,
        tax_amount: taxAmount,
        buying_price: ci.item.buying_price,
      };
    });

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) {
      console.error('Error creating sale items:', itemsError);
      setLoading(false);
      return;
    }

    for (const ci of cart) {
      await supabase
        .from('items')
        .update({ quantity: ci.item.quantity - ci.quantity, updated_at: new Date().toISOString() })
        .eq('id', ci.item.id);
    }

    setCart([]);
    setSelectedDiscount(null);
    setCashGiven('');
    setPaymentMethod('cash');
    setShowPaymentModal(false);
    setLoading(false);
    loadItems();

    if (paymentMethod === 'cash') {
      alert(`Sale completed! Total: $${finalAmount.toFixed(2)}\nChange: $${changeAmount.toFixed(2)}`);
    } else {
      alert(`Sale completed! Total: $${finalAmount.toFixed(2)}`);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = calculateTotal();
  const discountAmount = calculateDiscount(total);
  const finalAmount = total - discountAmount;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Point of Sale</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items available</p>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md border border-gray-200 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">Stock: {item.quantity}</div>
                      <div className="font-semibold text-gray-900 text-sm mt-1">
                        ${item.selling_price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-96">
            <h3 className="font-semibold text-gray-900 mb-4">Cart</h3>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((ci) => (
                    <div
                      key={ci.item.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                    >
                      {ci.item.image_url && (
                        <img
                          src={ci.item.image_url}
                          alt={ci.item.name}
                          className="w-12 h-12 object-cover rounded-md border border-gray-200 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{ci.item.name}</div>
                        <div className="text-sm text-gray-500">
                          ${ci.item.selling_price.toFixed(2)} × {ci.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(ci.item.id, -1)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-semibold w-6 text-center text-sm">{ci.quantity}</span>
                        <button
                          onClick={() => updateQuantity(ci.item.id, 1)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(ci.item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="font-semibold text-gray-900 ml-2 w-16 text-right text-sm">
                        ${(ci.item.selling_price * ci.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {discounts.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apply Discount
                    </label>
                    <select
                      value={selectedDiscount?.id || ''}
                      onChange={(e) => {
                        const discount = discounts.find((d) => d.id === e.target.value);
                        setSelectedDiscount(discount || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No discount</option>
                      {discounts.map((discount) => (
                        <option key={discount.id} value={discount.id}>
                          {discount.name} (
                          {discount.discount_type === 'percentage'
                            ? `${discount.discount_value}%`
                            : `$${discount.discount_value.toFixed(2)}`}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="border-t border-gray-300 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  {selectedDiscount && (
                    <div className="flex justify-between text-orange-600">
                      <span>Discount:</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
                    <span>Total:</span>
                    <span>${finalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={loading || cart.length === 0}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
                >
                  <DollarSign className="w-5 h-5" />
                  {loading ? 'Processing...' : 'Complete Sale'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Payment Method
                </label>
                <div className="space-y-2">
                  {(['cash', 'credit_card', 'debit_card', 'other'] as PaymentMethod[]).map((method) => (
                    <label key={method} className="flex items-center p-3 border border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors" style={{borderColor: paymentMethod === method ? '#3b82f6' : undefined, backgroundColor: paymentMethod === method ? '#eff6ff' : undefined}}>
                      <input
                        type="radio"
                        name="payment-method"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value as PaymentMethod);
                          setCashGiven('');
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-3 text-gray-900 capitalize font-medium">
                        {method === 'credit_card' ? 'Credit Card' : method === 'debit_card' ? 'Debit Card' : method.charAt(0).toUpperCase() + method.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cash Given
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder={`Minimum: $${(calculateTotal() - calculateDiscount(calculateTotal())).toFixed(2)}`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {cashGiven !== '' && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between mb-2">
                          <span>Total:</span>
                          <span className="font-semibold">${(calculateTotal() - calculateDiscount(calculateTotal())).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-600 font-semibold">
                          <span>Change:</span>
                          <span>${(Number(cashGiven) - (calculateTotal() - calculateDiscount(calculateTotal()))).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setCashGiven('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={processSale}
                disabled={loading || (paymentMethod === 'cash' && (cashGiven === '' || Number(cashGiven) < (calculateTotal() - calculateDiscount(calculateTotal()))))}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
