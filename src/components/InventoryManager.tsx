import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Plus, CreditCard as Edit2, Trash2, X, Image as ImageIcon, Upload, AlertCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Item = Database['public']['Tables']['items']['Row'];

interface InventoryManagerProps {
  shopId: string;
}

export default function InventoryManager({ shopId }: InventoryManagerProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    buying_price: '',
    selling_price: '',
    quantity: '',
    category: '',
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState<string>('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    if (shopId) {
      loadItems();
    }
  }, [shopId]);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading items:', error);
      return;
    }

    setItems(data || []);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      buying_price: '',
      selling_price: '',
      quantity: '',
      category: '',
      image_url: '',
    });
    setImageFile(null);
    setImagePreview('');
    setEditingItem(null);
    setShowForm(false);
    setFormError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('item-images')
      .upload(`${shopId}/${fileName}`, file);

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(`${shopId}/${fileName}`);

    return urlData?.publicUrl || null;
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      buying_price: item.buying_price.toString(),
      selling_price: item.selling_price.toString(),
      quantity: item.quantity.toString(),
      image_url: item.image_url || '',
    });
    if (item.image_url) {
      setImagePreview(item.image_url);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (!uploadedUrl) {
          setFormError('Failed to upload image');
          setLoading(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      const itemData = {
        shop_id: shopId,
        name: formData.name,
        description: formData.description,
        buying_price: parseFloat(formData.buying_price),
        selling_price: parseFloat(formData.selling_price),
        quantity: parseInt(formData.quantity),
        image_url: imageUrl || null,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) {
          setFormError(`Failed to update item: ${error.message}`);
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('items')
          .insert([itemData]);

        if (error) {
          setFormError(`Failed to save item: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      loadItems();
      resetForm();
    } catch (error) {
      setFormError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (!error) {
      loadItems();
    }
  };

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one row');
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const rawHeaders = firstLine.split(delimiter).map(h => h.trim());
    const headers = rawHeaders.map(h => h.toLowerCase());
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].split(delimiter).map(v => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    return rows;
  };

  const findColumnValue = (row: Record<string, string>, possibleNames: string[]): string => {
    for (const name of possibleNames) {
      const lowerName = name.toLowerCase();
      if (row[lowerName] && row[lowerName].trim()) {
        return row[lowerName];
      }
    }
    return '';
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportSuccess(false);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setImportError('No valid items found in CSV file');
        return;
      }

      const itemsToInsert = rows.map(row => {
        const name = findColumnValue(row, ['libelle', 'libellé', 'item', 'name', 'Libelle']);
        const description = findColumnValue(row, ['categorie', 'catégorie', 'category', 'Categorie']);
        const buyingPrice = parseFloat(findColumnValue(row, ['Prix d\'achat','prix d\'achat', 'prix d\'achats', 'buying_price', 'prix_dachat']) || '0') || 0;
        const sellingPrice = parseFloat(findColumnValue(row, ['Prix de vente', 'prix de vente', 'prix_de_vente', 'selling_price', 'prix_vente']) || '0') || 0;
        const tax = parseFloat(findColumnValue(row, ['taxe', 'tax']) || '0') || 0;
        const quantity = parseInt(findColumnValue(row, ['Quantite', 'quantité', 'quantite', 'quantity']) || '0') || 0;

        return {
          shop_id: shopId,
          name,
          description,
          buying_price: buyingPrice,
          selling_price: sellingPrice,
          tax,
          quantity,
          image_url: null,
          updated_at: new Date().toISOString(),
        };
      });

      const validItems = itemsToInsert.filter(item => item.name && item.name.trim());

      if (validItems.length === 0) {
        setImportError('No items with valid names found in CSV file');
        return;
      }

      const { error } = await supabase
        .from('items')
        .insert(validItems);

      if (error) {
        setImportError(`Import failed: ${error.message}`);
      } else {
        setImportSuccess(true);
        loadItems();
        setShowImport(false);
        setTimeout(() => setImportSuccess(false), 3000);
      }
    } catch (error) {
      setImportError(`Error processing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Inventory Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {showImport ? 'Cancel Import' : 'Import CSV'}
          </button>
          <button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Item'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4">
            {editingItem ? 'Edit Item' : 'New Item'}
          </h3>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buying Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.buying_price}
                onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selling Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Electronics, Clothing, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                {imagePreview && (
                  <div className="relative w-20 h-20">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
          </button>
        </form>
      )}

      {showImport && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Import Items from CSV</h3>

          <div className="mb-4 p-3 bg-white border border-gray-300 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              Your CSV file should have the following columns:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• <span className="font-medium">Libellé</span> - Item name</li>
              <li>• <span className="font-medium">Catégorie</span> - Category/Description</li>
              <li>• <span className="font-medium">Prix d'achat</span> - Buying price</li>
              <li>• <span className="font-medium">Prix de vente</span> - Selling price</li>
              <li>• <span className="font-medium">Taxe</span> - Tax amount</li>
              <li>• <span className="font-medium">Quantité</span> - Quantity</li>
            </ul>
          </div>

          {importError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          )}

          {importSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">Items imported successfully!</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No items yet. Add your first item!</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Image</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Item</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Buying Price</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Selling Price</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Quantity</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Profit Margin</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => {
                const profitMargin = ((item.selling_price - item.buying_price) / item.buying_price * 100).toFixed(1);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">${item.buying_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-900">${item.selling_price.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.quantity <= 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        parseFloat(profitMargin) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {profitMargin}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
