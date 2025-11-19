import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ScrollArea } from '../../components/ui/scroll-area';
import { 
  Clock, Users, DollarSign, Droplet, CheckCircle, AlertCircle, 
  Play, StopCircle, RefreshCw, TrendingUp, Calendar, 
  ChevronRight, ChevronLeft, Building2, Fuel, BarChart3,
  MapPin, User as UserIcon, Zap, Download, Plus,
  Search, Filter, MoreHorizontal, Edit, Trash2, Gauge,
  Wrench, Activity, Menu
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  api, 
  Shift, 
  CreateShiftRequest, 
  EndShiftRequest, 
  ShiftFilters,
  Attendant,
  CreateAttendantRequest,
  UpdateAttendantRequest,
  Pump,
  CreatePumpRequest,
  UpdatePumpRequest,
  Station,
  OMC
} from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PriceContext } from '@/contexts/PriceContext';
import { supabase } from '@/utils/supabase-client';

interface ShiftManagementProps {
  stationId?: string;
  compact?: boolean;
  onShiftUpdate?: () => void;
}

interface StartFormData {
  user_id: string;
  attendant_name: string;
  pump_id: string;
  fuel_type: 'petrol' | 'diesel' | 'lpg' | 'premium_petrol';
  opening_meter: number;
  opening_cash: number;
  price_per_liter: number;
  station_id: string;
}

interface EndFormData {
  closing_meter: number;
  closing_cash: number;
  notes: string;
}

interface AttendantFormData {
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  station_id: string;
}

interface PumpFormData {
  name: string;
  number: string;
  fuel_type: 'petrol' | 'diesel' | 'lpg' | 'premium_petrol';
  manufacturer: string;
  model: string;
  serial_number: string;
  installation_date: string;
  status: 'active' | 'inactive' | 'maintenance' | 'out_of_order';
}

type FormStep = 'selection' | 'details';
type ShiftStatus = 'active' | 'closed' | 'pending_reconciliation' | 'cancelled';
type ActiveTab = 'shifts' | 'attendants' | 'pumps';

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

const ShiftAnalytics = ({ shifts, open, onOpenChange, stationName }: {
  shifts: Shift[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationName: string;
}) => {
  const analytics = useMemo(() => {
    const completedShifts = shifts.filter(s => s.status === 'closed');
    const totalVolume = completedShifts.reduce((sum, shift) => sum + (shift.total_volume || 0), 0);
    const totalRevenue = completedShifts.reduce((sum, shift) => sum + (shift.total_sales || 0), 0);
    const avgEfficiency = completedShifts.length > 0 
      ? completedShifts.reduce((sum, shift) => sum + (shift.efficiency_rate || 0), 0) / completedShifts.length 
      : 0;
    
    return { 
      totalVolume, 
      totalRevenue, 
      avgEfficiency, 
      completedShifts: completedShifts.length,
      activeShifts: shifts.filter(s => s.status === 'active').length,
      pendingShifts: shifts.filter(s => s.status === 'pending_reconciliation').length
    };
  }, [shifts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full mx-auto bg-white p-4">
        <DialogHeader className="px-1">
          <DialogTitle className="text-lg text-gray-900">Shift Analytics - {stationName}</DialogTitle>
          <DialogDescription className="text-gray-600 text-sm">
            Performance metrics and insights for all shifts
          </DialogDescription>
        </DialogHeader>
        
        <Separator />
        
        <div className="grid grid-cols-1 gap-3 mt-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 mb-1">Total Volume</p>
                <p className="text-xl font-bold text-gray-900">{analytics.totalVolume.toLocaleString()}L</p>
              </div>
              <Droplet className="w-6 h-6 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">₵{analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 mb-1">Avg Efficiency</p>
                <p className="text-xl font-bold text-gray-900">{analytics.avgEfficiency.toFixed(1)} L/h</p>
              </div>
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </Card>
        </div>
        
        <Separator />
        
        <div className="mt-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Shift Summary</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-600">Total Shifts</p>
                <p className="font-semibold">{shifts.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Completed</p>
                <p className="font-semibold">{analytics.completedShifts}</p>
              </div>
              <div>
                <p className="text-gray-600">Active</p>
                <p className="font-semibold">{analytics.activeShifts}</p>
              </div>
              <div>
                <p className="text-gray-600">Pending</p>
                <p className="font-semibold">{analytics.pendingShifts}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StationSelectionStep = ({ 
  user, 
  selectedOMC, 
  selectedStation, 
  availableOMCs, 
  availableStations, 
  stationInfo,
  onOMCChange,
  onStationChange,
  onNextStep 
}: {
  user: any;
  selectedOMC: string;
  selectedStation: string;
  availableOMCs: OMC[];
  availableStations: Station[];
  stationInfo: Station | null;
  onOMCChange: (omcId: string) => void;
  onStationChange: (stationId: string) => void;
  onNextStep: () => void;
}) => (
  <div className="space-y-4">
    {user?.role === 'admin' && (
      <div>
        <Label className="flex items-center gap-2 mb-2 text-gray-700 font-medium text-sm">
          <Building2 className="w-4 h-4" />
          Select OMC
        </Label>
        <Select value={selectedOMC} onValueChange={onOMCChange}>
          <SelectTrigger className="bg-white h-12">
            <SelectValue placeholder="Choose OMC" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-48">
              {availableOMCs.map((omc) => (
                <SelectItem key={omc.id} value={omc.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{omc.name}</span>
                  </div>
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>
    )}
    
    <Separator />
    
    {(user?.role === 'admin' || user?.role === 'omc') && (
      <div>
        <Label className="flex items-center gap-2 mb-2 text-gray-700 font-medium text-sm">
          <MapPin className="w-4 h-4" />
          Select Station *
        </Label>
        <Select value={selectedStation} onValueChange={onStationChange}>
          <SelectTrigger className="bg-white h-12">
            <SelectValue placeholder="Choose station" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-48">
              {availableStations.map((station) => (
                <SelectItem key={station.id} value={station.id}>
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{station.name}</span>
                    <span className="text-xs text-gray-500">{station.code}</span>
                  </div>
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>
    )}
    
    {(user?.role === 'station_manager' || user?.role === 'attendant') && stationInfo && (
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-blue-800 text-sm truncate">{stationInfo.name}</p>
              <p className="text-xs text-blue-600">Code: {stationInfo.code}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
            Assigned
          </Badge>
        </div>
      </div>
    )}
    
    <Separator />
    
    <Button
      onClick={onNextStep}
      className="w-full h-12 text-sm"
      style={{ backgroundColor: '#0B2265' }}
      disabled={!selectedStation}
    >
      Continue to Shift Details
      <ChevronRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
);

const ShiftDetailsStep = ({
  startForm,
  availableStations,
  selectedStation,
  stationInfo,
  availablePumps,
  availableAttendants,
  actionLoading,
  onFormChange,
  onBack,
  onSubmit,
  currentPrices,
  shifts,
  stationPrices
}: {
  startForm: StartFormData;
  availableStations: Station[];
  selectedStation: string;
  stationInfo: Station | null;
  availablePumps: Pump[];
  availableAttendants: Attendant[];
  actionLoading: boolean;
  onFormChange: (field: keyof StartFormData, value: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  currentPrices?: Map<string, number>;
  shifts: Shift[];
  stationPrices?: { product_id: string; selling_price: number; product_name: string }[];
}) => {
  const activePumps = availablePumps.filter(pump => pump.status === 'active');
  const pumpsByFuelType = activePumps.filter(pump => pump.fuel_type === startForm.fuel_type);
  const activeAttendants = availableAttendants.filter(attendant => attendant.is_active);

  const selectedAttendantHasActiveShift = startForm.user_id ? 
    shifts.some(shift => 
      (shift.attendant_id === startForm.user_id || shift.user_id === startForm.user_id) && 
      shift.status === 'active'
    ) : false;

  const getCurrentPrice = () => {
    if (stationPrices && stationPrices.length > 0) {
      const fuelTypeMap = {
        'petrol': 'petrol',
        'diesel': 'diesel', 
        'lpg': 'lpg',
        'premium_petrol': 'premium_petrol'
      };
      
      const productName = fuelTypeMap[startForm.fuel_type];
      const stationPrice = stationPrices.find(sp => 
        sp.product_name?.toLowerCase().includes(productName)
      );
      
      if (stationPrice) {
        return stationPrice.selling_price;
      }
    }
    
    if (currentPrices) {
      const priceKeyMap = {
        'petrol': 'petrol',
        'diesel': 'diesel', 
        'lpg': 'lpg',
        'premium_petrol': 'premium_petrol'
      };
      
      const priceKey = priceKeyMap[startForm.fuel_type];
      const price = currentPrices.get(priceKey);
      if (price) {
        return price;
      }
    }

    return startForm.price_per_liter;
  };

  const currentPrice = getCurrentPrice();

  useEffect(() => {
    const newPrice = getCurrentPrice();
    if (newPrice !== startForm.price_per_liter) {
      onFormChange('price_per_liter', newPrice);
    }
  }, [startForm.fuel_type, stationPrices, currentPrices]);

  return (
    <ScrollArea className="h-[70vh] pr-2">
      <div className="space-y-4 pb-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-blue-800 text-sm truncate">
                  {availableStations.find(s => s.id === selectedStation)?.name || stationInfo?.name}
                </p>
                <p className="text-xs text-blue-600">
                  Code: {availableStations.find(s => s.id === selectedStation)?.code || stationInfo?.code}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Attendant *</Label>
            <Select 
              value={startForm.user_id} 
              onValueChange={(value) => {
                onFormChange('user_id', value);
              }}
            >
              <SelectTrigger className="bg-white h-12">
                <SelectValue placeholder="Select attendant" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-48">
                  {activeAttendants.map((attendant) => {
                    const hasActive = shifts.some(shift => 
                      (shift.attendant_id === attendant.id || shift.user_id === attendant.id) && 
                      shift.status === 'active'
                    );
                    
                    return (
                      <SelectItem 
                        key={attendant.id} 
                        value={attendant.id}
                        disabled={hasActive}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{attendant.full_name}</span>
                          <span className="text-xs text-gray-500 truncate">{attendant.employee_id}</span>
                          {hasActive && (
                            <span className="text-xs text-red-600">Has active shift</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </ScrollArea>
              </SelectContent>
            </Select>
            
            {selectedAttendantHasActiveShift && (
              <Alert className="mt-2 bg-red-50 border-red-200 p-3">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700 text-sm">
                  This attendant already has an active shift. Please end their current shift before starting a new one.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div>
            <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2 text-sm">
              <Fuel className="w-4 h-4" />
              Fuel Type *
            </Label>
            <Select 
              value={startForm.fuel_type} 
              onValueChange={(value: any) => {
                onFormChange('fuel_type', value);
              }}
            >
              <SelectTrigger className="bg-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="lpg">LPG</SelectItem>
                <SelectItem value="premium_petrol">Premium Petrol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-gray-700 font-medium mb-2 text-sm">Pump Assignment *</Label>
          <Select 
            value={startForm.pump_id} 
            onValueChange={(value) => onFormChange('pump_id', value)}
            disabled={pumpsByFuelType.length === 0}
          >
            <SelectTrigger className="bg-white h-12">
              <SelectValue placeholder={
                pumpsByFuelType.length === 0 
                  ? "No available pumps" 
                  : "Select pump"
              } />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-48">
                {pumpsByFuelType.map((pump) => (
                  <SelectItem key={pump.id} value={pump.id}>
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{pump.name}</span>
                        <span className="text-xs text-gray-500 truncate">Serial: {pump.serial_number}</span>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs shrink-0">
                        {pump.number}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
                {pumpsByFuelType.length === 0 && (
                  <SelectItem value="no-pumps" disabled>
                    No active pumps available for {startForm.fuel_type}
                  </SelectItem>
                )}
              </ScrollArea>
            </SelectContent>
          </Select>
          {pumpsByFuelType.length === 0 && (
            <p className="text-sm text-red-600 mt-2">
              No active {startForm.fuel_type} pumps found. Please add pumps first.
            </p>
          )}
        </div>

        <Separator />

        <div>
          <Label className="text-gray-700 font-medium mb-2 text-sm flex items-center gap-2">
            Price per Liter (₵) *
            {(currentPrices || stationPrices) && (
              <Badge variant="outline" className="text-xs">
                Auto-filled
              </Badge>
            )}
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="bg-white border-gray-300 focus:border-blue-500 h-12"
            value={startForm.price_per_liter}
            onChange={(e) => onFormChange('price_per_liter', parseFloat(e.target.value) || 0)}
            placeholder="15.50"
            required
          />
          {(currentPrices || stationPrices) && (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-green-600 font-medium">
                Current {startForm.fuel_type} price: ₵{currentPrice}
              </p>
              {startForm.price_per_liter !== currentPrice && (
                <p className="text-sm text-orange-600">
                  ⚠️ Different from current market price
                </p>
              )}
              {stationPrices && (
                <p className="text-xs text-blue-600">
                  💡 Price from station pricing
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Opening Meter (Liters) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={startForm.opening_meter}
              onChange={(e) => onFormChange('opening_meter', parseFloat(e.target.value) || 0)}
              placeholder="0"
              required
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Opening Cash (₵) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={startForm.opening_cash}
              onChange={(e) => onFormChange('opening_cash', parseFloat(e.target.value) || 0)}
              placeholder="0"
              required
            />
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12 text-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onSubmit}
            className="flex-1 h-12 text-sm"
            style={{ backgroundColor: '#0B2265' }}
            disabled={
              actionLoading || 
              !startForm.pump_id || 
              !startForm.user_id || 
              pumpsByFuelType.length === 0 ||
              selectedAttendantHasActiveShift
            }
          >
            {actionLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {selectedAttendantHasActiveShift ? 'Attendant Busy' : 'Start Shift'}
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    </ScrollArea>
  );
};

const AttendantForm = ({
  attendant,
  availableStations,
  onSubmit,
  onCancel,
  loading
}: {
  attendant?: Attendant;
  availableStations: Station[];
  onSubmit: (data: CreateAttendantRequest | UpdateAttendantRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) => {
  const [formData, setFormData] = useState({
    employee_id: attendant?.employee_id || '',
    full_name: attendant?.full_name || '',
    email: attendant?.email || '',
    phone: attendant?.phone || '',
    department: attendant?.department || 'Fuel Station',
    station_id: attendant?.station_id || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <ScrollArea className="h-[60vh] pr-2">
      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Employee ID *</Label>
            <Input
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              placeholder="ATT-001"
              required
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Full Name *</Label>
            <Input
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Email *</Label>
            <Input
              type="email"
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.doe@example.com"
              required
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Phone</Label>
            <Input
              type="tel"
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1234567890"
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Department</Label>
            <Input
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Fuel Station"
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Station</Label>
            <Select value={formData.station_id} onValueChange={(value) => setFormData({ ...formData, station_id: value })}>
              <SelectTrigger className="bg-white h-12">
                <SelectValue placeholder="Select station" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-48">
                  {availableStations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      <span className="truncate">{station.name} ({station.code})</span>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-12 text-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 h-12 text-sm"
            style={{ backgroundColor: '#0B2265' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {attendant ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {attendant ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </ScrollArea>
  );
};

const PumpForm = ({
  pump,
  stationId,
  onSubmit,
  onCancel,
  loading
}: {
  pump?: Pump;
  stationId: string;
  onSubmit: (data: CreatePumpRequest | UpdatePumpRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: pump?.name || '',
    number: pump?.number || '',
    fuel_type: pump?.fuel_type || 'petrol',
    manufacturer: pump?.manufacturer || '',
    model: pump?.model || '',
    serial_number: pump?.serial_number || '',
    installation_date: pump?.installation_date || new Date().toISOString().split('T')[0],
    status: pump?.status || 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <ScrollArea className="h-[70vh] pr-2">
      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Pump Name *</Label>
            <Input
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Pump 1"
              required
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Pump Number *</Label>
            <Input
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="001"
              required
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2 text-sm">
              <Fuel className="w-4 h-4" />
              Fuel Type *
            </Label>
            <Select value={formData.fuel_type} onValueChange={(value: any) => setFormData({ ...formData, fuel_type: value })}>
              <SelectTrigger className="bg-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="lpg">LPG</SelectItem>
                <SelectItem value="premium_petrol">Premium Petrol</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Status *</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="bg-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_order">Out of Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Manufacturer</Label>
            <Input
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              placeholder="Manufacturer Name"
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Model</Label>
            <Input
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="Model Number"
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Serial Number</Label>
            <Input
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="SN-123456"
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium mb-2 text-sm">Installation Date</Label>
            <Input
              type="date"
              className="bg-white border-gray-300 focus:border-blue-500 h-12"
              value={formData.installation_date}
              onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
            />
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-12 text-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 h-12 text-sm"
            style={{ backgroundColor: '#0B2265' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {pump ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {pump ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </ScrollArea>
  );
};

export function ShiftManagement({ stationId: propStationId, compact = false, onShiftUpdate }: ShiftManagementProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAttendantDialog, setShowAttendantDialog] = useState(false);
  const [showPumpDialog, setShowPumpDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('selection');
  const [activeTab, setActiveTab] = useState<ActiveTab>('shifts');
  const [availableStations, setAvailableStations] = useState<Station[]>([]);
  const [availableOMCs, setAvailableOMCs] = useState<OMC[]>([]);
  const [selectedOMC, setSelectedOMC] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>(propStationId || '');
  const [stationInfo, setStationInfo] = useState<Station | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | 'all'>('all');
  const [attendantSearch, setAttendantSearch] = useState('');
  const [pumpSearch, setPumpSearch] = useState('');
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null);
  const [editingPump, setEditingPump] = useState<Pump | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const priceContext = useContext(PriceContext);

  const [startForm, setStartForm] = useState<StartFormData>({
    user_id: '',
    attendant_name: '',
    pump_id: '',
    fuel_type: 'petrol',
    opening_meter: 0,
    opening_cash: 0,
    price_per_liter: 15.50,
    station_id: propStationId || '',
  });

  const [endForm, setEndForm] = useState<EndFormData>({
    closing_meter: 0,
    closing_cash: 0,
    notes: '',
  });

  const stationPrices = useMemo(() => {
    if (!selectedStation || !priceContext) return undefined;
    return priceContext.getStationAllPrices(selectedStation);
  }, [selectedStation, priceContext]);

  const showToast = useCallback((title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    toast({ 
      title, 
      description, 
      variant,
      duration: 3000 
    });
  }, [toast]);

  const findActiveShift = (shiftsData: Shift[]): Shift | null => {
    if (!shiftsData || shiftsData.length === 0) {
      return null;
    }

    const activeShifts = shiftsData.filter(shift => shift.status === 'active');
    
    if (activeShifts.length === 0) {
      return null;
    }

    return activeShifts.reduce((latest, current) => 
      new Date(current.start_time) > new Date(latest.start_time) ? current : latest
    );
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedStation) {
      loadShifts();
      loadAttendants();
      loadPumps();
    }
  }, [selectedStation, activeTab]);

  useEffect(() => {
    if (!selectedStation) return;

    const subscription = supabase
      .channel('shift-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
          filter: `station_id=eq.${selectedStation}`
        },
        () => {
          loadShifts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedStation]);

  useEffect(() => {
    localStorage.removeItem('shiftFormData');
    sessionStorage.removeItem('shiftFormData');
    resetStartForm();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadStationsAndOMCs();
    } catch (error) {
      showToast("Loading Error", "Failed to load initial data", "destructive");
    } finally {
      setLoading(false);
    }
  };

  const loadStationsAndOMCs = async () => {
    try {
      if (user?.role === 'station_manager' || user?.role === 'attendant') {
        await handleStationUser();
      } else if (user?.role === 'admin') {
        await handleAdminUser();
      } else if (user?.role === 'omc' && user.omc_id) {
        await handleOMCUser();
      }
    } catch (error) {
      showToast("Loading Error", "Failed to load stations data", "destructive");
    }
  };

  const handleStationUser = async () => {
    if (!user?.station_id) {
      showToast("Configuration Issue", "No station assigned to your account", "destructive");
      return;
    }

    setSelectedStation(user.station_id);
    setStartForm(prev => ({ ...prev, station_id: user.station_id }));

    try {
      const stationsResponse = await api.getAllStations();
      if (stationsResponse?.success && stationsResponse.data) {
        const userStation = stationsResponse.data.find((s: Station) => s.id === user.station_id);
        if (userStation) {
          setAvailableStations([userStation]);
          setStationInfo(userStation);
        }
      }
    } catch (error) {
      showToast("Loading Error", "Failed to load station data", "destructive");
    }
  };

  const handleAdminUser = async () => {
    try {
      const [omcResponse, stationsResponse] = await Promise.all([
        api.getOMCs(),
        api.getAllStations()
      ]);

      if (omcResponse.success) {
        setAvailableOMCs(omcResponse.data || []);
      }

      if (stationsResponse?.success) {
        const stations = stationsResponse.data || [];
        setAvailableStations(stations);
        autoSelectFirstStation(stations);
      }
    } catch (error) {
      showToast("Loading Error", "Failed to load stations data", "destructive");
    }
  };

  const handleOMCUser = async () => {
    try {
      const stationsResponse = await api.getStationsByOMC(user.omc_id!);
      if (stationsResponse?.success) {
        const stations = stationsResponse.data || [];
        setAvailableStations(stations);
        autoSelectFirstStation(stations);
      }
    } catch (error) {
      showToast("Loading Error", "Failed to load stations", "destructive");
    }
  };

  const autoSelectFirstStation = (stations: Station[]) => {
    if (!selectedStation && stations.length > 0) {
      const firstStation = stations[0];
      setSelectedStation(firstStation.id);
      setStartForm(prev => ({ ...prev, station_id: firstStation.id }));
      setStationInfo(firstStation);
    }
  };

  const loadShifts = async () => {
    if (!selectedStation) {
      return;
    }
    
    try {
      setLoading(true);

      const filters: ShiftFilters = {
        station_id: selectedStation,
        limit: 100,
      };
      
      const response = await api.getShifts(filters);

      if (response.success) {
        let shiftsData = [];
        
        if (response.data?.shifts && Array.isArray(response.data.shifts)) {
          shiftsData = response.data.shifts;
        } else if (Array.isArray(response.data)) {
          shiftsData = response.data;
        } else if (Array.isArray(response.shifts)) {
          shiftsData = response.shifts;
        } else {
          shiftsData = [];
        }
        
        setShifts(shiftsData);
        
        const active = findActiveShift(shiftsData);
        setActiveShift(active);
        
        onShiftUpdate?.();
      } else {
        await loadShiftsDirectFallback();
      }
    } catch (error) {
      await loadShiftsDirectFallback();
    } finally {
      setLoading(false);
    }
  };

  const loadShiftsDirectFallback = async () => {
    try {
      const { data: directShifts, error } = await supabase
        .from('shifts')
        .select(`
          *,
          user:profiles!shifts_user_id_fkey (
            full_name,
            email
          ),
          station:stations (
            name,
            code
          )
        `)
        .eq('station_id', selectedStation)
        .order('start_time', { ascending: false });

      if (error) {
        return;
      }

      setShifts(directShifts || []);
      
      const active = findActiveShift(directShifts || []);
      setActiveShift(active);
      
    } catch (fallbackError) {
      showToast("Error", "Failed to load shifts data", "destructive");
    }
  };

  const loadAttendants = async () => {
    if (!selectedStation) {
      return;
    }
    
    try {
      const stationId = String(selectedStation).trim();
      
      const response = await api.getAttendants(stationId);
      
      if (response.success) {
        setAttendants(response.data || []);
      } else {
        setAttendants([]);
        showToast("Error Loading Attendants", response.error || "Failed to load attendants", "destructive");
      }
    } catch (error: any) {
      setAttendants([]);
      showToast("Error", "Failed to load attendants", "destructive");
    }
  };

  const loadPumps = async () => {
    if (!selectedStation) return;
    
    try {
      const response = await api.getPumps({ station_id: selectedStation });
      if (response.success) {
        setPumps(response.data?.pumps || []);
      } else {
        throw new Error(response.error || 'Failed to load pumps');
      }
    } catch (error: any) {
      setPumps([]);
      showToast("Error Loading Pumps", error.message || "Failed to load pumps", "destructive");
    }
  };

  const handleStartShift = async () => {
    if (!validateStartForm()) return;

    try {
      setActionLoading(true);

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('No authenticated user found. Please log in.');
      }

      const selectedAttendant = attendants.find(a => a.id === startForm.user_id);
      if (!selectedAttendant) {
        showToast("Invalid Selection", "Please select a valid attendant from the list", "destructive");
        return;
      }

      const shiftData: CreateShiftRequest = {
        station_id: startForm.station_id,
        user_id: currentUser.id,
        attendant_id: startForm.user_id,
        pump_id: startForm.pump_id,
        fuel_type: startForm.fuel_type,
        price_per_liter: startForm.price_per_liter,
        opening_meter: startForm.opening_meter,
        opening_cash: startForm.opening_cash,
      };
      
      const response = await api.startShift(shiftData);
      
      if (response.success && response.data) {
        await loadShifts();
        
        resetStartForm();
        setShowStartDialog(false);
        setFormStep('selection');
        
        showToast("Shift Started", "Shift started successfully!", "default");
        onShiftUpdate?.();
      } else {
        if (response.error?.includes('already has an active shift')) {
          await loadShifts();
          
          showToast(
            "Active Shift Exists", 
            "This attendant already has an active shift. Please end the current shift before starting a new one.",
            "destructive"
          );
        } else {
          throw new Error(response.error || 'Failed to start shift');
        }
      }
    } catch (error: any) {
      if (error.message?.includes('already has an active shift')) {
        await loadShifts();
        
        showToast(
          "Active Shift Exists", 
          "This attendant already has an active shift. Please end the current shift before starting a new one.",
          "destructive"
        );
      } else {
        showToast("Error Starting Shift", error.message || "Failed to start shift", "destructive");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift || !validateEndForm()) return;

    try {
      setActionLoading(true);

      const endData: EndShiftRequest = {
        closing_meter: endForm.closing_meter,
        closing_cash: endForm.closing_cash,
        notes: endForm.notes,
      };

      const response = await api.endShift(activeShift.id, endData);
      
      if (response.success && response.data) {
        const updatedShifts = shifts.map(s => s.id === activeShift.id ? response.data! : s);
        setShifts(updatedShifts);
        setActiveShift(null);

        setShowEndDialog(false);
        setEndForm({ closing_meter: 0, closing_cash: 0, notes: '' });

        showToast("Shift Ended", response.message || "Shift ended successfully", "default");
        onShiftUpdate?.();
      } else {
        throw new Error(response.error || 'Failed to end shift');
      }
    } catch (error: any) {
      showToast("Error Ending Shift", error.message || "Failed to end shift", "destructive");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAttendant = async (formData: AttendantFormData) => {
    try {
      setActionLoading(true);
      
      if (!selectedStation) {
        throw new Error('No station selected');
      }

      const attendantData: CreateAttendantRequest = {
        ...formData,
        station_id: selectedStation,
      };

      const response = await api.createAttendant(attendantData);
      
      if (response.success && response.data) {
        setAttendants(prev => [...prev, response.data!]);
        setShowAttendantDialog(false);
        showToast("Success", "Attendant created successfully", "default");
      } else {
        throw new Error(response.error || 'Failed to create attendant');
      }
    } catch (error: any) {
      showToast("Error", error.message || "Failed to create attendant", "destructive");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAttendant = async (formData: UpdateAttendantRequest) => {
    if (!editingAttendant) return;
    
    try {
      setActionLoading(true);
      
      const response = await api.updateAttendant(editingAttendant.id, formData);
      
      if (response.success && response.data) {
        setAttendants(prev => prev.map(a => a.id === editingAttendant.id ? response.data! : a));
        setShowAttendantDialog(false);
        setEditingAttendant(null);
        showToast("Success", "Attendant updated successfully", "default");
      } else {
        throw new Error(response.error || 'Failed to update attendant');
      }
    } catch (error: any) {
      showToast("Error", error.message || "Failed to update attendant", "destructive");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAttendant = async (attendantId: string) => {
    try {
      const response = await api.deleteAttendant(attendantId);
      
      if (response.success) {
        setAttendants(prev => prev.filter(a => a.id !== attendantId));
        showToast("Success", "Attendant deleted successfully", "default");
      } else {
        throw new Error(response.error || 'Failed to delete attendant');
      }
    } catch (error: any) {
      showToast("Error", error.message || "Failed to delete attendant", "destructive");
    }
  };

  const handleCreatePump = async (formData: CreatePumpRequest) => {
    try {
      setActionLoading(true);
      
      const pumpData = {
        ...formData,
        station_id: selectedStation
      };

      const response = await api.createPump(pumpData);
      
      if (response.success && response.data) {
        setPumps(prev => [...prev, response.data!]);
        setShowPumpDialog(false);
        showToast("Success", "Pump created successfully", "default");
      } else {
        throw new Error(response.error || 'Failed to create pump');
      }
    } catch (error: any) {
      showToast("Error", error.message || "Failed to create pump", "destructive");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePump = async (formData: UpdatePumpRequest) => {
    if (!editingPump) return;
    
    try {
      setActionLoading(true);
      
      const response = await api.updatePump(editingPump.id, formData);
      
      if (response.success && response.data) {
        setPumps(prev => prev.map(p => p.id === editingPump.id ? response.data! : p));
        setShowPumpDialog(false);
        setEditingPump(null);
        showToast("Success", "Pump updated successfully", "default");
      } else {
        throw new Error(response.error || 'Failed to update pump');
      }
    } catch (error: any) {
      showToast("Error", error.message || "Failed to update pump", "destructive");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePump = async (pumpId: string) => {
    try {
      const response = await api.deletePump(pumpId);
      
      if (response.success) {
        setPumps(prev => prev.filter(p => p.id !== pumpId));
        showToast("Success", "Pump deleted successfully", "default");
      } else {
        throw new Error(response.error || 'Failed to delete pump');
      }
    } catch (error: any) {
      showToast("Error", error.message || "Failed to delete pump", "destructive");
    }
  };

  const handlePumpStatusChange = async (pumpId: string, status: Pump['status']) => {
    try {
      const response = await api.updatePumpStatus(pumpId, status);
      
      if (response.success && response.data) {
        setPumps(prev => prev.map(p => p.id === pumpId ? response.data! : p));
        showToast("Success", `Pump status updated to ${status}`, "default");
      } else {
        throw new Error(response.error || 'Failed to update pump status');
      }
    } catch (error: any) {
      showToast("Error", error.message || "Failed to update pump status", "destructive");
    }
  };

  const handleFormChange = useCallback((field: keyof StartFormData, value: any) => {
    setStartForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleOMCChange = async (omcId: string) => {
    setSelectedOMC(omcId);
    setSelectedStation('');
    setStartForm(prev => ({ ...prev, station_id: '', pump_id: '', user_id: '' }));
    setStationInfo(null);
    setPumps([]);

    if (!omcId) {
      setAvailableStations([]);
      return;
    }

    try {
      setLoading(true);
      const stationsResponse = await api.getStationsByOMC(omcId);
      if (stationsResponse.success) {
        const stations = stationsResponse.data || [];
        setAvailableStations(stations);
        
        if (stations.length > 0) {
          const firstStation = stations[0];
          setSelectedStation(firstStation.id);
          setStartForm(prev => ({ ...prev, station_id: firstStation.id }));
          setStationInfo(firstStation);
        }
      }
    } catch (error) {
      showToast("Loading Error", "Failed to load stations for selected OMC", "destructive");
    } finally {
      setLoading(false);
    }
  };

  const handleStationChange = (stationId: string) => {
    const station = availableStations.find(s => s.id === stationId);
    if (station) {
      setSelectedStation(stationId);
      setStartForm(prev => ({ 
        ...prev, 
        station_id: stationId,
        pump_id: '',
        user_id: ''
      }));
      setStationInfo(station);
      
      loadShifts();
      loadAttendants();
      loadPumps();
    }
  };

  const validateStartForm = (): boolean => {
    if (!startForm.user_id?.trim()) {
      showToast("Missing Information", "Please select an attendant", "destructive");
      return false;
    }

    const isValidAttendant = attendants.some(a => a.id === startForm.user_id);
    if (!isValidAttendant) {
      showToast("Invalid Selection", "Please select a valid attendant from the list", "destructive");
      return false;
    }

    if (!startForm.station_id) {
      showToast("Missing Information", "Please select a station", "destructive");
      return false;
    }

    if (!startForm.pump_id) {
      showToast("Missing Information", "Please select a pump", "destructive");
      return false;
    }

    if (startForm.opening_meter < 0) {
      showToast("Invalid Value", "Opening meter cannot be negative", "destructive");
      return false;
    }

    if (startForm.opening_cash < 0) {
      showToast("Invalid Value", "Opening cash cannot be negative", "destructive");
      return false;
    }

    if (startForm.price_per_liter <= 0) {
      showToast("Invalid Value", "Price per liter must be positive", "destructive");
      return false;
    }

    return true;
  };

  const validateEndForm = (): boolean => {
    if (!activeShift) return false;

    if (endForm.closing_meter < activeShift.opening_meter) {
      showToast("Invalid Meter Reading", "Closing meter cannot be less than opening meter", "destructive");
      return false;
    }

    if (endForm.closing_cash < 0) {
      showToast("Invalid Cash Amount", "Closing cash cannot be negative", "destructive");
      return false;
    }

    return true;
  };

  const resetStartForm = () => {
    const getDefaultPrice = () => {
      if (stationPrices && stationPrices.length > 0) {
        const fuelTypeMap = {
          'petrol': 'petrol',
          'diesel': 'diesel', 
          'lpg': 'lpg',
          'premium_petrol': 'premium_petrol'
        };
        
        const productName = fuelTypeMap['petrol'];
        const stationPrice = stationPrices.find(sp => 
          sp.product_name?.toLowerCase().includes(productName)
        );
        
        if (stationPrice) {
          return stationPrice.selling_price;
        }
      }
      
      if (priceContext?.currentPrices) {
        return priceContext.currentPrices.get('petrol') || 15.50;
      }
      
      return 15.50;
    };

    setStartForm({
      user_id: '',
      attendant_name: '',
      pump_id: '',
      fuel_type: 'petrol',
      opening_meter: 0,
      opening_cash: 0,
      price_per_liter: getDefaultPrice(),
      station_id: selectedStation,
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setShowStartDialog(open);
    if (!open) {
      setFormStep('selection');
      resetStartForm();
    }
  };

  const getShiftDuration = (shift: Shift): string => {
    const start = new Date(shift.start_time);
    const end = shift.end_time ? new Date(shift.end_time) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusConfig = (status: string) => {
    const config = {
      active: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <Play className="w-3 h-3 text-green-600" />,
        label: 'Active'
      },
      pending_reconciliation: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <AlertCircle className="w-3 h-3 text-orange-600" />,
        label: 'Needs Reconciliation'
      },
      cancelled: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertCircle className="w-3 h-3 text-red-600" />,
        label: 'Cancelled'
      },
      closed: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <CheckCircle className="w-3 h-3 text-blue-600" />,
        label: 'Completed'
      }
    };

    return config[status as keyof typeof config] || config.closed;
  };

  const getPumpStatusConfig = (status: Pump['status']) => {
    const config = {
      active: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <Activity className="w-3 h-3 text-green-600" />,
        label: 'Active'
      },
      inactive: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Gauge className="w-3 h-3 text-gray-600" />,
        label: 'Inactive'
      },
      maintenance: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <Wrench className="w-3 h-3 text-orange-600" />,
        label: 'Maintenance'
      },
      out_of_order: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertCircle className="w-3 h-3 text-red-600" />,
        label: 'Out of Order'
      }
    };

    return config[status] || config.inactive;
  };

  const computedValues = useMemo(() => {
    const activeShiftsCount = shifts.filter(s => s.status === 'active').length;
    const pendingReconciliationCount = shifts.filter(s => s.status === 'pending_reconciliation').length;
    const todayShifts = shifts.filter(s => 
      new Date(s.start_time).toDateString() === new Date().toDateString()
    );
    const todayVolume = todayShifts.reduce((sum, shift) => sum + (shift.total_volume || 0), 0);
    const todayRevenue = todayShifts.reduce((sum, shift) => sum + (shift.total_sales || 0), 0);
    const totalShifts = shifts.length;

    const activePumpsCount = pumps.filter(p => p.status === 'active').length;
    const maintenancePumpsCount = pumps.filter(p => p.status === 'maintenance').length;
    const totalVolumeDispensed = pumps.reduce((sum, pump) => sum + (pump.total_dispensed || 0), 0);

    return {
      activeShiftsCount,
      pendingReconciliationCount,
      todayShifts,
      todayVolume,
      todayRevenue,
      totalShifts,
      activePumpsCount,
      maintenancePumpsCount,
      totalVolumeDispensed
    };
  }, [shifts, pumps]);

  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const matchesSearch = searchTerm === '' || 
        shift.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.pump_id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || shift.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [shifts, searchTerm, statusFilter]);

  const filteredAttendants = useMemo(() => {
    return attendants.filter(attendant => {
      return attendantSearch === '' || 
        attendant.full_name.toLowerCase().includes(attendantSearch.toLowerCase()) ||
        attendant.employee_id.toLowerCase().includes(attendantSearch.toLowerCase()) ||
        attendant.email.toLowerCase().includes(attendantSearch.toLowerCase());
    });
  }, [attendants, attendantSearch]);

  const filteredPumps = useMemo(() => {
    return pumps.filter(pump => {
      return pumpSearch === '' || 
        pump.name.toLowerCase().includes(pumpSearch.toLowerCase()) ||
        pump.number.toLowerCase().includes(pumpSearch.toLowerCase()) ||
        pump.fuel_type.toLowerCase().includes(pumpSearch.toLowerCase());
    });
  }, [pumps, pumpSearch]);

  const ShiftSkeleton = () => (
    <div className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );

  if (compact) {
    return (
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm">Shift Management</h4>
            <p className="text-xs text-gray-600">
              {activeShift ? 'Active shift running' : 'No active shift'}
            </p>
          </div>
          <Button
            size="sm"
            style={{ backgroundColor: '#0B2265' }}
            onClick={() => setShowStartDialog(true)}
            disabled={!!activeShift}
            className="text-xs h-8"
          >
            <Play className="w-3 h-3 mr-1" />
            Start Shift
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Shift Management</h1>
          <p className="text-gray-600 text-sm">
            Manage attendant shifts, track performance, and monitor station operations.
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          {(user?.role === 'admin' || user?.role === 'omc') && (
            <div className="flex flex-col gap-2">
              {user.role === 'admin' && (
                <Select value={selectedOMC} onValueChange={handleOMCChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select OMC" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-48">
                      {availableOMCs.map((omc) => (
                        <SelectItem key={omc.id} value={omc.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate">{omc.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedStation} onValueChange={handleStationChange}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {availableStations.map((station) => (
                      <SelectItem key={station.id} value={station.id}>
                        <div className="flex flex-col">
                          <span className="font-medium truncate">{station.name}</span>
                          <span className="text-xs text-gray-500">{station.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          )}

          {(user?.role === 'station_manager' || user?.role === 'attendant') && stationInfo && (
            <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-700 truncate">
                  Station: {stationInfo.name} ({stationInfo.code})
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={loadShifts}
              disabled={loading || actionLoading || !selectedStation}
              className="gap-2 text-xs h-9 flex-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowAnalytics(true)}
              disabled={shifts.length === 0}
              className="gap-2 text-xs h-9 flex-1"
            >
              <BarChart3 className="w-3 h-3" />
              Analytics
            </Button>

            {!activeShift && (
              <Dialog open={showStartDialog} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button 
                    style={{ backgroundColor: '#0B2265' }} 
                    className="gap-2 text-xs h-9 flex-1" 
                    disabled={actionLoading || !selectedStation}
                  >
                    <Play className="w-3 h-3" />
                    Start Shift
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] w-full mx-auto bg-white p-4">
                  <DialogHeader className="px-1">
                    <DialogTitle className="text-lg text-gray-900">Start New Shift</DialogTitle>
                    <DialogDescription className="text-gray-600 text-sm">
                      {formStep === 'selection' 
                        ? "Select station for the new shift" 
                        : "Enter shift details and opening readings"
                      }
                    </DialogDescription>
                  </DialogHeader>

                  <Separator />

                  {formStep === 'selection' ? (
                    <StationSelectionStep 
                      user={user}
                      selectedOMC={selectedOMC}
                      selectedStation={selectedStation}
                      availableOMCs={availableOMCs}
                      availableStations={availableStations}
                      stationInfo={stationInfo}
                      onOMCChange={handleOMCChange}
                      onStationChange={handleStationChange}
                      onNextStep={() => setFormStep('details')}
                    />
                  ) : (
                    <ShiftDetailsStep
                      startForm={startForm}
                      availableStations={availableStations}
                      selectedStation={selectedStation}
                      stationInfo={stationInfo}
                      availablePumps={pumps}
                      availableAttendants={attendants}
                      actionLoading={actionLoading}
                      onFormChange={handleFormChange}
                      onBack={() => setFormStep('selection')}
                      onSubmit={handleStartShift}
                      currentPrices={priceContext?.currentPrices}
                      shifts={shifts}
                      stationPrices={stationPrices}
                    />
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {(user?.role === 'admin' || user?.role === 'omc') && !selectedStation && (
        <Alert className="bg-yellow-50 border-yellow-200 p-3">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-sm">
            Please select a station to view and manage shifts.
          </AlertDescription>
        </Alert>
      )}

      {activeShift && selectedStation && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center animate-pulse">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                    Active Shift - {activeShift.user?.full_name || 'Unknown Attendant'}
                  </h3>
                  <div className="flex flex-col gap-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Started: {new Date(activeShift.start_time).toLocaleTimeString()}
                    </span>
                    <span>Duration: {getShiftDuration(activeShift)}</span>
                    <span>Pump: {activeShift.pump_id}</span>
                    <span>Fuel: {activeShift.fuel_type}</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowEndDialog(true)}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white text-sm h-9"
                disabled={actionLoading}
              >
                <StopCircle className="w-4 h-4" />
                {actionLoading ? 'Ending...' : 'End Shift'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100 rounded-lg">
          <TabsTrigger 
            value="shifts" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded text-xs py-2"
          >
            <Clock className="w-3 h-3 mr-1" />
            Shifts
          </TabsTrigger>
          <TabsTrigger 
            value="attendants" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded text-xs py-2"
          >
            <Users className="w-3 h-3 mr-1" />
            Attendants
          </TabsTrigger>
          <TabsTrigger 
            value="pumps" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded text-xs py-2"
          >
            <Gauge className="w-3 h-3 mr-1" />
            Pumps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          {selectedStation && !loading && (
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-1">Active</p>
                    <p className="text-lg font-bold text-gray-900">{computedValues.activeShiftsCount}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-orange-600 mb-1">Pending</p>
                    <p className="text-lg font-bold text-gray-900">{computedValues.pendingReconciliationCount}</p>
                  </div>
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-1">Today's Volume</p>
                    <p className="text-lg font-bold text-gray-900">{computedValues.todayVolume.toLocaleString()}L</p>
                  </div>
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Droplet className="w-4 h-4 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 mb-1">Today's Revenue</p>
                    <p className="text-lg font-bold text-gray-900">₵{computedValues.todayRevenue.toLocaleString()}</p>
                  </div>
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          <Separator />

          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3">
                <CardTitle className="text-lg text-gray-900">Shift History</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                    {computedValues.totalShifts} Total
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mt-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search shifts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white text-sm flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="h-10 px-3"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
                {showMobileFilters && (
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="bg-white text-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Completed</SelectItem>
                      <SelectItem value="pending_reconciliation">Pending Reconciliation</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <ShiftSkeleton key={i} />
                  ))}
                </div>
              ) : filteredShifts.length > 0 ? (
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-3 pr-2">
                    {filteredShifts.map((shift) => {
                      const volumeSold = shift.total_volume || 0;
                      const cashCollected = shift.total_sales || 0;
                      const efficiency = shift.efficiency_rate ? shift.efficiency_rate.toFixed(1) : 'N/A';
                      const statusConfig = getStatusConfig(shift.status);

                      return (
                        <div 
                          key={shift.id} 
                          className="p-4 bg-gray-50 rounded-lg hover:shadow-md transition-all duration-300 border border-gray-200"
                        >
                          <div className="flex flex-col gap-3 mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                shift.status === 'active' ? 'bg-green-100' :
                                shift.status === 'pending_reconciliation' ? 'bg-orange-100' :
                                shift.status === 'cancelled' ? 'bg-red-100' :
                                'bg-blue-100'
                              }`}>
                                <UserIcon className={`w-4 h-4 ${
                                  shift.status === 'active' ? 'text-green-600' :
                                  shift.status === 'pending_reconciliation' ? 'text-orange-600' :
                                  shift.status === 'cancelled' ? 'text-red-600' :
                                  'text-blue-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-1 mb-2">
                                  <h4 className="text-base font-semibold text-gray-900 truncate">
                                    {shift.user?.full_name || 'Unknown Attendant'}
                                  </h4>
                                  <Badge className={`${statusConfig.color} border text-xs`}>
                                    <div className="flex items-center gap-1">
                                      {statusConfig.icon}
                                      {statusConfig.label}
                                    </div>
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-2 truncate">
                                  {shift.pump_id} • {shift.fuel_type}
                                </p>
                                <div className="flex flex-col gap-1 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(shift.start_time).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(shift.start_time).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <p className="text-gray-600 mb-1">Volume</p>
                              <p className="text-gray-900 font-semibold flex items-center gap-1">
                                <Droplet className="w-3 h-3 text-blue-600" />
                                {volumeSold.toLocaleString()} L
                              </p>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <p className="text-gray-600 mb-1">Cash</p>
                              <p className="text-gray-900 font-semibold flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-green-600" />
                                ₵{cashCollected.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <p className="text-gray-600 mb-1">Efficiency</p>
                              <p className="text-gray-900 font-semibold flex items-center gap-1">
                                <Zap className="w-3 h-3 text-yellow-600" />
                                {efficiency} L/h
                              </p>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <p className="text-gray-600 mb-1">Price/L</p>
                              <p className="text-gray-900 font-semibold text-xs">
                                ₵{shift.price_per_liter}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2 text-sm">No shift records found</p>
                  <p className="text-xs text-gray-400">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'Start by creating your first shift'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendants" className="space-y-4">
          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardHeader>
              <div className="flex flex-col gap-3">
                <CardTitle className="text-lg text-gray-900">Attendant Management</CardTitle>
                <Button 
                  onClick={() => {
                    setEditingAttendant(null);
                    setShowAttendantDialog(true);
                  }}
                  style={{ backgroundColor: '#0B2265' }}
                  className="gap-2 text-sm h-9"
                >
                  <Plus className="w-4 h-4" />
                  Add Attendant
                </Button>
              </div>
              
              <div className="flex flex-col gap-2 mt-3">
                <Input
                  placeholder="Search attendants..."
                  value={attendantSearch}
                  onChange={(e) => setAttendantSearch(e.target.value)}
                  className="bg-white text-sm"
                />
              </div>
            </CardHeader>
            
            <CardContent>
              {filteredAttendants.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <ScrollArea className="h-[50vh]">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="font-semibold text-xs p-2">ID</TableHead>
                          <TableHead className="font-semibold text-xs p-2">Name</TableHead>
                          <TableHead className="font-semibold text-xs p-2">Status</TableHead>
                          <TableHead className="font-semibold text-xs p-2 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttendants.map((attendant) => (
                          <TableRow key={attendant.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-xs p-2">{attendant.employee_id}</TableCell>
                            <TableCell className="text-xs p-2 truncate max-w-[100px]">{attendant.full_name}</TableCell>
                            <TableCell className="p-2">
                              <Badge 
                                variant={attendant.is_active ? "default" : "secondary"}
                                className={attendant.is_active 
                                  ? "bg-green-100 text-green-800 hover:bg-green-100 text-xs" 
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs"
                                }
                              >
                                {attendant.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right p-2">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAttendant(attendant);
                                    setShowAttendantDialog(true);
                                  }}
                                  className="h-7 px-2"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteAttendant(attendant.id)}
                                  className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2 text-sm">No attendants found</p>
                  <p className="text-xs text-gray-400">
                    {attendantSearch 
                      ? 'Try adjusting your search' 
                      : 'Add your first attendant to get started'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pumps" className="space-y-4">
          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardHeader>
              <div className="flex flex-col gap-3">
                <CardTitle className="text-lg text-gray-900">Pump Management</CardTitle>
                <Button 
                  onClick={() => {
                    setEditingPump(null);
                    setShowPumpDialog(true);
                  }}
                  style={{ backgroundColor: '#0B2265' }}
                  className="gap-2 text-sm h-9"
                >
                  <Plus className="w-4 h-4" />
                  Add Pump
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Card className="p-2 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">Active</p>
                      <p className="text-base font-bold text-gray-900">{computedValues.activePumpsCount}</p>
                    </div>
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                </Card>

                <Card className="p-2 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-orange-600 mb-1">Maintenance</p>
                      <p className="text-base font-bold text-gray-900">{computedValues.maintenancePumpsCount}</p>
                    </div>
                    <Wrench className="w-6 h-6 text-orange-600" />
                  </div>
                </Card>
              </div>

              <Separator className="my-3" />

              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Search pumps..."
                  value={pumpSearch}
                  onChange={(e) => setPumpSearch(e.target.value)}
                  className="bg-white text-sm"
                />
              </div>
            </CardHeader>
            
            <CardContent>
              {filteredPumps.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <ScrollArea className="h-[50vh]">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="font-semibold text-xs p-2">Number</TableHead>
                          <TableHead className="font-semibold text-xs p-2">Name</TableHead>
                          <TableHead className="font-semibold text-xs p-2">Fuel Type</TableHead>
                          <TableHead className="font-semibold text-xs p-2">Status</TableHead>
                          <TableHead className="font-semibold text-xs p-2 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPumps.map((pump) => {
                          const statusConfig = getPumpStatusConfig(pump.status);
                          return (
                            <TableRow key={pump.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium text-xs p-2">{pump.number}</TableCell>
                              <TableCell className="text-xs p-2 truncate max-w-[80px]">{pump.name}</TableCell>
                              <TableCell className="p-2">
                                <Badge variant="outline" className="capitalize text-xs">
                                  {pump.fuel_type.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="p-2">
                                <Badge className={`${statusConfig.color} border text-xs`}>
                                  <div className="flex items-center gap-1">
                                    {statusConfig.icon}
                                    {statusConfig.label}
                                  </div>
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right p-2">
                                <div className="flex justify-end gap-1">
                                  <Select
                                    value={pump.status}
                                    onValueChange={(value: Pump['status']) => handlePumpStatusChange(pump.id, value)}
                                  >
                                    <SelectTrigger className="w-28 h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                      <SelectItem value="maintenance">Maintenance</SelectItem>
                                      <SelectItem value="out_of_order">Out of Order</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingPump(pump);
                                      setShowPumpDialog(true);
                                    }}
                                    className="h-7 px-2"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gauge className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2 text-sm">No pumps found</p>
                  <p className="text-xs text-gray-400">
                    {pumpSearch 
                      ? 'Try adjusting your search' 
                      : 'Add your first pump to get started'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {activeShift && (
        <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <DialogContent className="max-w-[95vw] w-full mx-auto bg-white p-4">
            <DialogHeader className="px-1">
              <DialogTitle className="text-lg text-gray-900">
                End Shift - {activeShift.user?.full_name || 'Unknown Attendant'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-sm">
                Complete shift with closing readings and reconciliation details.
              </DialogDescription>
            </DialogHeader>
            
            <Separator />
            
            <ScrollArea className="h-[70vh] pr-2">
              <div className="space-y-4 pb-4">
                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <h4 className="font-semibold text-gray-900 text-sm">Shift Summary</h4>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opening Meter:</span>
                      <span className="font-semibold">{activeShift.opening_meter.toLocaleString()} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opening Cash:</span>
                      <span className="font-semibold">₵{activeShift.opening_cash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold">{getShiftDuration(activeShift)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fuel Price:</span>
                      <span className="font-semibold">₵{activeShift.price_per_liter}/L</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Closing Meter Reading (Liters) *</Label>
                    <Input
                      type="number"
                      min={activeShift.opening_meter}
                      step="0.01"
                      value={endForm.closing_meter}
                      onChange={(e) => setEndForm({ ...endForm, closing_meter: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      required
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Closing Cash (₵) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={endForm.closing_cash}
                      onChange={(e) => setEndForm({ ...endForm, closing_cash: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      required
                      className="h-12"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-gray-700 font-medium text-sm">Notes (Optional)</Label>
                  <Input
                    value={endForm.notes}
                    onChange={(e) => setEndForm({ ...endForm, notes: e.target.value })}
                    placeholder="Any additional notes or observations..."
                    className="h-12"
                  />
                </div>

                {endForm.closing_meter > 0 && (
                  <>
                    <Separator />
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">Shift Calculations</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Volume Sold:</span>
                          <span className="font-semibold text-gray-900">
                            {(endForm.closing_meter - activeShift.opening_meter).toLocaleString()} L
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Expected Revenue:</span>
                          <span className="font-semibold text-gray-900">
                            ₵{((endForm.closing_meter - activeShift.opening_meter) * activeShift.price_per_liter).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Actual Revenue:</span>
                          <span className="font-semibold text-gray-900">
                            ₵{(endForm.closing_cash - activeShift.opening_cash).toLocaleString()}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Variance:</span>
                          <span className={`font-semibold ${
                            Math.abs((endForm.closing_cash - activeShift.opening_cash) - 
                            ((endForm.closing_meter - activeShift.opening_meter) * activeShift.price_per_liter)) < 10 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            ₵{Math.abs((endForm.closing_cash - activeShift.opening_cash) - 
                              ((endForm.closing_meter - activeShift.opening_meter) * activeShift.price_per_liter)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <Button
                  onClick={handleEndShift}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-sm"
                  disabled={actionLoading}
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Ending Shift...' : 'End Shift & Reconcile'}
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showAttendantDialog} onOpenChange={setShowAttendantDialog}>
        <DialogContent className="max-w-[95vw] w-full mx-auto bg-white p-4">
          <DialogHeader className="px-1">
            <DialogTitle className="text-lg text-gray-900">
              {editingAttendant ? 'Edit Attendant' : 'Add New Attendant'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
              {editingAttendant 
                ? 'Update attendant information and permissions.' 
                : 'Create a new attendant account for shift management.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <Separator />
          
          <AttendantForm
            attendant={editingAttendant || undefined}
            availableStations={availableStations}
            onSubmit={editingAttendant ? handleUpdateAttendant : handleCreateAttendant}
            onCancel={() => {
              setShowAttendantDialog(false);
              setEditingAttendant(null);
            }}
            loading={actionLoading}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPumpDialog} onOpenChange={setShowPumpDialog}>
        <DialogContent className="max-w-[95vw] w-full mx-auto bg-white p-4">
          <DialogHeader className="px-1">
            <DialogTitle className="text-lg text-gray-900">
              {editingPump ? 'Edit Pump' : 'Add New Pump'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
              {editingPump 
                ? 'Update pump information and configuration.' 
                : 'Register a new pump for the station.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <Separator />
          
          <PumpForm
            pump={editingPump || undefined}
            stationId={selectedStation}
            onSubmit={editingPump ? handleUpdatePump : handleCreatePump}
            onCancel={() => {
              setShowPumpDialog(false);
              setEditingPump(null);
            }}
            loading={actionLoading}
          />
        </DialogContent>
      </Dialog>

      <ShiftAnalytics
        shifts={shifts}
        open={showAnalytics}
        onOpenChange={setShowAnalytics}
        stationName={stationInfo?.name || 'Selected Station'}
      />
    </div>
  );
}

export default ShiftManagement;