import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle, AlertTriangle, Info, MessageCircle, Settings, Eye, EyeOff, Archive, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { api, Notification, NotificationPreferences, NotificationType, NotificationCategory, NotificationStats } from "@/lib/api";

interface NotificationWithIcon extends Notification {
  icon: React.ComponentType<any>;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const notificationIcons: Record<NotificationType, React.ComponentType<any>> = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertTriangle,
    info: Info,
    alert: Bell,
    message: MessageCircle
  };

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [activeTab]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const filters: any = { 
        limit: 50,
        is_archived: false 
      };

      if (activeTab === 'unread') {
        filters.is_read = false;
      } else if (activeTab === 'alerts') {
        filters.type = 'alert';
      } else if (activeTab === 'messages') {
        filters.type = 'message';
      }

      const response = await api.getNotifications(filters);
      
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
          title: "Success",
          description: response.message,
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
          title: "Success",
          description: response.message,
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
          title: "Success",
          description: "Preferences updated successfully",
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

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return time.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.is_read;
    if (activeTab === 'alerts') return notification.type === 'alert';
    if (activeTab === 'messages') return notification.type === 'message';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
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
          <Badge variant="secondary">{unreadCount} unread</Badge>
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
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preferences && [
                { key: 'push_enabled', label: "Push Notifications", enabled: preferences.push_enabled },
                { key: 'email_enabled', label: "Email Notifications", enabled: preferences.email_enabled },
                { key: 'sms_enabled', label: "SMS Alerts", enabled: preferences.sms_enabled },
                { key: 'desktop_enabled', label: "Desktop Notifications", enabled: preferences.desktop_enabled },
                { key: 'sound_enabled', label: "Sound Alerts", enabled: preferences.sound_enabled },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
                  <Label htmlFor={setting.key} className="text-sm">
                    {setting.label}
                  </Label>
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
                {saving ? 'Saving...' : 'Save Settings'}
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
                disabled={!notifications.length}
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
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                  {filteredNotifications.map((notification) => {
                    const Icon = notificationIcons[notification.type];
                    return (
                      <div
                        key={notification.id}
                        className={`flex items-start space-x-4 p-4 rounded-lg border ${
                          !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                        }`}
                      >
                        <div className={`p-2 rounded-full ${
                          notification.type === 'success' ? 'bg-green-100 text-green-600' :
                          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          notification.type === 'error' ? 'bg-red-100 text-red-600' :
                          notification.type === 'info' ? 'bg-blue-100 text-blue-600' :
                          notification.type === 'alert' ? 'bg-orange-100 text-orange-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{notification.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {notification.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {notification.priority}
                                </Badge>
                              </div>
                            </div>
                            {!notification.is_read && (
                              <Badge variant="default" className="bg-blue-100 text-blue-800">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {getTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleMarkAsRead([notification.id], !notification.is_read)}
                          >
                            {notification.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleArchive([notification.id])}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-8">
                      <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No notifications found</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Notification Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}