import React, { useState, useEffect, lazy, Suspense, useCallback, useRef } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Skeleton } from "../../components/ui/skeleton";
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
} from "lucide-react";
import { offlineSync } from "../../utils/offline-sync";

// Lazy loaded components
const LazyIoTDashboard = lazy(() => import('../../components/temp/IoTDashboard'));
const LazyShiftManagement = lazy(() => import('../../pages/operations/ShiftManagement'));
const LazyPumpCalibration = lazy(() => import('../../pages/operations/PumpCalibration'));
const LazyBankDeposits = lazy(() => import('../../pages/financial/BankDeposits'));

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
  approved_by?: string;
  created_at: string;
  updated_at: string;
  receipt_url?: string;
  notes?: string;
}

interface ExpenseStats {
  total_expenses: number;
  operational: number;
  fixed: number;
  staff: number;
  maintenance: number;
  other: number;
  pending_approval: number;
}

interface Product {
  id: string;
  name: string;
  unit: string;
}

// UPDATED: Correct Pump interface based on your actual table structure
interface Pump {
  id: string;
  station_id: string;
  name: string;
  number: string;
  fuel_type: string;
  status: 'active' | 'inactive' | 'maintenance';
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  current_meter_reading: number;
  total_dispensed: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface InventoryHistory {
  id: string;
  station_id: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  deliveries: number;
  stock_date: string;
  recorded_by: string;
  created_at: string;
  products?: Product;
}

interface FuelStockCard {
  product_id: string;
  product_name: string;
  current_stock: number;
  last_updated: string;
  unit: string;
}

interface Bank {
  id: string;
  name: string;
  account_number: string;
  branch: string;
  station_id: string;
  is_active: boolean;
  created_at: string;
}

// Form Separator Component
const FormSection = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="border-b border-gray-200 pb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// Scrollable Dialog Content Component
const ScrollableDialogContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`max-h-[70vh] overflow-y-auto ${className}`}>
    {children}
  </div>
);

export function StationManagerDashboard() {
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
  const [activeTab, setActiveTab] = useState('operations');
  const [pumpPrices, setPumpPrices] = useState<PumpPrice[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // New state for pumps, inventory, and banks
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [selectedPump, setSelectedPump] = useState<Pump | null>(null);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryHistory[]>([]);
  const [fuelStockCard, setFuelStockCard] = useState<FuelStockCard[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [showBankDialog, setShowBankDialog] = useState(false);
  
  // Expense state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseStats, setExpenseStats] = useState<ExpenseStats>({
    total_expenses: 0,
    operational: 0,
    fixed: 0,
    staff: 0,
    maintenance: 0,
    other: 0,
    pending_approval: 0
  });
  
  // Dialog states
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showTankDippingDialog, setShowTankDippingDialog] = useState(false);
  const [showStationCheckDialog, setShowStationCheckDialog] = useState(false);

  // Form states - Updated for pump-based sales
  const [salesForm, setSalesForm] = useState({
    pump_id: '',
    product_type: 'Petrol',
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

  const [tankDippingForm, setTankDippingForm] = useState({
    tank_number: '1',
    product_type: 'Petrol',
    product_id: '',
    dip_reading: '',
    water_level: '',
    temperature: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5)
  });

  const [stationCheckForm, setStationCheckForm] = useState({
    check_type: 'Opening',
    safety_equipment: true,
    cleanliness: true,
    equipment_functional: true,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [bankForm, setBankForm] = useState({
    name: '',
    account_number: '',
    branch: '',
    is_active: true
  });

  // Load products for dropdowns
  const [products, setProducts] = useState<Product[]>([]);

  // Refs to prevent multiple initializations
  const initializedRef = useRef(false);
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const priceLoadAttemptedRef = useRef(false);

  // FIXED: Load pumps from database with correct column names
  const loadPumps = useCallback(async () => {
    if (!user?.station_id) {
      console.log('❌ No station ID available');
      return;
    }
    
    try {
      console.log('🔄 Loading pumps for station:', user.station_id);
      
      // Use the exact column names from your table
      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', user.station_id)
        .eq('status', 'active')
        .order('number');

      if (error) {
        console.error('❌ Pump fetch error:', error);
        throw error;
      }
      
      console.log('✅ Pumps loaded:', data);
      const pumpsData = data || [];
      setPumps(pumpsData);
      
      // Set default pump
      if (pumpsData.length > 0) {
        const defaultPump = pumpsData[0];
        setSelectedPump(defaultPump);
        
        // Find matching product for this fuel type
        const matchingProduct = products.find(p => 
          p.name.toLowerCase() === defaultPump.fuel_type?.toLowerCase()
        );
        
        setSalesForm(prev => ({
          ...prev,
          pump_id: defaultPump.id,
          opening_meter: defaultPump.current_meter_reading?.toString() || '0',
          product_type: defaultPump.fuel_type || 'Petrol',
          product_id: matchingProduct?.id || ''
        }));
      } else {
        console.log('⚠️ No active pumps found for this station');
        toast.info('No active pumps configured for this station');
      }
    } catch (error: any) {
      console.error('❌ Failed to load pumps:', error);
      
      // More specific error handling
      if (error.code === '42P01') {
        console.error('Pumps table does not exist');
        toast.error('Pumps table not configured. Please contact administrator.');
      } else if (error.message?.includes('does not exist')) {
        toast.error('Pumps table not found. Please check database setup.');
      } else {
        toast.error('Failed to load pump data: ' + (error.message || 'Unknown error'));
      }
      
      // Set empty pumps array to prevent further errors
      setPumps([]);
    }
  }, [user?.station_id, products]);

  // Debug function to check pumps table
  const debugPumpsTable = async () => {
    if (!user?.station_id) return;
    
    try {
      console.log('🔍 Debugging pumps table...');
      
      // Check if pumps table exists and get sample data
      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', user.station_id)
        .limit(5);

      if (error) {
        console.error('❌ Debug query error:', error);
        toast.error(`Pumps table error: ${error.message}`);
        return;
      }

      console.log('🔍 Pumps table sample data:', data);
      
      if (data && data.length > 0) {
        toast.success(`Found ${data.length} pumps. Check console for details.`);
      } else {
        toast.info('No pumps found for this station. Please add pumps first.');
      }
    } catch (error: any) {
      console.error('❌ Debug failed:', error);
      toast.error('Debug failed: ' + error.message);
    }
  };

  // Load banks
  const loadBanks = useCallback(async () => {
    if (!user?.station_id) return;

    try {
      console.log('🔄 Loading banks...');
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('station_id', user.station_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      setBanks(data || []);
    } catch (error) {
      console.error('Failed to load banks:', error);
    }
  }, [user?.station_id]);

  // Add new bank
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    setSubmitting(true);
    const bankData = {
      station_id: user.station_id,
      name: bankForm.name,
      account_number: bankForm.account_number,
      branch: bankForm.branch,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('banks')
        .insert([bankData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Bank added successfully!');
      setShowBankDialog(false);
      setBankForm({
        name: '',
        account_number: '',
        branch: '',
        is_active: true
      });
      await loadBanks();
    } catch (error: any) {
      console.error('Failed to add bank:', error);
      toast.error(`Failed to add bank: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Load products from database
  const loadProducts = useCallback(async () => {
    try {
      console.log('🔄 Loading products...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) {
        console.error('Product fetch error:', error);
        // Use fallback products
        const fallbackProducts: Product[] = [
          { id: 'petrol', name: 'Petrol', unit: 'L' },
          { id: 'diesel', name: 'Diesel', unit: 'L' },
          { id: 'lpg', name: 'LPG', unit: 'kg' }
        ];
        setProducts(fallbackProducts);
        return;
      }
      
      const productsData = data || [];
      console.log('✅ Products loaded:', productsData);
      setProducts(productsData);
      
      // Set default product in forms if no pumps available
      if (productsData.length > 0 && pumps.length === 0) {
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
        setTankDippingForm(prev => ({
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
  }, [pumps.length]);

  // Load current pump prices from Price Context with retry logic
  const loadPumpPrices = useCallback(async (forceRefresh = false) => {
    if (!user?.station_id) return;
    
    try {
      console.log('🔄 Loading pump prices...');
      
      // Force refresh prices if requested
      if (forceRefresh) {
        await refreshPrices();
      }
      
      const stationAllPrices = getStationAllPrices(user.station_id);
      console.log('✅ Station prices:', stationAllPrices);
      
      // If no prices found and we haven't attempted to load yet, try refreshing
      if (stationAllPrices.length === 0 && !priceLoadAttemptedRef.current) {
        console.log('🔄 No prices found, attempting refresh...');
        priceLoadAttemptedRef.current = true;
        await refreshPrices();
        // Try again after refresh
        const refreshedPrices = getStationAllPrices(user.station_id);
        
        const transformedPrices: PumpPrice[] = refreshedPrices.map(price => ({
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
            product_id: currentPrice.product_id,
            unit_price: currentPrice.price_per_liter.toString()
          }));
        }
      } else {
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
            product_id: currentPrice.product_id,
            unit_price: currentPrice.price_per_liter.toString()
          }));
        }
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
  }, [user?.station_id, getStationAllPrices, refreshPrices]);

  // Load inventory history (last 15 days)
  const loadInventoryHistory = useCallback(async () => {
    if (!user?.station_id) return;

    try {
      console.log('🔄 Loading inventory history...');
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data, error } = await supabase
        .from('daily_tank_stocks')
        .select(`
          *,
          products (*)
        `)
        .eq('station_id', user.station_id)
        .gte('stock_date', fifteenDaysAgo.toISOString().split('T')[0])
        .order('stock_date', { ascending: false });

      if (error) throw error;
      
      setInventoryHistory(data || []);
    } catch (error) {
      console.error('Failed to load inventory history:', error);
      toast.error('Failed to load inventory history');
    }
  }, [user?.station_id]);

  // Load current fuel stock card
  const loadFuelStockCard = useCallback(async () => {
    if (!user?.station_id) return;

    try {
      console.log('🔄 Loading fuel stock card...');
      
      // Get the latest stock entry for each product
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

      // Group by product_id and take the latest entry for each product
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

  // Calculate sales amount automatically using meter readings and real prices
  const calculateSalesAmount = useCallback((openingMeter: string, closingMeter: string, productId: string) => {
    console.log('🔄 Calculating sales amount:', { openingMeter, closingMeter, productId });
    
    if (!openingMeter || !closingMeter) {
      setSalesForm(prev => ({ ...prev, calculated_amount: '0.00' }));
      return;
    }

    const opening = parseFloat(openingMeter);
    const closing = parseFloat(closingMeter);
    
    if (isNaN(opening) || isNaN(closing)) {
      setSalesForm(prev => ({ ...prev, calculated_amount: '0.00' }));
      return;
    }
    
    if (closing < opening) {
      toast.error('Closing meter cannot be less than opening meter');
      setSalesForm(prev => ({ ...prev, calculated_amount: '0.00' }));
      return;
    }

    const volume = closing - opening;
    const price = getStationPrice(user?.station_id || '', productId) || 0;
    const calculatedAmount = volume * price;
    
    console.log('✅ Sales calculation:', { volume, price, calculatedAmount });
    
    setSalesForm(prev => ({
      ...prev,
      calculated_amount: calculatedAmount.toFixed(2)
    }));
  }, [user?.station_id, getStationPrice]);

  // Load expenses with real data
  const loadExpenses = useCallback(async () => {
    if (!user?.station_id) return;

    try {
      console.log('🔄 Loading expenses...');
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
      calculateExpenseStats(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
    }
  }, [user?.station_id]);

  const calculateExpenseStats = useCallback((expenseData: Expense[]) => {
    const stats: ExpenseStats = {
      total_expenses: 0,
      operational: 0,
      fixed: 0,
      staff: 0,
      maintenance: 0,
      other: 0,
      pending_approval: 0
    };

    expenseData.forEach(expense => {
      stats.total_expenses += expense.amount;
      stats.pending_approval += expense.status === 'pending' ? expense.amount : 0;

      switch (expense.type) {
        case 'operational':
          stats.operational += expense.amount;
          break;
        case 'fixed':
          stats.fixed += expense.amount;
          break;
        case 'staff':
          stats.staff += expense.amount;
          break;
        case 'maintenance':
          stats.maintenance += expense.amount;
          break;
        case 'other':
          stats.other += expense.amount;
          break;
      }
    });

    setExpenseStats(stats);
  }, []);

  // Load daily report with real data
  const loadDailyReport = useCallback(async () => {
    if (!user?.station_id) return;
    
    setLoading(true);
    try {
      console.log('🔄 Loading daily report...');
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
        pump_prices: pumpPrices,
        current_stock: fuelStockCard
      };

      setDailyReport(report);
    } catch (error) {
      console.error('Failed to load daily report:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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

// FIXED: Sales recording function matching your exact schema
const handleRecordSales = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user?.station_id || !salesForm.pump_id) {
    toast.error('Please select a pump');
    return;
  }

  if (!salesForm.opening_meter || !salesForm.closing_meter) {
    toast.error('Please enter both opening and closing meter readings');
    return;
  }

  const opening = parseFloat(salesForm.opening_meter);
  const closing = parseFloat(salesForm.closing_meter);
  
  if (isNaN(opening) || isNaN(closing)) {
    toast.error('Please enter valid meter readings');
    return;
  }
  
  if (closing < opening) {
    toast.error('Closing meter cannot be less than opening meter');
    return;
  }

  setSubmitting(true);
  
  const price = getStationPrice(user.station_id, salesForm.product_id) || 0;
  const volume = closing - opening;
  const calculatedAmount = volume * price;
  
  // Get the selected pump to extract pump_number
  const selectedPump = pumps.find(p => p.id === salesForm.pump_id);
  
  if (!selectedPump) {
    toast.error('Selected pump not found');
    setSubmitting(false);
    return;
  }

  // Convert pump number from string to integer
  const pumpNumber = parseInt(selectedPump.number) || 1;

  // FIXED: Sales data matching your exact schema
  const salesData = {
    // Required fields
    station_id: user.station_id,
    pump_id: salesForm.pump_id,
    pump_number: pumpNumber, // INTEGER and REQUIRED
    opening_meter: opening,
    closing_meter: closing,
    unit_price: price,
    total_amount: calculatedAmount, // Has default but can be provided
    cash_received: calculatedAmount, // REQUIRED field
    payment_method: 'cash', // REQUIRED - from USER-DEFINED type
    
    // Optional but recommended fields
    product_id: salesForm.product_id,
    created_by: user.id,
    customer_type: 'retail',
    
    // Generated columns - DO NOT include these:
    // litres_sold: volume, // ← GENERATED COLUMN - don't include!
    // variance: 0, // ← GENERATED COLUMN - don't include!
    
    // Other optional fields
    transaction_time: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('📝 Recording sale with schema-compliant data:', salesData);

  try {
    if (isOnline) {
      const { error } = await supabase
        .from('sales')
        .insert([salesData]);

      if (error) throw error;

      // Update pump meter reading
      const { error: pumpError } = await supabase
        .from('pumps')
        .update({ 
          current_meter_reading: closing,
          updated_at: new Date().toISOString()
        })
        .eq('id', salesForm.pump_id);

      if (pumpError) {
        console.error('Pump update error:', pumpError);
      }

      toast.success(`Sale recorded successfully! ${volume.toFixed(2)}L = ₵${calculatedAmount.toFixed(2)}`);
    } else {
      await offlineSync.addToQueue('create', 'sales', salesData);
      await updatePendingCount();
      toast.success('Sale queued for sync (offline mode)');
    }
    
    setShowSalesDialog(false);
    resetSalesForm();
    await loadDailyReport();
    await loadPumps();
  } catch (error: any) {
    console.error('❌ Failed to record sales:', error);
    
    // Specific error handling
    if (error.message?.includes('pump_number')) {
      toast.error('Invalid pump number format. Please contact administrator.');
    } else if (error.message?.includes('cash_received')) {
      toast.error('Cash received amount is required.');
    } else if (error.message?.includes('payment_method')) {
      toast.error('Invalid payment method. Please contact administrator.');
    } else {
      toast.error(`Failed to record sale: ${error.message}`);
    }
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

    console.log('Inserting inventory data:', inventoryData);

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('daily_tank_stocks')
          .insert([inventoryData]);

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        toast.success('Inventory recorded successfully!');
        setShowInventoryDialog(false);
        resetInventoryForm();
        await loadDailyReport();
        await loadInventoryHistory();
        await loadFuelStockCard();
      } else {
        await offlineSync.addToQueue('create', 'daily_tank_stocks', inventoryData);
        await updatePendingCount();
        toast.success('Inventory queued for sync (offline mode)');
        setShowInventoryDialog(false);
        resetInventoryForm();
      }
    } catch (error: any) {
      console.error('Failed to record inventory:', error);
      
      if (error.code === 'PGRST204') {
        toast.error('Database schema mismatch. Please refresh the page.');
      } else if (error.message) {
        toast.error(`Failed to record inventory: ${error.message}`);
      } else {
        toast.error('Failed to record inventory. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // FIXED: Form reset functions
  const resetSalesForm = () => {
    if (selectedPump) {
      // Find matching product for the pump's fuel type
      const matchingProduct = products.find(p => 
        p.name.toLowerCase() === selectedPump.fuel_type?.toLowerCase()
      );
      
      const currentPrice = getStationPrice(user?.station_id || '', matchingProduct?.id || '') || 0;
      
      setSalesForm({
        pump_id: selectedPump.id,
        product_type: selectedPump.fuel_type || 'Petrol',
        product_id: matchingProduct?.id || '',
        opening_meter: selectedPump.current_meter_reading?.toString() || '0',
        closing_meter: '',
        unit_price: currentPrice.toString(),
        date: new Date().toISOString().split('T')[0],
        calculated_amount: '0.00'
      });
    } else {
      const defaultProduct = products[0];
      const currentPrice = getStationPrice(user?.station_id || '', defaultProduct?.id || '') || 0;
      setSalesForm({
        pump_id: '',
        product_type: defaultProduct?.name || 'Petrol',
        product_id: defaultProduct?.id || '',
        opening_meter: '',
        closing_meter: '',
        unit_price: currentPrice.toString(),
        date: new Date().toISOString().split('T')[0],
        calculated_amount: '0.00'
      });
    }
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

  const resetTankDippingForm = () => {
    const defaultProduct = products[0];
    setTankDippingForm({
      tank_number: '1',
      product_type: defaultProduct?.name || 'Petrol',
      product_id: defaultProduct?.id || '',
      dip_reading: '',
      water_level: '',
      temperature: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    });
  };

  const resetStationCheckForm = () => {
    setStationCheckForm({
      check_type: 'Opening',
      safety_equipment: true,
      cleanliness: true,
      equipment_functional: true,
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const resetBankForm = () => {
    setBankForm({
      name: '',
      account_number: '',
      branch: '',
      is_active: true
    });
  };

  // Handle station check submission
  const handleStationCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    setSubmitting(true);
    const checkData = {
      station_id: user.station_id,
      check_type: stationCheckForm.check_type,
      safety_equipment: stationCheckForm.safety_equipment,
      cleanliness: stationCheckForm.cleanliness,
      equipment_functional: stationCheckForm.equipment_functional,
      notes: stationCheckForm.notes,
      check_date: stationCheckForm.date,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('station_checks')
          .insert([checkData]);

        if (error) throw error;
        toast.success('Station check recorded successfully!');
      } else {
        await offlineSync.addToQueue('create', 'station_checks', checkData);
        await updatePendingCount();
        toast.success('Station check queued for sync (offline mode)');
      }
      
      setShowStationCheckDialog(false);
      resetStationCheckForm();
    } catch (error: any) {
      console.error('Failed to record station check:', error);
      toast.error(`Failed to record station check: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle tank dipping submission
  const handleTankDipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    setSubmitting(true);
    const dippingData = {
      station_id: user.station_id,
      tank_number: tankDippingForm.tank_number,
      product_id: tankDippingForm.product_id,
      dip_reading: parseFloat(tankDippingForm.dip_reading),
      water_level: parseFloat(tankDippingForm.water_level) || 0,
      temperature: parseFloat(tankDippingForm.temperature) || 0,
      dipping_date: tankDippingForm.date,
      dipping_time: tankDippingForm.time,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('tank_dippings')
          .insert([dippingData]);

        if (error) throw error;
        toast.success('Tank dipping recorded successfully!');
      } else {
        await offlineSync.addToQueue('create', 'tank_dippings', dippingData);
        await updatePendingCount();
        toast.success('Tank dipping queued for sync (offline mode)');
      }
      
      setShowTankDippingDialog(false);
      resetTankDippingForm();
    } catch (error: any) {
      console.error('Failed to record tank dipping:', error);
      toast.error(`Failed to record tank dipping: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // SINGLE INITIALIZATION EFFECT
  useEffect(() => {
    if (initializedRef.current || !user?.station_id) return;
    
    initializedRef.current = true;
    console.log('🚀 StationManagerDashboard: Initializing...');

    const initializeDashboard = async () => {
      try {
        await offlineSync.init();
        await loadProducts(); // Load products first
        await loadPumps(); // Then load pumps (depends on products)
        await loadBanks();
        await loadPumpPrices(true); // Force refresh prices on login
        await loadInventoryHistory();
        await loadFuelStockCard();
        await loadExpenses();
        await loadDailyReport();
        await updatePendingCount();
        
        console.log('✅ StationManagerDashboard: Initialized successfully');
      } catch (error) {
        console.error('💥 StationManagerDashboard: Failed to initialize:', error);
        toast.error('Failed to initialize dashboard');
      }
    };

    initializeDashboard();

    // Set up periodic sync (every 2 minutes)
    syncIntervalRef.current = setInterval(() => {
      if (isOnline && pendingSync > 0) {
        syncOfflineData();
      }
    }, 2 * 60 * 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
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

  // FIXED: Update sales calculation when meter readings change
  useEffect(() => {
    if (salesForm.opening_meter && salesForm.closing_meter && salesForm.product_id) {
      calculateSalesAmount(salesForm.opening_meter, salesForm.closing_meter, salesForm.product_id);
    }
  }, [salesForm.opening_meter, salesForm.closing_meter, salesForm.product_id, calculateSalesAmount]);

  // FIXED: Update sales form when pump selection changes - COMPLETELY REWRITTEN
  useEffect(() => {
    if (selectedPump) {
      // Find matching product for the pump's fuel type
      const matchingProduct = products.find(p => 
        p.name.toLowerCase() === selectedPump.fuel_type?.toLowerCase()
      );
      
      const currentPrice = getStationPrice(user?.station_id || '', matchingProduct?.id || '') || 0;
      
      // Use functional update to get current state
      setSalesForm(currentForm => {
        const updatedForm = {
          ...currentForm,
          pump_id: selectedPump.id,
          product_type: selectedPump.fuel_type || 'Petrol',
          product_id: matchingProduct?.id || '',
          opening_meter: selectedPump.current_meter_reading?.toString() || '0',
          unit_price: currentPrice.toString()
        };
        
        // Recalculate amount if closing meter is set
        if (currentForm.closing_meter) {
          const opening = parseFloat(selectedPump.current_meter_reading?.toString() || '0');
          const closing = parseFloat(currentForm.closing_meter);
          if (!isNaN(opening) && !isNaN(closing) && closing >= opening) {
            const volume = closing - opening;
            const calculatedAmount = volume * currentPrice;
            updatedForm.calculated_amount = calculatedAmount.toFixed(2);
          }
        }
        
        return updatedForm;
      });
    }
  }, [selectedPump, user?.station_id, getStationPrice, products]);

  // Loading skeletons
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-xl" />
          </div>
        </Card>
      ))}
    </div>
  );

  const ContentSkeleton = () => (
    <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </Card>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'operational': return 'bg-blue-100 text-blue-800';
      case 'fixed': return 'bg-purple-100 text-purple-800';
      case 'staff': return 'bg-orange-100 text-orange-800';
      case 'maintenance': return 'bg-cyan-100 text-cyan-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !dailyReport) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <StatsSkeleton />
          
          <div className="space-y-6">
            <Skeleton className="h-12 w-full rounded-xl" />
            <ContentSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl text-black mb-2">Station Operations</h1>
            <p className="text-gray-600">{user?.name} - Daily Operations Management & Staff Supervision</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Online/Offline Indicator */}
            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${isOnline ? 'bg-green-100' : 'bg-orange-100'}`}>
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-700">Offline</span>
                </>
              )}
              {pendingSync > 0 && (
                <span className="ml-2 px-2 py-1 bg-white rounded-lg text-xs">
                  {pendingSync} pending
                </span>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={async () => {
                await loadDailyReport();
                await loadPumpPrices(true);
                await loadFuelStockCard();
                await loadPumps();
              }}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {pendingSync > 0 && isOnline && (
              <Button onClick={syncOfflineData} variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Sync Now
              </Button>
            )}
          </div>
        </div>

        {/* Current Pump Prices */}
        <div className="mb-8">
          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">Current Pump Prices</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadPumpPrices(true)}
                disabled={pricesLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-3 h-3 ${pricesLoading ? 'animate-spin' : ''}`} />
                Refresh Prices
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              {pricesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))
              ) : pumpPrices.length > 0 ? (
                pumpPrices.map((price) => (
                  <div key={price.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-black">{price.product_type}</span>
                    <span className="text-lg font-bold text-green-600">
                      ₵{price.price_per_liter.toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-4 text-gray-500">
                  No active prices set for this station
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => loadPumpPrices(true)}
                    className="mt-2 gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Today's Sales</p>
                  <p className="text-3xl text-black">₵{(dailyReport?.total_sales || 0).toLocaleString()}</p>
                  <p className="text-sm text-green-600">
                    {dailyReport?.sales && dailyReport.sales.length > 0 ? `${dailyReport.sales.length} transactions` : 'No sales today'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Expenses</p>
                  <p className="text-3xl text-black">₵{expenseStats.total_expenses.toLocaleString()}</p>
                  <p className="text-sm text-orange-600">
                    {expenses.length > 0 ? `${expenses.length} expenses` : 'No expenses'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Current Stock</p>
                  <p className="text-3xl text-black">
                    {fuelStockCard.reduce((sum, item) => sum + (item.current_stock || 0), 0).toLocaleString()}L
                  </p>
                  <p className="text-sm text-blue-600">
                    {fuelStockCard.length > 0 ? `${fuelStockCard.length} products` : 'No stock data'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Active Pumps</p>
                  <p className="text-3xl text-black">{pumps.length}</p>
                  <p className="text-sm text-purple-600">
                    {pumps.length > 0 ? `${pumps.length} pumps active` : 'No active pumps'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Enhanced Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl w-full grid grid-cols-5">
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Operations</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Equipment</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Management - UPDATED with correct pump data */}
              <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Sales Management</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={debugPumpsTable}
                        title="Debug pumps table"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Debug Pumps
                      </Button>
                      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" style={{ backgroundColor: '#0B2265' }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Record Sale
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white">
                          <DialogHeader>
                            <DialogTitle className="text-gray-900">Record Sales</DialogTitle>
                            <DialogDescription>Select pump and enter meter readings. Amount will be calculated automatically.</DialogDescription>
                          </DialogHeader>
                          <ScrollableDialogContent className="space-y-6">
                            <form onSubmit={handleRecordSales} className="space-y-6">
                              <FormSection title="Pump Selection" description="Select pump and fuel type will be auto-filled">
                                <div>
                                  <Label className="text-gray-700">Select Pump</Label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                                    value={selectedPump?.id || ''}
                                    onChange={(e) => {
                                      const pump = pumps.find(p => p.id === e.target.value);
                                      setSelectedPump(pump || null);
                                    }}
                                    required
                                  >
                                    <option value="">Select a pump</option>
                                    {pumps.map((pump) => (
                                      <option key={pump.id} value={pump.id}>
                                        {/* UPDATED: Using correct column names from your table */}
                                        {pump.name} (No: {pump.number}) - {pump.fuel_type} (Current: {pump.current_meter_reading || 0}L)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {selectedPump && (
                                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-blue-800">Selected Pump: {selectedPump.name}</p>
                                        <p className="text-sm text-blue-600">Pump Number: {selectedPump.number}</p>
                                        <p className="text-sm text-blue-600">Fuel Type: {selectedPump.fuel_type}</p>
                                        <p className="text-sm text-blue-600">Current Meter: {selectedPump.current_meter_reading || 0}L</p>
                                      </div>
                                      <Gauge className="w-8 h-8 text-blue-600" />
                                    </div>
                                  </div>
                                )}
                                {pumps.length === 0 && (
                                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <p className="text-yellow-800">No active pumps found. Please check pump configuration.</p>
                                    <Button 
                                      onClick={debugPumpsTable} 
                                      variant="outline" 
                                      size="sm" 
                                      className="mt-2"
                                    >
                                      <AlertTriangle className="w-4 h-4 mr-2" />
                                      Debug Pumps Table
                                    </Button>
                                  </div>
                                )}
                              </FormSection>

                              <FormSection title="Product Information">
                                <div>
                                  <Label className="text-gray-700">Product</Label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                                    value={salesForm.product_id}
                                    onChange={(e) => {
                                      const selectedProduct = products.find(p => p.id === e.target.value);
                                      const price = getStationPrice(user?.station_id || '', e.target.value) || 0;
                                      setSalesForm({ 
                                        ...salesForm, 
                                        product_id: e.target.value,
                                        product_type: selectedProduct?.name || 'Petrol',
                                        unit_price: price.toString()
                                      });
                                      // Recalculate amount when product changes
                                      if (salesForm.opening_meter && salesForm.closing_meter) {
                                        calculateSalesAmount(salesForm.opening_meter, salesForm.closing_meter, e.target.value);
                                      }
                                    }}
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
                              </FormSection>

                              <FormSection title="Meter Readings" description="Enter opening and closing meter readings">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-gray-700">Opening Meter (L)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salesForm.opening_meter}
                                      onChange={(e) => {
                                        setSalesForm({ ...salesForm, opening_meter: e.target.value });
                                        // Recalculate amount when opening meter changes
                                        if (e.target.value && salesForm.closing_meter && salesForm.product_id) {
                                          calculateSalesAmount(e.target.value, salesForm.closing_meter, salesForm.product_id);
                                        }
                                      }}
                                      placeholder="0.00"
                                      required
                                      className="bg-white text-gray-900"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Current pump reading: {selectedPump?.current_meter_reading || 0}L</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-700">Closing Meter (L)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salesForm.closing_meter}
                                      onChange={(e) => {
                                        setSalesForm({ ...salesForm, closing_meter: e.target.value });
                                        // Recalculate amount when closing meter changes
                                        if (salesForm.opening_meter && e.target.value && salesForm.product_id) {
                                          calculateSalesAmount(salesForm.opening_meter, e.target.value, salesForm.product_id);
                                        }
                                      }}
                                      placeholder="0.00"
                                      required
                                      className="bg-white text-gray-900"
                                    />
                                  </div>
                                </div>
                              </FormSection>

                              <FormSection title="Amount Calculation">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                      <Label className="text-blue-700 font-semibold">Volume Sold</Label>
                                      <p className="text-lg font-bold text-blue-800">
                                        {salesForm.opening_meter && salesForm.closing_meter 
                                          ? (parseFloat(salesForm.closing_meter) - parseFloat(salesForm.opening_meter)).toFixed(2) 
                                          : '0.00'} L
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-blue-700 font-semibold">Unit Price</Label>
                                      <p className="text-lg font-bold text-blue-800">
                                        ₵{getStationPrice(user?.station_id || '', salesForm.product_id)?.toFixed(2) || '0.00'}/L
                                      </p>
                                    </div>
                                  </div>
                                  <div className="border-t border-blue-200 pt-3">
                                    <Label className="text-blue-700 font-semibold">Total Amount</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Calculator className="w-5 h-5 text-blue-600" />
                                      <span className="text-xl font-bold text-blue-700">
                                        ₵{salesForm.calculated_amount}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </FormSection>

                              <FormSection title="Transaction Details">
                                <div>
                                  <Label className="text-gray-700">Date</Label>
                                  <Input
                                    type="date"
                                    value={salesForm.date}
                                    onChange={(e) => setSalesForm({ ...salesForm, date: e.target.value })}
                                    required
                                    className="bg-white text-gray-900"
                                  />
                                </div>
                              </FormSection>

                              <Button 
                                type="submit" 
                                className="w-full" 
                                style={{ backgroundColor: '#0B2265' }}
                                disabled={submitting || !salesForm.pump_id}
                              >
                                {submitting ? 'Recording...' : 'Save Sale'}
                              </Button>
                            </form>
                          </ScrollableDialogContent>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Display current pumps status */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Active Pumps: {pumps.length}
                        {pumps.length > 0 && (
                          <span className="ml-2">
                            ({pumps.map(p => `${p.name} (${p.fuel_type})`).join(', ')})
                          </span>
                        )}
                      </p>
                    </div>
                    
                    {dailyReport?.sales?.slice(0, 5).map((sale: any) => (
                      <div key={sale.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-black font-medium">{sale.products?.name || 'Unknown Product'}</p>
                          <p className="text-sm text-gray-600">
                            {sale.closing_meter - sale.opening_meter}L • {new Date(sale.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <p className="text-lg text-black font-semibold">₵{sale.total_amount?.toLocaleString() || '0.00'}</p>
                      </div>
                    ))}
                    {(!dailyReport?.sales || dailyReport.sales.length === 0) && (
                      <p className="text-center text-gray-500 py-8">No sales recorded today</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Expense Management */}
              <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Expense Management</span>
                    <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" style={{ backgroundColor: '#0B2265' }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Expense
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-white">
                        <DialogHeader>
                          <DialogTitle className="text-gray-900">Add New Expense</DialogTitle>
                          <DialogDescription>Record station operational expense</DialogDescription>
                        </DialogHeader>
                        <ScrollableDialogContent>
                          <form onSubmit={handleRecordExpense} className="space-y-6">
                            <FormSection title="Expense Classification">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
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
                                <div className="space-y-2">
                                  <Label className="text-gray-700">Type</Label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                                    value={expenseForm.type}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value as any })}
                                  >
                                    <option value="operational">Operational</option>
                                    <option value="fixed">Fixed</option>
                                    <option value="staff">Staff</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                              </div>
                            </FormSection>

                            <FormSection title="Expense Details">
                              <div className="space-y-2">
                                <Label className="text-gray-700">Description</Label>
                                <Input
                                  value={expenseForm.description}
                                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                  placeholder="Expense description"
                                  required
                                  className="bg-white text-gray-900"
                                />
                              </div>

                              <div className="space-y-2">
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
                            </FormSection>

                            <FormSection title="Additional Information">
                              <div className="space-y-2">
                                <Label className="text-gray-700">Date</Label>
                                <Input
                                  type="date"
                                  value={expenseForm.expense_date}
                                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                                  required
                                  className="bg-white text-gray-900"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-gray-700">Notes (Optional)</Label>
                                <textarea
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                                  value={expenseForm.notes}
                                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                                  placeholder="Additional notes"
                                  rows={3}
                                />
                              </div>
                            </FormSection>

                            <Button 
                              type="submit" 
                              className="w-full" 
                              style={{ backgroundColor: '#0B2265' }}
                              disabled={submitting}
                            >
                              {submitting ? 'Recording...' : 'Record Expense'}
                            </Button>
                          </form>
                        </ScrollableDialogContent>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenses.slice(0, 5).map((expense) => (
                      <div key={expense.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-black font-medium capitalize">{expense.category}</p>
                            <p className="text-sm text-gray-600">{expense.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-black">₵{expense.amount}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(expense.status)}`}>
                              {expense.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                          <div className="flex gap-2">
                            {expense.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => handleUpdateExpenseStatus(expense.id, 'approved')}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleUpdateExpenseStatus(expense.id, 'rejected')}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {expenses.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No expenses recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Daily Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Station Check */}
                  <Dialog open={showStationCheckDialog} onOpenChange={setShowStationCheckDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 bg-white hover:bg-gray-50 border-gray-300">
                        <Building2 className="w-6 h-6 text-gray-700" />
                        <span className="text-gray-700">Station Check</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-gray-900">Station Safety Check</DialogTitle>
                        <DialogDescription>Record daily station inspection</DialogDescription>
                      </DialogHeader>
                      <ScrollableDialogContent>
                        <form onSubmit={handleStationCheck} className="space-y-6">
                          <FormSection title="Check Information">
                            <div>
                              <Label className="text-gray-700">Check Type</Label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                                value={stationCheckForm.check_type}
                                onChange={(e) => setStationCheckForm({ ...stationCheckForm, check_type: e.target.value })}
                              >
                                <option value="Opening">Opening Check</option>
                                <option value="Closing">Closing Check</option>
                                <option value="Mid-day">Mid-day Check</option>
                              </select>
                            </div>
                          </FormSection>

                          <FormSection title="Safety Checks">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-700">Safety Equipment</span>
                                <input
                                  type="checkbox"
                                  checked={stationCheckForm.safety_equipment}
                                  onChange={(e) => setStationCheckForm({ ...stationCheckForm, safety_equipment: e.target.checked })}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-700">Cleanliness</span>
                                <input
                                  type="checkbox"
                                  checked={stationCheckForm.cleanliness}
                                  onChange={(e) => setStationCheckForm({ ...stationCheckForm, cleanliness: e.target.checked })}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-700">Equipment Functional</span>
                                <input
                                  type="checkbox"
                                  checked={stationCheckForm.equipment_functional}
                                  onChange={(e) => setStationCheckForm({ ...stationCheckForm, equipment_functional: e.target.checked })}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </FormSection>

                          <FormSection title="Additional Information">
                            <div>
                              <Label className="text-gray-700">Notes</Label>
                              <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                                value={stationCheckForm.notes}
                                onChange={(e) => setStationCheckForm({ ...stationCheckForm, notes: e.target.value })}
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700">Date</Label>
                              <Input
                                type="date"
                                value={stationCheckForm.date}
                                onChange={(e) => setStationCheckForm({ ...stationCheckForm, date: e.target.value })}
                                required
                                className="bg-white text-gray-900"
                              />
                            </div>
                          </FormSection>

                          <Button 
                            type="submit" 
                            className="w-full" 
                            style={{ backgroundColor: '#0B2265' }}
                            disabled={submitting}
                          >
                            {submitting ? 'Saving...' : 'Save Check'}
                          </Button>
                        </form>
                      </ScrollableDialogContent>
                    </DialogContent>
                  </Dialog>

                  {/* Tank Dipping */}
                  <Dialog open={showTankDippingDialog} onOpenChange={setShowTankDippingDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 bg-white hover:bg-gray-50 border-gray-300">
                        <Fuel className="w-6 h-6 text-gray-700" />
                        <span className="text-gray-700">Tank Dipping</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-gray-900">Tank Dipping Record</DialogTitle>
                        <DialogDescription>Record tank measurements</DialogDescription>
                      </DialogHeader>
                      <ScrollableDialogContent>
                        <form onSubmit={handleTankDipping} className="space-y-6">
                          <FormSection title="Tank Information">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-gray-700">Tank Number</Label>
                                <select
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                                  value={tankDippingForm.tank_number}
                                  onChange={(e) => setTankDippingForm({ ...tankDippingForm, tank_number: e.target.value })}
                                >
                                  <option value="1">Tank 1</option>
                                  <option value="2">Tank 2</option>
                                  <option value="3">Tank 3</option>
                                  <option value="4">Tank 4</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-gray-700">Product Type</Label>
                                <select
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                                  value={tankDippingForm.product_type}
                                  onChange={(e) => {
                                    const selectedProduct = products.find(p => p.name === e.target.value);
                                    setTankDippingForm({ 
                                      ...tankDippingForm, 
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
                            </div>
                          </FormSection>

                          <FormSection title="Measurements">
                            <div>
                              <Label className="text-gray-700">Dip Reading (cm)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={tankDippingForm.dip_reading}
                                onChange={(e) => setTankDippingForm({ ...tankDippingForm, dip_reading: e.target.value })}
                                required
                                className="bg-white text-gray-900"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-gray-700">Water Level (cm)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={tankDippingForm.water_level}
                                  onChange={(e) => setTankDippingForm({ ...tankDippingForm, water_level: e.target.value })}
                                  className="bg-white text-gray-900"
                                />
                              </div>
                              <div>
                                <Label className="text-gray-700">Temperature (°C)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={tankDippingForm.temperature}
                                  onChange={(e) => setTankDippingForm({ ...tankDippingForm, temperature: e.target.value })}
                                  className="bg-white text-gray-900"
                                />
                              </div>
                            </div>
                          </FormSection>

                          <FormSection title="Time Information">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-gray-700">Date</Label>
                                <Input
                                  type="date"
                                  value={tankDippingForm.date}
                                  onChange={(e) => setTankDippingForm({ ...tankDippingForm, date: e.target.value })}
                                  required
                                  className="bg-white text-gray-900"
                                />
                              </div>
                              <div>
                                <Label className="text-gray-700">Time</Label>
                                <Input
                                  type="time"
                                  value={tankDippingForm.time}
                                  onChange={(e) => setTankDippingForm({ ...tankDippingForm, time: e.target.value })}
                                  required
                                  className="bg-white text-gray-900"
                                />
                              </div>
                            </div>
                          </FormSection>

                          <Button 
                            type="submit" 
                            className="w-full" 
                            style={{ backgroundColor: '#0B2265' }}
                            disabled={submitting}
                          >
                            {submitting ? 'Saving...' : 'Save Dipping'}
                          </Button>
                        </form>
                      </ScrollableDialogContent>
                    </DialogContent>
                  </Dialog>

                  {/* Inventory Management */}
                  <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 bg-white hover:bg-gray-50 border-gray-300">
                        <Package className="w-6 h-6 text-gray-700" />
                        <span className="text-gray-700">Inventory</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-gray-900">Inventory Management</DialogTitle>
                        <DialogDescription>Record daily inventory levels</DialogDescription>
                      </DialogHeader>
                      <ScrollableDialogContent>
                        <form onSubmit={handleInventory} className="space-y-6">
                          <FormSection title="Product Information">
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
                          </FormSection>

                          <FormSection title="Stock Levels">
                            <div className="grid grid-cols-2 gap-4">
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
                          </FormSection>

                          <FormSection title="Date Information">
                            <div>
                              <Label className="text-gray-700">Date</Label>
                              <Input
                                type="date"
                                value={inventoryForm.date}
                                onChange={(e) => setInventoryForm({ ...inventoryForm, date: e.target.value })}
                                required
                                className="bg-white text-gray-900"
                              />
                            </div>
                          </FormSection>

                          <Button 
                            type="submit" 
                            className="w-full" 
                            style={{ backgroundColor: '#0B2265' }}
                            disabled={submitting}
                          >
                            {submitting ? 'Saving...' : 'Save Inventory'}
                          </Button>
                        </form>
                      </ScrollableDialogContent>
                    </DialogContent>
                  </Dialog>

                  {/* Expense Recording */}
                  <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col gap-2 bg-white hover:bg-gray-50 border-gray-300">
                        <Receipt className="w-6 h-6 text-gray-700" />
                        <span className="text-gray-700">Add Expense</span>
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial">
            <Suspense fallback={<ContentSkeleton />}>
              <LazyBankDeposits 
                stationId={user?.station_id || ''} 
                banks={banks}
                onBankAdded={loadBanks}
              />
            </Suspense>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Fuel Stock Card */}
              <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Current Fuel Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fuelStockCard.map((item) => (
                      <div key={item.product_id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-black">{item.product_name}</p>
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
                      <p className="text-center text-gray-500 py-8">No current stock data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Inventory History */}
              <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Inventory History (Last 15 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {inventoryHistory.map((item) => (
                      <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-black">{item.products?.name || 'Unknown Product'}</p>
                            <p className="text-sm text-gray-600">
                              Date: {new Date(item.stock_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Opening: {item.opening_stock}L</p>
                            <p className="text-sm text-gray-600">Deliveries: {item.deliveries}L</p>
                            <p className="text-lg font-semibold text-black">Closing: {item.closing_stock}L</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {inventoryHistory.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No inventory history available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment">
            <Suspense fallback={<ContentSkeleton />}>
              <LazyPumpCalibration stationId={user?.station_id || ''} />
            </Suspense>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Daily Report
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Sales Report
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Expense Report
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Inventory Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Bank Dialog */}
        <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Add Bank Account</DialogTitle>
              <DialogDescription>Add a new bank account for deposits</DialogDescription>
            </DialogHeader>
            <ScrollableDialogContent>
              <form onSubmit={handleAddBank} className="space-y-4">
                <div>
                  <Label className="text-gray-700">Bank Name</Label>
                  <Input
                    value={bankForm.name}
                    onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                    placeholder="e.g., GCB Bank"
                    required
                    className="bg-white text-gray-900"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Account Number</Label>
                  <Input
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                    placeholder="e.g., 1234567890"
                    required
                    className="bg-white text-gray-900"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Branch</Label>
                  <Input
                    value={bankForm.branch}
                    onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                    placeholder="e.g., Accra Central"
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
                  {submitting ? 'Adding...' : 'Add Bank'}
                </Button>
              </form>
            </ScrollableDialogContent>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default StationManagerDashboard;