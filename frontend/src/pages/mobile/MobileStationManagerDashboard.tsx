// src/pages/mobile/MobileStationManagerDashboard.tsx
import React, { useState, useEffect, lazy, Suspense, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../utils/supabase-client";
import { useAuth } from "../../contexts/AuthContext";
import { usePrices } from "../../contexts/PriceContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Plus,
  Download,
  Wifi,
  WifiOff,
  Building2,
  Fuel,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Settings,
  Calculator,
  Upload,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Receipt,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Gauge,
  Database,
  BanknoteIcon,
  Search,
  Filter,
  MoreHorizontal,
  Menu,
  Home,
  Bell,
  ChevronRight,
  ChevronDown,
  TrendingDown,
  Zap,
  Shield,
  Cloud,
  CloudOff,
  History,
  BarChart,
  Wallet,
  ShoppingCart,
  ClipboardList,
  CheckSquare,
  X,
  Maximize2,
  Minimize2,
  Smartphone,
  Battery,
  BatteryCharging,
} from "lucide-react";
import { offlineSync } from "../../utils/offline-sync";

// Lazy loaded components for mobile
const LazyMobileBankDeposits = lazy(() => import('./MobileBankDeposits'));

// Types (simplified for mobile)
interface DailyReport {
  total_sales: number;
  total_expenses: number;
  inventory: any[];
  sales: any[];
  expenses: any[];
  active_shifts: number;
  fuel_stock: number;
  pump_prices: any[];
  current_stock: any[];
}

interface PumpPrice {
  product_type: string;
  product_id: string;
  price_per_liter: number;
  last_updated: string;
}

interface Expense {
  id: string;
  station_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface Pump {
  id: string;
  station_id: string;
  name: string;
  number: string;
  fuel_type: string;
  status: 'active' | 'inactive' | 'maintenance';
  current_meter_reading: number;
}

interface FuelStockCard {
  product_id: string;
  product_name: string;
  current_stock: number;
  last_updated: string;
  unit: string;
}

interface Station {
  id: string;
  name: string;
  omc_id: string;
  omc?: {
    id: string;
    name: string;
  };
}

// Mobile-specific types
interface MobileDashboardConfig {
  showQuickActions: boolean;
  showOfflineWarning: boolean;
  enableTouchGestures: boolean;
  showBatterySaver: boolean;
}

// Utility functions for mobile
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const getBatteryLevel = () => {
  if ('getBattery' in navigator) {
    return (navigator as any).getBattery().then((battery: any) => ({
      level: battery.level * 100,
      charging: battery.charging,
    }));
  }
  return Promise.resolve({ level: 100, charging: false });
};

// Mobile-specific components
const MobileStatusBar = ({ isOnline, pendingSync, batteryLevel, isCharging }: { 
  isOnline: boolean; 
  pendingSync: number;
  batteryLevel: number;
  isCharging: boolean;
}) => (
  <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-green-600" />
            <span className="text-xs text-green-700">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-orange-600" />
            <span className="text-xs text-orange-700">Offline</span>
          </div>
        )}
        {pendingSync > 0 && (
          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
            {pendingSync} pending
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {isCharging ? (
            <BatteryCharging className="w-3 h-3 text-green-600" />
          ) : (
            <Battery className="w-3 h-3 text-gray-600" />
          )}
          <span className="text-xs">{batteryLevel}%</span>
        </div>
        <span className="text-xs text-gray-500">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  </div>
);

const MobileQuickAction = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = "default",
  disabled = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void;
  variant?: "default" | "primary" | "success" | "warning";
  disabled?: boolean;
}) => {
  const variantClasses = {
    default: "bg-gray-100 hover:bg-gray-200 border-gray-200",
    primary: "bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700",
    success: "bg-green-100 hover:bg-green-200 border-green-200 text-green-700",
    warning: "bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center p-3 rounded-xl border ${variantClasses[variant]} active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const MobileStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle,
  onClick 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  onClick?: () => void;
}) => {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600"
  };

  return (
    <Card 
      className="active:scale-98 transition-transform"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${trendColors[trend]}`}>
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {subtitle}
              </div>
            )}
          </div>
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="w-5 h-5 text-gray-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileBottomNav = ({ activeTab, onTabChange }: { 
  activeTab: string; 
  onTabChange: (tab: string) => void 
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'sales', label: 'Sales', icon: BarChart },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'more', label: 'More', icon: Menu },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PullToRefresh = ({ onRefresh, refreshing }: { 
  onRefresh: () => void; 
  refreshing: boolean;
}) => {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshingState, setRefreshingState] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && startY > 0) {
      setCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    const pullDistance = currentY - startY;
    if (pullDistance > 100 && !refreshing) {
      setRefreshingState(true);
      onRefresh();
      setTimeout(() => setRefreshingState(false), 1000);
    }
    setStartY(0);
    setCurrentY(0);
  };

  const pullDistance = Math.max(0, currentY - startY);
  const progress = Math.min(100, (pullDistance / 100) * 100);

  if (refreshing || refreshingState) {
    return (
      <div className="flex items-center justify-center py-3 bg-blue-50">
        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="ml-2 text-sm text-blue-600">Refreshing...</span>
      </div>
    );
  }

  if (pullDistance > 0) {
    return (
      <div 
        className="flex items-center justify-center py-3"
        style={{
          height: `${Math.min(100, pullDistance)}px`,
          background: `linear-gradient(to bottom, rgba(59, 130, 246, ${progress/100}), white)`
        }}
      >
        <RefreshCw className="w-5 h-5 text-blue-600" style={{ transform: `rotate(${progress * 3.6}deg)` }} />
        <span className="ml-2 text-sm text-blue-600">
          {progress >= 100 ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    );
  }

  return null;
};

// Main Mobile Component
export function MobileStationManagerDashboard() {
  const { user } = useAuth();
  const { 
    getStationPrice, 
    getStationAllPrices,
    refreshPrices 
  } = usePrices();
  
  // State management
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pumpPrices, setPumpPrices] = useState<PumpPrice[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [station, setStation] = useState<Station | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  
  // Data states
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [selectedPump, setSelectedPump] = useState<Pump | null>(null);
  const [fuelStockCard, setFuelStockCard] = useState<FuelStockCard[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Dialog states
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Form states
  const [salesForm, setSalesForm] = useState({
    pump_id: '',
    product_id: '',
    opening_meter: '',
    closing_meter: '',
    unit_price: '',
    date: new Date().toISOString().split('T')[0],
    calculated_amount: '0.00'
  });

  const [expenseForm, setExpenseForm] = useState({
    category: 'operational',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    type: 'operational' as 'operational' | 'fixed' | 'staff' | 'maintenance' | 'other',
    notes: '',
  });

  const [inventoryForm, setInventoryForm] = useState({
    product_id: '',
    opening_stock: '',
    received: '',
    closing_stock: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Mobile config
  const [mobileConfig, setMobileConfig] = useState<MobileDashboardConfig>({
    showQuickActions: true,
    showOfflineWarning: true,
    enableTouchGestures: true,
    showBatterySaver: false,
  });

  // Refs
  const initializedRef = useRef(false);

  // Battery monitoring
  useEffect(() => {
    const updateBattery = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          
          const updateBatteryInfo = () => {
            setBatteryLevel(Math.round(battery.level * 100));
            setIsCharging(battery.charging);
          };
          
          updateBatteryInfo();
          
          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);
          
          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
          };
        }
      } catch (error) {
        console.error('Battery API not supported:', error);
      }
    };

    updateBattery();
  }, []);

  // Network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (pendingSync > 0) {
        syncOfflineData();
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSync]);

  // Data loading functions
  const loadStation = useCallback(async () => {
    if (!user?.station_id) return;
    
    try {
      const { data, error } = await supabase
        .from('stations')
        .select(`
          *,
          omc:omc_id (
            id,
            name
          )
        `)
        .eq('id', user.station_id)
        .single();

      if (error) throw error;
      setStation(data);
    } catch (error: any) {
      console.error('Failed to load station:', error);
    }
  }, [user?.station_id]);

  const loadPumps = useCallback(async () => {
    if (!user?.station_id) return;
    
    try {
      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', user.station_id)
        .order('number');

      if (error) throw error;
      
      const pumpsData = data || [];
      setPumps(pumpsData);
      
      if (pumpsData.length > 0) {
        const defaultPump = pumpsData[0];
        setSelectedPump(defaultPump);
        
        const matchingProduct = products.find(p => 
          p.name.toLowerCase() === defaultPump.fuel_type?.toLowerCase()
        );
        
        setSalesForm(prev => ({
          ...prev,
          pump_id: defaultPump.id,
          opening_meter: defaultPump.current_meter_reading?.toString() || '0',
          product_id: matchingProduct?.id || ''
        }));
      }
    } catch (error: any) {
      console.error('Failed to load pumps:', error);
      setPumps([]);
    }
  }, [user?.station_id, products]);

  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) {
        const fallbackProducts: Product[] = [
          { id: 'petrol', name: 'Petrol', unit: 'L' },
          { id: 'diesel', name: 'Diesel', unit: 'L' },
          { id: 'lpg', name: 'LPG', unit: 'kg' }
        ];
        setProducts(fallbackProducts);
        return;
      }
      
      const productsData = data || [];
      setProducts(productsData);
      
      if (productsData.length > 0 && pumps.length === 0) {
        const defaultProduct = productsData[0];
        setSalesForm(prev => ({ 
          ...prev, 
          product_id: defaultProduct.id 
        }));
        setInventoryForm(prev => ({
          ...prev,
          product_id: defaultProduct.id
        }));
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      const fallbackProducts: Product[] = [
        { id: 'petrol', name: 'Petrol', unit: 'L' },
        { id: 'diesel', name: 'Diesel', unit: 'L' },
        { id: 'lpg', name: 'LPG', unit: 'kg' }
      ];
      setProducts(fallbackProducts);
    }
  }, [pumps.length]);

  const loadPumpPrices = useCallback(async (forceRefresh = false) => {
    if (!user?.station_id) return;
    
    try {
      if (forceRefresh) {
        await refreshPrices();
      }
      
      const stationAllPrices = getStationAllPrices(user.station_id);
      
      const transformedPrices: PumpPrice[] = stationAllPrices.map(price => ({
        product_type: price.product_name,
        product_id: price.product_id,
        price_per_liter: price.selling_price,
        last_updated: new Date().toISOString()
      }));

      setPumpPrices(transformedPrices);
      
      if (transformedPrices.length > 0) {
        const currentPrice = transformedPrices[0];
        setSalesForm(prev => ({
          ...prev,
          product_id: currentPrice.product_id,
          unit_price: currentPrice.price_per_liter.toString()
        }));
      }
    } catch (error) {
      console.error('Failed to load pump prices:', error);
      const fallbackPrices: PumpPrice[] = [
        { product_type: 'Petrol', product_id: 'petrol', price_per_liter: 12.50, last_updated: new Date().toISOString() },
        { product_type: 'Diesel', product_id: 'diesel', price_per_liter: 11.80, last_updated: new Date().toISOString() },
        { product_type: 'LPG', product_id: 'lpg', price_per_liter: 8.90, last_updated: new Date().toISOString() }
      ];
      setPumpPrices(fallbackPrices);
    }
  }, [user?.station_id, getStationAllPrices, refreshPrices]);

  const loadFuelStockCard = useCallback(async () => {
    if (!user?.station_id) return;

    try {
      const { data: latestStocks, error } = await supabase
        .from('daily_tank_stocks')
        .select(`
          product_id,
          closing_stock,
          stock_date,
          products (
            name,
            unit
          )
        `)
        .eq('station_id', user.station_id)
        .order('stock_date', { ascending: false });

      if (error) throw error;

      const productMap = new Map();
      latestStocks?.forEach(stock => {
        if (!productMap.has(stock.product_id)) {
          productMap.set(stock.product_id, {
            product_id: stock.product_id,
            product_name: stock.products?.name || 'Unknown Product',
            current_stock: stock.closing_stock,
            last_updated: stock.stock_date,
            unit: stock.products?.unit || 'L'
          });
        }
      });

      const uniqueStocks: FuelStockCard[] = Array.from(productMap.values());
      setFuelStockCard(uniqueStocks);
    } catch (error) {
      console.error('Failed to load fuel stock card:', error);
    }
  }, [user?.station_id]);

  const loadExpenses = useCallback(async () => {
    if (!user?.station_id) return;

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('station_id', user.station_id)
        .order('expense_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to load expenses:', error);
        setExpenses([]);
        return;
      }

      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
    }
  }, [user?.station_id]);

  const loadDailyReport = useCallback(async () => {
    if (!user?.station_id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        { data: salesData },
        { data: expensesData }
      ] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount')
          .eq('station_id', user.station_id)
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`),
        
        supabase
          .from('expenses')
          .select('amount')
          .eq('station_id', user.station_id)
          .gte('expense_date', today)
          .lte('expense_date', today)
      ]);

      const total_sales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const total_expenses = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

      const report: DailyReport = {
        total_sales,
        total_expenses,
        inventory: [],
        sales: salesData || [],
        expenses: expensesData || [],
        active_shifts: 0,
        fuel_stock: 0,
        pump_prices: pumpPrices,
        current_stock: fuelStockCard
      };

      setDailyReport(report);
    } catch (error) {
      console.error('Failed to load daily report:', error);
    }
  }, [user?.station_id, pumpPrices, fuelStockCard]);

  const updatePendingCount = useCallback(async () => {
    try {
      const status = offlineSync.getStatus();
      setPendingSync(status.pending);
    } catch (error) {
      console.error('Failed to update pending count:', error);
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    try {
      toast.info('Syncing data...');
      await offlineSync.forceSync();
      await updatePendingCount();
      await loadDailyReport();
      await loadExpenses();
      await refreshPrices();
      toast.success('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed');
    }
  }, [loadDailyReport, loadExpenses, updatePendingCount, refreshPrices]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadDailyReport(),
        loadPumpPrices(true),
        loadFuelStockCard(),
        loadPumps(),
        loadExpenses(),
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadDailyReport, loadPumpPrices, loadFuelStockCard, loadPumps, loadExpenses]);

  // Initialize
  useEffect(() => {
    if (initializedRef.current || !user?.station_id) return;
    
    initializedRef.current = true;

    const initializeDashboard = async () => {
      try {
        await offlineSync.init();
        await loadStation();
        await loadProducts();
        await loadPumps();
        await loadPumpPrices(true);
        await loadFuelStockCard();
        await loadExpenses();
        await loadDailyReport();
        await updatePendingCount();
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        toast.error('Failed to load dashboard');
      }
    };

    initializeDashboard();
  }, [user?.station_id]);

  // Form handlers
  const handleRecordSales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id || !salesForm.pump_id) {
      toast.error('Please select a pump');
      return;
    }

    const opening = parseFloat(salesForm.opening_meter);
    const closing = parseFloat(salesForm.closing_meter);
    
    if (isNaN(opening) || isNaN(closing) || closing < opening) {
      toast.error('Invalid meter readings');
      return;
    }

    setSubmitting(true);
    
    const price = getStationPrice(user.station_id, salesForm.product_id) || 0;
    const volume = closing - opening;
    const calculatedAmount = volume * price;
    
    const salesData = {
      station_id: user.station_id,
      pump_id: salesForm.pump_id,
      opening_meter: opening,
      closing_meter: closing,
      unit_price: price,
      total_amount: calculatedAmount,
      cash_received: calculatedAmount,
      payment_method: 'cash',
      product_id: salesForm.product_id,
      created_by: user.id,
      transaction_time: new Date().toISOString(),
    };

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('sales')
          .insert([salesData]);

        if (error) throw error;

        await supabase
          .from('pumps')
          .update({ 
            current_meter_reading: closing,
            updated_at: new Date().toISOString()
          })
          .eq('id', salesForm.pump_id);

        toast.success(`Sale recorded! ₵${calculatedAmount.toFixed(2)}`);
      } else {
        await offlineSync.addToQueue('create', 'sales', salesData);
        await updatePendingCount();
        toast.success('Sale queued for sync');
      }
      
      setShowSalesDialog(false);
      setSalesForm({
        pump_id: selectedPump?.id || '',
        product_id: selectedPump?.id || '',
        opening_meter: selectedPump?.current_meter_reading?.toString() || '0',
        closing_meter: '',
        unit_price: '',
        date: new Date().toISOString().split('T')[0],
        calculated_amount: '0.00'
      });
      await loadDailyReport();
      await loadPumps();
    } catch (error: any) {
      console.error('Failed to record sales:', error);
      toast.error('Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    setSubmitting(true);
    const expenseData = {
      station_id: user.station_id,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      expense_date: expenseForm.expense_date,
      type: expenseForm.type,
      notes: expenseForm.notes,
      created_by: user.id,
      status: 'pending',
    };

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) throw error;

        toast.success('Expense recorded!');
        setShowExpenseDialog(false);
        setExpenseForm({
          category: 'operational',
          description: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          type: 'operational',
          notes: '',
        });
        await loadExpenses();
        await loadDailyReport();
      } else {
        await offlineSync.addToQueue('create', 'expenses', expenseData);
        await updatePendingCount();
        toast.success('Expense queued for sync');
        setShowExpenseDialog(false);
        setExpenseForm({
          category: 'operational',
          description: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          type: 'operational',
          notes: '',
        });
      }
    } catch (error: any) {
      console.error('Failed to record expense:', error);
      toast.error('Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateSalesAmount = useCallback(() => {
    if (!salesForm.opening_meter || !salesForm.closing_meter || !salesForm.product_id) {
      return;
    }

    const opening = parseFloat(salesForm.opening_meter);
    const closing = parseFloat(salesForm.closing_meter);
    
    if (isNaN(opening) || isNaN(closing)) {
      return;
    }
    
    if (closing < opening) {
      return;
    }

    const volume = closing - opening;
    const price = getStationPrice(user?.station_id || '', salesForm.product_id) || 0;
    const calculatedAmount = volume * price;
    
    setSalesForm(prev => ({
      ...prev,
      calculated_amount: calculatedAmount.toFixed(2)
    }));
  }, [salesForm.opening_meter, salesForm.closing_meter, salesForm.product_id, user?.station_id, getStationPrice]);

  // Sales calculation effect
  useEffect(() => {
    calculateSalesAmount();
  }, [calculateSalesAmount]);

  // Render content based on active tab
  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Pull to refresh */}
      <PullToRefresh onRefresh={refreshAllData} refreshing={refreshing} />
      
      {/* Welcome card */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{station?.name || 'Station'}</h2>
              <p className="text-sm opacity-90">Welcome back, {user?.name?.split(' ')[0] || 'Manager'}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-white border-white hover:bg-white/20"
              onClick={refreshAllData}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <MobileStatCard
          title="Today's Sales"
          value={formatCurrency(dailyReport?.total_sales || 0)}
          icon={DollarSign}
          subtitle={`${dailyReport?.sales?.length || 0} transactions`}
          onClick={() => setActiveTab('sales')}
        />
        <MobileStatCard
          title="Expenses"
          value={formatCurrency(dailyReport?.total_expenses || 0)}
          icon={TrendingUp}
          subtitle={`${expenses.length} records`}
          onClick={() => setActiveTab('expenses')}
        />
        <MobileStatCard
          title="Fuel Stock"
          value={`${fuelStockCard.reduce((sum, item) => sum + (item.current_stock || 0), 0).toLocaleString()}L`}
          icon={Database}
          subtitle={`${fuelStockCard.length} products`}
          onClick={() => setActiveTab('inventory')}
        />
        <MobileStatCard
          title="Active Pumps"
          value={pumps.length}
          icon={Gauge}
          subtitle={`${pumps.filter(p => p.status === 'active').length} active`}
        />
      </div>

      {/* Current Prices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Prices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pumpPrices.slice(0, 3).map((price) => (
            <div key={price.product_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="font-medium">{price.product_type}</span>
              <span className="font-bold text-green-600">
                ₵{price.price_per_liter.toFixed(2)}
              </span>
            </div>
          ))}
          {pumpPrices.length === 0 && (
            <p className="text-center text-gray-500 py-2">No prices available</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {mobileConfig.showQuickActions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              <MobileQuickAction
                icon={ShoppingCart}
                label="Record Sale"
                onClick={() => setShowSalesDialog(true)}
                variant="primary"
              />
              <MobileQuickAction
                icon={Receipt}
                label="Add Expense"
                onClick={() => setShowExpenseDialog(true)}
                variant="warning"
              />
              <MobileQuickAction
                icon={Package}
                label="Inventory"
                onClick={() => setShowInventoryDialog(true)}
                variant="success"
              />
              <MobileQuickAction
                icon={ClipboardList}
                label="More"
                onClick={() => setShowQuickActions(true)}
                variant="default"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses.slice(0, 3).map((expense) => (
            <div key={expense.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{expense.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(expense.expense_date).toLocaleDateString()}
                </p>
              </div>
              <span className="font-semibold">₵{expense.amount}</span>
            </div>
          ))}
          {expenses.length === 0 && (
            <p className="text-center text-gray-500 py-2">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderSales = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Sales Management</h2>
        <Button 
          size="sm"
          onClick={() => setShowSalesDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Sale
        </Button>
      </div>

      {/* Pump Selection */}
      <Card>
        <CardContent className="p-4">
          <Label className="mb-2 block">Select Pump</Label>
          <div className="space-y-2">
            {pumps.map((pump) => (
              <button
                key={pump.id}
                onClick={() => {
                  setSelectedPump(pump);
                  setSalesForm(prev => ({
                    ...prev,
                    pump_id: pump.id,
                    opening_meter: pump.current_meter_reading?.toString() || '0'
                  }));
                }}
                className={`w-full p-3 rounded-lg text-left ${selectedPump?.id === pump.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{pump.name}</p>
                    <p className="text-sm text-gray-600">
                      Pump {pump.number} • {pump.fuel_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{pump.current_meter_reading || 0}L</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pump.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {pump.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {pumps.length === 0 && (
              <p className="text-center text-gray-500 py-4">No pumps configured</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dailyReport?.sales?.slice(0, 5).map((sale: any) => (
            <div key={sale.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sale #{sale.id?.slice(-6)}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₵{sale.total_amount?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-gray-600">
                    {sale.closing_meter - sale.opening_meter}L
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Inventory Management</h2>
        <Button 
          size="sm"
          onClick={() => setShowInventoryDialog(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Update Stock
        </Button>
      </div>

      {/* Current Stock */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fuelStockCard.map((item) => (
            <div key={item.product_id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{item.product_name}</p>
                  <p className="text-sm text-gray-600">
                    Last updated: {new Date(item.last_updated).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {item.current_stock?.toLocaleString()}{item.unit}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {fuelStockCard.length === 0 && (
            <p className="text-center text-gray-500 py-8">No stock data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Expense Management</h2>
        <Button 
          size="sm"
          onClick={() => setShowExpenseDialog(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Expense
        </Button>
      </div>

      {/* Expense Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">Total Expenses Today</p>
            <p className="text-3xl font-bold text-gray-900">
              ₵{(dailyReport?.total_expenses || 0).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium capitalize">{expense.category}</p>
                  <p className="text-sm text-gray-600">{expense.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">₵{expense.amount}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {expense.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <p className="text-center text-gray-500 py-8">No expenses recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderMore = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">More Options</h2>
      
      {/* Sync Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Offline</span>
                </>
              )}
            </div>
            {pendingSync > 0 && (
              <Button 
                size="sm" 
                onClick={syncOfflineData}
                variant="outline"
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Sync ({pendingSync})
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            <button className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 active:bg-gray-200">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </div>
            </button>
            
            <button className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 active:bg-gray-200">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </div>
            </button>
            
            <button className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 active:bg-gray-200">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5" />
                <span>Export Reports</span>
              </div>
            </button>
            
            <button className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 active:bg-gray-200">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5" />
                <span>View History</span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'sales':
        return renderSales();
      case 'inventory':
        return renderInventory();
      case 'expenses':
        return renderExpenses();
      case 'more':
        return renderMore();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 safe-area-padding">
      {/* Status Bar */}
      <MobileStatusBar 
        isOnline={isOnline} 
        pendingSync={pendingSync}
        batteryLevel={batteryLevel}
        isCharging={isCharging}
      />

      {/* Main Content */}
      <div className="px-4 py-4">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Sales Dialog */}
      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
        <DialogContent className="max-w-[95vw] bg-white p-4 rounded-2xl mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg">Record Sale</DialogTitle>
            <DialogDescription>Enter pump meter readings</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleRecordSales} className="space-y-4">
            {selectedPump && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-800">Pump: {selectedPump.name}</p>
                <p className="text-sm text-blue-600">Current: {selectedPump.current_meter_reading}L</p>
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <Label>Opening Meter (L)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={salesForm.opening_meter}
                  onChange={(e) => setSalesForm({ ...salesForm, opening_meter: e.target.value })}
                  placeholder="0.00"
                  required
                  className="text-lg"
                />
              </div>
              
              <div>
                <Label>Closing Meter (L)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={salesForm.closing_meter}
                  onChange={(e) => setSalesForm({ ...salesForm, closing_meter: e.target.value })}
                  placeholder="0.00"
                  required
                  className="text-lg"
                />
              </div>
              
              {salesForm.calculated_amount !== '0.00' && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">Amount to collect:</p>
                  <p className="text-xl font-bold text-green-700">₵{salesForm.calculated_amount}</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting ? 'Recording...' : 'Record Sale'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-[95vw] bg-white p-4 rounded-2xl mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg">Add Expense</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleRecordExpense} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Description</Label>
                <Input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="What was this expense for?"
                  required
                />
              </div>
              
              <div>
                <Label>Amount (₵)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="text-lg"
                />
              </div>
              
              <div>
                <Label>Category</Label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="supplies">Supplies</option>
                  <option value="staff">Staff</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inventory Dialog */}
      <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
        <DialogContent className="max-w-[95vw] bg-white p-4 rounded-2xl mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg">Update Inventory</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleRecordExpense} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Product</Label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={inventoryForm.product_id}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, product_id: e.target.value })}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Opening Stock</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inventoryForm.opening_stock}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, opening_stock: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label>Received</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inventoryForm.received}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, received: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <Label>Closing Stock</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inventoryForm.closing_stock}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, closing_stock: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Update Inventory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Actions Sheet */}
      <Sheet open={showQuickActions} onOpenChange={setShowQuickActions}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Quick Actions</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            <MobileQuickAction
              icon={Building2}
              label="Station Check"
              onClick={() => {}}
              variant="default"
            />
            <MobileQuickAction
              icon={Fuel}
              label="Tank Dipping"
              onClick={() => {}}
              variant="default"
            />
            <MobileQuickAction
              icon={Calculator}
              label="Calculators"
              onClick={() => {}}
              variant="default"
            />
            <MobileQuickAction
              icon={ClipboardList}
              label="Daily Report"
              onClick={() => {}}
              variant="default"
            />
            <MobileQuickAction
              icon={Users}
              label="Staff Management"
              onClick={() => {}}
              variant="default"
            />
            <MobileQuickAction
              icon={BarChart}
              label="Analytics"
              onClick={() => {}}
              variant="default"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Notifications Sheet */}
      <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
        <SheetContent side="right" className="w-full max-w-sm">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {/* Notifications content */}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default MobileStationManagerDashboard;