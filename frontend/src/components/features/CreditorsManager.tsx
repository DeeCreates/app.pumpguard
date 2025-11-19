import React, { useState } from 'react';
import { Plus, Search, Filter, DollarSign, Calendar, CheckCircle, XCircle, Eye, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

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
}

export function CreditorsManager({ stationId }: { stationId: string }) {
  const [creditors, setCreditors] = useState<Creditor[]>([
    {
      id: '1',
      name: 'John Mensah',
      phone: '+233 24 123 4567',
      vehicle_number: 'GE-1234-20',
      amount: 500,
      date: '2025-10-15',
      due_date: '2025-10-30',
      status: 'pending',
      station_id: stationId,
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
      station_id: stationId,
    },
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCreditor, setSelectedCreditor] = useState<Creditor | null>(null);
  
  const [newCreditor, setNewCreditor] = useState({
    name: '',
    phone: '',
    vehicle_number: '',
    amount: '',
    due_date: '',
    notes: '',
  });

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
  };

  const handleAddCreditor = () => {
    if (!newCreditor.name || !newCreditor.amount || !newCreditor.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

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
      station_id: stationId,
    };

    setCreditors([...creditors, creditor]);
    setNewCreditor({
      name: '',
      phone: '',
      vehicle_number: '',
      amount: '',
      due_date: '',
      notes: '',
    });
    setIsAddDialogOpen(false);
    toast.success('Creditor added successfully');
  };

  const handleMarkAsPaid = (receiptPhoto?: string) => {
    if (!selectedCreditor) return;

    setCreditors(
      creditors.map((c) =>
        c.id === selectedCreditor.id
          ? {
              ...c,
              status: 'paid',
              payment_date: new Date().toISOString().split('T')[0],
              receipt_photo: receiptPhoto,
            }
          : c
      )
    );

    setIsPaymentDialogOpen(false);
    setSelectedCreditor(null);
    toast.success('Payment recorded successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Credit</CardDescription>
            <CardTitle className="text-2xl">GHS {stats.total.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              GHS {stats.pending.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              GHS {stats.paid.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              GHS {stats.overdue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
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
                <Label htmlFor="amount">Amount (GHS) *</Label>
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
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newCreditor.notes}
                  onChange={(e) => setNewCreditor({ ...newCreditor, notes: e.target.value })}
                  placeholder="Additional information..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCreditor}>Add Creditor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Creditors List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
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
          {filteredCreditors.map((creditor) => (
            <Card key={creditor.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{creditor.name}</h3>
                      <Badge className={getStatusColor(creditor.status)}>
                        {creditor.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Vehicle: {creditor.vehicle_number}</div>
                      <div>Phone: {creditor.phone}</div>
                      <div>Sale Date: {creditor.date}</div>
                      <div>Due Date: {creditor.due_date}</div>
                      {creditor.payment_date && (
                        <div>Paid On: {creditor.payment_date}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-2xl font-bold">GHS {creditor.amount.toLocaleString()}</div>
                    {creditor.status !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCreditor(creditor);
                          setIsPaymentDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredCreditors.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  No creditors found
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {/* Same structure as "all" but filtered */}
        </TabsContent>
        <TabsContent value="overdue">
          {/* Same structure as "all" but filtered */}
        </TabsContent>
        <TabsContent value="paid">
          {/* Same structure as "all" but filtered */}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Mark {selectedCreditor?.name}'s credit as paid
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between items-center">
                <span>Amount:</span>
                <span className="text-xl font-bold">
                  GHS {selectedCreditor?.amount.toLocaleString()}
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="receipt">Attach Receipt (Optional)</Label>
              <Input id="receipt" type="file" accept="image/*" capture="environment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleMarkAsPaid()}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
