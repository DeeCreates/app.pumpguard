// src/pages/mobile/MobileInventoryManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  Calendar,
  Database,
  Calculator,
  AlertCircle,
  Shield,
  Scale,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  X,
  Menu,
  Home,
  Wifi,
  WifiOff,
  Clock,
  MoreVertical,
  Upload,
  Battery,
  BatteryCharging,
} from "lucide-react";
import { supabase } from '../../utils/supabase-client';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from "@/components/ui/separator";
import { usePrices } from '../../contexts/PriceContext';

interface DailyTankStock {
  id: string;
  station_id: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  received: number;
  sales: number;
  variance: number;
  stock_date: string;
  recorded_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    unit: string;
  };
  stations?: {
    id: string;
    name: string;
  };
}

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface Station {
  id: string;
  name: string;
  omc_id: string;
}

interface UserContext {
  id: string;
  role: 'admin' | 'omc' | 'station_manager' | 'dealer';
  station_id?: string;
  omc_id?: string;
  name: string;
}

interface MobileInventoryManagementProps {
  stationId?: string;
  compact?: boolean;
}

// Mobile-specific components
const MobileStatusBar = ({ isOnline, pendingSync }: { 
  isOnline: boolean; 
  pendingSync: number;
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
      <span className="text-xs text-gray-500">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
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

const MobileStockItem = ({ 
  stock,
  onEdit,
  onDelete
}: { 
  stock: DailyTankStock;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  const safeGet = (value: any, defaultValue: any = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    return value;
  };

  const safeFormatNumber = (value: any, defaultValue: any = '0') => {
    const num = parseFloat(safeGet(value, defaultValue));
    return isNaN(num) ? defaultValue : num.toLocaleString();
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'bg-green-100 text-green-800';
    if (Math.abs(variance) <= 100) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-4 bg-gray-50 rounded-xl mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={getVarianceColor(safeGet(stock.variance, 0))}>
              {safeGet(stock.variance, 0) >= 0 ? '+' : ''}{safeGet(stock.variance, 0).toFixed(2)}
            </Badge>
            <span className="text-sm text-gray-500">
              {safeGet(stock.stations?.name, 'Station')}
            </span>
          </div>
          <h3 className="font-bold text-lg text-gray-900">
            {safeGet(stock.products?.name, 'Product')}
          </h3>
          <p className="text-sm text-gray-600">
            {new Date(safeGet(stock.stock_date, new Date().toISOString())).toLocaleDateString()}
          </p>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-white rounded-lg">
          <p className="text-xs text-gray-500">Opening</p>
          <p className="font-semibold">
            {safeFormatNumber(stock.opening_stock)} {safeGet(stock.products?.unit, 'L')}
          </p>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <p className="text-xs text-gray-500">Closing</p>
          <p className="font-semibold text-blue-600">
            {safeFormatNumber(stock.closing_stock)} {safeGet(stock.products?.unit, 'L')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Received:</span>
          <span className="font-medium">{safeFormatNumber(stock.received)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Sales:</span>
          <span className="font-medium">{safeFormatNumber(stock.sales)}</span>
        </div>
      </div>

      {stock.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">{stock.notes}</p>
        </div>
      )}
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

export default function MobileInventoryManagement({ stationId, compact = false }: MobileInventoryManagementProps) {
  const [dailyTankStocks, setDailyTankStocks] = useState<DailyTankStock[]>([]);
  const [currentStock, setCurrentStock] = useState<DailyTankStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [availableStations, setAvailableStations] = useState<Station[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>(stationId || '');
  const [dateRange, setDateRange] = useState<string>('today');
  const [showDailyStockDialog, setShowDailyStockDialog] = useState(false);
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'reconciliation'>('overview');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const { toast } = useToast();
  const { getStationPrice } = usePrices();

  const [dailyStockForm, setDailyStockForm] = useState({
    station_id: stationId || '',
    product_id: '',
    opening_stock: '',
    closing_stock: '',
    received: '',
    sales: '',
    stock_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [reconciliationForm, setReconciliationForm] = useState({
    station_id: stationId || '',
    product_id: '',
    opening_stock: '',
    received: '',
    sales: '',
    closing_stock: '',
    notes: ''
  });

  // Safe value getter
  const safeGet = (value: any, defaultValue: any = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    return value;
  };

  const safeFormatNumber = (value: any, defaultValue: any = '0') => {
    const num = parseFloat(safeGet(value, defaultValue));
    return isNaN(num) ? defaultValue : num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Authentication check
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Please Login",
          description: "You need to be logged in to access inventory",
          variant: "destructive"
        });
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      const userContextData = {
        id: session.user.id,
        role: profile.role,
        station_id: profile.station_id,
        omc_id: profile.omc_id,
        name: profile.full_name || session.user.email?.split('@')[0] || 'User',
      };

      setUserContext(userContextData);

      if (profile.role === 'station_manager' && profile.station_id) {
        setSelectedStation(profile.station_id);
        setDailyStockForm(prev => ({ ...prev, station_id: profile.station_id }));
        setReconciliationForm(prev => ({ ...prev, station_id: profile.station_id }));
      }

      await Promise.all([
        loadAvailableStations(),
        loadAvailableProducts()
      ]);

      await loadData();
      
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive"
      });
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  };

  const loadAvailableStations = async () => {
    try {
      let stationsResponse;
      
      if (userContext?.role === 'omc' && userContext.omc_id) {
        const { data, error } = await supabase
          .from('stations')
          .select('*')
          .eq('omc_id', userContext.omc_id)
          .order('name');
        
        if (error) throw error;
        stationsResponse = data;
      } else if (userContext?.role === 'station_manager' && userContext.station_id) {
        const { data, error } = await supabase
          .from('stations')
          .select('*')
          .eq('id', userContext.station_id);
        
        if (error) throw error;
        stationsResponse = data;
      } else {
        const { data, error } = await supabase
          .from('stations')
          .select('*')
          .order('name');
        
        if (error) throw error;
        stationsResponse = data;
      }

      if (stationsResponse) {
        setAvailableStations(stationsResponse);
        
        if (!dailyStockForm.station_id && stationsResponse.length > 0 && userContext?.role !== 'station_manager') {
          const defaultStationId = stationsResponse[0].id;
          setDailyStockForm(prev => ({ ...prev, station_id: defaultStationId }));
          setReconciliationForm(prev => ({ ...prev, station_id: defaultStationId }));
          setSelectedStation(defaultStationId);
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadAvailableProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      
      if (data) {
        setAvailableProducts(data);
        
        if (data.length > 0) {
          const defaultProductId = data[0].id;
          setDailyStockForm(prev => ({ ...prev, product_id: defaultProductId }));
          setReconciliationForm(prev => ({ ...prev, product_id: defaultProductId }));
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadData = async () => {
    if (!userContext) return;

    try {
      setRefreshing(true);
      
      let query = supabase
        .from('daily_tank_stocks')
        .select(`
          *,
          products (*),
          stations (*)
        `)
        .order('stock_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (selectedStation) {
        query = query.eq('station_id', selectedStation);
      }

      if (dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('stock_date', today);
      } else if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('stock_date', weekAgo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDailyTankStocks(data || []);
      
      // Get unique latest entries for current stock
      const uniqueStocks = new Map();
      data?.forEach(stock => {
        const key = `${stock.station_id}-${stock.product_id}`;
        if (!uniqueStocks.has(key)) {
          uniqueStocks.set(key, stock);
        }
      });

      const currentStocks = Array.from(uniqueStocks.values());
      setCurrentStock(currentStocks || []);

    } catch (error: any) {
      console.error('Error loading inventory data:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    await loadData();
  };

  // Calculate metrics
  const calculateStockMetrics = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayStocks = dailyTankStocks.filter(stock => stock.stock_date === today);
    
    const totalStock = currentStock.reduce((sum, stock) => sum + safeGet(stock.closing_stock, 0), 0);
    const totalVariance = todayStocks.reduce((sum, stock) => sum + safeGet(stock.variance, 0), 0);
    const perfectMatches = todayStocks.filter(stock => safeGet(stock.variance, 0) === 0).length;
    const withVariance = todayStocks.filter(stock => safeGet(stock.variance, 0) !== 0).length;
    
    return { 
      totalStock, 
      totalVariance, 
      perfectMatches, 
      withVariance, 
      todayStocksCount: todayStocks.length,
    };
  };

  // Filter stocks based on search
  const getFilteredStocks = () => {
    let filtered = dailyTankStocks;

    if (searchTerm) {
      filtered = filtered.filter(stock => 
        safeGet(stock.products?.name, '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(stock.stations?.name, '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(stock.notes, '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // Form validation
  const validateDailyStockForm = (form: typeof dailyStockForm): string[] => {
    const errors: string[] = [];
    
    if (!form.station_id) errors.push('Station selection is required');
    if (!form.product_id) errors.push('Product selection is required');
    if (!form.stock_date) errors.push('Stock date is required');
    
    if (!form.opening_stock && form.opening_stock !== '0') errors.push('Opening stock is required');
    if (!form.closing_stock && form.closing_stock !== '0') errors.push('Closing stock is required');
    
    const opening = parseFloat(safeGet(form.opening_stock, '0'));
    const closing = parseFloat(safeGet(form.closing_stock, '0'));
    const received = parseFloat(safeGet(form.received, '0'));
    const sales = parseFloat(safeGet(form.sales, '0'));
    
    if (isNaN(opening) || isNaN(closing)) {
      errors.push('Please enter valid stock values');
      return errors;
    }
    
    if (opening < 0) errors.push('Opening stock cannot be negative');
    if (closing < 0) errors.push('Closing stock cannot be negative');
    if (received < 0) errors.push('Received quantity cannot be negative');
    if (sales < 0) errors.push('Sales cannot be negative');
    
    const expectedClosing = opening + received - sales;
    const variance = Math.abs(closing - expectedClosing);
    
    if (variance > expectedClosing * 0.15 && expectedClosing > 0) {
      errors.push(`Closing stock differs significantly from expected value. Expected: ${expectedClosing.toFixed(2)}, Actual: ${closing.toFixed(2)}`);
    }
    
    return errors;
  };

  const handleCreateDailyStock = async () => {
    if (!userContext) return;

    const validationErrors = validateDailyStockForm(dailyStockForm);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    setSubmitting(true);

    try {
      const opening_stock = parseFloat(safeGet(dailyStockForm.opening_stock, '0'));
      const closing_stock = parseFloat(safeGet(dailyStockForm.closing_stock, '0'));
      const received = parseFloat(safeGet(dailyStockForm.received, '0'));
      const sales = parseFloat(safeGet(dailyStockForm.sales, '0'));
      
      const expected_closing = opening_stock + received - sales;
      const variance = closing_stock - expected_closing;

      const dailyStockData = {
        station_id: dailyStockForm.station_id,
        product_id: dailyStockForm.product_id,
        opening_stock,
        closing_stock,
        received,
        sales,
        variance,
        stock_date: dailyStockForm.stock_date,
        recorded_by: userContext?.id,
        notes: dailyStockForm.notes
      };

      const { error } = await supabase
        .from('daily_tank_stocks')
        .insert([dailyStockData]);

      if (error) throw error;

      setShowDailyStockDialog(false);
      resetDailyStockForm();
      
      await loadData();
      
      const productName = availableProducts.find(p => p.id === dailyStockForm.product_id)?.name || 'Product';
      
      toast({
        title: "Stock Recorded!",
        description: `Stock for ${productName} recorded successfully. Variance: ${variance.toFixed(2)}L`,
      });

    } catch (error: any) {
      console.error('Error creating daily stock:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record daily stock",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReconciliation = async () => {
    if (!userContext) return;

    try {
      if (!reconciliationForm.station_id || !reconciliationForm.product_id || 
          !reconciliationForm.opening_stock || !reconciliationForm.closing_stock) {
        toast({
          title: "Incomplete Data",
          description: "Opening and Closing stock values are required",
          variant: "destructive"
        });
        return;
      }

      const reconciliationData = {
        station_id: reconciliationForm.station_id,
        product_id: reconciliationForm.product_id,
        opening_stock: parseFloat(safeGet(reconciliationForm.opening_stock, '0')),
        received: parseFloat(safeGet(reconciliationForm.received, '0')),
        sales: parseFloat(safeGet(reconciliationForm.sales, '0')),
        closing_stock: parseFloat(safeGet(reconciliationForm.closing_stock, '0')),
        variance: parseFloat(safeGet(reconciliationForm.closing_stock, '0')) - 
                 (parseFloat(safeGet(reconciliationForm.opening_stock, '0')) + 
                  parseFloat(safeGet(reconciliationForm.received, '0')) - 
                  parseFloat(safeGet(reconciliationForm.sales, '0'))),
        stock_date: new Date().toISOString().split('T')[0],
        recorded_by: userContext?.id,
        notes: reconciliationForm.notes || 'Daily reconciliation'
      };

      const { error } = await supabase
        .from('daily_tank_stocks')
        .insert([reconciliationData]);

      if (error) throw error;
      
      setShowReconciliationDialog(false);
      resetReconciliationForm();

      await loadData();
      
      toast({
        title: "Reconciliation Saved!",
        description: "Stock reconciliation completed successfully",
      });
    } catch (error: any) {
      console.error('Error creating reconciliation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save reconciliation",
        variant: "destructive"
      });
    }
  };

  const resetDailyStockForm = () => {
    const defaultStation = stationId || (availableStations.length > 0 ? availableStations[0].id : '');
    const defaultProduct = availableProducts.length > 0 ? availableProducts[0].id : '';
    
    setDailyStockForm({
      station_id: defaultStation,
      product_id: defaultProduct,
      opening_stock: '',
      closing_stock: '',
      received: '',
      sales: '',
      stock_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const resetReconciliationForm = () => {
    const defaultStation = stationId || (availableStations.length > 0 ? availableStations[0].id : '');
    const defaultProduct = availableProducts.length > 0 ? availableProducts[0].id : '';
    
    setReconciliationForm({
      station_id: defaultStation,
      product_id: defaultProduct,
      opening_stock: '',
      received: '',
      sales: '',
      closing_stock: '',
      notes: ''
    });
  };

  const exportInventoryData = async () => {
    try {
      const dataToExport = getFilteredStocks().map(stock => ({
        Date: safeGet(stock.stock_date, ''),
        Station: safeGet(stock.stations?.name, 'Unknown Station'),
        Product: safeGet(stock.products?.name, 'Unknown Product'),
        'Opening Stock': safeGet(stock.opening_stock, 0),
        'Received': safeGet(stock.received, 0),
        Sales: safeGet(stock.sales, 0),
        'Closing Stock': safeGet(stock.closing_stock, 0),
        Variance: safeGet(stock.variance, 0),
        'Recorded By': safeGet(stock.recorded_by, ''),
        Notes: safeGet(stock.notes, '')
      }));

      if (dataToExport.length === 0) {
        toast.error('No data to export');
        return;
      }

      const headers = Object.keys(dataToExport[0]).join(',');
      const csv = [headers, ...dataToExport.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      )].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete!",
        description: "Inventory data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export data",
        variant: "destructive"
      });
    }
  };

  const { totalStock, totalVariance, perfectMatches, withVariance, todayStocksCount } = calculateStockMetrics();
  const filteredStocks = getFilteredStocks();

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <MobileStatusBar isOnline={isOnline} pendingSync={pendingSync} />
        <div className="pt-2">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Loading Inventory</h3>
              <p className="text-gray-600">Please wait...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userContext) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <MobileStatusBar isOnline={isOnline} pendingSync={pendingSync} />
        <div className="pt-2">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Login Required</h3>
              <p className="text-gray-600 mb-4">Please login to access inventory</p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 safe-area-padding">
      {/* Status Bar */}
      <MobileStatusBar isOnline={isOnline} pendingSync={pendingSync} />

      {/* Header */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory Management</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                {userContext.role}
              </Badge>
              {selectedStation && (
                <span className="text-xs text-gray-600">
                  {availableStations.find(s => s.id === selectedStation)?.name}
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowActionsSheet(true)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Pull to refresh */}
        <PullToRefresh onRefresh={refreshAllData} refreshing={refreshing} />

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-gray-200 mb-4">
          {['overview', 'stock', 'reconciliation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'stock' && 'Stock'}
              {tab === 'reconciliation' && 'Reconciliation'}
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search inventory..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilterSheet(true)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MobileStatCard
                title="Total Stock"
                value={`${safeFormatNumber(totalStock)}L`}
                icon={Database}
                subtitle="Current stock"
              />
              <MobileStatCard
                title="Today's Records"
                value={todayStocksCount}
                icon={Calendar}
                subtitle="Products recorded"
              />
              <MobileStatCard
                title="Perfect Matches"
                value={perfectMatches}
                icon={CheckCircle}
                subtitle="Zero variance"
              />
              <MobileStatCard
                title="With Variance"
                value={withVariance}
                icon={AlertCircle}
                subtitle="Needs review"
              />
            </div>

            {/* Quick Actions */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600 mb-3">Quick Actions</p>
                <div className="grid grid-cols-3 gap-2">
                  <MobileQuickAction
                    icon={Plus}
                    label="Record Stock"
                    onClick={() => setShowDailyStockDialog(true)}
                    variant="success"
                  />
                  <MobileQuickAction
                    icon={Scale}
                    label="Reconcile"
                    onClick={() => setShowReconciliationDialog(true)}
                    variant="primary"
                  />
                  <MobileQuickAction
                    icon={Download}
                    label="Export"
                    onClick={exportInventoryData}
                    variant="warning"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Current Stock */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentStock.slice(0, 3).map((stock) => (
                  <MobileStockItem key={stock.id} stock={stock} />
                ))}
                {currentStock.length === 0 && (
                  <div className="text-center py-6">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No stock data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'stock' && (
          <>
            {/* Stock Records */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stock Records</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredStocks.length > 0 ? (
                  filteredStocks.slice(0, 10).map((stock) => (
                    <MobileStockItem key={stock.id} stock={stock} />
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No stock records found</p>
                    <Button 
                      onClick={() => setShowDailyStockDialog(true)}
                      className="mt-3 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Record First Stock
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'reconciliation' && (
          <>
            {/* Reconciliation Summary */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="text-center">
                  <Scale className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                  <p className="text-lg font-bold text-gray-900">Total Variance</p>
                  <p className={`text-3xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalVariance >= 0 ? '+' : ''}{safeFormatNumber(totalVariance)}L
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Net difference for today</p>
                </div>
              </CardContent>
            </Card>

            {/* Variance Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Variance Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dailyTankStocks
                  .filter(stock => safeGet(stock.variance, 0) !== 0)
                  .slice(0, 5)
                  .map((stock) => (
                    <div key={stock.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{safeGet(stock.products?.name, 'Product')}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(safeGet(stock.stock_date, new Date().toISOString())).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={safeGet(stock.variance, 0) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {safeGet(stock.variance, 0) >= 0 ? '+' : ''}{safeGet(stock.variance, 0).toFixed(2)}L
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>Expected: {(
                          parseFloat(safeGet(stock.opening_stock, '0')) + 
                          parseFloat(safeGet(stock.received, '0')) - 
                          parseFloat(safeGet(stock.sales, '0'))
                        ).toFixed(2)}L • Actual: {safeGet(stock.closing_stock, 0).toFixed(2)}L</p>
                      </div>
                    </div>
                  ))}
                {dailyTankStocks.filter(stock => safeGet(stock.variance, 0) !== 0).length === 0 && (
                  <div className="text-center py-6">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-500">No variances found</p>
                    <p className="text-sm text-gray-400">All records match perfectly!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowDailyStockDialog(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Daily Stock Dialog */}
      <Dialog open={showDailyStockDialog} onOpenChange={setShowDailyStockDialog}>
        <DialogContent className="max-w-[95vw] bg-white p-4 rounded-2xl mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg">Record Daily Stock</DialogTitle>
            <DialogDescription>Enter stock details for today</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleCreateDailyStock(); }} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Station</Label>
                <Select
                  value={dailyStockForm.station_id}
                  onValueChange={(value) => setDailyStockForm({ ...dailyStockForm, station_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStations.map((station) => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Product</Label>
                <Select
                  value={dailyStockForm.product_id}
                  onValueChange={(value) => setDailyStockForm({ ...dailyStockForm, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dailyStockForm.stock_date}
                  onChange={(e) => setDailyStockForm({ ...dailyStockForm, stock_date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Opening Stock</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={dailyStockForm.opening_stock}
                    onChange={(e) => setDailyStockForm({ ...dailyStockForm, opening_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Closing Stock</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={dailyStockForm.closing_stock}
                    onChange={(e) => setDailyStockForm({ ...dailyStockForm, closing_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Received</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={dailyStockForm.received}
                    onChange={(e) => setDailyStockForm({ ...dailyStockForm, received: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Sales</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={dailyStockForm.sales}
                    onChange={(e) => setDailyStockForm({ ...dailyStockForm, sales: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              {dailyStockForm.opening_stock && dailyStockForm.closing_stock && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Expected Closing:</p>
                      <p className="text-lg font-bold text-blue-900">
                        {(
                          parseFloat(safeGet(dailyStockForm.opening_stock, '0')) + 
                          parseFloat(safeGet(dailyStockForm.received, '0')) - 
                          parseFloat(safeGet(dailyStockForm.sales, '0'))
                        ).toFixed(2)}L
                      </p>
                      <p className="text-sm text-blue-700">
                        Variance: {(
                          parseFloat(safeGet(dailyStockForm.closing_stock, '0')) - 
                          (parseFloat(safeGet(dailyStockForm.opening_stock, '0')) + 
                           parseFloat(safeGet(dailyStockForm.received, '0')) - 
                           parseFloat(safeGet(dailyStockForm.sales, '0')))
                        ).toFixed(2)}L
                      </p>
                    </div>
                    <Calculator className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  rows={2}
                  value={dailyStockForm.notes}
                  onChange={(e) => setDailyStockForm({ ...dailyStockForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Stock
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog open={showReconciliationDialog} onOpenChange={setShowReconciliationDialog}>
        <DialogContent className="max-w-[95vw] bg-white p-4 rounded-2xl mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg">Stock Reconciliation</DialogTitle>
            <DialogDescription>Perform daily stock reconciliation</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleCreateReconciliation(); }} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Station</Label>
                <Select
                  value={reconciliationForm.station_id}
                  onValueChange={(value) => setReconciliationForm({ ...reconciliationForm, station_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStations.map((station) => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Product</Label>
                <Select
                  value={reconciliationForm.product_id}
                  onValueChange={(value) => setReconciliationForm({ ...reconciliationForm, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Opening Stock</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={reconciliationForm.opening_stock}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, opening_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Closing Stock</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={reconciliationForm.closing_stock}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, closing_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Received</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={reconciliationForm.received}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, received: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Sales</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={reconciliationForm.sales}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, sales: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              {reconciliationForm.opening_stock && reconciliationForm.closing_stock && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-800">Reconciliation Result:</p>
                      <p className="text-lg font-bold text-purple-900">
                        Variance: {(
                          parseFloat(safeGet(reconciliationForm.closing_stock, '0')) - 
                          (parseFloat(safeGet(reconciliationForm.opening_stock, '0')) + 
                           parseFloat(safeGet(reconciliationForm.received, '0')) - 
                           parseFloat(safeGet(reconciliationForm.sales, '0')))
                        ).toFixed(2)}L
                      </p>
                    </div>
                    <Calculator className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  rows={2}
                  value={reconciliationForm.notes}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
                  placeholder="Reconciliation notes..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Reconciliation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filter Sheet */}
      <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filter Options</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Stations</SelectItem>
                  {availableStations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                setSelectedStation(stationId || '');
                setDateRange('today');
                setSearchTerm('');
                setShowFilterSheet(false);
                loadData();
              }}
              className="w-full"
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Actions Sheet */}
      <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Actions</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 py-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setShowActionsSheet(false);
                refreshAllData();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-3" />
              Refresh Data
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setShowActionsSheet(false);
                exportInventoryData();
              }}
            >
              <Download className="w-4 h-4 mr-3" />
              Export Data
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setShowActionsSheet(false);
                setShowDailyStockDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-3" />
              New Stock Record
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setShowActionsSheet(false);
                setShowReconciliationDialog(true);
              }}
            >
              <Scale className="w-4 h-4 mr-3" />
              New Reconciliation
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}