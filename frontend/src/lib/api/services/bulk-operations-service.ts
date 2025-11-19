import { BaseService } from '../base-service';
import {
  BulkOperationResult,
  BulkStationUpdate,
  BulkUserAssignment,
  BulkPriceUpdate,
  APIResponse
} from '../../../types/api';

export class BulkOperationsService extends BaseService {

  /**
   * Bulk update station statuses
   */
  async bulkUpdateStationStatus(updates: BulkStationUpdate): Promise<APIResponse<BulkOperationResult>> {
    return await this.handleRequest(async () => {
      if (!await this.canManageStations()) {
        return this.failure('Insufficient permissions for bulk station operations');
      }

      const results: BulkOperationResult = {
        success: 0,
        failed: 0,
        errors: [],
        processed_at: new Date().toISOString()
      };

      for (const stationId of updates.station_ids) {
        try {
          const { error } = await this.supabase
            .from('stations')
            .update({
              status: updates.status,
              updated_by: this.userId,
              updated_at: new Date().toISOString()
            })
            .eq('id', stationId);

          if (error) {
            results.failed++;
            results.errors.push({ station_id: stationId, error: error.message });
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({ station_id: stationId, error: error.message });
        }
      }

      await this.logActivity('bulk_station_status_update', {
        station_count: updates.station_ids.length,
        new_status: updates.status,
        results
      });

      return this.success(results, 
        `Bulk update completed: ${results.success} successful, ${results.failed} failed`
      );
    });
  }

  /**
   * Bulk assign manager to stations
   */
  async bulkAssignManager(assignment: BulkUserAssignment): Promise<APIResponse<BulkOperationResult>> {
    return await this.handleRequest(async () => {
      if (!await this.canManageStations()) {
        return this.failure('Insufficient permissions for bulk user assignments');
      }

      // Verify manager exists and has appropriate role
      const { data: manager } = await this.supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', assignment.manager_id)
        .in('role', ['station_manager', 'supervisor'])
        .single();

      if (!manager) {
        return this.failure('Manager not found or does not have appropriate role');
      }

      const results: BulkOperationResult = {
        success: 0,
        failed: 0,
        errors: [],
        processed_at: new Date().toISOString()
      };

      for (const stationId of assignment.station_ids) {
        try {
          const { error } = await this.supabase
            .from('stations')
            .update({
              manager_id: assignment.manager_id,
              updated_by: this.userId,
              updated_at: new Date().toISOString()
            })
            .eq('id', stationId);

          if (error) {
            results.failed++;
            results.errors.push({ station_id: stationId, error: error.message });
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({ station_id: stationId, error: error.message });
        }
      }

      await this.logActivity('bulk_manager_assignment', {
        manager_id: assignment.manager_id,
        manager_name: manager.full_name,
        station_count: assignment.station_ids.length,
        results
      });

      return this.success(results,
        `Manager assigned to ${results.success} stations successfully`
      );
    });
  }

  /**
   * Bulk update user roles and assignments
   */
  async bulkUpdateUsers(userIds: string[], updates: any): Promise<APIResponse<BulkOperationResult>> {
    return await this.handleRequest(async () => {
      if (this.userRole !== 'admin') {
        return this.failure('Only administrators can perform bulk user updates');
      }

      const results: BulkOperationResult = {
        success: 0,
        failed: 0,
        errors: [],
        processed_at: new Date().toISOString()
      };

      for (const userId of userIds) {
        try {
          const { error } = await this.supabase
            .from('profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) {
            results.failed++;
            results.errors.push({ user_id: userId, error: error.message });
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({ user_id: userId, error: error.message });
        }
      }

      await this.logActivity('bulk_user_update', {
        user_count: userIds.length,
        updates: Object.keys(updates),
        results
      });

      return this.success(results,
        `Bulk user update completed: ${results.success} successful, ${results.failed} failed`
      );
    });
  }

  /**
   * Bulk update product prices
   */
  async bulkUpdatePrices(updates: BulkPriceUpdate): Promise<APIResponse<BulkOperationResult>> {
    return await this.handleRequest(async () => {
      if (!await this.canManagePrices()) {
        return this.failure('Insufficient permissions for bulk price updates');
      }

      const results: BulkOperationResult = {
        success: 0,
        failed: 0,
        errors: [],
        processed_at: new Date().toISOString()
      };

      for (const priceUpdate of updates.prices) {
        try {
          // Deactivate current active price
          await this.supabase
            .from('station_prices')
            .update({ status: 'expired' })
            .eq('station_id', priceUpdate.station_id)
            .eq('product_id', priceUpdate.product_id)
            .eq('status', 'active');

          // Create new price
          const { error } = await this.supabase
            .from('station_prices')
            .insert({
              station_id: priceUpdate.station_id,
              product_id: priceUpdate.product_id,
              selling_price: priceUpdate.selling_price,
              effective_date: new Date().toISOString(),
              omc_user_id: this.userId,
              status: 'active',
              created_at: new Date().toISOString()
            });

          if (error) {
            results.failed++;
            results.errors.push({
              station_id: priceUpdate.station_id,
              product_id: priceUpdate.product_id,
              error: error.message
            });
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            station_id: priceUpdate.station_id,
            product_id: priceUpdate.product_id,
            error: error.message
          });
        }
      }

      await this.logActivity('bulk_price_update', {
        price_update_count: updates.prices.length,
        results
      });

      return this.success(results,
        `Bulk price update completed: ${results.success} successful, ${results.failed} failed`
      );
    });
  }

  /**
   * Bulk create stations for OMC
   */
  async bulkCreateStations(omcId: string, stationsData: any[]): Promise<APIResponse<BulkOperationResult>> {
    return await this.handleRequest(async () => {
      if (!await this.canManageStations()) {
        return this.failure('Insufficient permissions for bulk station creation');
      }

      const results: BulkOperationResult = {
        success: 0,
        failed: 0,
        errors: [],
        processed_at: new Date().toISOString()
      };

      for (const stationData of stationsData) {
        try {
          const { error } = await this.supabase
            .from('stations')
            .insert({
              ...stationData,
              omc_id: omcId,
              code: this.generateStationCode(stationData.name),
              status: 'active',
              created_by: this.userId,
              created_at: new Date().toISOString()
            });

          if (error) {
            results.failed++;
            results.errors.push({
              station_name: stationData.name,
              error: error.message
            });
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            station_name: stationData.name,
            error: error.message
          });
        }
      }

      await this.logActivity('bulk_station_creation', {
        omc_id: omcId,
        station_count: stationsData.length,
        results
      });

      return this.success(results,
        `Bulk station creation completed: ${results.success} successful, ${results.failed} failed`
      );
    });
  }

  /**
   * Bulk export data for multiple entities
   */
  async bulkExportData(entityType: string, filters: any): Promise<APIResponse<any>> {
    return await this.handleRequest(async () => {
      const exportPromises = [];

      switch (entityType) {
        case 'stations':
          exportPromises.push(this.exportStations(filters));
          break;
        case 'users':
          exportPromises.push(this.exportUsers(filters));
          break;
        case 'sales':
          exportPromises.push(this.exportSales(filters));
          break;
        case 'violations':
          exportPromises.push(this.exportViolations(filters));
          break;
        case 'all':
          exportPromises.push(
            this.exportStations(filters),
            this.exportUsers(filters),
            this.exportSales(filters),
            this.exportViolations(filters)
          );
          break;
        default:
          return this.failure('Unsupported entity type for bulk export');
      }

      const results = await Promise.all(exportPromises);

      await this.logActivity('bulk_data_export', {
        entity_type: entityType,
        filters,
        result_count: results.length
      });

      return this.success({
        entity_type: entityType,
        exports: results,
        exported_at: new Date().toISOString()
      });
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  private async canManageStations(): Promise<boolean> {
    const allowedRoles = ['admin', 'omc', 'dealer'];
    return allowedRoles.includes(this.userRole);
  }

  private async canManagePrices(): Promise<boolean> {
    const allowedRoles = ['admin', 'omc'];
    return allowedRoles.includes(this.userRole);
  }

  private generateStationCode(name: string): string {
    const base = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').substring(0, 10);
    const timestamp = Date.now().toString().slice(-6);
    return `${base}_${timestamp}`;
  }

  private async exportStations(filters: any) {
    // Implementation for station export
    return { type: 'stations', data: [], count: 0 };
  }

  private async exportUsers(filters: any) {
    // Implementation for user export
    return { type: 'users', data: [], count: 0 };
  }

  private async exportSales(filters: any) {
    // Implementation for sales export
    return { type: 'sales', data: [], count: 0 };
  }

  private async exportViolations(filters: any) {
    // Implementation for violations export
    return { type: 'violations', data: [], count: 0 };
  }
}