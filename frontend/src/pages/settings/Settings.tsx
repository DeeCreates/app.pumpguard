import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Shield, 
  User, 
  Database, 
  Globe, 
  Smartphone, 
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Building2,
  CreditCard,
  Download,
  Upload,
  Trash2,
  Key,
  Mail,
  Phone,
  MapPin,
  Clock,
  Wifi,
  WifiOff,
  Palette,
  Languages,
  AlertCircle,
  XCircle,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/lib/auth-api";
import { useNavigate } from 'react-router-dom';

interface UserSettings {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  notifications: {
    salesAlerts: boolean;
    lowStockWarnings: boolean;
    priceChanges: boolean;
    shiftUpdates: boolean;
    systemMaintenance: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    loginAlerts: boolean;
    sessionTimeout: number;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    offlineMode: boolean;
    autoSync: boolean;
    dataRetention: number;
  };
  roleSettings: {
    stationAccess: string[];
    reportAccess: string[];
    canManageUsers: boolean;
    canConfigurePrices: boolean;
    canApproveExpenses: boolean;
    maxDiscountLimit: number;
  };
}

interface AuditLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: 'Very weak',
    requirements: {
      minLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumbers: false,
      hasSpecialChar: false
    }
  });
  
  const { toast } = useToast();
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
    notifications: {
      salesAlerts: true,
      lowStockWarnings: true,
      priceChanges: false,
      shiftUpdates: true,
      systemMaintenance: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
    },
    security: {
      twoFactorEnabled: false,
      lastPasswordChange: '',
      loginAlerts: true,
      sessionTimeout: 30,
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'DD/MM/YYYY',
      currency: 'GHS',
      offlineMode: true,
      autoSync: true,
      dataRetention: 90,
    },
    roleSettings: {
      stationAccess: [],
      reportAccess: [],
      canManageUsers: false,
      canConfigurePrices: false,
      canApproveExpenses: false,
      maxDiscountLimit: 0,
    }
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Available languages
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ar', label: 'Arabic' },
  ];

  // Available timezones
  const timezones = [
    'UTC',
    'Africa/Accra',
    'Africa/Lagos',
    'Africa/Nairobi',
    'Europe/London',
    'America/New_York',
  ];

  // Available currencies
  const currencies = [
    { value: 'GHS', label: 'Ghana Cedi (₵)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
  ];

  useEffect(() => {
    loadSettings();
    loadAuditLogs();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load from API or local storage
      const savedSettings = localStorage.getItem('pumpguard_user_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // Set default settings based on user data
        const { data: userData } = await authAPI.getCurrentUser();
        if (userData?.profile) {
          const userProfile = userData.profile;
          setSettings(prev => ({
            ...prev,
            profile: {
              firstName: userProfile.full_name?.split(' ')[0] || '',
              lastName: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
              email: userProfile.email || userData.user?.email || '',
              phone: userProfile.phone || '',
            },
            security: {
              ...prev.security,
              lastPasswordChange: userProfile.password_changed_at || ''
            }
          }));
        }
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      setSettings(getDefaultSettings());
      toast({
        title: "Using Default Settings",
        description: "Could not load your saved settings. Using default values.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      // Simulate loading audit logs
      // In production, this would come from your API
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          action: 'Password Change',
          description: 'Password was successfully changed',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome/Windows'
        },
        {
          id: '2',
          action: 'Profile Update',
          description: 'Updated personal information',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome/Windows'
        }
      ];
      setAuditLogs(mockLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const getDefaultSettings = (): UserSettings => {
    const baseSettings = {
      profile: {
        firstName: '',
        lastName: '',
        email: user?.email || '',
        phone: '',
        avatar: '',
      },
      notifications: {
        salesAlerts: true,
        lowStockWarnings: true,
        priceChanges: false,
        shiftUpdates: true,
        systemMaintenance: true,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
      },
      security: {
        twoFactorEnabled: false,
        lastPasswordChange: new Date().toISOString(),
        loginAlerts: true,
        sessionTimeout: 30,
      },
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'Africa/Accra',
        dateFormat: 'DD/MM/YYYY',
        currency: 'GHS',
        offlineMode: true,
        autoSync: true,
        dataRetention: 90,
      },
      roleSettings: {
        stationAccess: [],
        reportAccess: ['sales', 'inventory'],
        canManageUsers: false,
        canConfigurePrices: false,
        canApproveExpenses: false,
        maxDiscountLimit: 0,
      }
    };

    // Role-based settings
    if (user) {
      switch (user.role) {
        case 'admin':
          baseSettings.roleSettings = {
            stationAccess: ['all'],
            reportAccess: ['all'],
            canManageUsers: true,
            canConfigurePrices: true,
            canApproveExpenses: true,
            maxDiscountLimit: 1000,
          };
          break;
        case 'omc':
          baseSettings.roleSettings = {
            stationAccess: ['all'],
            reportAccess: ['sales', 'inventory', 'financial'],
            canManageUsers: true,
            canConfigurePrices: true,
            canApproveExpenses: true,
            maxDiscountLimit: 500,
          };
          break;
        case 'dealer':
          baseSettings.roleSettings = {
            stationAccess: [],
            reportAccess: ['sales', 'inventory', 'financial'],
            canManageUsers: true,
            canConfigurePrices: true,
            canApproveExpenses: true,
            maxDiscountLimit: 200,
          };
          break;
        case 'station_manager':
          baseSettings.roleSettings = {
            stationAccess: [],
            reportAccess: ['sales', 'inventory'],
            canManageUsers: false,
            canConfigurePrices: false,
            canApproveExpenses: true,
            maxDiscountLimit: 100,
          };
          break;
        case 'attendant':
          baseSettings.roleSettings = {
            stationAccess: [],
            reportAccess: ['sales'],
            canManageUsers: false,
            canConfigurePrices: false,
            canApproveExpenses: false,
            maxDiscountLimit: 50,
          };
          break;
      }
    }

    return baseSettings;
  };

  const handleSaveSettings = async (section: string) => {
    try {
      setSaving(true);
      
      // Save to local storage
      localStorage.setItem('pumpguard_user_settings', JSON.stringify(settings));
      
      // If profile section, update via API
      if (section === 'profile') {
        const result = await authAPI.updateUserProfile({
          full_name: `${settings.profile.firstName} ${settings.profile.lastName}`.trim(),
          email: settings.profile.email,
          phone: settings.profile.phone,
        });
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        // Update auth context
        updateUserProfile({
          full_name: `${settings.profile.firstName} ${settings.profile.lastName}`.trim(),
          email: settings.profile.email,
          phone: settings.profile.phone,
        });
      }
      
      toast({
        title: "Settings Updated",
        description: `${section.charAt(0).toUpperCase() + section.slice(1)} settings have been saved successfully.`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    // Calculate score
    if (requirements.minLength) score++;
    if (requirements.hasUpperCase) score++;
    if (requirements.hasLowerCase) score++;
    if (requirements.hasNumbers) score++;
    if (requirements.hasSpecialChar) score++;

    // Determine message
    let message = '';
    if (score === 0) message = 'Very weak';
    else if (score <= 2) message = 'Weak';
    else if (score <= 3) message = 'Medium';
    else if (score === 4) message = 'Strong';
    else message = 'Very strong';

    // Check for common passwords
    const commonPasswords = ['password', '123456', '12345678', 'admin123', 'qwerty'];
    if (commonPasswords.includes(password.toLowerCase())) {
      score = 0;
      message = 'Very weak (common password)';
    }

    return { score, message, requirements };
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordForm(prev => ({ ...prev, newPassword: value }));
    setPasswordStrength(checkPasswordStrength(value));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!passwordForm.currentPassword) {
      toast({
        title: "Error",
        description: "Current password is required",
        variant: "destructive",
      });
      return;
    }

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      toast({
        title: "Error",
        description: "New password must be different from current password",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength.score < 3) {
      toast({
        title: "Weak Password",
        description: "Please choose a stronger password. Password must be at least medium strength.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      // Use the real auth API
      const result = await authAPI.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        });
        
        // Clear form
        setPasswordForm({ 
          currentPassword: '', 
          newPassword: '', 
          confirmPassword: '' 
        });
        
        // Update last password change timestamp
        setSettings(prev => ({
          ...prev,
          security: {
            ...prev.security,
            lastPasswordChange: new Date().toISOString()
          }
        }));
        
        // Show success message
        toast({
          title: "Success",
          description: "Password changed successfully!",
        });
      } else {
        throw new Error(result.error || "Failed to change password");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    try {
      const newTwoFactorStatus = !settings.security.twoFactorEnabled;
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSettings(prev => ({
        ...prev,
        security: {
          ...prev.security,
          twoFactorEnabled: newTwoFactorStatus,
        }
      }));
      
      toast({
        title: newTwoFactorStatus ? "2FA Enabled" : "2FA Disabled",
        description: newTwoFactorStatus 
          ? "Two-factor authentication has been enabled for your account."
          : "Two-factor authentication has been disabled for your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update two-factor authentication",
        variant: "destructive",
      });
    }
  };

  const handleDataExport = async () => {
    try {
      // Create export data
      const exportData = {
        settings,
        profile: {
          name: `${settings.profile.firstName} ${settings.profile.lastName}`,
          email: settings.profile.email,
          role: user?.role,
        },
        exportDate: new Date().toISOString(),
      };
      
      // Create and download the export file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pumpguard-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your settings have been exported successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleSettingsImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings.settings || importedSettings);
        toast({
          title: "Settings Imported",
          description: "Your settings have been imported successfully.",
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid settings file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleResetSettings = (section: string) => {
    if (confirm(`Reset all ${section} settings to default?`)) {
      const defaultSettings = getDefaultSettings();
      setSettings(prev => ({
        ...prev,
        [section]: defaultSettings[section as keyof UserSettings]
      }));
      
      toast({
        title: "Settings Reset",
        description: `${section} settings have been reset to default.`,
      });
    }
  };

  const handleAccountDelete = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.")) {
      return;
    }

    try {
      // This would call your API
      // const response = await api.deleteAccount();
      // For now, simulate deletion
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      });
      // Redirect to login or home page
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  const updateSettings = (section: keyof UserSettings, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getStrengthTextColor = (score: number) => {
    if (score === 0) return 'text-red-600';
    if (score <= 2) return 'text-orange-600';
    if (score <= 3) return 'text-yellow-600';
    if (score === 4) return 'text-green-600';
    return 'text-emerald-600';
  };

  const navigateToChangePassword = () => {
    navigate('/auth/change-password');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">
          Manage your account preferences and application settings
          {user?.role && (
            <Badge variant="secondary" className="ml-2">
              {user.role.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal and professional details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={settings.profile.firstName}
                      onChange={(e) => updateSettings('profile', { firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={settings.profile.lastName}
                      onChange={(e) => updateSettings('profile', { lastName: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => updateSettings('profile', { email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={settings.profile.phone}
                    onChange={(e) => updateSettings('profile', { phone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={user?.role ? user.role.replace('_', ' ').toUpperCase() : ''}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="station" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Assigned Station
                    </Label>
                    <Input
                      id="station"
                      value={user?.station_name || user?.station_id || 'Multiple Stations'}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleSaveSettings('profile')}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                    aria-label={saving ? 'Saving profile changes' : 'Save profile changes'}
                  >
                    <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => handleResetSettings('profile')}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Your current access levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">User Management</span>
                    <Badge variant={settings.roleSettings.canManageUsers ? "default" : "secondary"}>
                      {settings.roleSettings.canManageUsers ? "Allowed" : "Restricted"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Price Configuration</span>
                    <Badge variant={settings.roleSettings.canConfigurePrices ? "default" : "secondary"}>
                      {settings.roleSettings.canConfigurePrices ? "Allowed" : "Restricted"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Expense Approval</span>
                    <Badge variant={settings.roleSettings.canApproveExpenses ? "default" : "secondary"}>
                      {settings.roleSettings.canApproveExpenses ? "Allowed" : "Restricted"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Max Discount Limit</span>
                    <Badge variant="outline">
                      ₵{settings.roleSettings.maxDiscountLimit}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Station Access</Label>
                  <div className="text-sm text-gray-600">
                    {settings.roleSettings.stationAccess.includes('all') 
                      ? 'All Stations' 
                      : `${settings.roleSettings.stationAccess.length} station(s)`
                    }
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Report Access</Label>
                  <div className="text-sm text-gray-600">
                    {settings.roleSettings.reportAccess.includes('all')
                      ? 'All Reports'
                      : settings.roleSettings.reportAccess.join(', ')
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-900">Business Alerts</h4>
                  {[
                    { key: 'salesAlerts', title: "Sales Alerts", description: "Get notified for high-value transactions" },
                    { key: 'lowStockWarnings', title: "Low Stock Warnings", description: "Alert when fuel stock is running low" },
                    { key: 'priceChanges', title: "Price Changes", description: "Notify when fuel prices are updated" },
                    { key: 'shiftUpdates', title: "Shift Updates", description: "Notifications about shift changes" },
                    { key: 'systemMaintenance', title: "System Maintenance", description: "Alerts for scheduled maintenance" },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <Label htmlFor={setting.key} className="font-medium">
                          {setting.title}
                        </Label>
                        <p className="text-sm text-gray-600">{setting.description}</p>
                      </div>
                      <Switch
                        id={setting.key}
                        checked={settings.notifications[setting.key as keyof typeof settings.notifications] as boolean}
                        onCheckedChange={(checked) => 
                          updateSettings('notifications', { [setting.key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-900">Delivery Methods</h4>
                  {[
                    { key: 'emailNotifications', title: "Email Notifications", description: "Receive notifications via email" },
                    { key: 'smsNotifications', title: "SMS Notifications", description: "Receive notifications via SMS" },
                    { key: 'pushNotifications', title: "Push Notifications", description: "Receive push notifications" },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <Label htmlFor={setting.key} className="font-medium">
                          {setting.title}
                        </Label>
                        <p className="text-sm text-gray-600">{setting.description}</p>
                      </div>
                      <Switch
                        id={setting.key}
                        checked={settings.notifications[setting.key as keyof typeof settings.notifications] as boolean}
                        onCheckedChange={(checked) => 
                          updateSettings('notifications', { [setting.key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => handleSaveSettings('notifications')}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                  aria-label={saving ? 'Saving notification preferences' : 'Save notification preferences'}
                >
                  <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => handleResetSettings('notifications')}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings - UPDATED WITH REAL AUTH API */}
        <TabsContent value="security">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Password & Security</CardTitle>
                <CardDescription>Update your password and security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={handleNewPasswordChange}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {passwordForm.newPassword && (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Password strength:</span>
                          <span className={`font-semibold ${getStrengthTextColor(passwordStrength.score)}`}>
                            {passwordStrength.message}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        
                        {/* Password Requirements */}
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mt-2">
                          <div className="flex items-center gap-1">
                            {passwordStrength.requirements.minLength ? 
                              <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                              <XCircle className="w-3 h-3 text-red-500" />
                            }
                            <span>8+ characters</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {passwordStrength.requirements.hasUpperCase ? 
                              <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                              <XCircle className="w-3 h-3 text-red-500" />
                            }
                            <span>Uppercase letter</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {passwordStrength.requirements.hasLowerCase ? 
                              <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                              <XCircle className="w-3 h-3 text-red-500" />
                            }
                            <span>Lowercase letter</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {passwordStrength.requirements.hasNumbers ? 
                              <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                              <XCircle className="w-3 h-3 text-red-500" />
                            }
                            <span>Number</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="text-red-500 text-xs">Passwords do not match</p>
                    )}
                  </div>

                  <Button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    aria-label={saving ? 'Updating password' : 'Update password'}
                  >
                    <Key className="w-4 h-4 mr-2" aria-hidden="true" />
                    {saving ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>

                {/* Enhanced Change Password Button */}
                <div className="pt-4">
                  <Button 
                    onClick={navigateToChangePassword}
                    variant="outline"
                    className="w-full justify-between"
                    aria-label="Go to enhanced password change page"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Enhanced Password Change</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Forgot password?{' '}
                    <button 
                      onClick={() => navigate('/auth/forgot-password')}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Reset it here
                    </button>
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="font-medium text-sm">Last Password Change</p>
                    <p className="text-sm text-gray-600">
                      {settings.security.lastPasswordChange 
                        ? new Date(settings.security.lastPasswordChange).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">SMS Authentication</p>
                      <p className="text-sm text-gray-600">Receive codes via SMS to your registered phone</p>
                    </div>
                    <Badge variant={settings.security.twoFactorEnabled ? "default" : "secondary"}>
                      {settings.security.twoFactorEnabled ? "Enabled" : "Not Enabled"}
                    </Badge>
                  </div>
                  
                  <Button 
                    variant={settings.security.twoFactorEnabled ? "outline" : "default"}
                    onClick={handleTwoFactorToggle}
                    className="w-full"
                    aria-label={settings.security.twoFactorEnabled ? 'Disable two-factor authentication' : 'Enable two-factor authentication'}
                  >
                    <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                    {settings.security.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Session Settings</CardTitle>
                  <CardDescription>Manage your login session preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Login Alerts</p>
                      <p className="text-sm text-gray-600">Get notified of new sign-ins</p>
                    </div>
                    <Switch
                      checked={settings.security.loginAlerts}
                      onCheckedChange={(checked) => 
                        updateSettings('security', { loginAlerts: checked })
                      }
                      aria-label="Enable login alerts"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Session Timeout (minutes)
                    </Label>
                    <Select
                      value={settings.security.sessionTimeout.toString()}
                      onValueChange={(value) => 
                        updateSettings('security', { sessionTimeout: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={() => handleSaveSettings('security')}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                      aria-label={saving ? 'Saving security settings' : 'Save security settings'}
                    >
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      {saving ? 'Saving...' : 'Save Security Settings'}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => handleResetSettings('security')}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance & Language</CardTitle>
                  <CardDescription>Customize how PumpGuard looks and feels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme" className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Theme
                    </Label>
                    <Select
                      value={settings.preferences.theme}
                      onValueChange={(value: 'light' | 'dark' | 'system') => 
                        updateSettings('preferences', { theme: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language" className="flex items-center gap-2">
                      <Languages className="w-4 h-4" />
                      Language
                    </Label>
                    <Select
                      value={settings.preferences.language}
                      onValueChange={(value) => 
                        updateSettings('preferences', { language: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings.preferences.timezone}
                      onValueChange={(value) => 
                        updateSettings('preferences', { timezone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={settings.preferences.currency}
                      onValueChange={(value) => 
                        updateSettings('preferences', { currency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Offline Mode</CardTitle>
                  <CardDescription>Configure offline functionality for field operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {settings.preferences.offlineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                        Enable Offline Mode
                      </p>
                      <p className="text-sm text-gray-600">Work without internet connection</p>
                    </div>
                    <Switch
                      checked={settings.preferences.offlineMode}
                      onCheckedChange={(checked) => 
                        updateSettings('preferences', { offlineMode: checked })
                      }
                      aria-label="Enable offline mode"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-Sync</p>
                      <p className="text-sm text-gray-600">Automatically sync data when online</p>
                    </div>
                    <Switch
                      checked={settings.preferences.autoSync}
                      onCheckedChange={(checked) => 
                        updateSettings('preferences', { autoSync: checked })
                      }
                      aria-label="Enable auto-sync"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataRetention">Data Retention (days)</Label>
                    <Select
                      value={settings.preferences.dataRetention.toString()}
                      onValueChange={(value) => 
                        updateSettings('preferences', { dataRetention: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common settings and actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleDataExport}
                  aria-label="Export user data"
                >
                  <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                  Export My Data
                </Button>

                <div className="relative">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => document.getElementById('settings-import')?.click()}
                    aria-label="Import settings"
                  >
                    <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                    Import Settings
                  </Button>
                  <input
                    id="settings-import"
                    type="file"
                    accept=".json"
                    onChange={handleSettingsImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-hidden="true"
                  />
                </div>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('security')}
                  aria-label="Go to security settings"
                >
                  <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                  Security Checklist
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('/help', '_blank')}
                  aria-label="Open help and support"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" aria-hidden="true" />
                  Help & Support
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Label>Application Version</Label>
                  <p className="text-sm text-gray-600">PumpGuard v2.1.0</p>
                </div>

                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleSaveSettings('preferences')}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                    aria-label={saving ? 'Saving preferences' : 'Save all preferences'}
                  >
                    <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                    {saving ? 'Saving...' : 'Save All Preferences'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => handleResetSettings('preferences')}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Manage your data and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Export Account Data</p>
                      <p className="text-sm text-gray-600">Download all your data in JSON format</p>
                    </div>
                    <Button variant="outline" onClick={handleDataExport} aria-label="Export account data">
                      <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                      Export
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Clear Cache</p>
                      <p className="text-sm text-gray-600">Remove temporary application data</p>
                    </div>
                    <Button variant="outline" aria-label="Clear application cache">
                      <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                      Clear
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Storage Usage</Label>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600">2.1 GB of 5 GB used</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>Dangerous actions - proceed with caution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" aria-hidden="true" />
                    <div className="space-y-2">
                      <p className="font-medium text-red-800">Delete Account</p>
                      <p className="text-sm text-red-600">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleAccountDelete}
                        aria-label="Delete account"
                      >
                        <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" aria-hidden="true" />
                    <div className="space-y-2">
                      <p className="font-medium text-orange-800">Deactivate Account</p>
                      <p className="text-sm text-orange-600">
                        Temporarily deactivate your account. You can reactivate it later by logging in.
                      </p>
                      <Button variant="outline" size="sm" aria-label="Deactivate account">
                        Deactivate Account
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Audit Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Audit log of your account activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs?.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{log.action}</p>
                      <p className="text-sm text-gray-600">{log.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()} • {log.ipAddress}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {log.userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop'}
                    </Badge>
                  </div>
                ))}
                
                {(!auditLogs || auditLogs.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" aria-hidden="true" />
                    <p>No activity recorded yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}