// src/pages/mobile/MobileStationManagerDashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase-client";
import { useAuth } from "../../contexts/AuthContext";
import { usePrices } from "../../contexts/PriceContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Plus,
  Wifi,
  WifiOff,
  Fuel,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Settings,
  Calculator,
  Upload,
  Calendar,
  Clock,
  Receipt,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { offlineSync } from "../../utils/offline-sync";

interface DailyReport {
  total_sales: number;
  total_expenses: number;
  inventory: any[];
  sales: any[];
  expenses: any[];
  active_shifts: number;
  fuel_stock: number;
  pump_prices: any[];
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
  approved_by?: string;
  created_at: string;
  updated_at: string;
  receipt_url?: string;
  notes?: string;
}

interface Product {
  id: string;
  name: string;
  unit: string;
}

// Mobile-optimized components
const MobileStatsGrid = ({ 
  todaySales, 
  totalExpenses, 
  fuelStock, 
  activeShifts 
}: { 
  todaySales: number;
  totalExpenses: number;
  fuelStock: number;
  activeShifts: number;
}) => {
  const stats = [
    {
      label: "Today's Sales",
      value: `₵${todaySales.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      label: "Expenses",
      value: `₵${totalExpenses.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      label: "Fuel Stock",
      value: `${Math.round(fuelStock).toLocaleString()}L`,
      icon: Fuel,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "Active Shifts",
      value: `${activeShifts}`,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className={`p-3 rounded-xl ${stat.bgColor} border-0`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white">
                <IconComponent className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MobileSaleItem = ({ sale }: { sale: any }) => (
  <div className="flex justify-between items-center p-3 border-b border-gray-100 last:border-b-0">
    <div>
      <p className="font-medium text-sm text-gray-900">{sale.products?.name || 'Unknown Product'}</p>
      <p className="text-xs text-gray-600">
        {sale.quantity}L • {new Date(sale.created_at).toLocaleTimeString()}
      </p>
    </div>
    <p className="text-sm font-semibold text-gray-900">₵{sale.total_amount.toLocaleString()}</p>
  </div>
);

const MobileExpenseItem = ({ expense, onUpdateStatus, onDelete }: { 
  expense: Expense; 
  onUpdateStatus: (id: string, status: 'approved' | 'rejected') => void;
  onDelete: (id: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium text-sm text-gray-900 capitalize">{expense.category}</p>
          <p className="text-xs text-gray-600">{expense.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">₵{expense.amount}</p>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(expense.status)}`}>
            {expense.status}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
        {expense.status === 'pending' && (
          <div className="flex gap-1">
            <Button
              size="sm"
              className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onUpdateStatus(expense.id, 'approved')}
            >
              <CheckCircle className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onUpdateStatus(expense.id, 'rejected')}
            >
              <XCircle className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const MobileQuickAction = ({ icon: Icon, label, onClick, color = "text-gray-700" }: {
  icon: any;
  label: string;
  onClick: () => void;
  color?: string;
}) => (
  <Button 
    variant="outline" 
    className="h-16 flex-col gap-1 bg-white hover:bg-gray-50 border-gray-300 flex-1 min-w-0"
    onClick={onClick}
  >
    <Icon className={`w-5 h-5 ${color}`} />
    <span className="text-xs text-gray-700">{label}</span>
  </Button>
);

export function MobileStationManagerDashboard() {
  const { user } = useAuth();
  const { 
    getStationPrice, 
    getStationAllPrices,
    loading: pricesLoading,
    refreshPrices 
  } = usePrices();
  
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'sales' | 'expenses' | 'inventory'>('overview');
  const [pumpPrices, setPumpPrices] = useState<PumpPrice[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Expense state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Dialog states
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);

  // Form states
  const [salesForm, setSalesForm] = useState({
    product_type: 'Petrol',
    product_id: '',
    volume: '',
    amount: '',
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
    receipt_url: ''
  });

  const [inventoryForm, setInventoryForm] = useState({
    product_type: 'Petrol',
    product_id: '',
    opening_stock: '',
    deliveries: '',
    closing_stock: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load products for dropdowns
  const [products, setProducts] = useState<Product[]>([]);

  // Load products from database
  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      
      const productsData = data || [];
      setProducts(productsData);
      
      // Set default product in forms
      if (productsData.length > 0) {
        const defaultProduct = productsData[0];
        setSalesForm(prev => ({ 
          ...prev, 
          product_type: defaultProduct.name,
          product_id: defaultProduct.id 
        }));
        setInventoryForm(prev => ({
          ...prev,
          product_type: defaultProduct.name,
          product_id: defaultProduct.id
        }));
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      // Fallback products
      const fallbackProducts: Product[] = [
        { id: 'petrol', name: 'Petrol', unit: 'L' },
        { id: 'diesel', name: 'Diesel', unit: 'L' },
        { id: 'lpg', name: 'LPG', unit: 'kg' }
      ];
      setProducts(fallbackProducts);
    }
  }, []);

  // Load current pump prices from Price Context
  const loadPumpPrices = useCallback(async () => {
    if (!user?.station_id) return;
    
    try {
      const stationAllPrices = getStationAllPrices(user.station_id);
      
      const transformedPrices: PumpPrice[] = stationAllPrices.map(price => ({
        product_type: price.product_name,
        product_id: price.product_id,
        price_per_liter: price.selling_price,
        last_updated: new Date().toISOString()
      }));

      setPumpPrices(transformedPrices);
      
      // Update forms with current prices
      if (transformedPrices.length > 0) {
        const currentPrice = transformedPrices[0];
        setSalesForm(prev => ({
          ...prev,
          product_type: currentPrice.product_type,
          product_id: currentPrice.product_id
        }));
      }
    } catch (error) {
      console.error('Failed to load pump prices:', error);
      // Fallback prices
      const fallbackPrices: PumpPrice[] = [
        { product_type: 'Petrol', product_id: 'petrol', price_per_liter: 12.50, last_updated: new Date().toISOString() },
        { product_type: 'Diesel', product_id: 'diesel', price_per_liter: 11.80, last_updated: new Date().toISOString() },
        { product_type: 'LPG', product_id: 'lpg', price_per_liter: 8.90, last_updated: new Date().toISOString() }
      ];
      setPumpPrices(fallbackPrices);
    }
  }, [user?.station_id, getStationAllPrices]);

  // Load expenses with real data
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

  // Load daily report with real data
  const loadDailyReport = useCallback(async () => {
    if (!user?.station_id) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        { data: salesData, error: salesError },
        { data: inventoryData, error: inventoryError },
        { data: shiftsData, error: shiftsError },
        { data: expensesData, error: expensesError }
      ] = await Promise.all([
        supabase
          .from('sales')
          .select(`
            *,
            products(name),
            stations(name)
          `)
          .eq('station_id', user.station_id)
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('daily_tank_stocks')
          .select(`
            *,
            products(name)
          `)
          .eq('station_id', user.station_id)
          .gte('stock_date', today)
          .lte('stock_date', today)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('shifts')
          .select('*')
          .eq('station_id', user.station_id)
          .eq('status', 'active'),
        
        supabase
          .from('expenses')
          .select('*')
          .eq('station_id', user.station_id)
          .gte('expense_date', today)
          .lte('expense_date', today)
      ]);

      if (salesError) console.error('Sales fetch error:', salesError);
      if (inventoryError) console.error('Inventory fetch error:', inventoryError);
      if (shiftsError) console.error('Shifts fetch error:', shiftsError);
      if (expensesError) console.error('Expenses fetch error:', expensesError);

      const total_sales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const total_expenses = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
      const fuel_stock = inventoryData?.reduce((sum, inv) => sum + (inv.closing_stock || 0), 0) || 0;

      const report: DailyReport = {
        total_sales,
        total_expenses,
        inventory: inventoryData || [],
        sales: salesData || [],
        expenses: expensesData || [],
        active_shifts: shiftsData?.length || 0,
        fuel_stock,
        pump_prices: pumpPrices
      };

      setDailyReport(report);
    } catch (error) {
      console.error('Failed to load daily report:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.station_id, pumpPrices]);

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
      toast.info('Starting sync...');
      const result = await offlineSync.forceSync();
      await updatePendingCount();
      await loadDailyReport();
      await loadExpenses();
      await refreshPrices();
      
      if (result.failures > 0) {
        toast.error(`Sync completed with ${result.failures} failures`);
      } else {
        toast.success('Sync completed successfully');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed. Please try again.');
    }
  }, [loadDailyReport, loadExpenses, updatePendingCount, refreshPrices]);

  // Calculate sales amount automatically using real prices
  const calculateSalesAmount = useCallback((volume: string, productId: string) => {
    if (!volume) {
      setSalesForm(prev => ({ ...prev, calculated_amount: '0.00', amount: '' }));
      return;
    }

    const price = getStationPrice(user?.station_id || '', productId) || 0;
    const calculatedAmount = parseFloat(volume) * price;
    setSalesForm(prev => ({
      ...prev,
      calculated_amount: calculatedAmount.toFixed(2),
      amount: calculatedAmount.toFixed(2)
    }));
  }, [user?.station_id, getStationPrice]);

  // Event handlers with real data integration
  const handleRecordSales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    if (!salesForm.volume || parseFloat(salesForm.volume) <= 0) {
      toast.error('Please enter a valid volume');
      return;
    }

    setSubmitting(true);
    const salesData = {
      station_id: user.station_id,
      product_id: salesForm.product_id,
      quantity: parseFloat(salesForm.volume),
      unit_price: getStationPrice(user.station_id, salesForm.product_id) || 0,
      total_amount: parseFloat(salesForm.amount),
      payment_method: 'cash',
      customer_type: 'retail',
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('sales')
          .insert([salesData]);

        if (error) throw error;
        toast.success('Sale recorded successfully!');
      } else {
        await offlineSync.addToQueue('create', 'sales', salesData);
        await updatePendingCount();
        toast.success('Sale queued for sync (offline mode)');
      }
      
      setShowSalesDialog(false);
      resetSalesForm();
      await loadDailyReport();
    } catch (error: any) {
      console.error('Failed to record sales:', error);
      toast.error(`Failed to record sale: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    const expenseData = {
      station_id: user.station_id,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      expense_date: expenseForm.expense_date,
      type: expenseForm.type,
      notes: expenseForm.notes,
      receipt_url: expenseForm.receipt_url,
      created_by: user.id,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('expenses')
          .insert([expenseData])
          .select()
          .single();

        if (error) throw error;

        toast.success('Expense recorded successfully!');
        setShowExpenseDialog(false);
        resetExpenseForm();
        await loadExpenses();
        await loadDailyReport();
      } else {
        await offlineSync.addToQueue('create', 'expenses', expenseData);
        await updatePendingCount();
        toast.success('Expense queued for sync (offline mode)');
        setShowExpenseDialog(false);
        resetExpenseForm();
      }
    } catch (error: any) {
      console.error('Failed to record expense:', error);
      toast.error(`Failed to record expense: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateExpenseStatus = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ 
          status, 
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId);

      if (error) throw error;

      toast.success(`Expense ${status} successfully`);
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to update expense:', error);
      toast.error('Failed to update expense status');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Expense deleted successfully');
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  // Fixed Inventory Handler
  const handleInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    if (!inventoryForm.opening_stock || !inventoryForm.closing_stock) {
      toast.error('Please fill in opening and closing stock');
      return;
    }

    setSubmitting(true);
    
    const inventoryData = {
      station_id: user.station_id,
      product_id: inventoryForm.product_id,
      opening_stock: parseFloat(inventoryForm.opening_stock) || 0,
      closing_stock: parseFloat(inventoryForm.closing_stock) || 0,
      deliveries: parseFloat(inventoryForm.deliveries) || 0,
      stock_date: inventoryForm.date,
      recorded_by: user.id,
      notes: "Daily inventory record",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('daily_tank_stocks')
          .insert([inventoryData]);

        if (error) throw error;
        
        toast.success('Inventory recorded successfully!');
        setShowInventoryDialog(false);
        resetInventoryForm();
        await loadDailyReport();
      } else {
        await offlineSync.addToQueue('create', 'daily_tank_stocks', inventoryData);
        await updatePendingCount();
        toast.success('Inventory queued for sync (offline mode)');
        setShowInventoryDialog(false);
        resetInventoryForm();
      }
    } catch (error: any) {
      console.error('Failed to record inventory:', error);
      toast.error(`Failed to record inventory: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Form reset functions
  const resetSalesForm = () => {
    const defaultProduct = products[0];
    setSalesForm({
      product_type: defaultProduct?.name || 'Petrol',
      product_id: defaultProduct?.id || '',
      volume: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      calculated_amount: '0.00'
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category: 'operational',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      type: 'operational',
      notes: '',
      receipt_url: ''
    });
  };

  const resetInventoryForm = () => {
    const defaultProduct = products[0];
    setInventoryForm({
      product_type: defaultProduct?.name || 'Petrol',
      product_id: defaultProduct?.id || '',
      opening_stock: '',
      deliveries: '',
      closing_stock: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Initialize dashboard
  useEffect(() => {
    if (!user?.station_id) return;

    const initializeDashboard = async () => {
      try {
        await offlineSync.init();
        await loadProducts();
        await loadPumpPrices();
        await loadExpenses();
        await loadDailyReport();
        await updatePendingCount();
        await refreshPrices();
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        toast.error('Failed to initialize dashboard');
      }
    };

    initializeDashboard();
  }, [user?.station_id]);

  // Network status listeners
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
  }, [syncOfflineData, pendingSync]);

  // Loading skeletons
  const MobileStatsSkeleton = () => (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-gray-100">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="w-6 h-6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const MobileContentSkeleton = () => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center p-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (loading && !dailyReport) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        <MobileStatsSkeleton />

        {/* Navigation Skeleton */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['Overview', 'Sales', 'Expenses', 'Inventory'].map((item) => (
            <Skeleton key={item} className="h-8 w-20 rounded-lg" />
          ))}
        </div>

        <MobileContentSkeleton />
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Pump Prices */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Current Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pricesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))
            ) : pumpPrices.length > 0 ? (
              pumpPrices.map((price) => (
                <div key={price.product_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">{price.product_type}</span>
                  <span className="text-sm font-bold text-green-600">
                    ₵{price.price_per_liter.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-2 text-sm">No active prices</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <MobileQuickAction
              icon={DollarSign}
              label="Record Sale"
              onClick={() => setShowSalesDialog(true)}
              color="text-green-600"
            />
            <MobileQuickAction
              icon={Receipt}
              label="Add Expense"
              onClick={() => setShowExpenseDialog(true)}
              color="text-red-600"
            />
            <MobileQuickAction
              icon={Package}
              label="Inventory"
              onClick={() => setShowInventoryDialog(true)}
              color="text-blue-600"
            />
            <MobileQuickAction
              icon={RefreshCw}
              label="Sync Data"
              onClick={syncOfflineData}
              color="text-purple-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyReport?.sales?.slice(0, 3).length === 0 ? (
            <p className="text-center text-gray-500 py-4 text-sm">No sales today</p>
          ) : (
            <div>
              {dailyReport?.sales?.slice(0, 3).map((sale: any) => (
                <MobileSaleItem key={sale.id} sale={sale} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderSales = () => (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Sales Management</CardTitle>
        <Button 
          size="sm" 
          style={{ backgroundColor: '#0B2265' }}
          onClick={() => setShowSalesDialog(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {dailyReport?.sales?.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No sales recorded today</p>
        ) : (
          <div>
            {dailyReport?.sales?.map((sale: any) => (
              <MobileSaleItem key={sale.id} sale={sale} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderExpenses = () => (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Expense Management</CardTitle>
        <Button 
          size="sm" 
          style={{ backgroundColor: '#0B2265' }}
          onClick={() => setShowExpenseDialog(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No expenses recorded</p>
        ) : (
          <div>
            {expenses.map((expense) => (
              <MobileExpenseItem
                key={expense.id}
                expense={expense}
                onUpdateStatus={handleUpdateExpenseStatus}
                onDelete={handleDeleteExpense}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderInventory = () => (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Inventory</CardTitle>
        <Button 
          size="sm" 
          style={{ backgroundColor: '#0B2265' }}
          onClick={() => setShowInventoryDialog(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {dailyReport?.inventory?.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No inventory data</p>
        ) : (
          <div className="space-y-3">
            {dailyReport?.inventory?.map((item: any) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.products?.name || 'Unknown Product'}</p>
                    <p className="text-xs text-gray-600">
                      Stock: {item.closing_stock}L
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {new Date(item.stock_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Station Operations</h1>
            <p className="text-xs text-gray-600">Daily Management</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-lg flex items-center gap-1 ${isOnline ? 'bg-green-100' : 'bg-orange-100'}`}>
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-700">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-orange-600" />
                  <span className="text-xs text-orange-700">Offline</span>
                </>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                loadDailyReport();
                loadExpenses();
              }}
              disabled={loading}
              className="w-8 h-8 p-0"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Sync Status */}
        {pendingSync > 0 && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-yellow-700">
                {pendingSync} pending sync
              </span>
            </div>
            {isOnline && (
              <Button 
                size="sm" 
                onClick={syncOfflineData}
                className="bg-yellow-600 hover:bg-yellow-700 text-white h-6 px-2 text-xs"
              >
                Sync Now
              </Button>
            )}
          </div>
        )}

        <MobileStatsGrid
          todaySales={dailyReport?.total_sales || 0}
          totalExpenses={dailyReport?.total_expenses || 0}
          fuelStock={dailyReport?.fuel_stock || 0}
          activeShifts={dailyReport?.active_shifts || 0}
        />

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { key: 'sales' as const, label: 'Sales', icon: DollarSign },
            { key: 'expenses' as const, label: 'Expenses', icon: Receipt },
            { key: 'inventory' as const, label: 'Inventory', icon: Package },
          ].map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.key;
            
            return (
              <Button
                key={item.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSection(item.key)}
                className={`flex items-center gap-1 whitespace-nowrap ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                <IconComponent className="w-3 h-3" />
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Content Sections */}
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'sales' && renderSales()}
        {activeSection === 'expenses' && renderExpenses()}
        {activeSection === 'inventory' && renderInventory()}
      </div>

      {/* Dialogs */}
      {/* Sales Dialog */}
      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
        <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Record Sales</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordSales} className="space-y-4">
            <div>
              <Label className="text-gray-700">Product Type</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                value={salesForm.product_type}
                onChange={(e) => {
                  const selectedProduct = products.find(p => p.name === e.target.value);
                  setSalesForm({ 
                    ...salesForm, 
                    product_type: e.target.value,
                    product_id: selectedProduct?.id || '' 
                  });
                  calculateSalesAmount(salesForm.volume, selectedProduct?.id || '');
                }}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-700">Volume (Liters)</Label>
              <Input
                type="number"
                step="0.01"
                value={salesForm.volume}
                onChange={(e) => {
                  setSalesForm({ ...salesForm, volume: e.target.value });
                  calculateSalesAmount(e.target.value, salesForm.product_id);
                }}
                placeholder="0.00"
                required
                className="bg-white text-gray-900"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-blue-700 font-semibold">Calculated Amount</Label>
              <div className="flex items-center gap-2 mt-1">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span className="text-lg font-bold text-blue-700">
                  ₵{salesForm.calculated_amount}
                </span>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              style={{ backgroundColor: '#0B2265' }}
              disabled={submitting}
            >
              {submitting ? 'Recording...' : 'Save Sale'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordExpense} className="space-y-4">
            <div>
              <Label className="text-gray-700">Category</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              >
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
                <option value="supplies">Supplies</option>
                <option value="utilities">Utilities</option>
                <option value="staff">Staff</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-700">Description</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Expense description"
                required
                className="bg-white text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Amount (₵)</Label>
              <Input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0.00"
                required
                className="bg-white text-gray-900"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              style={{ backgroundColor: '#0B2265' }}
              disabled={submitting}
            >
              {submitting ? 'Recording...' : 'Record Expense'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inventory Dialog */}
      <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
        <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Inventory Management</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInventory} className="space-y-4">
            <div>
              <Label className="text-gray-700">Product Type</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                value={inventoryForm.product_type}
                onChange={(e) => {
                  const selectedProduct = products.find(p => p.name === e.target.value);
                  setInventoryForm({ 
                    ...inventoryForm, 
                    product_type: e.target.value,
                    product_id: selectedProduct?.id || '' 
                  });
                }}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-700">Opening Stock (L)</Label>
              <Input
                type="number"
                step="0.01"
                value={inventoryForm.opening_stock}
                onChange={(e) => setInventoryForm({ ...inventoryForm, opening_stock: e.target.value })}
                required
                className="bg-white text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Deliveries (L)</Label>
              <Input
                type="number"
                step="0.01"
                value={inventoryForm.deliveries}
                onChange={(e) => setInventoryForm({ ...inventoryForm, deliveries: e.target.value })}
                placeholder="0.00"
                className="bg-white text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Closing Stock (L)</Label>
              <Input
                type="number"
                step="0.01"
                value={inventoryForm.closing_stock}
                onChange={(e) => setInventoryForm({ ...inventoryForm, closing_stock: e.target.value })}
                required
                className="bg-white text-gray-900"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              style={{ backgroundColor: '#0B2265' }}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Inventory'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MobileStationManagerDashboard;