import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Loader2, 
  MoreVertical,
  RefreshCw,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Building,
  Store,
  Fuel
} from "lucide-react";
import { api } from "../../lib/api";
import { ExportButton } from "../../components/export-button";
import { useExport } from "../../hooks/use-export";
import { toast } from "sonner";

// Enhanced User interface matching our API types
interface EnhancedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  station_id?: string;
  omc_id?: string;
  dealer_id?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  
  // Related data
  stations?: {
    id: string;
    name: string;
    code: string;
  };
  omcs?: {
    id: string;
    name: string;
    code: string;
  };
  dealers?: {
    id: string;
    name: string;
  };
}

interface Station {
  id: string;
  name: string;
  code: string;
}

interface OMC {
  id: string;
  name: string;
  code: string;
}

interface Dealer {
  id: string;
  name: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  omc_id?: string;
  station_id?: string;
  dealer_id?: string;
}

interface UsersResponse {
  users: EnhancedUser[];
  pagination: PaginationInfo;
  filters: UserFilters;
}

// Custom Separator Component following Apple design
const Separator = ({ className = "" }: { className?: string }) => (
  <div className={`h-px bg-gray-200 ${className}`} />
);

// Section Header Component
const SectionHeader = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-4">
    {icon && <div className="text-gray-500">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);

export function UserManagement() {
  // State management
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [omcs, setOmcs] = useState<OMC[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 50,
    search: "",
    role: "all",
    status: "all"
  });
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Selected items
  const [editingUser, setEditingUser] = useState<EnhancedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<EnhancedUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });

  // Export functionality
  const { isExporting, exportUsers } = useExport();

  // Form states
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "attendant",
    phone: "",
    station_id: "",
    omc_id: "",
    dealer_id: "",
    status: "active" as 'active' | 'inactive',
    send_invitation: true
  });

  const [editUser, setEditUser] = useState({
    full_name: "",
    email: "",
    role: "attendant",
    phone: "",
    station_id: "",
    omc_id: "",
    dealer_id: "",
    status: "active" as 'active' | 'inactive'
  });

  // Memoized filter dependencies to prevent unnecessary re-renders
  const filterDependencies = useMemo(() => ({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    role: filters.role,
    status: filters.status
  }), [filters.page, filters.limit, filters.search, filters.role, filters.status]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        usersResponse, 
        stationsResponse, 
        omcsResponse, 
        dealersResponse, 
        rolesResponse
      ] = await Promise.all([
        api.getUsers(filters),
        api.getAllStations(),
        api.getOMCs(),
        api.getDealers(),
        api.getAvailableRoles()
      ]);

      // Enhanced users response handling
      if (usersResponse.success) {
        if (usersResponse.data && typeof usersResponse.data === 'object') {
          if ('users' in usersResponse.data) {
            // New structure: { users: [], pagination: {} }
            const usersData = (usersResponse.data as UsersResponse).users || [];
            const paginationData = (usersResponse.data as UsersResponse).pagination;
            
            setUsers(usersData);
            setPagination(paginationData || pagination);
          } else if (Array.isArray(usersResponse.data)) {
            // Fallback: direct array
            setUsers(usersResponse.data);
          } else {
            setUsers([]);
          }
        } else {
          setUsers([]);
        }
      } else {
        setUsers([]);
        toast.error("Failed to load users", {
          description: usersResponse.error
        });
      }

      // Safe handling for other API responses
      setStations(Array.isArray(stationsResponse.data) ? stationsResponse.data : []);
      setOmcs(Array.isArray(omcsResponse.data) ? omcsResponse.data : []);
      setDealers(Array.isArray(dealersResponse.data) ? dealersResponse.data : []);
      setAvailableRoles(Array.isArray(rolesResponse.data?.roles) ? rolesResponse.data.roles : []);

    } catch (error) {
      console.error("Failed to load initial data:", error);
      setError("Failed to load data. Please check your connection and try again.");
      toast.error("Failed to load data", {
        description: "Please check your connection and try again."
      });
      // Reset all states on error
      setUsers([]);
      setStations([]);
      setOmcs([]);
      setDealers([]);
      setAvailableRoles([]);
    } finally {
      setLoading(false);
    }
  }, [filterDependencies]);

  // Load data when filters change
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Enhanced signup function with explicit dealer handling
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateUserForm(newUser);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error("Validation Error", { description: error }));
      return;
    }
    
    // Validate dealer role has dealer_id
    if (newUser.role === 'dealer' && !newUser.dealer_id) {
      toast.error("Validation Error", {
        description: "Dealer users must be associated with a dealer organization"
      });
      return;
    }
    
    setCreating(true);
    
    try {
      // Prepare signup data with explicit null values for dealer role
      const signupData: any = {
        email: newUser.email,
        password: newUser.password,
        fullName: newUser.full_name,
        phone: newUser.phone || undefined,
        role: newUser.role,
      };

      // Handle entity assignments based on role - EXPLICITLY set to null
      switch (newUser.role) {
        case 'dealer':
          signupData.dealer_id = newUser.dealer_id;
          // EXPLICITLY set to null to prevent any auto-assignment
          signupData.station_id = null;
          signupData.omc_id = null;
          break;
        case 'omc':
          signupData.omc_id = newUser.omc_id || null;
          signupData.station_id = null;
          signupData.dealer_id = null;
          break;
        case 'station_manager':
        case 'attendant':
          signupData.station_id = newUser.station_id || null;
          signupData.omc_id = null;
          signupData.dealer_id = null;
          break;
        default:
          // For admin, npa, supervisor - explicitly set to null
          signupData.station_id = null;
          signupData.omc_id = null;
          signupData.dealer_id = null;
      }

      console.log('🔄 Creating user with EXPLICIT data:', signupData);

      const result = await api.signup(signupData);

      if (result.success) {
        toast.success("User created successfully", {
          description: `${newUser.full_name} has been added to the system.`
        });
        
        await loadInitialData();
        setShowCreateDialog(false);
        resetNewUserForm();
      } else {
        toast.error("Failed to create user", {
          description: result.error
        });
      }
    } catch (error: any) {
      toast.error("Failed to create user", {
        description: error.message
      });
    } finally {
      setCreating(false);
    }
  };

  // Handle user update
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    try {
      // Prepare update data with conditional entity assignments
      const updateData: any = {
        name: editUser.full_name,
        email: editUser.email,
        role: editUser.role,
        phone: editUser.phone || null,
        status: editUser.status
      };

      // Only include entity assignments for roles that require them
      if (editUser.role !== 'dealer') {
        updateData.station_id = editUser.station_id || null;
        updateData.omc_id = editUser.omc_id || null;
      }
      
      // Only include dealer_id for dealer role users
      if (editUser.role === 'dealer') {
        updateData.dealer_id = editUser.dealer_id || null;
      }

      const result = await api.updateUserProfile(editingUser.id, updateData);

      if (result.success) {
        toast.success("User updated successfully", {
          description: `${editUser.full_name}'s information has been updated.`
        });
        
        await loadInitialData();
        setShowEditDialog(false);
        setEditingUser(null);
      } else {
        toast.error("Failed to update user", {
          description: result.error
        });
      }
    } catch (error: any) {
      toast.error("Failed to update user", {
        description: error.message
      });
    } finally {
      setUpdating(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setDeleting(deletingUser.id);
    try {
      const result = await api.deleteUser(deletingUser.id);
      
      if (result.success) {
        toast.success("User deleted successfully", {
          description: `${deletingUser.full_name}'s account has been deactivated.`
        });
        await loadInitialData();
        setShowDeleteDialog(false);
        setDeletingUser(null);
      } else {
        toast.error("Failed to delete user", {
          description: result.error
        });
      }
    } catch (error: any) {
      toast.error("Failed to delete user", {
        description: error.message
      });
    } finally {
      setDeleting(null);
    }
  };

  // Handle bulk operations
  const handleBulkStatusUpdate = async (status: 'active' | 'inactive') => {
    if (selectedUsers.size === 0) return;

    try {
      const updates = Array.from(selectedUsers).map(userId => 
        api.updateUserProfile(userId, { status })
      );

      const results = await Promise.allSettled(updates);
      const successful = results.filter(result => result.status === 'fulfilled').length;

      toast.success("Bulk update completed", {
        description: `Updated ${successful} users to ${status} status.`
      });
      
      setSelectedUsers(new Set());
      await loadInitialData();
    } catch (error: any) {
      toast.error("Bulk update failed", {
        description: error.message
      });
    }
  };

  // Handle user selection
  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && Array.isArray(users) && users.length > 0) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  // Form validation
  const validateUserForm = (user: typeof newUser): string[] => {
    const errors: string[] = [];
    
    if (!user.full_name.trim()) {
      errors.push("Full name is required");
    }
    
    if (!user.email.includes('@')) {
      errors.push("Valid email is required");
    }
    
    if (!user.password || user.password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    
    if (user.phone && !/^\+?[\d\s-()]+$/.test(user.phone)) {
      errors.push("Please enter a valid phone number");
    }
    
    return errors;
  };

  // Reset forms
  const resetNewUserForm = () => {
    setNewUser({
      email: "",
      password: "",
      full_name: "",
      role: "attendant",
      phone: "",
      station_id: "",
      omc_id: "",
      dealer_id: "",
      status: "active",
      send_invitation: true
    });
    setShowPassword(false);
  };

  const resetEditUserForm = (user: EnhancedUser) => {
    setEditUser({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      station_id: user.station_id || "",
      omc_id: user.omc_id || "",
      dealer_id: user.dealer_id || "",
      status: user.status
    });
  };

  // Utility functions
  const getRoleBadgeVariant = (role: string) => {
    const variants: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
      admin: "destructive",
      npa: "default",
      omc: "secondary",
      dealer: "outline",
      station_manager: "default",
      attendant: "secondary",
      supervisor: "outline"
    };
    return variants[role] || "default";
  };

  const getRoleDisplayName = (role: string) => {
    const names: { [key: string]: string } = {
      admin: "Administrator",
      npa: "NPA Official",
      omc: "OMC Manager",
      dealer: "Dealer",
      station_manager: "Station Manager",
      attendant: "Attendant",
      supervisor: "Supervisor"
    };
    return names[role] || role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRoleIcon = (role: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      admin: <Shield className="w-3 h-3" />,
      npa: <Building className="w-3 h-3" />,
      omc: <Fuel className="w-3 h-3" />,
      dealer: <Store className="w-3 h-3" />,
      station_manager: <Building className="w-3 h-3" />,
      attendant: <Users className="w-3 h-3" />,
      supervisor: <Users className="w-3 h-3" />
    };
    return icons[role] || <Users className="w-3 h-3" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive",
      pending: "outline"
    };
    return variants[status] || "default";
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      active: <CheckCircle className="w-3 h-3" />,
      inactive: <XCircle className="w-3 h-3" />,
      suspended: <AlertTriangle className="w-3 h-3" />,
      pending: <Loader2 className="w-3 h-3 animate-spin" />
    };
    return icons[status] || null;
  };

  const getAssociatedEntity = (user: EnhancedUser) => {
    if (user.stations?.name) return `Station: ${user.stations.name} (${user.stations.code})`;
    if (user.omcs?.name) return `OMC: ${user.omcs.name} (${user.omcs.code})`;
    if (user.dealers?.name) return `Dealer: ${user.dealers.name}`;
    return "No association";
  };

  const shouldShowEntityField = (role: string) => {
    return ["station_manager", "attendant", "omc", "dealer"].includes(role);
  };

  const getEntityFieldLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      station_manager: "Station",
      attendant: "Station",
      omc: "OMC",
      dealer: "Dealer"
    };
    return labels[role] || "Association";
  };

  const getEntityOptions = (role: string) => {
    switch (role) {
      case "station_manager":
      case "attendant":
        return Array.isArray(stations) ? stations : [];
      case "omc":
        return Array.isArray(omcs) ? omcs : [];
      case "dealer":
        return Array.isArray(dealers) ? dealers : [];
      default:
        return [];
    }
  };

  const canManageUsers = true; // This would come from user permissions in real app

  // Loading state
  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">Loading Users</p>
            <p className="text-gray-600 max-w-sm">Please wait while we load the user management system.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => loadInitialData()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <ExportButton
              onExport={(format) => exportUsers(users, format, filters)}
              isExporting={isExporting}
              dataLength={users.length}
            />

            {canManageUsers && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-900 hover:bg-blue-800 gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Create New User
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Separator />
                  
                  <form onSubmit={handleCreateUser} className="space-y-6">
                    {/* Personal Information Section */}
                    <div className="space-y-4">
                      <SectionHeader title="Personal Information" icon={<Users className="w-4 h-4" />} />
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <Input
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                          required
                          placeholder="Enter full name"
                          className="bg-gray-50 border-gray-200"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          required
                          placeholder="user@example.com"
                          className="bg-gray-50 border-gray-200"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            required
                            minLength={8}
                            placeholder="Minimum 8 characters"
                            className="bg-gray-50 border-gray-200 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                        <Input
                          type="tel"
                          value={newUser.phone}
                          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                          placeholder="+233 XX XXX XXXX"
                          className="bg-gray-50 border-gray-200"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Role & Permissions Section */}
                    <div className="space-y-4">
                      <SectionHeader title="Role & Permissions" icon={<Shield className="w-4 h-4" />} />

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">User Role</label>
                        <Select 
                          value={newUser.role} 
                          onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                        >
                          <SelectTrigger className="bg-gray-50 border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(availableRoles) && availableRoles.map(role => (
                              <SelectItem key={role} value={role} className="flex items-center gap-2">
                                <span className="flex items-center gap-2">
                                  {getRoleIcon(role)}
                                  {getRoleDisplayName(role)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Conditional Entity Assignment */}
                      {shouldShowEntityField(newUser.role) && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {getEntityFieldLabel(newUser.role)} Assignment
                          </label>
                          <Select 
                            value={newUser[`${newUser.role === 'omc' ? 'omc_id' : newUser.role === 'dealer' ? 'dealer_id' : 'station_id'}` as keyof typeof newUser] as string}
                            onValueChange={(value) => {
                              const field = newUser.role === 'omc' ? 'omc_id' : newUser.role === 'dealer' ? 'dealer_id' : 'station_id';
                              setNewUser({ ...newUser, [field]: value });
                            }}
                          >
                            <SelectTrigger className="bg-gray-50 border-gray-200">
                              <SelectValue placeholder={`Select ${getEntityFieldLabel(newUser.role).toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {getEntityOptions(newUser.role).map(entity => (
                                <SelectItem key={entity.id} value={entity.id}>
                                  {entity.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {newUser.role === 'dealer' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Dealers inherit station assignment from their dealer organization
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Account Settings Section */}
                    <div className="space-y-4">
                      <SectionHeader title="Account Settings" icon={<Settings className="w-4 h-4" />} />

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="checkbox"
                          id="send-invitation"
                          checked={newUser.send_invitation}
                          onChange={(e) => setNewUser({ ...newUser, send_invitation: e.target.checked })}
                          className="rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                        />
                        <label htmlFor="send-invitation" className="text-sm font-medium text-gray-700 flex-1">
                          Send invitation email
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-blue-900 hover:bg-blue-800"
                        disabled={creating}
                      >
                        {creating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create User"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.size > 0 && (
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 rounded-full p-2">
                    <Users className="w-4 h-4 text-blue-900" />
                  </div>
                  <span className="text-sm font-semibold text-blue-900">
                    {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('active')}
                    className="gap-2 border-blue-200 text-blue-900 hover:bg-blue-100"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('inactive')}
                    className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <XCircle className="w-4 h-4" />
                    Deactivate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUsers(new Set())}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Card */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>
              
              <Select 
                value={filters.role} 
                onValueChange={(value) => setFilters({ ...filters, role: value, page: 1 })}
              >
                <SelectTrigger className="w-full lg:w-[200px] bg-gray-50 border-gray-200">
                  <Shield className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Array.isArray(availableRoles) && availableRoles.map(role => (
                    <SelectItem key={role} value={role} className="flex items-center gap-2">
                      {getRoleIcon(role)}
                      {getRoleDisplayName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
              >
                <SelectTrigger className="w-full lg:w-[180px] bg-gray-50 border-gray-200">
                  <Filter className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active" className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Active
                  </SelectItem>
                  <SelectItem value="inactive" className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-gray-600" />
                    Inactive
                  </SelectItem>
                  <SelectItem value="suspended" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    Suspended
                  </SelectItem>
                  <SelectItem value="pending" className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    Pending
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table Card */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Users className="w-5 h-5 text-blue-900" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">System Users</h2>
                  <p className="text-sm text-gray-600 mt-1">{pagination.total} total users</p>
                </div>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Updating...</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-0">
            {!Array.isArray(users) || users.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600 max-w-sm mx-auto mb-6">
                  {filters.search || filters.role !== 'all' || filters.status !== 'all' 
                    ? "Try adjusting your search criteria or create a new user."
                    : "Get started by creating your first user account."
                  }
                </p>
                {canManageUsers && (
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-blue-900 hover:bg-blue-800 gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add First User
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                      <TableHead className="w-12 pl-6">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">User</TableHead>
                      <TableHead className="font-semibold text-gray-900">Role</TableHead>
                      <TableHead className="font-semibold text-gray-900">Association</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">Last Login</TableHead>
                      <TableHead className="font-semibold text-gray-900">Created</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900 pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <TableRow 
                        key={user.id} 
                        className={`group hover:bg-gray-50 ${
                          index < users.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <TableCell className="pl-6">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-gray-900">{user.full_name}</p>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Mail className="w-3 h-3 mr-2" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Phone className="w-3 h-3 mr-2" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getRoleBadgeVariant(user.role)}
                            className="flex items-center gap-1.5 w-fit"
                          >
                            {getRoleIcon(user.role)}
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {getAssociatedEntity(user)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusBadgeVariant(user.status || 'active')}
                            className="flex items-center gap-1.5 w-fit"
                          >
                            {getStatusIcon(user.status || 'active')}
                            {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {user.last_login_at 
                              ? new Date(user.last_login_at).toLocaleDateString()
                              : 'Never'
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-gray-200"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setEditingUser(user);
                                    resetEditUserForm(user);
                                    setShowEditDialog(true);
                                  }}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setDeletingUser(user);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} entries
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                      disabled={!pagination.has_prev}
                      className="border-gray-300"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                      disabled={!pagination.has_next}
                      className="border-gray-300"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit User
              </DialogTitle>
            </DialogHeader>
            
            <Separator />
            
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="space-y-6">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <SectionHeader title="Personal Information" icon={<Users className="w-4 h-4" />} />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <Input
                      value={editUser.full_name}
                      onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                      required
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <Input
                      type="email"
                      value={editUser.email}
                      onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                      required
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <Input
                      type="tel"
                      value={editUser.phone}
                      onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>

                <Separator />

                {/* Role & Permissions Section */}
                <div className="space-y-4">
                  <SectionHeader title="Role & Permissions" icon={<Shield className="w-4 h-4" />} />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">User Role</label>
                    <Select 
                      value={editUser.role} 
                      onValueChange={(value) => setEditUser({ ...editUser, role: value })}
                    >
                      <SelectTrigger className="bg-gray-50 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(availableRoles) && availableRoles.map(role => (
                          <SelectItem key={role} value={role} className="flex items-center gap-2">
                            {getRoleIcon(role)}
                            {getRoleDisplayName(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional Entity Assignment */}
                  {shouldShowEntityField(editUser.role) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {getEntityFieldLabel(editUser.role)} Assignment
                      </label>
                      <Select 
                        value={editUser[`${editUser.role === 'omc' ? 'omc_id' : editUser.role === 'dealer' ? 'dealer_id' : 'station_id'}` as keyof typeof editUser] as string}
                        onValueChange={(value) => {
                          const field = editUser.role === 'omc' ? 'omc_id' : editUser.role === 'dealer' ? 'dealer_id' : 'station_id';
                          setEditUser({ ...editUser, [field]: value });
                        }}
                      >
                        <SelectTrigger className="bg-gray-50 border-gray-200">
                          <SelectValue placeholder={`Select ${getEntityFieldLabel(editUser.role).toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {getEntityOptions(editUser.role).map(entity => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Account Settings Section */}
                <div className="space-y-4">
                  <SectionHeader title="Account Settings" icon={<Settings className="w-4 h-4" />} />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Account Status</label>
                    <Select 
                      value={editUser.status} 
                      onValueChange={(value: 'active' | 'inactive') => setEditUser({ ...editUser, status: value })}
                    >
                      <SelectTrigger className="bg-gray-50 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active" className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Active
                        </SelectItem>
                        <SelectItem value="inactive" className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-gray-600" />
                          Inactive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-900 hover:bg-blue-800"
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update User"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete User
              </DialogTitle>
            </DialogHeader>
            
            <Separator />
            
            {deletingUser && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-900">This action cannot be undone</p>
                      <p className="text-red-700 text-sm mt-1">
                        The user account will be permanently deactivated and removed from the system.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-900 font-medium">{deletingUser.full_name}</p>
                  <p className="text-gray-600 text-sm mt-1">{deletingUser.email}</p>
                  <p className="text-gray-600 text-sm">
                    {getRoleDisplayName(deletingUser.role)} • {getAssociatedEntity(deletingUser)}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteUser}
                    disabled={deleting === deletingUser.id}
                    className="flex-1"
                  >
                    {deleting === deletingUser.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete User"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Settings icon component
const Settings = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default UserManagement;