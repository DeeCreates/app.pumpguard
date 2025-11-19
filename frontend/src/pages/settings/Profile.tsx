import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Mail, Phone, MapPin, Calendar, Edit, Save, Loader2, AlertCircle, Shield, UserCheck } from "lucide-react";
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

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);
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

    // Use Promise.allSettled to handle individual API failures
    const [profileResponse, statsResponse] = await Promise.allSettled([
      api.getUserProfile(),
      api.getUserPerformanceStats()
    ]);

    // Handle profile response
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

    // Handle stats response - this can fail without breaking the whole page
    if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
      setStats(statsResponse.value.data);
    } else {
      console.warn('Failed to load performance stats, using defaults');
      // Set default stats so the UI still works
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

    // Required fields
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

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Emergency contact validation
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
    
    // Clear error when user starts typing
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

    // Clear error when user starts typing
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
        // Update local state with transformed data
        const updatedUser = transformUserData({
          ...user,
          ...updateData,
          station: user?.station // Preserve station info
        });
        setUser(updatedUser);

        // Update auth context
        if (authUser) {
          updateUser({ 
            ...authUser, 
            email: formData.email,
            full_name: updateData.full_name
          });
        }

        setEditing(false);
        
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
          duration: 3000
        });

        // Log the profile update
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
    setErrors({});
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

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
      
      // Create FormData and upload
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

        // Log avatar update
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
      // Reset the input
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (errors.fetch) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Profile</h2>
          <p className="text-gray-600 mb-4">{errors.fetch}</p>
          <Button onClick={loadProfileData}>
            <Loader2 className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-gray-600">Unable to load profile data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={saving}>
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
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                    <AvatarImage 
                      src={user.avatar} 
                      alt={`${user.firstName} ${user.lastName}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
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
                      className="absolute bottom-0 right-0 rounded-full w-8 h-8 bg-blue-600 hover:bg-blue-700 border-2 border-white shadow-lg"
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
                
                <div>
                  <h2 className="text-xl font-bold">{user.firstName} {user.lastName}</h2>
                  <Badge 
                    variant={user.isActive ? "default" : "secondary"} 
                    className="mt-1"
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                    {user.emailVerified && (
                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div className="flex items-center space-x-3 text-sm p-2 rounded-lg bg-gray-50">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm p-2 rounded-lg bg-gray-50">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{user.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm p-2 rounded-lg bg-gray-50">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{user.location || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm p-2 rounded-lg bg-gray-50">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Joined {formatDate(user.joinDate)}</span>
                  </div>
                  {user.lastLoginAt && (
                    <div className="flex items-center space-x-3 text-sm p-2 rounded-lg bg-blue-50">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span>Last login: {formatDateTime(user.lastLoginAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Shifts</span>
                    <span className="font-semibold">{stats.totalShifts.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sales Processed</span>
                    <span className="font-semibold">{formatCurrency(stats.salesProcessed)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Transactions</span>
                    <span className="font-semibold">{stats.transactions.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Accuracy Rate</span>
                    <span className="font-semibold">{stats.accuracyRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Compliance Score</span>
                    <span className="font-semibold">{stats.complianceScore}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg. Transaction</span>
                    <span className="font-semibold">{formatCurrency(stats.avgTransactionValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input 
                    id="firstName" 
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!editing}
                    className={errors.firstName ? 'border-red-500' : ''}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input 
                    id="lastName" 
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!editing}
                    className={errors.lastName ? 'border-red-500' : ''}
                    placeholder="Enter your last name"
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
                <Label htmlFor="email">Email Address *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!editing}
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
                <Label htmlFor="phone">Phone Number *</Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!editing}
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
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!editing}
                  placeholder="Enter your address"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={user.role} disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input id="employeeId" value={user.employeeId} disabled className="bg-gray-50" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="station">Assigned Station</Label>
                <Input id="station" value={user.station} disabled className="bg-gray-50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => handleInputChange('department', value)}
                  disabled={!editing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="supervision">Supervision</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Contact Name *</Label>
                  <Input 
                    id="emergencyName" 
                    value={formData.emergencyContact.name}
                    onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                    disabled={!editing}
                    className={errors.emergencyName ? 'border-red-500' : ''}
                    placeholder="Full name of emergency contact"
                  />
                  {errors.emergencyName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.emergencyName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelation">Relationship</Label>
                  <Input 
                    id="emergencyRelation" 
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                    disabled={!editing}
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Phone Number *</Label>
                <Input 
                  id="emergencyPhone" 
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                  disabled={!editing}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}