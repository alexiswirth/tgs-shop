import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import ShopManager from './components/ShopManager';
import InventoryManager from './components/InventoryManager';
import DiscountManager from './components/DiscountManager';
import PointOfSale from './components/PointOfSale';
import SalesReports from './components/SalesReports';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ResetPassword from './components/ResetPassword';
import { Store, Package, Tag, ShoppingCart, BarChart3, LogOut } from 'lucide-react';

type Tab = 'inventory' | 'discounts' | 'pos' | 'reports';
type AuthScreen = 'login' | 'signup' | 'reset';

function App() {
  const { user, loading, signOut } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      setAuthScreen('reset');
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setSelectedShopId(null);
    setActiveTab('inventory');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authScreen === 'reset') {
      return <ResetPassword />;
    }
    if (authScreen === 'signup') {
      return <SignUp onSwitchToLogin={() => setAuthScreen('login')} />;
    }
    return <Login onSwitchToSignUp={() => setAuthScreen('signup')} />;
  }

  const tabs = [
    { id: 'inventory' as Tab, label: 'Inventory', icon: Package, color: 'text-green-600' },
    { id: 'discounts' as Tab, label: 'Discounts', icon: Tag, color: 'text-orange-600' },
    { id: 'pos' as Tab, label: 'Point of Sale', icon: ShoppingCart, color: 'text-blue-600' },
    { id: 'reports' as Tab, label: 'Reports', icon: BarChart3, color: 'text-blue-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Shop Management System</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <ShopManager
            selectedShopId={selectedShopId}
            onShopSelect={setSelectedShopId}
          />

          {selectedShopId && (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                {activeTab === 'inventory' && <InventoryManager shopId={selectedShopId} />}
                {activeTab === 'discounts' && <DiscountManager shopId={selectedShopId} />}
                {activeTab === 'pos' && <PointOfSale shopId={selectedShopId} />}
                {activeTab === 'reports' && <SalesReports shopId={selectedShopId} />}
              </div>
            </>
          )}

          {!selectedShopId && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Shop Management</h2>
              <p className="text-gray-600">Create or select a shop to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
