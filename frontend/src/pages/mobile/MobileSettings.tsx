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
  ChevronRight,
  LogOut,
  X,
  Plus,
  MoreVertical
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
                className="h-8 w-8 p-0"
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

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  
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

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
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
        setShowPasswordSheet(false);
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

  const getThemeLabel = (theme: string) => {
    return themes.find(t => t.value === theme)?.label || 'Light';
  };

  const getLanguageLabel = (lang: string) => {
    return languages.find(l => l.value === lang)?.label || 'English';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4 space-y-6">
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 text-sm">
              Manage your account preferences
              {user?.role && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {user.role.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
            disabled={loading}
            className="h-10 w-10 p-0 touch-manipulation active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Mobile Profile Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-blue-200">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg truncate">
                  {settings.profile.firstName} {settings.profile.lastName}
                </h3>
                <p className="text-gray-600 text-sm truncate">{settings.profile.email}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {user?.role?.replace('_', ' ').toUpperCase()} • {user?.station_name || 'Multiple Stations'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Settings Navigation */}
        <div className="space-y-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <SettingItem
                title="Profile Information"
                description="Update personal details"
                icon={<User className="w-5 h-5" />}
                action={() => setActiveTab('profile')}
              />
              <Separator />
              <SettingItem
                title="Notifications"
                description="Manage alerts and preferences"
                icon={<Bell className="w-5 h-5" />}
                action={() => setActiveTab('notifications')}
              />
              <Separator />
              <SettingItem
                title="Security"
                description="Password, 2FA, and privacy"
                icon={<Shield className="w-5 h-5" />}
                action={() => setActiveTab('security')}
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <SettingItem
                title="Appearance"
                description="Theme and language"
                icon={<Palette className="w-5 h-5" />}
                value={getThemeLabel(settings.preferences.theme)}
                action={() => setShowThemeSheet(true)}
              />
              <Separator />
              <SettingItem
                title="Language"
                description="App language"
                icon={<Languages className="w-5 h-5" />}
                value={getLanguageLabel(settings.preferences.language)}
                action={() => setShowLanguageSheet(true)}
              />
              <Separator />
              <SettingItem
                title="Offline Mode"
                description="Work without internet"
                icon={settings.preferences.offlineMode ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
                value={settings.preferences.offlineMode ? "Enabled" : "Disabled"}
                action={() => updateSettings('preferences', { offlineMode: !settings.preferences.offlineMode })}
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <SettingItem
                title="Change Password"
                description="Update your password"
                icon={<Key className="w-5 h-5" />}
                action={() => setShowPasswordSheet(true)}
              />
              <Separator />
              <SettingItem
                title="Export Data"
                description="Download your information"
                icon={<Download className="w-5 h-5" />}
                action={handleDataExport}
              />
              <Separator />
              <SettingItem
                title="Help & Support"
                description="Get help using PumpGuard"
                icon={<AlertTriangle className="w-5 h-5" />}
                action={() => window.open('/help', '_blank')}
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <SettingItem
                title="Delete Account"
                description="Permanently delete your account"
                icon={<Trash2 className="w-5 h-5" />}
                danger={true}
                action={() => setShowActionSheet(true)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">45%</p>
                <p className="text-xs text-blue-600">Storage Used</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">2.1.0</p>
                <p className="text-xs text-green-600">App Version</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLogs?.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {log.action}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      {new Date(log.timestamp).toLocaleDateString()} • {log.ipAddress}
                    </p>
                  </div>
                </div>
              ))}
              
              {(!auditLogs || auditLogs.length === 0) && (
                <div className="text-center py-6 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Sheets */}
      <BottomSheet 
        open={showPasswordSheet} 
        onOpenChange={setShowPasswordSheet}
        title="Change Password"
        description="Update your account password"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-base font-medium">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-base font-medium">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-base font-medium">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
                placeholder="Confirm new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPasswordSheet(false)}
              className="flex-1 border-gray-300 hover:bg-gray-50 text-base py-3 rounded-xl font-medium touch-manipulation active:scale-95"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors text-base touch-manipulation active:scale-95"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet 
        open={showThemeSheet} 
        onOpenChange={setShowThemeSheet}
        title="Appearance"
        description="Choose your preferred theme"
      >
        <div className="space-y-2">
          {themes.map((theme) => (
            <button
              key={theme.value}
              onClick={() => {
                updateSettings('preferences', { theme: theme.value as 'light' | 'dark' | 'system' });
                setShowThemeSheet(false);
              }}
              className={`w-full text-left p-4 rounded-xl text-base font-medium transition-colors touch-manipulation active:scale-95 ${
                settings.preferences.theme === theme.value
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-900 hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{theme.label}</span>
                {settings.preferences.theme === theme.value && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet 
        open={showLanguageSheet} 
        onOpenChange={setShowLanguageSheet}
        title="Language"
        description="Select your preferred language"
      >
        <div className="space-y-2">
          {languages.map((language) => (
            <button
              key={language.value}
              onClick={() => {
                updateSettings('preferences', { language: language.value });
                setShowLanguageSheet(false);
              }}
              className={`w-full text-left p-4 rounded-xl text-base font-medium transition-colors touch-manipulation active:scale-95 ${
                settings.preferences.language === language.value
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-900 hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{language.label}</span>
                {settings.preferences.language === language.value && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>

      <ActionSheet
        open={showActionSheet}
        onOpenChange={setShowActionSheet}
        title="Account Actions"
        actions={[
          {
            label: 'Export Data',
            action: handleDataExport,
            icon: <Download className="w-5 h-5" />
          },
          {
            label: 'Sign Out',
            action: () => console.log('Sign out'),
            icon: <LogOut className="w-5 h-5" />
          },
          {
            label: 'Delete Account',
            action: handleAccountDelete,
            icon: <Trash2 className="w-5 h-5" />
          }
        ]}
        destructiveIndex={2}
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