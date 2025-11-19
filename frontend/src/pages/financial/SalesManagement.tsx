import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
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
import { ScrollArea } from "../../components/ui/scroll-area";
import { Separator } from "../../components/ui/separator";
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
  Gauge,
  Calculator,
  Shield,
  Store,
  EyeIcon
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../utils/supabase-client";
import { useAuth } from "../../contexts/AuthContext";
import { usePrices } from "../../contexts/PriceContext";

// Types
interface Sale {
  id: string;
  station_id: string;
  pump_id: string;
  pump_number: number;
  product_id: string;
  opening_meter: number;
  closing_meter: number;
  litres_sold: number;
  unit_price: number;
  total_amount: number;
  cash_received: number;
  variance: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  customer_type: 'retail' | 'commercial' | 'fleet';
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  transaction_time: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  notes?: string;
  is_void: boolean;
  
  // Joined fields
  station_name?: string;
  station_code?: string;
  product_name?: string;
  product_category?: string;
  pump_name?: string;
  attendant_name?: string;
  region?: string;
  city?: string;
}

interface Pump {
  id: string;
  station_id: string;
  name: string;
  number: string;
  fuel_type: string;
  status: 'active' | 'inactive' | 'maintenance';
  current_meter_reading: number;
  total_dispensed: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_price?: number;
}

interface Station {
  id: string;
  name: string;
  code: string;
  region: string;
  city: string;
  status: 'active' | 'inactive';
  omc_id?: string;
  dealer_id?: string;
  manager_id?: string;
}

interface SalesFilters {
  search?: string;
  status?: string;
  product_category?: string;
  payment_method?: string;
  customer_type?: string;
  pump_id?: string;
  date_from?: string;
  date_to?: string;
  station_id?: string;
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
  top_pump: string;
}

// Constants
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

const USER_ROLES = {
  admin: 'admin',
  dealer: 'dealer', 
  station_manager: 'station_manager',
  omc: 'omc',
  attendant: 'attendant'
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
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleTimeString('en-GH', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Safe status badge function
const getStatusBadge = (status: string | undefined) => {
  if (!status) return STATUS_CONFIG.completed;
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.completed;
};

// Custom hooks
const useStationsData = (userRole: string, userId?: string) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('stations').select('*');

      // Role-based station filtering
      if (userRole === USER_ROLES.dealer) {
        query = query.eq('dealer_id', userId);
      } else if (userRole === USER_ROLES.station_manager) {
        query = query.eq('manager_id', userId);
      } else if (userRole === USER_ROLES.omc) {
        query = query.eq('omc_id', userId);
      }
      // Admin can see all stations

      const { data, error } = await query;
      if (error) throw error;

      setStations(data || []);
    } catch (error: any) {
      console.error('Failed to load stations:', error);
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  }, [userRole, userId]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  return { stations, loading, refetch: loadStations };
};

const useSalesData = (filters: SalesFilters, userStationId?: string, userRole?: string) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    // For non-admin users without station access, don't load data
    if (!userStationId && userRole !== USER_ROLES.admin) {
      console.log('No station access for user role:', userRole);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading sales data for station:', userStationId, 'role:', userRole);
      
      // Build sales query based on user role and filters
      let salesQuery = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply station filter for non-admin users
      if (userRole !== USER_ROLES.admin && userStationId) {
        salesQuery = salesQuery.eq('station_id', userStationId);
      } else if (userRole === USER_ROLES.admin && filters.station_id && filters.station_id !== 'all') {
        salesQuery = salesQuery.eq('station_id', filters.station_id);
      }

      // Apply basic filters to sales query
      if (filters.status && filters.status !== 'all') {
        salesQuery = salesQuery.eq('status', filters.status);
      }
      if (filters.date_from) {
        salesQuery = salesQuery.gte('transaction_time', `${filters.date_from}T00:00:00`);
      }
      if (filters.date_to) {
        salesQuery = salesQuery.lte('transaction_time', `${filters.date_to}T23:59:59`);
      }

      const salesResponse = await salesQuery;
      if (salesResponse.error) {
        console.error('Sales query error:', salesResponse.error);
        throw salesResponse.error;
      }

      console.log('Sales data loaded:', salesResponse.data?.length || 0, 'records');

      // Determine which stations to load data for
      const stationIds = userRole === USER_ROLES.admin 
        ? (filters.station_id && filters.station_id !== 'all' ? [filters.station_id] : [])
        : (userStationId ? [userStationId] : []);

      // Load related data
      const [pumpsResponse, productsResponse, stationsResponse] = await Promise.all([
        stationIds.length > 0 
          ? supabase
              .from('pumps')
              .select('*')
              .in('station_id', stationIds)
              .eq('status', 'active')
              .order('number')
          : { data: [], error: null },
        supabase
          .from('products')
          .select('*')
          .order('name'),
        stationIds.length > 0
          ? supabase
              .from('stations')
              .select('*')
              .in('id', stationIds)
          : { data: [], error: null }
      ]);

      if (pumpsResponse.error) {
        console.error('Pumps query error:', pumpsResponse.error);
        throw pumpsResponse.error;
      }
      if (productsResponse.error) {
        console.error('Products query error:', productsResponse.error);
        throw productsResponse.error;
      }

      console.log('Related data loaded:', {
        pumps: pumpsResponse.data?.length || 0,
        products: productsResponse.data?.length || 0,
        stations: stationsResponse.data?.length || 0
      });

      // Process and filter sales data with safe fallbacks
      let processedSales: Sale[] = (salesResponse.data || []).map(sale => {
        const pump = pumpsResponse.data?.find(p => p.id === sale.pump_id);
        const product = productsResponse.data?.find(p => p.id === sale.product_id);
        const station = stationsResponse.data?.find(s => s.id === sale.station_id);
        
        // Validate and provide fallbacks for all fields
        return {
          ...sale,
          id: sale.id || 'unknown-id',
          station_id: sale.station_id || userStationId || '',
          pump_id: sale.pump_id || '',
          pump_number: sale.pump_number || 0,
          product_id: sale.product_id || '',
          opening_meter: sale.opening_meter || 0,
          closing_meter: sale.closing_meter || 0,
          litres_sold: sale.litres_sold || 0,
          unit_price: sale.unit_price || 0,
          total_amount: sale.total_amount || 0,
          cash_received: sale.cash_received || 0,
          variance: sale.variance || 0,
          payment_method: sale.payment_method || 'cash',
          customer_type: sale.customer_type || 'retail',
          status: sale.status || 'completed',
          transaction_time: sale.transaction_time || sale.created_at || new Date().toISOString(),
          created_at: sale.created_at || new Date().toISOString(),
          updated_at: sale.updated_at || new Date().toISOString(),
          created_by: sale.created_by || 'unknown',
          is_void: sale.is_void || false,
          
          // Joined fields with fallbacks
          station_name: station?.name || 'Unknown Station',
          station_code: station?.code || 'N/A',
          product_name: product?.name || 'Unknown Product',
          product_category: product?.category || 'N/A',
          pump_name: pump?.name || `Pump ${sale.pump_number}`,
          region: station?.region || 'N/A',
          city: station?.city || 'N/A'
        };
      });

      // Apply additional filters after processing
      if (filters.payment_method && filters.payment_method !== 'all') {
        processedSales = processedSales.filter(sale => sale.payment_method === filters.payment_method);
      }
      if (filters.customer_type && filters.customer_type !== 'all') {
        processedSales = processedSales.filter(sale => sale.customer_type === filters.customer_type);
      }
      if (filters.pump_id && filters.pump_id !== 'all') {
        processedSales = processedSales.filter(sale => sale.pump_id === filters.pump_id);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        processedSales = processedSales.filter(sale => 
          sale.pump_number.toString().includes(searchLower) ||
          sale.product_name?.toLowerCase().includes(searchLower) ||
          sale.notes?.toLowerCase().includes(searchLower) ||
          sale.pump_name?.toLowerCase().includes(searchLower) ||
          sale.station_name?.toLowerCase().includes(searchLower)
        );
      }

      setSales(processedSales);
      setPumps(pumpsResponse.data || []);
      setProducts(productsResponse.data || []);

      // Calculate summary with safe defaults
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const todaySales = processedSales
        .filter(sale => sale.transaction_time?.startsWith(today))
        .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      
      const yesterdaySales = processedSales
        .filter(sale => sale.transaction_time?.startsWith(yesterday))
        .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

      const totalSales = processedSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const totalVolume = processedSales.reduce((sum, sale) => sum + (sale.litres_sold || 0), 0);
      const totalTransactions = processedSales.length;
      const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
      
      // Find top product and pump with safe defaults
      const productSales = processedSales.reduce((acc: {[key: string]: number}, sale) => {
        const productName = sale.product_name || 'Unknown Product';
        acc[productName] = (acc[productName] || 0) + (sale.total_amount || 0);
        return acc;
      }, {});
      
      const pumpSales = processedSales.reduce((acc: {[key: string]: number}, sale) => {
        const pumpName = sale.pump_name || `Pump ${sale.pump_number}`;
        acc[pumpName] = (acc[pumpName] || 0) + (sale.total_amount || 0);
        return acc;
      }, {});

      const topProduct = Object.keys(productSales).length > 0 
        ? Object.keys(productSales).reduce((a, b) => productSales[a] > productSales[b] ? a : b, Object.keys(productSales)[0])
        : 'No Data';
        
      const topPump = Object.keys(pumpSales).length > 0
        ? Object.keys(pumpSales).reduce((a, b) => pumpSales[a] > pumpSales[b] ? a : b, Object.keys(pumpSales)[0])
        : 'No Data';
        
      const growthPercentage = yesterdaySales > 0 
        ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
        : (todaySales > 0 ? 100 : 0);

      setSummary({
        total_sales: totalSales,
        total_volume: totalVolume,
        total_transactions: totalTransactions,
        average_ticket: averageTicket,
        today_sales: todaySales,
        yesterday_sales: yesterdaySales,
        growth_percentage: growthPercentage,
        top_product: topProduct,
        top_pump: topPump
      });

      console.log('Data loading completed successfully');

    } catch (err: any) {
      console.error("Failed to load sales data:", err);
      setError(err.message || "Unknown error occurred");
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  }, [filters, userStationId, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { 
    sales, 
    summary, 
    pumps, 
    products, 
    loading, 
    error, 
    refetch: loadData 
  };
};

// Main Component
export function SalesManagement() {
  const { user } = useAuth();
  const { getStationPrice } = usePrices();
  
  const userRole = user?.role || 'attendant';
  const userStationId = user?.station_id;
  const userId = user?.id;

  // Get stations based on user role
  const { stations, loading: stationsLoading } = useStationsData(userRole, userId);

  // Filters state
  const [filters, setFilters] = useState<SalesFilters>({
    search: "",
    status: "all",
    payment_method: "all",
    customer_type: "all",
    pump_id: "all",
    station_id: userRole === USER_ROLES.admin ? "all" : userStationId,
    date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0]
  });

  // Operation states
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Selected items
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedPump, setSelectedPump] = useState<Pump | null>(null);

  // Form states
  const [salesForm, setSalesForm] = useState({
    pump_id: '',
    product_id: '',
    opening_meter: '',
    closing_meter: '',
    unit_price: '',
    payment_method: 'cash' as 'cash' | 'mobile_money' | 'card' | 'credit',
    customer_type: 'retail' as 'retail' | 'commercial' | 'fleet',
    cash_received: '',
    notes: '',
    calculated_amount: '0.00'
  });

  const [editSale, setEditSale] = useState({
    opening_meter: 0,
    closing_meter: 0,
    unit_price: 0,
    payment_method: 'cash' as 'cash' | 'mobile_money' | 'card' | 'credit',
    customer_type: 'retail' as 'retail' | 'commercial' | 'fleet',
    cash_received: 0,
    status: 'completed' as 'completed' | 'pending' | 'cancelled' | 'refunded',
    notes: ""
  });

  // Use ref to track previous form state
  const prevFormRef = useRef(salesForm);

  // Determine current station ID for data loading
  const currentStationId = userRole === USER_ROLES.admin 
    ? (filters.station_id && filters.station_id !== 'all' ? filters.station_id : undefined)
    : userStationId;

  // Load data
  const { 
    sales, 
    summary, 
    pumps, 
    products, 
    loading, 
    error,
    refetch 
  } = useSalesData(filters, currentStationId, userRole);

  // Calculate sales amount automatically - FIXED VERSION
  const calculateSalesAmount = useCallback((openingMeter: string, closingMeter: string, productId: string) => {
    if (!openingMeter || !closingMeter) {
      setSalesForm(currentForm => ({ ...currentForm, calculated_amount: '0.00' }));
      return;
    }

    const opening = parseFloat(openingMeter);
    const closing = parseFloat(closingMeter);
    
    if (isNaN(opening) || isNaN(closing)) {
      setSalesForm(currentForm => ({ ...currentForm, calculated_amount: '0.00' }));
      return;
    }
    
    if (closing < opening) {
      toast.error('Closing meter cannot be less than opening meter');
      setSalesForm(currentForm => ({ ...currentForm, calculated_amount: '0.00' }));
      return;
    }

    const volume = closing - opening;
    const price = getStationPrice(currentStationId || '', productId) || parseFloat(salesForm.unit_price) || 0;
    const calculatedAmount = volume * price;
    
    setSalesForm(currentForm => ({
      ...currentForm,
      calculated_amount: calculatedAmount.toFixed(2),
      cash_received: calculatedAmount.toFixed(2)
    }));
  }, [currentStationId, getStationPrice, salesForm.unit_price]);

  // Update sales form when pump selection changes
  useEffect(() => {
    if (selectedPump) {
      const matchingProduct = products.find(p => 
        p.name.toLowerCase() === selectedPump.fuel_type?.toLowerCase()
      );
      
      const currentPrice = getStationPrice(currentStationId || '', matchingProduct?.id || '') || 0;
      
      setSalesForm(currentForm => ({
        ...currentForm,
        pump_id: selectedPump.id,
        product_id: matchingProduct?.id || '',
        opening_meter: selectedPump.current_meter_reading?.toString() || '0',
        unit_price: currentPrice.toString()
      }));
      
      // Recalculate amount if closing meter is set
      if (salesForm.closing_meter) {
        calculateSalesAmount(
          selectedPump.current_meter_reading?.toString() || '0', 
          salesForm.closing_meter, 
          matchingProduct?.id || ''
        );
      }
    }
  }, [selectedPump, currentStationId, getStationPrice, products, calculateSalesAmount, salesForm.closing_meter]);

  // Auto-set default pump and product
  useEffect(() => {
    if (pumps.length > 0 && !selectedPump) {
      setSelectedPump(pumps[0]);
    }
    if (products.length > 0 && !salesForm.product_id) {
      setSalesForm(currentForm => ({ ...currentForm, product_id: products[0].id }));
    }
  }, [pumps, products, selectedPump, salesForm.product_id]);

  // Check if user can create sales
  const canCreateSales = [USER_ROLES.admin, USER_ROLES.station_manager, USER_ROLES.attendant].includes(userRole);
  const canEditSales = [USER_ROLES.admin, USER_ROLES.station_manager].includes(userRole);
  const canViewAllStations = userRole === USER_ROLES.admin;

  // Handlers
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStationId || !salesForm.pump_id) {
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

    setCreating(true);
    
    const selectedPumpObj = pumps.find(p => p.id === salesForm.pump_id);
    const pumpNumber = selectedPumpObj ? parseInt(selectedPumpObj.number) : 1;
    const volume = closing - opening;
    const price = parseFloat(salesForm.unit_price) || 0;
    const totalAmount = volume * price;
    const cashReceived = parseFloat(salesForm.cash_received) || totalAmount;

    const salesData = {
      station_id: currentStationId,
      pump_id: salesForm.pump_id,
      pump_number: pumpNumber,
      product_id: salesForm.product_id,
      opening_meter: opening,
      closing_meter: closing,
      litres_sold: volume,
      unit_price: price,
      total_amount: totalAmount,
      cash_received: cashReceived,
      variance: cashReceived - totalAmount,
      payment_method: salesForm.payment_method,
      customer_type: salesForm.customer_type,
      created_by: user?.id,
      transaction_time: new Date().toISOString(),
      status: 'completed' as const,
      notes: salesForm.notes || null,
      is_void: false
    };

    try {
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

      toast.success(`Sale recorded successfully! ${volume.toFixed(2)}L = ${formatCurrency(totalAmount)}`);
      
      setShowCreateDialog(false);
      resetSalesForm();
      await refetch();
    } catch (error: any) {
      console.error('❌ Failed to record sales:', error);
      toast.error(`Failed to record sale: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    setUpdating(true);
    try {
      const volume = editSale.closing_meter - editSale.opening_meter;
      const totalAmount = volume * editSale.unit_price;
      const variance = editSale.cash_received - totalAmount;

      const { error } = await supabase
        .from('sales')
        .update({
          opening_meter: editSale.opening_meter,
          closing_meter: editSale.closing_meter,
          litres_sold: volume,
          unit_price: editSale.unit_price,
          total_amount: totalAmount,
          cash_received: editSale.cash_received,
          variance: variance,
          payment_method: editSale.payment_method,
          customer_type: editSale.customer_type,
          status: editSale.status,
          notes: editSale.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSale.id);

      if (error) throw error;

      toast.success("Sale updated successfully");
      
      await refetch();
      setShowEditDialog(false);
      setSelectedSale(null);
    } catch (error: any) {
      toast.error(`Failed to update sale: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!selectedSale) return;

    setDeleting(selectedSale.id);
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSale.id);

      if (error) throw error;

      toast.success("Sale cancelled successfully");
      await refetch();
      setShowDeleteDialog(false);
      setSelectedSale(null);
    } catch (error: any) {
      toast.error(`Failed to cancel sale: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleVoidSale = async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          is_void: true,
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId);

      if (error) throw error;

      toast.success("Sale voided successfully");
      await refetch();
    } catch (error: any) {
      toast.error(`Failed to void sale: ${error.message}`);
    }
  };

  const resetSalesForm = () => {
    if (selectedPump) {
      const matchingProduct = products.find(p => 
        p.name.toLowerCase() === selectedPump.fuel_type?.toLowerCase()
      );
      
      const currentPrice = getStationPrice(currentStationId || '', matchingProduct?.id || '') || 0;
      
      setSalesForm({
        pump_id: selectedPump.id,
        product_id: matchingProduct?.id || '',
        opening_meter: selectedPump.current_meter_reading?.toString() || '0',
        closing_meter: '',
        unit_price: currentPrice.toString(),
        payment_method: 'cash',
        customer_type: 'retail',
        cash_received: '',
        notes: '',
        calculated_amount: '0.00'
      });
    } else {
      const defaultProduct = products[0];
      const currentPrice = getStationPrice(currentStationId || '', defaultProduct?.id || '') || 0;
      setSalesForm({
        pump_id: '',
        product_id: defaultProduct?.id || '',
        opening_meter: '',
        closing_meter: '',
        unit_price: currentPrice.toString(),
        payment_method: 'cash',
        customer_type: 'retail',
        cash_received: '',
        notes: '',
        calculated_amount: '0.00'
      });
    }
  };

  const resetEditSaleForm = (sale: Sale) => {
    setEditSale({
      opening_meter: sale.opening_meter || 0,
      closing_meter: sale.closing_meter || 0,
      unit_price: sale.unit_price || 0,
      payment_method: sale.payment_method || 'cash',
      customer_type: sale.customer_type || 'retail',
      cash_received: sale.cash_received || 0,
      status: sale.status || 'completed',
      notes: sale.notes || ""
    });
  };

  const handleFilterChange = (key: keyof SalesFilters, value: any) => {
    setFilters(currentFilters => ({ ...currentFilters, [key]: value }));
  };

  // Get role badge
  const getRoleBadge = () => {
    const roleConfig = {
      [USER_ROLES.admin]: { label: 'Admin', variant: 'default' as const, icon: Shield },
      [USER_ROLES.dealer]: { label: 'Dealer', variant: 'secondary' as const, icon: User },
      [USER_ROLES.station_manager]: { label: 'Station Manager', variant: 'outline' as const, icon: Store },
      [USER_ROLES.omc]: { label: 'OMC', variant: 'destructive' as const, icon: Building },
      [USER_ROLES.attendant]: { label: 'Attendant', variant: 'default' as const, icon: User }
    };

    const config = roleConfig[userRole] || roleConfig[USER_ROLES.attendant];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Loading state
  if (loading && sales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && sales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Sales Management
              </h1>
              {getRoleBadge()}
            </div>
            <p className="text-gray-600">
              {userRole === USER_ROLES.admin && "Manage sales across all stations"}
              {userRole === USER_ROLES.dealer && "View sales for your stations"}
              {userRole === USER_ROLES.station_manager && "Manage sales for your station"}
              {userRole === USER_ROLES.omc && "View sales for your OMC stations"}
              {userRole === USER_ROLES.attendant && "Record and view sales transactions"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {canCreateSales && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Record Sale
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Record New Sale</DialogTitle>
                    <DialogDescription>
                      Select pump and enter meter readings. Amount will be calculated automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] pr-4">
                    <form onSubmit={handleCreateSale} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pump Selection */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Pump Selection</h3>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Select Pump</label>
                            <Select 
                              value={selectedPump?.id || ''}
                              onValueChange={(value) => {
                                const pump = pumps.find(p => p.id === value);
                                setSelectedPump(pump || null);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a pump" />
                              </SelectTrigger>
                              <SelectContent>
                                {pumps.map((pump) => (
                                  <SelectItem key={pump.id} value={pump.id}>
                                    {pump.name} (No: {pump.number}) - {pump.fuel_type} (Current: {pump.current_meter_reading || 0}L)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                        </div>

                        {/* Product Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Product Information</h3>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Product</label>
                            <Select 
                              value={salesForm.product_id}
                              onValueChange={(value) => {
                                const selectedProduct = products.find(p => p.id === value);
                                const price = getStationPrice(currentStationId || '', value) || selectedProduct?.current_price || 0;
                                setSalesForm(currentForm => ({ 
                                  ...currentForm, 
                                  product_id: value,
                                  unit_price: price.toString()
                                }));
                                if (salesForm.opening_meter && salesForm.closing_meter) {
                                  calculateSalesAmount(salesForm.opening_meter, salesForm.closing_meter, value);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Meter Readings */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Meter Readings</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Opening Meter (L)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={salesForm.opening_meter}
                              onChange={(e) => {
                                setSalesForm(currentForm => ({ ...currentForm, opening_meter: e.target.value }));
                                if (e.target.value && salesForm.closing_meter && salesForm.product_id) {
                                  calculateSalesAmount(e.target.value, salesForm.closing_meter, salesForm.product_id);
                                }
                              }}
                              placeholder="0.00"
                              required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Current pump reading: {selectedPump?.current_meter_reading || 0}L
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Closing Meter (L)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={salesForm.closing_meter}
                              onChange={(e) => {
                                setSalesForm(currentForm => ({ ...currentForm, closing_meter: e.target.value }));
                                if (salesForm.opening_meter && e.target.value && salesForm.product_id) {
                                  calculateSalesAmount(salesForm.opening_meter, e.target.value, salesForm.product_id);
                                }
                              }}
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Amount Calculation */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Amount Calculation</h3>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="text-blue-700 font-semibold">Volume Sold</label>
                              <p className="text-lg font-bold text-blue-800">
                                {salesForm.opening_meter && salesForm.closing_meter 
                                  ? (parseFloat(salesForm.closing_meter) - parseFloat(salesForm.opening_meter)).toFixed(2) 
                                  : '0.00'} L
                              </p>
                            </div>
                            <div>
                              <label className="text-blue-700 font-semibold">Unit Price</label>
                              <p className="text-lg font-bold text-blue-800">
                                {formatCurrency(parseFloat(salesForm.unit_price) || 0)}/L
                              </p>
                            </div>
                          </div>
                          <div className="border-t border-blue-200 pt-3">
                            <label className="text-blue-700 font-semibold">Total Amount</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Calculator className="w-5 h-5 text-blue-600" />
                              <span className="text-xl font-bold text-blue-700">
                                {formatCurrency(parseFloat(salesForm.calculated_amount))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Payment Details */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Payment Method</label>
                            <Select 
                              value={salesForm.payment_method} 
                              onValueChange={(value: 'cash' | 'mobile_money' | 'card' | 'credit') => 
                                setSalesForm(currentForm => ({ ...currentForm, payment_method: value }))
                              }
                            >
                              <SelectTrigger>
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
                          <div>
                            <label className="text-sm font-medium text-gray-700">Customer Type</label>
                            <Select 
                              value={salesForm.customer_type} 
                              onValueChange={(value: 'retail' | 'commercial' | 'fleet') => 
                                setSalesForm(currentForm => ({ ...currentForm, customer_type: value }))
                              }
                            >
                              <SelectTrigger>
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

                        <div>
                          <label className="text-sm font-medium text-gray-700">Cash Received</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={salesForm.cash_received}
                            onChange={(e) => setSalesForm(currentForm => ({ ...currentForm, cash_received: e.target.value }))}
                            placeholder="0.00"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700">Notes</label>
                          <Input
                            value={salesForm.notes}
                            onChange={(e) => setSalesForm(currentForm => ({ ...currentForm, notes: e.target.value }))}
                            placeholder="Additional notes (optional)"
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        disabled={creating || !salesForm.pump_id || !salesForm.opening_meter || !salesForm.closing_meter}
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
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Sales Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Sales</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.total_sales)}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    +{summary.growth_percentage.toFixed(1)}% from yesterday
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Volume</p>
                    <p className="text-2xl font-bold text-green-900">{formatVolume(summary.total_volume)}L</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Fuel className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  {summary.total_transactions} transactions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Today's Sales</p>
                    <p className="text-2xl font-bold text-purple-900">{formatCurrency(summary.today_sales)}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-purple-700 mt-2">
                  Avg: {formatCurrency(summary.average_ticket)} per sale
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Performance</p>
                    <p className="text-2xl font-bold text-orange-900">{summary.top_product}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Target className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-sm text-orange-700 mt-2">
                  Top pump: {summary.top_pump}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Card */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by pump number, product, or station..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date From</label>
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date To</label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.pump_id} 
                  onValueChange={(value) => handleFilterChange('pump_id', value)}
                >
                  <SelectTrigger>
                    <Gauge className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Pumps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pumps</SelectItem>
                    {pumps.map(pump => (
                      <SelectItem key={pump.id} value={pump.id}>
                        {pump.name} ({pump.number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Station Filter for Admin */}
            {canViewAllStations && (
              <>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Station</label>
                    <Select 
                      value={filters.station_id} 
                      onValueChange={(value) => handleFilterChange('station_id', value)}
                    >
                      <SelectTrigger>
                        <Building className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="All Stations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stations</SelectItem>
                        {stations.map(station => (
                          <SelectItem key={station.id} value={station.id}>
                            {station.name} ({station.code}) - {station.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sales Table Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Sales Transactions</h2>
                  <p className="text-sm text-gray-600 font-normal">
                    {sales.length} transactions found
                    {canViewAllStations && filters.station_id && filters.station_id !== 'all' && 
                      ` for selected station`}
                  </p>
                </div>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  {filters.search || filters.date_from || filters.status !== 'all' 
                    ? "Try adjusting your filters to see more results." 
                    : "No sales recorded for the selected period."}
                </p>
                {canCreateSales && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Record First Sale
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      {canViewAllStations && <TableHead className="font-semibold">Station</TableHead>}
                      <TableHead className="font-semibold">Transaction</TableHead>
                      <TableHead className="font-semibold">Pump & Product</TableHead>
                      <TableHead className="font-semibold">Sale Details</TableHead>
                      <TableHead className="font-semibold">Payment & Customer</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => {
                      // Safe data extraction with fallbacks
                      const paymentMethod = PAYMENT_METHODS[sale.payment_method] || PAYMENT_METHODS.cash;
                      const customerType = CUSTOMER_TYPES[sale.customer_type] || CUSTOMER_TYPES.retail;
                      const statusConfig = getStatusBadge(sale.status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <TableRow key={sale.id} className="group hover:bg-gray-50/50 transition-colors">
                          {canViewAllStations && (
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{sale.station_name || 'Unknown Station'}</p>
                                <p className="text-xs text-gray-500">{sale.station_code || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{sale.city || 'N/A'}</p>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-mono text-sm font-medium">
                                #{sale.pump_number}-{sale.id?.slice(-6) || 'N/A'}
                              </p>
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(sale.transaction_time)}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatTime(sale.transaction_time)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium">Pump {sale.pump_number || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{sale.pump_name || 'Unknown Pump'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{sale.product_name || 'Unknown Product'}</p>
                                <p className="text-xs text-gray-500">{sale.product_category || 'N/A'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Volume:</span>
                                <span className="font-medium">{formatVolume(sale.litres_sold || 0)}L</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Unit Price:</span>
                                <span className="font-medium">{formatCurrency(sale.unit_price || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm font-semibold">
                                <span className="text-gray-700">Total:</span>
                                <span className="text-green-600">{formatCurrency(sale.total_amount || 0)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Badge variant={paymentMethod.variant}>
                                {paymentMethod.label}
                              </Badge>
                              <Badge variant={customerType.variant}>
                                {customerType.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={statusConfig.variant}
                              className="flex items-center gap-1 w-fit"
                            >
                              <StatusIcon className="w-3 h-3" />
                              {(sale.status || 'completed').charAt(0).toUpperCase() + (sale.status || 'completed').slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedSale(sale);
                                      setShowDetailsDialog(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {canEditSales && (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedSale(sale);
                                        resetEditSaleForm(sale);
                                        setShowEditDialog(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Sale
                                    </DropdownMenuItem>
                                  )}
                                  {canEditSales && sale.status === 'completed' && (
                                    <DropdownMenuItem 
                                      onClick={() => handleVoidSale(sale.id)}
                                      className="text-red-600"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Void Sale
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Sale Dialog */}
        {canEditSales && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Sale</DialogTitle>
              </DialogHeader>
              {selectedSale && (
                <ScrollArea className="max-h-[70vh] pr-4">
                  <form onSubmit={handleUpdateSale} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Opening Meter (L)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editSale.opening_meter}
                          onChange={(e) => setEditSale({ ...editSale, opening_meter: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Closing Meter (L)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editSale.closing_meter}
                          onChange={(e) => setEditSale({ ...editSale, closing_meter: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Unit Price (₵)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editSale.unit_price}
                        onChange={(e) => setEditSale({ ...editSale, unit_price: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Payment Method</label>
                        <Select 
                          value={editSale.payment_method} 
                          onValueChange={(value: 'cash' | 'mobile_money' | 'card' | 'credit') => 
                            setEditSale({ ...editSale, payment_method: value })
                          }
                        >
                          <SelectTrigger>
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
                        <label className="text-sm font-medium text-gray-700">Customer Type</label>
                        <Select 
                          value={editSale.customer_type} 
                          onValueChange={(value: 'retail' | 'commercial' | 'fleet') => 
                            setEditSale({ ...editSale, customer_type: value })
                          }
                        >
                          <SelectTrigger>
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
                      <label className="text-sm font-medium text-gray-700">Cash Received</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editSale.cash_received}
                        onChange={(e) => setEditSale({ ...editSale, cash_received: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <Select 
                        value={editSale.status} 
                        onValueChange={(value: 'completed' | 'pending' | 'cancelled' | 'refunded') => 
                          setEditSale({ ...editSale, status: value })
                        }
                      >
                        <SelectTrigger>
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
                      <label className="text-sm font-medium text-gray-700">Notes</label>
                      <Input
                        value={editSale.notes}
                        onChange={(e) => setEditSale({ ...editSale, notes: e.target.value })}
                        placeholder="Additional notes"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={updating}
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
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Sale Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Sale Details
              </DialogTitle>
            </DialogHeader>
            {selectedSale && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Transaction Information</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transaction ID:</span>
                            <span className="font-mono font-medium">#{selectedSale.pump_number}-{selectedSale.id?.slice(-6) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Date & Time:</span>
                            <span className="font-medium">
                              {formatDateTime(selectedSale.transaction_time)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge variant={getStatusBadge(selectedSale.status).variant}>
                              {React.createElement(getStatusBadge(selectedSale.status).icon, { className: "w-3 h-3 mr-1" })}
                              {(selectedSale.status || 'completed').charAt(0).toUpperCase() + (selectedSale.status || 'completed').slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Pump Information</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pump:</span>
                            <span className="font-medium">Pump {selectedSale.pump_number || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pump Name:</span>
                            <span className="font-medium">{selectedSale.pump_name || 'Unknown Pump'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Opening Meter:</span>
                            <span className="font-medium">{formatVolume(selectedSale.opening_meter || 0)}L</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Closing Meter:</span>
                            <span className="font-medium">{formatVolume(selectedSale.closing_meter || 0)}L</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Sale Details</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Product:</span>
                            <span className="font-medium">{selectedSale.product_name || 'Unknown Product'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Category:</span>
                            <span className="font-medium">{selectedSale.product_category || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Volume Sold:</span>
                            <span className="font-medium">{formatVolume(selectedSale.litres_sold || 0)} Liters</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Unit Price:</span>
                            <span className="font-medium">{formatCurrency(selectedSale.unit_price || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Amount:</span>
                            <span className="font-semibold text-green-600 text-lg">
                              {formatCurrency(selectedSale.total_amount || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Customer & Payment</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Method:</span>
                            <Badge variant={(PAYMENT_METHODS[selectedSale.payment_method] || PAYMENT_METHODS.cash).variant}>
                              {(PAYMENT_METHODS[selectedSale.payment_method] || PAYMENT_METHODS.cash).label}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Customer Type:</span>
                            <Badge variant={(CUSTOMER_TYPES[selectedSale.customer_type] || CUSTOMER_TYPES.retail).variant}>
                              {(CUSTOMER_TYPES[selectedSale.customer_type] || CUSTOMER_TYPES.retail).label}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cash Received:</span>
                            <span className="font-medium">{formatCurrency(selectedSale.cash_received || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Variance:</span>
                            <span className={`font-medium ${(selectedSale.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(selectedSale.variance || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedSale.notes && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedSale.notes}
                        </p>
                      </div>
                    </>
                  )}
                  
                  <Separator />
                  
                  <div className="flex gap-3 pt-4">
                    {canEditSales && (
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false);
                          resetEditSaleForm(selectedSale);
                          setShowEditDialog(true);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Sale
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsDialog(false)}
                      className={canEditSales ? "flex-1" : "w-full"}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default SalesManagement;