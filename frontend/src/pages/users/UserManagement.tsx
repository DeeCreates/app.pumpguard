import React, { useState, useEffect, useCallback } from "react";
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
  EyeOff
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

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
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
  }, [filters]);

  // Load data when filters change
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

// Enhanced signup function with explicit dealer handling
const handleCreateUser = async (e: React.FormEvent) => {
  e.preventDefault();
  
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
    if (checked && Array.isArray(users)) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
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

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-900" />
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => loadInitialData()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
                  <Button className="bg-blue-900 hover:bg-blue-800">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-6">
                    {/* Personal Information Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-px bg-gray-300 flex-1"></div>
                        <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3">
                          Personal Information
                        </span>
                        <div className="h-px bg-gray-300 flex-1"></div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Full Name *</label>
                        <Input
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                          required
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email *</label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          required
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Password *</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            required
                            minLength={8}
                            placeholder="Minimum 8 characters"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Phone</label>
                        <Input
                          type="tel"
                          value={newUser.phone}
                          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                          placeholder="+233 XX XXX XXXX"
                        />
                      </div>
                    </div>

                    {/* Role & Permissions Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-px bg-gray-300 flex-1"></div>
                        <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3">
                          Role & Permissions
                        </span>
                        <div className="h-px bg-gray-300 flex-1"></div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Role *</label>
                        <Select 
                          value={newUser.role} 
                          onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(availableRoles) && availableRoles.map(role => (
                              <SelectItem key={role} value={role}>
                                {getRoleDisplayName(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Conditional Entity Assignment */}
                      {shouldShowEntityField(newUser.role) && (
                        <div>
                          <label className="text-sm font-medium">{getEntityFieldLabel(newUser.role)}</label>
                          <Select 
                            value={newUser[`${newUser.role === 'omc' ? 'omc_id' : newUser.role === 'dealer' ? 'dealer_id' : 'station_id'}` as keyof typeof newUser] as string}
                            onValueChange={(value) => {
                              const field = newUser.role === 'omc' ? 'omc_id' : newUser.role === 'dealer' ? 'dealer_id' : 'station_id';
                              setNewUser({ ...newUser, [field]: value });
                            }}
                          >
                            <SelectTrigger>
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

                    {/* Account Settings Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-px bg-gray-300 flex-1"></div>
                        <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3">
                          Account Settings
                        </span>
                        <div className="h-px bg-gray-300 flex-1"></div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="send-invitation"
                          checked={newUser.send_invitation}
                          onChange={(e) => setNewUser({ ...newUser, send_invitation: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="send-invitation" className="text-sm font-medium">
                          Send invitation email
                        </label>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-blue-900 hover:bg-blue-800"
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
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.size > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkStatusUpdate('active')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkStatusUpdate('inactive')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Deactivate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="pl-10"
                />
              </div>
              
              <Select 
                value={filters.role} 
                onValueChange={(value) => setFilters({ ...filters, role: value, page: 1 })}
              >
                <SelectTrigger className="w-full lg:w-[200px]">
                  <Shield className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Array.isArray(availableRoles) && availableRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
              >
                <SelectTrigger className="w-full lg:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                System Users ({pagination.total})
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!Array.isArray(users) || users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm">Try adjusting your search criteria or create a new user.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Association</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="group">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Mail className="w-3 h-3 mr-1" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Phone className="w-3 h-3 mr-1" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
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
                            className="flex items-center gap-1 w-fit"
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
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setEditingUser(user);
                                    resetEditUserForm(user);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setDeletingUser(user);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
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
              <div className="flex items-center justify-between mt-6">
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
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                    disabled={!pagination.has_next}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="space-y-6">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-300 flex-1"></div>
                    <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3">
                      Personal Information
                    </span>
                    <div className="h-px bg-gray-300 flex-1"></div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input
                      value={editUser.full_name}
                      onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      value={editUser.email}
                      onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      type="tel"
                      value={editUser.phone}
                      onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Role & Permissions Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-300 flex-1"></div>
                    <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3">
                      Role & Permissions
                    </span>
                    <div className="h-px bg-gray-300 flex-1"></div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Role *</label>
                    <Select 
                      value={editUser.role} 
                      onValueChange={(value) => setEditUser({ ...editUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(availableRoles) && availableRoles.map(role => (
                          <SelectItem key={role} value={role}>
                            {getRoleDisplayName(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional Entity Assignment */}
                  {shouldShowEntityField(editUser.role) && (
                    <div>
                      <label className="text-sm font-medium">{getEntityFieldLabel(editUser.role)}</label>
                      <Select 
                        value={editUser[`${editUser.role === 'omc' ? 'omc_id' : editUser.role === 'dealer' ? 'dealer_id' : 'station_id'}` as keyof typeof editUser] as string}
                        onValueChange={(value) => {
                          const field = editUser.role === 'omc' ? 'omc_id' : editUser.role === 'dealer' ? 'dealer_id' : 'station_id';
                          setEditUser({ ...editUser, [field]: value });
                        }}
                      >
                        <SelectTrigger>
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
                      {editUser.role === 'dealer' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Dealers inherit station assignment from their dealer organization
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Account Settings Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-300 flex-1"></div>
                    <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3">
                      Account Settings
                    </span>
                    <div className="h-px bg-gray-300 flex-1"></div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={editUser.status} 
                      onValueChange={(value: 'active' | 'inactive') => setEditUser({ ...editUser, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-900 hover:bg-blue-800"
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
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            {deletingUser && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Are you sure you want to delete <strong>{deletingUser.full_name}</strong>? 
                  This action will deactivate their account and cannot be undone.
                </p>
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

export default UserManagement;