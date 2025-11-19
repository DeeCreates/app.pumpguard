import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit, 
  Save, 
  Loader2, 
  AlertCircle, 
  Shield, 
  UserCheck,
  ChevronRight,
  X,
  MoreVertical,
  Download,
  Upload,
  CheckCircle2,
  Wifi,
  WifiOff
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  station: string;
  stationId: string;
  location: string;
  joinDate: string;
  avatar?: string;
  department: string;
  employeeId: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
}

interface PerformanceStats {
  totalShifts: number;
  salesProcessed: number;
  transactions: number;
  accuracyRate: number;
  complianceScore: number;
  avgTransactionValue: number;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  [key: string]: string | undefined;
}

// Mobile-optimized Bottom Sheet Component
const BottomSheet = React.memo(({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children,
  className = ""
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className={`fixed bottom-0 left-0 right-0 mx-auto max-h-[85vh] rounded-t-2xl rounded-b-none border-0 shadow-2xl flex flex-col p-0 bg-white ${className}`}>
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
          <div className="flex-shrink-0 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-black">
                {title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 touch-manipulation active:scale-95"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {description && (
              <p className="text-gray-600 text-sm">
                {description}
              </p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});

BottomSheet.displayName = 'BottomSheet';

// Mobile Action Sheet Component
const ActionSheet = React.memo(({
  open,
  onOpenChange,
  title,
  actions,
  destructiveIndex
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actions: { label: string; action: () => void; icon?: React.ReactNode }[];
  destructiveIndex?: number;
}) => {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="max-w-lg"
    >
      <div className="space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.action();
              onOpenChange(false);
            }}
            className={`w-full text-left p-4 rounded-xl text-base font-medium transition-colors touch-manipulation active:scale-95 ${
              index === destructiveIndex
                ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                : 'text-gray-900 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {action.icon}
              {action.label}
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 pt-2 border-t border-gray-200">
        <button
          onClick={() => onOpenChange(false)}
          className="w-full text-center p-4 rounded-xl text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
});

ActionSheet.displayName = 'ActionSheet';

// Mobile Setting Item Component
const SettingItem = ({ 
  title, 
  description, 
  action, 
  icon,
  value,
  danger = false
}: {
  title: string;
  description?: string;
  action: () => void;
  icon?: React.ReactNode;
  value?: string;
  danger?: boolean;
}) => (
  <button
    onClick={action}
    className={`w-full text-left p-4 rounded-xl transition-colors touch-manipulation active:scale-95 ${
      danger 
        ? 'hover:bg-red-50 active:bg-red-100' 
        : 'hover:bg-gray-50 active:bg-gray-100'
    }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-base truncate ${danger ? 'text-red-700' : 'text-gray-900'}`}>
            {title}
          </p>
          {description && (
            <p className="text-gray-600 text-sm mt-1 truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-gray-500 text-sm">{value}</span>
        )}
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  </button>
);

// Mobile Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  color = "blue" 
}: {
  title: string;
  value: string;
  subtitle: string;
  color?: "blue" | "green" | "orange" | "purple";
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700'
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]} touch-manipulation active:scale-95 transition-transform`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs opacity-75 mt-1">{subtitle}</p>
    </div>
  );
};

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    department: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const { toast } = useToast();
  const { user: authUser, updateUser } = useAuth();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setErrors({});

      const [profileResponse, statsResponse] = await Promise.allSettled([
        api.getUserProfile(),
        api.getUserPerformanceStats()
      ]);

      if (profileResponse.status === 'fulfilled' && profileResponse.value.success) {
        const userData = profileResponse.value.data;
        const transformedUser = transformUserData(userData);
        setUser(transformedUser);
        setFormData({
          firstName: transformedUser.firstName,
          lastName: transformedUser.lastName,
          email: transformedUser.email,
          phone: transformedUser.phone || '',
          address: transformedUser.location || '',
          department: transformedUser.department || 'operations',
          emergencyContact: transformedUser.emergencyContact || {
            name: '',
            relationship: '',
            phone: ''
          }
        });
      } else {
        const errorMsg = profileResponse.status === 'rejected' 
          ? 'Failed to load profile' 
          : profileResponse.value?.error || 'Profile not found';
        throw new Error(errorMsg);
      }

      if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
        setStats(statsResponse.value.data);
      } else {
        console.warn('Failed to load performance stats, using defaults');
        setStats({
          totalShifts: 0,
          salesProcessed: 0,
          transactions: 0,
          accuracyRate: 100,
          complianceScore: 100,
          avgTransactionValue: 0
        });
      }

    } catch (error: any) {
      console.error('Error loading profile data:', error);
      setErrors({ 
        fetch: error.message || 'Failed to load profile data' 
      });
      
      toast({
        title: "Error Loading Profile",
        description: error.message || "Unable to load your profile information",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const transformUserData = (apiData: any): UserProfile => {
    return {
      id: apiData.id,
      firstName: apiData.full_name?.split(' ')[0] || 'Unknown',
      lastName: apiData.full_name?.split(' ').slice(1).join(' ') || 'User',
      email: apiData.email || '',
      phone: apiData.phone || '',
      role: apiData.role || 'attendant',
      station: apiData.station?.name || 'Not Assigned',
      stationId: apiData.station_id || '',
      location: apiData.station?.address || apiData.omc?.address || '',
      joinDate: apiData.created_at || new Date().toISOString(),
      avatar: apiData.avatar_url,
      department: getDepartmentFromRole(apiData.role),
      employeeId: apiData.employee_id || `EMP-${apiData.id.slice(0, 8)}`,
      emergencyContact: apiData.emergency_contact || {
        name: '',
        relationship: '',
        phone: ''
      },
      isActive: apiData.is_active !== false,
      emailVerified: apiData.email_confirmed_at !== null,
      lastLoginAt: apiData.last_login_at
    };
  };

  const getDepartmentFromRole = (role: string): string => {
    const roleDepartments: Record<string, string> = {
      admin: 'management',
      npa: 'compliance',
      omc: 'operations',
      dealer: 'operations',
      station_manager: 'operations',
      supervisor: 'supervision',
      attendant: 'operations',
      cashier: 'operations'
    };
    return roleDepartments[role] || 'operations';
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.emergencyContact.name.trim()) {
      newErrors.emergencyName = "Emergency contact name is required";
    }

    if (!formData.emergencyContact.phone.trim()) {
      newErrors.emergencyPhone = "Emergency contact phone is required";
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.emergencyContact.phone)) {
      newErrors.emergencyPhone = "Please enter a valid emergency contact phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value
      }
    }));

    const errorField = `emergency${field.charAt(0).toUpperCase() + field.slice(1)}`;
    if (errors[errorField]) {
      setErrors(prev => ({
        ...prev,
        [errorField]: ''
      }));
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      toast({
        title: "Please fix errors",
        description: "There are errors in the form that need to be corrected",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        emergency_contact: formData.emergencyContact
      };

      const response = await api.updateUserProfile(user!.id, updateData);
      
      if (response.success) {
        const updatedUser = transformUserData({
          ...user,
          ...updateData,
          station: user?.station
        });
        setUser(updatedUser);

        if (authUser) {
          updateUser({ 
            ...authUser, 
            email: formData.email,
            full_name: updateData.full_name
          });
        }

        setEditing(false);
        setShowEditSheet(false);
        
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
          duration: 3000
        });

        await api.logUserActivity('profile_update', user!.id, {
          fields_updated: Object.keys(updateData)
        });

      } else {
        throw new Error(response.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.location,
        department: user.department,
        emergencyContact: user.emergencyContact
      });
    }
    setEditing(false);
    setShowEditSheet(false);
    setErrors({});
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or WebP image",
        variant: "destructive"
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingAvatar(true);
      
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', user!.id);

      const response = await api.uploadAvatar(formData);
      
      if (response.success && user) {
        setUser({
          ...user,
          avatar: response.data.avatarUrl
        });
        
        toast({
          title: "Success",
          description: "Profile picture updated successfully",
        });

        await api.logUserActivity('avatar_update', user.id, {
          action: 'avatar_uploaded'
        });

      } else {
        throw new Error(response.error || "Failed to upload avatar");
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportProfileData = async () => {
    try {
      const response = await api.exportUserData();
      
      if (response.success) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `profile-data-${user?.employeeId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Data Exported",
          description: "Your profile data has been exported successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export profile data",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (errors.fetch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Profile</h2>
          <p className="text-gray-600 mb-4">{errors.fetch}</p>
          <Button onClick={loadProfileData} className="bg-blue-600 hover:bg-blue-700">
            <Loader2 className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-gray-600">Unable to load profile data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4 space-y-6">
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 text-sm">Personal information and performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProfileData}
              disabled={loading}
              className="h-10 w-10 p-0 touch-manipulation active:scale-95"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActionSheet(true)}
              className="h-10 w-10 p-0 touch-manipulation active:scale-95"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-white shadow-lg">
                  <AvatarImage 
                    src={user.avatar} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button 
                    size="sm" 
                    className="absolute -bottom-1 -right-1 rounded-full w-7 h-7 bg-blue-600 hover:bg-blue-700 border-2 border-white shadow-lg touch-manipulation active:scale-95"
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </Button>
                </label>
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={user.isActive ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {user.emailVerified && (
                    <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mt-1 truncate">
                  {user.role} • {user.station}
                </p>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="truncate">{user.phone || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="truncate">{user.location || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="truncate">Joined {formatDate(user.joinDate)}</span>
              </div>
            </div>

            {user.lastLoginAt && (
              <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 rounded-lg mt-3">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Last login: {formatDateTime(user.lastLoginAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Stats */}
        {stats && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <StatsCard
                  title="Total Shifts"
                  value={stats.totalShifts.toLocaleString()}
                  subtitle="completed"
                  color="blue"
                />
                <StatsCard
                  title="Sales Processed"
                  value={formatCurrency(stats.salesProcessed)}
                  subtitle="total revenue"
                  color="green"
                />
                <StatsCard
                  title="Transactions"
                  value={stats.transactions.toLocaleString()}
                  subtitle="processed"
                  color="orange"
                />
                <StatsCard
                  title="Accuracy Rate"
                  value={`${stats.accuracyRate}%`}
                  subtitle="success rate"
                  color="purple"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Navigation */}
        <div className="space-y-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <SettingItem
                title="Edit Profile"
                description="Update personal information"
                icon={<Edit className="w-5 h-5" />}
                action={() => setShowEditSheet(true)}
              />
              <div className="border-t border-gray-200" />
              <SettingItem
                title="Emergency Contact"
                description="Manage emergency contacts"
                icon={<Phone className="w-5 h-5" />}
                value={user.emergencyContact.name || "Not set"}
                action={() => setShowEditSheet(true)}
              />
              <div className="border-t border-gray-200" />
              <SettingItem
                title="Department"
                description="Your assigned department"
                icon={<UserCheck className="w-5 h-5" />}
                value={user.department}
                action={() => setShowEditSheet(true)}
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <SettingItem
                title="Export Data"
                description="Download your profile data"
                icon={<Download className="w-5 h-5" />}
                action={handleExportProfileData}
              />
              <div className="border-t border-gray-200" />
              <SettingItem
                title="Privacy Settings"
                description="Manage data and privacy"
                icon={<Shield className="w-5 h-5" />}
                action={() => console.log('Privacy settings')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-14 flex-col gap-1 touch-manipulation active:scale-95"
                onClick={() => setShowEditSheet(true)}
              >
                <Edit className="w-5 h-5" />
                <span className="text-xs">Edit Profile</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-14 flex-col gap-1 touch-manipulation active:scale-95"
                onClick={handleExportProfileData}
              >
                <Download className="w-5 h-5" />
                <span className="text-xs">Export Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Bottom Sheet */}
      <BottomSheet 
        open={showEditSheet} 
        onOpenChange={setShowEditSheet}
        title="Edit Profile"
        description="Update your personal information"
      >
        <div className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Personal Information</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                <Input 
                  id="firstName" 
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={errors.firstName ? 'border-red-500' : ''}
                  placeholder="First name"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.firstName}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                <Input 
                  id="lastName" 
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={errors.lastName ? 'border-red-500' : ''}
                  placeholder="Last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
                placeholder="your.email@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
              <Input 
                id="phone" 
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={errors.phone ? 'border-red-500' : ''}
                placeholder="+233 XX XXX XXXX"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">Address</Label>
              <Input 
                id="address" 
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter your address"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Emergency Contact</h4>
            
            <div className="space-y-2">
              <Label htmlFor="emergencyName" className="text-sm font-medium">Contact Name *</Label>
              <Input 
                id="emergencyName" 
                value={formData.emergencyContact.name}
                onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                className={errors.emergencyName ? 'border-red-500' : ''}
                placeholder="Full name"
              />
              {errors.emergencyName && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.emergencyName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyRelation" className="text-sm font-medium">Relationship</Label>
              <Input 
                id="emergencyRelation" 
                value={formData.emergencyContact.relationship}
                onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                placeholder="e.g., Spouse, Parent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyPhone" className="text-sm font-medium">Phone Number *</Label>
              <Input 
                id="emergencyPhone" 
                value={formData.emergencyContact.phone}
                onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                className={errors.emergencyPhone ? 'border-red-500' : ''}
                placeholder="+233 XX XXX XXXX"
              />
              {errors.emergencyPhone && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.emergencyPhone}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={saving}
              className="flex-1 border-gray-300 hover:bg-gray-50 text-base py-3 rounded-xl font-medium touch-manipulation active:scale-95"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors text-base touch-manipulation active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Action Sheet */}
      <ActionSheet
        open={showActionSheet}
        onOpenChange={setShowActionSheet}
        title="Profile Actions"
        actions={[
          {
            label: 'Edit Profile',
            action: () => setShowEditSheet(true),
            icon: <Edit className="w-5 h-5" />
          },
          {
            label: 'Export Data',
            action: handleExportProfileData,
            icon: <Download className="w-5 h-5" />
          },
          {
            label: 'Refresh Data',
            action: loadProfileData,
            icon: <Loader2 className="w-5 h-5" />
          }
        ]}
      />

      {/* Quick Action Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg touch-manipulation active:scale-95 transition-transform"
          onClick={() => setShowActionSheet(true)}
        >
          <MoreVertical className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}