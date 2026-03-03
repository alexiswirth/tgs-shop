import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Store, Plus, X } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Shop = Database['public']['Tables']['shops']['Row'];

interface ShopManagerProps {
  selectedShopId: string | null;
  onShopSelect: (shopId: string) => void;
}

export default function ShopManager({ selectedShopId, onShopSelect }: ShopManagerProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading shops:', error);
      return;
    }

    setShops(data || []);
    if (data && data.length > 0 && !selectedShopId) {
      onShopSelect(data[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('shops')
      .insert([formData])
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error('Error creating shop:', error);
      return;
    }

    if (data) {
      setShops([data, ...shops]);
      onShopSelect(data.id);
      setFormData({ name: '', description: '' });
      setShowForm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Shop Management</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Shop'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Shop'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {shops.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No shops yet. Create your first shop!</p>
        ) : (
          shops.map((shop) => (
            <button
              key={shop.id}
              onClick={() => onShopSelect(shop.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedShopId === shop.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <h3 className="font-semibold text-gray-900">{shop.name}</h3>
              {shop.description && (
                <p className="text-sm text-gray-600 mt-1">{shop.description}</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
