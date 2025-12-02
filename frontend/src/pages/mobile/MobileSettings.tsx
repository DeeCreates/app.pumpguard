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
  ChevronRight,
  Menu,
  X,
  Home,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft
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

export default function MobileSettings() {
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
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

  // Mobile Components
  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
          {user?.role && (
            <Badge variant="secondary" className="text-xs">
              {user.role.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="rounded-full"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const MobileTabNavigation = () => (
    <div className="sticky top-[56px] z-40 bg-white border-b border-gray-200">
      <div className="flex overflow-x-auto px-4 py-2 no-scrollbar">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'preferences', label: 'Preferences', icon: Globe },
          { id: 'advanced', label: 'Advanced', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 mx-1 rounded-lg ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );

  const MobileSideMenu = () => (
    <div className={`fixed inset-0 z-50 transform transition-transform duration-300 ${
      showMobileMenu ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Quick Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileMenu(false)}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              navigate('/dashboard');
              setShowMobileMenu(false);
            }}
          >
            <Home className="w-4 h-4 mr-3" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setActiveTab('security');
              setShowMobileMenu(false);
            }}
          >
            <Key className="w-4 h-4 mr-3" />
            Change Password
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              handleDataExport();
              setShowMobileMenu(false);
            }}
          >
            <Download className="w-4 h-4 mr-3" />
            Export Data
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setActiveTab('advanced');
              setShowMobileMenu(false);
            }}
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Delete Account
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              // Handle logout
              setShowMobileMenu(false);
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );

  const MobileProfileCard = () => (
    <Card className="mb-4 border-0 shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="firstName" className="text-xs">First Name</Label>
            <Input
              id="firstName"
              value={settings.profile.firstName}
              onChange={(e) => updateSettings('profile', { firstName: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName" className="text-xs">Last Name</Label>
            <Input
              id="lastName"
              value={settings.profile.lastName}
              onChange={(e) => updateSettings('profile', { lastName: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs flex items-center gap-1">
            <Mail className="w-3 h-3" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={settings.profile.email}
            onChange={(e) => updateSettings('profile', { email: e.target.value })}
            className="h-9 text-sm"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="phone" className="text-xs flex items-center gap-1">
            <Phone className="w-3 h-3" />
            Phone Number
          </Label>
          <Input
            id="phone"
            value={settings.profile.phone}
            onChange={(e) => updateSettings('profile', { phone: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="role" className="text-xs">Role</Label>
            <Input
              id="role"
              value={user?.role ? user.role.replace('_', ' ').toUpperCase() : ''}
              disabled
              className="h-9 text-sm bg-gray-50"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="station" className="text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Station
            </Label>
            <Input
              id="station"
              value={user?.station_name || user?.station_id || 'Multiple Stations'}
              disabled
              className="h-9 text-sm bg-gray-50"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => handleSaveSettings('profile')}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-sm"
          >
            <Save className="w-3 h-3 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            type="button"
            variant="outline"
            onClick={() => handleResetSettings('profile')}
            className="h-9 text-sm"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MobileNotificationsCard = () => (
    <Card className="mb-4 border-0 shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 space-y-3">
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-900">Business Alerts</h4>
          {[
            { key: 'salesAlerts', title: "Sales Alerts", description: "High-value transactions" },
            { key: 'lowStockWarnings', title: "Low Stock", description: "Fuel stock alerts" },
            { key: 'priceChanges', title: "Price Changes", description: "Price updates" },
            { key: 'shiftUpdates', title: "Shift Updates", description: "Shift changes" },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between py-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor={setting.key} className="font-medium text-sm">
                  {setting.title}
                </Label>
                <p className="text-xs text-gray-600">{setting.description}</p>
              </div>
              <Switch
                id={setting.key}
                checked={settings.notifications[setting.key as keyof typeof settings.notifications] as boolean}
                onCheckedChange={(checked) => 
                  updateSettings('notifications', { [setting.key]: checked })
                }
                className="scale-90"
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-900">Delivery Methods</h4>
          {[
            { key: 'emailNotifications', title: "Email", description: "Receive via email" },
            { key: 'smsNotifications', title: "SMS", description: "Receive via SMS" },
            { key: 'pushNotifications', title: "Push", description: "Push notifications" },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between py-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor={setting.key} className="font-medium text-sm">
                  {setting.title}
                </Label>
                <p className="text-xs text-gray-600">{setting.description}</p>
              </div>
              <Switch
                id={setting.key}
                checked={settings.notifications[setting.key as keyof typeof settings.notifications] as boolean}
                onCheckedChange={(checked) => 
                  updateSettings('notifications', { [setting.key]: checked })
                }
                className="scale-90"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => handleSaveSettings('notifications')}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-sm"
          >
            <Save className="w-3 h-3 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            type="button"
            variant="outline"
            onClick={() => handleResetSettings('notifications')}
            className="h-9 text-sm"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MobileSecurityCard = () => (
    <Card className="mb-4 border-0 shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Password & Security</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 space-y-4">
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="currentPassword" className="text-xs">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                className="h-9 text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="newPassword" className="text-xs">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={handleNewPasswordChange}
                placeholder="Enter new password"
                className="h-9 text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
            
            {passwordForm.newPassword && (
              <div className="space-y-1 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Strength:</span>
                  <span className={`font-semibold ${getStrengthTextColor(passwordStrength.score)}`}>
                    {passwordStrength.message}
                  </span>
                </div>
                <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                className="h-9 text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-red-500 text-xs">Passwords do not match</p>
            )}
          </div>

          <Button 
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 h-9 text-sm"
          >
            <Key className="w-3 h-3 mr-1" />
            {saving ? 'Updating...' : 'Update Password'}
          </Button>
        </form>

        <div className="pt-3">
          <Button 
            onClick={navigateToChangePassword}
            variant="outline"
            className="w-full justify-between h-9 text-sm"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              <span>Enhanced Password</span>
            </div>
            <ChevronRight className="w-3 h-3" />
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Forgot password?{' '}
            <button 
              onClick={() => navigate('/auth/forgot-password')}
              className="text-blue-600 hover:text-blue-800"
            >
              Reset here
            </button>
          </p>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Last Password Change</p>
            <p className="text-xs text-gray-600">
              {settings.security.lastPasswordChange 
                ? new Date(settings.security.lastPasswordChange).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>

        <div className="flex items-center justify-between pt-3">
          <div>
            <p className="font-medium text-sm">Two-Factor Auth</p>
            <p className="text-xs text-gray-600">Add extra security layer</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.security.twoFactorEnabled ? "default" : "secondary"} className="text-xs">
              {settings.security.twoFactorEnabled ? "On" : "Off"}
            </Badge>
            <Switch
              checked={settings.security.twoFactorEnabled}
              onCheckedChange={handleTwoFactorToggle}
              className="scale-90"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => handleSaveSettings('security')}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-sm"
          >
            <Save className="w-3 h-3 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            type="button"
            variant="outline"
            onClick={() => handleResetSettings('security')}
            className="h-9 text-sm"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MobilePreferencesCard = () => (
    <Card className="mb-4 border-0 shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Appearance & Preferences</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="theme" className="text-xs flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Theme
            </Label>
            <Select
              value={settings.preferences.theme}
              onValueChange={(value: 'light' | 'dark' | 'system') => 
                updateSettings('preferences', { theme: value })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="language" className="text-xs flex items-center gap-1">
              <Languages className="w-3 h-3" />
              Language
            </Label>
            <Select
              value={settings.preferences.language}
              onValueChange={(value) => 
                updateSettings('preferences', { language: value })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-sm">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="timezone" className="text-xs">Timezone</Label>
            <Select
              value={settings.preferences.timezone}
              onValueChange={(value) => 
                updateSettings('preferences', { timezone: value })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz} className="text-sm">
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="currency" className="text-xs">Currency</Label>
            <Select
              value={settings.preferences.currency}
              onValueChange={(value) => 
                updateSettings('preferences', { currency: value })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value} className="text-sm">
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm flex items-center gap-1">
                {settings.preferences.offlineMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                Offline Mode
              </p>
              <p className="text-xs text-gray-600">Work without internet</p>
            </div>
            <Switch
              checked={settings.preferences.offlineMode}
              onCheckedChange={(checked) => 
                updateSettings('preferences', { offlineMode: checked })
              }
              className="scale-90"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Auto-Sync</p>
              <p className="text-xs text-gray-600">Sync when online</p>
            </div>
            <Switch
              checked={settings.preferences.autoSync}
              onCheckedChange={(checked) => 
                updateSettings('preferences', { autoSync: checked })
              }
              className="scale-90"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => handleSaveSettings('preferences')}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-sm"
          >
            <Save className="w-3 h-3 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            type="button"
            variant="outline"
            onClick={() => handleResetSettings('preferences')}
            className="h-9 text-sm"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MobileAdvancedCard = () => (
    <div className="space-y-4 mb-20">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-0 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">Export Data</p>
                <p className="text-xs text-gray-600">Download all your data</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDataExport} className="h-8 text-xs">
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">Import Settings</p>
                  <p className="text-xs text-gray-600">Upload settings file</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => document.getElementById('mobile-settings-import')?.click()}
                  className="h-8 text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Import
                </Button>
              </div>
              <input
                id="mobile-settings-import"
                type="file"
                accept=".json"
                onChange={handleSettingsImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Storage Usage</Label>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '45%' }}></div>
            </div>
            <p className="text-xs text-gray-600">2.1 GB of 5 GB used</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-0 space-y-4">
          <div className="p-3 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-medium text-sm text-red-800">Delete Account</p>
                <p className="text-xs text-red-600">
                  Permanently delete your account. Cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleAccountDelete}
                  className="h-8 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const MobileRolePermissionsCard = () => (
    <Card className="mb-4 border-0 shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Role Permissions</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-bold text-black">User Management</div>
            <Badge variant={settings.roleSettings.canManageUsers ? "default" : "secondary"} className="mt-1 text-xs">
              {settings.roleSettings.canManageUsers ? "Allowed" : "Restricted"}
            </Badge>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-bold text-black">Price Config</div>
            <Badge variant={settings.roleSettings.canConfigurePrices ? "default" : "secondary"} className="mt-1 text-xs">
              {settings.roleSettings.canConfigurePrices ? "Allowed" : "Restricted"}
            </Badge>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-bold text-black">Expense Approve</div>
            <Badge variant={settings.roleSettings.canApproveExpenses ? "default" : "secondary"} className="mt-1 text-xs">
              {settings.roleSettings.canApproveExpenses ? "Allowed" : "Restricted"}
            </Badge>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-bold text-black">Max Discount</div>
            <div className="text-xs font-semibold text-green-600 mt-1">
              ₵{settings.roleSettings.maxDiscountLimit}
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label className="text-xs">Station Access</Label>
          <p className="text-sm text-gray-600">
            {settings.roleSettings.stationAccess.includes('all') 
              ? 'All Stations' 
              : `${settings.roleSettings.stationAccess.length} station(s)`
            }
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Report Access</Label>
          <p className="text-sm text-gray-600">
            {settings.roleSettings.reportAccess.includes('all')
              ? 'All Reports'
              : settings.roleSettings.reportAccess.join(', ')
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader />
      <MobileSideMenu />
      <MobileTabNavigation />
      
      <div className="p-4">
        {activeTab === 'profile' && (
          <>
            <MobileProfileCard />
            <MobileRolePermissionsCard />
          </>
        )}
        
        {activeTab === 'notifications' && <MobileNotificationsCard />}
        
        {activeTab === 'security' && <MobileSecurityCard />}
        
        {activeTab === 'preferences' && <MobilePreferencesCard />}
        
        {activeTab === 'advanced' && <MobileAdvancedCard />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center"
            onClick={() => navigate('/dashboard')}
          >
            <Home className="w-5 h-5 text-gray-600" />
            <span className="text-xs mt-1">Home</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center text-blue-600"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-xs mt-1">Settings</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center"
            onClick={() => setActiveTab('security')}
          >
            <Shield className="w-5 h-5 text-gray-600" />
            <span className="text-xs mt-1">Security</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center"
            onClick={() => setActiveTab('advanced')}
          >
            <Database className="w-5 h-5 text-gray-600" />
            <span className="text-xs mt-1">Advanced</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
