import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  MessageCircle, 
  Settings, 
  Eye, 
  EyeOff, 
  Archive, 
  Download, 
  RefreshCw,
  Filter,
  Search,
  Trash2,
  Volume2,
  VolumeX,
  Clock,
  User,
  Building2,
  Zap,
  Mail, // ADDED MISSING IMPORT
  XCircle // ADDED FOR COMPLETENESS
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { api, Notification, NotificationPreferences, NotificationType, NotificationCategory, NotificationStats } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NotificationWithIcon extends Notification {
  icon: React.ComponentType<any>;
}

interface FilterState {
  category: string;
  priority: string;
  dateRange: string;
  search: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    priority: 'all',
    dateRange: 'all',
    search: ''
  });
  const { toast } = useToast();

  const notificationIcons: Record<NotificationType, React.ComponentType<any>> = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertTriangle,
    info: Info,
    alert: Bell,
    message: MessageCircle
  };

  const priorityColors: Record<string, string> = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100'
  };

  const categoryIcons: Record<string, React.ComponentType<any>> = {
    system: Settings,
    user: User,
    station: Building2,
    sales: Zap,
    inventory: Archive,
    security: AlertTriangle
  };

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [activeTab, filters]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const apiFilters: any = { 
        limit: 50,
        is_archived: false 
      };

      if (activeTab === 'unread') {
        apiFilters.is_read = false;
      } else if (activeTab === 'alerts') {
        apiFilters.type = 'alert';
      } else if (activeTab === 'messages') {
        apiFilters.type = 'message';
      }

      // Apply additional filters
      if (filters.category !== 'all') {
        apiFilters.category = filters.category;
      }
      if (filters.priority !== 'all') {
        apiFilters.priority = filters.priority;
      }
      if (filters.search) {
        apiFilters.search = filters.search;
      }

      const response = await api.getNotifications(apiFilters);
      
      if (response.success) {
        setNotifications(response.data.notifications);
        setStats(response.data.stats);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load notifications",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await api.getNotificationPreferences();
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[], read: boolean) => {
    try {
      const response = await api.markNotificationsAsRead({
        notification_ids: notificationIds,
        read
      });

      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notificationIds.includes(notification.id) 
              ? { ...notification, is_read: read }
              : notification
          )
        );
        
        toast({
          title: read ? "Marked as Read" : "Marked as Unread",
          description: response.message,
        });

        // Log the action
        await api.logUserActivity?.('notification_update', 'system', {
          action: read ? 'mark_read' : 'mark_unread',
          count: notificationIds.length
        });

      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update notifications",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (notificationIds: string[]) => {
    try {
      const response = await api.archiveNotifications(notificationIds);
      
      if (response.success) {
        // Remove from local state
        setNotifications(prev => 
          prev.filter(notification => !notificationIds.includes(notification.id))
        );
        
        toast({
          title: "Archived",
          description: response.message,
        });

        // Log the action
        await api.logUserActivity?.('notification_archive', 'system', {
          count: notificationIds.length
        });

      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to archive notifications",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      setSaving(true);
      const response = await api.updateNotificationPreferences(updates);
      
      if (response.success) {
        setPreferences(prev => prev ? { ...prev, ...updates } : null);
        toast({
          title: "Preferences Updated",
          description: "Your notification preferences have been saved",
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportNotifications = async () => {
    try {
      setExporting(true);
      const response = await api.exportNotifications?.({ format: 'json' });
      
      if (response?.success) {
        // Create and download the export file
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notifications-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: "Your notifications have been exported",
        });
      } else {
        throw new Error(response?.error || "Export failed");
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export notifications",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all notifications? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await api.clearAllNotifications?.();
      
      if (response?.success) {
        setNotifications([]);
        toast({
          title: "Cleared All",
          description: "All notifications have been cleared",
        });
      } else {
        throw new Error(response?.error || "Clear failed");
      }
    } catch (error: any) {
      toast({
        title: "Clear Failed",
        description: error.message || "Failed to clear notifications",
        variant: "destructive",
      });
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return time.toLocaleDateString();
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.is_read;
    if (activeTab === 'alerts') return notification.type === 'alert';
    if (activeTab === 'messages') return notification.type === 'message';
    return true;
  });

  const categories = [...new Set(notifications.map(n => n.category))];
  const priorities = [...new Set(notifications.map(n => n.priority))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-gray-600">Manage your alerts and messages</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={unreadCount > 0 ? "destructive" : "secondary"}>
            {unreadCount} unread
          </Badge>
          <Button variant="outline" onClick={loadNotifications}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Notification Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preferences && [
                { key: 'push_enabled', label: "Push Notifications", icon: Bell, enabled: preferences.push_enabled },
                { key: 'email_enabled', label: "Email Notifications", icon: Mail, enabled: preferences.email_enabled },
                { key: 'sms_enabled', label: "SMS Alerts", icon: MessageCircle, enabled: preferences.sms_enabled },
                { key: 'desktop_enabled', label: "Desktop Notifications", icon: Zap, enabled: preferences.desktop_enabled },
                { key: 'sound_enabled', label: "Sound Alerts", icon: Volume2, enabled: preferences.sound_enabled },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <setting.icon className="w-4 h-4 text-gray-500" />
                    <Label htmlFor={setting.key} className="text-sm">
                      {setting.label}
                    </Label>
                  </div>
                  <Switch 
                    id={setting.key}
                    checked={setting.enabled}
                    onCheckedChange={(checked) => 
                      handleUpdatePreferences({ [setting.key]: checked })
                    }
                    disabled={saving}
                  />
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleUpdatePreferences(preferences || {})}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleMarkAsRead(notifications.map(n => n.id), true)}
                disabled={!notifications.length || unreadCount === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All as Read
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleArchive(notifications.map(n => n.id))}
                disabled={!notifications.length}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive All
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleExportNotifications}
                disabled={exporting || !notifications.length}
              >
                {exporting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export Data
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleClearAll}
                disabled={!notifications.length}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Notifications</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
              
              {/* Advanced Filters */}
              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="search">Search</Label>
                      <Input
                        id="search"
                        placeholder="Search notifications..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={filters.category}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={filters.priority}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          {priorities.map(priority => (
                            <SelectItem key={priority} value={priority}>
                              {getPriorityLabel(priority)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateRange">Date Range</Label>
                      <Select
                        value={filters.dateRange}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({
                        category: 'all',
                        priority: 'all',
                        dateRange: 'all',
                        search: ''
                      })}
                    >
                      Reset Filters
                    </Button>
                    <Badge variant="outline">
                      {filteredNotifications.length} results
                    </Badge>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    All
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {notifications.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="flex items-center gap-2">
                    Unread
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1 text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4 mt-4">
                  {filteredNotifications.map((notification) => {
                    const Icon = notificationIcons[notification.type];
                    const CategoryIcon = categoryIcons[notification.category] || Info;
                    
                    return (
                      <div
                        key={notification.id}
                        className={`flex items-start space-x-4 p-4 rounded-lg border transition-all hover:shadow-md ${
                          !notification.is_read 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className={`p-2 rounded-full flex-shrink-0 ${
                          notification.type === 'success' ? 'bg-green-100 text-green-600' :
                          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          notification.type === 'error' ? 'bg-red-100 text-red-600' :
                          notification.type === 'info' ? 'bg-blue-100 text-blue-600' :
                          notification.type === 'alert' ? 'bg-orange-100 text-orange-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="font-semibold truncate">{notification.title}</p>
                                {!notification.is_read && (
                                  <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <CategoryIcon className="w-3 h-3" />
                                  {notification.category}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${priorityColors[notification.priority] || 'bg-gray-100 text-gray-600'}`}
                                >
                                  {getPriorityLabel(notification.priority)}
                                </Badge>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {getTimeAgo(notification.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleMarkAsRead([notification.id], !notification.is_read)}
                            title={notification.is_read ? "Mark as unread" : "Mark as read"}
                          >
                            {notification.is_read ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleArchive([notification.id])}
                            title="Archive notification"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-12">
                      <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg mb-2">No notifications found</p>
                      <p className="text-gray-500 text-sm">
                        {filters.search || filters.category !== 'all' || filters.priority !== 'all' 
                          ? "Try adjusting your filters" 
                          : "You're all caught up!"}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Notification Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Bell className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.unread}</p>
                  <p className="text-sm text-gray-600">Unread</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-sm text-gray-600">Read Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.today || 0}</p>
                  <p className="text-sm text-gray-600">Today</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}