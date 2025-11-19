// src/components/admin/AdminDashboard.tsx
import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { authAPI } from "../../lib/auth-api";
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
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  Building2,
  Fuel,
  TrendingUp,
  Activity,
  Plus,
  Users,
  AlertTriangle,
  Shield,
  MapPin,
  DollarSign,
  BarChart3,
  Loader2,
  Eye,
  Trash2,
  UserCog,
  Store,
  UserCheck,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  MapPinHouse,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// Enhanced Types with Real Data Structure
interface DashboardStats {
  total_stations: number;
  total_sales: number;
  total_volume: number;
  active_violations: number;
  total_users: number;
  active_shifts: number;
  total_omcs: number;
  monthly_growth: number;
  total_revenue: number;
  compliance_rate: number;
}

interface OMC {
  id: string;
  name: string;
  license_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
  total_stations?: number;
  total_users?: number;
}

interface Station {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  region?: string;
  omc_id?: string;
  dealer_id?: string;
  manager_id?: string;
  status: 'active' | 'inactive' | 'maintenance';
  compliance_status: 'compliant' | 'non_compliant' | 'under_review';
  total_sales?: number;
  total_violations?: number;
  created_at: string;
  omcs?: {
    name: string;
    code: string;
  };
  dealers?: {
    name: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  station_id?: string;
  omc_id?: string;
  dealer_id?: string;
  status: 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  stations?: {
    name: string;
    code: string;
  };
  omcs?: {
    name: string;
    code: string;
  };
  dealers?: {
    name: string;
  };
}

interface ComplianceViolation {
  id: string;
  station_id: string;
  product_id: string;
  actual_price: number;
  price_cap: number;
  litres_sold: number;
  fine_amount: number;
  status: 'open' | 'appealed' | 'under_review' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  violation_date: string;
  reported_by: string;
  appeal_reason?: string;
  created_at: string;
  stations?: {
    name: string;
    code: string;
    omcs?: {
      name: string;
    };
  };
  products?: {
    name: string;
  };
}

interface Dealer {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  omc_id?: string;
  commission_rate?: number;
  is_active: boolean;
  created_at: string;
  omcs?: {
    name: string;
    code: string;
  };
  total_stations?: number;
}

interface StationFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  region: string;
  omc_id: string;
  dealer_id?: string;
  manager_id?: string;
}

// Enhanced form dialog with separators
const FormSection: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="space-y-4">
    <div>
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
    {children}
    <Separator />
  </div>
);

// Enhanced API integration functions
const useDashboardData = () => {
  const [data, setData] = useState({
    stats: null as DashboardStats | null,
    omcs: [] as OMC[],
    stations: [] as Station[],
    dealers: [] as Dealer[],
    users: [] as User[],
    violations: [] as ComplianceViolation[],
    availableRoles: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading dashboard data...');

      // Load data sequentially to avoid overwhelming the API
      const analyticsResponse = await api.getGlobalAnalytics();
      if (!analyticsResponse.success) {
        throw new Error(`Analytics: ${analyticsResponse.error}`);
      }

      const omcsResponse = await api.getOMCs();
      if (!omcsResponse.success) {
        throw new Error(`OMCs: ${omcsResponse.error}`);
      }

      const stationsResponse = await api.getAllStations();
      if (!stationsResponse.success) {
        throw new Error(`Stations: ${stationsResponse.error}`);
      }

      const dealersResponse = await api.getDealers();
      if (!dealersResponse.success) {
        throw new Error(`Dealers: ${dealersResponse.error}`);
      }

      // These can fail without breaking the entire dashboard
      const usersResponse = await api.getUsers({ limit: 10, page: 1 }).catch(() => ({ success: false, data: { users: [] } }));
      const violationsResponse = await api.getViolations({ status: 'open' }).catch(() => ({ success: false, data: [] }));
      const rolesResponse = await authAPI.getAvailableRoles().catch(() => ({ success: false, data: { roles: [] } }));

      setData({
        stats: analyticsResponse.data,
        omcs: omcsResponse.data || [],
        stations: stationsResponse.data || [],
        dealers: dealersResponse.data || [],
        users: usersResponse.success ? (usersResponse.data as any)?.users || [] : [],
        violations: violationsResponse.success ? violationsResponse.data || [] : [],
        availableRoles: rolesResponse.success ? (rolesResponse.data as any)?.roles || ['admin', 'omc', 'dealer', 'station_manager', 'attendant'] : ['admin', 'omc', 'dealer', 'station_manager', 'attendant'],
      });

      console.log('✅ Dashboard data loaded successfully');

    } catch (err: any) {
      console.error('❌ Failed to load dashboard data:', err);
      const errorMessage = err.message || 'Failed to load dashboard data';
      setError(errorMessage);
      toast.error("Failed to load dashboard data", {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return { data, loading, error, refetch: loadData };
};

// Enhanced OMC Creation Dialog with Separators
const CreateOMCDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}> = ({ open, onOpenChange, onSuccess }) => {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    region: '',
    license_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.contact_person.trim()) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields"
      });
      return;
    }

    setCreating(true);

    try {
      // Generate code if not provided
      const finalCode = formData.code || generateOMCCode(formData.name);
      
      const result = await api.createOMC({
        ...formData,
        code: finalCode,
      });

      if (result.success) {
        toast.success("OMC created successfully!");
        onOpenChange(false);
        setFormData({
          name: '',
          code: '',
          contact_person: '',
          email: '',
          phone: '',
          address: '',
          region: '',
          license_number: '',
        });
        onSuccess();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('OMC creation error:', error);
      toast.error("Failed to create OMC", {
        description: error.message
      });
    } finally {
      setCreating(false);
    }
  };

  const generateOMCCode = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 10) + '_' + Date.now().toString().slice(-6);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Oil Marketing Company</DialogTitle>
          <DialogDescription>
            Register a new OMC with complete business details and contact information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection 
            title="Basic Information" 
            description="Core company details and identification"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="omc-name">Company Name *</Label>
                <Input
                  id="omc-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="omc-code">Company Code</Label>
                <Input
                  id="omc-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
                <p className="text-xs text-gray-500">
                  Unique identifier for the OMC
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="omc-license">License Number</Label>
              <Input
                id="omc-license"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="Enter business license number"
              />
            </div>
          </FormSection>

          <FormSection 
            title="Contact Information" 
            description="Primary contact details for the OMC"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="omc-contact">Contact Person *</Label>
                <Input
                  id="omc-contact"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Full name of contact person"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="omc-email">Email Address *</Label>
                <Input
                  id="omc-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="omc-phone">Phone Number</Label>
              <Input
                id="omc-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+233 XX XXX XXXX"
              />
            </div>
          </FormSection>

          <FormSection 
            title="Location Details" 
            description="Physical address and operational region"
          >
            <div className="space-y-2">
              <Label htmlFor="omc-address">Business Address *</Label>
              <Input
                id="omc-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full business address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="omc-region">Operating Region *</Label>
              <Input
                id="omc-region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="Primary operational region"
                required
              />
            </div>
          </FormSection>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-900 hover:bg-blue-800"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating OMC...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Create OMC
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Station Creation Dialog with Separators
const CreateStationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  omcs: OMC[];
}> = ({ open, onOpenChange, onSuccess, omcs }) => {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<StationFormData>({
    name: '',
    code: '',
    address: '',
    city: '',
    region: '',
    omc_id: '',
    dealer_id: '',
    manager_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || !formData.address.trim() || !formData.region.trim() || !formData.omc_id) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields"
      });
      return;
    }

    setCreating(true);

    try {
      // Generate station code
      const stationCode = formData.code || generateStationCode(formData.name);
      
      const response = await api.createStation({
        ...formData,
        code: stationCode,
        // Ensure proper null values for optional fields
        dealer_id: formData.dealer_id || undefined,
        manager_id: formData.manager_id || undefined
      });

      if (response.success) {
        toast.success("Station created successfully!");
        onOpenChange(false);
        setFormData({
          name: '',
          code: '',
          address: '',
          city: '',
          region: '',
          omc_id: '',
          dealer_id: '',
          manager_id: ''
        });
        onSuccess();
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      console.error('Station creation error:', error);
      toast.error("Failed to create station", {
        description: error.message
      });
    } finally {
      setCreating(false);
    }
  };

  const generateStationCode = (name: string): string => {
    const base = name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 10);
    
    const timestamp = Date.now().toString().slice(-6);
    return `${base}_${timestamp}`;
  };

  const handleNameChange = (name: string) => {
    const newCode = generateStationCode(name);
    setFormData(prev => ({
      ...prev,
      name,
      code: newCode
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Station</DialogTitle>
          <DialogDescription>
            Add a new fuel station to the network with complete operational details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection 
            title="Station Identification" 
            description="Basic station details and unique identifiers"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="station-name">Station Name *</Label>
                <Input
                  id="station-name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter station name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="station-code">Station Code *</Label>
                <Input
                  id="station-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Auto-generated code"
                  required
                />
                <p className="text-xs text-gray-500">
                  Unique code for station identification
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-omc">OMC *</Label>
              <Select 
                value={formData.omc_id} 
                onValueChange={(value) => setFormData({ ...formData, omc_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select OMC" />
                </SelectTrigger>
                <SelectContent>
                  {omcs.map((omc) => (
                    <SelectItem key={omc.id} value={omc.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {omc.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormSection>

          <FormSection 
            title="Location Details" 
            description="Physical location and address information"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="station-region">Region *</Label>
                <Input
                  id="station-region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="Operational region"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="station-city">City</Label>
                <Input
                  id="station-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City or town"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-address">Full Address *</Label>
              <Input
                id="station-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Complete physical address"
                required
              />
            </div>
          </FormSection>

          <FormSection 
            title="Additional Information" 
            description="Optional management and dealer assignments"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="station-dealer">Dealer (Optional)</Label>
                <Input
                  id="station-dealer"
                  value={formData.dealer_id || ''}
                  onChange={(e) => setFormData({ ...formData, dealer_id: e.target.value })}
                  placeholder="Dealer ID (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="station-manager">Manager (Optional)</Label>
                <Input
                  id="station-manager"
                  value={formData.manager_id || ''}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  placeholder="Manager ID (optional)"
                />
              </div>
            </div>
          </FormSection>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-900 hover:bg-blue-800"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Station...
                </>
              ) : (
                <>
                  <Fuel className="w-4 h-4 mr-2" />
                  Create Station
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced User Creation Dialog with Separators
const CreateUserDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableRoles: string[];
  omcs: OMC[];
  stations: Station[];
  dealers: Dealer[];
}> = ({ open, onOpenChange, onSuccess, availableRoles, omcs, stations, dealers }) => {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'attendant' as string,
    phone: '',
    station_id: '',
    omc_id: '',
    dealer_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email.trim() || !formData.password.trim() || !formData.full_name.trim()) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Validation Error", {
        description: "Password must be at least 6 characters"
      });
      return;
    }

    setCreating(true);

    try {
      const result = await api.signup({
        email: formData.email,
        password: formData.password,
        fullName: formData.full_name,
        phone: formData.phone || undefined,
        role: formData.role,
        omc_id: formData.omc_id || undefined,
        station_id: formData.station_id || undefined,
        dealer_id: formData.dealer_id || undefined
      });

      if (result.success) {
        toast.success("User created successfully!");
        onOpenChange(false);
        setFormData({
          email: '',
          password: '',
          full_name: '',
          role: 'attendant',
          phone: '',
          station_id: '',
          omc_id: '',
          dealer_id: ''
        });
        onSuccess();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('User creation error:', error);
      toast.error("Failed to create user", {
        description: error.message
      });
    } finally {
      setCreating(false);
    }
  };

  const getRoleIcon = (role: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      admin: <ShieldCheck className="w-4 h-4" />,
      omc: <Building2 className="w-4 h-4" />,
      dealer: <Store className="w-4 h-4" />,
      station_manager: <UserCog className="w-4 h-4" />,
      attendant: <UserCheck className="w-4 h-4" />,
      supervisor: <Shield className="w-4 h-4" />,
    };
    return icons[role] || <Users className="w-4 h-4" />;
  };

  const getRoleDescription = (role: string) => {
    const descriptions: { [key: string]: string } = {
      admin: "Full system access and administrative privileges",
      omc: "Manage OMC operations, stations, and view reports",
      dealer: "Manage dealer operations and commission tracking",
      station_manager: "Manage station operations, shifts, and attendants",
      attendant: "Record sales and manage daily station operations",
      supervisor: "Compliance monitoring and system oversight",
    };
    return descriptions[role] || "System user with role-based permissions";
  };

  const shouldShowOMCField = () => ['omc', 'station_manager', 'attendant', 'dealer'].includes(formData.role);
  const shouldShowStationField = () => ['station_manager', 'attendant'].includes(formData.role);
  const shouldShowDealerField = () => formData.role === 'dealer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
          <DialogDescription>
            Create system users with role-based permissions and access controls
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection 
            title="Personal Information" 
            description="User's basic personal and contact details"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Full Name *</Label>
                <Input
                  id="user-name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-phone">Phone Number</Label>
                <Input
                  id="user-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
            </div>
          </FormSection>

          <FormSection 
            title="Account Credentials" 
            description="Login credentials and authentication details"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-email">Email Address *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Password *</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </FormSection>

          <FormSection 
            title="Role & Permissions" 
            description="User role and access level configuration"
          >
            <div className="space-y-2">
              <Label htmlFor="user-role">System Role *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({ ...formData, role: value, omc_id: '', station_id: '', dealer_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        <span className="capitalize">{role.replace('_', ' ')}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {getRoleDescription(formData.role)}
              </p>
            </div>
          </FormSection>

          {shouldShowOMCField() && (
            <FormSection 
              title="OMC Assignment" 
              description="Assign user to specific Oil Marketing Company"
            >
              <div className="space-y-2">
                <Label htmlFor="user-omc">OMC *</Label>
                <Select 
                  value={formData.omc_id} 
                  onValueChange={(value) => setFormData({ ...formData, omc_id: value, station_id: '', dealer_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select OMC" />
                  </SelectTrigger>
                  <SelectContent>
                    {omcs.map((omc) => (
                      <SelectItem key={omc.id} value={omc.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {omc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSection>
          )}

          {shouldShowStationField() && (
            <FormSection 
              title="Station Assignment" 
              description="Assign user to specific fuel station"
            >
              <div className="space-y-2">
                <Label htmlFor="user-station">Station *</Label>
                <Input
                  id="user-station"
                  value={formData.station_id}
                  onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
                  placeholder="Station ID"
                  disabled={!formData.omc_id}
                />
                <p className="text-xs text-gray-500">
                  {!formData.omc_id ? "Please select OMC first" : "Enter the station ID"}
                </p>
              </div>
            </FormSection>
          )}

          {shouldShowDealerField() && (
            <FormSection 
              title="Dealer Assignment" 
              description="Assign user to specific dealer"
            >
              <div className="space-y-2">
                <Label htmlFor="user-dealer">Dealer</Label>
                <Input
                  id="user-dealer"
                  value={formData.dealer_id}
                  onChange={(e) => setFormData({ ...formData, dealer_id: e.target.value })}
                  placeholder="Dealer ID (optional)"
                  disabled={!formData.omc_id}
                />
                <p className="text-xs text-gray-500">
                  {!formData.omc_id ? "Please select OMC first" : "Enter the dealer ID (optional)"}
                </p>
              </div>
            </FormSection>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-900 hover:bg-blue-800"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main Admin Dashboard Component
export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showOMCDialog, setShowOMCDialog] = useState(false);
  const [showStationDialog, setShowStationDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);

  const { data, loading, error, refetch } = useDashboardData();

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const result = await api.deleteUser(userId);
      
      if (result.success) {
        toast.success("User deleted successfully!");
        await refetch();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error("Failed to delete user", {
        description: error.message
      });
    }
  };

  const handleResolveViolation = async (violationId: string) => {
    try {
      const result = await api.updateViolation(violationId, {
        status: 'resolved',
        resolved_by: 'admin',
        resolved_at: new Date().toISOString()
      });

      if (result.success) {
        toast.success("Violation resolved successfully!");
        await refetch();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Resolve violation error:', error);
      toast.error("Failed to resolve violation", {
        description: error.message
      });
    }
  };

  // Render different tab content
  const renderTabContent = () => {
    if (loading) {
      return <DashboardSkeleton />;
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refetch} className="bg-blue-900 hover:bg-blue-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'network':
        return <NetworkTab omcs={data.omcs} stations={data.stations} dealers={data.dealers} />;
      case 'compliance':
        return (
          <ComplianceTab 
            violations={data.violations} 
            onResolveViolation={handleResolveViolation} 
          />
        );
      case 'financial':
        return <FinancialTab stats={data.stats} />;
      case 'overview':
      default:
        return (
          <OverviewTab 
            stats={data.stats} 
            recentUsers={data.users} 
            violations={data.violations}
            onDeleteUser={handleDeleteUser} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base">PumpGuard HQ - System-Wide Supreme Authority</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              className="bg-blue-900 hover:bg-blue-800"
              onClick={() => setShowOMCDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New OMC</span>
              <span className="sm:hidden">OMC</span>
            </Button>

            <Button 
              size="sm" 
              className="bg-blue-900 hover:bg-blue-800"
              onClick={() => setShowStationDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Station</span>
              <span className="sm:hidden">Station</span>
            </Button>

            <Button 
              size="sm" 
              className="bg-blue-900 hover:bg-blue-800"
              onClick={() => setShowUserDialog(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New User</span>
              <span className="sm:hidden">User</span>
            </Button>

            <Button 
              size="sm" 
              variant="outline"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-1 mb-6 sm:mb-8 p-1 bg-white rounded-xl sm:rounded-2xl shadow-sm w-full">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'network', label: 'Network', icon: MapPin },
            { id: 'compliance', label: 'Compliance', icon: Shield },
            { id: 'financial', label: 'Financial', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm sm:text-base">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Enhanced Dialogs */}
        <CreateOMCDialog
          open={showOMCDialog}
          onOpenChange={setShowOMCDialog}
          onSuccess={refetch}
        />

        <CreateStationDialog
          open={showStationDialog}
          onOpenChange={setShowStationDialog}
          onSuccess={refetch}
          omcs={data.omcs}
        />

        <CreateUserDialog
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          onSuccess={refetch}
          availableRoles={data.availableRoles}
          omcs={data.omcs}
          stations={data.stations}
          dealers={data.dealers}
        />
      </div>
    </div>
  );
}

// Enhanced Tab Components with Real Data
const OverviewTab = ({ 
  stats, 
  recentUsers, 
  violations,
  onDeleteUser 
}: { 
  stats: DashboardStats | null, 
  recentUsers: User[],
  violations: ComplianceViolation[],
  onDeleteUser: (userId: string) => void
}) => {
  const activeViolations = violations.filter(v => v.status === 'open');

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Stations</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats?.total_stations || 0}</p>
              <p className="text-xs sm:text-sm text-green-600">Active network</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Fuel className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Revenue</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">₵{(stats?.total_sales || 0).toLocaleString()}</p>
              <p className="text-xs sm:text-sm text-green-600">All-time sales</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm mb-1">Active Violations</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{activeViolations.length}</p>
              <p className="text-xs sm:text-sm text-red-600">Requires attention</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm mb-1">System Users</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats?.total_users || 0}</p>
              <p className="text-xs sm:text-sm text-blue-600">Active accounts</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <CardHeader className="p-0 pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">System Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ChartPlaceholder />
          </CardContent>
        </Card>

        <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <CardHeader className="p-0 pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Network Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MapPlaceholder />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <CardHeader className="p-0 pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3">
              {recentUsers.length > 0 ? recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {user.email}
                      {user.stations?.name && ` • ${user.stations.name}`}
                      {user.omcs?.name && ` • ${user.omcs.name}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={() => onDeleteUser(user.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <CardHeader className="p-0 pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-11">
                <Shield className="w-4 h-4 mr-2" />
                Compliance Center
              </Button>
              <Button variant="outline" className="w-full justify-start h-11">
                <Users className="w-4 h-4 mr-2" />
                User Management
              </Button>
              <Button variant="outline" className="w-full justify-start h-11">
                <Building2 className="w-4 h-4 mr-2" />
                OMC Network
              </Button>
              <Button variant="outline" className="w-full justify-start h-11">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Violation Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Network Tab Component
const NetworkTab = ({ omcs, stations, dealers }: { omcs: OMC[], stations: Station[], dealers: Dealer[] }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            OMC Network ({omcs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {omcs.length > 0 ? omcs.map((omc) => (
              <div key={omc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{omc.name}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {omc.license_number || 'No license'} • {omc.region || 'No region'}
                  </p>
                  {omc.contact_person && (
                    <p className="text-xs text-gray-500 truncate">
                      <Phone className="w-3 h-3 inline mr-1" />
                      {omc.contact_person}
                    </p>
                  )}
                </div>
                <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                  {stations.filter(s => s.omc_id === omc.id).length} stations
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No OMCs found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            Station Network ({stations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stations.length > 0 ? stations.map((station) => (
              <div key={station.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{station.name}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {station.code} • {station.region || 'No region'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge 
                      variant={
                        station.compliance_status === 'compliant' ? 'default' :
                        station.compliance_status === 'non_compliant' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {station.compliance_status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {station.status}
                    </Badge>
                  </div>
                </div>
                <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                  {omcs.find(o => o.id === station.omc_id)?.name || 'No OMC'}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Fuel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No stations found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Dealer Network ({dealers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dealers.length > 0 ? dealers.map((dealer) => (
              <div key={dealer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{dealer.name}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {dealer.contact_person || 'No contact'} • {dealer.commission_rate || 0}% commission
                  </p>
                  {dealer.email && (
                    <p className="text-xs text-gray-500 truncate">
                      <Mail className="w-3 h-3 inline mr-1" />
                      {dealer.email}
                    </p>
                  )}
                </div>
                <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                  {omcs.find(o => o.id === dealer.omc_id)?.name || 'No OMC'}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No dealers found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Compliance Tab Component
const ComplianceTab = ({ 
  violations, 
  onResolveViolation 
}: { 
  violations: ComplianceViolation[],
  onResolveViolation: (violationId: string) => void
}) => {
  const activeViolations = violations.filter(v => v.status === 'open');
  const resolvedViolations = violations.filter(v => v.status === 'resolved');

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-lg">Violation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Violations</span>
                <Badge variant="destructive">{activeViolations.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Resolved</span>
                <Badge variant="secondary">{resolvedViolations.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total</span>
                <Badge variant="outline">{violations.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 p-6 bg-white rounded-2xl shadow-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeViolations.length > 0 ? activeViolations.map((violation) => (
                <div key={violation.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium text-red-900">
                        {violation.stations?.name || 'Unknown Station'}
                      </p>
                      <Badge className={getSeverityColor(violation.severity)}>
                        {violation.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-red-700">
                      {violation.products?.name || 'Unknown Product'}: ₵{violation.actual_price} vs cap ₵{violation.price_cap}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {violation.stations?.omcs?.name || 'Unknown OMC'} • {new Date(violation.created_at).toLocaleDateString()} • Fine: ₵{violation.fine_amount}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onResolveViolation(violation.id)}
                  >
                    Resolve
                  </Button>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
                  <p className="text-gray-600">No active compliance violations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Financial Tab Component
const FinancialTab = ({ stats }: { stats: DashboardStats | null }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-green-800 font-medium">Total Sales</span>
              <span className="text-green-800 font-bold">₵{(stats?.total_sales || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-800 font-medium">Total Volume</span>
              <span className="text-blue-800 font-bold">{(stats?.total_volume || 0).toLocaleString()}L</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-purple-800 font-medium">Active OMCs</span>
              <span className="text-purple-800 font-bold">{stats?.total_omcs || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 p-6 bg-white rounded-2xl shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Analytics</h3>
            <p className="text-gray-600 mb-4">Comprehensive financial reporting and analytics</p>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{stats?.total_stations || 0}</p>
                <p className="text-sm text-gray-600">Revenue Sources</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{stats?.total_omcs || 0}</p>
                <p className="text-sm text-gray-600">OMC Partners</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Skeleton Component
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl" />
          </div>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </Card>
      <Card className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border-0">
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </Card>
    </div>
  </div>
);

// Placeholder components
const ChartPlaceholder = () => (
  <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
    <div className="text-center">
      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
      <p className="text-gray-500">Sales chart will be implemented soon</p>
    </div>
  </div>
);

const MapPlaceholder = () => (
  <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
    <div className="text-center">
      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
      <p className="text-gray-500">Station map will be implemented soon</p>
    </div>
  </div>
);

export default AdminDashboard;