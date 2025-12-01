// src/pages/mobile/MobileSettings.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Download,
  Upload,
  Trash2,
  Key,
  Mail,
  Phone,
  Clock,
  Wifi,
  WifiOff,
  Palette,
  Languages,
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Menu,
  Home,
  LogOut,
  Info,
  HelpCircle,
  Battery,
  BatteryCharging,
  Cloud,
  CloudOff,
  Lock,
  Unlock,
  ShieldCheck,
  Smartphone as MobilePhone,
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
  };
  notifications: {
    salesAlerts: boolean;
    lowStockWarnings: boolean;
    priceChanges: boolean;
    shiftUpdates: boolean;
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
    currency: string;
    offlineMode: boolean;
    autoSync: boolean;
  };
}

// Mobile-specific components
const MobileStatusBar = ({ isOnline, batteryLevel, isCharging }: { 
  isOnline: boolean; 
  batteryLevel: number;
  isCharging: boolean;
}) => (
  <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-green-600" />
            <span className="text-xs text-green-700">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-orange-600" />
            <span className="text-xs text-orange-700">Offline</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {isCharging ? (
            <BatteryCharging className="w-3 h-3 text-green-600" />
          ) : (
            <Battery className="w-3 h-3 text-gray-600" />
          )}
          <span className="text-xs">{batteryLevel}%</span>
        </div>
        <span className="text-xs text-gray-500">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  </div>
);

const MobileSettingItem = ({ 
  icon: Icon, 
  title, 
  value, 
  badge,
  onClick,
  isDanger = false
}: { 
  icon: React.ElementType; 
  title: string; 
  value?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  isDanger?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full p-4 flex items-center justify-between rounded-xl active:scale-98 transition-transform ${
      isDanger 
        ? 'bg-red-50 hover:bg-red-100 border-red-200 border' 
        : 'bg-gray-50 hover:bg-gray-100'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${
        isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-left">
        <p className="font-medium text-gray-900">{title}</p>
        {value && <p className="text-sm text-gray-600">{value}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {badge}
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </div>
  </button>
);

const MobileSwitchItem = ({ 
  icon: Icon, 
  title, 
  description, 
  checked, 
  onChange,
  iconColor = "blue"
}: { 
  icon: React.ElementType; 
  title: string; 
  description?: string;
  checked: boolean; 
  onChange: (checked: boolean) => void;
  iconColor?: "blue" | "green" | "orange" | "red";
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[iconColor]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="font-medium text-gray-900">{title}</p>
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
};

const PullToRefresh = ({ onRefresh, refreshing }: { 
  onRefresh: () => void; 
  refreshing: boolean;
}) => {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshingState, setRefreshingState] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && startY > 0) {
      setCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    const pullDistance = currentY - startY;
    if (pullDistance > 100 && !refreshing) {
      setRefreshingState(true);
      onRefresh();
      setTimeout(() => setRefreshingState(false), 1000);
    }
    setStartY(0);
    setCurrentY(0);
  };

  const pullDistance = Math.max(0, currentY - startY);
  const progress = Math.min(100, (pullDistance / 100) * 100);

  if (refreshing || refreshingState) {
    return (
      <div className="flex items-center justify-center py-3 bg-blue-50">
        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="ml-2 text-sm text-blue-600">Refreshing...</span>
      </div>
    );
  }

  if (pullDistance > 0) {
    return (
      <div 
        className="flex items-center justify-center py-3"
        style={{
          height: `${Math.min(100, pullDistance)}px`,
          background: `linear-gradient(to bottom, rgba(59, 130, 246, ${progress/100}), white)`
        }}
      >
        <RefreshCw className="w-5 h-5 text-blue-600" style={{ transform: `rotate(${progress * 3.6}deg)` }} />
        <span className="ml-2 text-sm text-blue-600">
          {progress >= 100 ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    );
  }

  return null;
};

export default function MobileSettings() {
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security' | 'preferences' | 'advanced'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showSecuritySheet, setShowSecuritySheet] = useState(false);
  const [showAboutSheet, setShowAboutSheet] = useState(false);
  
  const { toast } = useToast();
  const { user, updateUserProfile, logout } = useAuth();
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
      timezone: 'Africa/Accra',
      currency: 'GHS',
      offlineMode: true,
      autoSync: true,
    },
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
  ];

  // Available timezones
  const timezones = [
    'Africa/Accra',
    'Africa/Lagos',
    'Africa/Nairobi',
    'UTC',
  ];

  // Available currencies
  const currencies = [
    { value: 'GHS', label: 'Ghana Cedi (₵)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
  ];

  // Battery monitoring
  useEffect(() => {
    const updateBattery = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          
          const updateBatteryInfo = () => {
            setBatteryLevel(Math.round(battery.level * 100));
            setIsCharging(battery.charging);
          };
          
          updateBatteryInfo();
          
          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);
          
          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
          };
        }
      } catch (error) {
        console.error('Battery API not supported:', error);
      }
    };

    updateBattery();
  }, []);

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const savedSettings = localStorage.getItem('mobile_settings');
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
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = (): UserSettings => {
    return {
      profile: {
        firstName: '',
        lastName: '',
        email: user?.email || '',
        phone: '',
      },
      notifications: {
        salesAlerts: true,
        lowStockWarnings: true,
        priceChanges: false,
        shiftUpdates: true,
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
        currency: 'GHS',
        offlineMode: true,
        autoSync: true,
      },
    };
  };

  const refreshAllData = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const handleSaveSettings = async (section: string) => {
    try {
      setSaving(true);
      
      localStorage.setItem('mobile_settings', JSON.stringify(settings));
      
      if (section === 'profile') {
        const result = await authAPI.updateUserProfile({
          full_name: `${settings.profile.firstName} ${settings.profile.lastName}`.trim(),
          email: settings.profile.email,
          phone: settings.profile.phone,
        });
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        updateUserProfile({
          full_name: `${settings.profile.firstName} ${settings.profile.lastName}`.trim(),
          email: settings.profile.email,
          phone: settings.profile.phone,
        });
      }
      
      toast({
        title: "Settings Updated",
        description: `${section} settings have been saved.`,
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

    if (requirements.minLength) score++;
    if (requirements.hasUpperCase) score++;
    if (requirements.hasLowerCase) score++;
    if (requirements.hasNumbers) score++;
    if (requirements.hasSpecialChar) score++;

    let message = '';
    if (score === 0) message = 'Very weak';
    else if (score <= 2) message = 'Weak';
    else if (score <= 3) message = 'Medium';
    else if (score === 4) message = 'Strong';
    else message = 'Very strong';

    return { score, message, requirements };
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordForm(prev => ({ ...prev, newPassword: value }));
    setPasswordStrength(checkPasswordStrength(value));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    try {
      setSaving(true);
      
      const result = await authAPI.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        });
        
        setPasswordForm({ 
          currentPassword: '', 
          newPassword: '', 
          confirmPassword: '' 
        });
        
        setSettings(prev => ({
          ...prev,
          security: {
            ...prev.security,
            lastPasswordChange: new Date().toISOString()
          }
        }));
        
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
          ? "Two-factor authentication has been enabled."
          : "Two-factor authentication has been disabled.",
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
      const exportData = {
        settings,
        profile: {
          name: `${settings.profile.firstName} ${settings.profile.lastName}`,
          email: settings.profile.email,
          role: user?.role,
        },
        exportDate: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mobile-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your settings have been exported.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleAccountDelete = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    try {
      // Simulate deletion
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Account Deleted",
        description: "Your account has been deleted.",
      });
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const renderProfileSection = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {settings.profile.firstName} {settings.profile.lastName}
              </h3>
              <p className="text-sm text-gray-600">{user?.role?.replace('_', ' ').toUpperCase()}</p>
              {user?.station_name && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3" />
                  {user.station_name}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <p className="font-medium">{settings.profile.email}</p>
            </div>
            {settings.profile.phone && (
              <div>
                <Label className="text-xs text-gray-500">Phone</Label>
                <p className="font-medium">{settings.profile.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={() => setShowProfileSheet(true)}
        className="w-full"
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit Profile
      </Button>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <MobileSwitchItem
            icon={Bell}
            title="Sales Alerts"
            description="Get notified for high-value transactions"
            checked={settings.notifications.salesAlerts}
            onChange={(checked) => updateSettings('notifications', { salesAlerts: checked })}
          />
          
          <MobileSwitchItem
            icon={AlertTriangle}
            title="Low Stock Warnings"
            description="Alert when fuel stock is running low"
            checked={settings.notifications.lowStockWarnings}
            onChange={(checked) => updateSettings('notifications', { lowStockWarnings: checked })}
            iconColor="orange"
          />
          
          <MobileSwitchItem
            icon={Bell}
            title="Price Changes"
            description="Notify when fuel prices are updated"
            checked={settings.notifications.priceChanges}
            onChange={(checked) => updateSettings('notifications', { priceChanges: checked })}
            iconColor="green"
          />
          
          <MobileSwitchItem
            icon={Clock}
            title="Shift Updates"
            description="Notifications about shift changes"
            checked={settings.notifications.shiftUpdates}
            onChange={(checked) => updateSettings('notifications', { shiftUpdates: checked })}
          />
          
          <MobileSwitchItem
            icon={Bell}
            title="Push Notifications"
            description="Receive notifications on this device"
            checked={settings.notifications.pushNotifications}
            onChange={(checked) => updateSettings('notifications', { pushNotifications: checked })}
          />
        </CardContent>
      </Card>

      <Button 
        onClick={() => handleSaveSettings('notifications')}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <MobileSwitchItem
            icon={Shield}
            title="Two-Factor Authentication"
            description="Add an extra layer of security"
            checked={settings.security.twoFactorEnabled}
            onChange={handleTwoFactorToggle}
            iconColor="green"
          />
          
          <MobileSwitchItem
            icon={ShieldCheck}
            title="Login Alerts"
            description="Get notified of new sign-ins"
            checked={settings.security.loginAlerts}
            onChange={(checked) => updateSettings('security', { loginAlerts: checked })}
          />

          <div className="space-y-2">
            <Label>Session Timeout</Label>
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
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Last Password Change</p>
                <p className="text-xs text-gray-600">
                  {settings.security.lastPasswordChange 
                    ? new Date(settings.security.lastPasswordChange).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={() => setShowSecuritySheet(true)}
        className="w-full"
        variant="outline"
      >
        <Key className="w-4 h-4 mr-2" />
        Change Password
      </Button>
    </div>
  );

  const renderPreferencesSection = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
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
            <Label>Language</Label>
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
            <Label>Timezone</Label>
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
            <Label>Currency</Label>
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

          <Separator />

          <MobileSwitchItem
            icon={settings.preferences.offlineMode ? CloudOff : Cloud}
            title="Offline Mode"
            description="Work without internet connection"
            checked={settings.preferences.offlineMode}
            onChange={(checked) => updateSettings('preferences', { offlineMode: checked })}
            iconColor={settings.preferences.offlineMode ? "orange" : "blue"}
          />
          
          <MobileSwitchItem
            icon={Cloud}
            title="Auto-Sync"
            description="Automatically sync data when online"
            checked={settings.preferences.autoSync}
            onChange={(checked) => updateSettings('preferences', { autoSync: checked })}
            iconColor="green"
          />
        </CardContent>
      </Card>

      <Button 
        onClick={() => handleSaveSettings('preferences')}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );

  const renderAdvancedSection = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <MobileSettingItem
            icon={Download}
            title="Export Data"
            value="Download your settings and data"
            onClick={handleDataExport}
          />
          
          <MobileSettingItem
            icon={RefreshCw}
            title="Clear Cache"
            value="Remove temporary application data"
            onClick={() => {
              toast({
                title: "Cache Cleared",
                description: "Temporary data has been removed.",
              });
            }}
          />
          
          <MobileSettingItem
            icon={Info}
            title="About PumpGuard"
            value="Version 2.1.0"
            onClick={() => setShowAboutSheet(true)}
          />
          
          <MobileSettingItem
            icon={HelpCircle}
            title="Help & Support"
            onClick={() => window.open('/help', '_blank')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-red-800">Danger Zone</p>
                <p className="text-sm text-red-600">
                  These actions are permanent and cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <MobileSettingItem
            icon={Trash2}
            title="Delete Account"
            isDanger={true}
            onClick={handleAccountDelete}
          />
          
          <MobileSettingItem
            icon={LogOut}
            title="Logout"
            isDanger={true}
            onClick={handleLogout}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'security':
        return renderSecuritySection();
      case 'preferences':
        return renderPreferencesSection();
      case 'advanced':
        return renderAdvancedSection();
      default:
        return renderProfileSection();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <MobileStatusBar isOnline={isOnline} batteryLevel={batteryLevel} isCharging={isCharging} />
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 safe-area-padding">
      {/* Status Bar */}
      <MobileStatusBar isOnline={isOnline} batteryLevel={batteryLevel} isCharging={isCharging} />

      {/* Header */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                {user?.role?.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-xs text-gray-600">Manage your preferences</span>
            </div>
          </div>
        </div>

        {/* Pull to refresh */}
        <PullToRefresh onRefresh={refreshAllData} refreshing={refreshing} />

        {/* Navigation */}
        <div className="flex items-center border-b border-gray-200 mb-4 overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'preferences', label: 'Preferences', icon: Globe },
            { id: 'advanced', label: 'Advanced', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex flex-col items-center">
                  <Icon className="w-5 h-5 mb-1" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      {/* Profile Edit Sheet */}
      <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={settings.profile.firstName}
                onChange={(e) => updateSettings('profile', { firstName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={settings.profile.lastName}
                onChange={(e) => updateSettings('profile', { lastName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.profile.email}
                onChange={(e) => updateSettings('profile', { email: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={settings.profile.phone}
                onChange={(e) => updateSettings('profile', { phone: e.target.value })}
              />
            </div>
            
            <Button 
              onClick={() => {
                handleSaveSettings('profile');
                setShowProfileSheet(false);
              }}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Security Sheet */}
      <Sheet open={showSecuritySheet} onOpenChange={setShowSecuritySheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Change Password</SheetTitle>
          </SheetHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              
              {passwordForm.newPassword && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Strength:</span>
                    <span className={`font-semibold ${
                      passwordStrength.score === 0 ? 'text-red-600' :
                      passwordStrength.score <= 2 ? 'text-orange-600' :
                      passwordStrength.score <= 3 ? 'text-yellow-600' :
                      passwordStrength.score === 4 ? 'text-green-600' :
                      'text-emerald-600'
                    }`}>
                      {passwordStrength.message}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
            >
              <Key className="w-4 h-4 mr-2" />
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* About Sheet */}
      <Sheet open={showAboutSheet} onOpenChange={setShowAboutSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>About PumpGuard</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold">PumpGuard Mobile</h3>
              <p className="text-gray-600">Version 2.1.0</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Build Date</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Device</span>
                <span className="font-medium">{navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Platform</span>
                <span className="font-medium">
                  {navigator.userAgent.includes('iPhone') ? 'iOS' : 
                   navigator.userAgent.includes('Android') ? 'Android' : 
                   'Web'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Storage Used</span>
                <span className="font-medium">2.1 GB / 5 GB</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Support</h4>
              <p className="text-sm text-gray-600">
                Need help? Contact our support team at support@pumpguard.com
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Terms & Privacy</h4>
              <p className="text-sm text-gray-600">
                By using PumpGuard, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('/help', '_blank')}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Help Center
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}