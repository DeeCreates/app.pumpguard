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
  Languages
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

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
  
  const { toast } = useToast();
  const { user, updateUser } = useAuth();

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
      const response = await api.getUserSettings();
      
      if (response.success) {
        setSettings(response.data);
      } else {
        // Load default settings based on user role
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await api.getAuditLogs();
      if (response.success) {
        setAuditLogs(response.data);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const getDefaultSettings = (): UserSettings => {
    const baseSettings = {
      profile: {
        firstName: user?.first_name || '',
        lastName: user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        avatar: user?.avatar,
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
        stationAccess: user?.station_id ? [user.station_id] : [],
        reportAccess: ['sales', 'inventory'],
        canManageUsers: false,
        canConfigurePrices: false,
        canApproveExpenses: false,
        maxDiscountLimit: 0,
      }
    };

    // Role-based settings
    switch (user?.role) {
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
          stationAccess: user?.stations || [],
          reportAccess: ['sales', 'inventory', 'financial'],
          canManageUsers: true,
          canConfigurePrices: true,
          canApproveExpenses: true,
          maxDiscountLimit: 200,
        };
        break;
      case 'station_manager':
        baseSettings.roleSettings = {
          stationAccess: user?.station_id ? [user.station_id] : [],
          reportAccess: ['sales', 'inventory'],
          canManageUsers: false,
          canConfigurePrices: false,
          canApproveExpenses: true,
          maxDiscountLimit: 100,
        };
        break;
      case 'cashier':
        baseSettings.roleSettings = {
          stationAccess: user?.station_id ? [user.station_id] : [],
          reportAccess: ['sales'],
          canManageUsers: false,
          canConfigurePrices: false,
          canApproveExpenses: false,
          maxDiscountLimit: 50,
        };
        break;
    }

    return baseSettings;
  };

  const handleSaveSettings = async (section: string) => {
    try {
      setSaving(true);
      
      const response = await api.updateUserSettings({
        [section]: settings[section as keyof UserSettings]
      });

      if (response.success) {
        toast({
          title: "Settings Updated",
          description: `${section.charAt(0).toUpperCase() + section.slice(1)} settings have been saved successfully.`,
        });
        
        // Update local user data if profile was changed
        if (section === 'profile') {
          updateUser({
            ...user,
            first_name: settings.profile.firstName,
            last_name: settings.profile.lastName,
            email: settings.profile.email,
            phone: settings.profile.phone,
          });
        }
      } else {
        throw new Error(response.error);
      }
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (response.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        throw new Error(response.error);
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
      
      const response = await api.updateTwoFactorAuth(newTwoFactorStatus);
      
      if (response.success) {
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
      } else {
        throw new Error(response.error);
      }
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
      const response = await api.exportUserData();
      
      if (response.success) {
        // Create and download the export file
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pumpguard-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Data Exported",
          description: "Your data has been exported successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleAccountDelete = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.")) {
      return;
    }

    try {
      const response = await api.deleteAccount();
      
      if (response.success) {
        toast({
          title: "Account Deleted",
          description: "Your account has been successfully deleted.",
        });
        // Redirect to login or home page
        window.location.href = '/';
      }
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
                      value={user?.station_name || 'Multiple Stations'}
                      disabled
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveSettings('profile')}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
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

              <Button 
                onClick={() => handleSaveSettings('notifications')}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
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
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {saving ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>

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
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
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
                  >
                    <Shield className="w-4 h-4 mr-2" />
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

                  <Button 
                    onClick={() => handleSaveSettings('security')}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Security Settings'}
                  </Button>
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
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export My Data
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('security')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Security Checklist
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('/help', '_blank')}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
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

                <Button 
                  onClick={() => handleSaveSettings('preferences')}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save All Preferences'}
                </Button>
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
                    <Button variant="outline" onClick={handleDataExport}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Clear Cache</p>
                      <p className="text-sm text-gray-600">Remove temporary application data</p>
                    </div>
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
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
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-medium text-red-800">Delete Account</p>
                      <p className="text-sm text-red-600">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleAccountDelete}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-medium text-orange-800">Deactivate Account</p>
                      <p className="text-sm text-orange-600">
                        Temporarily deactivate your account. You can reactivate it later by logging in.
                      </p>
                      <Button variant="outline" size="sm">
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
      {auditLogs?.slice(0, 5).map((log) => ( // Added safe navigation
        <div key={log.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
          <div className="space-y-1">
            <p className="font-medium text-sm">{log.action}</p>
            <p className="text-sm text-gray-600">{log.description}</p>
            <p className="text-xs text-gray-500">
              {new Date(log.timestamp).toLocaleString()} • {log.ipAddress}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {log.userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop'} {/* FIXED */}
          </Badge>
        </div>
      ))}
      
      {(!auditLogs || auditLogs.length === 0) && ( // IMPROVED: Added null check
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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