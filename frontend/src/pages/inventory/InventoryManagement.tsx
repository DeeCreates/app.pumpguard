import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { 
  Plus, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  Calendar,
  User,
  LogIn,
  Package,
  ClipboardList,
  Calculator,
  AlertCircle,
  Building,
  Shield,
  Scale,
  Database,
  Gauge
} from "lucide-react";
import { supabase } from '../../utils/supabase-client';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
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
  description?: string;
  created_at: string;
}

interface Station {
  id: string;
  name: string;
  omc_id: string;
  dealer_id?: string;
  address?: string;
  created_at: string;
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
  created_at: string;
  updated_at: string;
}

interface UserContext {
  id: string;
  role: 'admin' | 'omc' | 'station_manager' | 'dealer';
  station_id?: string;
  omc_id?: string;
  dealer_id?: string;
  name: string;
  email: string;
}

interface InventoryManagementProps {
  stationId?: string;
  compact?: boolean;
}

export default function InventoryManagement({ stationId, compact = false }: InventoryManagementProps) {
  const [dailyTankStocks, setDailyTankStocks] = useState<DailyTankStock[]>([]);
  const [currentStock, setCurrentStock] = useState<DailyTankStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [availableStations, setAvailableStations] = useState<Station[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [selectedPump, setSelectedPump] = useState<Pump | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>(stationId || 'all');
  const [dateRange, setDateRange] = useState<string>('today');
  const [showDailyStockDialog, setShowDailyStockDialog] = useState(false);
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'daily-stock' | 'reconciliation'>('overview');
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { getStationPrice, refreshPrices } = usePrices();

  const [dailyStockForm, setDailyStockForm] = useState({
    station_id: stationId || '',
    product_id: '',
    opening_stock: '',
    closing_stock: '',
    received: '',
    sales: '',
    stock_date: new Date().toISOString().split('T')[0],
    notes: '',
    pump_id: '',
    price_per_liter: ''
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

  // Safe value getter to prevent undefined errors
  const safeGet = (value: any, defaultValue: any = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    return value;
  };

  // Safe number formatter
  const safeFormatNumber = (value: any, defaultValue: any = '0') => {
    const num = parseFloat(safeGet(value, defaultValue));
    return isNaN(num) ? defaultValue : num.toLocaleString();
  };

  // Role-based access control
  const canManageAll = () => {
    return userContext?.role === 'admin';
  };

  const canManageOMCStations = () => {
    return ['admin', 'omc'].includes(userContext?.role || '');
  };

  const canManageStation = () => {
    return ['admin', 'omc', 'station_manager'].includes(userContext?.role || '');
  };

  const canViewOnly = () => {
    return userContext?.role === 'dealer';
  };

  const canCreateRecords = () => {
    return ['admin', 'omc', 'station_manager'].includes(userContext?.role || '');
  };

  const canUpdateRecords = () => {
    return ['admin', 'omc', 'station_manager'].includes(userContext?.role || '');
  };

  // Get stations based on user role
  const getManageableStations = () => {
    if (!userContext) return [];
    
    switch (userContext.role) {
      case 'admin':
        return availableStations;
      case 'omc':
        return availableStations.filter(station => station.omc_id === userContext.omc_id);
      case 'station_manager':
        return availableStations.filter(station => station.id === userContext.station_id);
      case 'dealer':
        return availableStations.filter(station => station.dealer_id === userContext.dealer_id);
      default:
        return [];
    }
  };

  // Check if user can manage a specific station
  const canManageThisStation = (stationId: string) => {
    if (!userContext) return false;
    
    const station = availableStations.find(s => s.id === stationId);
    if (!station) return false;

    switch (userContext.role) {
      case 'admin':
        return true;
      case 'omc':
        return station.omc_id === userContext.omc_id;
      case 'station_manager':
        return station.id === userContext.station_id;
      case 'dealer':
        return station.dealer_id === userContext.dealer_id;
      default:
        return false;
    }
  };

  // Get filtered current stock based on selected station
  const getFilteredCurrentStock = () => {
    if (selectedStation === 'all') {
      // For "All Stations", show only manageable stations
      const manageableStations = getManageableStations();
      const manageableStationIds = manageableStations.map(s => s.id);
      return currentStock.filter(stock => manageableStationIds.includes(stock.station_id));
    } else {
      // For specific station, show only that station
      return currentStock.filter(stock => stock.station_id === selectedStation);
    }
  };

  // Get filtered daily stocks based on selected station
  const getFilteredDailyStocks = () => {
    let filtered = dailyTankStocks;

    // Apply station filter
    if (selectedStation !== 'all') {
      filtered = filtered.filter(stock => stock.station_id === selectedStation);
    } else {
      // For "All Stations", show only manageable stations
      const manageableStations = getManageableStations();
      const manageableStationIds = manageableStations.map(s => s.id);
      filtered = filtered.filter(stock => manageableStationIds.includes(stock.station_id));
    }

    // Apply date range filter
    if (dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(stock => stock.stock_date === today);
    } else if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(stock => new Date(stock.stock_date) >= weekAgo);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(stock => 
        safeGet(stock.products?.name, '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(stock.stations?.name, '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(stock.notes, '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (authChecked && userContext) {
      loadData();
    }
  }, [selectedStation, dateRange, authChecked, userContext]);

  const checkAuthentication = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue",
          variant: "destructive"
        });
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      const userContextData = {
        id: session.user.id,
        role: profile.role,
        station_id: profile.station_id,
        omc_id: profile.omc_id,
        dealer_id: profile.dealer_id,
        name: profile.full_name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || ''
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

      if (userContextData.station_id) {
        await loadPumps(userContextData.station_id);
      }

      toast({
        title: "Welcome back!",
        description: `Logged in as ${profile.role}`,
      });
    } catch (error: any) {
      console.error('Error checking authentication:', error);
      toast({
        title: "Authentication Error",
        description: "Please log in to continue",
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
      } else if (userContext?.role === 'dealer' && userContext.dealer_id) {
        const { data, error } = await supabase
          .from('stations')
          .select('*')
          .eq('dealer_id', userContext.dealer_id)
          .order('name');
        
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
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      toast({
        title: "Error Loading Stations",
        description: "Failed to load station data",
        variant: "destructive"
      });
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
      toast({
        title: "Error Loading Products",
        description: "Failed to load product data",
        variant: "destructive"
      });
    }
  };

  const loadPumps = async (stationId: string) => {
    try {
      console.log('🔄 Loading pumps for station:', stationId);
      
      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', stationId)
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
        
        const matchingProduct = availableProducts.find(p => 
          p.name.toLowerCase() === defaultPump.fuel_type?.toLowerCase()
        );
        
        setDailyStockForm(prev => ({
          ...prev,
          pump_id: defaultPump.id,
          product_id: matchingProduct?.id || ''
        }));
      }
    } catch (error) {
      console.error('❌ Failed to load pumps:', error);
      setPumps([]);
    }
  };

  const loadCurrentStock = async () => {
    if (!userContext) return;

    try {
      const { data, error } = await supabase
        .from('daily_tank_stocks')
        .select(`
          *,
          products (*),
          stations (*)
        `)
        .order('stock_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique latest entries by station and product
      const uniqueStocks = new Map();
      data?.forEach(stock => {
        const key = `${stock.station_id}-${stock.product_id}`;
        if (!uniqueStocks.has(key)) {
          uniqueStocks.set(key, stock);
        }
      });

      const currentStocks = Array.from(uniqueStocks.values());
      setCurrentStock(currentStocks || []);

    } catch (error) {
      console.error('Error loading current stock:', error);
      setCurrentStock([]);
    }
  };

  const loadData = async () => {
    if (!userContext) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('daily_tank_stocks')
        .select(`
          *,
          products (*),
          stations (*)
        `)
        .order('stock_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (selectedStation !== 'all') {
        if (canManageThisStation(selectedStation)) {
          query = query.eq('station_id', selectedStation);
        } else {
          setDailyTankStocks([]);
          setLoading(false);
          return;
        }
      } else {
        const manageableStations = getManageableStations();
        const manageableStationIds = manageableStations.map(s => s.id);
        query = query.in('station_id', manageableStationIds);
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
      await loadCurrentStock();

    } catch (error: any) {
      console.error('Error loading inventory data:', error);
      toast({
        title: "Data Loading Error",
        description: "Failed to load inventory data. Please try again.",
        variant: "destructive"
      });
      setDailyTankStocks([]);
      setCurrentStock([]);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingEntry = async (stationId: string, productId: string, stockDate: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('daily_tank_stocks')
        .select('id')
        .eq('station_id', stationId)
        .eq('product_id', productId)
        .eq('stock_date', stockDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking existing entry:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking existing entry:', error);
      return false;
    }
  };

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
    if (!canCreateRecords()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create daily stock records",
        variant: "destructive"
      });
      return;
    }

    const validationErrors = validateDailyStockForm(dailyStockForm);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    if (!canManageThisStation(dailyStockForm.station_id)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage this station",
        variant: "destructive"
      });
      return;
    }

    const existingEntry = await checkExistingEntry(
      dailyStockForm.station_id,
      dailyStockForm.product_id,
      dailyStockForm.stock_date
    );

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
        notes: dailyStockForm.notes || `Stock entry${dailyStockForm.pump_id ? ` for pump ${pumps.find(p => p.id === dailyStockForm.pump_id)?.number}` : ''}`
      };

      let result;
      if (existingEntry) {
        const { data, error } = await supabase
          .from('daily_tank_stocks')
          .update(dailyStockData)
          .eq('station_id', dailyStockForm.station_id)
          .eq('product_id', dailyStockForm.product_id)
          .eq('stock_date', dailyStockForm.stock_date)
          .select(`
            *,
            products (*),
            stations (*)
          `)
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('daily_tank_stocks')
          .insert([dailyStockData])
          .select(`
            *,
            products (*),
            stations (*)
          `)
          .single();

        if (error) throw error;
        result = data;
      }

      setShowDailyStockDialog(false);
      resetDailyStockForm();
      
      await loadData();
      
      const productName = availableProducts.find(p => p.id === dailyStockForm.product_id)?.name || 'Product';
      
      toast({
        title: existingEntry ? "Daily Stock Updated!" : "Daily Stock Recorded!",
        description: `Stock for ${productName} ${existingEntry ? 'updated' : 'recorded'} successfully. Variance: ${variance.toFixed(2)}L`,
      });

    } catch (error: any) {
      console.error('Error creating/updating daily stock:', error);
      toast({
        title: "Unexpected Error",
        description: error.message || "Failed to record daily stock",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReconciliation = async () => {
    if (!canCreateRecords()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create reconciliations",
        variant: "destructive"
      });
      return;
    }

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

      if (!canManageThisStation(reconciliationForm.station_id)) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to manage this station",
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

      const { data, error } = await supabase
        .from('daily_tank_stocks')
        .insert([reconciliationData])
        .select()
        .single();

      if (error) throw error;
      
      setShowReconciliationDialog(false);
      setReconciliationForm({
        station_id: stationId || (availableStations.length > 0 ? availableStations[0].id : ''),
        product_id: availableProducts.length > 0 ? availableProducts[0].id : '',
        opening_stock: '',
        received: '',
        sales: '',
        closing_stock: '',
        notes: ''
      });

      await loadData();
      
      toast({
        title: "Reconciliation Saved!",
        description: "Stock reconciliation completed successfully",
      });
    } catch (error: any) {
      console.error('Error creating reconciliation:', error);
      toast({
        title: "Processing Error",
        description: error.message || "Failed to save reconciliation",
        variant: "destructive"
      });
    }
  };

  const handleReconciliationButton = () => {
    if (!canCreateRecords()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to perform reconciliation",
        variant: "destructive"
      });
      return;
    }
    setShowReconciliationDialog(true);
  };

  const exportInventoryData = async () => {
    try {
      setExporting(true);
      
      const dataToExport = getFilteredDailyStocks().map(stock => ({
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
      link.download = `inventory-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete!",
        description: "Inventory data has been exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export inventory data",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const resetDailyStockForm = () => {
    const defaultStation = stationId || (availableStations.length > 0 ? availableStations[0].id : '');
    const defaultProduct = availableProducts.length > 0 ? availableProducts[0].id : '';
    
    const currentPrice = getStationPrice(defaultStation, defaultProduct) || 0;

    setDailyStockForm({
      station_id: defaultStation,
      product_id: defaultProduct,
      opening_stock: '',
      closing_stock: '',
      received: '',
      sales: '',
      stock_date: new Date().toISOString().split('T')[0],
      notes: '',
      pump_id: selectedPump?.id || '',
      price_per_liter: currentPrice.toString()
    });
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'bg-green-100 text-green-700 border-green-200';
    if (Math.abs(variance) <= 100) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  // Calculate stock metrics based on filtered data
  const calculateStockMetrics = () => {
    const filteredDailyStocks = getFilteredDailyStocks();
    const filteredCurrentStock = getFilteredCurrentStock();
    
    const today = new Date().toISOString().split('T')[0];
    const todayStocks = filteredDailyStocks.filter(stock => stock.stock_date === today);
    
    const totalVariance = todayStocks.reduce((sum, stock) => sum + safeGet(stock.variance, 0), 0);
    const perfectMatches = todayStocks.filter(stock => safeGet(stock.variance, 0) === 0).length;
    const withVariance = todayStocks.filter(stock => safeGet(stock.variance, 0) !== 0).length;
    
    // Calculate total stock from filtered current stock
    const totalStock = filteredCurrentStock.reduce((sum, stock) => sum + safeGet(stock.closing_stock, 0), 0);

    return { 
      totalStock, 
      totalVariance, 
      perfectMatches, 
      withVariance, 
      todayStocksCount: todayStocks.length,
      filteredDailyStocksCount: filteredDailyStocks.length
    };
  };

  useEffect(() => {
    if (selectedPump && availableProducts.length > 0) {
      const matchingProduct = availableProducts.find(p => 
        p.name.toLowerCase() === selectedPump.fuel_type?.toLowerCase()
      );
      
      if (matchingProduct) {
        const currentPrice = getStationPrice(dailyStockForm.station_id, matchingProduct.id) || 0;
        
        setDailyStockForm(prev => ({
          ...prev,
          pump_id: selectedPump.id,
          product_id: matchingProduct.id,
          price_per_liter: currentPrice.toString()
        }));
      }
    }
  }, [selectedPump, availableProducts, dailyStockForm.station_id, getStationPrice]);

  useEffect(() => {
    if (dailyStockForm.product_id && dailyStockForm.station_id) {
      const currentPrice = getStationPrice(dailyStockForm.station_id, dailyStockForm.product_id) || 0;
      setDailyStockForm(prev => ({
        ...prev,
        price_per_liter: currentPrice.toString()
      }));
    }
  }, [dailyStockForm.product_id, dailyStockForm.station_id, getStationPrice]);

  useEffect(() => {
    if (dailyStockForm.station_id && dailyStockForm.station_id !== 'all') {
      loadPumps(dailyStockForm.station_id);
    }
  }, [dailyStockForm.station_id]);

  // Loading skeletons
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const TableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 flex-1" />
        </div>
      ))}
    </div>
  );

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Checking Authentication</h3>
          <p className="text-gray-600">Verifying user credentials...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!userContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LogIn className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please log in to access inventory management</p>
          <Button onClick={handleLoginRedirect} className="bg-blue-600 hover:bg-blue-700">
            <LogIn className="w-4 h-4 mr-2" />
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Inventory</h4>
          {canManageStation() && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Stock
            </Button>
          )}
        </div>

        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {getFilteredCurrentStock().slice(0, 2).map((stock) => (
              <Card key={stock.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{safeGet(stock.products?.name, 'Product')}</p>
                      <p className="text-lg font-bold">
                        {safeFormatNumber(stock.closing_stock)} {safeGet(stock.products?.unit, 'L')}
                      </p>
                      <Badge variant="outline" className={getVarianceColor(safeGet(stock.variance, 0))}>
                        Variance: {safeGet(stock.variance, 0) >= 0 ? '+' : ''}{safeGet(stock.variance, 0).toFixed(2)}
                      </Badge>
                    </div>
                    <Database className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { totalStock, totalVariance, perfectMatches, withVariance, todayStocksCount, filteredDailyStocksCount } = calculateStockMetrics();
  const filteredDailyStocks = getFilteredDailyStocks();
  const filteredCurrentStock = getFilteredCurrentStock();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {userContext?.role}
            </Badge>
          </div>
          <p className="text-gray-600">Track fuel stock and daily reconciliation</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Building className="w-4 h-4" />
            <span>Station: {selectedStation === 'all' ? 'All Stations' : availableStations.find(s => s.id === selectedStation)?.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={exportInventoryData}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            Export
          </Button>
          
          {canCreateRecords() && (
            <div className="flex gap-2">
              <Dialog open={showDailyStockDialog} onOpenChange={setShowDailyStockDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Daily Stock
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Record Daily Stock
                    </DialogTitle>
                    <DialogDescription>
                      Record opening and closing stock. Multiple entries allowed for same day.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Station *</Label>
                        <Select
                          value={dailyStockForm.station_id}
                          onValueChange={(value) => {
                            setDailyStockForm({ ...dailyStockForm, station_id: value });
                            loadPumps(value);
                            if (dailyStockForm.product_id) {
                              const currentPrice = getStationPrice(value, dailyStockForm.product_id) || 0;
                              setDailyStockForm(prev => ({
                                ...prev,
                                price_per_liter: currentPrice.toString()
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select station" />
                          </SelectTrigger>
                          <SelectContent>
                            {getManageableStations().map(station => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Pump (Optional)</Label>
                        <Select
                          value={dailyStockForm.pump_id}
                          onValueChange={(value) => {
                            const pump = pumps.find(p => p.id === value);
                            setSelectedPump(pump || null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select pump" />
                          </SelectTrigger>
                          <SelectContent>
                            {pumps.length > 0 ? (
                              pumps.map((pump) => (
                                <SelectItem key={pump.id} value={pump.id}>
                                  {pump.name} (No: {pump.number}) - {pump.fuel_type}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-pumps" disabled>
                                No pumps available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {selectedPump && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-blue-800">Selected Pump: {selectedPump.name}</p>
                            <p className="text-sm text-blue-600">Pump Number: {selectedPump.number}</p>
                            <p className="text-sm text-blue-600">Fuel Type: {selectedPump.fuel_type}</p>
                            <p className="text-sm text-blue-600">Current Meter: {safeGet(selectedPump.current_meter_reading, 0)}L</p>
                          </div>
                          <Gauge className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Product *</Label>
                        <Select
                          value={dailyStockForm.product_id}
                          onValueChange={(value) => {
                            const price = getStationPrice(dailyStockForm.station_id, value) || 0;
                            setDailyStockForm({ 
                              ...dailyStockForm, 
                              product_id: value,
                              price_per_liter: price.toString()
                            });
                          }}
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
                        <Label>Current Price (₵/L)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dailyStockForm.price_per_liter}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, price_per_liter: e.target.value })}
                          placeholder="0.00"
                          className="bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">Current pump price for reference</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Stock Date *</Label>
                        <Input
                          type="date"
                          value={dailyStockForm.stock_date}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, stock_date: e.target.value })}
                        />
                      </div>
                      <div className="flex items-end">
                        <Badge variant="outline" className="w-full justify-center">
                          {new Date(dailyStockForm.stock_date).toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Opening Stock *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dailyStockForm.opening_stock}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, opening_stock: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Received</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dailyStockForm.received}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, received: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sales</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dailyStockForm.sales}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, sales: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Closing Stock *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dailyStockForm.closing_stock}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, closing_stock: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {dailyStockForm.opening_stock && dailyStockForm.closing_stock && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-800">Expected Closing Stock:</p>
                            <p className="text-lg font-bold text-blue-900">
                              {(
                                parseFloat(safeGet(dailyStockForm.opening_stock, '0')) + 
                                parseFloat(safeGet(dailyStockForm.received, '0')) - 
                                parseFloat(safeGet(dailyStockForm.sales, '0'))
                              ).toFixed(2)} {availableProducts.find(p => p.id === dailyStockForm.product_id)?.unit || 'L'}
                            </p>
                            <p className="text-sm text-blue-700">
                              Variance: {(
                                parseFloat(safeGet(dailyStockForm.closing_stock, '0')) - 
                                (parseFloat(safeGet(dailyStockForm.opening_stock, '0')) + 
                                 parseFloat(safeGet(dailyStockForm.received, '0')) - 
                                 parseFloat(safeGet(dailyStockForm.sales, '0')))
                              ).toFixed(2)} {availableProducts.find(p => p.id === dailyStockForm.product_id)?.unit || 'L'}
                            </p>
                          </div>
                          <Calculator className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div>
                      <Label>Notes</Label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        value={dailyStockForm.notes}
                        onChange={(e) => setDailyStockForm({ ...dailyStockForm, notes: e.target.value })}
                        placeholder="Additional notes about today's stock..."
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={handleCreateDailyStock}
                        disabled={submitting}
                        className="w-full bg-green-600 hover:bg-green-700 flex items-center gap-2"
                      >
                        {submitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {submitting ? 'Saving...' : 'Save Daily Stock'}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showReconciliationDialog} onOpenChange={setShowReconciliationDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Scale className="w-4 h-4" />
                    Reconciliation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      Stock Reconciliation
                    </DialogTitle>
                    <DialogDescription>
                      Perform daily stock reconciliation to identify variances.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Station *</Label>
                        <Select
                          value={reconciliationForm.station_id}
                          onValueChange={(value) => setReconciliationForm({ ...reconciliationForm, station_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select station" />
                          </SelectTrigger>
                          <SelectContent>
                            {getManageableStations().map(station => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Product *</Label>
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
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Opening Stock *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={reconciliationForm.opening_stock}
                          onChange={(e) => setReconciliationForm({ ...reconciliationForm, opening_stock: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Received</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={reconciliationForm.received}
                          onChange={(e) => setReconciliationForm({ ...reconciliationForm, received: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sales</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={reconciliationForm.sales}
                          onChange={(e) => setReconciliationForm({ ...reconciliationForm, sales: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Closing Stock *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={reconciliationForm.closing_stock}
                          onChange={(e) => setReconciliationForm({ ...reconciliationForm, closing_stock: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {reconciliationForm.opening_stock && reconciliationForm.closing_stock && (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-800">Reconciliation Result:</p>
                            <p className="text-lg font-bold text-purple-900">
                              Variance: {(
                                parseFloat(safeGet(reconciliationForm.closing_stock, '0')) - 
                                (parseFloat(safeGet(reconciliationForm.opening_stock, '0')) + 
                                 parseFloat(safeGet(reconciliationForm.received, '0')) - 
                                 parseFloat(safeGet(reconciliationForm.sales, '0')))
                              ).toFixed(2)} {availableProducts.find(p => p.id === reconciliationForm.product_id)?.unit || 'L'}
                            </p>
                            <p className="text-sm text-purple-700">
                              Expected: {(
                                parseFloat(safeGet(reconciliationForm.opening_stock, '0')) + 
                                parseFloat(safeGet(reconciliationForm.received, '0')) - 
                                parseFloat(safeGet(reconciliationForm.sales, '0'))
                              ).toFixed(2)} {availableProducts.find(p => p.id === reconciliationForm.product_id)?.unit || 'L'}
                            </p>
                          </div>
                          <Calculator className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div>
                      <Label>Notes</Label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        value={reconciliationForm.notes}
                        onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
                        placeholder="Notes about the reconciliation..."
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={handleCreateReconciliation}
                        disabled={submitting}
                        className="w-full bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                      >
                        {submitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {submitting ? 'Saving...' : 'Save Reconciliation'}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <nav className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
            {[
              { id: 'overview', label: 'Stock Overview', icon: BarChart3 },
              { id: 'daily-stock', label: 'Daily Stock', icon: ClipboardList },
              { id: 'reconciliation', label: 'Reconciliation', icon: Calculator }
            ].map((tab, index) => (
              <React.Fragment key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
                {index < 2 && (
                  <div className="flex items-center">
                    <Separator orientation="vertical" className="h-6" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Filters */}
      {(userContext?.role === 'admin' || userContext?.role === 'omc' || userContext?.role === 'dealer') && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label>Filter by Station</Label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stations</SelectItem>
                    {getManageableStations().map(station => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator orientation="vertical" className="hidden md:block" />
              <div>
                <Label>Date Range</Label>
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

              <Separator orientation="vertical" className="hidden md:block" />
              <div className="flex-1">
                <Label>Search Records</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search products, stations, notes..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Separator orientation="vertical" className="hidden md:block" />
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedStation(stationId || 'all');
                    setSearchTerm('');
                    setDateRange('today');
                  }}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Summary Cards */}
            {loading ? (
              <StatsSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Current Stock</p>
                        <p className="text-2xl font-bold">{safeFormatNumber(totalStock)} L</p>
                        <p className="text-sm text-green-600">
                          {selectedStation === 'all' 
                            ? `Across ${getManageableStations().length} stations` 
                            : `At ${availableStations.find(s => s.id === selectedStation)?.name}`
                          }
                        </p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Today's Records</p>
                        <p className="text-2xl font-bold">{todayStocksCount}</p>
                        <p className="text-sm text-blue-600">Products recorded</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Perfect Matches</p>
                        <p className="text-2xl font-bold">{perfectMatches}</p>
                        <p className="text-sm text-green-600">Zero variance</p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">With Variance</p>
                        <p className="text-2xl font-bold">{withVariance}</p>
                        <p className="text-sm text-orange-600">Needs review</p>
                      </div>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            {/* Current Stock Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Current Stock Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton />
                ) : filteredCurrentStock.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCurrentStock
                      .slice(0, 6)
                      .map((stock) => (
                        <Card key={`${stock.station_id}-${stock.product_id}`} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-600">{safeGet(stock.products?.name, 'Product')}</p>
                                <p className="text-2xl font-bold">
                                  {safeFormatNumber(stock.closing_stock)} {safeGet(stock.products?.unit, 'L')}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className={getVarianceColor(safeGet(stock.variance, 0))}>
                                    Variance: {safeGet(stock.variance, 0) >= 0 ? '+' : ''}{safeGet(stock.variance, 0).toFixed(2)}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {safeGet(stock.stations?.name, 'Station')}
                                  </span>
                                </div>
                              </div>
                              <div className={`p-3 rounded-lg ${
                                safeGet(stock.variance, 0) === 0 ? 'bg-green-100' :
                                Math.abs(safeGet(stock.variance, 0)) <= 100 ? 'bg-yellow-100' : 'bg-red-100'
                              }`}>
                                <Database className={`w-6 h-6 ${
                                  safeGet(stock.variance, 0) === 0 ? 'text-green-600' :
                                  Math.abs(safeGet(stock.variance, 0)) <= 100 ? 'text-yellow-600' : 'text-red-600'
                                }`} />
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex justify-between">
                                <span>Opening:</span>
                                <span>{safeFormatNumber(stock.opening_stock)} {safeGet(stock.products?.unit, 'L')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Received:</span>
                                <span>{safeFormatNumber(stock.received)} {safeGet(stock.products?.unit, 'L')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Sales:</span>
                                <span>{safeFormatNumber(stock.sales)} {safeGet(stock.products?.unit, 'L')}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Closing:</span>
                                <span className="text-blue-600">{safeFormatNumber(stock.closing_stock)} {safeGet(stock.products?.unit, 'L')}</span>
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-2">
                              Last updated: {new Date(safeGet(stock.stock_date, new Date().toISOString())).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Stock Data</h3>
                    <p className="text-gray-500">No daily tank stock data available for the selected filters.</p>
                    {canCreateRecords() && (
                      <Button 
                        onClick={() => setShowDailyStockDialog(true)} 
                        className="mt-4 bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Record First Stock
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Daily Stock Tab */}
        {activeTab === 'daily-stock' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Today's Records</p><p className="text-2xl font-bold">{todayStocksCount}</p><p className="text-sm text-blue-600">Products recorded</p></div><div className="p-2 bg-blue-100 rounded-lg"><ClipboardList className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Perfect Matches</p><p className="text-2xl font-bold">{perfectMatches}</p><p className="text-sm text-green-600">Zero variance</p></div><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">With Variance</p><p className="text-2xl font-bold">{withVariance}</p><p className="text-sm text-orange-600">Needs review</p></div><div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="w-6 h-6 text-orange-600" /></div></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Total Variance</p><p className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalVariance >= 0 ? '+' : ''}{safeFormatNumber(totalVariance)}L</p><p className="text-sm text-gray-600">Net difference</p></div><div className="p-2 bg-purple-100 rounded-lg"><Calculator className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" />Daily Stock Records</CardTitle>
                <Badge variant="outline" className="bg-gray-100">{filteredDailyStocksCount} Total</Badge>
              </CardHeader>
              <CardContent>
                {loading ? <TableSkeleton /> : filteredDailyStocks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Station</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Opening Stock</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead>Sales</TableHead>
                          <TableHead>Closing Stock</TableHead>
                          <TableHead>Variance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDailyStocks.map((stock) => (
                          <TableRow key={stock.id}>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-500" />
                                {new Date(safeGet(stock.stock_date, new Date().toISOString())).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{safeGet(stock.stations?.name, 'Station')}</TableCell>
                            <TableCell>{safeGet(stock.products?.name, 'Product')}</TableCell>
                            <TableCell>{safeFormatNumber(stock.opening_stock)} {safeGet(stock.products?.unit, 'L')}</TableCell>
                            <TableCell>{safeFormatNumber(stock.received)} {safeGet(stock.products?.unit, 'L')}</TableCell>
                            <TableCell>{safeFormatNumber(stock.sales)} {safeGet(stock.products?.unit, 'L')}</TableCell>
                            <TableCell>{safeFormatNumber(stock.closing_stock)} {safeGet(stock.products?.unit, 'L')}</TableCell>
                            <TableCell>
                              <Badge className={getVarianceColor(safeGet(stock.variance, 0))}>
                                {safeGet(stock.variance, 0) >= 0 ? '+' : ''}{safeFormatNumber(stock.variance)} {safeGet(stock.products?.unit, 'L')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={safeGet(stock.variance, 0) === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                                {safeGet(stock.variance, 0) === 0 ? 'Perfect' : 'Variance'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No daily stock records found</p>
                    <p className="text-sm text-gray-400">Record your first daily stock to get started</p>
                    {canCreateRecords() && (
                      <Button 
                        onClick={() => setShowDailyStockDialog(true)} 
                        className="mt-4 bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Record Daily Stock
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Reconciliation Tab */}
        {activeTab === 'reconciliation' && (
          <>
            {canCreateRecords() && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" />Daily Stock Reconciliation</CardTitle>
                  <Button variant="outline" onClick={handleReconciliationButton} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Reconciliation
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? <TableSkeleton /> : filteredDailyStocks.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Station</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Opening Stock</TableHead>
                            <TableHead>Received</TableHead>
                            <TableHead>Sales</TableHead>
                            <TableHead>Closing Stock</TableHead>
                            <TableHead>Variance</TableHead>
                            <TableHead>Recorded By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDailyStocks.slice(0, 10).map((stock) => (
                            <TableRow key={stock.id}>
                              <TableCell>{new Date(safeGet(stock.stock_date, new Date().toISOString())).toLocaleDateString()}</TableCell>
                              <TableCell>{safeGet(stock.stations?.name, 'Station')}</TableCell>
                              <TableCell>{safeGet(stock.products?.name, 'Product')}</TableCell>
                              <TableCell>{safeFormatNumber(stock.opening_stock)} {safeGet(stock.products?.unit, 'L')}</TableCell>
                              <TableCell>{safeFormatNumber(stock.received)} {safeGet(stock.products?.unit, 'L')}</TableCell>
                              <TableCell>{safeFormatNumber(stock.sales)} {safeGet(stock.products?.unit, 'L')}</TableCell>
                              <TableCell>{safeFormatNumber(stock.closing_stock)} {safeGet(stock.products?.unit, 'L')}</TableCell>
                              <TableCell className={safeGet(stock.variance, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {safeGet(stock.variance, 0) >= 0 ? '+' : ''}{safeFormatNumber(stock.variance)} {safeGet(stock.products?.unit, 'L')}
                              </TableCell>
                              <TableCell>{safeGet(stock.recorded_by, '')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No reconciliations recorded</p>
                      <p className="text-sm text-gray-400">Start by recording your first stock reconciliation</p>
                      <Button onClick={handleReconciliationButton} className="mt-4 bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        New Reconciliation
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {filteredDailyStocks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Reconciliation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{filteredDailyStocks.length}</p>
                      <p className="text-sm text-blue-600">Total Records</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {filteredDailyStocks.filter((r) => safeGet(r.variance, 0) === 0).length}
                      </p>
                      <p className="text-sm text-green-600">Perfect Matches</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {filteredDailyStocks.filter((r) => Math.abs(safeGet(r.variance, 0)) > 0 && Math.abs(safeGet(r.variance, 0)) <= 100).length}
                      </p>
                      <p className="text-sm text-orange-600">Minor Variances</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {filteredDailyStocks.filter((r) => Math.abs(safeGet(r.variance, 0)) > 100).length}
                      </p>
                      <p className="text-sm text-red-600">Major Variances</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}