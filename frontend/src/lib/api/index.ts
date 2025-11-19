// src/lib/api/index.ts
// Import all modular services
import { AuthService } from './services/auth-service';
import { StationService } from './services/station-service';
import { UserService } from './services/user-service';
import { ViolationService } from './services/violation-service';
import { SalesService } from './services/sales-service';
import { InventoryService } from './services/inventory-service';
import { PriceService } from './services/price-service';
import { ShiftService } from './services/shift-service';
import { NotificationService } from './services/notification-service';
import { OMCService } from './services/omc-service';
import { DealerService } from './services/dealer-service';
import { ExpenseService } from './services/expense-service';
import { BankDepositService } from './services/bank-deposit-service';
import { DashboardService } from './services/dashboard-service';
import { ReportService } from './services/report-service';
import { SettingsService } from './services/settings-service';
import { BulkOperationsService } from './services/bulk-operations-service';

// Create service instances
const authService = new AuthService();
const stationService = new StationService();
const userService = new UserService();
const violationService = new ViolationService();
const salesService = new SalesService();
const inventoryService = new InventoryService();
const priceService = new PriceService();
const shiftService = new ShiftService();
const notificationService = new NotificationService();
const omcService = new OMCService();
const dealerService = new DealerService();
const expenseService = new ExpenseService();
const bankDepositService = new BankDepositService();
const dashboardService = new DashboardService();
const reportService = new ReportService();
const settingsService = new SettingsService();
const bulkOperationsService = new BulkOperationsService();

// Unified API class
class PumpGuardAPI {
  // Service properties
  public auth = authService;
  public stations = stationService;
  public users = userService;
  public violations = violationService;
  public sales = salesService;
  public inventory = inventoryService;
  public prices = priceService;
  public shifts = shiftService;
  public notifications = notificationService;
  public omcs = omcService;
  public dealers = dealerService;
  public expenses = expenseService;
  public bankDeposits = bankDepositService;
  public dashboard = dashboardService;
  public reports = reportService;
  public settings = settingsService;
  public bulkOperations = bulkOperationsService;

  // Legacy method wrappers for backward compatibility
  async signup(userData: any): Promise<any> {
    return this.auth.signUp(userData);
  }

  async login(email: string, password: string): Promise<any> {
    return this.auth.signIn({ email, password });
  }

  async logout(): Promise<any> {
    return this.auth.signOut();
  }

  async getCurrentUser(): Promise<any> {
    return this.auth.getCurrentUser();
  }

  async getStations(filters?: any): Promise<any> {
    return this.stations.getStations(filters);
  }

  async createStation(stationData: any): Promise<any> {
    return this.stations.createStation(stationData);
  }

  async getUsers(filters?: any): Promise<any> {
    return this.users.getUsers(filters);
  }

  async deleteUser(userId: string): Promise<any> {
    return this.users.deleteUser(userId);
  }

  async getOMCs(filters?: any): Promise<any> {
    return this.omcs.getOMCs(filters);
  }

  async createOMC(omcData: any): Promise<any> {
    return this.omcs.createOMCWithAdmin(omcData);
  }

  async getDealers(filters?: any): Promise<any> {
    return this.dealers.getDealers(filters);
  }

  async getViolations(filters?: any): Promise<any> {
    return this.violations.getViolations(filters);
  }

  async updateViolation(id: string, updates: any): Promise<any> {
    return this.violations.updateViolation(id, updates);
  }

  async getGlobalAnalytics(): Promise<any> {
    return this.dashboard.getGlobalAnalytics();
  }

  async getAvailableRoles(): Promise<any> {
    return this.auth.getAvailableRoles();
  }
}

// Create and export singleton instance
export const api = new PumpGuardAPI();

// Export individual services for direct usage
export { 
  AuthService, 
  StationService, 
  UserService, 
  ViolationService, 
  SalesService, 
  InventoryService,
  PriceService,
  ShiftService,
  NotificationService,
  OMCService,
  DealerService,
  ExpenseService,
  BankDepositService,
  DashboardService,
  ReportService,
  SettingsService,
  BulkOperationsService
};

// Default export
export default api;