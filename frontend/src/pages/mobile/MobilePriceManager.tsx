// src/pages/mobile/MobilePriceManager.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Switch } from "../../components/ui/switch";
import { Plus, Edit, Trash2, Save, X, Download, RefreshCw, AlertTriangle, FileText, Building, Fuel, Store, TrendingUp, Users, MapPin, ChevronRight, DollarSign, Package } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../components/ui/use-toast";

// Types for price data (same as desktop)
interface PriceCap {
  id: string;
  product_id: string;
  product_name?: string;
  price_cap: number;
  effective_date: string;
  end_date?: string;
  status: 'active' | 'expired' | 'pending';
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

interface StationPrice {
  id: string;
  station_id: string;
  station_name?: string;
  station_code?: string;
  omc_id?: string;
  omc_name?: string;
  product_id: string;
  product_name?: string;
  selling_price: number;
  effective_date: string;
  end_date?: string;
  status: 'active' | 'expired' | 'pending' | 'approved' | 'rejected';
  is_auto_adjusted: boolean;
  price_cap_id?: string;
  price_cap_amount?: number;
  margin?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

interface OMCPrice {
  id: string;
  omc_id: string;
  omc_name?: string;
  product_id: string;
  product_name?: string;
  recommended_price: number;
  effective_date: string;
  end_date?: string;
  status: 'active' | 'expired' | 'pending';
  price_cap_id?: string;
  price_cap_amount?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  unit: string;
  is_active: boolean;
}

interface OMC {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface Station {
  id: string;
  name: string;
  code: string;
  omc_id: string;
  omc_name?: string;
  is_active: boolean;
  location?: string;
  region?: string;
}

interface UserContext {
  role: string;
  omc_id?: string;
  station_id?: string;
  dealer_id?: string;
  full_name?: string;
  omc_name?: string;
  station_name?: string;
  station_code?: string;
}

interface PriceSummary {
  totalPriceCaps: number;
  activePriceCaps: number;
  totalOMCPrices: number;
  activeOMCPrices: number;
  totalStationPrices: number;
  activeStationPrices: number;
  averageMargin: number;
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

const MobilePriceItem = ({ 
  item, 
  type,
  onEdit,
  onDelete 
}: { 
  item: PriceCap | StationPrice | OMCPrice;
  type: 'price-cap' | 'station-price' | 'omc-price';
  onEdit: (item: any, type: string) => void;
  onDelete: (id: string, type: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'expired': return 'bg-gray-100 text-gray-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isPriceCap = type === 'price-cap';
  const isStationPrice = type === 'station-price';
  const isOMCPrice = type === 'omc-price';

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">
                {isPriceCap && (item as PriceCap).product_name}
                {isStationPrice && (item as StationPrice).station_name}
                {isOMCPrice && (item as OMCPrice).omc_name}
              </h3>
              <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                {item.status}
              </Badge>
            </div>
            
            {isStationPrice && (
              <p className="text-xs text-gray-600 mb-1">
                {(item as StationPrice).product_name} • {(item as StationPrice).omc_name}
              </p>
            )}
            
            {isOMCPrice && (
              <p className="text-xs text-gray-600 mb-1">
                {(item as OMCPrice).product_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs text-gray-600">Price</p>
            <p className="text-lg font-bold text-green-600">
              ₵{isPriceCap ? (item as PriceCap).price_cap.toFixed(3) : 
                isStationPrice ? (item as StationPrice).selling_price.toFixed(3) : 
                (item as OMCPrice).recommended_price.toFixed(3)}
            </p>
          </div>
          
          {isStationPrice && (item as StationPrice).margin !== undefined && (
            <div className="text-right">
              <p className="text-xs text-gray-600">Margin</p>
              <p className={`text-sm font-semibold ${(item as StationPrice).margin! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {((item as StationPrice).margin! >= 0 ? '+' : '')}{(item as StationPrice).margin!.toFixed(3)}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>From {new Date(item.effective_date).toLocaleDateString()}</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={() => onEdit(item, type)}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onDelete(item.id, type)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileFormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3 mb-4">
    <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
    {children}
  </div>
);

export default function MobilePriceManager() {
  const [activeTab, setActiveTab] = useState("summary");
  const [priceCaps, setPriceCaps] = useState<PriceCap[]>([]);
  const [stationPrices, setStationPrices] = useState<StationPrice[]>([]);
  const [omcPrices, setOmcPrices] = useState<OMCPrice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [omcs, setOmcs] = useState<OMC[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'price-cap' | 'station-price' | 'omc-price'>('station-price');
  
  const [priceCapFormData, setPriceCapFormData] = useState({
    product_id: '',
    price_cap: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  const [stationPriceFormData, setStationPriceFormData] = useState({
    station_id: '',
    product_id: '',
    selling_price: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_auto_adjusted: true,
    notes: ''
  });

  const [omcPriceFormData, setOmcPriceFormData] = useState({
    product_id: '',
    recommended_price: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  const [priceSummary, setPriceSummary] = useState<PriceSummary>({
    totalPriceCaps: 0,
    activePriceCaps: 0,
    totalOMCPrices: 0,
    activeOMCPrices: 0,
    totalStationPrices: 0,
    activeStationPrices: 0,
    averageMargin: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (userContext?.role === 'station' && userContext.station_id) {
      setStationPriceFormData(prev => ({
        ...prev,
        station_id: userContext.station_id || ''
      }));
    }
  }, [userContext]);

  useEffect(() => {
    calculatePriceSummary();
  }, [priceCaps, omcPrices, stationPrices]);

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Get user context first
      const profileResponse = await api.getCurrentUserProfile();
      if (profileResponse.success && profileResponse.data) {
        const userData = profileResponse.data;
        const userContextData: UserContext = {
          role: userData.role,
          omc_id: userData.omc_id,
          station_id: userData.station_id,
          dealer_id: userData.dealer_id,
          full_name: userData.full_name,
          omc_name: userData.omc?.name,
          station_name: userData.station?.name,
          station_code: userData.station?.code
        };
        setUserContext(userContextData);
        
        if (userData.role === 'station' && userData.station_id) {
          setStationPriceFormData(prev => ({
            ...prev,
            station_id: userData.station_id || ''
          }));
        }
      }

      // Load initial data
      await loadProducts();
      await loadOMCs();
      await loadPriceCaps();
      await loadStations();
      await loadStationPrices();
      await loadOMCPrices();
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast({
        title: "Error",
        description: "Failed to load price data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceSummary = () => {
    const currentPriceCaps = getCurrentPriceCaps();
    const currentStationPrices = getCurrentStationPrices();
    const currentOMCPrices = getCurrentOMCPrices();
    
    const activeStationPricesWithMargin = currentStationPrices.filter(sp => sp.margin !== undefined && sp.margin !== null);
    const averageMargin = activeStationPricesWithMargin.length > 0 
      ? activeStationPricesWithMargin.reduce((sum, sp) => sum + (sp.margin || 0), 0) / activeStationPricesWithMargin.length
      : 0;

    setPriceSummary({
      totalPriceCaps: priceCaps.length,
      activePriceCaps: currentPriceCaps.length,
      totalOMCPrices: omcPrices.length,
      activeOMCPrices: currentOMCPrices.length,
      totalStationPrices: stationPrices.length,
      activeStationPrices: currentStationPrices.length,
      averageMargin
    });
  };

  const loadPriceCaps = async () => {
    try {
      let response;
      
      if (userContext?.role === 'omc' && userContext.omc_id) {
        response = await api.getOMCPriceCaps(userContext.omc_id);
      } else {
        response = await api.getPriceCaps();
      }
      
      if (response.success && response.data) {
        const capsWithProductNames = response.data.map((cap: any) => ({
          ...cap,
          product_name: products.find(p => p.id === cap.product_id)?.name || cap.product_name || 'Unknown Product'
        }));
        setPriceCaps(capsWithProductNames);
      } else {
        setPriceCaps([]);
      }
    } catch (error) {
      console.error('Error loading price caps:', error);
      toast({
        title: "Error",
        description: "Failed to load price caps",
        variant: "destructive"
      });
    }
  };

  const loadStationPrices = async () => {
    try {
      let response;
      
      if (userContext?.role === 'station' && userContext.station_id) {
        response = await api.getStationPrices(userContext.station_id);
      } else if (userContext?.role === 'omc' && userContext.omc_id) {
        response = await api.getOMCStationPrices(userContext.omc_id);
      } else {
        response = await api.getAllStationPrices();
      }
      
      if (response.success && response.data) {
        const pricesWithDetails = response.data.map((price: any) => ({
          ...price,
          product_name: products.find(p => p.id === price.product_id)?.name || price.product_name || 'Unknown Product',
          station_name: stations.find(s => s.id === price.station_id)?.name || price.station_name || 'Unknown Station',
          omc_name: stations.find(s => s.id === price.station_id)?.omc_name || price.omc_name || 'Unknown OMC'
        }));
        setStationPrices(pricesWithDetails);
      } else {
        setStationPrices([]);
      }
    } catch (error) {
      console.error('Error loading station prices:', error);
      toast({
        title: "Error",
        description: "Failed to load station prices",
        variant: "destructive"
      });
    }
  };

  const loadOMCPrices = async () => {
    try {
      let response;
      
      if (userContext?.role === 'omc' && userContext.omc_id) {
        response = await api.getOMCRecommendedPrices(userContext.omc_id);
      } else {
        response = await api.getAllOMCPrices();
      }
      
      if (response.success && response.data) {
        const pricesWithDetails = response.data.map((price: any) => ({
          ...price,
          product_name: products.find(p => p.id === price.product_id)?.name || price.product_name || 'Unknown Product',
          omc_name: omcs.find(o => o.id === price.omc_id)?.name || price.omc_name || 'Unknown OMC'
        }));
        setOmcPrices(pricesWithDetails);
      } else {
        setOmcPrices([]);
      }
    } catch (error) {
      console.error('Error loading OMC prices:', error);
      toast({
        title: "Error",
        description: "Failed to load OMC recommended prices",
        variant: "destructive"
      });
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.getProducts();
      if (response.success && response.data) {
        const activeProducts = response.data.filter((product: Product) => product.is_active);
        setProducts(activeProducts);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    }
  };

  const loadOMCs = async () => {
    try {
      const response = await api.getOMCs();
      if (response.success && response.data) {
        const activeOMCs = response.data.filter((omc: OMC) => omc.is_active);
        setOmcs(activeOMCs);
      } else {
        setOmcs([]);
      }
    } catch (error) {
      console.error('Error loading OMCs:', error);
      toast({
        title: "Error",
        description: "Failed to load OMCs",
        variant: "destructive"
      });
    }
  };

  const loadStations = async () => {
    try {
      let response;
      
      if (userContext?.role === 'omc' && userContext.omc_id) {
        response = await api.getOMCStations(userContext.omc_id);
      } else if (userContext?.role === 'station' && userContext.station_id) {
        response = await api.getStation(userContext.station_id);
        if (response.success && response.data) {
          const stationData = Array.isArray(response.data) ? response.data[0] : response.data;
          setStations([stationData]);
        }
        return;
      } else {
        response = await api.getAllStations();
      }
      
      if (response.success && response.data) {
        const stationsData = Array.isArray(response.data) ? response.data : [response.data];
        const activeStations = stationsData.filter((station: Station) => station.is_active !== false);
        setStations(activeStations);
      } else {
        setStations([]);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      toast({
        title: "Error",
        description: "Failed to load stations",
        variant: "destructive"
      });
    }
  };

  const getCurrentPriceCaps = () => {
    const today = new Date().toISOString().split('T')[0];
    return priceCaps.filter(cap => 
      cap.status === 'active' && 
      cap.effective_date <= today && 
      (!cap.end_date || cap.end_date >= today)
    );
  };

  const getCurrentStationPrices = () => {
    const today = new Date().toISOString().split('T')[0];
    return stationPrices.filter(price => 
      (price.status === 'active' || price.status === 'approved') && 
      price.effective_date <= today && 
      (!price.end_date || price.end_date >= today)
    );
  };

  const getCurrentOMCPrices = () => {
    const today = new Date().toISOString().split('T')[0];
    return omcPrices.filter(price => 
      price.status === 'active' && 
      price.effective_date <= today && 
      (!price.end_date || price.end_date >= today)
    );
  };

  const canManagePriceCaps = () => {
    return userContext?.role === 'admin' || userContext?.role === 'npa';
  };

  const canManageOMCPrices = () => {
    return userContext?.role === 'admin' || userContext?.role === 'npa' || userContext?.role === 'omc';
  };

  const canManageStationPrices = () => {
    return userContext?.role === 'admin' || userContext?.role === 'npa' || userContext?.role === 'omc' || userContext?.role === 'station';
  };

  const getCurrentUserStations = () => {
    if (userContext?.role === 'station' && userContext.station_id) {
      return stations.filter(station => station.id === userContext.station_id);
    } else if (userContext?.role === 'omc' && userContext.omc_id) {
      return stations.filter(station => station.omc_id === userContext.omc_id);
    }
    return stations;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      let response;
      let successMessage = "";

      if (formType === 'price-cap') {
        const priceCapData = {
          product_id: priceCapFormData.product_id,
          price_cap: parseFloat(priceCapFormData.price_cap),
          effective_date: priceCapFormData.effective_date,
          end_date: priceCapFormData.end_date || undefined,
          notes: priceCapFormData.notes || undefined
        };
        response = await api.setPriceCap(priceCapData);
        successMessage = "Price cap created successfully";
      } else if (formType === 'station-price') {
        const stationPriceData = {
          station_id: stationPriceFormData.station_id,
          product_id: stationPriceFormData.product_id,
          selling_price: parseFloat(stationPriceFormData.selling_price),
          effective_date: stationPriceFormData.effective_date,
          end_date: stationPriceFormData.end_date || undefined,
          is_auto_adjusted: stationPriceFormData.is_auto_adjusted,
          notes: stationPriceFormData.notes || undefined
        };
        response = await api.setStationPrice(stationPriceData);
        successMessage = "Station price set successfully";
      } else if (formType === 'omc-price') {
        const omcPriceData = {
          product_id: omcPriceFormData.product_id,
          recommended_price: parseFloat(omcPriceFormData.recommended_price),
          effective_date: omcPriceFormData.effective_date,
          end_date: omcPriceFormData.end_date || undefined,
          notes: omcPriceFormData.notes || undefined
        };
        response = await api.setOMCRecommendedPrice(omcPriceData);
        successMessage = "OMC recommended price set successfully";
      }

      if (response?.success) {
        await initializeData();
        setShowForm(false);
        resetForms();
        toast({
          title: "Success",
          description: successMessage,
        });
      } else {
        throw new Error(response?.error || "Failed to save price");
      }

    } catch (error: any) {
      console.error('Error saving price:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save price",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForms = () => {
    setPriceCapFormData({
      product_id: '',
      price_cap: '',
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notes: ''
    });
    setStationPriceFormData({
      station_id: userContext?.role === 'station' ? userContext.station_id || '' : '',
      product_id: '',
      selling_price: '',
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_auto_adjusted: true,
      notes: ''
    });
    setOmcPriceFormData({
      product_id: '',
      recommended_price: '',
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notes: ''
    });
  };

  const handleEdit = (item: PriceCap | StationPrice | OMCPrice, type: 'price-cap' | 'station-price' | 'omc-price') => {
    // For mobile, we'll just open the form with the item data
    setFormType(type);
    if (type === 'price-cap') {
      const priceCap = item as PriceCap;
      setPriceCapFormData({
        product_id: priceCap.product_id,
        price_cap: priceCap.price_cap.toString(),
        effective_date: priceCap.effective_date,
        end_date: priceCap.end_date || '',
        notes: priceCap.notes || ''
      });
    } else if (type === 'station-price') {
      const stationPrice = item as StationPrice;
      setStationPriceFormData({
        station_id: stationPrice.station_id,
        product_id: stationPrice.product_id,
        selling_price: stationPrice.selling_price.toString(),
        effective_date: stationPrice.effective_date,
        end_date: stationPrice.end_date || '',
        is_auto_adjusted: stationPrice.is_auto_adjusted,
        notes: stationPrice.notes || ''
      });
    }
    setShowForm(true);
  };

  const handleDelete = async (itemId: string, type: 'price-cap' | 'station-price' | 'omc-price') => {
    if (!confirm("Are you sure you want to delete this price?")) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (type === 'price-cap') {
        setPriceCaps(prev => prev.filter(cap => cap.id !== itemId));
      } else if (type === 'station-price') {
        setStationPrices(prev => prev.filter(price => price.id !== itemId));
      } else if (type === 'omc-price') {
        setOmcPrices(prev => prev.filter(price => price.id !== itemId));
      }

      toast({
        title: "Success",
        description: "Price deleted successfully",
      });

    } catch (error) {
      console.error('Error deleting price:', error);
      toast({
        title: "Error",
        description: "Failed to delete price",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await initializeData();
      toast({
        title: "Refreshed",
        description: "Price data updated",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
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

  const MobilePriceItemSkeleton = () => (
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
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-gray-200 rounded"></div>
          <div className="flex gap-1">
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-gray-200 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>

        <MobileStatsSkeleton />

        {/* Navigation Skeleton */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['Summary', 'Caps', 'OMC', 'Station'].map((item) => (
            <div key={item} className="h-8 w-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MobilePriceItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const renderSummary = () => (
    <div className="space-y-4">
      <MobileStatsCard
        title="Price Caps"
        value={priceSummary.activePriceCaps.toString()}
        subtitle={`Active of ${priceSummary.totalPriceCaps}`}
        icon={Fuel}
        color="text-blue-600"
        bgColor="bg-blue-50"
      />

      <MobileStatsCard
        title="OMC Prices"
        value={priceSummary.activeOMCPrices.toString()}
        subtitle={`Active of ${priceSummary.totalOMCPrices}`}
        icon={Building}
        color="text-green-600"
        bgColor="bg-green-50"
      />

      <MobileStatsCard
        title="Station Prices"
        value={priceSummary.activeStationPrices.toString()}
        subtitle={`Active of ${priceSummary.totalStationPrices}`}
        icon={Store}
        color="text-purple-600"
        bgColor="bg-purple-50"
      />

      <MobileStatsCard
        title="Avg Margin"
        value={priceSummary.averageMargin.toFixed(3)}
        subtitle="Average station margin"
        icon={TrendingUp}
        color="text-orange-600"
        bgColor="bg-orange-50"
      />

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {canManagePriceCaps() && (
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-1 bg-white hover:bg-gray-50 border-gray-300"
                onClick={() => {
                  setFormType('price-cap');
                  setShowForm(true);
                }}
              >
                <Fuel className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-gray-700">New Price Cap</span>
              </Button>
            )}
            
            {canManageOMCPrices() && (
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-1 bg-white hover:bg-gray-50 border-gray-300"
                onClick={() => {
                  setFormType('omc-price');
                  setShowForm(true);
                }}
              >
                <Building className="w-5 h-5 text-green-600" />
                <span className="text-xs text-gray-700">OMC Price</span>
              </Button>
            )}
            
            {canManageStationPrices() && (
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-1 bg-white hover:bg-gray-50 border-gray-300"
                onClick={() => {
                  setFormType('station-price');
                  setShowForm(true);
                }}
              >
                <Store className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-gray-700">Station Price</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-1 bg-white hover:bg-gray-50 border-gray-300"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
              <span className="text-xs text-gray-700">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPriceCaps = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Price Caps</h2>
        {canManagePriceCaps() && (
          <Button 
            size="sm" 
            style={{ backgroundColor: '#0B2265' }}
            onClick={() => {
              setFormType('price-cap');
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {priceCaps.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No price caps found</p>
        </div>
      ) : (
        <div>
          {priceCaps.map((cap) => (
            <MobilePriceItem
              key={cap.id}
              item={cap}
              type="price-cap"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderOMCPrices = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">OMC Prices</h2>
        {canManageOMCPrices() && (
          <Button 
            size="sm" 
            style={{ backgroundColor: '#0B2265' }}
            onClick={() => {
              setFormType('omc-price');
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {omcPrices.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No OMC prices found</p>
        </div>
      ) : (
        <div>
          {omcPrices.map((price) => (
            <MobilePriceItem
              key={price.id}
              item={price}
              type="omc-price"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderStationPrices = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Station Prices</h2>
        {canManageStationPrices() && (
          <Button 
            size="sm" 
            style={{ backgroundColor: '#0B2265' }}
            onClick={() => {
              setFormType('station-price');
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {stationPrices.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No station prices found</p>
        </div>
      ) : (
        <div>
          {stationPrices.map((price) => (
            <MobilePriceItem
              key={price.id}
              item={price}
              type="station-price"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderForm = () => {
    const getFormTitle = () => {
      switch (formType) {
        case 'price-cap': return 'New Price Cap';
        case 'omc-price': return 'OMC Recommended Price';
        case 'station-price': return 'Station Selling Price';
        default: return 'Set Price';
      }
    };

    const getButtonColor = () => {
      switch (formType) {
        case 'price-cap': return 'bg-blue-600 hover:bg-blue-700';
        case 'omc-price': return 'bg-green-600 hover:bg-green-700';
        case 'station-price': return 'bg-purple-600 hover:bg-purple-700';
        default: return 'bg-blue-600 hover:bg-blue-700';
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
        <div className="bg-white rounded-t-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{getFormTitle()}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                resetForms();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleFormSubmit} className="p-4 space-y-4">
            {/* Product Selection */}
            <MobileFormSection title="Product Information">
              <div>
                <Label htmlFor="product" className="text-sm">Product *</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900 text-sm"
                  value={
                    formType === 'price-cap' ? priceCapFormData.product_id :
                    formType === 'station-price' ? stationPriceFormData.product_id :
                    omcPriceFormData.product_id
                  }
                  onChange={(e) => {
                    if (formType === 'price-cap') {
                      setPriceCapFormData(prev => ({ ...prev, product_id: e.target.value }));
                    } else if (formType === 'station-price') {
                      setStationPriceFormData(prev => ({ ...prev, product_id: e.target.value }));
                    } else {
                      setOmcPriceFormData(prev => ({ ...prev, product_id: e.target.value }));
                    }
                  }}
                  required
                >
                  <option value="">Select product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
              </div>
            </MobileFormSection>

            {/* Station Selection (for station prices) */}
            {formType === 'station-price' && userContext?.role !== 'station' && (
              <MobileFormSection title="Station Information">
                <div>
                  <Label htmlFor="station" className="text-sm">Station *</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-white text-gray-900 text-sm"
                    value={stationPriceFormData.station_id}
                    onChange={(e) => setStationPriceFormData(prev => ({ ...prev, station_id: e.target.value }))}
                    required
                  >
                    <option value="">Select station</option>
                    {getCurrentUserStations().map(station => (
                      <option key={station.id} value={station.id}>
                        {station.name} {station.omc_name && `(${station.omc_name})`}
                      </option>
                    ))}
                  </select>
                </div>
              </MobileFormSection>
            )}

            {/* Price Input */}
            <MobileFormSection title="Price Details">
              <div>
                <Label htmlFor="price" className="text-sm">
                  {formType === 'price-cap' ? 'Maximum Price (₵) *' :
                   formType === 'omc-price' ? 'Recommended Price (₵) *' :
                   'Selling Price (₵) *'}
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="12.800"
                  value={
                    formType === 'price-cap' ? priceCapFormData.price_cap :
                    formType === 'station-price' ? stationPriceFormData.selling_price :
                    omcPriceFormData.recommended_price
                  }
                  onChange={(e) => {
                    if (formType === 'price-cap') {
                      setPriceCapFormData(prev => ({ ...prev, price_cap: e.target.value }));
                    } else if (formType === 'station-price') {
                      setStationPriceFormData(prev => ({ ...prev, selling_price: e.target.value }));
                    } else {
                      setOmcPriceFormData(prev => ({ ...prev, recommended_price: e.target.value }));
                    }
                  }}
                  required
                  className="bg-white text-gray-900 text-sm"
                />
              </div>
            </MobileFormSection>

            {/* Auto-adjust (for station prices) */}
            {formType === 'station-price' && (
              <MobileFormSection title="Price Settings">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="auto-adjusted" className="text-sm">Auto-adjust with price caps</Label>
                  <Switch
                    checked={stationPriceFormData.is_auto_adjusted}
                    onCheckedChange={(checked) => setStationPriceFormData(prev => ({ ...prev, is_auto_adjusted: checked }))}
                  />
                </div>
              </MobileFormSection>
            )}

            {/* Date Information */}
            <MobileFormSection title="Date Information">
              <div>
                <Label htmlFor="effective" className="text-sm">Effective From *</Label>
                <Input
                  id="effective"
                  type="date"
                  value={
                    formType === 'price-cap' ? priceCapFormData.effective_date :
                    formType === 'station-price' ? stationPriceFormData.effective_date :
                    omcPriceFormData.effective_date
                  }
                  onChange={(e) => {
                    if (formType === 'price-cap') {
                      setPriceCapFormData(prev => ({ ...prev, effective_date: e.target.value }));
                    } else if (formType === 'station-price') {
                      setStationPriceFormData(prev => ({ ...prev, effective_date: e.target.value }));
                    } else {
                      setOmcPriceFormData(prev => ({ ...prev, effective_date: e.target.value }));
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="bg-white text-gray-900 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="end_date" className="text-sm">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={
                    formType === 'price-cap' ? priceCapFormData.end_date :
                    formType === 'station-price' ? stationPriceFormData.end_date :
                    omcPriceFormData.end_date
                  }
                  onChange={(e) => {
                    if (formType === 'price-cap') {
                      setPriceCapFormData(prev => ({ ...prev, end_date: e.target.value }));
                    } else if (formType === 'station-price') {
                      setStationPriceFormData(prev => ({ ...prev, end_date: e.target.value }));
                    } else {
                      setOmcPriceFormData(prev => ({ ...prev, end_date: e.target.value }));
                    }
                  }}
                  min={
                    formType === 'price-cap' ? priceCapFormData.effective_date :
                    formType === 'station-price' ? stationPriceFormData.effective_date :
                    omcPriceFormData.effective_date
                  }
                  className="bg-white text-gray-900 text-sm"
                />
              </div>
            </MobileFormSection>

            {/* Notes */}
            <MobileFormSection title="Additional Information">
              <div>
                <Label htmlFor="notes" className="text-sm">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Additional information..."
                  value={
                    formType === 'price-cap' ? priceCapFormData.notes :
                    formType === 'station-price' ? stationPriceFormData.notes :
                    omcPriceFormData.notes
                  }
                  onChange={(e) => {
                    if (formType === 'price-cap') {
                      setPriceCapFormData(prev => ({ ...prev, notes: e.target.value }));
                    } else if (formType === 'station-price') {
                      setStationPriceFormData(prev => ({ ...prev, notes: e.target.value }));
                    } else {
                      setOmcPriceFormData(prev => ({ ...prev, notes: e.target.value }));
                    }
                  }}
                  className="bg-white text-gray-900 text-sm"
                />
              </div>
            </MobileFormSection>

            <Button 
              type="submit" 
              className={`w-full ${getButtonColor()}`} 
              disabled={submitting}
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {formType === 'price-cap' ? 'Set Price Cap' :
               formType === 'omc-price' ? 'Set Recommended Price' :
               'Set Station Price'}
            </Button>
          </form>
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
            <h1 className="text-xl font-bold text-gray-900">Price Management</h1>
            <p className="text-xs text-gray-600">
              {userContext ? `${userContext.role} view` : 'Manage prices'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="w-8 h-8 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
            <TabsTrigger value="price-caps" className="text-xs">Caps</TabsTrigger>
            <TabsTrigger value="omc-prices" className="text-xs">OMC</TabsTrigger>
            <TabsTrigger value="station-prices" className="text-xs">Station</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content Sections */}
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'price-caps' && renderPriceCaps()}
        {activeTab === 'omc-prices' && renderOMCPrices()}
        {activeTab === 'station-prices' && renderStationPrices()}
      </div>

      {/* Floating Action Button */}
      {(canManagePriceCaps() || canManageOMCPrices() || canManageStationPrices()) && (
        <div className="fixed bottom-20 right-4">
          <Button
            size="lg"
            className="rounded-full w-12 h-12 shadow-2xl"
            style={{ backgroundColor: '#0B2265' }}
            onClick={() => {
              // Default to station price form for station managers, otherwise show selection
              if (userContext?.role === 'station') {
                setFormType('station-price');
                setShowForm(true);
              } else {
                // For now, default to station price form
                setFormType('station-price');
                setShowForm(true);
              }
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && renderForm()}
    </div>
  );
}