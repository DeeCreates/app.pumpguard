// pages/mobile/MobileStationManagerDashboard.tsx
import React, { useState, useEffect, lazy, Suspense, useCallback, useRef, useMemo } from "react";
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
  Search,
  Filter,
  MoreHorizontal,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Smartphone,
  Activity,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { offlineSync } from "../../utils/offline-sync";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";

// Lazy loaded components
const LazyIoTDashboard = lazy(() => import('../../components/temp/IoTDashboard'));
const LazyShiftManagement = lazy(() => import('../../pages/operations/ShiftManagement'));
const LazyPumpCalibration = lazy(() => import('../../pages/operations/PumpCalibration'));
const LazyBankDeposits = lazy(() => import('../../pages/financial/BankDeposits'));

// Types (same as original)
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
  received: number;
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

interface Station {
  id: string;
  name: string;
  omc_id: string;
  omc?: {
    id: string;
    name: string;
  };
}

interface LoadingStates {
  sales: boolean;
  expenses: boolean;
  inventory: boolean;
  pumps: boolean;
  prices: boolean;
  banks: boolean;
  dailyReport: boolean;
  station: boolean;
}

interface DashboardConfig {
  autoRefresh: boolean;
  refreshInterval: number;
  defaultView: string;
  showNotifications: boolean;
}

// Utility functions (same as original)
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) {
    toast.error('No data to export');
    return;
  }

  try {
    const headers = Object.keys(data[0]).join(',');
    const csv = [headers, ...data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    )].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Export completed successfully');
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Failed to export data');
  }
};

const handleApiError = (error: any, operation: string) => {
  console.error(`❌ ${operation} failed:`, error);
  
  if (error.code === 'PGRST301' || error.message?.includes('fetch')) {
    toast.error('Network error. Please check your connection.');
  } else if (error.code === '42501') {
    toast.error('Permission denied. Please contact administrator.');
  } else if (error.message?.includes('JWT')) {
    toast.error('Session expired. Please login again.');
  } else if (error.code === '23505') {
    toast.error('Duplicate entry. This record already exists.');
  } else if (error.code === '23503') {
    toast.error('Reference error. Related record not found.');
  } else {
    toast.error(`${operation} failed: ${error.message || 'Unknown error'}`);
  }
};

// Form validation functions (same as original)
const validateSalesForm = (form: any, pumps: Pump[]): string[] => {
  const errors: string[] = [];
  
  if (!form.pump_id) errors.push('Pump selection is required');
  if (!form.opening_meter) errors.push('Opening meter is required');
  if (!form.closing_meter) errors.push('Closing meter is required');
  
  const opening = parseFloat(form.opening_meter);
  const closing = parseFloat(form.closing_meter);
  
  if (isNaN(opening) || isNaN(closing)) {
    errors.push('Please enter valid meter readings');
    return errors;
  }
  
  if (closing < opening) errors.push('Closing meter cannot be less than opening meter');
  if (closing - opening > 10000) errors.push('Unrealistic volume detected');
  
  const selectedPump = pumps.find(p => p.id === form.pump_id);
  if (selectedPump && opening < selectedPump.current_meter_reading) {
    errors.push(`Opening meter cannot be less than current pump reading (${selectedPump.current_meter_reading}L)`);
  }
  
  return errors;
};

const validateExpenseForm = (form: any): string[] => {
  const errors: string[] = [];
  
  if (!form.description?.trim()) errors.push('Description is required');
  if (!form.amount || parseFloat(form.amount) <= 0) errors.push('Valid amount is required');
  if (!form.expense_date) errors.push('Date is required');
  
  const amount = parseFloat(form.amount);
  if (amount > 1000000) errors.push('Amount seems too high. Please verify.');
  
  return errors;
};

const validateInventoryForm = (form: any): string[] => {
  const errors: string[] = [];
  
  if (!form.product_id) errors.push('Product selection is required');
  if (!form.opening_stock && form.opening_stock !== '0') errors.push('Opening stock is required');
  if (!form.closing_stock && form.closing_stock !== '0') errors.push('Closing stock is required');
  
  const opening = parseFloat(form.opening_stock);
  const closing = parseFloat(form.closing_stock);
  const received = parseFloat(form.received) || 0;
  
  if (isNaN(opening) || isNaN(closing)) {
    errors.push('Please enter valid stock values');
    return errors;
  }
  
  if (closing < 0) errors.push('Closing stock cannot be negative');
  if (opening < 0) errors.push('Opening stock cannot be negative');
  if (received < 0) errors.push('Received quantity cannot be negative');
  
  const expectedClosing = opening + received;
  if (Math.abs(closing - expectedClosing) > expectedClosing * 0.1) {
    errors.push('Closing stock differs significantly from expected value. Please verify.');
  }
  
  return errors;
};

// Mobile-optimized components
const MobileHeader = ({ 
  station, 
  user,
  onMenuClick,
  onRefresh,
  isLoading,
  isOnline,
  pendingSync
}: { 
  station: Station | null;
  user: any;
  onMenuClick: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  isOnline: boolean;
  pendingSync: number;
}) => (
  <div className="sticky top-0 z-50 bg-white border-b px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-10 w-10"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {station?.name || 'Station'}
          </h1>
          <p className="text-xs text-gray-600">Manager: {user?.name || 'User'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs ${isOnline ? 'bg-green-100' : 'bg-orange-100'}`}>
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3 text-green-600" />
              <span className="text-green-700">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-orange-600" />
              <span className="text-orange-700">Offline</span>
            </>
          )}
          {pendingSync > 0 && (
            <span className="ml-1 px-1 bg-white rounded text-xs">
              {pendingSync}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-10 w-10"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  </div>
);

const MobileStatsGrid = ({ 
  dailyReport, 
  expenseStats, 
  fuelStockCard, 
  pumps 
}: { 
  dailyReport: DailyReport | null; 
  expenseStats: ExpenseStats; 
  fuelStockCard: FuelStockCard[]; 
  pumps: Pump[]; 
}) => {
  const stats = [
    {
      label: "Today's Sales",
      value: `₵${(dailyReport?.total_sales || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "bg-green-50 text-green-600",
      description: `${dailyReport?.sales?.length || 0} transactions`
    },
    {
      label: "Expenses",
      value: `₵${expenseStats.total_expenses.toLocaleString()}`,
      icon: TrendingDown,
      color: "bg-red-50 text-red-600",
      description: `Pending: ₵${expenseStats.pending_approval.toLocaleString()}`
    },
    {
      label: "Stock",
      value: `${fuelStockCard.reduce((sum, item) => sum + (item.current_stock || 0), 0).toLocaleString()}L`,
      icon: Database,
      color: "bg-blue-50 text-blue-600",
      description: `${fuelStockCard.length} products`
    },
    {
      label: "Pumps",
      value: `${pumps.length}`,
      icon: Gauge,
      color: "bg-purple-50 text-purple-600",
      description: `${pumps.filter(p => p.status === 'active').length} active`
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 px-4 mb-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <IconComponent className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xs text-gray-600">{stat.description}</p>
          </div>
        );
      })}
    </div>
  );
};

const MobileTabNavigation = ({ activeTab, onTabChange }: { 
  activeTab: string; 
  onTabChange: (value: string) => void;
}) => (
  <div className="sticky top-14 z-40 bg-white border-b px-4 py-2">
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full grid grid-cols-4 h-10">
        <TabsTrigger value="operations" className="text-xs">
          <BarChart3 className="h-3 w-3 mr-1" />
          Ops
        </TabsTrigger>
        <TabsTrigger value="financial" className="text-xs">
          <DollarSign className="h-3 w-3 mr-1" />
          Finance
        </TabsTrigger>
        <TabsTrigger value="inventory" className="text-xs">
          <Package className="h-3 w-3 mr-1" />
          Stock
        </TabsTrigger>
        <TabsTrigger value="reports" className="text-xs">
          <Download className="h-3 w-3 mr-1" />
          Reports
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
);

const MobileQuickActions = ({
  onSalesClick,
  onExpenseClick,
  onInventoryClick,
  onCheckClick,
  onTankDippingClick
}: {
  onSalesClick: () => void;
  onExpenseClick: () => void;
  onInventoryClick: () => void;
  onCheckClick: () => void;
  onTankDippingClick: () => void;
}) => (
  <div className="px-4 mb-6">
    <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 bg-white border-gray-300"
        onClick={onSalesClick}
      >
        <DollarSign className="h-5 w-5 text-green-600" />
        <span className="text-xs text-gray-700">Record Sale</span>
      </Button>
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 bg-white border-gray-300"
        onClick={onExpenseClick}
      >
        <Receipt className="h-5 w-5 text-red-600" />
        <span className="text-xs text-gray-700">Add Expense</span>
      </Button>
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 bg-white border-gray-300"
        onClick={onInventoryClick}
      >
        <Package className="h-5 w-5 text-blue-600" />
        <span className="text-xs text-gray-700">Inventory</span>
      </Button>
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 bg-white border-gray-300"
        onClick={onCheckClick}
      >
        <Building2 className="h-5 w-5 text-orange-600" />
        <span className="text-xs text-gray-700">Station Check</span>
      </Button>
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 bg-white border-gray-300"
        onClick={onTankDippingClick}
      >
        <Fuel className="h-5 w-5 text-purple-600" />
        <span className="text-xs text-gray-700">Tank Dip</span>
      </Button>
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 bg-white border-gray-300"
        onClick={() => {}}
      >
        <Settings className="h-5 w-5 text-gray-600" />
        <span className="text-xs text-gray-700">More</span>
      </Button>
    </div>
  </div>
);

const MobilePumpPrices = ({ prices, loading }: { prices: PumpPrice[]; loading: boolean }) => (
  <div className="px-4 mb-6">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-900">Current Prices</h3>
    </div>
    <div className="bg-white rounded-xl p-4 border">
      <div className="grid grid-cols-2 gap-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))
        ) : prices.length > 0 ? (
          prices.slice(0, 2).map((price) => (
            <div key={price.product_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">{price.product_type}</span>
              <span className="text-sm font-bold text-green-600">
                ₵{price.price_per_liter.toFixed(2)}
              </span>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-2 text-gray-500">
            <p className="text-sm">No prices set</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const MobileSalesList = ({ sales }: { sales: any[] }) => (
  <div className="px-4 mb-6">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-900">Recent Sales</h3>
      <Button variant="ghost" size="sm" className="text-xs">
        View All
      </Button>
    </div>
    <div className="space-y-2">
      {sales.slice(0, 3).map((sale) => (
        <div key={sale.id} className="bg-white rounded-lg p-3 border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900">{sale.products?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-600">
                {sale.closing_meter - sale.opening_meter}L • {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900">₵{sale.total_amount?.toLocaleString() || '0'}</p>
          </div>
        </div>
      ))}
      {sales.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No sales today</p>
        </div>
      )}
    </div>
  </div>
);

const MobileExpensesList = ({ expenses, onApprove, onReject, onDelete }: { 
  expenses: Expense[]; 
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="px-4 mb-6">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-900">Recent Expenses</h3>
      <Button variant="ghost" size="sm" className="text-xs">
        View All
      </Button>
    </div>
    <div className="space-y-2">
      {expenses.slice(0, 3).map((expense) => (
        <div key={expense.id} className="bg-white rounded-lg p-3 border">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 capitalize">{expense.category}</p>
              <p className="text-xs text-gray-600 truncate">{expense.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">₵{expense.amount}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${
                expense.status === 'approved' ? 'bg-green-100 text-green-700' :
                expense.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
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
                  variant="ghost"
                  className="h-6 w-6 p-0 text-green-600"
                  onClick={() => onApprove(expense.id)}
                >
                  <CheckCircle className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-600"
                  onClick={() => onReject(expense.id)}
                >
                  <XCircle className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-600"
                  onClick={() => onDelete(expense.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
      {expenses.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No expenses</p>
        </div>
      )}
    </div>
  </div>
);

const MobileFuelStock = ({ stock }: { stock: FuelStockCard[] }) => (
  <div className="px-4 mb-6">
    <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Stock</h3>
    <div className="space-y-2">
      {stock.map((item) => (
        <div key={item.product_id} className="bg-white rounded-lg p-3 border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
              <p className="text-xs text-gray-600">
                Last updated: {new Date(item.last_updated).toLocaleDateString()}
              </p>
            </div>
            <p className="text-lg font-bold text-blue-600">
              {item.current_stock?.toLocaleString()}{item.unit}
            </p>
          </div>
        </div>
      ))}
      {stock.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No stock data</p>
        </div>
      )}
    </div>
  </div>
);

const MobileNavigationMenu = ({
  onClose,
  onTabChange,
  onSync,
  onSettings,
  pendingSync,
  isOnline
}: {
  onClose: () => void;
  onTabChange: (tab: string) => void;
  onSync: () => void;
  onSettings: () => void;
  pendingSync: number;
  isOnline: boolean;
}) => (
  <div className="p-4">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Menu</h2>
        <p className="text-sm text-gray-600">Station Manager</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="h-5 w-5" />
      </Button>
    </div>

    <div className="space-y-1 mb-6">
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => {
          onTabChange('operations');
          onClose();
        }}
      >
        <BarChart3 className="h-4 w-4 mr-3" />
        Operations
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => {
          onTabChange('financial');
          onClose();
        }}
      >
        <DollarSign className="h-4 w-4 mr-3" />
        Financial
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => {
          onTabChange('inventory');
          onClose();
        }}
      >
        <Package className="h-4 w-4 mr-3" />
        Inventory
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => {
          onTabChange('reports');
          onClose();
        }}
      >
        <Download className="h-4 w-4 mr-3" />
        Reports
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={onSettings}
      >
        <Settings className="h-4 w-4 mr-3" />
        Settings
      </Button>
    </div>

    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600">Sync Status</span>
        <div className={`px-2 py-1 rounded text-xs ${isOnline ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>
      
      {pendingSync > 0 && (
        <div className="mb-3 p-2 bg-yellow-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-700">{pendingSync} pending sync</span>
            <Button size="sm" variant="outline" onClick={onSync} className="h-6 px-2 text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Sync Now
            </Button>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          onClose();
        }}
      >
        <Activity className="h-4 w-4 mr-2" />
        Dashboard
      </Button>
    </div>
  </div>
);

// Main Mobile Component
export function MobileStationManagerDashboard() {
  const { user } = useAuth();
  const { 
    getStationPrice, 
    getStationAllPrices,
    loading: pricesLoading,
    refreshPrices 
  } = usePrices();
  
  // State management (same as original)
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [activeTab, setActiveTab] = useState('operations');
  const [pumpPrices, setPumpPrices] = useState<PumpPrice[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [station, setStation] = useState<Station | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Data states (same as original)
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [selectedPump, setSelectedPump] = useState<Pump | null>(null);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryHistory[]>([]);
  const [fuelStockCard, setFuelStockCard] = useState<FuelStockCard[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
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
  
  // Loading states (same as original)
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    sales: false,
    expenses: false,
    inventory: false,
    pumps: false,
    prices: false,
    banks: false,
    dailyReport: false,
    station: false
  });

  // Configuration (same as original)
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    autoRefresh: true,
    refreshInterval: 30000,
    defaultView: 'operations',
    showNotifications: true
  });

  // Dialog states (same as original)
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showTankDippingDialog, setShowTankDippingDialog] = useState(false);
  const [showStationCheckDialog, setShowStationCheckDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Form states (same as original)
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
    received: '',
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

  const [products, setProducts] = useState<Product[]>([]);

  // Refs (same as original)
  const initializedRef = useRef(false);
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const priceLoadAttemptedRef = useRef(false);
  const realtimeSubscriptionRef = useRef<any>(null);

  // Loading state helpers (same as original)
  const setLoading = useCallback((key: keyof LoadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  }, []);

  const isLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state);
  }, [loadingStates]);

  // Data loading functions (same as original - keep all original functions)
  const loadStation = useCallback(async () => {
    if (!user?.station_id) {
      console.log('❌ No station ID available');
      return;
    }
    
    setLoading('station', true);
    try {
      console.log('🔄 Loading station details...');
      
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

      if (error) {
        console.error('❌ Station fetch error:', error);
        throw error;
      }
      
      console.log('✅ Station loaded:', data);
      setStation(data);
    } catch (error: any) {
      console.error('❌ Failed to load station:', error);
      handleApiError(error, 'Loading station');
    } finally {
      setLoading('station', false);
    }
  }, [user?.station_id, setLoading]);

  const loadPumps = useCallback(async () => {
    if (!user?.station_id) {
      console.log('❌ No station ID available');
      return;
    }
    
    setLoading('pumps', true);
    try {
      console.log('🔄 Loading pumps for station:', user.station_id);
      
      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', user.station_id)
        .order('number');

      if (error) {
        console.error('❌ Pump fetch error:', error);
        throw error;
      }
      
      console.log('✅ Pumps loaded:', data);
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
          product_type: defaultPump.fuel_type || 'Petrol',
          product_id: matchingProduct?.id || ''
        }));
      } else {
        console.log('⚠️ No active pumps found for this station');
        toast.info('No active pumps configured for this station');
      }
    } catch (error: any) {
      console.error('❌ Failed to load pumps:', error);
      handleApiError(error, 'Loading pumps');
      setPumps([]);
    } finally {
      setLoading('pumps', false);
    }
  }, [user?.station_id, products, setLoading]);

  const loadProducts = useCallback(async () => {
    setLoading('inventory', true);
    try {
      console.log('🔄 Loading products...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) {
        console.error('Product fetch error:', error);
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
      const fallbackProducts: Product[] = [
        { id: 'petrol', name: 'Petrol', unit: 'L' },
        { id: 'diesel', name: 'Diesel', unit: 'L' },
        { id: 'lpg', name: 'LPG', unit: 'kg' }
      ];
      setProducts(fallbackProducts);
    } finally {
      setLoading('inventory', false);
    }
  }, [pumps.length, setLoading]);

  const loadPumpPrices = useCallback(async (forceRefresh = false) => {
    if (!user?.station_id) return;
    
    setLoading('prices', true);
    try {
      console.log('🔄 Loading pump prices...');
      
      if (forceRefresh) {
        await refreshPrices();
      }
      
      const stationAllPrices = getStationAllPrices(user.station_id);
      console.log('✅ Station prices:', stationAllPrices);
      
      if (stationAllPrices.length === 0 && !priceLoadAttemptedRef.current) {
        console.log('🔄 No prices found, attempting refresh...');
        priceLoadAttemptedRef.current = true;
        await refreshPrices();
        const refreshedPrices = getStationAllPrices(user.station_id);
        
        const transformedPrices: PumpPrice[] = refreshedPrices.map(price => ({
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
      const fallbackPrices: PumpPrice[] = [
        { product_type: 'Petrol', product_id: 'petrol', price_per_liter: 12.50, last_updated: new Date().toISOString() },
        { product_type: 'Diesel', product_id: 'diesel', price_per_liter: 11.80, last_updated: new Date().toISOString() },
        { product_type: 'LPG', product_id: 'lpg', price_per_liter: 8.90, last_updated: new Date().toISOString() }
      ];
      setPumpPrices(fallbackPrices);
    } finally {
      setLoading('prices', false);
    }
  }, [user?.station_id, getStationAllPrices, refreshPrices, setLoading]);

  const loadBanks = useCallback(async () => {
    if (!user?.station_id) return;

    setLoading('banks', true);
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
    } finally {
      setLoading('banks', false);
    }
  }, [user?.station_id, setLoading]);

  const loadInventoryHistory = useCallback(async () => {
    if (!user?.station_id) return;

    setLoading('inventory', true);
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
    } finally {
      setLoading('inventory', false);
    }
  }, [user?.station_id, setLoading]);

  const loadFuelStockCard = useCallback(async () => {
    if (!user?.station_id) return;

    setLoading('inventory', true);
    try {
      console.log('🔄 Loading fuel stock card...');
      
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
    } finally {
      setLoading('inventory', false);
    }
  }, [user?.station_id, setLoading]);

  const loadExpenses = useCallback(async () => {
    if (!user?.station_id) return;

    setLoading('expenses', true);
    try {
      console.log('🔄 Loading expenses...');
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('station_id', user.station_id)
        .order('expense_date', { ascending: false })
        .limit(50);

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
    } finally {
      setLoading('expenses', false);
    }
  }, [user?.station_id, setLoading]);

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

  const loadDailyReport = useCallback(async () => {
    if (!user?.station_id) return;
    
    setLoading('dailyReport', true);
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
      setLoading('dailyReport', false);
    }
  }, [user?.station_id, pumpPrices, fuelStockCard, setLoading]);

  // Calculation and sync functions (same as original)
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

  // Form handlers (same as original - keep all original handlers)
  const handleRecordSales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id || !salesForm.pump_id) {
      toast.error('Please select a pump');
      return;
    }

    const validationErrors = validateSalesForm(salesForm, pumps);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    setSubmitting(true);
    
    const opening = parseFloat(salesForm.opening_meter);
    const closing = parseFloat(salesForm.closing_meter);
    const price = getStationPrice(user.station_id, salesForm.product_id) || 0;
    const volume = closing - opening;
    const calculatedAmount = volume * price;
    
    const selectedPump = pumps.find(p => p.id === salesForm.pump_id);
    
    if (!selectedPump) {
      toast.error('Selected pump not found');
      setSubmitting(false);
      return;
    }

    const pumpNumber = parseInt(selectedPump.number) || 1;

    const salesData = {
      station_id: user.station_id,
      pump_id: salesForm.pump_id,
      pump_number: pumpNumber,
      opening_meter: opening,
      closing_meter: closing,
      unit_price: price,
      total_amount: calculatedAmount,
      cash_received: calculatedAmount,
      payment_method: 'cash',
      product_id: salesForm.product_id,
      created_by: user.id,
      customer_type: 'retail',
      transaction_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Recording sale:', salesData);

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('sales')
          .insert([salesData]);

        if (error) throw error;

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
      handleApiError(error, 'Recording sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    const validationErrors = validateExpenseForm(expenseForm);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
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
      handleApiError(error, 'Recording expense');
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
      handleApiError(error, 'Updating expense status');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

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
      handleApiError(error, 'Deleting expense');
    }
  };

  const handleInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    const validationErrors = validateInventoryForm(inventoryForm);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    setSubmitting(true);
    
    const inventoryData = {
      station_id: user.station_id,
      product_id: inventoryForm.product_id,
      opening_stock: parseFloat(inventoryForm.opening_stock) || 0,
      closing_stock: parseFloat(inventoryForm.closing_stock) || 0,
      received: parseFloat(inventoryForm.received) || 0,
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
      handleApiError(error, 'Recording inventory');
    } finally {
      setSubmitting(false);
    }
  };

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
      handleApiError(error, 'Recording station check');
    } finally {
      setSubmitting(false);
    }
  };

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
      handleApiError(error, 'Recording tank dipping');
    } finally {
      setSubmitting(false);
    }
  };

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
      resetBankForm();
      await loadBanks();
    } catch (error: any) {
      console.error('Failed to add bank:', error);
      handleApiError(error, 'Adding bank');
    } finally {
      setSubmitting(false);
    }
  };

  // Form reset functions (same as original)
  const resetSalesForm = () => {
    if (selectedPump) {
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
      received: '',
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

  // Debug function (same as original)
  const debugPumpsTable = async () => {
    if (!user?.station_id) return;
    
    try {
      console.log('🔍 Debugging pumps table...');
      
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

  // Filtered data (same as original)
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;
    
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(expense => expense.status === filterStatus);
    }
    
    return filtered;
  }, [expenses, searchTerm, filterStatus]);

  // Effects (same as original)
  useEffect(() => {
    if (initializedRef.current || !user?.station_id) return;
    
    initializedRef.current = true;
    console.log('🚀 StationManagerDashboard: Initializing...');

    const initializeDashboard = async () => {
      try {
        await offlineSync.init();
        await loadStation();
        await loadProducts();
        await loadPumps();
        await loadBanks();
        await loadPumpPrices(true);
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

    // Set up periodic sync
    if (dashboardConfig.autoRefresh) {
      syncIntervalRef.current = setInterval(() => {
        if (isOnline && pendingSync > 0) {
          syncOfflineData();
        }
      }, dashboardConfig.refreshInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [user?.station_id, dashboardConfig.autoRefresh, dashboardConfig.refreshInterval]);

  // Real-time subscriptions (same as original)
  useEffect(() => {
    if (!user?.station_id) return;

    // Clean up existing subscription
    if (realtimeSubscriptionRef.current) {
      realtimeSubscriptionRef.current.unsubscribe();
    }

    // Subscribe to sales changes
    realtimeSubscriptionRef.current = supabase
      .channel('station-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `station_id=eq.${user.station_id}`
        },
        () => {
          loadDailyReport();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `station_id=eq.${user.station_id}`
        },
        () => {
          loadExpenses();
          loadDailyReport();
        }
      )
      .subscribe();

    return () => {
      if (realtimeSubscriptionRef.current) {
        realtimeSubscriptionRef.current.unsubscribe();
      }
    };
  }, [user?.station_id]);

  // Network status (same as original)
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

  // Sales calculation effect (same as original)
  useEffect(() => {
    if (salesForm.opening_meter && salesForm.closing_meter && salesForm.product_id) {
      calculateSalesAmount(salesForm.opening_meter, salesForm.closing_meter, salesForm.product_id);
    }
  }, [salesForm.opening_meter, salesForm.closing_meter, salesForm.product_id, calculateSalesAmount]);

  // Pump selection effect (same as original)
  useEffect(() => {
    if (selectedPump) {
      const matchingProduct = products.find(p => 
        p.name.toLowerCase() === selectedPump.fuel_type?.toLowerCase()
      );
      
      const currentPrice = getStationPrice(user?.station_id || '', matchingProduct?.id || '') || 0;
      
      setSalesForm(currentForm => {
        const updatedForm = {
          ...currentForm,
          pump_id: selectedPump.id,
          product_type: selectedPump.fuel_type || 'Petrol',
          product_id: matchingProduct?.id || '',
          opening_meter: selectedPump.current_meter_reading?.toString() || '0',
          unit_price: currentPrice.toString()
        };
        
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

  // Handle refresh
  const handleRefresh = async () => {
    await loadDailyReport();
    await loadPumpPrices(true);
    await loadFuelStockCard();
    await loadPumps();
  };

  if (isLoading() && !dailyReport) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 gap-3 px-4 mb-6 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="px-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader 
        station={station}
        user={user}
        onMenuClick={() => setIsMenuOpen(true)}
        onRefresh={handleRefresh}
        isLoading={isLoading()}
        isOnline={isOnline}
        pendingSync={pendingSync}
      />

      {/* Navigation Menu */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <MobileNavigationMenu 
            onClose={() => setIsMenuOpen(false)}
            onTabChange={setActiveTab}
            onSync={syncOfflineData}
            onSettings={() => setShowSettingsDialog(true)}
            pendingSync={pendingSync}
            isOnline={isOnline}
          />
        </SheetContent>
      </Sheet>

      {/* Sync Banner */}
      {pendingSync > 0 && isOnline && (
        <div className="px-4 py-2 bg-yellow-50 border-y border-yellow-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">{pendingSync} pending sync</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={syncOfflineData}
              className="h-6 px-2 text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              Sync Now
            </Button>
          </div>
        </div>
      )}

      <MobileStatsGrid 
        dailyReport={dailyReport}
        expenseStats={expenseStats}
        fuelStockCard={fuelStockCard}
        pumps={pumps}
      />

      <MobileTabNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'operations' && (
        <div className="space-y-6">
          <MobileQuickActions 
            onSalesClick={() => setShowSalesDialog(true)}
            onExpenseClick={() => setShowExpenseDialog(true)}
            onInventoryClick={() => setShowInventoryDialog(true)}
            onCheckClick={() => setShowStationCheckDialog(true)}
            onTankDippingClick={() => setShowTankDippingDialog(true)}
          />

          <MobilePumpPrices 
            prices={pumpPrices}
            loading={loadingStates.prices}
          />

          <MobileSalesList sales={dailyReport?.sales || []} />

          <MobileExpensesList 
            expenses={expenses}
            onApprove={(id) => handleUpdateExpenseStatus(id, 'approved')}
            onReject={(id) => handleUpdateExpenseStatus(id, 'rejected')}
            onDelete={handleDeleteExpense}
          />
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <MobileFuelStock stock={fuelStockCard} />

          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Inventory History</h3>
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {inventoryHistory.slice(0, 5).map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-3 border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.products?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(item.stock_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Opening: {item.opening_stock}L</p>
                      <p className="text-xs text-gray-600">Received: {item.received}L</p>
                      <p className="text-sm font-semibold text-gray-900">Closing: {item.closing_stock}L</p>
                    </div>
                  </div>
                </div>
              ))}
              {inventoryHistory.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No inventory history</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financial' && (
        <Suspense fallback={
          <div className="px-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }>
          <LazyBankDeposits 
            stationId={user?.station_id || ''} 
            banks={banks}
            onBankAdded={loadBanks}
            showAddBank={true}
            mobileView={true}
          />
        </Suspense>
      )}

      {activeTab === 'reports' && (
        <div className="px-4 space-y-4">
          <div className="bg-white rounded-xl p-4 border">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Export Reports</h3>
            <div className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleExportSales}
                disabled={!dailyReport?.sales.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Sales Report ({dailyReport?.sales.length || 0})
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleExportExpenses}
                disabled={!expenses.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Expense Report ({expenses.length})
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleExportInventory}
                disabled={!inventoryHistory.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Inventory Report ({inventoryHistory.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs (Keep all original dialogs - they work fine on mobile) */}
      {/* Sales Dialog */}
      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
        <DialogContent className="max-w-[95vw] bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Record Sales</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleRecordSales} className="space-y-4">
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
                      {pump.name} (No: {pump.number}) - {pump.fuel_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700">Opening Meter (L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={salesForm.opening_meter}
                    onChange={(e) => {
                      setSalesForm({ ...salesForm, opening_meter: e.target.value });
                      if (e.target.value && salesForm.closing_meter && salesForm.product_id) {
                        calculateSalesAmount(e.target.value, salesForm.closing_meter, salesForm.product_id);
                      }
                    }}
                    placeholder="0.00"
                    required
                    className="bg-white text-gray-900"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Closing Meter (L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={salesForm.closing_meter}
                    onChange={(e) => {
                      setSalesForm({ ...salesForm, closing_meter: e.target.value });
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

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-blue-700">Volume Sold:</span>
                  <span className="font-bold text-blue-800">
                    {salesForm.opening_meter && salesForm.closing_meter 
                      ? (parseFloat(salesForm.closing_meter) - parseFloat(salesForm.opening_meter)).toFixed(2) 
                      : '0.00'} L
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Total Amount:</span>
                  <span className="text-lg font-bold text-blue-800">
                    ₵{salesForm.calculated_amount}
                  </span>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                style={{ backgroundColor: '#0B2265' }}
                disabled={submitting || !salesForm.pump_id}
              >
                {submitting ? 'Recording...' : 'Save Sale'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-[95vw] bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add Expense</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleRecordExpense} className="space-y-4">
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

              <div>
                <Label className="text-gray-700">Category</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="staff">Staff</option>
                  <option value="other">Other</option>
                </select>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Dialog */}
      <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
        <DialogContent className="max-w-[95vw] bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Inventory</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-3">
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-[95vw] bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Settings</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto space-y-4">
            <div>
              <Label className="text-gray-700">Default Tab</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900"
                value={dashboardConfig.defaultView}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, defaultView: e.target.value }))}
              >
                <option value="operations">Operations</option>
                <option value="financial">Financial</option>
                <option value="inventory">Inventory</option>
                <option value="reports">Reports</option>
              </select>
            </div>

            <Button 
              onClick={() => {
                setShowSettingsDialog(false);
                toast.success('Settings saved');
              }}
              className="w-full" 
              style={{ backgroundColor: '#0B2265' }}
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Support Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-2xl"
          style={{ backgroundColor: '#0B2265' }}
          onClick={() => {
            // Support action
          }}
        >
          <AlertCircle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

export default MobileStationManagerDashboard;
