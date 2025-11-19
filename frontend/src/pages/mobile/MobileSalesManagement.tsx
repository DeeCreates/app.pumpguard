import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  MoreVertical,
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  User,
  Fuel,
  Calendar,
  Clock,
  DollarSign,
  Zap,
  Target,
  Loader2,
  Filter,
  MapPin,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/use-auth";

// Types
interface Sale {
  id: string;
  station_id: string;
  station_name: string;
  station_code: string;
  product_id: string;
  product_name: string;
  product_category: 'petrol' | 'diesel' | 'kerosene' | 'lpg';
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  customer_type: 'retail' | 'commercial' | 'fleet';
  shift_id?: string;
  shift_name?: string;
  attendant_id?: string;
  attendant_name?: string;
  omc_id?: string;
  omc_name?: string;
  dealer_id?: string;
  dealer_name?: string;
  transaction_id: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  notes?: string;
  created_at: string;
  updated_at: string;
  region: string;
  city: string;
}

interface SalesFilters {
  search?: string;
  status?: string;
  product_category?: string;
  payment_method?: string;
  customer_type?: string;
  station_id?: string;
  omc_id?: string;
  dealer_id?: string;
  region?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface SalesSummary {
  total_sales: number;
  total_volume: number;
  total_transactions: number;
  average_ticket: number;
  today_sales: number;
  yesterday_sales: number;
  growth_percentage: number;
  top_product: string;
  top_station: string;
}

// Constants
const REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Brong Ahafo"
];

const PRODUCT_CATEGORIES = [
  { value: 'petrol', label: 'Petrol', color: 'bg-green-100 text-green-800' },
  { value: 'diesel', label: 'Diesel', color: 'bg-blue-100 text-blue-800' },
  { value: 'kerosene', label: 'Kerosene', color: 'bg-orange-100 text-orange-800' },
  { value: 'lpg', label: 'LPG', color: 'bg-purple-100 text-purple-800' }
];

const PAYMENT_METHODS = {
  cash: { label: "Cash", variant: "default" as const },
  mobile_money: { label: "Mobile Money", variant: "secondary" as const },
  card: { label: "Card", variant: "outline" as const },
  credit: { label: "Credit", variant: "destructive" as const }
};

const CUSTOMER_TYPES = {
  retail: { label: "Retail", variant: "default" as const },
  commercial: { label: "Commercial", variant: "secondary" as const },
  fleet: { label: "Fleet", variant: "outline" as const }
};

const STATUS_CONFIG = {
  completed: { variant: "default" as const, icon: CheckCircle },
  pending: { variant: "outline" as const, icon: Clock },
  cancelled: { variant: "secondary" as const, icon: XCircle },
  refunded: { variant: "destructive" as const, icon: AlertTriangle }
};

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS'
  }).format(amount);
};

const formatVolume = (volume: number): string => {
  return new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(volume);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-GH', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Custom hooks
const useSalesData = (filters: SalesFilters, userRole: string, userStationId?: string, userOmcId?: string, userDealerId?: string) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [omcs, setOmcs] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Apply role-based filters
      const roleBasedFilters: SalesFilters = { ...filters };
      
      if (userRole === 'station_manager' || userRole === 'attendant') {
        roleBasedFilters.station_id = userStationId;
      } else if (userRole === 'omc') {
        roleBasedFilters.omc_id = userOmcId;
      } else if (userRole === 'dealer') {
        roleBasedFilters.dealer_id = userDealerId;
      }

      const [
        salesResponse,
        summaryResponse,
        stationsResponse,
        omcsResponse,
        dealersResponse,
        productsResponse
      ] = await Promise.all([
        api.getSales(roleBasedFilters),
        api.getSalesSummary(roleBasedFilters),
        api.getAllStations(),
        api.getOMCs(),
        api.getDealers(),
        api.getProducts()
      ]);

      // Process sales data
      if (salesResponse.success) {
        if (salesResponse.data && typeof salesResponse.data === 'object') {
          if ('sales' in salesResponse.data && 'pagination' in salesResponse.data) {
            setSales((salesResponse.data as any).sales || []);
            setPagination((salesResponse.data as any).pagination || pagination);
          } else if (Array.isArray(salesResponse.data)) {
            setSales(salesResponse.data);
            setPagination({ 
              ...pagination, 
              total: salesResponse.data.length,
              total_pages: Math.ceil(salesResponse.data.length / pagination.limit)
            });
          }
        }
      }

      // Process summary data
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      }

      // Process related data
      if (stationsResponse.success) {
        setStations(stationsResponse.data || []);
      }
      if (omcsResponse.success) {
        setOmcs(omcsResponse.data || []);
      }
      if (dealersResponse.success) {
        setDealers(dealersResponse.data || []);
      }
      if (productsResponse.success) {
        setProducts(productsResponse.data || []);
      }

    } catch (err: any) {
      console.error("Failed to load sales data:", err);
      setError(err.message);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  }, [filters, userRole, userStationId, userOmcId, userDealerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { 
    sales, 
    summary, 
    stations, 
    omcs, 
    dealers, 
    products, 
    pagination, 
    loading, 
    error, 
    refetch: loadData 
  };
};

// Mobile-optimized Bottom Sheet Component
const BottomSheet = React.memo(({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children,
  className = "",
  size = "default"
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "default" | "lg";
}) => {
  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className={`fixed bottom-0 left-0 right-0 mx-auto max-h-[85vh] rounded-t-2xl rounded-b-none border-0 shadow-2xl flex flex-col p-0 bg-white ${className} ${
        size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
      }`}>
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
          <div className="flex-shrink-0 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-black">
                {title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 touch-manipulation active:scale-95"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {description && (
              <p className="text-gray-600 text-sm">
                {description}
              </p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});

BottomSheet.displayName = 'BottomSheet';

// Mobile Action Sheet Component
const ActionSheet = React.memo(({
  open,
  onOpenChange,
  title,
  actions
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actions: { label: string; onClick: () => void; icon?: React.ElementType; destructive?: boolean }[];
}) => {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="max-w-lg"
    >
      <div className="space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick();
              onOpenChange(false);
            }}
            className={`w-full text-left p-4 rounded-xl text-base font-medium transition-colors touch-manipulation active:scale-95 ${
              action.destructive
                ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                : 'text-gray-900 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {action.icon && <action.icon className="w-5 h-5" />}
              {action.label}
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 pt-2 border-t border-gray-200">
        <button
          onClick={() => onOpenChange(false)}
          className="w-full text-center p-4 rounded-xl text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
});

ActionSheet.displayName = 'ActionSheet';

// Mobile Stats Card Component
const StatsCard = React.memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  color = "blue" 
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color?: "blue" | "green" | "orange" | "purple";
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900'
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]} touch-manipulation active:scale-95 transition-transform`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs opacity-75 mt-1 truncate">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          color === 'blue' ? 'bg-blue-100' :
          color === 'green' ? 'bg-green-100' :
          color === 'orange' ? 'bg-orange-100' :
          'bg-purple-100'
        }`}>
          <Icon className={`w-5 h-5 ${
            color === 'blue' ? 'text-blue-600' :
            color === 'green' ? 'text-green-600' :
            color === 'orange' ? 'text-orange-600' :
            'text-purple-600'
          }`} />
        </div>
      </div>
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

// Mobile Shift Card Component
const ShiftCard = React.memo(({ sale, onViewDetails, onEdit, onDelete, canEditSale, canDeleteSale }: {
  sale: Sale;
  onViewDetails: (sale: Sale) => void;
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
  canEditSale: boolean;
  canDeleteSale: boolean;
}) => {
  const paymentMethod = PAYMENT_METHODS[sale.payment_method];
  const customerType = CUSTOMER_TYPES[sale.customer_type];
  const productCategory = PRODUCT_CATEGORIES.find(c => c.value === sale.product_category) || PRODUCT_CATEGORIES[0];
  const statusConfig = STATUS_CONFIG[sale.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.completed;
  const StatusIcon = statusConfig.icon;

  const [showActions, setShowActions] = useState(false);

  const handleAction = (action: 'view' | 'edit' | 'delete') => {
    setShowActions(false);
    setTimeout(() => {
      switch (action) {
        case 'view':
          onViewDetails(sale);
          break;
        case 'edit':
          onEdit(sale);
          break;
        case 'delete':
          onDelete(sale);
          break;
      }
    }, 100);
  };

  return (
    <>
      <Card className="touch-manipulation active:scale-[0.98] transition-transform duration-150">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                  <StatusIcon className="w-3 h-3" />
                  {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatDate(sale.created_at)} • {formatTime(sale.created_at)}
                </span>
              </div>
              <p className="font-mono text-sm font-medium truncate">
                {sale.transaction_id}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 touch-manipulation"
              onClick={() => setShowActions(true)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Station & Product */}
          <div className="space-y-2">
            <div>
              <p className="font-medium text-base truncate">{sale.station_name}</p>
              <p className="text-sm text-gray-500">{sale.station_code}</p>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={productCategory.color}>
                {sale.product_name}
              </Badge>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(sale.total_amount)}
              </span>
            </div>
          </div>

          {/* Sale Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{formatVolume(sale.quantity)}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unit Price:</span>
                <span className="font-medium">{formatCurrency(sale.unit_price)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment:</span>
                <Badge variant={paymentMethod.variant} className="text-xs">
                  {paymentMethod.label}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <Badge variant={customerType.variant} className="text-xs">
                  {customerType.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 touch-manipulation"
              onClick={() => handleAction('view')}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            {canEditSale && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 touch-manipulation"
                onClick={() => handleAction('edit')}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Sheet */}
      <ActionSheet
        open={showActions}
        onOpenChange={setShowActions}
        title="Sale Actions"
        actions={[
          {
            label: "View Details",
            icon: Eye,
            onClick: () => handleAction('view'),
          },
          ...(canEditSale ? [{
            label: "Edit Sale",
            icon: Edit,
            onClick: () => handleAction('edit'),
          }] : []),
          ...(canDeleteSale ? [{
            label: "Delete Sale",
            icon: Trash2,
            destructive: true,
            onClick: () => handleAction('delete'),
          }] : []),
        ]}
      />
    </>
  );
});

ShiftCard.displayName = 'ShiftCard';

// Export Button Component
const ExportButton = ({ onExport, isExporting, dataLength, className }: {
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  isExporting: boolean;
  dataLength: number;
  className?: string;
}) => {
  const [showExportOptions, setShowExportOptions] = useState(false);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setShowExportOptions(false);
    onExport(format);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowExportOptions(true)}
        disabled={isExporting || dataLength === 0}
        className={`h-12 min-h-[48px] touch-manipulation active:scale-95 ${className}`}
      >
        {isExporting ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Download className="w-5 h-5 mr-2" />
        )}
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>

      <ActionSheet
        open={showExportOptions}
        onOpenChange={setShowExportOptions}
        title="Export Format"
        actions={[
          {
            label: "Export as CSV",
            onClick: () => handleExport('csv'),
          },
          {
            label: "Export as Excel",
            onClick: () => handleExport('excel'),
          },
          {
            label: "Export as PDF",
            onClick: () => handleExport('pdf'),
          },
        ]}
      />
    </>
  );
};

// Simple CSV export function
const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Main Component
export function MobileSalesManagement() {
  const { user } = useAuth();
  const userRole = user?.role || 'attendant';
  const userStationId = user?.station_id;
  const userOmcId = user?.omc_id;
  const userDealerId = user?.dealer_id;

  // Filters state
  const [filters, setFilters] = useState<SalesFilters>({
    page: 1,
    limit: 20,
    search: "",
    status: "all",
    product_category: "all",
    payment_method: "all",
    customer_type: "all",
    station_id: "all",
    omc_id: "all",
    dealer_id: "all",
    region: "all",
    date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0]
  });

  // Mobile UI states
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Operation states
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Selected items
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Form states
  const [newSale, setNewSale] = useState({
    station_id: "",
    product_id: "",
    quantity: 0,
    unit_price: 0,
    payment_method: "cash" as const,
    customer_type: "retail" as const,
    notes: ""
  });

  const [editSale, setEditSale] = useState({
    quantity: 0,
    unit_price: 0,
    payment_method: "cash" as const,
    customer_type: "retail" as const,
    status: "completed" as const,
    notes: ""
  });

  // Load data
  const { 
    sales, 
    summary, 
    stations, 
    omcs, 
    dealers, 
    products, 
    pagination, 
    loading, 
    error,
    refetch 
  } = useSalesData(filters, userRole, userStationId, userOmcId, userDealerId);

  // Permission checks
  const canCreateSale = ['admin', 'station_manager', 'attendant'].includes(userRole);
  const canEditSale = ['admin', 'station_manager', 'omc'].includes(userRole);
  const canDeleteSale = ['admin', 'omc'].includes(userRole);
  const canViewAllData = userRole === 'admin';

  // Calculate total amount for display
  const newSaleTotal = useMemo(() => newSale.quantity * newSale.unit_price, [newSale.quantity, newSale.unit_price]);
  const editSaleTotal = useMemo(() => editSale.quantity * editSale.unit_price, [editSale.quantity, editSale.unit_price]);

  // Auto-set station for station-level users
  useEffect(() => {
    if ((userRole === 'station_manager' || userRole === 'attendant') && userStationId) {
      setNewSale(prev => ({ ...prev, station_id: userStationId }));
    } else if (stations.length > 0 && !newSale.station_id) {
      setNewSale(prev => ({ ...prev, station_id: stations[0].id }));
    }
  }, [userRole, userStationId, stations, newSale.station_id]);

  // Reset new sale form when sheet opens/closes
  useEffect(() => {
    if (showCreateSheet) {
      const defaultStation = (userRole === 'station_manager' || userRole === 'attendant') 
        ? userStationId 
        : (stations[0]?.id || "");
      
      setNewSale({
        station_id: defaultStation,
        product_id: products[0]?.id || "",
        quantity: 0,
        unit_price: products[0]?.current_price || 0,
        payment_method: "cash",
        customer_type: "retail",
        notes: ""
      });
    }
  }, [showCreateSheet, userRole, userStationId, stations, products]);

  // Handlers
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newSale.station_id || !newSale.product_id || newSale.quantity <= 0 || newSale.unit_price <= 0) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields with valid values."
      });
      return;
    }

    // Role-based validation
    if ((userRole === 'station_manager' || userRole === 'attendant') && newSale.station_id !== userStationId) {
      toast.error("Permission denied", {
        description: "You can only create sales for your assigned station."
      });
      return;
    }

    setCreating(true);
    
    try {
      const result = await api.createSale({
        ...newSale,
        total_amount: newSaleTotal
      });

      if (result.success) {
        toast.success("Sale recorded successfully", {
          description: `Sale of ${formatVolume(newSale.quantity)}L has been recorded.`
        });
        
        await refetch();
        setShowCreateSheet(false);
      } else {
        toast.error("Failed to record sale", {
          description: result.error || "Please try again."
        });
      }
    } catch (error: any) {
      toast.error("Failed to record sale", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    // Role-based validation
    if ((userRole === 'station_manager' || userRole === 'attendant') && selectedSale.station_id !== userStationId) {
      toast.error("Permission denied", {
        description: "You can only edit sales from your assigned station."
      });
      return;
    }

    setUpdating(true);
    try {
      const result = await api.updateSale(selectedSale.id, {
        ...editSale,
        total_amount: editSaleTotal
      });

      if (result.success) {
        toast.success("Sale updated successfully", {
          description: "Sale information has been updated."
        });
        
        await refetch();
        setShowEditSheet(false);
        setSelectedSale(null);
      } else {
        toast.error("Failed to update sale", {
          description: result.error || "Please try again."
        });
      }
    } catch (error: any) {
      toast.error("Failed to update sale", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!selectedSale) return;

    // Role-based validation
    if (userRole !== 'admin' && userRole !== 'omc') {
      toast.error("Permission denied", {
        description: "Only administrators and OMC managers can delete sales."
      });
      return;
    }

    setDeleting(selectedSale.id);
    try {
      const result = await api.deleteSale(selectedSale.id);
      
      if (result.success) {
        toast.success("Sale deleted successfully", {
          description: "Sale record has been removed."
        });
        await refetch();
        setShowDeleteDialog(false);
        setSelectedSale(null);
      } else {
        toast.error("Failed to delete sale", {
          description: result.error || "Please try again."
        });
      }
    } catch (error: any) {
      toast.error("Failed to delete sale", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleExportSales = async (format: 'csv' | 'excel' | 'pdf') => {
    if (sales.length === 0) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);
    try {
      const exportData = sales.map(sale => ({
        'Transaction ID': sale.transaction_id,
        'Station': sale.station_name,
        'Product': sale.product_name,
        'Category': sale.product_category,
        'Quantity (L)': sale.quantity,
        'Unit Price (₵)': sale.unit_price,
        'Total Amount (₵)': sale.total_amount,
        'Payment Method': sale.payment_method,
        'Customer Type': sale.customer_type,
        'Attendant': sale.attendant_name || 'N/A',
        'Status': sale.status,
        'Region': sale.region,
        'City': sale.city,
        'Date': formatDate(sale.created_at),
        'Time': formatTime(sale.created_at)
      }));

      // For now, we'll just use CSV export
      exportToCSV(exportData, `sales-export-${new Date().toISOString().split('T')[0]}`);
      
      toast.success("Export completed", {
        description: "Sales data has been exported successfully."
      });
    } catch (error) {
      toast.error("Export failed", {
        description: "Failed to export sales data."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const resetEditSaleForm = (sale: Sale) => {
    setEditSale({
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      payment_method: sale.payment_method,
      customer_type: sale.customer_type,
      status: sale.status,
      notes: sale.notes || ""
    });
  };

  const handleFilterChange = (key: keyof SalesFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  // Action handlers for cards
  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailsSheet(true);
  };

  const handleEditSale = (sale: Sale) => {
    setSelectedSale(sale);
    resetEditSaleForm(sale);
    setShowEditSheet(true);
  };

  const handleDeleteAction = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDeleteDialog(true);
  };

  // Loading state
  if (loading && sales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600 text-base">Loading sales data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && sales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Data</h2>
          <p className="text-gray-600 mb-4 text-base">{error}</p>
          <Button onClick={refetch} className="h-11 min-h-[44px]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      
      {/* Header Section */}
      <div className="bg-white border-b sticky top-0 z-10 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
              <p className="text-gray-600 text-base mt-1">
                {userRole === 'admin' && "All sales across the system"}
                {userRole === 'omc' && `Sales for ${user?.omc_name || 'your OMC'}`}
                {userRole === 'dealer' && `Sales for ${user?.dealer_name || 'your dealership'}`}
                {userRole === 'station_manager' && `Sales for ${user?.station_name || 'your station'}`}
                {userRole === 'attendant' && `Sales for ${user?.station_name || 'your station'}`}
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={refetch}
              disabled={loading}
              className="h-11 min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search transactions, stations..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 h-11 text-base"
            />
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        
        {/* Sales Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 gap-3">
            <StatsCard
              title="Total Sales"
              value={formatCurrency(summary.total_sales)}
              subtitle={`+${summary.growth_percentage}% from yesterday`}
              icon={DollarSign}
              color="blue"
            />
            <StatsCard
              title="Total Volume"
              value={`${formatVolume(summary.total_volume)}L`}
              subtitle={`${summary.total_transactions} transactions`}
              icon={Fuel}
              color="green"
            />
            <StatsCard
              title="Today's Sales"
              value={formatCurrency(summary.today_sales)}
              subtitle={`Avg: ${formatCurrency(summary.average_ticket)}`}
              icon={Zap}
              color="purple"
            />
            <StatsCard
              title="Top Product"
              value={summary.top_product}
              subtitle={`Station: ${summary.top_station}`}
              icon={Target}
              color="orange"
            />
          </div>
        )}

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
          <Button
            variant={filters.status === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange('status', 'all')}
            className="whitespace-nowrap h-9 min-h-[36px] touch-manipulation"
          >
            All
          </Button>
          <Button
            variant={filters.status === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange('status', 'completed')}
            className="whitespace-nowrap h-9 min-h-[36px] touch-manipulation"
          >
            Completed
          </Button>
          <Button
            variant={filters.status === "pending" ? "outline" : "outline"}
            size="sm"
            onClick={() => handleFilterChange('status', 'pending')}
            className="whitespace-nowrap h-9 min-h-[36px] touch-manipulation"
          >
            Pending
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(true)}
            className="whitespace-nowrap h-9 min-h-[36px] touch-manipulation"
          >
            <Filter className="w-4 h-4 mr-1" />
            More
          </Button>
        </div>

        {/* Sales Count */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Transactions ({pagination.total})
          </h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
        </div>

        {/* Sales List */}
        {sales.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
            <p className="text-gray-500 mb-6 text-base">
              {filters.search || filters.date_from || filters.status !== 'all' 
                ? "Try adjusting your filters" 
                : "No sales recorded for this period"}
            </p>
            {canCreateSale && (
              <Button 
                onClick={() => setShowCreateSheet(true)}
                className="h-11 min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record First Sale
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <ShiftCard
                key={sale.id}
                sale={sale}
                onViewDetails={handleViewDetails}
                onEdit={handleEditSale}
                onDelete={handleDeleteAction}
                canEditSale={canEditSale}
                canDeleteSale={canDeleteSale}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.total_pages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', pagination.page - 1)}
                disabled={!pagination.has_prev}
                className="h-9 min-h-[36px] touch-manipulation"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', pagination.page + 1)}
                disabled={!pagination.has_next}
                className="h-9 min-h-[36px] touch-manipulation"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-4 left-4 right-4 flex gap-3 z-20">
        <ExportButton
          onExport={handleExportSales}
          isExporting={isExporting}
          dataLength={sales.length}
          className="flex-1 h-12"
        />
        {canCreateSale && (
          <Button 
            className="h-12 min-h-[48px] flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg touch-manipulation active:scale-95"
            onClick={() => setShowCreateSheet(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Sale
          </Button>
        )}
      </div>

      {/* Filters Bottom Sheet */}
      <BottomSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        title="Filter Sales"
      >
        <div className="space-y-4 pb-8">
          {/* Date Range */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Date Range</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">From</label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">To</label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Product Category */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Product Category</h3>
            <Select 
              value={filters.product_category} 
              onValueChange={(value) => handleFilterChange('product_category', value)}
            >
              <SelectTrigger className="h-11">
                <Fuel className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          <div className="space-y-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center justify-between w-full p-3 border rounded-lg"
            >
              <span className="font-medium text-gray-900">Advanced Filters</span>
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedFilters && (
              <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Payment Method</label>
                  <Select 
                    value={filters.payment_method} 
                    onValueChange={(value) => handleFilterChange('payment_method', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Type */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Customer Type</label>
                  <Select 
                    value={filters.customer_type} 
                    onValueChange={(value) => handleFilterChange('customer_type', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="fleet">Fleet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Region</label>
                  <Select 
                    value={filters.region} 
                    onValueChange={(value) => handleFilterChange('region', value)}
                  >
                    <SelectTrigger className="h-11">
                      <MapPin className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {REGIONS.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role-based filters */}
                {canViewAllData && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-600">Station</label>
                      <Select 
                        value={filters.station_id} 
                        onValueChange={(value) => handleFilterChange('station_id', value)}
                      >
                        <SelectTrigger className="h-11">
                          <MapPin className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="All Stations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stations</SelectItem>
                          {stations.map(station => (
                            <SelectItem key={station.id} value={station.id}>
                              {station.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-4">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  page: 1,
                  limit: 20,
                  search: "",
                  status: "all",
                  product_category: "all",
                  payment_method: "all",
                  customer_type: "all",
                  station_id: "all",
                  omc_id: "all",
                  dealer_id: "all",
                  region: "all",
                  date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  date_to: new Date().toISOString().split('T')[0]
                });
                setShowFilters(false);
              }}
              className="flex-1 h-12 touch-manipulation"
            >
              Reset
            </Button>
            <Button
              onClick={() => setShowFilters(false)}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white touch-manipulation"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Create Sale Bottom Sheet */}
      <BottomSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        title="Record New Sale"
      >
        <form onSubmit={handleCreateSale} className="space-y-4 pb-8">
          {(userRole === 'admin' || userRole === 'omc' || userRole === 'dealer') && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Station *</label>
              <Select 
                value={newSale.station_id} 
                onValueChange={(value) => setNewSale({ ...newSale, station_id: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name} ({station.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Product *</label>
            <Select 
              value={newSale.product_id} 
              onValueChange={(value) => {
                const product = products.find(p => p.id === value);
                setNewSale({ 
                  ...newSale, 
                  product_id: value,
                  unit_price: product?.current_price || 0
                });
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.current_price)}/L
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Quantity (L) *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={newSale.quantity || ''}
                onChange={(e) => setNewSale({ ...newSale, quantity: parseFloat(e.target.value) || 0 })}
                required
                placeholder="0.00"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Unit Price (₵) *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newSale.unit_price || ''}
                onChange={(e) => setNewSale({ ...newSale, unit_price: parseFloat(e.target.value) || 0 })}
                required
                placeholder="0.00"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Payment Method *</label>
              <Select 
                value={newSale.payment_method} 
                onValueChange={(value: 'cash' | 'mobile_money' | 'card' | 'credit') => 
                  setNewSale({ ...newSale, payment_method: value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Customer Type *</label>
              <Select 
                value={newSale.customer_type} 
                onValueChange={(value: 'retail' | 'commercial' | 'fleet') => 
                  setNewSale({ ...newSale, customer_type: value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="fleet">Fleet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Total Amount</label>
            <Input
              value={formatCurrency(newSaleTotal)}
              disabled
              className="h-11 bg-gray-50 font-semibold text-green-600 text-base"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <Input
              value={newSale.notes}
              onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
              placeholder="Additional notes (optional)"
              className="h-11"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white touch-manipulation active:scale-95"
            disabled={creating || !newSale.station_id || !newSale.product_id || newSale.quantity <= 0 || newSale.unit_price <= 0}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Sale"
            )}
          </Button>
        </form>
      </BottomSheet>

      {/* Edit Sale Bottom Sheet */}
      {canEditSale && (
        <BottomSheet
          open={showEditSheet}
          onOpenChange={setShowEditSheet}
          title="Edit Sale"
        >
          {selectedSale && (
            <form onSubmit={handleUpdateSale} className="space-y-4 pb-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Quantity (L) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editSale.quantity || ''}
                    onChange={(e) => setEditSale({ ...editSale, quantity: parseFloat(e.target.value) || 0 })}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Unit Price (₵) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editSale.unit_price || ''}
                    onChange={(e) => setEditSale({ ...editSale, unit_price: parseFloat(e.target.value) || 0 })}
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Payment Method *</label>
                  <Select 
                    value={editSale.payment_method} 
                    onValueChange={(value: 'cash' | 'mobile_money' | 'card' | 'credit') => 
                      setEditSale({ ...editSale, payment_method: value })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Customer Type *</label>
                  <Select 
                    value={editSale.customer_type} 
                    onValueChange={(value: 'retail' | 'commercial' | 'fleet') => 
                      setEditSale({ ...editSale, customer_type: value })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="fleet">Fleet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select 
                  value={editSale.status} 
                  onValueChange={(value: 'completed' | 'pending' | 'cancelled' | 'refunded') => 
                    setEditSale({ ...editSale, status: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Total Amount</label>
                <Input
                  value={formatCurrency(editSaleTotal)}
                  disabled
                  className="h-11 bg-gray-50 font-semibold text-green-600 text-base"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <Input
                  value={editSale.notes}
                  onChange={(e) => setEditSale({ ...editSale, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="h-11"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white touch-manipulation active:scale-95"
                disabled={updating || editSale.quantity <= 0 || editSale.unit_price <= 0}
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Sale"
                )}
              </Button>
            </form>
          )}
        </BottomSheet>
      )}

      {/* Sale Details Bottom Sheet */}
      <BottomSheet
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
        title="Sale Details"
        size="lg"
      >
        {selectedSale && (
          <div className="space-y-6 pb-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Transaction Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono font-medium text-base">{selectedSale.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-medium text-base">
                      {formatDateTime(selectedSale.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={STATUS_CONFIG[selectedSale.status].variant}>
                      {React.createElement(STATUS_CONFIG[selectedSale.status].icon, { className: "w-3 h-3 mr-1" })}
                      {selectedSale.status.charAt(0).toUpperCase() + selectedSale.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Sale Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Product:</span>
                    <Badge variant="outline" className={PRODUCT_CATEGORIES.find(c => c.value === selectedSale.product_category)?.color}>
                      {selectedSale.product_name}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium text-base">{formatVolume(selectedSale.quantity)} Liters</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="font-medium text-base">{formatCurrency(selectedSale.unit_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-semibold text-green-600 text-lg">
                      {formatCurrency(selectedSale.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Customer & Payment</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Method:</span>
                    <Badge variant={PAYMENT_METHODS[selectedSale.payment_method].variant}>
                      {PAYMENT_METHODS[selectedSale.payment_method].label}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Customer Type:</span>
                    <Badge variant={CUSTOMER_TYPES[selectedSale.customer_type].variant}>
                      {CUSTOMER_TYPES[selectedSale.customer_type].label}
                    </Badge>
                  </div>
                  {selectedSale.attendant_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attendant:</span>
                      <span className="font-medium text-base">{selectedSale.attendant_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedSale.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-base">
                  {selectedSale.notes}
                </p>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              {canEditSale && (
                <Button
                  onClick={() => {
                    setShowDetailsSheet(false);
                    setTimeout(() => {
                      resetEditSaleForm(selectedSale);
                      setShowEditSheet(true);
                    }, 300);
                  }}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white touch-manipulation active:scale-95"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Sale
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowDetailsSheet(false)}
                className="flex-1 h-12 touch-manipulation active:scale-95"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Delete Confirmation Dialog */}
      {canDeleteSale && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Sale</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the sale record <strong>{selectedSale?.transaction_id}</strong>. 
                This action cannot be undone and will affect financial reports.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteSale}
                className="bg-red-600 hover:bg-red-700 text-white h-11"
                disabled={deleting === selectedSale?.id}
              >
                {deleting === selectedSale?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Sale"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default MobileSalesManagement;