// src/pages/mobile/MobileInventoryManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../../components/ui/dialog";
import { 
  Plus, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  RefreshCw,
  Search,
  Eye,
  BarChart3,
  TrendingUp,
  Calendar,
  User,
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  FileText,
  Package,
  ClipboardList,
  Calculator,
  ChevronRight,
  Filter,
  Store,
  Building,
  Zap
} from "lucide-react";
import { api } from '../../lib/api';
import { useToast } from '../../components/ui/use-toast';
import { Skeleton } from '../../components/ui/skeleton';

// Types (same as desktop)
interface TankStock {
  id: string;
  station_id: string;
  product_id: string;
  current_volume: number;
  max_capacity: number;
  last_delivery_date: string;
  last_delivery_quantity: number;
  status: 'adequate' | 'low' | 'critical' | 'empty';
  updated_at: string;
  station_name?: string;
  product_name?: string;
  product_unit?: string;
}

interface DailyTankStock {
  id: string;
  station_id: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  deliveries: number;
  sales: number;
  variance: number;
  stock_date: string;
  recorded_by: string;
  notes?: string;
  created_at: string;
  station_name?: string;
  product_name?: string;
  product_unit?: string;
}

interface Delivery {
  id: string;
  station_id: string;
  product_id: string;
  quantity: number;
  supplier: string;
  driver_name: string;
  vehicle_number: string;
  delivery_date: string;
  received_by: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: string;
  station_name?: string;
  product_name?: string;
}

// Mobile-optimized components
const MobileStatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "text-blue-600",
  bgColor = "bg-blue-50"
}: { 
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color?: string;
  bgColor?: string;
}) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const MobileStockItem = ({ stock }: { stock: TankStock }) => {
  const capacityPercentage = (stock.current_volume / stock.max_capacity) * 100;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'adequate': return 'bg-green-100 text-green-700';
      case 'low': return 'bg-yellow-100 text-yellow-700';
      case 'critical': return 'bg-orange-100 text-orange-700';
      case 'empty': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'adequate': return <BatteryFull className="w-4 h-4" />;
      case 'low': return <BatteryMedium className="w-4 h-4" />;
      case 'critical': return <BatteryLow className="w-4 h-4" />;
      case 'empty': return <BatteryWarning className="w-4 h-4" />;
      default: return <Battery className="w-4 h-4" />;
    }
  };

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">{stock.product_name}</h3>
              <Badge className={`text-xs ${getStatusColor(stock.status)}`}>
                {getStatusIcon(stock.status)}
                <span className="ml-1 capitalize">{stock.status}</span>
              </Badge>
            </div>
            <p className="text-xs text-gray-600">
              {stock.station_name} • {capacityPercentage.toFixed(1)}% capacity
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs text-gray-600">Current Stock</p>
            <p className="text-lg font-bold text-gray-900">
              {stock.current_volume.toLocaleString()} {stock.product_unit}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Max Capacity</p>
            <p className="text-sm font-semibold text-gray-700">
              {stock.max_capacity.toLocaleString()} {stock.product_unit}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              stock.status === 'adequate' ? 'bg-green-500' :
              stock.status === 'low' ? 'bg-yellow-500' :
              stock.status === 'critical' ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>0 {stock.product_unit}</span>
          <span>{stock.max_capacity.toLocaleString()} {stock.product_unit}</span>
        </div>

        {stock.last_delivery_date && (
          <p className="text-xs text-gray-500 mt-2">
            Last delivery: {new Date(stock.last_delivery_date).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const MobileDeliveryItem = ({ delivery }: { delivery: Delivery }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'scheduled': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">{delivery.product_name}</h3>
              <Badge className={`text-xs ${getStatusColor(delivery.status)}`}>
                {delivery.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-gray-600">
              {delivery.station_name} • {delivery.supplier}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs text-gray-600">Quantity</p>
            <p className="text-lg font-bold text-gray-900">
              {delivery.quantity.toLocaleString()} L
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Driver</p>
            <p className="text-sm font-semibold text-gray-700">
              {delivery.driver_name}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(delivery.delivery_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{delivery.received_by}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileDailyStockItem = ({ stock }: { stock: DailyTankStock }) => {
  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'bg-green-100 text-green-700';
    if (Math.abs(variance) <= 100) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">{stock.product_name}</h3>
              <Badge className={`text-xs ${getVarianceColor(stock.variance)}`}>
                {stock.variance >= 0 ? '+' : ''}{stock.variance.toFixed(2)} L
              </Badge>
            </div>
            <p className="text-xs text-gray-600">
              {stock.station_name} • {new Date(stock.stock_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <p className="text-gray-600 text-xs">Opening</p>
            <p className="font-semibold text-gray-900">{stock.opening_stock.toLocaleString()}L</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs">Closing</p>
            <p className="font-semibold text-gray-900">{stock.closing_stock.toLocaleString()}L</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs">Deliveries</p>
            <p className="font-semibold text-gray-900">{stock.deliveries.toLocaleString()}L</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs">Sales</p>
            <p className="font-semibold text-gray-900">{stock.sales.toLocaleString()}L</p>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Recorded by {stock.recorded_by}</span>
          <span>{new Date(stock.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
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

export default function MobileInventoryManagement() {
  const [tankStocks, setTankStocks] = useState<TankStock[]>([]);
  const [dailyTankStocks, setDailyTankStocks] = useState<DailyTankStock[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);
  const [availableStations, setAvailableStations] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'overview' | 'stock' | 'deliveries' | 'daily'>('overview');
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [showDailyStockDialog, setShowDailyStockDialog] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const { toast } = useToast();

  const [deliveryForm, setDeliveryForm] = useState({
    station_id: '',
    product_id: '',
    quantity: '',
    supplier: '',
    driver_name: '',
    vehicle_number: '',
    delivery_date: new Date().toISOString().split('T')[0],
    received_by: '',
    notes: ''
  });

  const [dailyStockForm, setDailyStockForm] = useState({
    station_id: '',
    product_id: '',
    opening_stock: '',
    closing_stock: '',
    deliveries: '',
    sales: '',
    stock_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Client-side role-based access control
  const canManageAll = () => {
    return userContext?.role === 'admin';
  };

  const canManageOMCStations = () => {
    return ['admin', 'omc'].includes(userContext?.role);
  };

  const canManageStation = () => {
    return ['admin', 'omc', 'station_manager'].includes(userContext?.role);
  };

  const canCreateRecords = () => {
    return ['admin', 'omc', 'station_manager'].includes(userContext?.role);
  };

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

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (authChecked && userContext && selectedStation) {
      loadData();
    }
  }, [selectedStation, authChecked, userContext]);

  const checkAuthentication = async () => {
    try {
      setLoading(true);
      const profileResponse = await api.getCurrentUserProfile();
      
      if (profileResponse.success && profileResponse.data) {
        setUserContext(profileResponse.data);
        
        // Set default station based on role
        if (profileResponse.data.role === 'station_manager' && profileResponse.data.station_id) {
          setSelectedStation(profileResponse.data.station_id);
          setDeliveryForm(prev => ({ ...prev, station_id: profileResponse.data.station_id }));
          setDailyStockForm(prev => ({ ...prev, station_id: profileResponse.data.station_id }));
        }

        await Promise.all([
          loadAvailableStations(),
          loadAvailableProducts()
        ]);

      } else {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      toast({
        title: "Connection Error",
        description: "Unable to verify authentication",
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
        stationsResponse = await api.getStationsByOMC(userContext.omc_id);
      } else if (userContext?.role === 'station_manager' && userContext.station_id) {
        const allStations = await api.getAllStations();
        if (allStations.success) {
          stationsResponse = {
            success: true,
            data: allStations.data?.filter((station: any) => station.id === userContext.station_id) || []
          };
        }
      } else if (userContext?.role === 'dealer' && userContext.dealer_id) {
        const allStations = await api.getAllStations();
        if (allStations.success) {
          stationsResponse = {
            success: true,
            data: allStations.data?.filter((station: any) => station.dealer_id === userContext.dealer_id) || []
          };
        }
      } else {
        stationsResponse = await api.getAllStations();
      }

      if (stationsResponse?.success && stationsResponse.data) {
        setAvailableStations(stationsResponse.data);
        
        if (!selectedStation && stationsResponse.data.length > 0) {
          const defaultStationId = stationsResponse.data[0].id;
          setSelectedStation(defaultStationId);
          setDeliveryForm(prev => ({ ...prev, station_id: defaultStationId }));
          setDailyStockForm(prev => ({ ...prev, station_id: defaultStationId }));
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadAvailableProducts = async () => {
    try {
      const response = await api.getProducts();
      
      if (response.success && response.data) {
        setAvailableProducts(response.data);
        
        if (response.data.length > 0) {
          const defaultProductId = response.data[0].id;
          setDeliveryForm(prev => ({ ...prev, product_id: defaultProductId }));
          setDailyStockForm(prev => ({ ...prev, product_id: defaultProductId }));
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadData = async () => {
    if (!userContext || !selectedStation) return;

    try {
      setLoading(true);
      
      const filters: any = { station_id: selectedStation };
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      filters.start_date = startDate.toISOString().split('T')[0];
      filters.end_date = endDate;

      // Load tank stocks
      const stocksResponse = await api.getTankStocks(selectedStation);
      if (stocksResponse.success) {
        setTankStocks(stocksResponse.data || []);
      }

      // Load daily tank stocks
      try {
        const dailyStocksResponse = await api.getDailyTankStocks(filters);
        if (dailyStocksResponse.success) {
          setDailyTankStocks(dailyStocksResponse.data || []);
        }
      } catch (error) {
        setDailyTankStocks([]);
      }

      // Load deliveries
      try {
        const deliveriesResponse = await api.getDeliveries(filters);
        if (deliveriesResponse.success) {
          setDeliveries(deliveriesResponse.data || []);
        }
      } catch (error) {
        setDeliveries([]);
      }

    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast({
        title: "Data Loading Error",
        description: "Failed to load inventory data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

    try {
      if (!dailyStockForm.station_id || !dailyStockForm.product_id || 
          !dailyStockForm.opening_stock || !dailyStockForm.closing_stock) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const dailyStockData = {
        station_id: dailyStockForm.station_id,
        product_id: dailyStockForm.product_id,
        opening_stock: parseFloat(dailyStockForm.opening_stock),
        closing_stock: parseFloat(dailyStockForm.closing_stock),
        deliveries: parseFloat(dailyStockForm.deliveries) || 0,
        sales: parseFloat(dailyStockForm.sales) || 0,
        stock_date: dailyStockForm.stock_date,
        notes: dailyStockForm.notes || undefined
      };

      const response = await api.createDailyTankStock(dailyStockData);

      if (response.success) {
        setShowDailyStockDialog(false);
        resetForms();
        await loadData();
        
        toast({
          title: "Daily Stock Recorded!",
          description: "Stock recorded successfully",
        });
      } else {
        toast({
          title: "Recording Failed",
          description: response.error || "Unable to save daily stock record",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error creating daily stock:', error);
      toast({
        title: "Unexpected Error",
        description: error.message || "Failed to record daily stock",
        variant: "destructive"
      });
    }
  };

  const handleCreateDelivery = async () => {
    if (!canCreateRecords()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create deliveries",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!deliveryForm.station_id || !deliveryForm.product_id || !deliveryForm.quantity || 
          !deliveryForm.supplier || !deliveryForm.driver_name || !deliveryForm.received_by) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const deliveryData = {
        station_id: deliveryForm.station_id,
        product_id: deliveryForm.product_id,
        quantity: parseFloat(deliveryForm.quantity),
        supplier: deliveryForm.supplier,
        driver_name: deliveryForm.driver_name,
        vehicle_number: deliveryForm.vehicle_number,
        delivery_date: deliveryForm.delivery_date,
        received_by: deliveryForm.received_by,
        notes: deliveryForm.notes || undefined,
        status: 'delivered' as const
      };

      const response = await api.createDelivery(deliveryData);
      
      if (response.success) {
        setShowDeliveryDialog(false);
        resetForms();
        await loadData();
        
        toast({
          title: "Delivery Recorded!",
          description: "Delivery recorded successfully",
        });
      } else {
        toast({
          title: "Delivery Failed",
          description: response.error || "Unable to record delivery",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error creating delivery:', error);
      toast({
        title: "System Error",
        description: error.message || "Failed to record delivery",
        variant: "destructive"
      });
    }
  };

  const resetForms = () => {
    setDeliveryForm({
      station_id: selectedStation || (availableStations.length > 0 ? availableStations[0].id : ''),
      product_id: availableProducts.length > 0 ? availableProducts[0].id : '',
      quantity: '',
      supplier: '',
      driver_name: '',
      vehicle_number: '',
      delivery_date: new Date().toISOString().split('T')[0],
      received_by: '',
      notes: ''
    });

    setDailyStockForm({
      station_id: selectedStation || (availableStations.length > 0 ? availableStations[0].id : ''),
      product_id: availableProducts.length > 0 ? availableProducts[0].id : '',
      opening_stock: '',
      closing_stock: '',
      deliveries: '',
      sales: '',
      stock_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const calculateStockMetrics = () => {
    const totalStock = tankStocks.reduce((sum, stock) => sum + stock.current_volume, 0);
    const lowStockCount = tankStocks.filter(stock => stock.status === 'low' || stock.status === 'critical').length;
    const averageCapacity = tankStocks.length > 0 
      ? tankStocks.reduce((sum, stock) => sum + (stock.current_volume / stock.max_capacity * 100), 0) / tankStocks.length
      : 0;

    return { totalStock, lowStockCount, averageCapacity };
  };

  const calculateDailyStockMetrics = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayStocks = dailyTankStocks.filter(stock => stock.stock_date === today);
    const totalVariance = todayStocks.reduce((sum, stock) => sum + stock.variance, 0);

    return { totalVariance, todayStocksCount: todayStocks.length };
  };

  // Loading skeletons
  const MobileStatsSkeleton = () => (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-12 bg-gray-200 rounded"></div>
                <div className="h-2 w-20 bg-gray-200 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const MobileItemSkeleton = () => (
    <Card className="mb-3 border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-3 w-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-5 w-12 bg-gray-200 rounded"></div>
        </div>
        <div className="flex justify-between items-center mb-3">
          <div className="space-y-1">
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-5 w-16 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-1">
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-4 w-10 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded mb-2"></div>
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-gray-200 rounded"></div>
          <div className="h-3 w-16 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Checking Authentication</h3>
          <p className="text-gray-600">Verifying user credentials...</p>
        </div>
      </div>
    );
  }

  if (!userContext) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please log in to access inventory management</p>
        </div>
      </div>
    );
  }

  const { totalStock, lowStockCount, averageCapacity } = calculateStockMetrics();
  const { totalVariance, todayStocksCount } = calculateDailyStockMetrics();

  const renderOverview = () => (
    <div className="space-y-4">
      <MobileStatsCard
        title="Total Stock"
        value={`${totalStock.toLocaleString()}L`}
        subtitle="Across all products"
        icon={Package}
        color="text-blue-600"
        bgColor="bg-blue-50"
      />

      <MobileStatsCard
        title="Low Stock Alerts"
        value={lowStockCount.toString()}
        subtitle={lowStockCount > 0 ? "Requires attention" : "All good"}
        icon={AlertTriangle}
        color="text-orange-600"
        bgColor="bg-orange-50"
      />

      <MobileStatsCard
        title="Avg Capacity"
        value={`${averageCapacity.toFixed(1)}%`}
        subtitle="Healthy"
        icon={TrendingUp}
        color="text-green-600"
        bgColor="bg-green-50"
      />

      <MobileStatsCard
        title="Today's Records"
        value={todayStocksCount.toString()}
        subtitle="Daily stock entries"
        icon={ClipboardList}
        color="text-purple-600"
        bgColor="bg-purple-50"
      />

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {canCreateRecords() && (
              <>
                <MobileQuickAction
                  icon={Truck}
                  label="Record Delivery"
                  onClick={() => setShowDeliveryDialog(true)}
                  color="text-blue-600"
                />
                <MobileQuickAction
                  icon={ClipboardList}
                  label="Daily Stock"
                  onClick={() => setShowDailyStockDialog(true)}
                  color="text-green-600"
                />
              </>
            )}
            <MobileQuickAction
              icon={RefreshCw}
              label="Refresh"
              onClick={loadData}
              color="text-gray-600"
            />
            <MobileQuickAction
              icon={Download}
              label="Export"
              onClick={() => {/* Export functionality */}}
              color="text-purple-600"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStock = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Current Stock</h2>
        <Badge variant="outline">{tankStocks.length} Products</Badge>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MobileItemSkeleton key={i} />
          ))}
        </div>
      ) : tankStocks.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No stock data available</p>
        </div>
      ) : (
        <div>
          {tankStocks.map((stock) => (
            <MobileStockItem key={stock.id} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );

  const renderDeliveries = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Deliveries</h2>
        <Badge variant="outline">{deliveries.length} Total</Badge>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MobileItemSkeleton key={i} />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-8">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No deliveries found</p>
          {canCreateRecords() && (
            <Button 
              onClick={() => setShowDeliveryDialog(true)} 
              className="mt-4 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Delivery
            </Button>
          )}
        </div>
      ) : (
        <div>
          {deliveries.slice(0, 10).map((delivery) => (
            <MobileDeliveryItem key={delivery.id} delivery={delivery} />
          ))}
        </div>
      )}
    </div>
  );

  const renderDailyStock = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Daily Stock Records</h2>
        <Badge variant="outline">{dailyTankStocks.length} Total</Badge>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MobileItemSkeleton key={i} />
          ))}
        </div>
      ) : dailyTankStocks.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No daily stock records</p>
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
      ) : (
        <div>
          {dailyTankStocks.slice(0, 10).map((stock) => (
            <MobileDailyStockItem key={stock.id} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );

  const renderForm = (type: 'delivery' | 'daily-stock') => {
    const isDelivery = type === 'delivery';
    const title = isDelivery ? 'Record Delivery' : 'Record Daily Stock';
    const buttonText = isDelivery ? 'Record Delivery' : 'Save Daily Stock';
    const buttonColor = isDelivery ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
        <div className="bg-white rounded-t-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                isDelivery ? setShowDeliveryDialog(false) : setShowDailyStockDialog(false);
                resetForms();
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            {/* Station Selection */}
            <div>
              <Label className="text-sm">Station</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900 text-sm"
                value={isDelivery ? deliveryForm.station_id : dailyStockForm.station_id}
                onChange={(e) => {
                  if (isDelivery) {
                    setDeliveryForm(prev => ({ ...prev, station_id: e.target.value }));
                  } else {
                    setDailyStockForm(prev => ({ ...prev, station_id: e.target.value }));
                  }
                }}
              >
                {getManageableStations().map(station => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Selection */}
            <div>
              <Label className="text-sm">Product</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900 text-sm"
                value={isDelivery ? deliveryForm.product_id : dailyStockForm.product_id}
                onChange={(e) => {
                  if (isDelivery) {
                    setDeliveryForm(prev => ({ ...prev, product_id: e.target.value }));
                  } else {
                    setDailyStockForm(prev => ({ ...prev, product_id: e.target.value }));
                  }
                }}
              >
                {availableProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Delivery-specific fields */}
            {isDelivery ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Quantity (L) *</Label>
                    <Input
                      type="number"
                      value={deliveryForm.quantity}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Supplier *</Label>
                    <Input
                      value={deliveryForm.supplier}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, supplier: e.target.value }))}
                      placeholder="Supplier name"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Driver Name *</Label>
                    <Input
                      value={deliveryForm.driver_name}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, driver_name: e.target.value }))}
                      placeholder="Driver name"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Vehicle Number</Label>
                    <Input
                      value={deliveryForm.vehicle_number}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, vehicle_number: e.target.value }))}
                      placeholder="Vehicle number"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Delivery Date</Label>
                    <Input
                      type="date"
                      value={deliveryForm.delivery_date}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, delivery_date: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Received By *</Label>
                    <Input
                      value={deliveryForm.received_by}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, received_by: e.target.value }))}
                      placeholder="Receiver name"
                      className="text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Daily Stock fields */
              <>
                <div>
                  <Label className="text-sm">Stock Date</Label>
                  <Input
                    type="date"
                    value={dailyStockForm.stock_date}
                    onChange={(e) => setDailyStockForm(prev => ({ ...prev, stock_date: e.target.value }))}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Opening Stock (L) *</Label>
                    <Input
                      type="number"
                      value={dailyStockForm.opening_stock}
                      onChange={(e) => setDailyStockForm(prev => ({ ...prev, opening_stock: e.target.value }))}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Closing Stock (L) *</Label>
                    <Input
                      type="number"
                      value={dailyStockForm.closing_stock}
                      onChange={(e) => setDailyStockForm(prev => ({ ...prev, closing_stock: e.target.value }))}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Deliveries (L)</Label>
                    <Input
                      type="number"
                      value={dailyStockForm.deliveries}
                      onChange={(e) => setDailyStockForm(prev => ({ ...prev, deliveries: e.target.value }))}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Sales (L)</Label>
                    <Input
                      type="number"
                      value={dailyStockForm.sales}
                      onChange={(e) => setDailyStockForm(prev => ({ ...prev, sales: e.target.value }))}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <Label className="text-sm">Notes</Label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                rows={3}
                value={isDelivery ? deliveryForm.notes : dailyStockForm.notes}
                onChange={(e) => {
                  if (isDelivery) {
                    setDeliveryForm(prev => ({ ...prev, notes: e.target.value }));
                  } else {
                    setDailyStockForm(prev => ({ ...prev, notes: e.target.value }));
                  }
                }}
                placeholder="Additional notes..."
              />
            </div>

            <Button 
              onClick={isDelivery ? handleCreateDelivery : handleCreateDailyStock}
              className={`w-full ${buttonColor}`}
            >
              {isDelivery ? <Truck className="w-4 h-4 mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-xs text-gray-600">Track fuel stock and deliveries</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="w-8 h-8 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Station Selection */}
        {(userContext?.role === 'admin' || userContext?.role === 'omc' || userContext?.role === 'dealer') && (
          <Card className="mb-4 border-0 shadow-sm">
            <CardContent className="p-4">
              <div>
                <Label className="text-sm mb-2">Select Station</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                >
                  {getManageableStations().map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { key: 'stock' as const, label: 'Stock', icon: Package },
            { key: 'deliveries' as const, label: 'Deliveries', icon: Truck },
            { key: 'daily' as const, label: 'Daily', icon: ClipboardList },
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
        {activeSection === 'stock' && renderStock()}
        {activeSection === 'deliveries' && renderDeliveries()}
        {activeSection === 'daily' && renderDailyStock()}
      </div>

      {/* Floating Action Button */}
      {canCreateRecords() && (
        <div className="fixed bottom-20 right-4">
          <Button
            size="lg"
            className="rounded-full w-12 h-12 shadow-2xl"
            style={{ backgroundColor: '#0B2265' }}
            onClick={() => setShowDeliveryDialog(true)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Form Modals */}
      {showDeliveryDialog && renderForm('delivery')}
      {showDailyStockDialog && renderForm('daily-stock')}
    </div>
  );
}