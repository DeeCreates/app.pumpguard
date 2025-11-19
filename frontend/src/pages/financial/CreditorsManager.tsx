import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Image as ImageIcon, 
  Download, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

interface Creditor {
  id: string;
  name: string;
  phone: string;
  vehicle_number: string;
  amount: number;
  date: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  payment_date?: string;
  receipt_photo?: string;
  notes?: string;
  station_id: string;
  station_name?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface CreditorsManagerProps {
  stationId?: string;
  compact?: boolean;
  userRole: 'admin' | 'omc' | 'dealer' | 'station_manager' | 'attendant';
  userStations?: string[];
}

// Lazy loaded components
const LazyExportButton = lazy(() => import('./LazyExportButton'));

export function CreditorsManager({ 
  stationId, 
  compact = false, 
  userRole,
  userStations = []
}: CreditorsManagerProps) {
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCreditor, setSelectedCreditor] = useState<Creditor | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>(stationId || '');
  const [availableStations, setAvailableStations] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [newCreditor, setNewCreditor] = useState({
    name: '',
    phone: '',
    vehicle_number: '',
    amount: '',
    due_date: '',
    notes: '',
    station_id: stationId || '',
  });

  const [editCreditor, setEditCreditor] = useState({
    name: '',
    phone: '',
    vehicle_number: '',
    amount: '',
    due_date: '',
    notes: '',
    station_id: '',
  });

  // Check user permissions
  const canViewAllStations = userRole === 'admin' || userRole === 'omc';
  const canManageCreditors = userRole === 'admin' || userRole === 'omc' || userRole === 'station_manager';
  const canViewCreditors = userRole === 'dealer' || userRole === 'attendant';
  const canDeleteCreditors = userRole === 'admin' || userRole === 'omc';

  useEffect(() => {
    loadAvailableStations();
    loadCreditors();
  }, [stationId, selectedStation]);

  const loadAvailableStations = async () => {
    if (canViewAllStations) {
      try {
        const response = await api.getAllStations();
        if (response.success) {
          setAvailableStations(response.data || []);
          if (!selectedStation && response.data?.length > 0) {
            setSelectedStation(response.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading stations:', error);
        toast.error('Failed to load stations');
      }
    }
  };

  const loadCreditors = async () => {
    setLoading(true);
    try {
      let targetStationIds: string[] = [];
      
      if (stationId) {
        targetStationIds = [stationId];
      } else if (selectedStation) {
        targetStationIds = [selectedStation];
      } else if (userStations.length > 0) {
        targetStationIds = userStations;
      } else if (canViewAllStations) {
        const stationsResponse = await api.getAllStations();
        targetStationIds = stationsResponse.success ? 
          (stationsResponse.data || []).map((s: any) => s.id) : [];
      }

      if (targetStationIds.length === 0) {
        setCreditors([]);
        setLoading(false);
        return;
      }

      // Simulated API call
      const mockCreditors: Creditor[] = [
        {
          id: '1',
          name: 'John Mensah',
          phone: '+233 24 123 4567',
          vehicle_number: 'GE-1234-20',
          amount: 500,
          date: '2025-10-15',
          due_date: '2025-10-30',
          status: 'pending',
          station_id: targetStationIds[0],
          station_name: 'Station A',
          created_at: '2025-10-15T10:00:00Z',
          updated_at: '2025-10-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'Kwame Asante',
          phone: '+233 55 987 6543',
          vehicle_number: 'AS-5678-19',
          amount: 750,
          date: '2025-10-10',
          due_date: '2025-10-25',
          status: 'overdue',
          station_id: targetStationIds[0],
          station_name: 'Station A',
          created_at: '2025-10-10T09:00:00Z',
          updated_at: '2025-10-10T09:00:00Z',
        },
        {
          id: '3',
          name: 'Ama Adjei',
          phone: '+233 20 456 7890',
          vehicle_number: 'WR-9012-21',
          amount: 1200,
          date: '2025-10-05',
          due_date: '2025-10-20',
          status: 'paid',
          payment_date: '2025-10-18',
          station_id: targetStationIds[0],
          station_name: 'Station A',
          created_at: '2025-10-05T08:00:00Z',
          updated_at: '2025-10-18T14:00:00Z',
        },
      ].filter(creditor => targetStationIds.includes(creditor.station_id));

      setCreditors(mockCreditors);
      
    } catch (error) {
      console.error('Error loading creditors:', error);
      toast.error('Failed to load creditors');
    } finally {
      setLoading(false);
    }
  };

  const filteredCreditors = creditors.filter((creditor) => {
    const matchesSearch =
      creditor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creditor.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creditor.phone.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || creditor.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: creditors.reduce((sum, c) => sum + c.amount, 0),
    pending: creditors.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
    paid: creditors.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
    overdue: creditors.filter((c) => c.status === 'overdue').reduce((sum, c) => sum + c.amount, 0),
    count: creditors.length,
    pendingCount: creditors.filter((c) => c.status === 'pending').length,
    overdueCount: creditors.filter((c) => c.status === 'overdue').length,
  };

  const handleAddCreditor = async () => {
    if (!newCreditor.name || !newCreditor.amount || !newCreditor.due_date || !newCreditor.station_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!canManageCreditors) {
      toast.error('You do not have permission to add creditors');
      return;
    }

    setActionLoading('add');
    try {
      const creditor: Creditor = {
        id: Date.now().toString(),
        name: newCreditor.name,
        phone: newCreditor.phone,
        vehicle_number: newCreditor.vehicle_number,
        amount: parseFloat(newCreditor.amount),
        date: new Date().toISOString().split('T')[0],
        due_date: newCreditor.due_date,
        status: 'pending',
        notes: newCreditor.notes,
        station_id: newCreditor.station_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCreditors([...creditors, creditor]);
      setNewCreditor({
        name: '',
        phone: '',
        vehicle_number: '',
        amount: '',
        due_date: '',
        notes: '',
        station_id: stationId || selectedStation || '',
      });
      setIsAddDialogOpen(false);
      toast.success('Creditor added successfully');
      
      await api.logUserActivity('creditor_create', undefined, {
        creditor_id: creditor.id,
        station_id: creditor.station_id,
        amount: creditor.amount
      });
      
    } catch (error) {
      console.error('Error adding creditor:', error);
      toast.error('Failed to add creditor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditCreditor = async () => {
    if (!selectedCreditor || !editCreditor.name || !editCreditor.amount || !editCreditor.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!canManageCreditors) {
      toast.error('You do not have permission to edit creditors');
      return;
    }

    setActionLoading('edit');
    try {
      const updatedCreditor: Creditor = {
        ...selectedCreditor,
        name: editCreditor.name,
        phone: editCreditor.phone,
        vehicle_number: editCreditor.vehicle_number,
        amount: parseFloat(editCreditor.amount),
        due_date: editCreditor.due_date,
        notes: editCreditor.notes,
        updated_at: new Date().toISOString(),
      };

      setCreditors(creditors.map(c => c.id === selectedCreditor.id ? updatedCreditor : c));
      setIsEditDialogOpen(false);
      setSelectedCreditor(null);
      toast.success('Creditor updated successfully');
      
      await api.logUserActivity('creditor_update', undefined, {
        creditor_id: selectedCreditor.id,
        station_id: selectedCreditor.station_id,
        changes: {
          amount: updatedCreditor.amount,
          due_date: updatedCreditor.due_date
        }
      });
      
    } catch (error) {
      console.error('Error updating creditor:', error);
      toast.error('Failed to update creditor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCreditor = async () => {
    if (!selectedCreditor) return;

    if (!canDeleteCreditors) {
      toast.error('You do not have permission to delete creditors');
      return;
    }

    setActionLoading('delete');
    try {
      setCreditors(creditors.filter(c => c.id !== selectedCreditor.id));
      setIsDeleteDialogOpen(false);
      setSelectedCreditor(null);
      toast.success('Creditor deleted successfully');
      
      await api.logUserActivity('creditor_delete', undefined, {
        creditor_id: selectedCreditor.id,
        station_id: selectedCreditor.station_id,
        creditor_name: selectedCreditor.name,
        amount: selectedCreditor.amount
      });
      
    } catch (error) {
      console.error('Error deleting creditor:', error);
      toast.error('Failed to delete creditor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async (receiptPhoto?: string) => {
    if (!selectedCreditor) return;

    if (!canManageCreditors) {
      toast.error('You do not have permission to mark payments');
      return;
    }

    setActionLoading('payment');
    try {
      const updatedCreditor: Creditor = {
        ...selectedCreditor,
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
        receipt_photo: receiptPhoto,
        updated_at: new Date().toISOString(),
      };

      setCreditors(creditors.map(c => c.id === selectedCreditor.id ? updatedCreditor : c));
      setIsPaymentDialogOpen(false);
      setSelectedCreditor(null);
      toast.success('Payment recorded successfully');

      await api.logUserActivity('creditor_payment', undefined, {
        creditor_id: selectedCreditor.id,
        station_id: selectedCreditor.station_id,
        amount: selectedCreditor.amount
      });
      
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (creditor: Creditor) => {
    setSelectedCreditor(creditor);
    setEditCreditor({
      name: creditor.name,
      phone: creditor.phone || '',
      vehicle_number: creditor.vehicle_number || '',
      amount: creditor.amount.toString(),
      due_date: creditor.due_date,
      notes: creditor.notes || '',
      station_id: creditor.station_id,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (creditor: Creditor) => {
    setSelectedCreditor(creditor);
    setIsDeleteDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'overdue':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  // Loading skeletons
  const StatsSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  const CreditorSkeleton = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-6 w-20 ml-auto" />
            <Skeleton className="h-8 w-24 ml-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Station selector for admin/OMC
  const renderStationSelector = () => {
    if (!canViewAllStations || availableStations.length === 0) return null;

    return (
      <div className="mb-4">
        <Label htmlFor="station-select" className="mb-2 block">Select Station</Label>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="Select a station" />
          </SelectTrigger>
          <SelectContent>
            {availableStations.map((station) => (
              <SelectItem key={station.id} value={station.id}>
                {station.name} ({station.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // FIXED: Added Add Button in Compact View
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg text-black">Creditor Management</h4>
          {canManageCreditors && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  style={{ backgroundColor: '#0B2265' }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Creditor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Creditor</DialogTitle>
                  <DialogDescription>
                    Record a new credit sale transaction
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {canViewAllStations && (
                    <div>
                      <Label htmlFor="station">Station *</Label>
                      <Select 
                        value={newCreditor.station_id} 
                        onValueChange={(value) => setNewCreditor({ ...newCreditor, station_id: value })}
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
                  )}
                  <div>
                    <Label htmlFor="name">Customer Name *</Label>
                    <Input
                      id="name"
                      value={newCreditor.name}
                      onChange={(e) => setNewCreditor({ ...newCreditor, name: e.target.value })}
                      placeholder="John Mensah"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (₵) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newCreditor.amount}
                      onChange={(e) => setNewCreditor({ ...newCreditor, amount: e.target.value })}
                      placeholder="500.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newCreditor.due_date}
                      onChange={(e) => setNewCreditor({ ...newCreditor, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddCreditor}
                    disabled={actionLoading === 'add'}
                  >
                    {actionLoading === 'add' ? 'Adding...' : 'Add Creditor'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-gray-600">Total Credit</p>
            <p className="text-lg text-black font-semibold">₵{stats.total.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <p className="text-gray-600">Pending</p>
            <p className="text-lg text-black font-semibold">{stats.pendingCount}</p>
          </div>
        </div>

        {/* Quick Add Form for Compact View */}
        {canManageCreditors && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-black mb-3">Quick Add Creditor</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="compact-name" className="text-xs">Name *</Label>
                <Input
                  id="compact-name"
                  value={newCreditor.name}
                  onChange={(e) => setNewCreditor({ ...newCreditor, name: e.target.value })}
                  placeholder="Customer name"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="compact-amount" className="text-xs">Amount *</Label>
                <Input
                  id="compact-amount"
                  type="number"
                  value={newCreditor.amount}
                  onChange={(e) => setNewCreditor({ ...newCreditor, amount: e.target.value })}
                  placeholder="500.00"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="compact-due-date" className="text-xs">Due Date *</Label>
                <Input
                  id="compact-due-date"
                  type="date"
                  value={newCreditor.due_date}
                  onChange={(e) => setNewCreditor({ ...newCreditor, due_date: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Button 
                  onClick={handleAddCreditor}
                  disabled={actionLoading === 'add' || !newCreditor.name || !newCreditor.amount || !newCreditor.due_date}
                  size="sm"
                  className="w-full"
                  style={{ backgroundColor: '#0B2265' }}
                >
                  {actionLoading === 'add' ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Creditor
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl text-black mb-1">Creditor Management</h3>
          <p className="text-gray-600">Credit Sales Tracking & Payment Collection</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadCreditors}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Suspense fallback={<Button variant="outline" disabled>Exporting...</Button>}>
            <LazyExportButton 
              data={creditors} 
              filename={`creditors-${selectedStation || 'all'}-${new Date().toISOString().split('T')[0]}`}
            />
          </Suspense>

          {canManageCreditors && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: '#0B2265' }} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Creditor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Creditor</DialogTitle>
                  <DialogDescription>
                    Record a new credit sale transaction with customer details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {canViewAllStations && (
                    <div>
                      <Label htmlFor="station">Station *</Label>
                      <Select 
                        value={newCreditor.station_id} 
                        onValueChange={(value) => setNewCreditor({ ...newCreditor, station_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select station" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStations.map((station) => (
                            <SelectItem key={station.id} value={station.id}>
                              {station.name} ({station.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="name">Customer Name *</Label>
                    <Input
                      id="name"
                      value={newCreditor.name}
                      onChange={(e) => setNewCreditor({ ...newCreditor, name: e.target.value })}
                      placeholder="John Mensah"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={newCreditor.phone}
                      onChange={(e) => setNewCreditor({ ...newCreditor, phone: e.target.value })}
                      placeholder="+233 24 123 4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicle">Vehicle Number</Label>
                    <Input
                      id="vehicle"
                      value={newCreditor.vehicle_number}
                      onChange={(e) =>
                        setNewCreditor({ ...newCreditor, vehicle_number: e.target.value })
                      }
                      placeholder="GE-1234-20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (₵) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={newCreditor.amount}
                      onChange={(e) => setNewCreditor({ ...newCreditor, amount: e.target.value })}
                      placeholder="500.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newCreditor.due_date}
                      onChange={(e) => setNewCreditor({ ...newCreditor, due_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      value={newCreditor.notes}
                      onChange={(e) => setNewCreditor({ ...newCreditor, notes: e.target.value })}
                      placeholder="Additional information about the credit sale..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddCreditor} 
                    style={{ backgroundColor: '#0B2265' }}
                    disabled={actionLoading === 'add'}
                  >
                    {actionLoading === 'add' ? 'Adding...' : 'Add Creditor'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Station Selector for Admin/OMC */}
      {renderStationSelector()}

      {/* Stats Overview */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Total Credit
              </CardDescription>
              <CardTitle className="text-2xl">₵{stats.total.toLocaleString()}</CardTitle>
              <p className="text-sm text-gray-600">{stats.count} records</p>
            </CardHeader>
          </Card>
          
          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                Pending
              </CardDescription>
              <CardTitle className="text-2xl text-yellow-600">
                ₵{stats.pending.toLocaleString()}
              </CardTitle>
              <p className="text-sm text-gray-600">{stats.pendingCount} pending</p>
            </CardHeader>
          </Card>
          
          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Paid
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">
                ₵{stats.paid.toLocaleString()}
              </CardTitle>
              <p className="text-sm text-gray-600">Collections</p>
            </CardHeader>
          </Card>
          
          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Overdue
              </CardDescription>
              <CardTitle className="text-2xl text-red-600">
                ₵{stats.overdue.toLocaleString()}
              </CardTitle>
              <p className="text-sm text-gray-600">{stats.overdueCount} overdue</p>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, vehicle, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Creditors List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-white p-1 rounded-xl">
          <TabsTrigger value="all">All ({creditors.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({creditors.filter((c) => c.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({creditors.filter((c) => c.status === 'overdue').length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({creditors.filter((c) => c.status === 'paid').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CreditorSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {filteredCreditors.map((creditor) => (
                <Card key={creditor.id} className="bg-white rounded-2xl shadow-sm border-0 hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-black">{creditor.name}</h3>
                          <Badge className={`${getStatusColor(creditor.status)} border`}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(creditor.status)}
                              {creditor.status.charAt(0).toUpperCase() + creditor.status.slice(1)}
                            </div>
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {canViewAllStations && creditor.station_name && (
                            <div className="flex items-center gap-2">
                              <span>🏪 {creditor.station_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span>🚗 {creditor.vehicle_number}</span>
                            <span>•</span>
                            <span>📞 {creditor.phone}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Sale: {creditor.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {creditor.due_date}
                            </span>
                          </div>
                          {creditor.payment_date && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Paid On: {creditor.payment_date}
                            </div>
                          )}
                          {creditor.notes && (
                            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                              📝 {creditor.notes}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            Updated: {new Date(creditor.updated_at || creditor.created_at || '').toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-3 ml-4 flex flex-col items-end">
                        <div className="text-2xl font-bold text-black">₵{creditor.amount.toLocaleString()}</div>
                        <div className="flex gap-2">
                          {creditor.status !== 'paid' && canManageCreditors && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCreditor(creditor);
                                setIsPaymentDialogOpen(true);
                              }}
                              style={{ backgroundColor: '#0B2265' }}
                              className="gap-2"
                              disabled={actionLoading === 'payment'}
                            >
                              <CheckCircle className="w-4 h-4" />
                              {actionLoading === 'payment' ? 'Processing...' : 'Mark Paid'}
                            </Button>
                          )}
                          
                          {(canManageCreditors || canDeleteCreditors) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canManageCreditors && (
                                  <DropdownMenuItem onClick={() => openEditDialog(creditor)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Creditor
                                  </DropdownMenuItem>
                                )}
                                {canDeleteCreditors && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => openDeleteDialog(creditor)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Creditor
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredCreditors.length === 0 && (
                <Card className="bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="pt-6 text-center py-12">
                    <div className="text-gray-500">
                      <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg mb-2">No creditors found</p>
                      <p className="text-sm">Try adjusting your search or add a new creditor</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {/* Same structure as "all" but filtered for pending */}
        </TabsContent>
        
        <TabsContent value="overdue" className="space-y-4">
          {/* Same structure as "all" but filtered for overdue */}
        </TabsContent>
        
        <TabsContent value="paid" className="space-y-4">
          {/* Same structure as "all" but filtered for paid */}
        </TabsContent>
      </Tabs>

      {/* Edit Creditor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Creditor</DialogTitle>
            <DialogDescription>
              Update creditor information for {selectedCreditor?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {canViewAllStations && (
              <div>
                <Label htmlFor="edit-station">Station *</Label>
                <Select 
                  value={editCreditor.station_id} 
                  onValueChange={(value) => setEditCreditor({ ...editCreditor, station_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStations.map((station) => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name} ({station.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="edit-name">Customer Name *</Label>
              <Input
                id="edit-name"
                value={editCreditor.name}
                onChange={(e) => setEditCreditor({ ...editCreditor, name: e.target.value })}
                placeholder="John Mensah"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={editCreditor.phone}
                onChange={(e) => setEditCreditor({ ...editCreditor, phone: e.target.value })}
                placeholder="+233 24 123 4567"
              />
            </div>
            <div>
              <Label htmlFor="edit-vehicle">Vehicle Number</Label>
              <Input
                id="edit-vehicle"
                value={editCreditor.vehicle_number}
                onChange={(e) => setEditCreditor({ ...editCreditor, vehicle_number: e.target.value })}
                placeholder="GE-1234-20"
              />
            </div>
            <div>
              <Label htmlFor="edit-amount">Amount (₵) *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={editCreditor.amount}
                onChange={(e) => setEditCreditor({ ...editCreditor, amount: e.target.value })}
                placeholder="500.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-due_date">Due Date *</Label>
              <Input
                id="edit-due_date"
                type="date"
                value={editCreditor.due_date}
                onChange={(e) => setEditCreditor({ ...editCreditor, due_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                value={editCreditor.notes}
                onChange={(e) => setEditCreditor({ ...editCreditor, notes: e.target.value })}
                placeholder="Additional information about the credit sale..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditCreditor} 
              style={{ backgroundColor: '#0B2265' }}
              disabled={actionLoading === 'edit'}
            >
              {actionLoading === 'edit' ? 'Updating...' : 'Update Creditor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Creditor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this creditor? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Warning: This action is permanent</span>
              </div>
              <p className="text-sm text-red-700 mt-2">
                You are about to delete <strong>{selectedCreditor?.name}</strong> with an amount of{' '}
                <strong>₵{selectedCreditor?.amount.toLocaleString()}</strong>. This will remove all records of this creditor.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCreditor}
              disabled={actionLoading === 'delete'}
            >
              {actionLoading === 'delete' ? 'Deleting...' : 'Delete Creditor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Mark {selectedCreditor?.name}'s credit as paid
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Amount to Collect:</span>
                <span className="text-xl font-bold text-black">
                  ₵{selectedCreditor?.amount.toLocaleString()}
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="receipt" className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4" />
                Attach Receipt (Optional)
              </Label>
              <Input id="receipt" type="file" accept="image/*" capture="environment" />
              <p className="text-xs text-gray-500 mt-1">
                Take a photo of the payment receipt for record keeping
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleMarkAsPaid()} 
              style={{ backgroundColor: '#0B2265' }}
              disabled={actionLoading === 'payment'}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {actionLoading === 'payment' ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreditorsManager;