import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Calendar, DollarSign, TrendingUp, FileText } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];

interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
}

interface SalesReportsProps {
  shopId: string;
}

export default function SalesReports({ shopId }: SalesReportsProps) {
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (shopId) {
      loadSales();
    }
  }, [shopId, dateFilter, customStartDate, customEndDate]);

  const loadSales = async () => {
    setLoading(true);

    let query = supabase
      .from('sales')
      .select(`
        *,
        sale_items(*)
      `)
      .eq('shop_id', shopId)
      .order('sale_date', { ascending: false });

    if (dateFilter !== 'all') {
      if (dateFilter === 'custom') {
        // Custom date range with separate start/end date states
        if (customStartDate && customEndDate) {
          const startDateTime = new Date(customStartDate);
          startDateTime.setHours(0, 0, 0, 0);
          const endDateTime = new Date(customEndDate);
          endDateTime.setHours(23, 59, 59, 999);
          query = query
            .gte('sale_date', startDateTime.toISOString())
            .lte('sale_date', endDateTime.toISOString());
        }
      } else {
        // Handle other date filters
        const now = new Date();
        let startDate = new Date();

        switch (dateFilter) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }

        query = query.gte('sale_date', startDate.toISOString());
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading sales:', error);
      setLoading(false);
      return;
    }

    setSales(data as SaleWithItems[] || []);
    setLoading(false);
  };

  const calculateStats = () => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.final_amount, 0);
    const totalSales = sales.length;
    const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount_amount, 0);
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalRevenue,
      totalSales,
      totalDiscount,
      averageSale,
    };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const rows: string[] = [];

    sales.forEach((sale) => {
      sale.sale_items.forEach((item) => {
        const costPerUnit = item.buying_price || 0;
        const taxPerItem = item.tax_amount || 0;
        const priceWithoutTax = item.unit_price - (taxPerItem / item.quantity);
        const totalCost = costPerUnit * item.quantity;
        const totalProfit = (item.subtotal - taxPerItem) - totalCost;

        rows.push([
          item.item_name,
          item.unit_price.toFixed(2),
          item.quantity.toString(),
          item.subtotal.toFixed(2),
          priceWithoutTax.toFixed(2),
          taxPerItem.toFixed(2),
          totalProfit.toFixed(2),
        ].join(','));
      });
    });

    const headers = 'Article,Unit Price,Qty Sold,Total,Tax Free Price,Cost Free Taxes,Profit';
    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sales Reports & Analytics</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="End date"
                />
              </>
            )}
            <button
              onClick={exportToCSV}
              disabled={sales.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">${stats.totalRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Total Sales</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{stats.totalSales}</p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Avg Sale</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">${stats.averageSale.toFixed(2)}</p>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Total Discounts</span>
            </div>
            <p className="text-2xl font-bold text-red-900">${stats.totalDiscount.toFixed(2)}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading sales data...</p>
        ) : sales.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sales yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Sale ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Articles</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Total</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Tax</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Profit</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => {
                  const totalTax = sale.sale_items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
                  const totalProfit = sale.sale_items.reduce((sum, item) => {
                    const costPerUnit = item.buying_price || 0;
                    const taxAmount = item.tax_amount || 0;
                    const totalCost = costPerUnit * item.quantity;
                    return sum + ((item.subtotal - taxAmount) - totalCost);
                  }, 0);

                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(sale.sale_date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                        {sale.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {sale.sale_items.length} article(s)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ${sale.final_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-orange-600">
                        ${totalTax.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        ${totalProfit.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sale Details</h3>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Sale ID:</span>
                    <p className="font-mono text-gray-900">{selectedSale.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="text-gray-900">
                      {new Date(selectedSale.sale_date).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Articles</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-2 py-2">Article</th>
                          <th className="text-right px-2 py-2">Unit Price</th>
                          <th className="text-right px-2 py-2">Qty</th>
                          <th className="text-right px-2 py-2">Total</th>
                          <th className="text-right px-2 py-2">Tax</th>
                          <th className="text-right px-2 py-2">Tax Free</th>
                          <th className="text-right px-2 py-2">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedSale.sale_items.map((item) => {
                          const taxAmount = item.tax_amount || 0;
                          const costPerUnit = item.buying_price || 0;
                          const taxPerItem = item.quantity > 0 ? taxAmount / item.quantity : 0;
                          const priceWithoutTax = item.unit_price - taxPerItem;
                          const totalCost = costPerUnit * item.quantity;
                          const profit = (item.subtotal - taxAmount) - totalCost;

                          return (
                            <tr key={item.id}>
                              <td className="px-2 py-2 text-gray-900 font-medium">{item.item_name}</td>
                              <td className="text-right px-2 py-2 text-gray-600">${item.unit_price.toFixed(2)}</td>
                              <td className="text-right px-2 py-2 text-gray-600">{item.quantity}</td>
                              <td className="text-right px-2 py-2 text-gray-900 font-semibold">${item.subtotal.toFixed(2)}</td>
                              <td className="text-right px-2 py-2 text-orange-600 font-medium">${taxAmount.toFixed(2)}</td>
                              <td className="text-right px-2 py-2 text-blue-600 font-medium">${priceWithoutTax.toFixed(2)}</td>
                              <td className="text-right px-2 py-2 text-green-600 font-semibold">${profit.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span>${selectedSale.total_amount.toFixed(2)}</span>
                  </div>
                  {selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Discount:</span>
                      <span>-${selectedSale.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                    <span>Total:</span>
                    <span>${selectedSale.final_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
