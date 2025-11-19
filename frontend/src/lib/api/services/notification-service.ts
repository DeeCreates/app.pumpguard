import { BaseService } from '../base-service';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'alert' | 'message';
export type NotificationCategory = 'sales' | 'inventory' | 'pricing' | 'violations' | 'shifts' | 'system' | 'security' | 'maintenance';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DeliveryChannel = 'push' | 'email' | 'sms' | 'in_app';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  data?: any;
  is_read: boolean;
  is_archived: boolean;
  action_url?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  desktop_enabled: boolean;
  sound_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  categories: {
    sales: boolean;
    inventory: boolean;
    pricing: boolean;
    violations: boolean;
    shifts: boolean;
    system: boolean;
    security: boolean;
    maintenance: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  by_category: Record<NotificationCategory, number>;
  by_type: Record<NotificationType, number>;
  weekly_trend: { date: string; count: number }[];
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  category?: NotificationCategory | 'all';
  type?: NotificationType | 'all';
  priority?: NotificationPriority | 'all';
  is_read?: boolean | 'all';
  is_archived?: boolean;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: NotificationFilters;
  stats: NotificationStats;
}

export interface MarkAsReadRequest {
  notification_ids: string[];
  read: boolean;
}

export interface CreateNotificationRequest {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  data?: any;
  action_url?: string;
  expires_at?: string;
}

export interface BulkNotificationRequest {
  user_ids: string[];
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  data?: any;
  action_url?: string;
}

export class NotificationService extends BaseService {
  async getNotifications(filters: NotificationFilters = {}): Promise<ApiResponse<NotificationsResponse>> {
    return this.handleRequest(
      'get_notifications',
      async () => {
        const user = await this.requireAuth();
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('notifications')
          .select(`
            *,
            creator:profiles!notifications_created_by_fkey (full_name, avatar_url)
          `, { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_archived', filters.is_archived || false)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }
        if (filters.type && filters.type !== 'all') {
          query = query.eq('type', filters.type);
        }
        if (filters.priority && filters.priority !== 'all') {
          query = query.eq('priority', filters.priority);
        }
        if (filters.is_read !== undefined && filters.is_read !== 'all') {
          query = query.eq('is_read', filters.is_read);
        }
        if (filters.start_date) {
          query = query.gte('created_at', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('created_at', filters.end_date);
        }
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: notifications, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch notifications: ${error.message}`);
        }

        // Get notification statistics
        const stats = await this.getNotificationStats(user.id);

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        const response: NotificationsResponse = {
          notifications: notifications as Notification[],
          pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
          },
          filters,
          stats
        };

        await this.logActivity('notifications_viewed', undefined, {
          filters_applied: filters,
          notifications_count: notifications?.length || 0
        });

        return response;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async markAsRead(request: MarkAsReadRequest): Promise<ApiResponse> {
    return this.handleRequest(
      'mark_notifications_read',
      async () => {
        const user = await this.requireAuth();

        if (!request.notification_ids.length) {
          throw new Error('No notifications specified');
        }

        // Verify all notifications belong to the user
        const { data: userNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .in('id', request.notification_ids);

        if (!userNotifications || userNotifications.length !== request.notification_ids.length) {
          throw new Error('Some notifications not found or access denied');
        }

        const { error } = await supabase
          .from('notifications')
          .update({ 
            is_read: request.read,
            updated_at: new Date().toISOString()
          })
          .in('id', request.notification_ids);

        if (error) {
          throw new Error(`Failed to update notifications: ${error.message}`);
        }

        await this.logActivity('notifications_marked_read', undefined, {
          notification_ids: request.notification_ids,
          read_status: request.read,
          count: request.notification_ids.length
        });

        return { 
          message: request.read 
            ? `${request.notification_ids.length} notification(s) marked as read`
            : `${request.notification_ids.length} notification(s) marked as unread`
        };
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async archiveNotifications(notificationIds: string[]): Promise<ApiResponse> {
    return this.handleRequest(
      'archive_notifications',
      async () => {
        const user = await this.requireAuth();

        if (!notificationIds.length) {
          throw new Error('No notifications specified');
        }

        // Verify all notifications belong to the user
        const { data: userNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .in('id', notificationIds);

        if (!userNotifications || userNotifications.length !== notificationIds.length) {
          throw new Error('Some notifications not found or access denied');
        }

        const { error } = await supabase
          .from('notifications')
          .update({ 
            is_archived: true,
            updated_at: new Date().toISOString()
          })
          .in('id', notificationIds);

        if (error) {
          throw new Error(`Failed to archive notifications: ${error.message}`);
        }

        await this.logActivity('notifications_archived', undefined, {
          notification_ids: notificationIds,
          count: notificationIds.length
        });

        return { 
          message: `${notificationIds.length} notification(s) archived`
        };
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getNotificationPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    return this.handleRequest(
      'get_notification_preferences',
      async () => {
        const user = await this.requireAuth();

        const { data: preferences, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // Create default preferences if not found
          if (error.code === 'PGRST116') {
            return await this.createDefaultPreferences(user.id);
          }
          throw new Error(`Failed to fetch notification preferences: ${error.message}`);
        }

        return preferences as NotificationPreferences;
      },
      { requireAuth: true }
    );
  }

  async updateNotificationPreferences(updates: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> {
    return this.handleRequest(
      'update_notification_preferences',
      async () => {
        const user = await this.requireAuth();

        // Get current preferences first
        const currentPreferences = await this.getNotificationPreferences();
        if (!currentPreferences.success) {
          throw new Error('Failed to get current preferences');
        }

        const { data: preferences, error } = await supabase
          .from('notification_preferences')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update notification preferences: ${error.message}`);
        }

        await this.logActivity('notification_preferences_updated', undefined, {
          fields_updated: Object.keys(updates)
        });

        return preferences as NotificationPreferences;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async createNotification(notificationData: CreateNotificationRequest): Promise<ApiResponse<Notification>> {
    return this.handleRequest(
      'create_notification',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);

        // Check if user has permission to create notifications
        const allowedRoles = ['admin', 'omc', 'dealer', 'station_manager'];
        if (!allowedRoles.includes(userProfile.role)) {
          throw new Error('Insufficient permissions to create notifications');
        }

        const { data: newNotification, error } = await supabase
          .from('notifications')
          .insert({
            ...notificationData,
            priority: notificationData.priority || 'medium',
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select(`
            *,
            creator:profiles!notifications_created_by_fkey (full_name, avatar_url)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to create notification: ${error.message}`);
        }

        await this.logActivity('notification_created', undefined, {
          target_user_id: notificationData.user_id,
          notification_type: notificationData.type,
          notification_category: notificationData.category
        });

        return newNotification as Notification;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async sendBulkNotification(request: BulkNotificationRequest): Promise<ApiResponse<{ sent: number; failed: number }>> {
    return this.handleRequest(
      'send_bulk_notification',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);

        // Check if user has permission to send bulk notifications
        const allowedRoles = ['admin', 'omc'];
        if (!allowedRoles.includes(userProfile.role)) {
          throw new Error('Insufficient permissions to send bulk notifications');
        }

        if (!request.user_ids.length) {
          throw new Error('No users specified');
        }

        const notifications = request.user_ids.map(user_id => ({
          user_id,
          title: request.title,
          message: request.message,
          type: request.type,
          category: request.category,
          priority: request.priority || 'medium',
          data: request.data,
          action_url: request.action_url,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error, count } = await supabase
          .from('notifications')
          .insert(notifications)
          .select('id', { count: 'exact' });

        if (error) {
          throw new Error(`Failed to send bulk notifications: ${error.message}`);
        }

        await this.logActivity('bulk_notification_sent', undefined, {
          user_count: request.user_ids.length,
          notification_type: request.type,
          notification_category: request.category
        });

        return {
          sent: count || 0,
          failed: request.user_ids.length - (count || 0)
        };
      },
      { requireAuth: true, logActivity: true }
    );
  }

  // Private helper methods
  private async getNotificationStats(userId: string): Promise<NotificationStats> {
    // Get total counts
    const { count: total } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_archived', false);

    const { count: unread } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_archived', false);

    const { count: read } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', true)
      .eq('is_archived', false);

    // Get counts by category and type
    const { data: notifications } = await supabase
      .from('notifications')
      .select('category, type')
      .eq('user_id', userId)
      .eq('is_archived', false);

    const by_category = notifications?.reduce((acc, notification) => {
      acc[notification.category] = (acc[notification.category] || 0) + 1;
      return acc;
    }, {} as Record<NotificationCategory, number>) || {} as Record<NotificationCategory, number>;

    const by_type = notifications?.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>) || {} as Record<NotificationType, number>;

    // Get weekly trend (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: weeklyData } = await supabase
      .from('notifications')
      .select('created_at')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .gte('created_at', weekAgo.toISOString());

    const weekly_trend = weeklyData?.reduce((acc, notification) => {
      const date = notification.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: total || 0,
      unread: unread || 0,
      read: read || 0,
      by_category,
      by_type,
      weekly_trend: Object.entries(weekly_trend || {}).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  private async createDefaultPreferences(userId: string): Promise<ApiResponse<NotificationPreferences>> {
    const defaultPreferences = {
      user_id: userId,
      email_enabled: true,
      push_enabled: true,
      sms_enabled: false,
      desktop_enabled: true,
      sound_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '06:00',
      categories: {
        sales: true,
        inventory: true,
        pricing: true,
        violations: true,
        shifts: true,
        system: true,
        security: true,
        maintenance: true
      }
    };

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .insert(defaultPreferences)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default preferences: ${error.message}`);
    }

    return preferences as NotificationPreferences;
  }
}