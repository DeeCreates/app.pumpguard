import { BaseService } from '../base-service';
import {
  UserSettings,
  SecuritySettings,
  NotificationPreferences,
  AppearanceSettings,
  APIResponse
} from '../../../types/api';

export class SettingsService extends BaseService {
  private readonly tableName = 'user_settings';

  /**
   * Get comprehensive user settings
   */
  async getUserSettings(): Promise<APIResponse<UserSettings>> {
    return await this.handleRequest(async () => {
      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone,
          role,
          station_id,
          omc_id,
          dealer_id,
          avatar_url,
          is_active,
          last_login_at,
          created_at,
          updated_at,
          stations (id, name, code),
          omcs (id, name, code),
          dealers (id, name)
        `)
        .eq('id', this.userId)
        .single();

      if (profileError) return this.failure('Failed to load user profile');

      // Get saved settings
      const { data: savedSettings, error: settingsError } = await this.supabase
        .from(this.tableName)
        .select('settings')
        .eq('user_id', this.userId)
        .single();

      let userSettings: UserSettings;

      if (settingsError || !savedSettings) {
        // Create default settings
        userSettings = this.getDefaultUserSettings(profile);
        await this.createDefaultSettings(userSettings);
      } else {
        // Merge with defaults
        userSettings = this.mergeWithDefaultSettings(savedSettings.settings, profile);
      }

      await this.logActivity('settings_viewed', {
        action: 'view_settings'
      });

      return this.success(userSettings);
    });
  }

  /**
   * Update user settings with validation
   */
  async updateUserSettings(updates: Partial<UserSettings>): Promise<APIResponse<UserSettings>> {
    return await this.handleRequest(async () => {
      // Validate updates
      const validation = this.validateSettingsUpdates(updates);
      if (!validation.isValid) {
        return this.failure(`Invalid settings: ${validation.errors.join(', ')}`);
      }

      // Update profile if needed
      if (updates.profile) {
        await this.updateUserProfile(updates.profile);
      }

      // Update settings
      const { data: currentSettings } = await this.supabase
        .from(this.tableName)
        .select('settings')
        .eq('user_id', this.userId)
        .single();

      const mergedSettings = {
        ...(currentSettings?.settings || {}),
        ...updates
      };

      const { data: updatedSettings, error } = await this.supabase
        .from(this.tableName)
        .upsert({
          user_id: this.userId,
          settings: mergedSettings,
          updated_at: new Date().toISOString()
        })
        .select('settings')
        .single();

      if (error) return this.failure(error.message);

      await this.logActivity('settings_updated', {
        sections_updated: Object.keys(updates),
        changes: updates
      });

      return this.success(updatedSettings.settings, 'Settings updated successfully');
    });
  }

  /**
   * Change user password with security validation
   */
  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<APIResponse<void>> {
    return await this.handleRequest(async () => {
      // Validate password requirements
      const passwordValidation = this.validatePassword(passwordData.newPassword);
      if (!passwordValidation.isValid) {
        return this.failure(`Password requirements not met: ${passwordValidation.errors.join(', ')}`);
      }

      // Verify current password
      const { error: signInError } = await this.supabase.auth.signInWithPassword({
        email: this.userEmail!,
        password: passwordData.currentPassword
      });

      if (signInError) {
        return this.failure('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await this.supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) return this.failure('Failed to update password');

      // Update last password change timestamp
      await this.supabase
        .from(this.tableName)
        .update({
          settings: {
            security: {
              lastPasswordChange: new Date().toISOString()
            }
          }
        })
        .eq('user_id', this.userId);

      await this.logActivity('password_changed', {
        action: 'password_updated',
        change_type: 'manual'
      });

      return this.success(undefined, 'Password updated successfully');
    });
  }

  /**
   * Update two-factor authentication settings
   */
  async updateTwoFactorAuth(enabled: boolean): Promise<APIResponse<void>> {
    return await this.handleRequest(async () => {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({
          settings: {
            security: {
              twoFactorEnabled: enabled,
              twoFactorSetupDate: enabled ? new Date().toISOString() : null
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId);

      if (error) return this.failure('Failed to update two-factor authentication settings');

      await this.logActivity('2fa_updated', {
        action: enabled ? '2fa_enabled' : '2fa_disabled'
      });

      return this.success(undefined, 
        enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled'
      );
    });
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(): Promise<APIResponse<any>> {
    return await this.handleRequest(async () => {
      const [
        profileData,
        settingsData,
        activityData,
        salesData,
        violationData
      ] = await Promise.all([
        this.supabase.from('profiles').select('*').eq('id', this.userId).single(),
        this.supabase.from(this.tableName).select('*').eq('user_id', this.userId).single(),
        this.supabase.from('user_activity_logs').select('*').eq('user_id', this.userId).limit(1000),
        this.supabase.from('sales').select('*').eq('created_by', this.userId).limit(5000),
        this.supabase.from('compliance_violations').select('*').eq('reported_by', this.userId).limit(1000)
      ]);

      const exportData = {
        metadata: {
          exported_at: new Date().toISOString(),
          user_id: this.userId,
          data_categories: ['profile', 'settings', 'activity', 'sales', 'violations'],
          record_counts: {
            profile: profileData.data ? 1 : 0,
            settings: settingsData.data ? 1 : 0,
            activity: activityData.data?.length || 0,
            sales: salesData.data?.length || 0,
            violations: violationData.data?.length || 0
          }
        },
        profile: this.sanitizeExportData(profileData.data),
        settings: this.sanitizeExportData(settingsData.data),
        activity: this.sanitizeExportData(activityData.data),
        sales: this.sanitizeExportData(salesData.data),
        violations: this.sanitizeExportData(violationData.data)
      };

      await this.logActivity('data_exported', {
        action: 'export_personal_data',
        record_counts: exportData.metadata.record_counts
      });

      return this.success(exportData);
    });
  }

  /**
   * Delete user account with comprehensive cleanup
   */
  async deleteAccount(): Promise<APIResponse<void>> {
    return await this.handleRequest(async () => {
      // Check for dependencies
      const dependencies = await this.checkAccountDependencies();
      if (dependencies.length > 0) {
        return this.failure(`Cannot delete account due to active dependencies: ${dependencies.join(', ')}`);
      }

      // Soft delete profile
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({
          is_active: false,
          status: 'inactive',
          email: `deleted_${this.userId}@deleted.com`,
          full_name: 'Deleted User',
          phone: null,
          avatar_url: null,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.userId);

      if (profileError) return this.failure('Failed to delete profile');

      // Delete settings
      await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', this.userId);

      // Sign out
      await this.supabase.auth.signOut();

      await this.logActivity('account_deleted', {
        action: 'account_deleted',
        deletion_method: 'user_initiated'
      });

      return this.success(undefined, 'Account deleted successfully');
    });
  }

  /**
   * Update user appearance preferences
   */
  async updateAppearanceSettings(updates: AppearanceSettings): Promise<APIResponse<void>> {
    return await this.handleRequest(async () => {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({
          settings: {
            appearance: updates
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId);

      if (error) return this.failure('Failed to update appearance settings');

      return this.success(undefined, 'Appearance settings updated');
    });
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(updates: SecuritySettings): Promise<APIResponse<void>> {
    return await this.handleRequest(async () => {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({
          settings: {
            security: updates
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId);

      if (error) return this.failure('Failed to update security settings');

      await this.logActivity('security_settings_updated', {
        fields_updated: Object.keys(updates)
      });

      return this.success(undefined, 'Security settings updated');
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  private getDefaultUserSettings(profile: any): UserSettings {
    const baseSettings: UserSettings = {
      profile: {
        firstName: profile.full_name?.split(' ')[0] || '',
        lastName: profile.full_name?.split(' ').slice(1).join(' ') || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatar: profile.avatar_url
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
        requireReauthForSensitiveActions: true
      },
      appearance: {
        theme: 'light',
        language: 'en',
        timezone: 'Africa/Accra',
        dateFormat: 'DD/MM/YYYY',
        currency: 'GHS',
        compactMode: false,
        highContrast: false
      },
      preferences: {
        offlineMode: true,
        autoSync: true,
        dataRetention: 90,
        defaultView: 'dashboard',
        quickActions: ['new_sale', 'check_inventory', 'report_violation']
      },
      roleSettings: this.getDefaultRoleSettings(profile.role)
    };

    return baseSettings;
  }

  private getDefaultRoleSettings(role: string) {
    const roleSettings: any = {
      stationAccess: [],
      reportAccess: ['sales', 'inventory'],
      canManageUsers: false,
      canConfigurePrices: false,
      canApproveExpenses: false,
      maxDiscountLimit: 0,
    };

    switch (role) {
      case 'admin':
        roleSettings.stationAccess = ['all'];
        roleSettings.reportAccess = ['all'];
        roleSettings.canManageUsers = true;
        roleSettings.canConfigurePrices = true;
        roleSettings.canApproveExpenses = true;
        roleSettings.maxDiscountLimit = 1000;
        break;
      case 'omc':
        roleSettings.stationAccess = ['all'];
        roleSettings.reportAccess = ['sales', 'inventory', 'financial'];
        roleSettings.canManageUsers = true;
        roleSettings.canConfigurePrices = true;
        roleSettings.canApproveExpenses = true;
        roleSettings.maxDiscountLimit = 500;
        break;
      case 'station_manager':
        roleSettings.reportAccess = ['sales', 'inventory'];
        roleSettings.canApproveExpenses = true;
        roleSettings.maxDiscountLimit = 100;
        break;
    }

    return roleSettings;
  }

  private mergeWithDefaultSettings(savedSettings: any, profile: any): UserSettings {
    const defaultSettings = this.getDefaultUserSettings(profile);
    return {
      profile: { ...defaultSettings.profile, ...savedSettings.profile },
      notifications: { ...defaultSettings.notifications, ...savedSettings.notifications },
      security: { ...defaultSettings.security, ...savedSettings.security },
      appearance: { ...defaultSettings.appearance, ...savedSettings.appearance },
      preferences: { ...defaultSettings.preferences, ...savedSettings.preferences },
      roleSettings: { ...defaultSettings.roleSettings, ...savedSettings.roleSettings }
    };
  }

  private async createDefaultSettings(settings: UserSettings): Promise<void> {
    await this.supabase
      .from(this.tableName)
      .insert({
        user_id: this.userId,
        settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  }

  private async updateUserProfile(profileUpdates: any): Promise<void> {
    const updates: any = {};
    
    if (profileUpdates.firstName !== undefined && profileUpdates.lastName !== undefined) {
      updates.full_name = `${profileUpdates.firstName} ${profileUpdates.lastName}`.trim();
    }
    
    if (profileUpdates.phone !== undefined) {
      updates.phone = profileUpdates.phone;
    }

    if (profileUpdates.avatar !== undefined) {
      updates.avatar_url = profileUpdates.avatar;
    }

    if (Object.keys(updates).length > 0) {
      await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', this.userId);
    }
  }

  private validateSettingsUpdates(updates: Partial<UserSettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (updates.profile?.email && !this.isValidEmail(updates.profile.email)) {
      errors.push('Invalid email format');
    }
    
    if (updates.profile?.phone && !this.isValidPhone(updates.profile.phone)) {
      errors.push('Invalid phone number format');
    }

    if (updates.appearance?.sessionTimeout && 
        (updates.appearance.sessionTimeout < 15 || updates.appearance.sessionTimeout > 480)) {
      errors.push('Session timeout must be between 15 and 480 minutes');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Must be at least 8 characters');
    if (!/(?=.*[a-z])/.test(password)) errors.push('Must contain lowercase letter');
    if (!/(?=.*[A-Z])/.test(password)) errors.push('Must contain uppercase letter');
    if (!/(?=.*\d)/.test(password)) errors.push('Must contain number');
    if (!/(?=.*[!@#$%^&*])/.test(password)) errors.push('Must contain special character');
    return { isValid: errors.length === 0, errors };
  }

  private async checkAccountDependencies(): Promise<string[]> {
    const dependencies: string[] = [];

    const [
      { data: managedStations },
      { data: activeShifts },
      { data: omcContact }
    ] = await Promise.all([
      this.supabase.from('stations').select('id').eq('manager_id', this.userId).limit(1),
      this.supabase.from('shifts').select('id').eq('user_id', this.userId).eq('status', 'active').limit(1),
      this.supabase.from('omcs').select('id').eq('primary_contact_id', this.userId).limit(1)
    ]);

    if (managedStations?.length) dependencies.push('station management');
    if (activeShifts?.length) dependencies.push('active shifts');
    if (omcContact?.length) dependencies.push('OMC primary contact');

    return dependencies;
  }

  private sanitizeExportData(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(item => this.sanitizeExportData(item));
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'password_hash', 'reset_token', 'auth_token'];
    sensitiveFields.forEach(field => delete sanitized[field]);
    return sanitized;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(phone: string): boolean {
    return /^\+?[\d\s-()]{10,}$/.test(phone);
  }
}