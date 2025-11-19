import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Save, X, Download, RefreshCw, AlertTriangle, FileText, Building, Fuel, Store, TrendingUp, Users, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

// Types for price data
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

interface PriceCapFormData {
  product_id: string;
  scope: 'national' | 'omc';
  omc_id: string;
  price_cap: string;
  effective_date: string;
  end_date: string;
  notes: string;
}

interface StationPriceFormData {
  station_id: string;
  product_id: string;
  selling_price: string;
  effective_date: string;
  end_date: string;
  is_auto_adjusted: boolean;
  notes: string;
}

interface OMCPriceFormData {
  product_id: string;
  recommended_price: string;
  effective_date: string;
  end_date: string;
  notes: string;
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

// Company branding configuration
const COMPANY_CONFIG = {
  WEBSITE_URL: "https://pumpguard.gov.gh",
  DEFAULT_LOGO: "/logo.png",
  COMPANY_NAME: "PumpGuard Regulatory System",
  AUTHORITY_NAME: "National Petroleum Authority",
  CONTACT_EMAIL: "info@pumpguard.gov.gh",
  CONTACT_PHONE: "+233 30 123 4567"
};

export default function PriceManager() {
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PriceCapFormData>>({});
  const [exporting, setExporting] = useState(false);
  const [priceSummary, setPriceSummary] = useState<PriceSummary>({
    totalPriceCaps: 0,
    activePriceCaps: 0,
    totalOMCPrices: 0,
    activeOMCPrices: 0,
    totalStationPrices: 0,
    activeStationPrices: 0,
    averageMargin: 0
  });
  
  const [priceCapFormData, setPriceCapFormData] = useState<PriceCapFormData>({
    product_id: '',
    scope: 'national',
    omc_id: '',
    price_cap: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  const [stationPriceFormData, setStationPriceFormData] = useState<StationPriceFormData>({
    station_id: '',
    product_id: '',
    selling_price: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_auto_adjusted: true,
    notes: ''
  });

  const [omcPriceFormData, setOmcPriceFormData] = useState<OMCPriceFormData>({
    product_id: '',
    recommended_price: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
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
        
        // Set station ID for station managers immediately
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
      
      // Load dependent data
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
    
    // Calculate average margin
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
        // Ensure we have product names
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

  // Form Handlers
  const handlePriceCapFormChange = (field: keyof PriceCapFormData, value: string) => {
    setPriceCapFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'scope' && value === 'national') {
      setPriceCapFormData(prev => ({
        ...prev,
        omc_id: ''
      }));
    }
  };

  const handleStationPriceFormChange = (field: keyof StationPriceFormData, value: string | boolean) => {
    setStationPriceFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOMCPriceFormChange = (field: keyof OMCPriceFormData, value: string) => {
    setOmcPriceFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validation Functions
  const validatePriceCapForm = (data: PriceCapFormData): string | null => {
    if (!data.product_id) return "Product is required";
    if (!data.price_cap || parseFloat(data.price_cap) <= 0) return "Valid price is required";
    if (!data.effective_date) return "Effective date is required";
    if (data.scope === 'omc' && !data.omc_id) return "OMC is required for OMC-specific caps";
    
    const effectiveDate = new Date(data.effective_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (effectiveDate < today) return "Effective date cannot be in the past";
    
    if (data.end_date) {
      const endDate = new Date(data.end_date);
      if (endDate <= effectiveDate) return "End date must be after effective date";
    }
    
    return null;
  };

  const validateStationPriceForm = (data: StationPriceFormData): string | null => {
    if (!data.station_id) return "Station is required";
    if (!data.product_id) return "Product is required";
    if (!data.selling_price || parseFloat(data.selling_price) <= 0) return "Valid selling price is required";
    if (!data.effective_date) return "Effective date is required";
    
    const effectiveDate = new Date(data.effective_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (effectiveDate < today) return "Effective date cannot be in the past";
    
    if (data.end_date) {
      const endDate = new Date(data.end_date);
      if (endDate <= effectiveDate) return "End date must be after effective date";
    }
    
    return null;
  };

  const validateOMCPriceForm = (data: OMCPriceFormData): string | null => {
    if (!data.product_id) return "Product is required";
    if (!data.recommended_price || parseFloat(data.recommended_price) <= 0) return "Valid recommended price is required";
    if (!data.effective_date) return "Effective date is required";
    
    const effectiveDate = new Date(data.effective_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (effectiveDate < today) return "Effective date cannot be in the past";
    
    if (data.end_date) {
      const endDate = new Date(data.end_date);
      if (endDate <= effectiveDate) return "End date must be after effective date";
    }
    
    return null;
  };

  // Submit Handlers
  const handlePriceCapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validatePriceCapForm(priceCapFormData);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      const priceCapData = {
        product_id: priceCapFormData.product_id,
        price_cap: parseFloat(priceCapFormData.price_cap),
        effective_date: priceCapFormData.effective_date,
        end_date: priceCapFormData.end_date || undefined,
        notes: priceCapFormData.notes || undefined,
        scope: priceCapFormData.scope,
        omc_id: priceCapFormData.omc_id || undefined
      };

      const response = await api.setPriceCap(priceCapData);
      
      if (response.success) {
        await loadPriceCaps();
        
        setPriceCapFormData({
          product_id: '',
          scope: 'national',
          omc_id: '',
          price_cap: '',
          effective_date: new Date().toISOString().split('T')[0],
          end_date: '',
          notes: ''
        });

        toast({
          title: "Success",
          description: "Price cap created successfully",
        });
      } else {
        throw new Error(response.error || "Failed to create price cap");
      }

    } catch (error: any) {
      console.error('Error creating price cap:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create price cap",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStationPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateStationPriceForm(stationPriceFormData);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      const stationPriceData = {
        station_id: stationPriceFormData.station_id,
        product_id: stationPriceFormData.product_id,
        selling_price: parseFloat(stationPriceFormData.selling_price),
        effective_date: stationPriceFormData.effective_date,
        end_date: stationPriceFormData.end_date || undefined,
        is_auto_adjusted: stationPriceFormData.is_auto_adjusted,
        notes: stationPriceFormData.notes || undefined
      };

      const response = await api.setStationPrice(stationPriceData);
      
      if (response.success) {
        await loadStationPrices();
        
        setStationPriceFormData({
          station_id: userContext?.role === 'station' ? userContext.station_id || '' : '',
          product_id: '',
          selling_price: '',
          effective_date: new Date().toISOString().split('T')[0],
          end_date: '',
          is_auto_adjusted: true,
          notes: ''
        });

        toast({
          title: "Success",
          description: "Station price set successfully",
        });
      } else {
        throw new Error(response.error || "Failed to set station price");
      }

    } catch (error: any) {
      console.error('Error setting station price:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set station price",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOMCPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateOMCPriceForm(omcPriceFormData);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      const omcPriceData = {
        product_id: omcPriceFormData.product_id,
        recommended_price: parseFloat(omcPriceFormData.recommended_price),
        effective_date: omcPriceFormData.effective_date,
        end_date: omcPriceFormData.end_date || undefined,
        notes: omcPriceFormData.notes || undefined
      };

      const response = await api.setOMCRecommendedPrice(omcPriceData);
      
      if (response.success) {
        await loadOMCPrices();
        
        setOmcPriceFormData({
          product_id: '',
          recommended_price: '',
          effective_date: new Date().toISOString().split('T')[0],
          end_date: '',
          notes: ''
        });

        toast({
          title: "Success",
          description: "OMC recommended price set successfully",
        });
      } else {
        throw new Error(response.error || "Failed to set OMC recommended price");
      }

    } catch (error: any) {
      console.error('Error setting OMC price:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set OMC recommended price",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: PriceCap | StationPrice | OMCPrice, type: 'price-cap' | 'station-price' | 'omc-price') => {
    setEditingId(item.id);
    if (type === 'price-cap') {
      const priceCap = item as PriceCap;
      setEditFormData({
        product_id: priceCap.product_id,
        price_cap: priceCap.price_cap.toString(),
        effective_date: priceCap.effective_date,
        end_date: priceCap.end_date || '',
        notes: priceCap.notes || ''
      });
    }
  };

  const handleSaveEdit = async (itemId: string, type: 'price-cap' | 'station-price' | 'omc-price') => {
    if (!editFormData.price_cap || !editFormData.effective_date) {
      toast({
        title: "Error",
        description: "Price and effective date are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await loadPriceCaps();
      setEditingId(null);
      setEditFormData({});

      toast({
        title: "Success",
        description: "Price updated successfully",
      });

    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: "Error",
        description: "Failed to update price",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleDelete = async (itemId: string, type: 'price-cap' | 'station-price' | 'omc-price') => {
    if (!confirm("Are you sure you want to delete this price? This action cannot be undone.")) {
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'expired': return 'outline';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-500" />
          <p className="text-gray-600">Loading price data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Price Management System</h1>
          <p className="text-gray-600">
            {userContext ? `Manage prices across all levels (${userContext.role} view)` : 'Manage prices across all levels'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Price Summary</TabsTrigger>
          <TabsTrigger value="price-caps">Price Caps</TabsTrigger>
          <TabsTrigger value="omc-prices">OMC Prices</TabsTrigger>
          <TabsTrigger value="station-prices">Station Prices</TabsTrigger>
        </TabsList>

        {/* Price Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Price Caps Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Price Caps</CardTitle>
                <Fuel className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{priceSummary.activePriceCaps}</div>
                <p className="text-xs text-muted-foreground">
                  Active of {priceSummary.totalPriceCaps} total
                </p>
                <div className="mt-2">
                  <Badge variant={priceSummary.activePriceCaps > 0 ? "default" : "secondary"}>
                    {priceSummary.activePriceCaps > 0 ? "Active" : "No Active Caps"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* OMC Prices Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">OMC Prices</CardTitle>
                <Building className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{priceSummary.activeOMCPrices}</div>
                <p className="text-xs text-muted-foreground">
                  Active of {priceSummary.totalOMCPrices} total
                </p>
                <div className="mt-2">
                  <Badge variant={priceSummary.activeOMCPrices > 0 ? "default" : "secondary"}>
                    {priceSummary.activeOMCPrices > 0 ? "Active" : "No OMC Prices"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Station Prices Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Station Prices</CardTitle>
                <Store className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{priceSummary.activeStationPrices}</div>
                <p className="text-xs text-muted-foreground">
                  Active of {priceSummary.totalStationPrices} total
                </p>
                <div className="mt-2">
                  <Badge variant={priceSummary.activeStationPrices > 0 ? "default" : "secondary"}>
                    {priceSummary.activeStationPrices > 0 ? "Active" : "No Station Prices"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Average Margin Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{priceSummary.averageMargin.toFixed(3)}</div>
                <p className="text-xs text-muted-foreground">
                  Average station margin
                </p>
                <div className="mt-2">
                  <Badge variant={priceSummary.averageMargin >= 0 ? "default" : "destructive"}>
                    {priceSummary.averageMargin >= 0 ? "Positive" : "Negative"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Price Caps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Fuel className="w-5 h-5 mr-2 text-blue-600" />
                  Active Price Caps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getCurrentPriceCaps().length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No active price caps
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getCurrentPriceCaps().slice(0, 5).map((cap) => (
                      <div key={cap.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{cap.product_name}</div>
                          <div className="text-sm text-gray-600">
                            Effective: {new Date(cap.effective_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            ₵{cap.price_cap.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">
                            per {products.find(p => p.id === cap.product_id)?.unit || 'L'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Station Prices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="w-5 h-5 mr-2 text-purple-600" />
                  Recent Station Prices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getCurrentStationPrices().length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No active station prices
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getCurrentStationPrices().slice(0, 5).map((price) => (
                      <div key={price.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{price.station_name}</div>
                          <div className="text-sm text-gray-600">{price.product_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">
                            ₵{price.selling_price.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {price.margin && (
                              <span className={price.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {price.margin >= 0 ? '+' : ''}{price.margin.toFixed(3)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Price Caps Tab */}
        <TabsContent value="price-caps">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create New Price Cap */}
            {canManagePriceCaps() && (
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Set New Price Cap</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePriceCapSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="product">Product *</Label>
                      <Select 
                        value={priceCapFormData.product_id} 
                        onValueChange={(value) => handlePriceCapFormChange('product_id', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scope">Scope *</Label>
                      <Select 
                        value={priceCapFormData.scope} 
                        onValueChange={(value: 'national' | 'omc') => handlePriceCapFormChange('scope', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="national">National Cap</SelectItem>
                          <SelectItem value="omc">OMC-Specific</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {priceCapFormData.scope === 'omc' && (
                      <div className="space-y-2">
                        <Label htmlFor="omc">OMC *</Label>
                        <Select 
                          value={priceCapFormData.omc_id} 
                          onValueChange={(value) => handlePriceCapFormChange('omc_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select OMC" />
                          </SelectTrigger>
                          <SelectContent>
                            {omcs.map(omc => (
                              <SelectItem key={omc.id} value={omc.id}>
                                {omc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="price">
                        Maximum Price (₵) *
                      </Label>
                      <Input 
                        id="price" 
                        type="number" 
                        step="0.001" 
                        min="0"
                        placeholder="12.800" 
                        value={priceCapFormData.price_cap}
                        onChange={(e) => handlePriceCapFormChange('price_cap', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="effective">Effective From *</Label>
                      <Input 
                        id="effective" 
                        type="date" 
                        value={priceCapFormData.effective_date}
                        onChange={(e) => handlePriceCapFormChange('effective_date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date (Optional)</Label>
                      <Input 
                        id="end_date" 
                        type="date" 
                        value={priceCapFormData.end_date}
                        onChange={(e) => handlePriceCapFormChange('end_date', e.target.value)}
                        min={priceCapFormData.effective_date}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Input 
                        id="notes" 
                        placeholder="Additional information..."
                        value={priceCapFormData.notes}
                        onChange={(e) => handlePriceCapFormChange('notes', e.target.value)}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700" 
                      disabled={submitting}
                    >
                      {submitting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Set Price Cap
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Price Caps Table */}
            <Card className={canManagePriceCaps() ? "lg:col-span-2" : "lg:col-span-3"}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Price Caps</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {priceCaps.length} total
                  </Badge>
                  <Badge variant="default">
                    {getCurrentPriceCaps().length} active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {priceCaps.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No price caps found</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price Cap</TableHead>
                          <TableHead>Effective</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Status</TableHead>
                          {canManagePriceCaps() && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceCaps.map((cap) => (
                          <TableRow key={cap.id} className={
                            cap.status === 'active' ? 'bg-green-50' : ''
                          }>
                            <TableCell className="font-medium">
                              {cap.product_name}
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                ₵{cap.price_cap.toFixed(3)}
                                <span className="text-sm font-normal text-gray-600 ml-1">
                                  /{products.find(p => p.id === cap.product_id)?.unit || 'L'}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(cap.effective_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {cap.end_date ? new Date(cap.end_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(cap.status)}>
                                {cap.status}
                              </Badge>
                            </TableCell>
                            {canManagePriceCaps() && (
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleEdit(cap, 'price-cap')}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDelete(cap.id, 'price-cap')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OMC Prices Tab */}
        <TabsContent value="omc-prices">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create New OMC Price */}
            {canManageOMCPrices() && (
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Set OMC Recommended Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleOMCPriceSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="omc-product">Product *</Label>
                      <Select 
                        value={omcPriceFormData.product_id} 
                        onValueChange={(value) => handleOMCPriceFormChange('product_id', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recommended-price">
                        Recommended Price (₵) *
                      </Label>
                      <Input 
                        id="recommended-price" 
                        type="number" 
                        step="0.001" 
                        min="0"
                        placeholder="12.500" 
                        value={omcPriceFormData.recommended_price}
                        onChange={(e) => handleOMCPriceFormChange('recommended_price', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="omc-effective">Effective From *</Label>
                      <Input 
                        id="omc-effective" 
                        type="date" 
                        value={omcPriceFormData.effective_date}
                        onChange={(e) => handleOMCPriceFormChange('effective_date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="omc-end-date">End Date (Optional)</Label>
                      <Input 
                        id="omc-end-date" 
                        type="date" 
                        value={omcPriceFormData.end_date}
                        onChange={(e) => handleOMCPriceFormChange('end_date', e.target.value)}
                        min={omcPriceFormData.effective_date}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="omc-notes">Notes (Optional)</Label>
                      <Input 
                        id="omc-notes" 
                        placeholder="Additional information..."
                        value={omcPriceFormData.notes}
                        onChange={(e) => handleOMCPriceFormChange('notes', e.target.value)}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      disabled={submitting}
                    >
                      {submitting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Set Recommended Price
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* OMC Prices Table */}
            <Card className={canManageOMCPrices() ? "lg:col-span-2" : "lg:col-span-3"}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>OMC Recommended Prices</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {omcPrices.length} total
                  </Badge>
                  <Badge variant="default">
                    {getCurrentOMCPrices().length} active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {omcPrices.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No OMC prices found</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>OMC</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Recommended Price</TableHead>
                          <TableHead>Price Cap</TableHead>
                          <TableHead>Effective</TableHead>
                          <TableHead>Status</TableHead>
                          {canManageOMCPrices() && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {omcPrices.map((price) => (
                          <TableRow key={price.id} className={
                            price.status === 'active' ? 'bg-green-50' : ''
                          }>
                            <TableCell className="font-medium">
                              {price.omc_name}
                            </TableCell>
                            <TableCell>
                              {price.product_name}
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                ₵{price.recommended_price.toFixed(3)}
                                <span className="text-sm font-normal text-gray-600 ml-1">
                                  /{products.find(p => p.id === price.product_id)?.unit || 'L'}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                ₵{price.price_cap_amount?.toFixed(3) || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(price.effective_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(price.status)}>
                                {price.status}
                              </Badge>
                            </TableCell>
                            {canManageOMCPrices() && (
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDelete(price.id, 'omc-price')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Station Prices Tab */}
        <TabsContent value="station-prices">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create New Station Price */}
            {canManageStationPrices() && (
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Set Station Selling Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleStationPriceSubmit} className="space-y-4">
                    {userContext?.role !== 'station' && (
                      <div className="space-y-2">
                        <Label htmlFor="station">Station *</Label>
                        <Select 
                          value={stationPriceFormData.station_id} 
                          onValueChange={(value) => handleStationPriceFormChange('station_id', value)}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select station" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCurrentUserStations().map(station => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name} {station.omc_name && `(${station.omc_name})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="station-product">Product *</Label>
                      <Select 
                        value={stationPriceFormData.product_id} 
                        onValueChange={(value) => handleStationPriceFormChange('product_id', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="selling-price">
                        Selling Price (₵) *
                      </Label>
                      <Input 
                        id="selling-price" 
                        type="number" 
                        step="0.001" 
                        min="0"
                        placeholder="12.600" 
                        value={stationPriceFormData.selling_price}
                        onChange={(e) => handleStationPriceFormChange('selling_price', e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={stationPriceFormData.is_auto_adjusted}
                        onCheckedChange={(checked) => handleStationPriceFormChange('is_auto_adjusted', checked)}
                      />
                      <Label htmlFor="auto-adjusted">Auto-adjust with price caps</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="station-effective">Effective From *</Label>
                      <Input 
                        id="station-effective" 
                        type="date" 
                        value={stationPriceFormData.effective_date}
                        onChange={(e) => handleStationPriceFormChange('effective_date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="station-end-date">End Date (Optional)</Label>
                      <Input 
                        id="station-end-date" 
                        type="date" 
                        value={stationPriceFormData.end_date}
                        onChange={(e) => handleStationPriceFormChange('end_date', e.target.value)}
                        min={stationPriceFormData.effective_date}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="station-notes">Notes (Optional)</Label>
                      <Input 
                        id="station-notes" 
                        placeholder="Additional information..."
                        value={stationPriceFormData.notes}
                        onChange={(e) => handleStationPriceFormChange('notes', e.target.value)}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-purple-600 hover:bg-purple-700" 
                      disabled={submitting}
                    >
                      {submitting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Set Station Price
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Station Prices Table */}
            <Card className={canManageStationPrices() ? "lg:col-span-2" : "lg:col-span-3"}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Station Selling Prices</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {stationPrices.length} total
                  </Badge>
                  <Badge variant="default">
                    {getCurrentStationPrices().length} active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {stationPrices.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No station prices found</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Station</TableHead>
                          <TableHead>OMC</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Selling Price</TableHead>
                          <TableHead>Price Cap</TableHead>
                          <TableHead>Margin</TableHead>
                          <TableHead>Auto-adjusted</TableHead>
                          <TableHead>Status</TableHead>
                          {canManageStationPrices() && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stationPrices.map((price) => (
                          <TableRow key={price.id} className={
                            (price.status === 'active' || price.status === 'approved') ? 'bg-green-50' : ''
                          }>
                            <TableCell className="font-medium">
                              {price.station_name}
                            </TableCell>
                            <TableCell>
                              {price.omc_name}
                            </TableCell>
                            <TableCell>
                              {price.product_name}
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                ₵{price.selling_price.toFixed(3)}
                                <span className="text-sm font-normal text-gray-600 ml-1">
                                  /{products.find(p => p.id === price.product_id)?.unit || 'L'}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                ₵{price.price_cap_amount?.toFixed(3) || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-sm font-medium ${(price.margin || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {price.margin ? `${price.margin > 0 ? '+' : ''}${price.margin.toFixed(3)}` : 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={price.is_auto_adjusted ? 'default' : 'outline'}>
                                {price.is_auto_adjusted ? 'Yes' : 'No'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(price.status)}>
                                {price.status}
                              </Badge>
                            </TableCell>
                            {canManageStationPrices() && (
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDelete(price.id, 'station-price')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Role-based information */}
      {!canManagePriceCaps() && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {userContext?.role === 'omc' 
                  ? "You can manage OMC recommended prices and station prices for your OMC." 
                  : userContext?.role === 'station'
                  ? "You can manage selling prices for your station."
                  : "Contact administrator for price management permissions."}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}