// Core API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp: string;
  request_id?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    [key: string]: any;
    error: string;
  }>;
  processed_at: string;
}

// Authentication Types
export interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  role?: string;
  omc_id?: string | null;
  station_id?: string | null;
  dealer_id?: string | null;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface AppealData {
  violation_id: string;
  appeal_reason: string;
  evidence_urls?: string[];
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
}

// User Management Types
export type UserRole = 
  | 'admin' 
  | 'npa' 
  | 'omc' 
  | 'dealer' 
  | 'station_manager' 
  | 'attendant' 
  | 'supervisor';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  station_id?: string;
  omc_id?: string;
  dealer_id?: string;
  status: UserStatus;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Related data
  station?: {
    id: string;
    name: string;
    code: string;
  };
  omc?: {
    id: string;
    name: string;
    code: string;
  };
  dealer?: {
    id: string;
    name: string;
  };
}

export interface UserCreateData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  station_id?: string | null;
  omc_id?: string | null;
  dealer_id?: string | null;
  status?: UserStatus;
  send_invitation?: boolean;
}

export interface UserUpdateData {
  full_name?: string;
  email?: string;
  role?: UserRole;
  phone?: string | null;
  station_id?: string | null;
  omc_id?: string | null;
  dealer_id?: string | null;
  status?: UserStatus;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  omc_id?: string;
  station_id?: string;
  dealer_id?: string;
  created_after?: string;
  created_before?: string;
  last_login_after?: string;
  last_login_before?: string;
  sort_by?: 'full_name' | 'email' | 'role' | 'status' | 'created_at' | 'last_login_at';
  sort_order?: 'asc' | 'desc';
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: UserFilters;
}

export interface BulkUserOperation {
  user_ids: string[];
  updates: Partial<UserUpdateData>;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  pending_users: number;
  by_role: Record<UserRole, number>;
  by_status: Record<UserStatus, number>;
  recent_signups: number;
  daily_active_users: number;
  avg_last_login_days: number;
}

export interface UserActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    role: UserRole;
  };
}

export interface UserExportData {
  users: User[];
  metadata: {
    exported_at: string;
    exported_by: string;
    filters_applied: UserFilters;
    total_records: number;
    format: 'json' | 'csv';
  };
}

export interface UserValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface RolePermission {
  role: UserRole;
  permissions: string[];
  can_manage_users: boolean;
  can_manage_stations: boolean;
  can_manage_omcs: boolean;
  can_manage_violations: boolean;
  can_manage_pricing: boolean;
  can_view_reports: boolean;
  can_export_data: boolean;
}

// Station Management Types
export interface Station {
  id: string;
  name: string;
  code: string;
  address: string;
  city?: string;
  region: string;
  omc_id?: string;
  dealer_id?: string;
  manager_id?: string;
  status: 'active' | 'inactive' | 'maintenance';
  gps_coordinates?: any;
  created_at: string;
  updated_at: string;
  
  // Relations
  omc?: {
    id: string;
    name: string;
    code: string;
  };
  dealer?: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface StationCreateData {
  name: string;
  code?: string;
  address: string;
  city?: string;
  region: string;
  omc_id?: string;
  dealer_id?: string;
  manager_id?: string;
  gps_coordinates?: any;
}

export interface StationUpdateData {
  name?: string;
  address?: string;
  city?: string;
  region?: string;
  manager_id?: string;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface StationFilters {
  omc_id?: string;
  dealer_id?: string;
  region?: string;
  status?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface StationDetails {
  id: string;
  name: string;
  code: string;
  address: string;
  location: string;
  city?: string;
  region: string;
  omc_id?: string;
  omc_name?: string;
  dealer_id?: string;
  dealer_name?: string;
  manager_id?: string;
  manager_name?: string;
  status: 'active' | 'inactive' | 'maintenance';
  gps_coordinates?: any;
  compliance_status: 'compliant' | 'non_compliant' | 'under_review';
  last_inspection_date?: string;
  total_violations: number;
  total_sales: number;
  created_at: string;
  updated_at: string;
}

export interface StationPerformance {
  station_id: string;
  period: string;
  total_sales: number;
  total_volume: number;
  compliance_rate: number;
  violation_count: number;
  average_daily_sales: number;
  inventory_turnover: number;
  sales_trend: 'up' | 'down' | 'stable';
}

export interface ComplianceHistory {
  date: string;
  status: 'compliant' | 'non_compliant';
  violations_count: number;
  inspection_score?: number;
}

export interface StationDashboardData {
  station: StationDetails;
  current_inventory: any[];
  recent_sales: any[];
  active_violations: any[];
  upcoming_inspections: any[];
  performance_metrics: StationPerformance;
}

// OMC Types
export interface OMC {
  id: string;
  name: string;
  code: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
  logo_url?: string;
  brand_color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OMCCreateData {
  name: string;
  code: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
  logo_url?: string;
  brand_color?: string;
}

// Dealer Types
export interface Dealer {
  id: string;
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  omc_id?: string;
  commission_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealerCreateData {
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  omc_id?: string;
  commission_rate?: number;
  station_ids?: string[];
}

// Product Types
export interface Product {
  id: string;
  name: string;
  code: string;
  category: 'petrol' | 'diesel' | 'lpg' | 'premium_petrol' | 'other';
  unit: 'liters' | 'kilograms' | 'units';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Price Management Types
export interface StationPrice {
  id: string;
  station_id: string;
  product_id: string;
  selling_price: number;
  effective_date: string;
  omc_user_id: string;
  status: 'active' | 'pending' | 'expired';
  created_at: string;
  updated_at: string;
  station_name?: string;
  product_name?: string;
}

export interface SetPriceRequest {
  stationId: string;
  productId: string;
  sellingPrice: number;
  effectiveDate: string;
  changeReason: string;
}

export interface PricingHistory {
  id: string;
  station_id: string;
  product_id: string;
  previous_price: number | null;
  new_price: number;
  price_cap_at_time: number;
  changed_by_user_id: string;
  change_reason: string;
  created_at: string;
  station_name?: string;
  product_name?: string;
  user_name?: string;
}

export interface PriceCap {
  id: string;
  product_id: string;
  price_cap: number;
  effective_date: string;
  end_date?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  product_name?: string;
}

export interface PriceCapCreateData {
  product_id: string;
  price_cap: number;
  effective_date: string;
  end_date?: string;
  notes?: string;
}

export interface PriceFilters {
  station_id?: string;
  product_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  omc_id?: string;
}

// Violation Management Types
export interface Violation {
  id: string;
  station_id: string;
  product_id: string;
  actual_price: number;
  price_cap: number;
  litres_sold: number;
  fine_amount: number;
  violation_date: string;
  status: 'open' | 'appealed' | 'under_review' | 'resolved' | 'cancelled';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reported_by: string;
  evidence_url?: string;
  appeal_reason?: string;
  appeal_submitted_at?: string;
  appeal_submitted_by?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  station?: {
    name: string;
    code: string;
    omc_id: string;
  };
  product?: {
    name: string;
    unit: string;
  };
  reporter?: {
    full_name: string;
  };
  resolver?: {
    full_name: string;
  };
}

export interface ViolationCreateData {
  station_id: string;
  product_id: string;
  actual_price: number;
  price_cap: number;
  litres_sold: number;
  violation_date: string;
  reported_by: string;
  evidence_url?: string;
  notes?: string;
}

export interface ViolationUpdateData {
  status?: 'open' | 'appealed' | 'under_review' | 'resolved' | 'cancelled';
  fine_amount?: number;
  resolved_by?: string;
  resolved_at?: string;
  appeal_reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

export interface ViolationFilters {
  station_id?: string;
  omc_id?: string;
  status?: string;
  severity?: string;
  start_date?: string;
  end_date?: string;
  product_id?: string;
  page?: number;
  limit?: number;
}

// Sales Management Types
export interface Sale {
  id: string;
  station_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  customer_type: 'retail' | 'commercial' | 'fleet';
  attendant_id?: string;
  shift_id?: string;
  transaction_id?: string;
  status: 'completed' | 'voided' | 'refunded';
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  station?: {
    name: string;
    code: string;
    region: string;
  };
  product?: {
    name: string;
    category: string;
    unit: string;
  };
  attendant?: {
    full_name: string;
  };
}

export interface SaleCreateData {
  station_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount?: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  customer_type: 'retail' | 'commercial' | 'fleet';
  attendant_id?: string;
  shift_id?: string;
  notes?: string;
}

export interface SaleUpdateData {
  quantity?: number;
  unit_price?: number;
  total_amount?: number;
  payment_method?: string;
  customer_type?: string;
  notes?: string;
  status?: 'completed' | 'voided' | 'refunded';
}

export interface SalesSummary {
  total_sales: number;
  total_volume: number;
  average_transaction: number;
  growth_rate: number;
  transaction_count: number;
  top_products: ProductPerformance[];
  top_stations: StationPerformance[];
  daily_trends: DailySalesTrend[];
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  total_sales: number;
  total_volume: number;
  percentage: number;
}

export interface StationPerformance {
  station_id: string;
  station_name: string;
  total_sales: number;
  total_volume: number;
  percentage: number;
}

export interface DailySalesTrend {
  date: string;
  sales: number;
  volume: number;
  transactions: number;
}

export interface SalesFilters {
  station_id?: string;
  product_id?: string;
  payment_method?: string;
  customer_type?: string;
  start_date?: string;
  end_date?: string;
  attendant_id?: string;
  shift_id?: string;
  omc_id?: string;
  dealer_id?: string;
  region?: string;
  search?: string;
  status?: string;
  product_category?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface SalesFilterOptions {
  payment_methods: string[];
  customer_types: string[];
  products: Array<{ id: string; name: string }>;
  stations: Array<{ id: string; name: string }>;
  attendants: Array<{ id: string; name: string }>;
}

// Shift Management Types
export type ShiftStatus = 'active' | 'closed' | 'pending_reconciliation' | 'cancelled';
export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'premium_petrol';

export interface Shift {
  id: string;
  station_id: string;
  user_id: string;
  pump_id: string;
  fuel_type: FuelType;
  price_per_liter: number;
  start_time: string;
  end_time?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  opening_meter: number;
  closing_meter?: number;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  discrepancy?: number;
  total_sales?: number;
  total_volume?: number;
  efficiency_rate?: number;
  status: ShiftStatus;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Related data
  user?: {
    full_name: string;
    email: string;
  };
  station?: {
    name: string;
    code: string;
  };
  approver?: {
    full_name: string;
  };
}

export interface ShiftActivity {
  id: string;
  shift_id: string;
  activity_type: string;
  description: string;
  timestamp: string;
  user_id?: string;
  metadata?: any;
  user?: {
    full_name: string;
  };
}

export interface CreateShiftRequest {
  station_id: string;
  user_id: string;
  pump_id: string;
  fuel_type: FuelType;
  price_per_liter: number;
  opening_meter: number;
  opening_cash: number;
  scheduled_start?: string;
  scheduled_end?: string;
  notes?: string;
}

export interface EndShiftRequest {
  closing_meter: number;
  closing_cash: number;
  notes?: string;
}

export interface ShiftFilters {
  station_id?: string;
  user_id?: string;
  status?: ShiftStatus | 'all';
  start_date?: string;
  end_date?: string;
  pump_id?: string;
  page?: number;
  limit?: number;
}

export interface ShiftStats {
  total_shifts: number;
  active_shifts: number;
  pending_reconciliation: number;
  today_volume: number;
  today_revenue: number;
  average_efficiency: number;
  by_status: Record<ShiftStatus, number>;
  weekly_trend: { date: string; shifts: number; volume: number; revenue: number }[];
}

export interface ShiftsResponse {
  shifts: Shift[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: ShiftFilters;
  stats: ShiftStats;
}

// Notification Types
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
  
  // Related data
  creator?: {
    full_name: string;
    avatar_url?: string;
  };
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

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  user_id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  created_at: string;
}

// Settings Types
export interface UserSettings {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
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
  security: SecuritySettings;
  appearance: AppearanceSettings;
  preferences: {
    offlineMode: boolean;
    autoSync: boolean;
    dataRetention: number;
    defaultView: string;
    quickActions: string[];
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

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
  loginAlerts: boolean;
  sessionTimeout: number;
  requireReauthForSensitiveActions: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  compactMode: boolean;
  highContrast: boolean;
}

// Expense Management Types
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type ExpenseCategory = 'operational' | 'maintenance' | 'supplies' | 'utilities' | 'staff' | 'other';
export type ExpenseType = 'operational' | 'fixed' | 'staff' | 'maintenance' | 'other';

export interface Expense {
  id: string;
  station_id: string;
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  description: string;
  expense_date: string;
  status: ExpenseStatus;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  station?: {
    name: string;
    code: string;
    omc_id: string;
    dealer_id: string;
  };
  creator?: {
    full_name: string;
    email: string;
    role: string;
  };
  approver?: {
    full_name: string;
    email: string;
  };
}

export interface ExpenseCreateData {
  station_id: string;
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  description: string;
  expense_date: string;
  receipt_url?: string;
  notes?: string;
}

export interface ExpenseUpdateData {
  amount?: number;
  category?: ExpenseCategory;
  type?: ExpenseType;
  description?: string;
  status?: ExpenseStatus;
  notes?: string;
}

export interface ExpenseFilters {
  station_id?: string;
  category?: string;
  type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  user_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ExpenseStats {
  total_expenses: number;
  total_amount: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  today_expenses: number;
  today_amount: number;
  monthly_expenses: number;
  monthly_amount: number;
  average_expense: number;
  by_category: Record<string, number>;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ExpensesResponse {
  expenses: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: ExpenseFilters;
  summary: {
    total_amount: number;
    pending_amount: number;
    approved_amount: number;
  };
}

// Bank Deposit Types
export type BankDepositStatus = 'pending' | 'confirmed' | 'reconciled' | 'cancelled';

export interface BankDeposit {
  id: string;
  station_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  reference_number: string;
  deposit_date: string;
  status: BankDepositStatus;
  deposited_by: string;
  confirmed_by?: string;
  confirmed_at?: string;
  reconciled_by?: string;
  reconciled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  station?: {
    name: string;
    code: string;
    omc_id: string;
  };
  creator?: {
    full_name: string;
  };
  reconciler?: {
    full_name: string;
  };
}

export interface BankDepositCreateData {
  station_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  reference_number: string;
  deposited_by: string;
  deposit_date?: string;
  notes?: string;
}

export interface BankDepositUpdateData {
  status?: BankDepositStatus;
  notes?: string;
  reconciled_at?: string;
  confirmed_at?: string;
}

export interface BankDepositFilters {
  station_id?: string;
  status?: BankDepositStatus;
  start_date?: string;
  end_date?: string;
  reference_number?: string;
  page?: number;
  limit?: number;
}

export interface BankDepositStats {
  total_deposits: number;
  total_amount: number;
  pending_deposits: number;
  pending_amount: number;
  confirmed_deposits: number;
  confirmed_amount: number;
  reconciled_deposits: number;
  reconciled_amount: number;
  today_deposits: number;
  today_amount: number;
  monthly_deposits: number;
  monthly_amount: number;
  average_deposit: number;
  by_status: Record<string, number>;
  by_bank: Record<string, number>;
}

// Dashboard Types
export interface DashboardData {
  station: any;
  today_sales: any;
  current_inventory: any;
  active_shifts: any;
  pending_violations: any;
  performance_metrics: any;
  upcoming_tasks: any;
}

export interface AdminDashboardData {
  system_stats: any;
  recent_activities: any[];
  compliance_metrics: any;
  financial_summary: any;
  sales_analytics: SalesAnalytics;
  alerts: any[];
  performance_metrics: any;
}

export interface OMCDashboardData {
  omc: any;
  station_stats: any;
  violation_metrics: any;
  sales_performance: any;
  inventory_levels: any;
  recent_violations: any[];
  top_performers: any[];
}

export interface SalesAnalytics {
  total_sales: number;
  total_volume: number;
  transaction_count: number;
  average_transaction: number;
  growth_rate: number;
  top_products: any[];
  daily_trends: any[];
}

export interface ComplianceMetrics {
  total_violations: number;
  open_violations: number;
  critical_violations: number;
  compliance_rate: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface FinancialSummary {
  total_revenue: number;
  total_deposits: number;
  total_expenses: number;
  net_income: number;
  cash_flow: number;
}

// Bulk Operations Types
export interface BulkStationUpdate {
  station_ids: string[];
  status: 'active' | 'inactive' | 'maintenance';
}

export interface BulkUserAssignment {
  station_ids: string[];
  manager_id: string;
}

export interface BulkPriceUpdate {
  prices: Array<{
    station_id: string;
    product_id: string;
    selling_price: number;
  }>;
}

// Report Types
export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  station_id?: string;
  product_id?: string;
  omc_id?: string;
  status?: string;
  severity?: string;
  [key: string]: any;
}

export interface SalesReport {
  summary: {
    total_sales: number;
    total_volume: number;
    total_transactions: number;
    average_transaction: number;
    period: string;
  };
  by_product: Record<string, any>;
  by_station: Record<string, any>;
  daily_trends: any[];
  top_performers: {
    products: any[];
    stations: any[];
  };
}

export interface ViolationReport {
  summary: {
    total_violations: number;
    total_fines: number;
    average_fine: number;
    compliance_rate: number;
    period: string;
  };
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  by_station: Record<string, number>;
  trend_analysis: any;
  top_offenders: any[];
}

export interface InventoryReport {
  summary: {
    total_capacity: number;
    current_stock: number;
    overall_stock_percentage: number;
    low_stock_items: number;
    out_of_stock_items: number;
  };
  by_product: Record<string, any>;
  low_stock_alerts: any[];
  inventory_turnover: number;
}

export interface FinancialReport {
  summary: {
    total_revenue: number;
    total_expenses: number;
    total_deposits: number;
    net_income: number;
    cash_flow: number;
    profit_margin: number;
    period: string;
  };
  revenue_breakdown: any;
  expense_breakdown: any;
  financial_ratios: any;
  trends: any;
}

// Inventory Types
export interface TankStock {
  id: string;
  station_id: string;
  product_id: string;
  current_stock: number;
  capacity: number;
  last_updated: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  station?: {
    name: string;
    code: string;
  };
  product?: {
    name: string;
    unit: string;
  };
}

export interface Delivery {
  id: string;
  station_id: string;
  product_id: string;
  quantity: number;
  supplier: string;
  driver_name: string;
  vehicle_number?: string;
  delivery_date: string;
  received_by: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  station?: {
    name: string;
  };
  product?: {
    name: string;
  };
}

export interface DeliveryCreateData {
  station_id: string;
  product_id: string;
  quantity: number;
  supplier: string;
  driver_name: string;
  vehicle_number?: string;
  delivery_date: string;
  received_by: string;
  notes?: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
}

export interface DeliveryUpdateData {
  status?: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  notes?: string;
}

export interface Reconciliation {
  id: string;
  station_id: string;
  product_id: string;
  opening_stock: number;
  deliveries: number;
  sales: number;
  closing_stock: number;
  variance: number;
  reconciliation_date: string;
  reconciled_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  station?: {
    name: string;
  };
  product?: {
    name: string;
  };
}

export interface ReconciliationCreateData {
  station_id: string;
  product_id: string;
  opening_stock: number;
  deliveries: number;
  sales: number;
  closing_stock: number;
  notes?: string;
}

export interface DailyTankStock {
  id: string;
  station_id: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  deliveries?: number;
  sales?: number;
  variance?: number;
  stock_date: string;
  recorded_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  station?: {
    name: string;
    code: string;
  };
  product?: {
    name: string;
    unit: string;
  };
}

export interface DailyTankStockCreateData {
  station_id: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  deliveries?: number;
  sales?: number;
  variance?: number;
  stock_date: string;
  notes?: string;
}

export interface DailyTankStockUpdateData {
  opening_stock?: number;
  closing_stock?: number;
  deliveries?: number;
  sales?: number;
  variance?: number;
  notes?: string;
}

export interface DailyTankStockFilters {
  station_id?: string;
  start_date?: string;
  end_date?: string;
  product_id?: string;
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Export all types
export type {
  // Re-export for backward compatibility
  SignUpData as UserSignUpData,
  SignInData as UserSignInData,
  User as UserProfile,
  Station as FuelStation,
  Violation as ComplianceViolation,
  Sale as FuelSale,
  Shift as WorkShift,
  Notification as UserNotification,
  Expense as StationExpense,
  BankDeposit as StationDeposit
};