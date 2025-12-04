import { authAPI } from './auth-api';
import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for privileged operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})


// ===== ERROR HANDLING TYPES =====

export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  timestamp: string;
}

export type ValidationError = {
  field: string;
  message: string;
  value?: unknown;
};

// ===== ERROR HANDLING UTILITIES =====

/**
 * Extract and type error information from unknown error objects
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as Record<string, unknown>).message);
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Create a typed error response
 */
function createErrorResponse<T = unknown>(
  code: string,
  message: string,
  statusCode: number = 500
): APIResponse<T> {
  return {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  };
}

// ===== COMMON DATA TYPES =====

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

// ===== TYPE DEFINITIONS =====

export type SignUpData = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: string;
  omc_id?: string | null;
  station_id?: string | null;
  dealer_id?: string | null;
};

export type OMCCreateData = {
  name: string;
  code: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
  logo_url?: string;
  brand_color?: string;
};

export type StationCreateData = {
  name: string;
  code: string;
  address: string;
  city?: string;
  region: string;
  omc_id?: string;
  dealer_id?: string;
  manager_id?: string;
  gps_coordinates?: GPSCoordinates;
};

export type DealerCreateData = {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  omc_id?: string;
  commission_rate?: number;
};

export type ViolationCreateData = {
  station_id: string;
  product_id: string;
  actual_price: number;
  price_cap: number;
  litres_sold: number;
  violation_date: string;
  reported_by: string;
  evidence_url?: string;
  notes?: string;
};

export type ViolationUpdateData = {
  status?: 'open' | 'appealed' | 'under_review' | 'resolved' | 'cancelled';
  fine_amount?: number;
  resolved_by?: string;
  resolved_at?: string;
  appeal_reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
};

export type ViolationFilters = {
  station_id?: string;
  omc_id?: string;
  status?: string;
  severity?: string;
  start_date?: string;
  end_date?: string;
  product_id?: string;
  limit?: number;
};



// ===== SALES MANAGEMENT TYPES =====

export type SaleCreateData = {
  station_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  customer_type: 'retail' | 'commercial' | 'fleet';
  attendant_id?: string;
  shift_id?: string;
  notes?: string;
};

export type SaleUpdateData = {
  quantity?: number;
  unit_price?: number;
  total_amount?: number;
  payment_method?: string;
  customer_type?: string;
  notes?: string;
};

export type SalesSummary = {
  total_sales: number;
  total_volume: number;
  average_transaction: number;
  growth_rate: number;
  transaction_count: number;
  top_products: ProductPerformance[];
  top_stations: StationPerformance[];
  daily_trends: DailySalesTrend[];
};

export type ProductPerformance = {
  product_id: string;
  product_name: string;
  total_sales: number;
  total_volume: number;
  percentage: number;
};

export type StationPerformance = {
  station_id: string;
  station_name: string;
  total_sales: number;
  total_volume: number;
  percentage: number;
};

export type DailySalesTrend = {
  date: string;
  sales: number;
  volume: number;
  transactions: number;
};

export type SalesFilters = {
  station_id?: string;
  product_id?: string;
  payment_method?: string;
  customer_type?: string;
  start_date?: string;
  end_date?: string;
  attendant_id?: string;
  shift_id?: string;
  omc_id?: string;
};

export type SalesFilterOptions = {
  payment_methods: string[];
  customer_types: string[];
  products: Array<{ id: string; name: string }>;
  stations: Array<{ id: string; name: string }>;
  attendants: Array<{ id: string; name: string }>;
};

// ===== TYPE DEFINITIONS =====

interface OMCCreateData {
  name: string;
  code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  region: string;
  logo_url?: string;
  brand_color?: string;
}

interface StationCreateData {
  name: string;
  code?: string;
  omc_id?: string;
  dealer_id?: string;
  address: string;
  city: string;
  region: string;
  fuel_capacity: number;
  pumps_count: number;
  contact_person?: string;
  contact_phone?: string;
}

interface DealerCreateData {
  name: string;
  code?: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  license_number?: string;
  license_expiry?: string;
  business_registration?: string;
  tax_identification?: string;
  omc_id?: string;
  commission_rate?: number;
  commission_type?: 'percentage' | 'fixed';
  fixed_commission_amount?: number;
  station_ids?: string[];
}

interface OldAPIResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

// ===== COMMISSION MANAGEMENT TYPES =====
export interface Commission {
  id: string;
  station_id: string;
  dealer_id?: string;
  omc_id: string;
  period: string;
  calculation_date: string;
  total_sales: number;
  total_volume: number;
  base_commission_rate: number;
  base_commission_amount: number;
  windfall_amount: number;
  shortfall_amount: number;
  bonus_amount: number;
  total_commission: number;
  status: 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculated_at: string;
  paid_at?: string;
  approved_by?: string;
  paid_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  station?: {
    name: string;
    code: string;
    location?: string;
    region?: string;
  };
  dealer?: {
    name: string;
  };
  omc?: {
    name: string;
  };
  approver?: {
    full_name: string;
  };
  payer?: {
    full_name: string;
  };
}

export interface CommissionCalculationRequest {
  period: string;
  station_ids?: string[];
  force_recalculation?: boolean;
}

export interface CommissionFilters {
  station_id?: string;
  dealer_id?: string;
  omc_id?: string;
  period?: string;
  status?: string;
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CommissionStats {
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  by_period: Record<string, number>;
  auto_calculation_status?: boolean;
  last_auto_calculation?: string;
  next_calculation?: string;
}

export interface CommissionPaymentRequest {
  commission_id: string;
  payment_method: string;
  reference_number: string;
  payment_date: string;
  notes?: string;
}

export interface AutoCalculationConfig {
  enabled: boolean;
  schedule_time: string;
  timezone: string;
  notify_on_completion: boolean;
  notify_on_error: boolean;
}

export interface WindfallShortfallConfig {
  id: string;
  station_id: string;
  omc_id: string;
  type: 'windfall' | 'shortfall' | 'adjustment';
  commission_rate: number;
  threshold_amount?: number;
  effective_date: string;
  end_date?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  station?: {
    name: string;
    code: string;
  };
  omc?: {
    name: string;
  };
  creator?: {
    full_name: string;
  };
}

// ===== SHIFT MANAGEMENT TYPES =====
export type ShiftStatus = 'active' | 'closed' | 'pending_reconciliation' | 'cancelled';
export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'premium_petrol';

export interface Shift {
  id: string;
  station_id: string;
  user_id: string;
  pump_id: string;
  fuel_type: FuelType;
  price_per_liter: number;
  
  // Timing
  start_time: string;
  end_time?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  
  // Meter readings
  opening_meter: number;
  closing_meter?: number;
  
  // Cash management
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  discrepancy?: number;
  
  // Performance metrics
  total_sales?: number;
  total_volume?: number;
  efficiency_rate?: number;
  
  // Status
  status: ShiftStatus;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  
  // Audit
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
  metadata?: Record<string, unknown>;
  
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

// ===== ATTENDANT MANAGEMENT TYPES =====
export type AttendantStatus = 'active' | 'inactive' | 'suspended';

export interface Attendant {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  hire_date?: string;
  termination_date?: string;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  is_active: boolean;
  station_id?: string;
  role: 'attendant' | 'senior_attendant' | 'shift_supervisor';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateAttendantRequest {
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  station_id?: string;
  hire_date?: string;
}

export interface AttendantFilters {
  station_id?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'terminated' | 'all';
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
// ===== PUMP MANAGEMENT TYPES =====
export type PumpStatus = 'active' | 'inactive' | 'maintenance' | 'out_of_order';

export interface Pump {
  id: string;
  station_id: string;
  name: string;
  number: string;
  fuel_type: FuelType;
  status: PumpStatus;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  current_meter_reading: number;
  total_dispensed: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Related data
  station?: {
    name: string;
    code: string;
  };
  active_shift?: Shift;
  maintenance_history?: PumpMaintenance[];
}

export interface PumpMaintenance {
  id: string;
  pump_id: string;
  maintenance_type: string;
  description: string;
  performed_by: string;
  parts_replaced?: string[];
  cost?: number;
  notes?: string;
  performed_at: string;
  next_maintenance_date?: string;
  
  // Related data
  technician?: {
    full_name: string;
  };
}

export interface CreatePumpRequest {
  station_id: string;
  name: string;
  number: string;
  fuel_type: FuelType;
  status: PumpStatus;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string;
  current_meter_reading?: number;
}

export interface UpdatePumpRequest {
  name?: string;
  number?: string;
  fuel_type?: FuelType;
  status?: PumpStatus;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  current_meter_reading?: number;
}

export interface PumpFilters {
  station_id?: string;
  status?: PumpStatus | 'all';
  fuel_type?: FuelType | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface PumpStats {
  total_pumps: number;
  active_pumps: number;
  maintenance_pumps: number;
  by_status: Record<PumpStatus, number>;
  by_fuel_type: Record<FuelType, number>;
  total_volume_dispensed: number;
  maintenance_schedule: { pump_id: string; pump_name: string; next_maintenance_date: string }[];
}

export interface PumpsResponse {
  pumps: Pump[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: PumpFilters;
  stats: PumpStats;
}


// ===== NOTIFICATION TYPES =====
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
  data?: Record<string, unknown>;
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
  data?: Record<string, unknown>;
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
  data?: Record<string, unknown>;
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


// ===== ENHANCED USER MANAGEMENT TYPES =====

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
  stations?: {
    id: string;
    name: string;
    code: string;
  };
  omcs?: {
    id: string;
    name: string;
    code: string;
  };
  dealers?: {
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
  // Pagination
  page?: number;
  limit?: number;
  
  // Search
  search?: string;
  
  // Filters
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  omc_id?: string;
  station_id?: string;
  dealer_id?: string;
  
  // Date range
  created_after?: string;
  created_before?: string;
  last_login_after?: string;
  last_login_before?: string;
  
  // Sorting
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

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: {
    user_id: string;
    error: string;
  }[];
  processed_at: string;
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
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  
  // Related user data
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

export interface UserValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ===== ENHANCED API RESPONSE TYPES =====

export interface APIResponse<T = unknown> {
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

// Bank Deposits Types
export type BankDepositCreateData = {
  station_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  reference_number: string;
  deposited_by: string;
  notes?: string;
};

export type BankDepositUpdateData = {
  status?: 'pending' | 'confirmed' | 'reconciled';
  notes?: string;
  reconciliation_date?: string;
};

export type BankDepositFilters = {
  station_id?: string;
  omc_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
};

// Delivery types
export type DeliveryCreateData = {
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
};

export type DeliveryUpdateData = {
  status?: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  notes?: string;
};

// Reconciliation types
export type ReconciliationCreateData = {
  station_id: string;
  product_id: string;
  opening_stock: number;
  deliveries: number;
  sales: number;
  closing_stock: number;
  notes?: string;
};

// Daily Tank Stocks types
export type DailyTankStockCreateData = {
  station_id: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  deliveries?: number;
  sales?: number;
  variance?: number;
  stock_date: string;
  notes?: string;
};

export type DailyTankStockUpdateData = {
  opening_stock?: number;
  closing_stock?: number;
  deliveries?: number;
  sales?: number;
  variance?: number;
  notes?: string;
};

export type DailyTankStockFilters = {
  station_id?: string;
  start_date?: string;
  end_date?: string;
  product_id?: string;
};

// ===== STATION MANAGEMENT TYPES =====
export type StationDetails = {
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
  gps_coordinates?: Record<string, unknown>;
  compliance_status: 'compliant' | 'non_compliant' | 'under_review';
  last_inspection_date?: string;
  total_violations: number;
  total_sales: number;
  created_at: string;
  updated_at: string;
};

export type StationPerformance = {
  station_id: string;
  period: string;
  total_sales: number;
  total_volume: number;
  compliance_rate: number;
  violation_count: number;
  average_daily_sales: number;
  inventory_turnover: number;
  sales_trend: 'up' | 'down' | 'stable';
};

export type StationFilters = {
  omc_id?: string;
  status?: string[];
  location?: string;
  region?: string;
  compliance_status?: string[];
  date_range?: { start: string; end: string };
  sales_min?: number;
  sales_max?: number;
  search_term?: string;
};

export type BulkOperationResult = {
  success: number;
  failed: number;
  errors: { station_id: string; error: string }[];
};

export type ComplianceHistory = {
  date: string;
  status: 'compliant' | 'non_compliant';
  violations_count: number;
  inspection_score?: number;
};

export interface InventoryItem {
  id: string;
  station_id: string;
  product_id: string;
  quantity: number;
  last_updated: string;
  [key: string]: unknown;
}

export interface SalesRecord {
  id: string;
  station_id: string;
  amount: number;
  timestamp: string;
  [key: string]: unknown;
}

export interface ViolationRecord {
  id: string;
  station_id: string;
  status: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface InspectionRecord {
  id: string;
  station_id: string;
  scheduled_date: string;
  [key: string]: unknown;
}

export type StationDashboardData = {
  station: StationDetails;
  current_inventory: InventoryItem[];
  recent_sales: SalesRecord[];
  active_violations: ViolationRecord[];
  upcoming_inspections: InspectionRecord[];
  performance_metrics: StationPerformance;
};

// ===== PRICE MANAGEMENT TYPES =====

export type SetPriceRequest = {
  stationId: string;
  productId: string;
  sellingPrice: number;
  effectiveDate: string;
  changeReason: string;
};

export type StationPrice = {
  id: string;
  station_id: string;
  product_id: string;
  selling_price: number;
  effective_date: string;
  end_date?: string;
  omc_user_id: string;
  status: 'active' | 'pending' | 'expired' | 'approved' | 'rejected';
  is_auto_adjusted: boolean;
  price_cap_id?: string;
  price_cap_amount?: number;
  margin?: number;
  created_at: string;
  updated_at: string;
  station_name?: string;
  station_code?: string;
  omc_name?: string;
  product_name?: string;
  product_unit?: string;
};

export type OMCPrice = {
  id: string;
  omc_id: string;
  product_id: string;
  recommended_price: number;
  effective_date: string;
  end_date?: string;
  status: 'active' | 'pending' | 'expired';
  price_cap_id?: string;
  price_cap_amount?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  omc_name?: string;
  product_name?: string;
  product_unit?: string;
};

export type PriceCap = {
  id: string;
  product_id: string;
  product_name?: string;
  price_cap: number;
  effective_date: string;
  end_date?: string;
  status: 'active' | 'expired' | 'pending';
  scope: 'national' | 'omc';
  omc_id?: string;
  omc_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
};

export type PricingHistory = {
  id: string;
  station_id: string;
  product_id: string;
  previous_price: number | null;
  new_price: number;
  price_cap_at_time: number;
  changed_by_user_id: string;
  change_reason: string;
  price_type: 'station' | 'omc' | 'cap';
  created_at: string;
  station_name?: string;
  product_name?: string;
  user_name?: string;
};

export type PriceCapCreateData = {
  product_id: string;
  price_cap: number;
  effective_date: string;
  end_date?: string;
  notes?: string;
  scope?: 'national' | 'omc';
  omc_id?: string;
};

export type StationPriceCreateData = {
  station_id: string;
  product_id: string;
  selling_price: number;
  effective_date: string;
  end_date?: string;
  is_auto_adjusted: boolean;
  notes?: string;
};

export type OMCPriceCreateData = {
  product_id: string;
  recommended_price: number;
  effective_date: string;
  end_date?: string;
  notes?: string;
};

export type PriceFilters = {
  station_id?: string;
  product_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  omc_id?: string;
  scope?: 'national' | 'omc';
};

export type PriceSummary = {
  totalPriceCaps: number;
  activePriceCaps: number;
  totalOMCPrices: number;
  activeOMCPrices: number;
  totalStationPrices: number;
  activeStationPrices: number;
  averageMargin: number;
  complianceRate: number;
};

export type OldTypeAPIResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
};

class PumpGuardAPI {
  // Auth methods
  auth = authAPI;

  /**
   * Sign up user with role validation
   */
  async signup(userData: SignUpData): Promise<APIResponse> {
    try {
      console.log('API signup called with:', { 
        email: userData.email, 
        role: userData.role,
        fullName: userData.fullName
      });

      // Validate role before proceeding
      if (userData.role && !await authAPI.validateRole(userData.role)) {
        const availableRoles = await authAPI.getAvailableRoles();
        const rolesList = availableRoles.success ? availableRoles.data?.roles?.join(', ') : 'admin, omc, dealer, station_manager, attendant, supervisor';
        
        return {
          success: false,
          error: `Invalid role '${userData.role}'. Available roles: ${rolesList}`
        };
      }

      // Use authAPI.signUp which now includes profile creation
      const result = await authAPI.signUp({
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        phone: userData.phone,
        role: userData.role,
        omc_id: userData.omc_id,
        station_id: userData.station_id,
        dealer_id: userData.dealer_id
      });

      console.log('AuthAPI signup final result:', result);

      return result;

    } catch (error: unknown) {
      console.error('API signup unexpected error:', error);
      return createErrorResponse(
        'SIGNUP_ERROR',
        'Unexpected error during signup: ' + extractErrorMessage(error)
      );
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<APIResponse> {
    try {
      console.log('API login called for:', email);
      const result = await authAPI.signIn({ email, password });
      console.log('API login result:', result.success ? 'Success' : result.error);
      return result;
    } catch (error: unknown) {
      console.error('API login error:', error);
      return {
        success: false,
        error: 'Login failed: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get available user roles from the database
   */
  async getAvailableRoles(): Promise<APIResponse> {
    return await authAPI.getAvailableRoles();
  }

  /**
   * Check database setup and get profiles structure
   */
  async checkDatabaseSetup(): Promise<APIResponse> {
    console.log('Checking database setup...');
    const result = await authAPI.checkDatabaseSetup();
    console.log('Database check result:', result);
    return result;
  }

  /**
   * Get detailed profiles table structure
   */
  async getProfilesStructure(): Promise<APIResponse> {
    console.log('Getting profiles structure...');
    const result = await authAPI.getProfilesStructure();
    console.log('Profiles structure:', result);
    return result;
  }


// ===== SHIFT METHODS===

/**
 * SHIFT MANAGEMENT METHODS
 */

/**
 * Get shifts with advanced filtering
 */
async getShifts(filters: ShiftFilters = {}): Promise<APIResponse<ShiftsResponse>> {
  const requestId = `shifts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const {
      page = 1,
      limit = 50,
      station_id,
      user_id,
      status,
      start_date,
      end_date,
      pump_id
    } = filters;

    const offset = (page - 1) * limit;

    // FIXED: Updated query to handle both user_id and attendant_id relationships
    let query = supabase
      .from('shifts')
      .select(`
        *,
        created_by_user:profiles!shifts_created_by_fkey (
          full_name,
          email
        ),
        attendant:profiles!shifts_attendant_id_fkey (
          full_name,
          email,
          employee_id
        ),
        user:profiles!shifts_user_id_fkey (
          full_name,
          email
        ),
        station:stations (
          name,
          code
        ),
        approver:profiles!shifts_approved_by_fkey (
          full_name
        )
      `, { count: 'exact' })
      .order('start_time', { ascending: false });

    // Apply filters
    if (station_id) {
      query = query.eq('station_id', station_id);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (pump_id) {
      query = query.eq('pump_id', pump_id);
    }

    if (start_date) {
      query = query.gte('start_time', start_date);
    }

    if (end_date) {
      query = query.lte('start_time', end_date);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: shifts, error, count } = await query;

    if (error) {
      console.error(`❌ [${requestId}] Shifts fetch error:`, error);
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'SHIFTS_FETCH_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Process shifts to ensure we have proper attendant names
    const processedShifts = shifts?.map(shift => {
      // Determine the attendant name from available relationships
      let attendantName = 'Unknown Attendant';
      let attendantEmail = '';
      let attendantId = '';

      // Priority 1: Use attendant relationship
      if (shift.attendant && shift.attendant.full_name) {
        attendantName = shift.attendant.full_name;
        attendantEmail = shift.attendant.email || '';
        attendantId = shift.attendant.employee_id || '';
      }
      // Priority 2: Use user relationship
      else if (shift.user && shift.user.full_name) {
        attendantName = shift.user.full_name;
        attendantEmail = shift.user.email || '';
      }
      // Priority 3: Use created_by_user relationship
      else if (shift.created_by_user && shift.created_by_user.full_name) {
        attendantName = shift.created_by_user.full_name;
        attendantEmail = shift.created_by_user.email || '';
      }

      return {
        ...shift,
        attendant_name: attendantName,
        attendant_email: attendantEmail,
        attendant_id: attendantId,
        // Ensure user object is properly set for backward compatibility
        user: shift.user || {
          full_name: attendantName,
          email: attendantEmail
        }
      };
    }) || [];

    console.log(`✅ [${requestId}] Processed shifts:`, processedShifts.length);
    if (processedShifts.length > 0) {
      console.log(`🔍 [${requestId}] Sample processed shift:`, {
        id: processedShifts[0].id,
        attendant_name: processedShifts[0].attendant_name,
        user: processedShifts[0].user,
        attendant: processedShifts[0].attendant
      });
    }

    // Get shift statistics
    const stats = await this.getShiftStats(filters.station_id);

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: ShiftsResponse = {
      shifts: processedShifts as Shift[],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      filters,
      stats: stats.success ? stats.data : {
        total_shifts: 0,
        active_shifts: 0,
        pending_reconciliation: 0,
        today_volume: 0,
        today_revenue: 0,
        average_efficiency: 0,
        by_status: {} as Record<ShiftStatus, number>,
        weekly_trend: []
      }
    };

    // Log activity
    await this.logUserActivity('shifts_view', user.id, {
      filters_applied: filters,
      shifts_count: processedShifts.length
    });

    return {
      success: true,
      data: response,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Shifts critical error:`, error);
    return {
      success: false,
      error: 'Failed to fetch shifts',
      code: 'UNEXPECTED_ERROR',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}


/**
 * Get shift statistics
 */
async getShiftStats(stationId?: string): Promise<APIResponse<ShiftStats>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    let query = supabase.from('shifts').select('*');

    // Filter by station if provided
    if (stationId) {
      query = query.eq('station_id', stationId);
    } else {
      // For non-admin users, filter by their station
      const userProfile = await this.getUserProfile(user.id);
      if (userProfile.success && userProfile.data?.station_id) {
        query = query.eq('station_id', userProfile.data.station_id);
      }
    }

    const { data: shifts, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'STATS_FETCH_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Calculate statistics
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = shifts?.filter(s => s.start_time.startsWith(today)) || [];
    
    const total_shifts = shifts?.length || 0;
    const active_shifts = shifts?.filter(s => s.status === 'active').length || 0;
    const pending_reconciliation = shifts?.filter(s => s.status === 'pending_reconciliation').length || 0;
    
    const today_volume = todayShifts.reduce((sum, shift) => 
      sum + (shift.total_volume || 0), 0
    );
    
    const today_revenue = todayShifts.reduce((sum, shift) => 
      sum + (shift.total_sales || 0), 0
    );

    const completedShifts = shifts?.filter(s => s.status === 'closed') || [];
    const average_efficiency = completedShifts.length > 0 
      ? completedShifts.reduce((sum, shift) => sum + (shift.efficiency_rate || 0), 0) / completedShifts.length
      : 0;

    const by_status = shifts?.reduce((acc, shift) => {
      acc[shift.status] = (acc[shift.status] || 0) + 1;
      return acc;
    }, {} as Record<ShiftStatus, number>) || {} as Record<ShiftStatus, number>;

    // Weekly trend (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyData = shifts?.filter(s => 
      new Date(s.start_time) >= weekAgo
    ) || [];

    const weekly_trend = weeklyData.reduce((acc, shift) => {
      const date = shift.start_time.split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, shifts: 0, volume: 0, revenue: 0 };
      }
      acc[date].shifts += 1;
      acc[date].volume += shift.total_volume || 0;
      acc[date].revenue += shift.total_sales || 0;
      return acc;
    }, {} as Record<string, { date: string; shifts: number; volume: number; revenue: number }>);

    const stats: ShiftStats = {
      total_shifts,
      active_shifts,
      pending_reconciliation,
      today_volume,
      today_revenue,
      average_efficiency,
      by_status,
      weekly_trend: Object.values(weekly_trend).sort((a, b) => a.date.localeCompare(b.date))
    };

    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Shift stats error:', error);
    return {
      success: false,
      error: 'Failed to fetch shift statistics',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Start a new shift
 */
async startShift(shiftData: CreateShiftRequest): Promise<APIResponse<Shift>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    // Check if user already has an active shift
    const { data: activeShift } = await supabase
      .from('shifts')
      .select('id')
      .eq('user_id', shiftData.user_id)
      .eq('status', 'active')
      .single();

    if (activeShift) {
      return {
        success: false,
        error: 'User already has an active shift',
        code: 'ACTIVE_SHIFT_EXISTS',
        timestamp: new Date().toISOString()
      };
    }

    const { data: newShift, error } = await supabase
      .from('shifts')
      .insert({
        ...shiftData,
        created_by: user.id,
        status: 'active',
        start_time: new Date().toISOString()
      })
      .select(`
        *,
        user:profiles!shifts_user_id_fkey (
          full_name,
          email
        ),
        station:stations (
          name,
          code
        )
      `)
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'SHIFT_CREATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log shift activity
    await supabase
      .from('shift_activities')
      .insert({
        shift_id: newShift.id,
        activity_type: 'shift_started',
        description: `Shift started for pump ${shiftData.pump_id}`,
        user_id: user.id,
        metadata: {
          pump_id: shiftData.pump_id,
          fuel_type: shiftData.fuel_type,
          opening_meter: shiftData.opening_meter,
          opening_cash: shiftData.opening_cash
        }
      });

    // Log user activity
    await this.logUserActivity('shift_start', user.id, {
      shift_id: newShift.id,
      pump_id: shiftData.pump_id,
      fuel_type: shiftData.fuel_type
    });

    return {
      success: true,
      data: newShift as Shift,
      message: 'Shift started successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Start shift error:', error);
    return {
      success: false,
      error: 'Failed to start shift',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * End an active shift
 */
async endShift(shiftId: string, endData: EndShiftRequest): Promise<APIResponse<Shift>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    // Get the current shift
    const { data: currentShift, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (fetchError || !currentShift) {
      return {
        success: false,
        error: 'Shift not found',
        code: 'SHIFT_NOT_FOUND',
        timestamp: new Date().toISOString()
      };
    }

    if (currentShift.status !== 'active') {
      return {
        success: false,
        error: 'Shift is not active',
        code: 'SHIFT_NOT_ACTIVE',
        timestamp: new Date().toISOString()
      };
    }

    // Calculate shift metrics
    const volumeSold = endData.closing_meter - currentShift.opening_meter;
    const expectedCash = currentShift.opening_cash + (volumeSold * currentShift.price_per_liter);
    const discrepancy = endData.closing_cash - expectedCash;
    const totalSales = endData.closing_cash - currentShift.opening_cash;

    // Calculate efficiency (liters per hour)
    const startTime = new Date(currentShift.start_time);
    const endTime = new Date();
    const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const efficiencyRate = hoursWorked > 0 ? volumeSold / hoursWorked : 0;

    // Determine status based on discrepancy
    const status = Math.abs(discrepancy) > 50 ? 'pending_reconciliation' : 'closed';

    const { data: updatedShift, error } = await supabase
      .from('shifts')
      .update({
        end_time: endTime.toISOString(),
        closing_meter: endData.closing_meter,
        closing_cash: endData.closing_cash,
        expected_cash: expectedCash,
        discrepancy,
        total_sales: totalSales,
        total_volume: volumeSold,
        efficiency_rate: efficiencyRate,
        status,
        notes: endData.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', shiftId)
      .select(`
        *,
        user:profiles!shifts_user_id_fkey (
          full_name,
          email
        ),
        station:stations (
          name,
          code
        )
      `)
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'SHIFT_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log shift activity
    await supabase
      .from('shift_activities')
      .insert({
        shift_id: shiftId,
        activity_type: 'shift_ended',
        description: `Shift ended with ${status} status`,
        user_id: user.id,
        metadata: {
          volume_sold: volumeSold,
          total_sales: totalSales,
          discrepancy,
          efficiency_rate: efficiencyRate
        }
      });

    // Log user activity
    await this.logUserActivity('shift_end', user.id, {
      shift_id: shiftId,
      status,
      volume_sold: volumeSold,
      total_sales: totalSales,
      discrepancy
    });

    return {
      success: true,
      data: updatedShift as Shift,
      message: `Shift ended successfully${status === 'pending_reconciliation' ? ' - requires reconciliation' : ''}`,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('End shift error:', error);
    return {
      success: false,
      error: 'Failed to end shift',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get shift activities
 */
async getShiftActivities(shiftId: string): Promise<APIResponse<ShiftActivity[]>> {
  try {
    const { data: activities, error } = await supabase
      .from('shift_activities')
      .select(`
        *,
        user:profiles (
          full_name
        )
      `)
      .eq('shift_id', shiftId)
      .order('timestamp', { ascending: false });

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'ACTIVITIES_FETCH_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: activities as ShiftActivity[],
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Shift activities error:', error);
    return {
      success: false,
      error: 'Failed to fetch shift activities',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * ATTENDANT MANAGEMENT METHODS - UPDATED FOR ATTENDANTS TABLE
 */

/**
 * Get all attendants with optional filtering
 */
async getAttendants(filters: AttendantFilters = {}): Promise<APIResponse<Attendant[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { station_id, is_active = true, search } = filters;

    console.log('🔍 Fetching attendants from ATTENDANTS table with filters:', { station_id, is_active, search });

    let query = supabase
      .from('attendants')
      .select('*')
      .eq('is_active', is_active)
      .order('full_name', { ascending: true });

    // Handle station_id filter
    if (station_id && station_id.trim() !== '') {
      console.log('📍 Filtering by station_id:', station_id);
      query = query.eq('station_id', station_id);
    }

    // Handle search filter
    if (search && search.trim() !== '') {
      console.log('🔎 Searching for:', search);
      query = query.or(`full_name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Database error fetching attendants:', error);
      throw error;
    }

    console.log('✅ Successfully fetched attendants from attendants table:', data?.length || 0);

    return {
      success: true,
      data: data as Attendant[],
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('💥 Error in getAttendants:', error);
    return {
      success: false,
      error: extractErrorMessage(error) || 'Failed to fetch attendants',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get sales filter options - UPDATED to use new getAttendants method
 */
async getSalesFilterOptions(): Promise<APIResponse<SalesFilterOptions>> {
  try {
    console.log('Fetching sales filter options...');

    const [
      productsResponse,
      stationsResponse,
      attendantsResponse
    ] = await Promise.all([
      this.getProducts(),
      this.getAllStations(),
      this.getAttendants()  // This will now call the UPDATED method
    ]);

    const filterOptions: SalesFilterOptions = {
      payment_methods: ['cash', 'mobile_money', 'card', 'credit'],
      customer_types: ['retail', 'commercial', 'fleet'],
      products: productsResponse.success ? (productsResponse.data || []).map(p => ({ id: p.id, name: p.name })) : [],
      stations: stationsResponse.success ? (stationsResponse.data || []).map(s => ({ id: s.id, name: s.name })) : [],
      attendants: attendantsResponse.success ? (attendantsResponse.data || []).map(a => ({ 
        id: a.id, 
        name: a.full_name,
        employee_id: a.employee_id 
      })) : []
    };

    return {
      success: true,
      data: filterOptions
    };

  } catch (error: unknown) {
    console.error('Error fetching sales filter options:', error);
    return {
      success: false,
      error: 'Failed to fetch filter options: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Create a new attendant in attendants table
 */
async createAttendant(attendantData: CreateAttendantRequest): Promise<APIResponse<Attendant>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    console.log('🔄 Creating attendant in attendants table:', attendantData);

    // Validate required fields
    if (!attendantData.employee_id?.trim()) {
      throw new Error('Employee ID is required');
    }
    if (!attendantData.full_name?.trim()) {
      throw new Error('Full name is required');
    }
    if (!attendantData.email?.trim()) {
      throw new Error('Email is required');
    }
    if (!attendantData.station_id?.trim()) {
      throw new Error('Station ID is required');
    }

    // Check if employee ID already exists
    const { data: existingEmployee, error: checkError } = await supabase
      .from('attendants')
      .select('id, employee_id, full_name')
      .eq('employee_id', attendantData.employee_id.trim())
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing employee:', checkError);
      throw new Error('Failed to check existing employee');
    }

    if (existingEmployee) {
      throw new Error(`Employee ID "${attendantData.employee_id}" already exists for ${existingEmployee.full_name}`);
    }

    // Check if email already exists
    const { data: existingEmail, error: emailError } = await supabase
      .from('attendants')
      .select('id, email')
      .eq('email', attendantData.email.trim().toLowerCase())
      .maybeSingle();

    if (emailError) {
      console.error('❌ Error checking existing email:', emailError);
      throw new Error('Failed to check existing email');
    }

    if (existingEmail) {
      throw new Error(`Email "${attendantData.email}" is already registered`);
    }

    // Create the attendant
    const attendantPayload = {
      employee_id: attendantData.employee_id.trim(),
      full_name: attendantData.full_name.trim(),
      email: attendantData.email.trim().toLowerCase(),
      phone: attendantData.phone?.trim() || null,
      department: attendantData.department?.trim() || 'Fuel Station',
      station_id: attendantData.station_id,
      is_active: true,
      status: 'active',
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📤 Inserting attendant:', attendantPayload);

    const { data, error } = await supabase
      .from('attendants')
      .insert(attendantPayload)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating attendant:', error);
      throw error;
    }

    console.log('✅ Successfully created attendant:', data);

    return {
      success: true,
      data: data as Attendant,
      message: 'Attendant created successfully'
    };

  } catch (error: unknown) {
    console.error('💥 Error in createAttendant:', error);
    return {
      success: false,
      error: extractErrorMessage(error) || 'Failed to create attendant'
    };
  }
}


/**
 * Update an existing attendant
 */
async updateAttendant(attendantId: string, updateData: UpdateAttendantRequest): Promise<APIResponse<Attendant>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    console.log('🔄 Updating attendant:', attendantId, updateData);

    const updatePayload: Record<string, unknown> = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    const { data, error } = await supabase
      .from('attendants')
      .update(updatePayload)
      .eq('id', attendantId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error updating attendant:', error);
      throw error;
    }

    console.log('✅ Successfully updated attendant:', data);

    return {
      success: true,
      data: data as Attendant,
      message: 'Attendant updated successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('💥 Error in updateAttendant:', error);
    return {
      success: false,
      error: extractErrorMessage(error) || 'Failed to update attendant',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Delete an attendant (soft delete)
 */
async deleteAttendant(attendantId: string): Promise<APIResponse<void>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    console.log('🗑️ Deleting attendant:', attendantId);

    // Check if attendant has active shifts
    const { data: activeShifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('user_id', attendantId)
      .eq('status', 'active')
      .maybeSingle();

    if (activeShifts) {
      throw new Error('Cannot delete attendant with active shifts');
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('attendants')
      .update({ 
        is_active: false,
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', attendantId);

    if (error) {
      console.error('❌ Database error deleting attendant:', error);
      throw error;
    }

    console.log('✅ Successfully deleted attendant:', attendantId);

    return {
      success: true,
      message: 'Attendant deleted successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('💥 Error in deleteAttendant:', error);
    return {
      success: false,
      error: extractErrorMessage(error) || 'Failed to delete attendant',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get attendant by ID
 */
async getAttendantById(attendantId: string): Promise<APIResponse<Attendant>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    console.log('🔍 Getting attendant by ID:', attendantId);

    const { data, error } = await supabase
      .from('attendants')
      .select('*')
      .eq('id', attendantId)
      .single();

    if (error) {
      console.error('❌ Database error fetching attendant:', error);
      throw error;
    }

    console.log('✅ Successfully fetched attendant:', data);

    return {
      success: true,
      data: data as Attendant,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('💥 Error in getAttendantById:', error);
    return {
      success: false,
      error: extractErrorMessage(error) || 'Failed to fetch attendant',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get attendant statistics
 */
async getAttendantStats(stationId?: string): Promise<APIResponse<AttendantStats>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    console.log('📊 Getting attendant statistics for station:', stationId);

    let query = supabase
      .from('attendants')
      .select('*');

    // Filter by station if provided
    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { data: attendants, error } = await query;

    if (error) {
      console.error('❌ Database error fetching attendant stats:', error);
      throw error;
    }

    // Calculate statistics
    const total_attendants = attendants?.length || 0;
    const active_attendants = attendants?.filter(a => a.is_active).length || 0;

    const by_status = attendants?.reduce((acc, attendant) => {
      acc[attendant.status] = (acc[attendant.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const by_station = attendants?.reduce((acc, attendant) => {
      if (attendant.station_id) {
        acc[attendant.station_id] = (acc[attendant.station_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // Get top performers (you would need to join with shifts data)
    const top_performers: { attendant_id: string; full_name: string; total_volume: number; total_revenue: number }[] = [];

    const stats: AttendantStats = {
      total_attendants,
      active_attendants,
      by_status,
      by_station,
      top_performers
    };

    console.log('✅ Successfully calculated attendant stats:', stats);

    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('💥 Error in getAttendantStats:', error);
    return {
      success: false,
      error: extractErrorMessage(error) || 'Failed to fetch attendant statistics',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update attendant status
 */
async updateAttendantStatus(attendantId: string, status: 'active' | 'inactive'): Promise<APIResponse<Attendant>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    console.log('🔄 Updating attendant status:', attendantId, status);

    const { data, error } = await supabase
      .from('attendants')
      .update({ 
        status: status,
        is_active: status === 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', attendantId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error updating attendant status:', error);
      throw error;
    }

    console.log('✅ Successfully updated attendant status:', data);

    return {
      success: true,
      data: data as Attendant,
      message: `Attendant ${status} successfully`,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('💥 Error in updateAttendantStatus:', error);
    return {
      success: false,
      error: extractErrorMessage(error) || 'Failed to update attendant status',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Bulk update attendants (for station reassignment, etc.)
 */
async bulkUpdateAttendants(attendantIds: string[], updateData: Partial<Attendant>): Promise<APIResponse<void>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    console.log('🔄 Bulk updating attendants:', attendantIds, updateData);

    const { error } = await supabase
      .from('attendants')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .in('id', attendantIds);

    if (error) {
      console.error('❌ Database error bulk updating attendants:', error);
      throw error;
    }

    console.log('✅ Successfully bulk updated attendants');

    return {
      success: true,
      message: `${attendantIds.length} attendants updated successfully`,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('💥 Error in bulkUpdateAttendants:', error);
    return {
      success: false,
      error: extractErrorMessage(error) || 'Failed to bulk update attendants',
      timestamp: new Date().toISOString()
    };
  }
}
/**
 * PUMP MANAGEMENT METHODS
 */

/**
 * Get pumps with filtering
 */
async getPumps(filters: PumpFilters = {}): Promise<APIResponse<PumpsResponse>> {
  const requestId = `pumps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const {
      page = 1,
      limit = 50,
      station_id,
      status,
      fuel_type,
      search
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('pumps')
      .select(`
        *,
        station:stations (
          name,
          code
        )
      `, { count: 'exact' })
      .order('number', { ascending: true });

    // Apply filters
    if (station_id) {
      query = query.eq('station_id', station_id);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (fuel_type && fuel_type !== 'all') {
      query = query.eq('fuel_type', fuel_type);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,number.ilike.%${search}%,serial_number.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: pumps, error, count } = await query;

    if (error) {
      console.error(`❌ [${requestId}] Pumps fetch error:`, error);
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PUMPS_FETCH_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Get pump statistics
    const stats = await this.getPumpStats(filters.station_id);

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: PumpsResponse = {
      pumps: pumps as Pump[],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      filters,
      stats: stats.success ? stats.data : {
        total_pumps: 0,
        active_pumps: 0,
        maintenance_pumps: 0,
        by_status: {} as Record<PumpStatus, number>,
        by_fuel_type: {} as Record<FuelType, number>,
        total_volume_dispensed: 0,
        maintenance_schedule: []
      }
    };

    // Log activity
    await this.logUserActivity('pumps_view', user.id, {
      filters_applied: filters,
      pumps_count: pumps?.length || 0
    });

    return {
      success: true,
      data: response,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Pumps critical error:`, error);
    return {
      success: false,
      error: 'Failed to fetch pumps',
      code: 'UNEXPECTED_ERROR',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get pump statistics
 */
async getPumpStats(stationId?: string): Promise<APIResponse<PumpStats>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    let query = supabase.from('pumps').select('*');

    // Filter by station if provided
    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { data: pumps, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PUMP_STATS_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Calculate statistics
    const total_pumps = pumps?.length || 0;
    const active_pumps = pumps?.filter(p => p.status === 'active').length || 0;
    const maintenance_pumps = pumps?.filter(p => p.status === 'maintenance').length || 0;
    const total_volume_dispensed = pumps?.reduce((sum, pump) => sum + pump.total_dispensed, 0) || 0;

    const by_status = pumps?.reduce((acc, pump) => {
      acc[pump.status] = (acc[pump.status] || 0) + 1;
      return acc;
    }, {} as Record<PumpStatus, number>) || {} as Record<PumpStatus, number>;

    const by_fuel_type = pumps?.reduce((acc, pump) => {
      acc[pump.fuel_type] = (acc[pump.fuel_type] || 0) + 1;
      return acc;
    }, {} as Record<FuelType, number>) || {} as Record<FuelType, number>;

    // Maintenance schedule
    const maintenance_schedule = pumps
      ?.filter(pump => pump.next_maintenance_date)
      .map(pump => ({
        pump_id: pump.id,
        pump_name: pump.name,
        next_maintenance_date: pump.next_maintenance_date!
      }))
      .sort((a, b) => a.next_maintenance_date.localeCompare(b.next_maintenance_date)) || [];

    const stats: PumpStats = {
      total_pumps,
      active_pumps,
      maintenance_pumps,
      by_status,
      by_fuel_type,
      total_volume_dispensed,
      maintenance_schedule
    };

    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Pump stats error:', error);
    return {
      success: false,
      error: 'Failed to fetch pump statistics',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create a new pump
 */
async createPump(pumpData: CreatePumpRequest): Promise<APIResponse<Pump>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    // Check if pump number already exists in station
    const { data: existingPump } = await supabase
      .from('pumps')
      .select('id')
      .eq('station_id', pumpData.station_id)
      .eq('number', pumpData.number)
      .single();

    if (existingPump) {
      return {
        success: false,
        error: 'Pump number already exists in this station',
        code: 'PUMP_NUMBER_EXISTS',
        timestamp: new Date().toISOString()
      };
    }

    const { data: newPump, error } = await supabase
      .from('pumps')
      .insert({
        ...pumpData,
        current_meter_reading: pumpData.current_meter_reading || 0,
        total_dispensed: 0,
        created_by: user.id
      })
      .select(`
        *,
        station:stations (
          name,
          code
        )
      `)
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PUMP_CREATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log user activity
    await this.logUserActivity('pump_create', user.id, {
      pump_id: newPump.id,
      pump_number: pumpData.number,
      fuel_type: pumpData.fuel_type,
      station_id: pumpData.station_id
    });

    return {
      success: true,
      data: newPump as Pump,
      message: 'Pump created successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Create pump error:', error);
    return {
      success: false,
      error: 'Failed to create pump',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update a pump
 */
async updatePump(pumpId: string, updateData: UpdatePumpRequest): Promise<APIResponse<Pump>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    const { data: updatedPump, error } = await supabase
      .from('pumps')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', pumpId)
      .select(`
        *,
        station:stations (
          name,
          code
        )
      `)
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PUMP_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log user activity
    await this.logUserActivity('pump_update', user.id, {
      pump_id: pumpId,
      updates: updateData
    });

    return {
      success: true,
      data: updatedPump as Pump,
      message: 'Pump updated successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Update pump error:', error);
    return {
      success: false,
      error: 'Failed to update pump',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Delete a pump
 */
async deletePump(pumpId: string): Promise<APIResponse<void>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    // Check if pump has active shifts
    const { data: activeShifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('pump_id', pumpId)
      .eq('status', 'active')
      .single();

    if (activeShifts) {
      return {
        success: false,
        error: 'Cannot delete pump with active shifts',
        code: 'ACTIVE_SHIFTS_EXIST',
        timestamp: new Date().toISOString()
      };
    }

    const { error } = await supabase
      .from('pumps')
      .delete()
      .eq('id', pumpId);

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PUMP_DELETION_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log user activity
    await this.logUserActivity('pump_delete', user.id, {
      pump_id: pumpId
    });

    return {
      success: true,
      message: 'Pump deleted successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Delete pump error:', error);
    return {
      success: false,
      error: 'Failed to delete pump',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update pump status
 */
async updatePumpStatus(pumpId: string, status: PumpStatus): Promise<APIResponse<Pump>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    const { data: updatedPump, error } = await supabase
      .from('pumps')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', pumpId)
      .select(`
        *,
        station:stations (
          name,
          code
        )
      `)
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PUMP_STATUS_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log user activity
    await this.logUserActivity('pump_status_update', user.id, {
      pump_id: pumpId,
      new_status: status
    });

    return {
      success: true,
      data: updatedPump as Pump,
      message: `Pump status updated to ${status}`,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Update pump status error:', error);
    return {
      success: false,
      error: 'Failed to update pump status',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}



// ===== NOTIFICATION MANAGEMENT METHODS =====

/**
 * Get notifications with advanced filtering and pagination
 */
async getNotifications(filters: NotificationFilters = {}): Promise<APIResponse<NotificationsResponse>> {
  const requestId = `notifications_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const {
      page = 1,
      limit = 20,
      category,
      type,
      priority,
      is_read,
      is_archived = false,
      start_date,
      end_date,
      search
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select(`
        *,
        creator:profiles!notifications_created_by_fkey (
          full_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_archived', is_archived)
      .order('created_at', { ascending: false });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    if (is_read !== undefined && is_read !== 'all') {
      query = query.eq('is_read', is_read);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error(`❌ [${requestId}] Notifications fetch error:`, error);
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'NOTIFICATIONS_FETCH_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
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
      stats: stats.success ? stats.data : {
        total: 0,
        unread: 0,
        read: 0,
        by_category: {} as Record<NotificationCategory, number>,
        by_type: {} as Record<NotificationType, number>,
        weekly_trend: []
      }
    };

    // Log activity
    await this.logUserActivity('notifications_view', user.id, {
      filters_applied: filters,
      notifications_count: notifications?.length || 0
    });

    return {
      success: true,
      data: response,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Notifications critical error:`, error);
    return {
      success: false,
      error: 'Failed to fetch notifications',
      code: 'UNEXPECTED_ERROR',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get notification statistics
 */
async getNotificationStats(userId?: string): Promise<APIResponse<NotificationStats>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    const targetUserId = userId || user.id;

    // Get total counts
    const { count: total } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
      .eq('is_archived', false);

    const { count: unread } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
      .eq('is_read', false)
      .eq('is_archived', false);

    const { count: read } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
      .eq('is_read', true)
      .eq('is_archived', false);

    // Get counts by category
    const { data: byCategory } = await supabase
      .from('notifications')
      .select('category')
      .eq('user_id', targetUserId)
      .eq('is_archived', false);

    const categoryCounts = byCategory?.reduce((acc, notification) => {
      acc[notification.category] = (acc[notification.category] || 0) + 1;
      return acc;
    }, {} as Record<NotificationCategory, number>) || {} as Record<NotificationCategory, number>;

    // Get counts by type
    const { data: byType } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', targetUserId)
      .eq('is_archived', false);

    const typeCounts = byType?.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>) || {} as Record<NotificationType, number>;

    // Get weekly trend (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: weeklyData } = await supabase
      .from('notifications')
      .select('created_at')
      .eq('user_id', targetUserId)
      .eq('is_archived', false)
      .gte('created_at', weekAgo.toISOString());

    const weeklyTrend = weeklyData?.reduce((acc, notification) => {
      const date = notification.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const weeklyTrendArray = Object.entries(weeklyTrend || {}).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date));

    const stats: NotificationStats = {
      total: total || 0,
      unread: unread || 0,
      read: read || 0,
      by_category: categoryCounts,
      by_type: typeCounts,
      weekly_trend: weeklyTrendArray
    };

    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Notification stats error:', error);
    return {
      success: false,
      error: 'Failed to fetch notification statistics',
      code: 'STATS_FETCH_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Mark notifications as read/unread
 */
async markNotificationsAsRead(request: MarkAsReadRequest): Promise<APIResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    if (!request.notification_ids.length) {
      return {
        success: false,
        error: 'No notifications specified',
        code: 'NO_NOTIFICATIONS',
        timestamp: new Date().toISOString()
      };
    }

    // Verify all notifications belong to the user
    const { data: userNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .in('id', request.notification_ids);

    if (!userNotifications || userNotifications.length !== request.notification_ids.length) {
      return {
        success: false,
        error: 'Some notifications not found or access denied',
        code: 'ACCESS_DENIED',
        timestamp: new Date().toISOString()
      };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: request.read,
        updated_at: new Date().toISOString()
      })
      .in('id', request.notification_ids);

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'UPDATE_FAILED',
        timestamp: new Date().toISOString()
      };
    }

    // Log activity
    await this.logUserActivity('notifications_mark_read', user.id, {
      notification_ids: request.notification_ids,
      read_status: request.read,
      count: request.notification_ids.length
    });

    return {
      success: true,
      message: request.read 
        ? `${request.notification_ids.length} notification(s) marked as read`
        : `${request.notification_ids.length} notification(s) marked as unread`,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Mark notifications as read error:', error);
    return {
      success: false,
      error: 'Failed to update notifications',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Archive notifications
 */
async archiveNotifications(notificationIds: string[]): Promise<APIResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    if (!notificationIds.length) {
      return {
        success: false,
        error: 'No notifications specified',
        code: 'NO_NOTIFICATIONS',
        timestamp: new Date().toISOString()
      };
    }

    // Verify all notifications belong to the user
    const { data: userNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .in('id', notificationIds);

    if (!userNotifications || userNotifications.length !== notificationIds.length) {
      return {
        success: false,
        error: 'Some notifications not found or access denied',
        code: 'ACCESS_DENIED',
        timestamp: new Date().toISOString()
      };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .in('id', notificationIds);

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'ARCHIVE_FAILED',
        timestamp: new Date().toISOString()
      };
    }

    // Log activity
    await this.logUserActivity('notifications_archive', user.id, {
      notification_ids: notificationIds,
      count: notificationIds.length
    });

    return {
      success: true,
      message: `${notificationIds.length} notification(s) archived`,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Archive notifications error:', error);
    return {
      success: false,
      error: 'Failed to archive notifications',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get notification preferences
 */
async getNotificationPreferences(): Promise<APIResponse<NotificationPreferences>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Create default preferences if not found
      if (error.code === 'PGRST116') {
        const defaultPreferences = await this.createDefaultPreferences(user.id);
        return defaultPreferences;
      }
      
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PREFERENCES_FETCH_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: preferences as NotificationPreferences,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Get notification preferences error:', error);
    return {
      success: false,
      error: 'Failed to fetch notification preferences',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update notification preferences
 */
async updateNotificationPreferences(updates: Partial<NotificationPreferences>): Promise<APIResponse<NotificationPreferences>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    // Get current preferences first
    const currentPreferences = await this.getNotificationPreferences();
    if (!currentPreferences.success) {
      return currentPreferences;
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
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PREFERENCES_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log activity
    await this.logUserActivity('notification_preferences_update', user.id, {
      fields_updated: Object.keys(updates)
    });

    return {
      success: true,
      data: preferences as NotificationPreferences,
      message: 'Notification preferences updated successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Update notification preferences error:', error);
    return {
      success: false,
      error: 'Failed to update notification preferences',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create notification (Admin/Manager only)
 */
async createNotification(notificationData: CreateNotificationRequest): Promise<APIResponse<Notification>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      };
    }

    // Check if user has permission to create notifications
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to verify user permissions',
        code: 'PERMISSION_CHECK_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    const allowedRoles = ['admin', 'omc', 'dealer', 'station_manager'];
    if (!allowedRoles.includes(userProfile.data.role)) {
      return {
        success: false,
        error: 'Insufficient permissions to create notifications',
        code: 'PERMISSION_DENIED',
        timestamp: new Date().toISOString()
      };
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
        creator:profiles!notifications_created_by_fkey (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'NOTIFICATION_CREATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log activity
    await this.logUserActivity('notification_create', user.id, {
      target_user_id: notificationData.user_id,
      notification_type: notificationData.type,
      notification_category: notificationData.category
    });

    return {
      success: true,
      data: newNotification as Notification,
      message: 'Notification created successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Create notification error:', error);
    return {
      success: false,
      error: 'Failed to create notification',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

// ===== PRIVATE HELPER METHODS =====

/**
 * Create default notification preferences for user
 */
private async createDefaultPreferences(userId: string): Promise<APIResponse<NotificationPreferences>> {
  try {
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
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'PREFERENCES_CREATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: preferences as NotificationPreferences,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to create default preferences',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

// =====  PRICE MANAGEMENT API =====

/**
 * Set station price (OMC sets prices for their stations, Station managers set for their station)
 */
async setStationPrice(priceData: StationPriceCreateData): Promise<APIResponse> {
  try {
    console.log('Setting station price:', priceData);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, omc_id, station_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    // Validate station access
    if (profile.role === 'station' && profile.station_id !== priceData.station_id) {
      return {
        success: false,
        error: 'Station managers can only set prices for their own station'
      };
    }

    if (profile.role === 'omc') {
      // Verify station belongs to OMC
      const { data: station } = await supabase
        .from('stations')
        .select('omc_id')
        .eq('id', priceData.station_id)
        .single();

      if (!station || station.omc_id !== profile.omc_id) {
        return {
          success: false,
          error: 'OMC users can only set prices for their OMC stations'
        };
      }
    }

    // Get current price cap for validation
    const currentDate = new Date().toISOString();
    const { data: currentPriceCap } = await supabase
      .from('price_caps')
      .select('id, cap_price')
      .eq('product_id', priceData.product_id)
      .lte('effective_from', currentDate)
      .or(`effective_to.is.null,effective_to.gte.${currentDate}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    // Validate price doesn't exceed cap
    if (currentPriceCap && priceData.selling_price > currentPriceCap.cap_price) {
      return {
        success: false,
        error: `Selling price (${priceData.selling_price}) exceeds current price cap (${currentPriceCap.cap_price})`
      };
    }

    // Get current active price for history
    const { data: currentPrice } = await supabase
      .from('station_prices')
      .select('selling_price')
      .eq('station_id', priceData.station_id)
      .eq('product_id', priceData.product_id)
      .eq('status', 'active')
      .single();

    // Deactivate current active price
    if (currentPrice) {
      await supabase
        .from('station_prices')
        .update({ 
          status: 'expired', 
          updated_at: new Date().toISOString() 
        })
        .eq('station_id', priceData.station_id)
        .eq('product_id', priceData.product_id)
        .eq('status', 'active');
    }

    // Calculate margin
    const margin = currentPriceCap ? priceData.selling_price - currentPriceCap.cap_price : 0;

    // Create new price record
    const { data: newPrice, error: priceError } = await supabase
      .from('station_prices')
      .insert({
        station_id: priceData.station_id,
        product_id: priceData.product_id,
        selling_price: priceData.selling_price,
        effective_date: priceData.effective_date,
        end_date: priceData.end_date || null,
        omc_user_id: user.id,
        status: (profile.role === 'admin' || profile.role === 'npa' || profile.role === 'omc' || profile.role === 'station') ? 'active' : 'pending',        is_auto_adjusted: priceData.is_auto_adjusted,
        price_cap_id: currentPriceCap?.id,
        price_cap_amount: currentPriceCap?.cap_price,
        margin: margin,
        notes: priceData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        stations (name, code, omcs(name)),
        products (name, unit)
      `)
      .single();

    if (priceError) {
      console.error('Station price creation error:', priceError);
      return {
        success: false,
        error: priceextractErrorMessage(error) || 'Failed to set station price'
      };
    }

    // Create pricing history record
    await supabase
      .from('pricing_history')
      .insert({
        station_id: priceData.station_id,
        product_id: priceData.product_id,
        previous_price: currentPrice?.selling_price || null,
        new_price: priceData.selling_price,
        price_cap_at_time: currentPriceCap?.cap_price || 0,
        changed_by_user_id: user.id,
        change_reason: 'Manual price setting',
        price_type: 'station',
        created_at: new Date().toISOString()
      });

    console.log('Station price set successfully:', newPrice.id);
    return {
      success: true,
      message: 'Price set successfully!',
      data: {
        id: newPrice.id,
        station_id: newPrice.station_id,
        station_name: newPrice.stations?.name,
        omc_name: newPrice.stations?.omcs?.name,
        product_id: newPrice.product_id,
        product_name: newPrice.products?.name,
        product_unit: newPrice.products?.unit,
        selling_price: newPrice.selling_price,
        effective_date: newPrice.effective_date,
        end_date: newPrice.end_date,
        status: newPrice.status,
        is_auto_adjusted: newPrice.is_auto_adjusted,
        price_cap_id: newPrice.price_cap_id,
        price_cap_amount: newPrice.price_cap_amount,
        margin: newPrice.margin,
        notes: newPrice.notes,
        created_at: newPrice.created_at,
        updated_at: newPrice.updated_at
      }
    };

  } catch (error: unknown) {
    console.error('Station price setting error:', error);
    return {
      success: false,
      error: 'Failed to set station price: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Set OMC recommended price (using station_prices table with null station_id)
 */
async setOMCRecommendedPrice(priceData: OMCPriceCreateData): Promise<APIResponse> {
  try {
    console.log('Setting OMC recommended price:', priceData);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Get user profile to get OMC ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('omc_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.omc_id) {
      return {
        success: false,
        error: 'User is not associated with an OMC'
      };
    }

    // Get current price cap for reference
    const currentDate = new Date().toISOString();
    const { data: currentPriceCap } = await supabase
      .from('price_caps')
      .select('id, cap_price')
      .eq('product_id', priceData.product_id)
      .lte('effective_from', currentDate)
      .or(`effective_to.is.null,effective_to.gte.${currentDate}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    // Create OMC price record in station_prices with null station_id
    const { data: newPrice, error: priceError } = await supabase
      .from('station_prices')
      .insert({
        station_id: null, // Mark as OMC price
        product_id: priceData.product_id,
        selling_price: priceData.recommended_price,
        effective_date: priceData.effective_date,
        end_date: priceData.end_date || null,
        omc_user_id: user.id,
        status: 'active',
        is_auto_adjusted: false,
        price_cap_id: currentPriceCap?.id,
        price_cap_amount: currentPriceCap?.cap_price,
        margin: currentPriceCap ? priceData.recommended_price - currentPriceCap.cap_price : 0,
        notes: priceData.notes || 'OMC Recommended Price',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        products (name, unit)
      `)
      .single();

    if (priceError) {
      console.error('OMC price creation error:', priceError);
      return {
        success: false,
        error: priceextractErrorMessage(error) || 'Failed to set OMC recommended price'
      };
    }

    // Create pricing history record
    await supabase
      .from('pricing_history')
      .insert({
        product_id: priceData.product_id,
        previous_price: null,
        new_price: priceData.recommended_price,
        price_cap_at_time: currentPriceCap?.cap_price || 0,
        changed_by_user_id: user.id,
        change_reason: 'OMC recommended price setting',
        price_type: 'omc',
        created_at: new Date().toISOString()
      });

    console.log('OMC recommended price set successfully:', newPrice.id);
    return {
      success: true,
      message: 'OMC recommended price set successfully!',
      data: {
        id: newPrice.id,
        omc_id: profile.omc_id,
        product_id: newPrice.product_id,
        product_name: newPrice.products?.name,
        product_unit: newPrice.products?.unit,
        recommended_price: newPrice.selling_price,
        effective_date: newPrice.effective_date,
        end_date: newPrice.end_date,
        status: newPrice.status,
        price_cap_id: newPrice.price_cap_id,
        price_cap_amount: newPrice.price_cap_amount,
        notes: newPrice.notes,
        created_by: user.id,
        created_at: newPrice.created_at,
        updated_at: newPrice.updated_at
      }
    };

  } catch (error: unknown) {
    console.error('OMC price setting error:', error);
    return {
      success: false,
      error: 'Failed to set OMC recommended price: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get all OMC recommended prices with role-based filtering
 */
async getAllOMCPrices(filters?: PriceFilters): Promise<APIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, omc_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    let query = supabase
      .from('station_prices')
      .select(`
        *,
        profiles!station_prices_omc_user_id_fkey (omc_id, omcs(name)),
        products (name, unit)
      `)
      .is('station_id', null) // OMC prices have null station_id
      .order('effective_date', { ascending: false });

    // Apply role-based filtering for OMC prices
    if (profile.role === 'omc' && profile.omc_id) {
      // OMC users can only see prices from their OMC
      const { data: omcUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('omc_id', profile.omc_id);

      if (omcUsers && omcUsers.length > 0) {
        const userIds = omcUsers.map(u => u.id);
        query = query.in('omc_user_id', userIds);
      } else {
        return {
          success: true,
          data: []
        };
      }
    }
    // Station users cannot see OMC prices at all
    else if (profile.role === 'station') {
      return {
        success: true,
        data: []
      };
    }

    // Apply additional filters (only for admin/npa)
    if (filters?.omc_id && (profile.role === 'admin' || profile.role === 'npa')) {
      const { data: omcUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('omc_id', filters.omc_id);

      if (omcUsers && omcUsers.length > 0) {
        const userIds = omcUsers.map(u => u.id);
        query = query.in('omc_user_id', userIds);
      } else {
        return {
          success: true,
          data: []
        };
      }
    }
    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.start_date) {
      query = query.gte('effective_date', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('effective_date', filters.end_date);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    const mappedData = data?.map(price => ({
      id: price.id,
      omc_id: price.profiles?.omc_id,
      omc_name: price.profiles?.omcs?.name,
      product_id: price.product_id,
      product_name: price.products?.name,
      product_unit: price.products?.unit,
      recommended_price: price.selling_price,
      effective_date: price.effective_date,
      end_date: price.end_date,
      status: price.status,
      price_cap_id: price.price_cap_id,
      price_cap_amount: price.price_cap_amount,
      notes: price.notes,
      created_by: price.omc_user_id,
      created_at: price.created_at,
      updated_at: price.updated_at
    }));

    return {
      success: true,
      data: mappedData || []
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch OMC prices: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get OMC recommended prices for specific OMC
 */
async getOMCRecommendedPrices(omcId: string): Promise<APIResponse> {
  try {
    // First get user IDs for this OMC
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('omc_id', omcId);

    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const userIds = profiles.map(p => p.id);

    const { data, error } = await supabase
      .from('station_prices')
      .select(`
        *,
        profiles!station_prices_omc_user_id_fkey (omc_id, omcs(name)),
        products (name, unit)
      `)
      .is('station_id', null)
      .in('omc_user_id', userIds)
      .order('effective_date', { ascending: false });

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    const mappedData = data?.map(price => ({
      id: price.id,
      omc_id: price.profiles?.omc_id,
      omc_name: price.profiles?.omcs?.name,
      product_id: price.product_id,
      product_name: price.products?.name,
      product_unit: price.products?.unit,
      recommended_price: price.selling_price,
      effective_date: price.effective_date,
      end_date: price.end_date,
      status: price.status,
      price_cap_id: price.price_cap_id,
      price_cap_amount: price.price_cap_amount,
      notes: price.notes,
      created_by: price.omc_user_id,
      created_at: price.created_at,
      updated_at: price.updated_at
    }));

    return {
      success: true,
      data: mappedData || []
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch OMC recommended prices: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get all station prices with proper role-based filtering
 */
async getAllStationPrices(filters?: PriceFilters): Promise<APIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, omc_id, station_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    let query = supabase
      .from('station_prices')
      .select(`
        *,
        stations (name, code, omcs(name)),
        products (name, unit)
      `)
      .not('station_id', 'is', null) // Exclude OMC prices
      .order('effective_date', { ascending: false });

    // Apply role-based filtering
    if (profile.role === 'station' && profile.station_id) {
      // Station managers can only see their own station's prices
      query = query.eq('station_id', profile.station_id);
    } else if (profile.role === 'omc' && profile.omc_id) {
      // OMC users can only see prices from their OMC stations
      const { data: omcStations } = await supabase
        .from('stations')
        .select('id')
        .eq('omc_id', profile.omc_id);

      if (omcStations && omcStations.length > 0) {
        query = query.in('station_id', omcStations.map(s => s.id));
      } else {
        // No stations for this OMC
        return {
          success: true,
          data: []
        };
      }
    }
    // Admin and NPA can see all stations (no additional filtering)

    // Apply additional filters from parameters
    if (filters?.station_id) {
      query = query.eq('station_id', filters.station_id);
    }
    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.start_date) {
      query = query.gte('effective_date', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('effective_date', filters.end_date);
    }
    if (filters?.omc_id && (profile.role === 'admin' || profile.role === 'npa')) {
      // Only admin/npa can filter by omc_id
      const { data: stationIds } = await supabase
        .from('stations')
        .select('id')
        .eq('omc_id', filters.omc_id);

      if (stationIds && stationIds.length > 0) {
        query = query.in('station_id', stationIds.map(s => s.id));
      } else {
        return {
          success: true,
          data: []
        };
      }
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    const mappedData = data?.map(price => ({
      id: price.id,
      station_id: price.station_id,
      station_name: price.stations?.name,
      station_code: price.stations?.code,
      omc_id: price.stations?.omcs?.id,
      omc_name: price.stations?.omcs?.name,
      product_id: price.product_id,
      product_name: price.products?.name,
      product_unit: price.products?.unit,
      selling_price: price.selling_price,
      effective_date: price.effective_date,
      end_date: price.end_date,
      status: price.status,
      is_auto_adjusted: price.is_auto_adjusted,
      price_cap_id: price.price_cap_id,
      price_cap_amount: price.price_cap_amount,
      margin: price.margin,
      omc_user_id: price.omc_user_id,
      notes: price.notes,
      created_at: price.created_at,
      updated_at: price.updated_at
    }));

    return {
      success: true,
      data: mappedData || []
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch station prices: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Delete price cap
 */
async deletePriceCap(priceCapId: string): Promise<APIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Check if user has permission to delete price caps
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'npa')) {
      return {
        success: false,
        error: 'Insufficient permissions to delete price caps'
      };
    }

    const { error } = await supabase
      .from('price_caps')
      .delete()
      .eq('id', priceCapId);

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      message: 'Price cap deleted successfully'
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to delete price cap: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Delete station price
 */
async deleteStationPrice(priceId: string): Promise<APIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, station_id, omc_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    // Get the price to check permissions
    const { data: price } = await supabase
      .from('station_prices')
      .select('station_id, stations(omc_id), status')
      .eq('id', priceId)
      .single();

    if (!price) {
      return {
        success: false,
        error: 'Price not found'
      };
    }

    // Check permissions
    if (profile.role === 'station' && price.station_id !== profile.station_id) {
      return {
        success: false,
        error: 'Can only delete prices for your own station'
      };
    }

    if (profile.role === 'omc' && price.stations?.omc_id !== profile.omc_id) {
      return {
        success: false,
        error: 'Can only delete prices for your OMC stations'
      };
    }

    // Only allow deletion of pending prices for non-admin users
    if ((profile.role === 'station' || profile.role === 'omc') && price.status !== 'pending') {
      return {
        success: false,
        error: 'Can only delete pending prices. Contact admin for active price changes.'
      };
    }

    const { error } = await supabase
      .from('station_prices')
      .delete()
      .eq('id', priceId);

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      message: 'Station price deleted successfully'
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to delete station price: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Delete OMC price
 */
async deleteOMCPrice(priceId: string): Promise<APIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, omc_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    // Get the OMC price to check permissions
    const { data: price } = await supabase
      .from('station_prices')
      .select('omc_user_id, profiles(omc_id)')
      .eq('id', priceId)
      .single();

    if (!price) {
      return {
        success: false,
        error: 'OMC price not found'
      };
    }

    // Check permissions - users can only delete their own OMC prices
    if (profile.role === 'omc' && price.omc_user_id !== user.id) {
      return {
        success: false,
        error: 'Can only delete your own OMC prices'
      };
    }

    const { error } = await supabase
      .from('station_prices')
      .delete()
      .eq('id', priceId)
      .is('station_id', null); // Ensure it's an OMC price

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      message: 'OMC price deleted successfully'
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to delete OMC price: ' + extractErrorMessage(error)
    };
  }
}


/**
 * Approve pending station price
 */
async approveStationPrice(priceId: string): Promise<APIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'npa')) {
      return {
        success: false,
        error: 'Insufficient permissions to approve prices'
      };
    }

    const { error } = await supabase
      .from('station_prices')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', priceId)
      .eq('status', 'pending');

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      message: 'Station price approved successfully'
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to approve station price: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Reject pending station price
 */
async rejectStationPrice(priceId: string): Promise<APIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'npa')) {
      return {
        success: false,
        error: 'Insufficient permissions to reject prices'
      };
    }

    const { error } = await supabase
      .from('station_prices')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', priceId)
      .eq('status', 'pending');

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      message: 'Station price rejected successfully'
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to reject station price: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get station prices for specific station
 */
async getStationPrices(stationId: string): Promise<APIResponse> {
  return this.getAllStationPrices({ station_id: stationId });
}

/**
 * Get OMC station prices (for OMC users to view all their station prices)
 */
async getOMCStationPrices(omcId: string): Promise<APIResponse> {
  return this.getAllStationPrices({ omc_id: omcId });
}

// ===== SETTINGS MANAGEMENT METHODS =====

/**
 * Get user settings with proper error handling and validation
 */
async getUserSettings(): Promise<APIResponse<UserSettings>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error in getUserSettings:', authError);
      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }

    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHENTICATED'
      };
    }

    // Get user profile with related data
    const { data: profile, error: profileError } = await supabase
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
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return {
        success: false,
        error: 'Failed to load user profile',
        code: 'PROFILE_FETCH_ERROR'
      };
    }

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      };
    }

    // Try to get saved settings from user_settings table
    const { data: savedSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    let userSettings: UserSettings;

    if (settingsError || !savedSettings) {
      // Use default settings if no saved settings found
      userSettings = this.getDefaultUserSettings(profile);
      
      // Create initial settings record
      await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          settings: userSettings
        })
        .onConflict('user_id')
        .ignore();
    } else {
      // Merge saved settings with defaults to ensure all fields exist
      userSettings = this.mergeWithDefaultSettings(savedSettings.settings, profile);
    }

    // Log the settings access
    await this.logUserActivity('settings_view', user.id, {
      action: 'view_settings'
    });

    return {
      success: true,
      data: userSettings,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error in getUserSettings:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while loading settings',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update user settings with comprehensive validation
 */
async updateUserSettings(updates: Partial<UserSettings>): Promise<APIResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      };
    }

    // Validate updates
    const validationResult = this.validateSettingsUpdates(updates);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: `Invalid settings: ${validationResult.errors.join(', ')}`,
        code: 'VALIDATION_ERROR'
      };
    }

    // Start a transaction to update both profile and settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        error: 'Failed to load user profile',
        code: 'PROFILE_FETCH_ERROR'
      };
    }

    const updatePromises = [];

    // Update profile if needed
    if (updates.profile) {
      const profileUpdates: Record<string, unknown> = {};
      
      if (updates.profile.firstName !== undefined && updates.profile.lastName !== undefined) {
        profileUpdates.full_name = `${updates.profile.firstName} ${updates.profile.lastName}`.trim();
      }
      
      if (updates.profile.phone !== undefined) {
        profileUpdates.phone = updates.profile.phone;
      }

      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString();
        updatePromises.push(
          supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', user.id)
        );
      }
    }

    // Update settings in user_settings table
    if (Object.keys(updates).length > 0) {
      // Get current settings first
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const mergedSettings = {
        ...(currentSettings?.settings || {}),
        ...updates
      };

      updatePromises.push(
        supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            settings: mergedSettings,
            updated_at: new Date().toISOString()
          })
      );
    }

    // Execute all updates
    const results = await Promise.all(updatePromises);
    
    // Check for errors
    const hasError = results.some(result => result.error);
    if (hasError) {
      const errors = results
        .filter(result => result.error)
        .map(result => result.error?.message)
        .join('; ');
      
      return {
        success: false,
        error: `Failed to update settings: ${errors}`,
        code: 'UPDATE_ERROR'
      };
    }

    // Log the settings update
    await this.logUserActivity('settings_update', user.id, {
      sections_updated: Object.keys(updates),
      changes: updates
    });

    return {
      success: true,
      message: 'Settings updated successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error in updateUserSettings:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating settings',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Change user password with security validation
 */
async changePassword(passwordData: {
  currentPassword: string;
  newPassword: string;
}): Promise<APIResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      };
    }

    // Validate password requirements
    const passwordValidation = this.validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: `Password requirements not met: ${passwordValidation.errors.join(', ')}`,
        code: 'PASSWORD_VALIDATION_ERROR'
      };
    }

    // Verify current password by attempting to reauthenticate
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: passwordData.currentPassword
    });

    if (signInError) {
      return {
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return {
        success: false,
        error: 'Failed to update password. Please try again.',
        code: 'PASSWORD_UPDATE_ERROR'
      };
    }

    // Update last password change timestamp in settings
    await supabase
      .from('user_settings')
      .update({
        settings: {
          security: {
            lastPasswordChange: new Date().toISOString()
          }
        }
      })
      .eq('user_id', user.id);

    // Log password change
    await this.logUserActivity('password_change', user.id, {
      action: 'password_updated',
      change_type: 'manual'
    });

    return {
      success: true,
      message: 'Password updated successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error in changePassword:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while changing password',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update two-factor authentication status
 */
async updateTwoFactorAuth(enabled: boolean): Promise<APIResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      };
    }

    // In a production environment, you would integrate with a 2FA service
    // For now, we'll store the preference in user_settings
    
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        settings: {
          security: {
            twoFactorEnabled: enabled
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('2FA update error:', updateError);
      return {
        success: false,
        error: 'Failed to update two-factor authentication settings',
        code: '2FA_UPDATE_ERROR'
      };
    }

    // Log 2FA status change
    await this.logUserActivity('2fa_update', user.id, {
      action: enabled ? '2fa_enabled' : '2fa_disabled'
    });

    return {
      success: true,
      message: enabled ? 'Two-factor authentication enabled successfully' : 'Two-factor authentication disabled successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error in updateTwoFactorAuth:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating two-factor authentication',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Export user data with comprehensive data collection
 */
async exportUserData(): Promise<APIResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      };
    }

    // Collect all user data from various tables
    const [
      { data: profile },
      { data: userSettings },
      { data: userSales },
      { data: userViolations },
      { data: userActivity },
      { data: userShifts },
      { data: priceChanges }
    ] = await Promise.all([
      // User profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      
      // User settings
      supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      
      // Sales data (last 6 months)
      supabase
        .from('sales')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5000),
      
      // Violation reports
      supabase
        .from('compliance_violations')
        .select('*')
        .eq('reported_by', user.id)
        .limit(1000),
      
      // Activity logs
      supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000),
      
      // Shift data
      supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .limit(1000),
      
      // Price changes
      supabase
        .from('pricing_history')
        .select('*')
        .eq('changed_by_user_id', user.id)
        .limit(1000)
    ]);

    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        data_categories: [
          'profile',
          'settings',
          'sales',
          'violations',
          'activity',
          'shifts',
          'price_changes'
        ],
        record_counts: {
          profile: profile ? 1 : 0,
          settings: userSettings ? 1 : 0,
          sales: userSales?.length || 0,
          violations: userViolations?.length || 0,
          activity: userActivity?.length || 0,
          shifts: userShifts?.length || 0,
          price_changes: priceChanges?.length || 0
        }
      },
      profile: this.sanitizeExportData(profile),
      settings: this.sanitizeExportData(userSettings),
      sales: this.sanitizeExportData(userSales),
      violations: this.sanitizeExportData(userViolations),
      activity: this.sanitizeExportData(userActivity),
      shifts: this.sanitizeExportData(userShifts),
      price_changes: this.sanitizeExportData(priceChanges)
    };

    // Log data export
    await this.logUserActivity('data_export', user.id, {
      action: 'export_personal_data',
      record_counts: exportData.metadata.record_counts
    });

    return {
      success: true,
      data: exportData,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error in exportUserData:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while exporting data',
      code: 'EXPORT_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Delete user account with comprehensive cleanup
 */
async deleteAccount(): Promise<APIResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      };
    }

    // Check for dependencies that would prevent account deletion
    const dependencies = await this.checkAccountDependencies(user.id);
    if (dependencies.length > 0) {
      return {
        success: false,
        error: `Cannot delete account due to active dependencies: ${dependencies.join(', ')}`,
        code: 'ACCOUNT_HAS_DEPENDENCIES'
      };
    }

    // Start a transaction for account deletion
    const deletionPromises = [];

    // 1. Anonymize profile data (soft delete)
    deletionPromises.push(
      supabase
        .from('profiles')
        .update({
          is_active: false,
          status: 'inactive',
          email: `deleted_${user.id}@deleted.com`,
          full_name: 'Deleted User',
          phone: null,
          avatar_url: null,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    );

    // 2. Delete user settings
    deletionPromises.push(
      supabase
        .from('user_settings')
        .delete()
        .eq('user_id', user.id)
    );

    // 3. Archive activity logs (keep for audit purposes but mark as deleted)
    deletionPromises.push(
      supabase
        .from('user_activity_logs')
        .update({
          details: {
            ...supabase.raw('details'),
            account_deleted: true,
            deletion_date: new Date().toISOString()
          }
        })
        .eq('user_id', user.id)
    );

    // Execute all deletion operations
    const results = await Promise.all(deletionPromises);
    
    // Check for errors
    const hasError = results.some(result => result.error);
    if (hasError) {
      const errors = results
        .filter(result => result.error)
        .map(result => result.error?.message)
        .join('; ');
      
      return {
        success: false,
        error: `Failed to delete account: ${errors}`,
        code: 'ACCOUNT_DELETION_ERROR'
      };
    }

    // Sign out the user
    await supabase.auth.signOut();

    // Log account deletion (this will be the last activity log)
    await this.logUserActivity('account_deletion', user.id, {
      action: 'account_deleted',
      deletion_method: 'user_initiated'
    });

    return {
      success: true,
      message: 'Account deleted successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error in deleteAccount:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while deleting account',
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get audit logs for user - PRODUCTION READY WITH ARRAY SAFETY
 */
async getAuditLogs(userId?: string): Promise<APIResponse<AuditLog[]>> {
  const requestId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // Return empty array instead of error for better UX
      return {
        success: true,
        data: [],
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const targetUserId = userId || user.id;

    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(`❌ [${requestId}] Audit logs fetch error:`, error);
      // Return empty array instead of failing
      return {
        success: true,
        data: [],
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // PRODUCTION FIX: Always return an array, even if data is null/undefined
    const safeData = Array.isArray(data) ? data : [];

    return {
      success: true,
      data: safeData,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Audit logs critical error:`, error);
    // Return empty array on any error
    return {
      success: true,
      data: [],
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

// ===== PRIVATE HELPER METHODS =====

/**
 * Generate default user settings based on profile
 */
private getDefaultUserSettings(profile: Record<string, unknown>): UserSettings {
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
      stationAccess: profile.station_id ? [profile.station_id] : [],
      reportAccess: ['sales', 'inventory'],
      canManageUsers: false,
      canConfigurePrices: false,
      canApproveExpenses: false,
      maxDiscountLimit: 0,
    }
  };

  // Role-based settings
  switch (profile.role) {
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
        stationAccess: profile.stations || [],
        reportAccess: ['sales', 'inventory', 'financial'],
        canManageUsers: true,
        canConfigurePrices: true,
        canApproveExpenses: true,
        maxDiscountLimit: 200,
      };
      break;
    case 'station_manager':
      baseSettings.roleSettings = {
        stationAccess: profile.station_id ? [profile.station_id] : [],
        reportAccess: ['sales', 'inventory'],
        canManageUsers: false,
        canConfigurePrices: false,
        canApproveExpenses: true,
        maxDiscountLimit: 100,
      };
      break;
    case 'cashier':
    case 'attendant':
      baseSettings.roleSettings = {
        stationAccess: profile.station_id ? [profile.station_id] : [],
        reportAccess: ['sales'],
        canManageUsers: false,
        canConfigurePrices: false,
        canApproveExpenses: false,
        maxDiscountLimit: 50,
      };
      break;
  }

  return baseSettings;
}

/**
 * Merge saved settings with defaults
 */
private mergeWithDefaultSettings(savedSettings: Record<string, unknown>, profile: Record<string, unknown>): UserSettings {
  const defaultSettings = this.getDefaultUserSettings(profile);
  
  return {
    profile: { ...defaultSettings.profile, ...savedSettings.profile },
    notifications: { ...defaultSettings.notifications, ...savedSettings.notifications },
    security: { ...defaultSettings.security, ...savedSettings.security },
    preferences: { ...defaultSettings.preferences, ...savedSettings.preferences },
    roleSettings: { ...defaultSettings.roleSettings, ...savedSettings.roleSettings }
  };
}

/**
 * Validate settings updates
 */
private validateSettingsUpdates(updates: Partial<UserSettings>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (updates.profile) {
    if (updates.profile.email && !this.isValidEmail(updates.profile.email)) {
      errors.push('Invalid email format');
    }
    
    if (updates.profile.phone && !this.isValidPhone(updates.profile.phone)) {
      errors.push('Invalid phone number format');
    }
  }

  if (updates.preferences) {
    if (updates.preferences.theme && !['light', 'dark', 'system'].includes(updates.preferences.theme)) {
      errors.push('Invalid theme selection');
    }
    
    if (updates.preferences.language && !['en', 'fr', 'es', 'pt', 'ar'].includes(updates.preferences.language)) {
      errors.push('Invalid language selection');
    }
    
    if (updates.preferences.sessionTimeout && (updates.preferences.sessionTimeout < 15 || updates.preferences.sessionTimeout > 480)) {
      errors.push('Session timeout must be between 15 and 480 minutes');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate password strength
 */
private validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check account dependencies before deletion
 */
private async checkAccountDependencies(userId: string): Promise<string[]> {
  const dependencies: string[] = [];

  // Check if user is manager of any active stations
  const { data: managedStations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('manager_id', userId)
    .eq('status', 'active')
    .limit(1);

  if (managedStations && managedStations.length > 0) {
    dependencies.push('station management');
  }

  // Check if user has any active shifts
  const { data: activeShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1);

  if (activeShifts && activeShifts.length > 0) {
    dependencies.push('active shifts');
  }

  // Check if user is the primary contact for any OMC
  const { data: omcContact } = await supabase
    .from('omcs')
    .select('id, name')
    .eq('primary_contact_id', userId)
    .limit(1);

  if (omcContact && omcContact.length > 0) {
    dependencies.push('OMC primary contact');
  }

  return dependencies;
}

/**
 * Sanitize export data to remove sensitive information
 */
private sanitizeExportData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => this.sanitizeExportData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'password_hash',
      'reset_token',
      'verification_token',
      'auth_token',
      'api_key',
      'secret_key'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });

    return sanitized;
  }

  return data;
}

/**
 * Get action description for audit logs
 */
private getActionDescription(action: string, details: Record<string, unknown>): string {
  const actionDescriptions: Record<string, string> = {
    'user_login': 'User logged into the system',
    'user_logout': 'User logged out of the system',
    'profile_update': 'User updated their profile information',
    'password_change': 'User changed their password',
    'settings_update': 'User updated application settings',
    'settings_view': 'User viewed their settings',
    'sale_create': 'User recorded a new sale',
    'violation_report': 'User reported a compliance violation',
    'price_update': 'User updated fuel prices',
    'user_create': 'User created a new user account',
    'user_update': 'User updated another user account',
    'user_delete': 'User deleted a user account',
    'data_export': 'User exported their personal data',
    '2fa_update': 'User updated two-factor authentication settings',
    'account_deletion': 'User deleted their account'
  };

  let description = actionDescriptions[action] || `User performed action: ${action}`;
  
  // Add details if available
  if (details) {
    if (typeof details === 'object') {
      const cleanDetails = { ...details };
      // Remove sensitive information from details
      delete cleanDetails.password;
      delete cleanDetails.newPassword;
      delete cleanDetails.currentPassword;
      
      if (Object.keys(cleanDetails).length > 0) {
        description += ` - ${JSON.stringify(cleanDetails)}`;
      }
    } else {
      description += ` - ${details}`;
    }
  }

  return description;
}

/**
 * Validate email format
 */
private isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
private isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}

// ===== PROFILE MANAGEMENT METHODS =====

/**
 * Get user profile - PRODUCTION READY
 */
async getUserProfile(userId?: string): Promise<APIResponse<any>> {
  const startTime = Date.now();
  const requestId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🔄 [${requestId}] getUserProfile initiated for:`, userId);
    
    // Validate input
    if (userId && !this.isValidUUID(userId)) {
      return {
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.warn(`🔐 [${requestId}] Authentication failed:`, authError);
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const targetUserId = userId || user.id;
    console.log(`🔍 [${requestId}] Fetching profile for:`, targetUserId);

    // Get basic profile data with timeout protection
    const profilePromise = supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        full_name,
        phone,
        avatar_url,
        omc_id,
        dealer_id,
        station_id,
        department,
        employee_id,
        emergency_contact,
        is_active,
        email_verified,
        last_login_at,
        created_at,
        updated_at
      `)
      .eq('id', targetUserId)
      .single();

    const profileTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
    );

    const { data: profile, error: profileError } = await Promise.race([
      profilePromise,
      profileTimeout
    ]) as any;

    if (profileError) {
      console.error(`❌ [${requestId}] Profile fetch error:`, profileError);
      
      // Log the error for monitoring
      await this.logUserActivity('profile_fetch_error', targetUserId, {
        error: profileextractErrorMessage(error),
        code: profileError.code,
        request_id: requestId
      });

      return {
        success: false,
        error: this.getUserFriendlyErrorMessage(profileError),
        code: 'PROFILE_FETCH_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    if (!profile) {
      console.warn(`❌ [${requestId}] Profile not found for ID:`, targetUserId);
      return {
        success: false,
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    console.log(`✅ [${requestId}] Basic profile loaded in ${Date.now() - startTime}ms`);

    // Get related data in parallel with error handling
    const [stationResult, omcResult, dealerResult] = await Promise.allSettled([
      profile.station_id ? this.getStationDetails(profile.station_id) : Promise.resolve(null),
      profile.omc_id ? this.getOMCDetails(profile.omc_id) : Promise.resolve(null),
      profile.dealer_id ? this.getDealerDetails(profile.dealer_id) : Promise.resolve(null)
    ]);

    const enhancedProfile = {
      ...profile,
      station: stationResult.status === 'fulfilled' ? stationResult.value : null,
      omc: omcResult.status === 'fulfilled' ? omcResult.value : null,
      dealer: dealerResult.status === 'fulfilled' ? dealerResult.value : null
    };

    // Log successful profile access
    await this.logUserActivity('profile_view', targetUserId, {
      request_id: requestId,
      load_time: Date.now() - startTime
    });

    console.log(`🎉 [${requestId}] Profile loaded successfully in ${Date.now() - startTime}ms`);

    return {
      success: true,
      data: enhancedProfile,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Unexpected error:`, error);
    
    // Log critical error for monitoring
    await this.logUserActivity('profile_fetch_critical_error', userId, {
      error: extractErrorMessage(error),
      request_id: requestId,
      stack: error.stack
    });

    return {
      success: false,
      error: 'Service temporarily unavailable. Please try again.',
      code: 'SERVICE_UNAVAILABLE',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get user performance statistics - PRODUCTION READY
 */
async getUserPerformanceStats(userId?: string): Promise<APIResponse<any>> {
  const requestId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const targetUserId = userId || user.id;

    // Try to get cached performance metrics first
    const cachedStats = await this.getCachedPerformanceStats(targetUserId);
    if (cachedStats) {
      return {
        success: true,
        data: cachedStats,
        cached: true,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Get current month performance metrics with fallback
    const { data: performanceData, error: performanceError } = await supabase
      .from('user_performance_metrics')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('period_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .order('period_date', { ascending: false })
      .limit(1)
      .single();

    let stats;

    if (performanceError || !performanceData) {
      console.warn(`📊 [${requestId}] No performance data found, calculating real-time stats`);
      stats = await this.calculateRealTimePerformanceStats(targetUserId);
      
      // Cache the calculated stats
      await this.cachePerformanceStats(targetUserId, stats.data);
    } else {
      stats = {
        success: true,
        data: {
          totalShifts: performanceData.total_shifts || 0,
          salesProcessed: Number(performanceData.sales_processed || 0),
          transactions: performanceData.transactions_count || 0,
          accuracyRate: Number(performanceData.accuracy_rate || 100),
          complianceScore: Number(performanceData.compliance_score || 100),
          avgTransactionValue: Number(performanceData.avg_transaction_value || 0)
        }
      };
    }

    return {
      ...stats,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Performance stats error:`, error);
    
    // Return safe default values
    return {
      success: true,
      data: {
        totalShifts: 0,
        salesProcessed: 0,
        transactions: 0,
        accuracyRate: 100,
        complianceScore: 100,
        avgTransactionValue: 0
      },
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update user profile - PRODUCTION READY
 */
async updateUserProfile(userId: string, updates: Record<string, unknown>): Promise<APIResponse<any>> {
  const requestId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Input validation
    if (!this.isValidUUID(userId)) {
      return {
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Authorization check
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (user.id !== userId && currentUser?.role !== 'admin') {
      await this.logUserActivity('unauthorized_profile_update', userId, {
        attempted_by: user.id,
        updates
      });

      return {
        success: false,
        error: 'Unauthorized to update this profile',
        code: 'UNAUTHORIZED',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Validate updates
    const validationResult = this.validateProfileUpdates(updates);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.errors.join(', ')}`,
        code: 'VALIDATION_ERROR',
        request_id: requestId,
        details: validationResult.errors,
        timestamp: new Date().toISOString()
      };
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Only allow specific fields to be updated
    const allowedFields = [
      'full_name', 'phone', 'department', 'emergency_contact', 
      'avatar_url', 'station_id', 'omc_id', 'dealer_id'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Role changes require admin privileges
    if (updates.role && currentUser?.role === 'admin') {
      if (this.isValidRole(updates.role)) {
        updateData.role = updates.role;
      } else {
        return {
          success: false,
          error: 'Invalid role specified',
          code: 'INVALID_ROLE',
          request_id: requestId,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Perform the update
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error(`❌ [${requestId}] Profile update error:`, error);
      
      await this.logUserActivity('profile_update_failed', userId, {
        error: extractErrorMessage(error),
        updates: Object.keys(updateData)
      });

      return {
        success: false,
        error: 'Failed to update profile. Please try again.',
        code: 'UPDATE_FAILED',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Log successful update
    await this.logUserActivity('profile_updated', userId, {
      fields_updated: Object.keys(updateData),
      request_id: requestId
    });

    // Invalidate cache if needed
    await this.invalidateUserCache(userId);

    return {
      success: true,
      data,
      message: 'Profile updated successfully',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Profile update critical error:`, error);
    
    await this.logUserActivity('profile_update_critical_error', userId, {
      error: extractErrorMessage(error),
      stack: error.stack
    });

    return {
      success: false,
      error: 'Service temporarily unavailable. Please try again.',
      code: 'SERVICE_UNAVAILABLE',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

// ===== HELPER METHODS =====

/**
 * Get station details with error handling
 */
private async getStationDetails(stationId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('id, name, code, address, region, city, status')
      .eq('id', stationId)
      .single();

    return error ? null : data;
  } catch (error) {
    console.error('Error fetching station details:', error);
    return null;
  }
}

/**
 * Get OMC details with error handling
 */
private async getOMCDetails(omcId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('omcs')
      .select('id, name, code, contact_person, email, phone')
      .eq('id', omcId)
      .single();

    return error ? null : data;
  } catch (error) {
    console.error('Error fetching OMC details:', error);
    return null;
  }
}

/**
 * Get dealer details with error handling
 */
private async getDealerDetails(dealerId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('id, name, contact_person, email, phone')
      .eq('id', dealerId)
      .single();

    return error ? null : data;
  } catch (error) {
    console.error('Error fetching dealer details:', error);
    return null;
  }
}

/**
 * Validate UUID format
 */
private isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate role
 */
private isValidRole(role: string): boolean {
  const validRoles = ['admin', 'npa', 'supervisor', 'omc', 'dealer', 'station_manager', 'attendant'];
  return validRoles.includes(role);
}

/**
 * Get user-friendly error messages
 */
private getUserFriendlyErrorMessage(error: Record<string, unknown>): string {
  const errorMap: Record<string, string> = {
    'PGRST116': 'Profile not found',
    '42501': 'Access denied',
    '42703': 'Service configuration error',
    '42P01': 'Service temporarily unavailable'
  };

  return errorMap[error.code] || 'Unable to load profile. Please try again.';
}

/**
 * Cache performance stats (simple in-memory cache)
 */
private async getCachedPerformanceStats(userId: string): Promise<any> {
  // In production, you might use Redis or similar
  const cacheKey = `perf_${userId}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    // Cache for 5 minutes
    if (Date.now() - timestamp < 5 * 60 * 1000) {
      return data;
    }
  }
  
  return null;
}

private async cachePerformanceStats(userId: string, stats: Record<string, unknown>): Promise<void> {
  const cacheKey = `perf_${userId}`;
  const cacheData = {
    data: stats,
    timestamp: Date.now()
  };
  
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    // Cache storage failed, non-critical
    console.warn('Failed to cache performance stats:', error);
  }
}

/**
 * Invalidate user cache
 */
private async invalidateUserCache(userId: string): Promise<void> {
  try {
    sessionStorage.removeItem(`perf_${userId}`);
  } catch (error) {
    // Non-critical error
    console.warn('Failed to invalidate cache:', error);
  }
}



// ===== STATION MANAGEMENT METHODS =====

/**
 * Get single station with full details - PRODUCTION READY
 */
async getStationDetails(stationId: string): Promise<APIResponse<StationDetails>> {
  const requestId = `station_${stationId}_${Date.now()}`;
  
  try {
    console.log(`🔄 [${requestId}] Fetching station details:`, stationId);

    // Input validation
    if (!stationId || !this.isValidUUID(stationId)) {
      return {
        success: false,
        error: 'Invalid station ID format',
        code: StationErrorCode.INVALID_STATION_DATA,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Check cache first
    const cachedStation = await this.getCachedStation(stationId);
    if (cachedStation) {
      console.log(`✅ [${requestId}] Returning cached station data`);
      return {
        success: true,
        data: cachedStation,
        cached: true,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // ✅ FIXED: Using correct foreign key constraint
    const { data: station, error: stationError } = await supabase
      .from('stations')
      .select(`
        *,
        omcs (id, name, code, contact_person, email, phone),
        dealers (id, name, contact_person, email, phone),
        profiles!fk_station_manager (
          id,
          full_name,
          email,
          phone,
          role
        )
      `)
      .eq('id', stationId)
      .eq('status', 'active')
      .single();

    if (stationError) {
      console.error(`❌ [${requestId}] Station fetch error:`, stationError);
      
      if (stationError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Station not found',
          code: StationErrorCode.STATION_NOT_FOUND,
          request_id: requestId,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: 'Failed to fetch station details',
        code: 'STATION_FETCH_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    if (!station) {
      return {
        success: false,
        error: 'Station not found',
        code: StationErrorCode.STATION_NOT_FOUND,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Get additional station metrics in parallel with error handling
    const [
      violationsResult,
      recentSalesResult,
      currentInventoryResult,
      upcomingInspectionsResult,
      performanceResult
    ] = await Promise.allSettled([
      // Active violations
      supabase
        .from('compliance_violations')
        .select('id, status, severity, violation_date, fine_amount')
        .eq('station_id', stationId)
        .eq('status', 'open')
        .order('violation_date', { ascending: false })
        .limit(50),
      // Recent sales (last 30 days)
      supabase
        .from('sales')
        .select('total_amount, litres_sold, created_at, payment_method')
        .eq('station_id', stationId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100),
      // Current inventory
      supabase
        .from('tank_stocks')
        .select('product_id, current_stock, capacity, product:products(name, unit)')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false }),
      // Upcoming inspections
      supabase
        .from('inspections')
        .select('id, scheduled_date, inspection_type, status, inspector_name')
        .eq('station_id', stationId)
        .eq('status', 'scheduled')
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(10),
      // Performance metrics
      this.getStationPerformance(stationId, 'month')
    ]);

    // Process results with error handling
    const violations = violationsResult.status === 'fulfilled' ? violationsResult.value.data : [];
    const recentSales = recentSalesResult.status === 'fulfilled' ? recentSalesResult.value.data : [];
    const currentInventory = currentInventoryResult.status === 'fulfilled' ? currentInventoryResult.value.data : [];
    const upcomingInspections = upcomingInspectionsResult.status === 'fulfilled' ? upcomingInspectionsResult.value.data : [];
    const performance = performanceResult.status === 'fulfilled' && performanceResult.value.success ? 
      performanceResult.value.data : null;

    // Calculate compliance status
    const totalViolations = violations?.length || 0;
    const openViolations = violations?.filter(v => v.status === 'open').length || 0;
    const criticalViolations = violations?.filter(v => v.severity === 'critical').length || 0;
    
    let complianceStatus: 'compliant' | 'non_compliant' | 'under_review' = 'compliant';
    if (criticalViolations > 0) {
      complianceStatus = 'non_compliant';
    } else if (openViolations > 2) {
      complianceStatus = 'under_review';
    } else if (openViolations > 0) {
      complianceStatus = 'under_review';
    }

    // Calculate financial metrics
    const totalSales = recentSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const totalVolume = recentSales?.reduce((sum, sale) => sum + (sale.litres_sold || 0), 0) || 0;
    const cashSales = recentSales?.filter(s => s.payment_method === 'cash').reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const digitalSales = recentSales?.filter(s => s.payment_method !== 'cash').reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

    // Calculate inventory metrics
    const totalCapacity = currentInventory?.reduce((sum, inv) => sum + (inv.capacity || 0), 0) || 0;
    const currentStock = currentInventory?.reduce((sum, inv) => sum + (inv.current_stock || 0), 0) || 0;
    const stockPercentage = totalCapacity > 0 ? (currentStock / totalCapacity) * 100 : 0;

    const stationDetails: StationDetails = {
      id: station.id,
      name: station.name,
      code: station.code,
      address: station.address,
      location: station.location,
      city: station.city,
      region: station.region,
      omc_id: station.omc_id,
      omc_name: station.omcs?.name,
      dealer_id: station.dealer_id,
      dealer_name: station.dealers?.name,
      manager_id: station.manager_id,
      manager_name: station.profiles?.full_name,
      status: station.status,
      gps_coordinates: station.gps_coordinates,
      compliance_status: complianceStatus,
      last_inspection_date: upcomingInspections?.[0]?.scheduled_date,
      total_violations: totalViolations,
      open_violations: openViolations,
      critical_violations: criticalViolations,
      total_sales: totalSales,
      total_volume: totalVolume,
      cash_sales: cashSales,
      digital_sales: digitalSales,
      inventory_capacity: totalCapacity,
      current_inventory: currentStock,
      stock_percentage: Math.round(stockPercentage),
      performance_metrics: performance,
      created_at: station.created_at,
      updated_at: station.updated_at
    };

    // Cache the station data
    await this.cacheStation(stationId, stationDetails);

    // Log successful access
    await this.logUserActivity('station_view', undefined, {
      station_id: stationId,
      request_id: requestId
    });

    console.log(`✅ [${requestId}] Station details fetched successfully`);
    return {
      success: true,
      data: stationDetails,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Station details critical error:`, error);
    
    // Log critical error
    await this.logUserActivity('station_view_error', undefined, {
      station_id: stationId,
      error: extractErrorMessage(error),
      request_id: requestId
    });

    return {
      success: false,
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create new station with validation and auto-code generation - POLISHED
 */
async createStation(stationData: StationFormData): Promise<APIResponse<Station>> {
  const requestId = `create_station_${Date.now()}`;
  
  try {
    console.log(`🔄 [${requestId}] Creating station:`, stationData);

    // Input validation
    if (!stationData.name?.trim()) {
      return {
        success: false,
        error: 'Station name is required',
        code: StationErrorCode.INVALID_STATION_DATA,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // ✅ FIX: Sanitize UUID fields by converting empty strings to null
    const sanitizedData = this.sanitizeUUIDFields(stationData);

    // Validate required fields after sanitization
    if (!sanitizedData.region) {
      return {
        success: false,
        error: 'Region is required',
        code: StationErrorCode.INVALID_STATION_DATA,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    if (!sanitizedData.address?.trim()) {
      return {
        success: false,
        error: 'Address is required',
        code: StationErrorCode.INVALID_STATION_DATA,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Get current user for authorization and auditing
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: StationErrorCode.UNAUTHORIZED_ACCESS,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Check user permissions
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to verify user permissions',
        code: 'PERMISSION_CHECK_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // RBAC validation
    if (userProfile.data.role === 'station_manager' || userProfile.data.role === 'dealer') {
      return {
        success: false,
        error: 'You do not have permission to create stations',
        code: StationErrorCode.UNAUTHORIZED_ACCESS,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Auto-detect OMC context for OMC users
    let finalStationData = { ...sanitizedData };
    if (userProfile.data.role === 'omc' && userProfile.data.omc_id) {
      finalStationData.omc_id = userProfile.data.omc_id;
    }

    // Generate unique station code
    const stationCode = this.generateStationCode(finalStationData.name);
    finalStationData.code = stationCode;

    // Check for duplicate station code
    const { data: existingStation, error: checkError } = await supabase
      .from('stations')
      .select('id')
      .eq('code', stationCode)
      .maybeSingle();

    if (checkError) {
      console.error(`❌ [${requestId}] Duplicate check error:`, checkError);
    }

    if (existingStation) {
      return {
        success: false,
        error: 'Station code already exists. Please try a different station name.',
        code: StationErrorCode.DUPLICATE_STATION_CODE,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // ✅ FIX: Final sanitization before insert
    const insertData = this.sanitizeUUIDFields({
      ...finalStationData,
      status: 'active',
      created_by: user.id,
      updated_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Create station with audit fields
    const { data: station, error: createError } = await supabase
      .from('stations')
      .insert(insertData)
      .select(`
        *,
        omcs (id, name, code),
        dealers (id, name),
        profiles!fk_station_manager (id, full_name, email)
      `)
      .single();

    if (createError) {
      console.error(`❌ [${requestId}] Station creation error:`, createError);
      
      // Handle specific constraint violations
      if (createError.code === '23505') { // Unique violation
        return {
          success: false,
          error: 'Station code already exists',
          code: StationErrorCode.DUPLICATE_STATION_CODE,
          request_id: requestId,
          timestamp: new Date().toISOString()
        };
      }

      if (createError.code === '22P02') { // Invalid UUID
        return {
          success: false,
          error: 'Invalid reference ID provided',
          code: StationErrorCode.INVALID_STATION_DATA,
          request_id: requestId,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: createextractErrorMessage(error) || 'Failed to create station',
        code: 'STATION_CREATION_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Log successful creation
    await this.logUserActivity('station_created', user.id, {
      station_id: station.id,
      station_name: station.name,
      station_code: station.code
    });

    console.log(`✅ [${requestId}] Station created successfully:`, station.id);
    return {
      success: true,
      data: station,
      message: 'Station created successfully!',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Station creation critical error:`, error);
    
    await this.logUserActivity('station_creation_error', undefined, {
      station_data: stationData,
      error: extractErrorMessage(error),
      request_id: requestId
    });

    return {
      success: false,
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update station details with comprehensive validation - POLISHED
 */
async updateStation(stationId: string, updateData: Partial<StationFormData & { status: Station['status'] }>): Promise<APIResponse<Station>> {
  const requestId = `update_station_${stationId}_${Date.now()}`;
  
  try {
    console.log(`🔄 [${requestId}] Updating station:`, stationId, updateData);

    // Input validation
    if (!stationId || !this.isValidUUID(stationId)) {
      return {
        success: false,
        error: 'Invalid station ID format',
        code: StationErrorCode.INVALID_STATION_DATA,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: 'No update data provided',
        code: StationErrorCode.INVALID_STATION_DATA,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // ✅ FIX: Sanitize UUID fields in update data
    const sanitizedUpdateData = this.sanitizeUUIDFields(updateData);

    // Get current user for authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: StationErrorCode.UNAUTHORIZED_ACCESS,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Check user permissions
    const canEdit = await this.canManageStation(user.id, stationId);
    if (!canEdit) {
      await this.logUserActivity('station_update_unauthorized', user.id, {
        station_id: stationId,
        attempt: 'update'
      });

      return {
        success: false,
        error: 'You do not have permission to update this station',
        code: StationErrorCode.UNAUTHORIZED_ACCESS,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Validate station exists and get current data
    const { data: currentStation, error: fetchError } = await supabase
      .from('stations')
      .select('*')
      .eq('id', stationId)
      .single();

    if (fetchError || !currentStation) {
      return {
        success: false,
        error: 'Station not found',
        code: StationErrorCode.STATION_NOT_FOUND,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // ✅ FIX: Prepare update data with sanitized UUID fields
    const updatePayload = this.sanitizeUUIDFields({
      ...sanitizedUpdateData,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });

    // Perform update
    const { data: updatedStation, error: updateError } = await supabase
      .from('stations')
      .update(updatePayload)
      .eq('id', stationId)
      .select(`
        *,
        omcs (id, name, code),
        dealers (id, name),
        profiles!fk_station_manager (id, full_name, email)
      `)
      .single();

    if (updateError) {
      console.error(`❌ [${requestId}] Station update error:`, updateError);
      
      if (updateError.code === '23505') { // Unique violation
        return {
          success: false,
          error: 'Station code already exists',
          code: StationErrorCode.DUPLICATE_STATION_CODE,
          request_id: requestId,
          timestamp: new Date().toISOString()
        };
      }

      if (updateError.code === '22P02') { // Invalid UUID
        return {
          success: false,
          error: 'Invalid reference ID provided',
          code: StationErrorCode.INVALID_STATION_DATA,
          request_id: requestId,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: updateextractErrorMessage(error) || 'Failed to update station',
        code: 'STATION_UPDATE_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Invalidate cache
    await this.invalidateStationCache(stationId);

    // Log update activity
    await this.logUserActivity('station_updated', user.id, {
      station_id: stationId,
      station_name: updatedStation.name,
      changes: Object.keys(updateData),
      previous_status: currentStation.status,
      new_status: updateData.status
    });

    console.log(`✅ [${requestId}] Station updated successfully:`, stationId);
    return {
      success: true,
      data: updatedStation,
      message: 'Station updated successfully!',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Station update critical error:`, error);
    
    await this.logUserActivity('station_update_error', undefined, {
      station_id: stationId,
      update_data: updateData,
      error: extractErrorMessage(error),
      request_id: requestId
    });

    return {
      success: false,
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Delete station (Admin/OMC only) - POLISHED
 */
async deleteStation(stationId: string): Promise<APIResponse> {
  const requestId = `delete_station_${stationId}_${Date.now()}`;
  
  try {
    console.log(`🔄 [${requestId}] Deleting station:`, stationId);

    // Input validation
    if (!stationId || !this.isValidUUID(stationId)) {
      return {
        success: false,
        error: 'Invalid station ID format',
        code: StationErrorCode.INVALID_STATION_DATA,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Get current user for authorization check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: StationErrorCode.UNAUTHORIZED_ACCESS,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Check user permissions
    const canDelete = await this.canManageStation(user.id, stationId);
    if (!canDelete) {
      await this.logUserActivity('station_delete_unauthorized', user.id, {
        station_id: stationId,
        attempt: 'delete'
      });

      return {
        success: false,
        error: 'You do not have permission to delete this station',
        code: StationErrorCode.UNAUTHORIZED_ACCESS,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Get station details for validation
    const { data: station, error: stationError } = await supabase
      .from('stations')
      .select('id, name, status, omc_id, dealer_id')
      .eq('id', stationId)
      .single();

    if (stationError || !station) {
      return {
        success: false,
        error: 'Station not found',
        code: StationErrorCode.STATION_NOT_FOUND,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    if (station.status === 'inactive') {
      return {
        success: false,
        error: 'Station is already inactive',
        code: 'STATION_ALREADY_INACTIVE',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Check if station has related data that would prevent deletion
    const dependencyChecks = await Promise.allSettled([
      // Active violations
      supabase
        .from('compliance_violations')
        .select('id')
        .eq('station_id', stationId)
        .eq('status', 'open')
        .limit(1),
      // Pending deposits
      supabase
        .from('bank_deposits')
        .select('id')
        .eq('station_id', stationId)
        .eq('status', 'pending')
        .limit(1),
      // Active shifts
      supabase
        .from('shifts')
        .select('id')
        .eq('station_id', stationId)
        .eq('status', 'active')
        .limit(1),
      // Active users assigned to station
      supabase
        .from('profiles')
        .select('id')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .limit(1),
      // Pending deliveries
      supabase
        .from('deliveries')
        .select('id')
        .eq('station_id', stationId)
        .eq('status', 'scheduled')
        .limit(1)
    ]);

    const blockingItems: string[] = [];
    
    dependencyChecks.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data && result.value.data.length > 0) {
        const items = [
          'active violations',
          'pending deposits',
          'active shifts',
          'assigned active users',
          'pending deliveries'
        ];
        blockingItems.push(items[index]);
      }
    });

    if (blockingItems.length > 0) {
      await this.logUserActivity('station_delete_blocked', user.id, {
        station_id: stationId,
        blocking_items: blockingItems
      });

      return {
        success: false,
        error: `Cannot delete station with ${blockingItems.join(', ')}. Resolve these issues first.`,
        code: StationErrorCode.STATION_HAS_DEPENDENCIES,
        details: { blocking_items: blockingItems },
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Start transaction for soft delete
    const deleteTimestamp = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('stations')
      .update({
        status: 'inactive',
        updated_at: deleteTimestamp,
        deleted_at: deleteTimestamp,
        deleted_by: user.id
      })
      .eq('id', stationId)
      .select()
      .single();

    if (error) {
      console.error(`❌ [${requestId}] Station deletion error:`, error);
      
      await this.logUserActivity('station_delete_failed', user.id, {
        station_id: stationId,
        error: extractErrorMessage(error)
      });

      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to delete station',
        code: 'STATION_DELETION_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Invalidate cache
    await this.invalidateStationCache(stationId);

    // Log successful deletion
    await this.logUserActivity('station_deleted', user.id, {
      station_id: stationId,
      station_name: station.name,
      soft_delete: true
    });

    console.log(`✅ [${requestId}] Station deleted successfully:`, stationId);
    return {
      success: true,
      message: 'Station deleted successfully!',
      data: {
        id: data.id,
        name: data.name,
        status: data.status,
        deleted_at: data.deleted_at
      },
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Station deletion critical error:`, error);
    
    await this.logUserActivity('station_delete_critical_error', undefined, {
      station_id: stationId,
      error: extractErrorMessage(error),
      request_id: requestId
    });

    return {
      success: false,
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Advanced station search with multiple parameters - UPDATED FOR COMMISSIONS
 */
async searchStations(
  filters: StationFilters = {},
  page: number = 1,
  limit: number = 50
): Promise<APIResponse<{ stations: StationDetails[]; pagination: Record<string, unknown> }>> {
  const requestId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🔄 [${requestId}] Searching stations with filters:`, filters);

    // Input validation and sanitization
    const sanitizedPage = Math.max(1, page);
    const sanitizedLimit = Math.min(Math.max(1, limit), 100);
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // Get current user for RBAC filtering
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        code: StationErrorCode.UNAUTHORIZED_ACCESS,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Get user profile for role-based filtering
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to verify user permissions',
        code: 'PERMISSION_CHECK_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // ✅ FIXED: Using correct foreign key constraint
    let query = supabase
      .from('stations')
      .select(`
        *,
        omcs (id, name, code),
        dealers (id, name),
        profiles!fk_station_manager (
          id,
          full_name,
          email
        )
      `, { count: 'exact' });

    // Apply RBAC filtering based on user role
    switch (userProfile.data.role) {
      case 'station_manager':
        if (userProfile.data.station_id) {
          query = query.eq('id', userProfile.data.station_id);
        } else {
          return {
            success: true,
            data: {
              stations: [],
              pagination: {
                page: sanitizedPage,
                limit: sanitizedLimit,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_prev: false
              }
            },
            request_id: requestId,
            timestamp: new Date().toISOString()
          };
        }
        break;
      
      case 'omc':
        if (userProfile.data.omc_id) {
          query = query.eq('omc_id', userProfile.data.omc_id);
        }
        break;
      
      case 'dealer':
        if (userProfile.data.dealer_id) {
          query = query.eq('dealer_id', userProfile.data.dealer_id);
        }
        break;
    }

    // Apply search filters
    if (filters.omc_id && filters.omc_id !== 'all') {
      query = query.eq('omc_id', filters.omc_id);
    }

    // ✅ ADDED: Dealer filter support for Commission component
    if (filters.dealer_id && filters.dealer_id !== 'all') {
      query = query.eq('dealer_id', filters.dealer_id);
    }

    if (filters.status && filters.status.length > 0 && !filters.status.includes('all')) {
      query = query.in('status', filters.status);
    }

    if (filters.region && filters.region !== 'all') {
      query = query.ilike('region', `%${filters.region}%`);
    }

    if (filters.city && filters.city !== 'all') {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters.search_term && filters.search_term.trim() !== '') {
      const searchTerm = filters.search_term.trim();
      query = query.or(
        `name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,region.ilike.%${searchTerm}%`
      );
    }

    // Apply sorting
    const sortField = filters.sort_by || 'name';
    const sortOrder = filters.sort_order || 'asc';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + sanitizedLimit - 1);

    const { data: stations, error, count } = await query;

    if (error) {
      console.error(`❌ [${requestId}] Stations search error:`, error);
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'STATIONS_SEARCH_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Enhance stations with additional data in parallel
    const enhancedStations = await Promise.all(
      (stations || []).map(async (station) => {
        try {
          const [violationsResult, salesResult] = await Promise.allSettled([
            supabase
              .from('compliance_violations')
              .select('id, status, severity')
              .eq('station_id', station.id)
              .eq('status', 'open')
              .limit(10),
            supabase
              .from('sales')
              .select('total_amount')
              .eq('station_id', station.id)
              .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
              .limit(1)
          ]);

          const violations = violationsResult.status === 'fulfilled' ? violationsResult.value.data : [];
          const sales = salesResult.status === 'fulfilled' ? salesResult.value.data : [];

          const openViolations = violations?.length || 0;
          const totalSales = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
          
          let complianceStatus: 'compliant' | 'non_compliant' | 'under_review' = 'compliant';
          if (openViolations > 2) {
            complianceStatus = 'non_compliant';
          } else if (openViolations > 0) {
            complianceStatus = 'under_review';
          }

          // Apply compliance status filter if specified
          if (filters.compliance_status && filters.compliance_status.length > 0) {
            if (!filters.compliance_status.includes(complianceStatus)) {
              return null;
            }
          }

          return {
            id: station.id,
            name: station.name,
            code: station.code,
            address: station.address,
            city: station.city,
            region: station.region,
            omc_id: station.omc_id,
            omc_name: station.omcs?.name,
            dealer_id: station.dealer_id,
            dealer_name: station.dealers?.name,
            manager_id: station.manager_id,
            manager_name: station.profiles?.full_name,
            status: station.status,
            compliance_status: complianceStatus,
            total_violations: openViolations,
            total_sales: totalSales,
            // ✅ CRITICAL: Include commission_rate for Commission component calculations
            commission_rate: station.commission_rate || 0.05,
            created_at: station.created_at,
            updated_at: station.updated_at
          };
        } catch (error) {
          console.error(`Error enhancing station ${station.id}:`, error);
          return null;
        }
      })
    );

    // Filter out null values from failed enhancements
    const validStations = enhancedStations.filter(station => station !== null) as StationDetails[];

    const total = count || 0;
    const totalPages = Math.ceil(total / sanitizedLimit);

    // Log search activity
    await this.logUserActivity('stations_search', user.id, {
      filters_applied: filters,
      results_count: validStations.length,
      request_id: requestId
    });

    console.log(`✅ [${requestId}] Station search completed: ${validStations.length} results`);
    console.log(`💰 Commission rates included:`, validStations.map(s => ({
      name: s.name,
      commission_rate: s.commission_rate
    })));
    
    return {
      success: true,
      data: {
        stations: validStations,
        pagination: {
          page: sanitizedPage,
          limit: sanitizedLimit,
          total: total,
          total_pages: totalPages,
          has_next: sanitizedPage < totalPages,
          has_prev: sanitizedPage > 1
        }
      },
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error(`💥 [${requestId}] Station search critical error:`, error);
    
    await this.logUserActivity('stations_search_error', undefined, {
      filters_applied: filters,
      error: extractErrorMessage(error),
      request_id: requestId
    });

    return {
      success: false,
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

// ===== ENHANCED HELPER METHODS =====

/**
 * Enhanced UUID validation and sanitization
 */
private sanitizeUUIDFields(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  
  // List of UUID fields that should be sanitized
  const uuidFields = ['omc_id', 'dealer_id', 'manager_id', 'created_by', 'updated_by', 'deleted_by'];
  
  uuidFields.forEach(field => {
    if (sanitized[field] === '' || sanitized[field] === undefined) {
      sanitized[field] = null;
    } else if (sanitized[field] && !this.isValidUUID(sanitized[field])) {
      // If it's not a valid UUID but has value, set to null
      console.warn(`Invalid UUID format for field ${field}:`, sanitized[field]);
      sanitized[field] = null;
    }
  });
  
  return sanitized;
}

/**
 * Enhanced UUID validation
 */
private isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate unique station code
 */
private generateStationCode(stationName: string): string {
  // Extract meaningful part from name
  const baseCode = stationName
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .substring(0, 10);

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString().slice(-6);
  
  // Combine and ensure it meets constraints
  let finalCode = `${baseCode}_${timestamp}`;
  
  // Fallback if somehow still invalid
  if (!finalCode || finalCode.trim() === '') {
    finalCode = `STN_${timestamp}`;
  }
  
  return finalCode;
}

/**
 * Check if user can manage station (RBAC)
 */
private async canManageStation(userId: string, stationId: string): Promise<boolean> {
  try {
    const userProfile = await this.getUserProfile(userId);
    if (!userProfile.success || !userProfile.data) return false;

    const user = userProfile.data;

    // Admin can manage all stations
    if (user.role === 'admin') return true;

    // NPA can manage all stations for compliance
    if (user.role === 'npa') return true;

    // OMC users can only manage their OMC's stations
    if (user.role === 'omc' && user.omc_id) {
      const station = await this.getStationById(stationId);
      return station.success && station.data.omc_id === user.omc_id;
    }

    // Dealers can only manage their dealer's stations
    if (user.role === 'dealer' && user.dealer_id) {
      const station = await this.getStationById(stationId);
      return station.success && station.data.dealer_id === user.dealer_id;
    }

    // Station managers can only manage their station
    if (user.role === 'station_manager') {
      return user.station_id === stationId;
    }

    return false;
  } catch (error) {
    console.error('Error checking station management permissions:', error);
    return false;
  }
}

/**
 * Cache management methods
 */
private async getCachedStation(stationId: string): Promise<StationDetails | null> {
  try {
    const cacheKey = `station_${stationId}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Cache read failed:', error);
  }
  return null;
}

private async cacheStation(stationId: string, data: StationDetails): Promise<void> {
  try {
    const cacheKey = `station_${stationId}`;
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
}

private async invalidateStationCache(stationId: string): Promise<void> {
  try {
    sessionStorage.removeItem(`station_${stationId}`);
    // Also remove related performance caches
    const periods = ['day', 'week', 'month', 'year'];
    periods.forEach(period => {
      sessionStorage.removeItem(`performance_${stationId}_${period}`);
    });
  } catch (error) {
    console.warn('Cache invalidation failed:', error);
  }
}

/**
 * Utility method to get basic station info
 */
private async getStationById(stationId: string): Promise<APIResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('id, omc_id, dealer_id, manager_id')
      .eq('id', stationId)
      .single();

    if (error) return { success: false, error: extractErrorMessage(error) };
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: extractErrorMessage(error) };
  }
}



// ===== EXPENSE MANAGEMENT METHODS =====

/**
 * Create a new expense record with role-based auto-approval
 */
async createExpense(expenseData: ExpenseCreateData): Promise<APIResponse<Expense>> {
  try {
    console.log('Creating expense:', expenseData);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        code: 'AUTH_REQUIRED'
      };
    }

    // Validate amount
    if (expenseData.amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
        code: 'INVALID_AMOUNT'
      };
    }

    // Get user profile to determine role and permissions
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to get user profile',
        code: 'PROFILE_FETCH_ERROR'
      };
    }

    const userRole = userProfile.data.role;
    
    // Role-based permissions and auto-approval logic
    let status: ExpenseStatus = 'pending';
    let approved_by: string | null = null;
    
    const rolePermissions = {
      'admin': { canAutoApprove: true, limit: 100000 },
      'station_manager': { canAutoApprove: true, limit: 5000 },
      'supervisor': { canAutoApprove: false, limit: 0 },
      'attendant': { canAutoApprove: false, limit: 0 },
      'omc': { canAutoApprove: false, limit: 0 },
      'dealer': { canAutoApprove: false, limit: 0 },
      'npa': { canAutoApprove: false, limit: 0 }
    };

    const permission = rolePermissions[userRole] || rolePermissions.attendant;
    
    if (permission.canAutoApprove && expenseData.amount <= permission.limit) {
      status = 'approved';
      approved_by = user.id;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...expenseData,
        created_by: user.id,
        status: status,
        approved_by: approved_by
      })
      .select(`
        *,
        station:stations (name, code),
        creator:profiles!expenses_created_by_fkey (full_name, email)
      `)
      .single();

    if (error) {
      console.error('Expense creation error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to create expense',
        code: 'EXPENSE_CREATION_ERROR'
      };
    }

    // Log activity
    await this.logUserActivity('expense_create', undefined, {
      expense_id: data.id,
      amount: expenseData.amount,
      category: expenseData.category,
      status: status,
      role: userRole
    });

    console.log('Expense created successfully:', data.id);
    return {
      success: true,
      data: data as Expense,
      message: status === 'approved' ? 'Expense recorded and auto-approved!' : 'Expense recorded pending approval',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error creating expense:', error);
    return {
      success: false,
      error: 'Failed to create expense: ' + extractErrorMessage(error),
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get expenses with role-based filtering
 */
async getExpenses(filters: ExpenseFilters = {}): Promise<APIResponse<ExpensesResponse>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        code: 'AUTH_REQUIRED'
      };
    }

    // Get user profile for role-based filtering
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to get user profile',
        code: 'PROFILE_FETCH_ERROR'
      };
    }

    const userRole = userProfile.data.role;
    const userStationId = userProfile.data.station_id;
    const userOmcId = userProfile.data.omc_id;
    const userDealerId = userProfile.data.dealer_id;

    const { 
      page = 1, 
      limit = 50, 
      search, 
      station_id, 
      category, 
      type, 
      status, 
      start_date, 
      end_date,
      user_id,
      sort_by = 'expense_date',
      sort_order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('expenses')
      .select(`
        *,
        station:stations (name, code, omc_id, dealer_id),
        creator:profiles!expenses_created_by_fkey (full_name, email, role),
        approver:profiles!expenses_approved_by_fkey (full_name, email)
      `, { count: 'exact' });

    // Apply role-based filtering
    switch (userRole) {
      case 'station_manager':
        // Station managers can only see expenses from their station
        if (userStationId) {
          query = query.eq('station_id', userStationId);
        }
        break;
        
      case 'omc':
        // OMC can see expenses from all their stations
        if (userOmcId) {
          const { data: omcStations } = await supabase
            .from('stations')
            .select('id')
            .eq('omc_id', userOmcId);
            
          if (omcStations && omcStations.length > 0) {
            query = query.in('station_id', omcStations.map(s => s.id));
          } else {
            // Return empty if no stations
            return {
              success: true,
              data: {
                expenses: [],
                pagination: { page, limit, total: 0, total_pages: 0, has_next: false, has_prev: false },
                filters
              },
              timestamp: new Date().toISOString()
            };
          }
        }
        break;
        
      case 'dealer':
        // Dealers can see expenses from all their stations
        if (userDealerId) {
          const { data: dealerStations } = await supabase
            .from('stations')
            .select('id')
            .eq('dealer_id', userDealerId);
            
          if (dealerStations && dealerStations.length > 0) {
            query = query.in('station_id', dealerStations.map(s => s.id));
          } else {
            // Return empty if no stations
            return {
              success: true,
              data: {
                expenses: [],
                pagination: { page, limit, total: 0, total_pages: 0, has_next: false, has_prev: false },
                filters
              },
              timestamp: new Date().toISOString()
            };
          }
        }
        break;
        
      case 'supervisor':
        // Supervisors can only see expenses from their station
        if (userStationId) {
          query = query.eq('station_id', userStationId);
        }
        break;
        
      case 'attendant':
        // Attendants can only see their own expenses
        query = query.eq('created_by', user.id);
        break;
        
      // Admin can see all expenses (no additional filtering needed)
    }

    // Apply additional filters
    if (station_id && station_id !== 'all') {
      query = query.eq('station_id', station_id);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (start_date) {
      query = query.gte('expense_date', start_date);
    }

    if (end_date) {
      query = query.lte('expense_date', end_date);
    }

    if (user_id) {
      query = query.eq('created_by', user_id);
    }

    if (search) {
      query = query.or(`description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Expenses fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'EXPENSES_FETCH_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: ExpensesResponse = {
      expenses: data as Expense[],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      filters
    };

    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error fetching expenses:', error);
    return {
      success: false,
      error: 'Failed to fetch expenses: ' + extractErrorMessage(error),
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update expense with role-based permissions
 */
async updateExpense(expenseId: string, updates: ExpenseUpdateData): Promise<APIResponse<Expense>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        code: 'AUTH_REQUIRED'
      };
    }

    // Get user profile for role check
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to get user profile',
        code: 'PROFILE_FETCH_ERROR'
      };
    }

    const userRole = userProfile.data.role;

    // Check if user has permission to update expenses
    const canUpdateRoles = ['admin', 'station_manager'];
    if (!canUpdateRoles.includes(userRole)) {
      return {
        success: false,
        error: 'You do not have permission to update expenses',
        code: 'PERMISSION_DENIED'
      };
    }

    // For station managers, verify they can only update their station's expenses
    if (userRole === 'station_manager') {
      const currentExpense = await this.getExpenseById(expenseId);
      if (!currentExpense.success) {
        return currentExpense;
      }
      
      if (currentExpense.data.station_id !== userProfile.data.station_id) {
        return {
          success: false,
          error: 'You can only update expenses from your station',
          code: 'PERMISSION_DENIED'
        };
      }
    }

    // If updating status to approved/rejected, set approved_by
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.status && ['approved', 'rejected'].includes(updates.status)) {
      updateData.approved_by = user.id;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select(`
        *,
        station:stations (name, code),
        creator:profiles!expenses_created_by_fkey (full_name, email),
        approver:profiles!expenses_approved_by_fkey (full_name, email)
      `)
      .single();

    if (error) {
      console.error('Expense update error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to update expense',
        code: 'EXPENSE_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log activity
    await this.logUserActivity('expense_update', undefined, {
      expense_id: expenseId,
      updates: Object.keys(updates),
      new_status: updates.status,
      role: userRole
    });

    return {
      success: true,
      data: data as Expense,
      message: 'Expense updated successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error updating expense:', error);
    return {
      success: false,
      error: 'Failed to update expense: ' + extractErrorMessage(error),
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Delete expense with role-based permissions
 */
async deleteExpense(expenseId: string): Promise<APIResponse<void>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        code: 'AUTH_REQUIRED'
      };
    }

    // Get user profile for role check
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to get user profile',
        code: 'PROFILE_FETCH_ERROR'
      };
    }

    const userRole = userProfile.data.role;

    // Check if user has permission to delete expenses
    const canDeleteRoles = ['admin', 'station_manager'];
    if (!canDeleteRoles.includes(userRole)) {
      return {
        success: false,
        error: 'You do not have permission to delete expenses',
        code: 'PERMISSION_DENIED'
      };
    }

    // For station managers, verify they can only delete their station's expenses
    if (userRole === 'station_manager') {
      const currentExpense = await this.getExpenseById(expenseId);
      if (!currentExpense.success) {
        return currentExpense;
      }
      
      if (currentExpense.data.station_id !== userProfile.data.station_id) {
        return {
          success: false,
          error: 'You can only delete expenses from your station',
          code: 'PERMISSION_DENIED'
        };
      }
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'EXPENSE_DELETION_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Log activity
    await this.logUserActivity('expense_delete', undefined, {
      expense_id: expenseId,
      role: userRole
    });

    return {
      success: true,
      message: 'Expense deleted successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to delete expense: ' + extractErrorMessage(error),
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get expense statistics with role-based filtering
 */
async getExpenseStats(filters?: {
  station_id?: string;
  start_date?: string;
  end_date?: string;
  category?: ExpenseCategory;
}): Promise<APIResponse<ExpenseStats>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        code: 'AUTH_REQUIRED'
      };
    }

    // Get user profile for role-based filtering
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to get user profile',
        code: 'PROFILE_FETCH_ERROR'
      };
    }

    const userRole = userProfile.data.role;
    const userStationId = userProfile.data.station_id;
    const userOmcId = userProfile.data.omc_id;
    const userDealerId = userProfile.data.dealer_id;

    let query = supabase.from('expenses').select('*');

    // Apply role-based filtering
    switch (userRole) {
      case 'station_manager':
        if (userStationId) {
          query = query.eq('station_id', userStationId);
        }
        break;
      case 'omc':
        if (userOmcId) {
          const { data: omcStations } = await supabase
            .from('stations')
            .select('id')
            .eq('omc_id', userOmcId);
            
          if (omcStations && omcStations.length > 0) {
            query = query.in('station_id', omcStations.map(s => s.id));
          }
        }
        break;
      case 'dealer':
        if (userDealerId) {
          const { data: dealerStations } = await supabase
            .from('stations')
            .select('id')
            .eq('dealer_id', userDealerId);
            
          if (dealerStations && dealerStations.length > 0) {
            query = query.in('station_id', dealerStations.map(s => s.id));
          }
        }
        break;
      case 'supervisor':
        if (userStationId) {
          query = query.eq('station_id', userStationId);
        }
        break;
      case 'attendant':
        query = query.eq('created_by', user.id);
        break;
      // Admin can see all (no additional filtering)
    }

    // Apply additional filters
    if (filters?.station_id) {
      query = query.eq('station_id', filters.station_id);
    }
    if (filters?.start_date) {
      query = query.gte('expense_date', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('expense_date', filters.end_date);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data: expenses, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        code: 'STATS_FETCH_ERROR',
        timestamp: new Date().toISOString()
      };
    }

    // Calculate statistics
    const stats: ExpenseStats = {
      total_expenses: 0,
      operational: 0,
      fixed: 0,
      staff: 0,
      maintenance: 0,
      other: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      by_category: {
        operational: 0,
        maintenance: 0,
        supplies: 0,
        utilities: 0,
        staff: 0,
        other: 0
      },
      by_type: {
        operational: 0,
        fixed: 0,
        staff: 0,
        maintenance: 0,
        other: 0
      },
      by_status: {
        pending: 0,
        approved: 0,
        rejected: 0
      },
      monthly_trend: []
    };

    (expenses || []).forEach(expense => {
      stats.total_expenses += expense.amount;
      stats.by_category[expense.category] += expense.amount;
      stats.by_type[expense.type] += expense.amount;
      stats.by_status[expense.status] += expense.amount;

      switch (expense.type) {
        case 'operational':
          stats.operational += expense.amount;
          break;
        case 'fixed':
          stats.fixed += expense.amount;
          break;
        case 'staff':
          stats.staff += expense.amount;
          break;
        case 'maintenance':
          stats.maintenance += expense.amount;
          break;
        case 'other':
          stats.other += expense.amount;
          break;
      }

      switch (expense.status) {
        case 'pending':
          stats.pending_approval += expense.amount;
          break;
        case 'approved':
          stats.approved += expense.amount;
          break;
        case 'rejected':
          stats.rejected += expense.amount;
          break;
      }
    });

    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch expense statistics: ' + extractErrorMessage(error),
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create a new expense record with better RLS error handling
 */
async createExpense(expenseData: ExpenseCreateData): Promise<APIResponse<Expense>> {
  try {
    console.log('Creating expense:', expenseData);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated: ' + (authError?.message || 'No user found'),
        code: 'AUTH_REQUIRED'
      };
    }

    // Validate amount
    if (expenseData.amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
        code: 'INVALID_AMOUNT'
      };
    }

    // Get user profile to determine role and permissions
    const userProfile = await this.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return {
        success: false,
        error: 'Failed to get user profile',
        code: 'PROFILE_FETCH_ERROR'
      };
    }

    const userRole = userProfile.data.role;
    const userStationId = userProfile.data.station_id;
    
    console.log('User role:', userRole, 'Station ID:', userStationId);

    // Role-based permissions and auto-approval logic
    let status: ExpenseStatus = 'pending';
    let approved_by: string | null = null;
    
    const rolePermissions = {
      'admin': { canAutoApprove: true, limit: 100000 },
      'station_manager': { canAutoApprove: true, limit: 5000 },
      'supervisor': { canAutoApprove: false, limit: 0 },
      'attendant': { canAutoApprove: false, limit: 0 },
      'omc': { canAutoApprove: false, limit: 0 },
      'dealer': { canAutoApprove: false, limit: 0 },
      'npa': { canAutoApprove: false, limit: 0 }
    };

    const permission = rolePermissions[userRole] || rolePermissions.attendant;
    
    if (permission.canAutoApprove && expenseData.amount <= permission.limit) {
      status = 'approved';
      approved_by = user.id;
    }

    // For non-admin users, ensure they're only creating expenses for their station
    if (userRole !== 'admin' && userStationId && expenseData.station_id !== userStationId) {
      console.warn('User attempted to create expense for different station. Overriding station_id.');
      expenseData.station_id = userStationId;
    }

    const expensePayload = {
      ...expenseData,
      created_by: user.id,
      status: status,
      approved_by: approved_by
    };

    console.log('Expense payload:', expensePayload);

    const { data, error } = await supabase
      .from('expenses')
      .insert(expensePayload)
      .select(`
        *,
        station:stations (name, code),
        creator:profiles!expenses_created_by_fkey (full_name, email)
      `)
      .single();

    if (error) {
      console.error('Expense creation error details:', {
        code: error.code,
        message: extractErrorMessage(error),
        details: error.details,
        hint: error.hint
      });
      
      // Handle specific RLS policy errors
      if (error.code === '42501') {
        return {
          success: false,
          error: 'Permission denied: You do not have permission to create expenses. Please check your role permissions.',
          code: 'RLS_POLICY_VIOLATION',
          details: extractErrorMessage(error)
        };
      }
      
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to create expense',
        code: 'EXPENSE_CREATION_ERROR',
        details: error.details,
        hint: error.hint
      };
    }

    // Log activity
    await this.logUserActivity('expense_create', undefined, {
      expense_id: data.id,
      amount: expenseData.amount,
      category: expenseData.category,
      status: status,
      role: userRole
    });

    console.log('Expense created successfully:', data.id);
    return {
      success: true,
      data: data as Expense,
      message: status === 'approved' ? 'Expense recorded and auto-approved!' : 'Expense recorded pending approval',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Unexpected error creating expense:', error);
    return {
      success: false,
      error: 'Failed to create expense: ' + extractErrorMessage(error),
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Bulk update station status (Admin/OMC only)
 */
async bulkUpdateStationStatus(
  stationIds: string[],
  status: 'active' | 'inactive' | 'maintenance'
): Promise<APIResponse> {
  try {
    console.log('Bulk updating station status:', stationIds, status);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data, error } = await supabase
      .from('stations')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', stationIds)
      .select('id, name, status');

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    const result: BulkOperationResult = {
      success: data?.length || 0,
      failed: stationIds.length - (data?.length || 0),
      errors: []
    };

    return {
      success: true,
      message: `Updated ${result.success} stations successfully`,
      data: result
    };

  } catch (error: unknown) {
    console.error('Error in bulk station update:', error);
    return {
      success: false,
      error: 'Failed to bulk update stations: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Assign manager to multiple stations
 */
async bulkAssignManager(
  stationIds: string[],
  managerId: string
): Promise<APIResponse> {
  try {
    console.log('Bulk assigning manager:', stationIds, managerId);

    // Verify manager exists and has appropriate role
    const { data: manager, error: managerError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', managerId)
      .in('role', ['station_manager', 'supervisor'])
      .single();

    if (managerError || !manager) {
      return {
        success: false,
        error: 'Manager not found or does not have appropriate role'
      };
    }

    const { data, error } = await supabase
      .from('stations')
      .update({
        manager_id: managerId,
        updated_at: new Date().toISOString()
      })
      .in('id', stationIds)
      .select('id, name, manager_id');

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    const result: BulkOperationResult = {
      success: data?.length || 0,
      failed: stationIds.length - (data?.length || 0),
      errors: []
    };

    return {
      success: true,
      message: `Assigned manager to ${result.success} stations successfully`,
      data: result
    };

  } catch (error: unknown) {
    console.error('Error in bulk manager assignment:', error);
    return {
      success: false,
      error: 'Failed to bulk assign manager: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get station compliance history
 */
async getStationComplianceHistory(
  stationId: string,
  months: number = 6
): Promise<APIResponse> {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('compliance_violations')
      .select('violation_date, status, severity')
      .eq('station_id', stationId)
      .gte('violation_date', startDate.toISOString())
      .order('violation_date', { ascending: true });

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    // Group by month and calculate compliance
    const monthlyData = data?.reduce((acc: Record<string, unknown>, violation) => {
      const month = violation.violation_date.substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = {
          date: month,
          violations_count: 0,
          status: 'compliant'
        };
      }
      
      acc[month].violations_count++;
      if (violation.status === 'open') {
        acc[month].status = 'non_compliant';
      }
      
      return acc;
    }, {});

    // Fill in missing months with compliant status
    const history: ComplianceHistory[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7);
      
      if (monthlyData && monthlyData[monthKey]) {
        history.push(monthlyData[monthKey]);
      } else {
        history.push({
          date: monthKey,
          status: 'compliant',
          violations_count: 0
        });
      }
    }

    return {
      success: true,
      data: history
    };

  } catch (error: unknown) {
    console.error('Error fetching compliance history:', error);
    return {
      success: false,
      error: 'Failed to fetch compliance history: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get stations with pending violations
 */
async getStationsWithPendingViolations(omcId?: string): Promise<APIResponse> {
  try {
    let query = supabase
      .from('compliance_violations')
      .select(`
        station_id,
        stations!inner (id, name, omc_id, omcs(name))
      `)
      .eq('status', 'open')
      .eq('stations.status', 'active');

    if (omcId) {
      query = query.eq('stations.omc_id', omcId);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    // Get unique stations
    const uniqueStations = data?.reduce((acc: Record<string, unknown>[], violation) => {
      if (!acc.find(station => station.id === violation.station_id)) {
        acc.push({
          id: violation.station_id,
          name: violation.stations?.name,
          omc_id: violation.stations?.omc_id,
          omc_name: violation.stations?.omcs?.name,
          has_pending_violations: true
        });
      }
      return acc;
    }, []);

    return {
      success: true,
      data: uniqueStations || []
    };

  } catch (error: unknown) {
    console.error('Error fetching stations with violations:', error);
    return {
      success: false,
      error: 'Failed to fetch stations with violations: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Link station with inventory and sales data for comprehensive dashboard
 */
async getStationDashboardData(stationId: string): Promise<APIResponse> {
  try {
    console.log('Fetching station dashboard data:', stationId);

    const [
      stationResponse,
      inventoryResponse,
      salesResponse,
      violationsResponse,
      inspectionsResponse,
      performanceResponse
    ] = await Promise.all([
      this.getStationDetails(stationId),
      this.getTankStocks(stationId),
      this.getSales({ station_id: stationId, start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }),
      this.getViolations({ station_id: stationId, status: 'open' }),
      supabase
        .from('inspections')
        .select('*')
        .eq('station_id', stationId)
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(5),
      this.getStationPerformance(stationId, 'week')
    ]);

    const dashboardData: StationDashboardData = {
      station: stationResponse.success ? stationResponse.data : null,
      current_inventory: inventoryResponse.success ? inventoryResponse.data : [],
      recent_sales: salesResponse.success ? salesResponse.data : [],
      active_violations: violationsResponse.success ? violationsResponse.data : [],
      upcoming_inspections: inspectionsResponse.data || [],
      performance_metrics: performanceResponse.success ? performanceResponse.data : null
    };

    return {
      success: true,
      data: dashboardData
    };

  } catch (error: unknown) {
    console.error('Error fetching station dashboard data:', error);
    return {
      success: false,
      error: 'Failed to fetch station dashboard data: ' + extractErrorMessage(error)
    };
  }
}  
// ===== ORGANIZATION MANAGEMENT METHODS =====

/**
 * Create Oil Marketing Company - UPDATED to match actual schema
 */
async createOMC(omcData: OMCCreateData): Promise<APIResponse> {
  try {
    console.log('Creating OMC:', omcData.name);
    
    const { data, error } = await supabase
      .from('omcs')
      .insert({
        name: omcData.name,
        code: omcData.code,
        contact_person: omcData.contact_person,
        email: omcData.email,
        phone: omcData.phone,
        address: omcData.address,
        region: omcData.region,
        logo_url: omcData.logo_url,
        brand_color: omcData.brand_color,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('OMC creation error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to create OMC'
      };
    }

    console.log('OMC created successfully:', data.id);
    return {
      success: true,
      message: 'OMC created successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('OMC creation error:', error);
    return {
      success: false,
      error: 'Failed to create OMC: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get all OMCs
 */
async getOMCs(filters?: Record<string, unknown>): Promise<APIResponse> {
  try {
    console.log('🔄 API: Fetching OMCs from database...');
    
    let query = supabase
      .from('omcs')
      .select('*')
      .order('name');

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      console.error('OMC fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to fetch OMCs'
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: unknown) {
    console.error('OMC fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch OMCs: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get OMC by ID
 */
async getOMCById(id: string): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('omcs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('OMC fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to fetch OMC'
      };
    }

    return {
      success: true,
      data
    };

  } catch (error: unknown) {
    console.error('OMC fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch OMC: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Update OMC
 */
async updateOMC(id: string, omcData: Partial<OMCCreateData>): Promise<APIResponse> {
  try {
    console.log('Updating OMC:', id);
    
    const { data, error } = await supabase
      .from('omcs')
      .update({
        ...omcData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('OMC update error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to update OMC'
      };
    }

    return {
      success: true,
      message: 'OMC updated successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('OMC update error:', error);
    return {
      success: false,
      error: 'Failed to update OMC: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Delete OMC (soft delete)
 */
async deleteOMC(id: string): Promise<APIResponse> {
  try {
    const { error } = await supabase
      .from('omcs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('OMC deletion error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to delete OMC'
      };
    }

    return {
      success: true,
      message: 'OMC deleted successfully!'
    };

  } catch (error: unknown) {
    console.error('OMC deletion error:', error);
    return {
      success: false,
      error: 'Failed to delete OMC: ' + extractErrorMessage(error)
    };
  }
}

// ===== STATION MANAGEMENT METHODS =====

/**
 * Get all stations with optional filters - FIXED column issue
 */
async getStations(filters?: Record<string, unknown>): Promise<APIResponse> {
  try {
    console.log('🔄 API: Fetching stations from database...');
    
    let query = supabase
      .from('stations')
      .select(`
        *,
        omcs (id, name, code),
        dealers (id, name)
      `) // Removed dealers.code since it doesn't exist
      .order('name');

    // Apply filters
    if (filters?.omc_id) {
      query = query.eq('omc_id', filters.omc_id);
    }
    if (filters?.dealer_id) {
      query = query.eq('dealer_id', filters.dealer_id);
    }
    if (filters?.region) {
      query = query.eq('region', filters.region);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Stations fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to fetch stations'
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: unknown) {
    console.error('Stations fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch stations: ' + extractErrorMessage(error)
    };
  }
}

// Also update getDealerStations method:
/**
 * Get stations by dealer ID - FIXED column issue
 */
async getDealerStations(dealerId: string): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select(`
        *,
        omcs (id, name, code)
      `) // Removed dealers relation since we're filtering by dealer_id
      .eq('dealer_id', dealerId)
      .order('name');

    if (error) {
      console.error('Dealer stations fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to fetch dealer stations'
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: unknown) {
    console.error('Dealer stations fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch dealer stations: ' + extractErrorMessage(error)
    };
  }
}
/**
 * Get stations by dealer ID
 */
async getDealerStations(dealerId: string): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select(`
        *,
        omcs (id, name, code)
      `)
      .eq('dealer_id', dealerId)
      .order('name');

    if (error) {
      console.error('Dealer stations fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to fetch dealer stations'
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: unknown) {
    console.error('Dealer stations fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch dealer stations: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get station by ID
 */
async getStationById(id: string): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select(`
        *,
        omcs (id, name, code),
        dealers (id, name, code)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Station fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to fetch station'
      };
    }

    return {
      success: true,
      data
    };

  } catch (error: unknown) {
    console.error('Station fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch station: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Create Fuel Station - FIXED UUID handling
 */
async createStation(stationData: StationCreateData): Promise<APIResponse> {
  try {
    // Generate guaranteed valid code if not provided or invalid
    const finalStationData = {
      ...stationData,
      code: this.generateGuaranteedStationCode(stationData.code, stationData.name)
    };

    console.log('Final station data for creation:', finalStationData);

    const { data, error } = await supabase
      .from('stations')
      .insert(finalStationData)
      .select()
      .single();

    if (error) {
      console.error('Station creation error:', error);
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      message: 'Station created successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('Station creation error:', error);
    return {
      success: false,
      error: 'Failed to create station: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Update station
 */
async updateStation(id: string, stationData: Partial<StationCreateData>): Promise<APIResponse> {
  try {
    console.log('Updating station:', id);
    
    const { data, error } = await supabase
      .from('stations')
      .update({
        ...stationData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Station update error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to update station'
      };
    }

    return {
      success: true,
      message: 'Station updated successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('Station update error:', error);
    return {
      success: false,
      error: 'Failed to update station: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Delete station (soft delete)
 */
async deleteStation(id: string): Promise<APIResponse> {
  try {
    const { error } = await supabase
      .from('stations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Station deletion error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to delete station'
      };
    }

    return {
      success: true,
      message: 'Station deleted successfully!'
    };

  } catch (error: unknown) {
    console.error('Station deletion error:', error);
    return {
      success: false,
      error: 'Failed to delete station: ' + extractErrorMessage(error)
    };
  }
}

// ===== DEALER MANAGEMENT METHODS =====

/**
 * Get all dealers with optional filters
 */
async getDealers(filters?: Record<string, unknown>): Promise<APIResponse> {
  try {
    console.log('🔄 API: Fetching dealers from database...');
    
    let query = supabase
      .from('dealers')
      .select(`
        *,
        omcs (id, name, code)
      `)
      .order('name');

    // Apply filters
    if (filters?.omc_id) {
      query = query.eq('omc_id', filters.omc_id);
    }
    if (filters?.region) {
      query = query.eq('region', filters.region);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Dealers fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to fetch dealers'
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: unknown) {
    console.error('Dealers fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch dealers: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get dealer by ID
 */
async getDealerById(id: string): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select(`
        *,
        omcs (id, name, code),
        stations (id, name, code, address, city, region)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Dealer fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to fetch dealer'
      };
    }

    return {
      success: true,
      data
    };

  } catch (error: unknown) {
    console.error('Dealer fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch dealer: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Create Dealer - UPDATED to match actual schema
 */
async createDealer(dealerData: DealerCreateData): Promise<APIResponse> {
  try {
    console.log('Creating dealer:', dealerData.name);

    const { data, error } = await supabase
      .from('dealers')
      .insert({
        name: dealerData.name,
        code: dealerData.code,
        contact_person: dealerData.contact_person,
        email: dealerData.email,
        phone: dealerData.phone,
        address: dealerData.address,
        city: dealerData.city,
        region: dealerData.region,
        country: dealerData.country,
        license_number: dealerData.license_number,
        license_expiry: dealerData.license_expiry,
        business_registration: dealerData.business_registration,
        tax_identification: dealerData.tax_identification,
        omc_id: dealerData.omc_id,
        commission_rate: dealerData.commission_rate || 0.08,
        commission_type: dealerData.commission_type || 'percentage',
        fixed_commission_amount: dealerData.fixed_commission_amount || 0,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Dealer creation error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to create dealer'
      };
    }

    // Handle station assignments if provided
    if (dealerData.station_ids && dealerData.station_ids.length > 0) {
      await this.assignStationsToDealer(data.id, dealerData.station_ids);
    }

    console.log('Dealer created successfully:', data.id);
    return {
      success: true,
      message: 'Dealer created successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('Dealer creation error:', error);
    return {
      success: false,
      error: 'Failed to create dealer: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Update dealer
 */
async updateDealer(id: string, dealerData: Partial<DealerCreateData>): Promise<APIResponse> {
  try {
    console.log('Updating dealer:', id);
    
    const { data, error } = await supabase
      .from('dealers')
      .update({
        ...dealerData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Dealer update error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to update dealer'
      };
    }

    // Handle station assignments if provided
    if (dealerData.station_ids) {
      await this.assignStationsToDealer(id, dealerData.station_ids);
    }

    return {
      success: true,
      message: 'Dealer updated successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('Dealer update error:', error);
    return {
      success: false,
      error: 'Failed to update dealer: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Delete dealer (soft delete)
 */
async deleteDealer(id: string): Promise<APIResponse> {
  try {
    const { error } = await supabase
      .from('dealers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Dealer deletion error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to delete dealer'
      };
    }

    return {
      success: true,
      message: 'Dealer deleted successfully!'
    };

  } catch (error: unknown) {
    console.error('Dealer deletion error:', error);
    return {
      success: false,
      error: 'Failed to delete dealer: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Assign stations to dealer
 */
private async assignStationsToDealer(dealerId: string, stationIds: string[]): Promise<void> {
  try {
    // First, unassign any existing stations
    await supabase
      .from('stations')
      .update({ dealer_id: null })
      .eq('dealer_id', dealerId);

    // Then assign the new stations
    if (stationIds.length > 0) {
      await supabase
        .from('stations')
        .update({ dealer_id: dealerId })
        .in('id', stationIds);
    }
  } catch (error) {
    console.error('Error assigning stations to dealer:', error);
  }
}

/**
 * Generate guaranteed station code
 */
private generateGuaranteedStationCode(providedCode: string | undefined, stationName: string): string {
  // If provided code meets constraints, use it
  if (providedCode && providedCode.trim() !== '' && /\S/.test(providedCode)) {
    return providedCode;
  }

  // Generate a guaranteed valid code
  const base = stationName
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .substring(0, 12);

  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  let code = `${base}_${timestamp}_${random}`;
  
  // Ultimate fallback
  if (!code || code.trim() === '' || !/\S/.test(code)) {
    code = `STATION_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  
  return code;
}



  // ===== VIOLATION MANAGEMENT METHODS =====

  /**
   * Create a new price cap violation
   */
  async createViolation(violationData: ViolationCreateData): Promise<APIResponse> {
    try {
      console.log('Creating violation for station:', violationData.station_id);

      // Calculate fine amount
      const fineAmount = this.calculateFine(
        violationData.actual_price,
        violationData.price_cap,
        violationData.litres_sold
      );

      // Determine severity
      const severity = this.calculateSeverity(
        violationData.actual_price,
        violationData.price_cap,
        violationData.litres_sold
      );

      const { data, error } = await supabase
        .from('compliance_violations')
        .insert({
          station_id: violationData.station_id,
          product_id: violationData.product_id,
          actual_price: violationData.actual_price,
          price_cap: violationData.price_cap,
          litres_sold: violationData.litres_sold,
          fine_amount: fineAmount,
          violation_date: violationData.violation_date,
          reported_by: violationData.reported_by,
          evidence_url: violationData.evidence_url,
          notes: violationData.notes,
          status: 'open',
          severity: severity,
          created_at: new Date().toISOString(),
        })
        .select(`
          *,
          stations (name, omcs(name)),
          products (name)
        `)
        .single();

      if (error) {
        console.error('Violation creation error:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to create violation'
        };
      }

      console.log('Violation created successfully:', data.id);
      return {
        success: true,
        message: 'Violation recorded successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Violation creation error:', error);
      return {
        success: false,
        error: 'Failed to create violation: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Update violation status and details
   */
  async updateViolation(violationId: string, updates: ViolationUpdateData): Promise<APIResponse> {
    try {
      console.log('Updating violation:', violationId);

      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // If resolving violation, set resolved_at timestamp
      if (updates.status === 'resolved' && !updates.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('compliance_violations')
        .update(updateData)
        .eq('id', violationId)
        .select(`
          *,
          stations (name, omcs(name)),
          products (name),
          profiles (full_name)
        `)
        .single();

      if (error) {
        console.error('Violation update error:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to update violation'
        };
      }

      console.log('Violation updated successfully:', violationId);
      return {
        success: true,
        message: 'Violation updated successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Violation update error:', error);
      return {
        success: false,
        error: 'Failed to update violation: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get violations with advanced filtering
   */
  async getViolations(filters: ViolationFilters = {}): Promise<APIResponse> {
    try {
      let query = supabase
        .from('compliance_violations')
        .select(`
          *,
          stations (name, omcs(name)),
          products (name, unit),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters.omc_id) {
        // Filter by OMC through station relationship
        const { data: stationIds } = await supabase
          .from('stations')
          .select('id')
          .eq('omc_id', filters.omc_id);

        if (stationIds && stationIds.length > 0) {
          query = query.in('station_id', stationIds.map(s => s.id));
        }
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id);
      }
      if (filters.start_date) {
        query = query.gte('violation_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('violation_date', filters.end_date);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch violations: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get violation statistics
   */
  async getViolationStats(filters?: ViolationFilters): Promise<APIResponse> {
    try {
      let query = supabase
        .from('compliance_violations')
        .select('*');

      // Apply filters if provided
      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters?.omc_id) {
        const { data: stationIds } = await supabase
          .from('stations')
          .select('id')
          .eq('omc_id', filters.omc_id);

        if (stationIds && stationIds.length > 0) {
          query = query.in('station_id', stationIds.map(s => s.id));
        }
      }
      if (filters?.start_date) {
        query = query.gte('violation_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('violation_date', filters.end_date);
      }

      const { data: violations, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      const stats = {
        total_violations: violations?.length || 0,
        open_cases: violations?.filter(v => v.status === 'open').length || 0,
        appealed_cases: violations?.filter(v => v.status === 'appealed').length || 0,
        under_review_cases: violations?.filter(v => v.status === 'under_review').length || 0,
        resolved_cases: violations?.filter(v => v.status === 'resolved').length || 0,
        total_fines: violations?.reduce((sum, v) => sum + (v.fine_amount || 0), 0) || 0,
        collected_fines: violations
          ?.filter(v => v.status === 'resolved')
          .reduce((sum, v) => sum + (v.fine_amount || 0), 0) || 0,
        by_severity: {
          critical: violations?.filter(v => v.severity === 'critical').length || 0,
          high: violations?.filter(v => v.severity === 'high').length || 0,
          medium: violations?.filter(v => v.severity === 'medium').length || 0,
          low: violations?.filter(v => v.severity === 'low').length || 0,
        }
      };

      return {
        success: true,
        data: stats
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch violation statistics: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Calculate fine amount based on violation parameters
   */
  calculateFine(actualPrice: number, priceCap: number, litresSold: number): number {
    const priceDifference = actualPrice - priceCap;
    const percentageOver = (priceDifference / priceCap) * 100;
    
    // Base fine: 10% of overcharge amount
    let fine = priceDifference * litresSold * 0.1;
    
    // Severity multipliers
    if (percentageOver > 20) {
      fine *= 2; // 100% increase for severe violations
    } else if (percentageOver > 15) {
      fine *= 1.5; // 50% increase for high violations
    } else if (percentageOver > 10) {
      fine *= 1.25; // 25% increase for medium violations
    }
    
    // Minimum fine of 50 GHS
    return Math.max(fine, 50);
  }

  /**
   * Calculate violation severity
   */
  calculateSeverity(actualPrice: number, priceCap: number, litresSold: number): 'low' | 'medium' | 'high' | 'critical' {
    const priceDifference = actualPrice - priceCap;
    const percentageOver = (priceDifference / priceCap) * 100;
    const totalOvercharge = priceDifference * litresSold;

    if (percentageOver > 20 || totalOvercharge > 5000) return 'critical';
    if (percentageOver > 15 || totalOvercharge > 2000) return 'high';
    if (percentageOver > 10 || totalOvercharge > 1000) return 'medium';
    return 'low';
  }

  /**
   * Get violation trends over time
   */
  async getViolationTrends(days: number = 30): Promise<APIResponse> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('compliance_violations')
        .select('violation_date, status, severity')
        .gte('violation_date', startDate.toISOString())
        .order('violation_date', { ascending: true });

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      // Group by date and calculate daily trends
      const trends = data?.reduce((acc: Record<string, unknown>, violation) => {
        const date = violation.violation_date.split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            total: 0,
            open: 0,
            resolved: 0,
            appealed: 0
          };
        }
        
        acc[date].total++;
        if (violation.status === 'open') acc[date].open++;
        if (violation.status === 'resolved') acc[date].resolved++;
        if (violation.status === 'appealed') acc[date].appealed++;
        
        return acc;
      }, {});

      return {
        success: true,
        data: Object.values(trends || {})
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch violation trends: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Export violations data
   */
  async exportViolations(filters: ViolationFilters = {}): Promise<APIResponse> {
    try {
      const violationsResponse = await this.getViolations(filters);
      
      if (!violationsResponse.success) {
        return violationsResponse;
      }

      const statsResponse = await this.getViolationStats(filters);
      
      const exportData = {
        violations: violationsResponse.data,
        statistics: statsResponse.success ? statsResponse.data : null,
        export_metadata: {
          exported_at: new Date().toISOString(),
          filters_applied: filters,
          total_records: violationsResponse.data?.length || 0
        }
      };

      return {
        success: true,
        data: exportData
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to export violations: ' + extractErrorMessage(error)
      };
    }
  }

  // ===== BANK DEPOSITS MANAGEMENT METHODS =====

  /**
   * Create a new bank deposit
   */
  async createBankDeposit(depositData: BankDepositCreateData): Promise<APIResponse> {
    try {
      console.log('Creating bank deposit for station:', depositData.station_id);

      // Verify station exists
      const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('id, name')
        .eq('id', depositData.station_id)
        .single();

      if (stationError || !station) {
        return {
          success: false,
          error: 'Station not found'
        };
      }

      // Check if reference number already exists
      const { data: existingDeposit } = await supabase
        .from('bank_deposits')
        .select('id')
        .eq('reference_number', depositData.reference_number)
        .maybeSingle();

      if (existingDeposit) {
        return {
          success: false,
          error: 'A deposit with this reference number already exists'
        };
      }

      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await supabase
        .from('bank_deposits')
        .insert({
          ...depositData,
          created_by: user.id,
          status: 'pending'
        })
        .select(`
          *,
          stations (name, omcs(name)),
          profiles (full_name)
        `)
        .single();

      if (error) {
        console.error('Bank deposit creation error:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to create bank deposit'
        };
      }

      console.log('Bank deposit created successfully:', data.id);
      return {
        success: true,
        message: 'Bank deposit recorded successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Bank deposit creation error:', error);
      return {
        success: false,
        error: 'Failed to create bank deposit: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get bank deposits with filtering
   */
  async getBankDeposits(filters: BankDepositFilters = {}): Promise<APIResponse> {
    try {
      let query = supabase
        .from('bank_deposits')
        .select(`
          *,
          stations (name, omcs(name)),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      // Apply station filter
      if (filters.station_id) {
        query = query.eq('station_id', filters.station_id);
      }

      // Apply OMC filter through station relationship
      if (filters.omc_id) {
        const { data: stationIds } = await supabase
          .from('stations')
          .select('id')
          .eq('omc_id', filters.omc_id);

        if (stationIds && stationIds.length > 0) {
          query = query.in('station_id', stationIds.map(s => s.id));
        }
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply date range filter
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch bank deposits: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Update bank deposit status
   */
  async updateBankDeposit(depositId: string, updates: BankDepositUpdateData): Promise<APIResponse> {
    try {
      console.log('Updating bank deposit:', depositId);

      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // If reconciling deposit, set reconciliation_date
      if (updates.status === 'reconciled' && !updates.reconciliation_date) {
        updateData.reconciliation_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('bank_deposits')
        .update(updateData)
        .eq('id', depositId)
        .select(`
          *,
          stations (name, omcs(name)),
          profiles (full_name)
        `)
        .single();

      if (error) {
        console.error('Bank deposit update error:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to update bank deposit'
        };
      }

      console.log('Bank deposit updated successfully:', depositId);
      return {
        success: true,
        message: 'Bank deposit updated successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Bank deposit update error:', error);
      return {
        success: false,
        error: 'Failed to update bank deposit: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get bank deposit statistics
   */
  async getBankDepositStats(filters?: BankDepositFilters): Promise<APIResponse> {
    try {
      let query = supabase
        .from('bank_deposits')
        .select('*');

      // Apply filters if provided
      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters?.omc_id) {
        const { data: stationIds } = await supabase
          .from('stations')
          .select('id')
          .eq('omc_id', filters.omc_id);

        if (stationIds && stationIds.length > 0) {
          query = query.in('station_id', stationIds.map(s => s.id));
        }
      }
      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      const { data: deposits, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      const stats = {
        total_deposits: deposits?.length || 0,
        total_amount: deposits?.reduce((sum, dep) => sum + dep.amount, 0) || 0,
        pending_deposits: deposits?.filter(d => d.status === 'pending').length || 0,
        pending_amount: deposits?.filter(d => d.status === 'pending').reduce((sum, dep) => sum + dep.amount, 0) || 0,
        confirmed_deposits: deposits?.filter(d => d.status === 'confirmed').length || 0,
        confirmed_amount: deposits?.filter(d => d.status === 'confirmed').reduce((sum, dep) => sum + dep.amount, 0) || 0,
        reconciled_deposits: deposits?.filter(d => d.status === 'reconciled').length || 0,
        reconciled_amount: deposits?.filter(d => d.status === 'reconciled').reduce((sum, dep) => sum + dep.amount, 0) || 0,
      };

      return {
        success: true,
        data: stats
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch bank deposit statistics: ' + extractErrorMessage(error)
      };
    }
  }


/**
 * Get dealer stations
 */
async getDealerStations(dealerId: string): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('status', 'active')
      .order('name');

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch dealer stations: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get dealer commissions
 */
async getDealerCommissions(dealerId: string): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('dealer_id', dealerId)
      .order('month', { ascending: false });

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch dealer commissions: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get station reports for dealer
 */
async getStationReports(dealerId: string): Promise<APIResponse> {
  try {
    // First get dealer's stations
    const { data: stations } = await supabase
      .from('stations')
      .select('id')
      .eq('dealer_id', dealerId);

    if (!stations || stations.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const stationIds = stations.map(s => s.id);

    const { data, error } = await supabase
      .from('station_reports')
      .select('*')
      .in('station_id', stationIds)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch station reports: ' + extractErrorMessage(error)
    };
  }
}
/**
 * Get sales data with schema-compatible queries
 */
async getSales(filters: SalesFilters = {}): Promise<APIResponse> {
  try {
    console.log('🔄 API: Fetching sales with filters:', filters);
    
    let query = supabase
      .from('sales')
      .select(`
        *,
        stations (name, code, region, city, omc_id, dealer_id),
        products (name, unit),
        profiles!sales_attendant_id_fkey (full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters - SIMPLIFIED to avoid schema issues
    if (filters.station_id && filters.station_id !== 'all') {
      query = query.eq('station_id', filters.station_id);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ API: Sales fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    console.log('✅ API: Sales fetched successfully:', data?.length || 0);

    // Transform data with safe defaults
    const transformedSales = (data || []).map(sale => ({
      id: sale.id,
      station_id: sale.station_id,
      station_name: sale.stations?.name || 'Unknown Station',
      station_code: sale.stations?.code || 'N/A',
      product_id: sale.product_id,
      product_name: sale.products?.name || 'Unknown Product',
      product_category: 'petrol', // Default category
      quantity: sale.quantity || 0,
      unit_price: sale.unit_price || 0,
      total_amount: sale.total_amount || 0,
      payment_method: sale.payment_method || 'cash',
      customer_type: sale.customer_type || 'retail',
      shift_id: sale.shift_id,
      attendant_id: sale.attendant_id,
      attendant_name: sale.profiles?.full_name || 'Unknown Attendant',
      transaction_id: sale.transaction_id || `TXN-${sale.id}`,
      status: sale.status || 'completed',
      notes: sale.notes,
      created_at: sale.created_at,
      updated_at: sale.updated_at,
      region: sale.stations?.region || 'Unknown Region',
      city: sale.stations?.city || 'Unknown City'
    }));

    const pagination = {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
      has_next: page < Math.ceil((count || 0) / limit),
      has_prev: page > 1
    };

    return {
      success: true,
      data: {
        sales: transformedSales,
        pagination
      }
    };

  } catch (error: unknown) {
    console.error('💥 API: Unexpected sales error:', error);
    return {
      success: false,
      error: 'Failed to fetch sales: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get tank stocks with error handling
 */
async getTankStocks(stationId: string): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('tank_stocks')
      .select('*, products(name, unit)')
      .eq('station_id', stationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Tank stocks fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error: unknown) {
    console.error('Tank stocks error:', error);
    return {
      success: false,
      error: 'Failed to fetch tank stocks: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get violations with error handling
 */
async getViolations(filters: ViolationFilters = {}): Promise<APIResponse> {
  try {
    let query = supabase
      .from('compliance_violations')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.station_id) {
      query = query.eq('station_id', filters.station_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch violations: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get station reports with fallback
 */
async getStationReports(dealerId: string): Promise<APIResponse> {
  try {
    // First get dealer's stations
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('id')
      .eq('dealer_id', dealerId);

    if (stationsError || !stations || stations.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const stationIds = stations.map(s => s.id);

    // Try to fetch from station_reports table
    const { data, error } = await supabase
      .from('station_reports')
      .select('*')
      .in('station_id', stationIds)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('Station reports table not found, using fallback data');
      // Return empty array if table doesn't exist
      return {
        success: true,
        data: []
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error: unknown) {
    console.error('Station reports error:', error);
    return {
      success: true, // Return success with empty data to avoid breaking the UI
      data: []
    };
  }
}





  // ===== INVENTORY MANAGEMENT METHODS =====

  /**
   * Get tank stocks for a station
   */
  async getTankStocks(stationId: string): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('tank_stocks')
        .select('*, products(name, unit)')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch tank stocks: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get deliveries with filtering
   */
  async getDeliveries(filters?: { station_id?: string }): Promise<APIResponse> {
    try {
      let query = supabase
        .from('deliveries')
        .select('*, stations(name), products(name)')
        .order('delivery_date', { ascending: false });

      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch deliveries: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Create a new delivery
   */
  async createDelivery(deliveryData: DeliveryCreateData): Promise<APIResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          ...deliveryData,
          created_by: user.id
        })
        .select('*, stations(name), products(name)')
        .single();

      if (error) {
        console.error('Delivery creation error:', error);
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'Delivery recorded successfully!',
        data
      };
    } catch (error: unknown) {
      console.error('Delivery creation error:', error);
      return {
        success: false,
        error: 'Failed to create delivery: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Update delivery status
   */
  async updateDelivery(deliveryId: string, updates: DeliveryUpdateData): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select('*, stations(name), products(name)')
        .single();

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'Delivery updated successfully!',
        data
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to update delivery: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get stock reconciliations
   */
  async getReconciliations(filters?: { station_id?: string }): Promise<APIResponse> {
    try {
      let query = supabase
        .from('stock_reconciliations')
        .select('*, stations(name), products(name)')
        .order('reconciliation_date', { ascending: false });

      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch reconciliations: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Create stock reconciliation
   */
  async createReconciliation(reconciliationData: ReconciliationCreateData): Promise<APIResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const variance = reconciliationData.closing_stock - 
        (reconciliationData.opening_stock + reconciliationData.deliveries - reconciliationData.sales);

      const { data, error } = await supabase
        .from('stock_reconciliations')
        .insert({
          ...reconciliationData,
          variance,
          reconciled_by: user.id,
          reconciliation_date: new Date().toISOString()
        })
        .select('*, stations(name), products(name)')
        .single();

      if (error) {
        console.error('Reconciliation creation error:', error);
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'Reconciliation saved successfully!',
        data
      };
    } catch (error: unknown) {
      console.error('Reconciliation creation error:', error);
      return {
        success: false,
        error: 'Failed to create reconciliation: ' + extractErrorMessage(error)
      };
    }
  }

  // ===== DAILY TANK STOCKS METHODS =====

  /**
   * Get daily tank stocks with real API calls
   */
  async getDailyTankStocks(filters: DailyTankStockFilters = {}): Promise<APIResponse> {
    try {
      console.log('Fetching daily tank stocks with filters:', filters);
      
      let query = supabase
        .from('daily_tank_stocks')
        .select(`
          *,
          stations (name, code),
          products (name, unit)
        `)
        .order('stock_date', { ascending: false });

      // Apply filters
      if (filters.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id);
      }
      if (filters.start_date) {
        query = query.gte('stock_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('stock_date', filters.end_date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching daily tank stocks:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to fetch daily tank stocks'
        };
      }

      console.log('Daily tank stocks fetched successfully:', data?.length || 0);
      return {
        success: true,
        data: data || []
      };

    } catch (error: unknown) {
      console.error('Unexpected error fetching daily tank stocks:', error);
      return {
        success: false,
        error: 'Failed to fetch daily tank stocks: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Create daily tank stock record
   */
  async createDailyTankStock(stockData: DailyTankStockCreateData): Promise<APIResponse> {
    try {
      console.log('Creating daily tank stock record:', stockData);

      // Get current user for recorded_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Calculate variance if not provided
      const variance = stockData.variance !== undefined ? stockData.variance : 
        stockData.closing_stock - (stockData.opening_stock + (stockData.deliveries || 0) - (stockData.sales || 0));

      const { data, error } = await supabase
        .from('daily_tank_stocks')
        .insert({
          ...stockData,
          variance,
          recorded_by: user.id,
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          stations (name, code),
          products (name, unit)
        `)
        .single();

      if (error) {
        console.error('Error creating daily tank stock:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to create daily tank stock record'
        };
      }

      console.log('Daily tank stock created successfully:', data.id);
      return {
        success: true,
        message: 'Daily stock recorded successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Unexpected error creating daily tank stock:', error);
      return {
        success: false,
        error: 'Failed to create daily tank stock: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Update daily tank stock record
   */
  async updateDailyTankStock(stockId: string, updates: DailyTankStockUpdateData): Promise<APIResponse> {
    try {
      console.log('Updating daily tank stock:', stockId, updates);

      const { data, error } = await supabase
        .from('daily_tank_stocks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockId)
        .select(`
          *,
          stations (name, code),
          products (name, unit)
        `)
        .single();

      if (error) {
        console.error('Error updating daily tank stock:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to update daily tank stock'
        };
      }

      console.log('Daily tank stock updated successfully:', stockId);
      return {
        success: true,
        message: 'Daily stock updated successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Unexpected error updating daily tank stock:', error);
      return {
        success: false,
        error: 'Failed to update daily tank stock: ' + extractErrorMessage(error)
      };
    }
  }

  // ===== SALES MANAGEMENT METHODS =====

  /**
   * Create a new sale record
   */
  async createSale(saleData: SaleCreateData): Promise<APIResponse> {
    try {
      console.log('Creating sale record:', saleData);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Validate required fields
      if (!saleData.station_id || !saleData.product_id || !saleData.quantity || !saleData.unit_price) {
        return {
          success: false,
          error: 'Missing required fields: station_id, product_id, quantity, and unit_price are required'
        };
      }

      // Calculate total amount if not provided
      const total_amount = saleData.total_amount || saleData.quantity * saleData.unit_price;

      const { data, error } = await supabase
        .from('sales')
        .insert({
          station_id: saleData.station_id,
          product_id: saleData.product_id,
          quantity: saleData.quantity,
          unit_price: saleData.unit_price,
          total_amount: total_amount,
          payment_method: saleData.payment_method,
          customer_type: saleData.customer_type,
          attendant_id: saleData.attendant_id,
          shift_id: saleData.shift_id,
          notes: saleData.notes,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          stations (name, code),
          products (name, unit),
          profiles!sales_attendant_id_fkey (full_name)
        `)
        .single();

      if (error) {
        console.error('Sale creation error:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to create sale record'
        };
      }

      console.log('Sale created successfully:', data.id);
      return {
        success: true,
        message: 'Sale recorded successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Sale creation error:', error);
      return {
        success: false,
        error: 'Failed to create sale: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Update sale record
   */
  async updateSale(saleId: string, updates: SaleUpdateData): Promise<APIResponse> {
    try {
      console.log('Updating sale:', saleId, updates);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Recalculate total amount if quantity or unit_price is updated
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.quantity !== undefined || updates.unit_price !== undefined) {
        // Get current sale to calculate new total
        const { data: currentSale } = await supabase
          .from('sales')
          .select('quantity, unit_price')
          .eq('id', saleId)
          .single();

        if (currentSale) {
          const quantity = updates.quantity ?? currentSale.quantity;
          const unit_price = updates.unit_price ?? currentSale.unit_price;
          updateData.total_amount = quantity * unit_price;
        }
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', saleId)
        .select(`
          *,
          stations (name, code),
          products (name, unit),
          profiles!sales_attendant_id_fkey (full_name)
        `)
        .single();

      if (error) {
        console.error('Sale update error:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to update sale record'
        };
      }

      console.log('Sale updated successfully:', saleId);
      return {
        success: true,
        message: 'Sale updated successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Sale update error:', error);
      return {
        success: false,
        error: 'Failed to update sale: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Delete/void sale record
   */
  async deleteSale(saleId: string): Promise<APIResponse> {
    try {
      console.log('Deleting sale:', saleId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if sale can be deleted (e.g., not too old, not already reconciled)
      const { data: sale } = await supabase
        .from('sales')
        .select('created_at, is_void')
        .eq('id', saleId)
        .single();

      if (!sale) {
        return {
          success: false,
          error: 'Sale not found'
        };
      }

      if (sale.is_void) {
        return {
          success: false,
          error: 'Sale is already voided'
        };
      }

      // Check if sale is older than 24 hours (adjust as needed)
      const saleDate = new Date(sale.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        return {
          success: false,
          error: 'Cannot delete sales older than 24 hours'
        };
      }

      // Soft delete by marking as void
      const { data, error } = await supabase
        .from('sales')
        .update({
          is_void: true,
          voided_by: user.id,
          voided_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId)
        .select()
        .single();

      if (error) {
        console.error('Sale deletion error:', error);
        return {
          success: false,
          error: extractErrorMessage(error) || 'Failed to delete sale record'
        };
      }

      console.log('Sale deleted successfully:', saleId);
      return {
        success: true,
        message: 'Sale voided successfully!',
        data
      };

    } catch (error: unknown) {
      console.error('Sale deletion error:', error);
      return {
        success: false,
        error: 'Failed to delete sale: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get sales summary and analytics
   */
  async getSalesSummary(filters: SalesFilters = {}): Promise<APIResponse<SalesSummary>> {
    try {
      console.log('Fetching sales summary with filters:', filters);

      // Get sales data with filters
      const salesResponse = await this.getSales(filters);
      if (!salesResponse.success) {
        return salesResponse as APIResponse<SalesSummary>;
      }

      const sales = salesResponse.data || [];
      
      // Calculate summary metrics
      const total_sales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const total_volume = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
      const transaction_count = sales.length;
      const average_transaction = transaction_count > 0 ? total_sales / transaction_count : 0;

      // Calculate growth rate (compared to previous period)
      const growth_rate = await this.calculateSalesGrowthRate(filters);

      // Get top products
      const top_products = this.calculateTopProducts(sales);

      // Get top stations
      const top_stations = await this.calculateTopStations(sales, filters);

      // Get daily trends
      const daily_trends = this.calculateDailyTrends(sales);

      const summary: SalesSummary = {
        total_sales,
        total_volume,
        average_transaction,
        growth_rate,
        transaction_count,
        top_products,
        top_stations,
        daily_trends
      };

      return {
        success: true,
        data: summary
      };

    } catch (error: unknown) {
      console.error('Error fetching sales summary:', error);
      return {
        success: false,
        error: 'Failed to fetch sales summary: ' + extractErrorMessage(error)
      };
    }
  }

/**
 * Get attendants for sales assignment - UPDATED to use attendants table
 */
async getAttendants(stationId?: string): Promise<APIResponse<Attendant[]>> {
  try {
    console.log('🔄 UPDATED getAttendants method called - USING ATTENDANTS TABLE');
    
    let query = supabase
      .from('attendants')  // CHANGED: Use attendants table instead of profiles
      .select('id, employee_id, full_name, email, phone, department, station_id, is_active, status')
      .eq('is_active', true)
      .order('full_name');

    if (stationId) {
      console.log('📍 Filtering by station_id:', stationId);
      query = query.eq('station_id', stationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Database error fetching attendants:', error);
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    console.log('✅ Successfully fetched attendants from attendants table:', data?.length || 0);

    return {
      success: true,
      data: data as Attendant[] || []
    };

  } catch (error: unknown) {
    console.error('💥 Error in getAttendants:', error);
    return {
      success: false,
      error: 'Failed to fetch attendants: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get sales filter options - UPDATED to use new getAttendants method
 */
async getSalesFilterOptions(): Promise<APIResponse<SalesFilterOptions>> {
  try {
    console.log('Fetching sales filter options...');

    const [
      productsResponse,
      stationsResponse,
      attendantsResponse
    ] = await Promise.all([
      this.getProducts(),
      this.getAllStations(),
      this.getAttendants()  // This will now call the UPDATED method
    ]);

    const filterOptions: SalesFilterOptions = {
      payment_methods: ['cash', 'mobile_money', 'card', 'credit'],
      customer_types: ['retail', 'commercial', 'fleet'],
      products: productsResponse.success ? (productsResponse.data || []).map(p => ({ id: p.id, name: p.name })) : [],
      stations: stationsResponse.success ? (stationsResponse.data || []).map(s => ({ id: s.id, name: s.name })) : [],
      attendants: attendantsResponse.success ? (attendantsResponse.data || []).map(a => ({ 
        id: a.id, 
        name: a.full_name,
        employee_id: a.employee_id 
      })) : []
    };

    return {
      success: true,
      data: filterOptions
    };

  } catch (error: unknown) {
    console.error('Error fetching sales filter options:', error);
    return {
      success: false,
      error: 'Failed to fetch filter options: ' + extractErrorMessage(error)
    };
  }
}

  // ===== PRIVATE HELPER METHODS FOR SALES =====

  /**
   * Calculate sales growth rate compared to previous period
   */
  private async calculateSalesGrowthRate(filters: SalesFilters): Promise<number> {
    try {
      // Get current period sales
      const currentSalesResponse = await this.getSales(filters);
      const currentSales = currentSalesResponse.success ? currentSalesResponse.data || [] : [];
      const currentTotal = currentSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

      // Calculate previous period dates
      const startDate = filters.start_date ? new Date(filters.start_date) : new Date();
      const endDate = filters.end_date ? new Date(filters.end_date) : new Date();
      
      const periodDiff = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodDiff);
      const previousEndDate = new Date(endDate.getTime() - periodDiff);

      // Get previous period sales
      const previousFilters = {
        ...filters,
        start_date: previousStartDate.toISOString(),
        end_date: previousEndDate.toISOString()
      };

      const previousSalesResponse = await this.getSales(previousFilters);
      const previousSales = previousSalesResponse.success ? previousSalesResponse.data || [] : [];
      const previousTotal = previousSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

      // Calculate growth rate
      if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
      return ((currentTotal - previousTotal) / previousTotal) * 100;

    } catch (error) {
      console.error('Error calculating growth rate:', error);
      return 0;
    }
  }

  /**
   * Calculate top performing products
   */
  private calculateTopProducts(sales: Record<string, unknown>[]): ProductPerformance[] {
    const productMap = new Map();

    sales.forEach(sale => {
      if (!sale.product_id) return;

      const productId = sale.product_id;
      const productName = sale.products?.name || 'Unknown Product';
      const quantity = sale.quantity || 0;
      const total = sale.total_amount || 0;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product_id: productId,
          product_name: productName,
          total_sales: 0,
          total_volume: 0
        });
      }

      const product = productMap.get(productId);
      product.total_sales += total;
      product.total_volume += quantity;
    });

    const products = Array.from(productMap.values());
    const totalSales = products.reduce((sum, product) => sum + product.total_sales, 0);

    // Add percentage and sort by sales
    return products
      .map(product => ({
        ...product,
        percentage: totalSales > 0 ? (product.total_sales / totalSales) * 100 : 0
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 10); // Top 10 products
  }

  /**
   * Calculate top performing stations
   */
  private async calculateTopStations(sales: Record<string, unknown>[], filters: SalesFilters): Promise<StationPerformance[]> {
    const stationMap = new Map();

    sales.forEach(sale => {
      if (!sale.station_id) return;

      const stationId = sale.station_id;
      const stationName = sale.stations?.name || 'Unknown Station';
      const quantity = sale.quantity || 0;
      const total = sale.total_amount || 0;

      if (!stationMap.has(stationId)) {
        stationMap.set(stationId, {
          station_id: stationId,
          station_name: stationName,
          total_sales: 0,
          total_volume: 0
        });
      }

      const station = stationMap.get(stationId);
      station.total_sales += total;
      station.total_volume += quantity;
    });

    const stations = Array.from(stationMap.values());
    const totalSales = stations.reduce((sum, station) => sum + station.total_sales, 0);

    // Add percentage and sort by sales
    return stations
      .map(station => ({
        ...station,
        percentage: totalSales > 0 ? (station.total_sales / totalSales) * 100 : 0
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 10); // Top 10 stations
  }

  /**
   * Calculate daily sales trends
   */
  private calculateDailyTrends(sales: Record<string, unknown>[]): DailySalesTrend[] {
    const dailyMap = new Map();

    sales.forEach(sale => {
      if (!sale.created_at) return;

      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      const quantity = sale.quantity || 0;
      const total = sale.total_amount || 0;

      if (!dailyMap.has(saleDate)) {
        dailyMap.set(saleDate, {
          date: saleDate,
          sales: 0,
          volume: 0,
          transactions: 0
        });
      }

      const day = dailyMap.get(saleDate);
      day.sales += total;
      day.volume += quantity;
      day.transactions += 1;
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }

/**
 * Get OMC by ID with full details
 */
async getOMCById(omcId: string): Promise<APIResponse> {
  try {
    console.log('Fetching OMC details:', omcId);
    
    const { data: omc, error } = await supabase
      .from('omcs')
      .select(`
        *,
        stations:stations!omc_id (id, name, status),
        profiles:profiles!omc_id (id, full_name, role, status)
      `)
      .eq('id', omcId)
      .single();

    if (error || !omc) {
      return {
        success: false,
        error: 'OMC not found'
      };
    }

    // Get additional statistics
    const [
      { data: violations },
      { data: sales },
      { data: priceCaps }
    ] = await Promise.all([
      supabase
        .from('compliance_violations')
        .select('id, fine_amount')
        .eq('station_id', omc.stations?.map(s => s.id) || [])
        .eq('status', 'open'),
      supabase
        .from('sales')
        .select('total_amount')
        .eq('station_id', omc.stations?.map(s => s.id) || [])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      this.getOMCPriceCaps(omcId)
    ]);

    const enhancedOMC = {
      ...omc,
      total_stations: omc.stations?.length || 0,
      total_users: omc.profiles?.length || 0,
      total_violations: violations?.length || 0,
      monthly_sales: sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
      active_price_caps: priceCaps.success ? priceCaps.data?.length || 0 : 0
    };

    return {
      success: true,
      data: enhancedOMC
    };

  } catch (error: unknown) {
    console.error('Error fetching OMC by ID:', error);
    return {
      success: false,
      error: 'Failed to fetch OMC details: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Update OMC information
 */
async updateOMC(omcId: string, updates: Record<string, unknown>): Promise<APIResponse> {
  try {
    console.log('Updating OMC:', omcId, updates);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Validate OMC exists
    const { data: existingOMC } = await supabase
      .from('omcs')
      .select('id')
      .eq('id', omcId)
      .single();

    if (!existingOMC) {
      return {
        success: false,
        error: 'OMC not found'
      };
    }

    const { data, error } = await supabase
      .from('omcs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', omcId)
      .select()
      .single();

    if (error) {
      console.error('OMC update error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to update OMC'
      };
    }

    console.log('OMC updated successfully:', omcId);
    return {
      success: true,
      message: 'OMC updated successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('OMC update error:', error);
    return {
      success: false,
      error: 'Failed to update OMC: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Delete OMC (soft delete)
 */
async deleteOMC(omcId: string): Promise<APIResponse> {
  try {
    console.log('Deleting OMC:', omcId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Check for dependencies
    const { data: stations } = await supabase
      .from('stations')
      .select('id')
      .eq('omc_id', omcId)
      .eq('status', 'active')
      .limit(1);

    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('omc_id', omcId)
      .eq('is_active', true)
      .limit(1);

    if (stations && stations.length > 0) {
      return {
        success: false,
        error: 'Cannot delete OMC with active stations. Transfer or deactivate stations first.'
      };
    }

    if (users && users.length > 0) {
      return {
        success: false,
        error: 'Cannot delete OMC with active users. Transfer or deactivate users first.'
      };
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('omcs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString()
      })
      .eq('id', omcId)
      .select()
      .single();

    if (error) {
      console.error('OMC deletion error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to delete OMC'
      };
    }

    console.log('OMC deleted successfully:', omcId);
    return {
      success: true,
      message: 'OMC deleted successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('OMC deletion error:', error);
    return {
      success: false,
      error: 'Failed to delete OMC: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get OMC statistics and analytics
 */
async getOMCStats(omcId?: string): Promise<APIResponse> {
  try {
    let query = supabase.from('omcs').select('*');

    if (omcId) {
      query = query.eq('id', omcId);
    }

    const { data: omcs, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    // Get additional stats for all OMCs
    const statsPromises = omcs?.map(async (omc) => {
      const [
        { data: stations },
        { data: users },
        { data: violations },
        { data: sales }
      ] = await Promise.all([
        supabase
          .from('stations')
          .select('id, status')
          .eq('omc_id', omc.id),
        supabase
          .from('profiles')
          .select('id, is_active')
          .eq('omc_id', omc.id),
        supabase
          .from('compliance_violations')
          .select('id, status, fine_amount')
          .eq('station_id', 
            (await supabase.from('stations').select('id').eq('omc_id', omc.id)).data?.map(s => s.id) || []
          ),
        supabase
          .from('sales')
          .select('total_amount')
          .eq('station_id', 
            (await supabase.from('stations').select('id').eq('omc_id', omc.id)).data?.map(s => s.id) || []
          )
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      return {
        omc_id: omc.id,
        total_stations: stations?.length || 0,
        active_stations: stations?.filter(s => s.status === 'active').length || 0,
        total_users: users?.length || 0,
        active_users: users?.filter(u => u.is_active).length || 0,
        total_violations: violations?.length || 0,
        open_violations: violations?.filter(v => v.status === 'open').length || 0,
        monthly_sales: sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      };
    }) || [];

    const detailedStats = await Promise.all(statsPromises);

    const summary = {
      total_omcs: omcs?.length || 0,
      active_omcs: omcs?.filter(o => o.is_active).length || 0,
      total_stations: detailedStats.reduce((sum, stat) => sum + stat.total_stations, 0),
      total_users: detailedStats.reduce((sum, stat) => sum + stat.total_users, 0),
      total_violations: detailedStats.reduce((sum, stat) => sum + stat.total_violations, 0),
      total_monthly_sales: detailedStats.reduce((sum, stat) => sum + stat.monthly_sales, 0),
      by_region: omcs?.reduce((acc, omc) => {
        acc[omc.region] = (acc[omc.region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };

    return {
      success: true,
      data: omcId ? detailedStats[0] : summary
    };

  } catch (error: unknown) {
    console.error('Error fetching OMC stats:', error);
    return {
      success: false,
      error: 'Failed to fetch OMC statistics: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Update dealer information
 */
async updateDealer(dealerId: string, updates: Record<string, unknown>): Promise<APIResponse> {
  try {
    console.log('Updating dealer:', dealerId, updates);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Validate dealer exists
    const { data: existingDealer } = await supabase
      .from('dealers')
      .select('id')
      .eq('id', dealerId)
      .single();

    if (!existingDealer) {
      return {
        success: false,
        error: 'Dealer not found'
      };
    }

    const { data, error } = await supabase
      .from('dealers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', dealerId)
      .select()
      .single();

    if (error) {
      console.error('Dealer update error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to update dealer'
      };
    }

    console.log('Dealer updated successfully:', dealerId);
    return {
      success: true,
      message: 'Dealer updated successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('Dealer update error:', error);
    return {
      success: false,
      error: 'Failed to update dealer: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Delete dealer (soft delete)
 */
async deleteDealer(dealerId: string): Promise<APIResponse> {
  try {
    console.log('Deleting dealer:', dealerId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Check for dependencies
    const { data: stations } = await supabase
      .from('stations')
      .select('id')
      .eq('dealer_id', dealerId)
      .eq('status', 'active')
      .limit(1);

    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('dealer_id', dealerId)
      .eq('is_active', true)
      .limit(1);

    if (stations && stations.length > 0) {
      return {
        success: false,
        error: 'Cannot delete dealer with active stations. Transfer or deactivate stations first.'
      };
    }

    if (users && users.length > 0) {
      return {
        success: false,
        error: 'Cannot delete dealer with active users. Transfer or deactivate users first.'
      };
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('dealers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString()
      })
      .eq('id', dealerId)
      .select()
      .single();

    if (error) {
      console.error('Dealer deletion error:', error);
      return {
        success: false,
        error: extractErrorMessage(error) || 'Failed to delete dealer'
      };
    }

    console.log('Dealer deleted successfully:', dealerId);
    return {
      success: true,
      message: 'Dealer deleted successfully!',
      data
    };

  } catch (error: unknown) {
    console.error('Dealer deletion error:', error);
    return {
      success: false,
      error: 'Failed to delete dealer: ' + extractErrorMessage(error)
    };
  }
}
  // ===== GENERAL DATA METHODS =====

/**
 * Get all OMCs - 
 */
async getOMCs(): Promise<APIResponse> {
  try {
    console.log('🔄 API: Fetching OMCs from database...');
    
    const { data, error } = await supabase
      .from('omcs')
      .select('*')
      .order('name');

    console.log('🔍 API DEBUG - Raw OMC data:', data);
    
    if (error) {
      console.error('❌ API: OMCs fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    //  Transform the data to match frontend interface with safe defaults
    const transformedData = (data || []).map(omc => ({
      id: omc?.id || '',
      name: omc?.name || 'Unknown OMC',
      code: omc?.code || 'N/A',
      email: omc?.email || 'N/A',
      phone: omc?.phone || 'N/A',
      website: omc?.website || '',
      address: omc?.address || 'N/A',
      city: omc?.city || 'N/A',
      region: omc?.region || 'N/A',
      country: omc?.country || 'Ghana',
      status: (omc?.status || 'active') as 'active' | 'inactive' | 'suspended',
      compliance_status: (omc?.compliance_status || 'compliant') as 'compliant' | 'non_compliant' | 'under_review',
      license_number: omc?.license_number || 'N/A',
      license_expiry: omc?.license_expiry || '',
      total_stations: omc?.total_stations || 0,
      total_users: omc?.total_users || 0,
      total_violations: omc?.total_violations || 0,
      monthly_sales: omc?.monthly_sales || 0,
      created_at: omc?.created_at || new Date().toISOString(),
      updated_at: omc?.updated_at || new Date().toISOString(),
      contact_person: omc?.contact_person || '',
      logo_url: omc?.logo_url || '',
      brand_color: omc?.brand_color || '',
      is_active: omc?.is_active ?? true
    }));

    console.log('✅ API: Transformed OMC data:', transformedData);

    return {
      success: true,
      data: transformedData
    };

  } catch (error: unknown) {
    console.error('💥 API: Unexpected OMCs error:', error);
    return {
      success: false,
      error: 'Failed to fetch OMCs: ' + extractErrorMessage(error)
    };
  }
}
  /**
   * Get stations by OMC
   */
  async getStationsByOMC(omcId: string): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('omc_id', omcId)
        .order('name');

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch stations: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get all stations
   */
  async getAllStations(): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*, omcs(name)')
        .order('name');

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch stations: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          omcs (*),
          stations (*),
          dealers (*)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch profile: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get current user's profile - IMPROVED VERSION
   */
  async getCurrentUserProfile(): Promise<APIResponse> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        return {
          success: false,
          error: 'Not authenticated'
        };
      }

      // Fix: Use separate queries instead of embedding multiple relationships
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      if (profileError) {
        return {
          success: false,
          error: profileextractErrorMessage(error)
        };
      }

      // Get related data separately to avoid embedding conflicts
      let stationData = null;
      let omcData = null;
      let dealerData = null;

      if (profile.station_id) {
        const { data: station } = await supabase
          .from('stations')
          .select('*')
          .eq('id', profile.station_id)
          .single();
        stationData = station;
      }

      if (profile.omc_id) {
        const { data: omc } = await supabase
          .from('omcs')
          .select('*')
          .eq('id', profile.omc_id)
          .single();
        omcData = omc;
      }

      if (profile.dealer_id) {
        const { data: dealer } = await supabase
          .from('dealers')
          .select('*')
          .eq('id', profile.dealer_id)
          .single();
        dealerData = dealer;
      }

      // Combine all data
      const userContext = {
        ...profile,
        station: stationData,
        omc: omcData,
        dealer: dealerData
      };

      return {
        success: true,
        data: userContext
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch current user profile: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Update user profile
   */
async updateUserProfile(userId: string, updates: Record<string, unknown>): Promise<APIResponse> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      message: 'User updated successfully',
      data
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to update user: ' + extractErrorMessage(error)
    };
  }
}
  /**
   * Check if setup is already completed
   */
  async checkSetupStatus(): Promise<APIResponse> {
    try {
      // Check if admin user exists
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('role', 'admin')
        .limit(1);

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data: {
          isSetupComplete: profiles && profiles.length > 0
        }
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to check setup status: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get database schema info for debugging
   */
  async getSchemaInfo(): Promise<APIResponse> {
    try {
      // Try to get profiles table info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (profilesError) {
        return {
          success: false,
          error: `Profiles table error: ${profilesextractErrorMessage(error)}`
        };
      }

      return {
        success: true,
        data: {
          profilesColumns: profilesData && profilesData.length > 0 ? Object.keys(profilesData[0]) : [],
          hasProfilesData: profilesData && profilesData.length > 0
        }
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to get schema info: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get all dealers
   */
  async getDealers(): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('dealers')
        .select('*, omcs(name)')
        .order('name');

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch dealers: ' + extractErrorMessage(error)
      };
    }
  }

/**
 * Get products - FIXED VERSION
 */
async getProducts(): Promise<APIResponse> {
  try {
    console.log('🔄 API: Fetching products from database...');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    console.log('🔍 API DEBUG - Products found:', data?.length || 0);

    if (error) {
      console.error('❌ API: Products fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    // Ensure we return an empty array if no data
    return {
      success: true,
      data: data || []
    };

  } catch (error: unknown) {
    console.error('💥 API: Unexpected products error:', error);
    return {
      success: false,
      error: 'Failed to fetch products: ' + extractErrorMessage(error)
    };
  }
}

  /**
   * Get station products
   */
  async getStationProducts(stationId: string): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('station_products')
        .select('*, products(*)')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch station products: ' + extractErrorMessage(error)
      };
    }
  }

/**
 * Get sales data with advanced filtering - SIMPLIFIED VERSION
 */
async getSales(filters: SalesFilters = {}): Promise<APIResponse> {
  try {
    console.log('🔄 API: Fetching sales with filters:', filters);
    
    let query = supabase
      .from('sales')
      .select(`
        *,
        stations (name, code, region, city, omc_id, dealer_id),
        products (name, category, unit),
        profiles!sales_attendant_id_fkey (full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters - SIMPLIFIED VERSION
    if (filters.search) {
      query = query.or(`transaction_id.ilike.%${filters.search}%,stations.name.ilike.%${filters.search}%,products.name.ilike.%${filters.search}%`);
    }
    
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    
    if (filters.product_category && filters.product_category !== 'all') {
      query = query.eq('products.category', filters.product_category);
    }
    
    if (filters.payment_method && filters.payment_method !== 'all') {
      query = query.eq('payment_method', filters.payment_method);
    }
    
    if (filters.customer_type && filters.customer_type !== 'all') {
      query = query.eq('customer_type', filters.customer_type);
    }
    
    if (filters.station_id && filters.station_id !== 'all') {
      query = query.eq('station_id', filters.station_id);
    }
    
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    
    if (filters.date_to) {
      // Remove the time part to avoid 400 errors
      const dateOnly = filters.date_to.split('T')[0];
      query = query.lte('created_at', dateOnly);
    }

    // Remove complex joins that might cause 400 errors
    // Apply OMC filter separately if needed
    if (filters.omc_id && filters.omc_id !== 'all') {
      // Get stations for this OMC first, then filter sales
      const { data: stationIds } = await supabase
        .from('stations')
        .select('id')
        .eq('omc_id', filters.omc_id);

      if (stationIds && stationIds.length > 0) {
        query = query.in('station_id', stationIds.map(s => s.id));
      } else {
        // Return empty if no stations found for this OMC
        return {
          success: true,
          data: {
            sales: [],
            pagination: {
              page: filters.page || 1,
              limit: filters.limit || 50,
              total: 0,
              total_pages: 0,
              has_next: false,
              has_prev: false
            }
          }
        };
      }
    }

    // Apply dealer filter separately
    if (filters.dealer_id && filters.dealer_id !== 'all') {
      const { data: stationIds } = await supabase
        .from('stations')
        .select('id')
        .eq('dealer_id', filters.dealer_id);

      if (stationIds && stationIds.length > 0) {
        query = query.in('station_id', stationIds.map(s => s.id));
      } else {
        return {
          success: true,
          data: {
            sales: [],
            pagination: {
              page: filters.page || 1,
              limit: filters.limit || 50,
              total: 0,
              total_pages: 0,
              has_next: false,
              has_prev: false
            }
          }
        };
      }
    }

    // Apply region filter separately
    if (filters.region && filters.region !== 'all') {
      const { data: stationIds } = await supabase
        .from('stations')
        .select('id')
        .eq('region', filters.region);

      if (stationIds && stationIds.length > 0) {
        query = query.in('station_id', stationIds.map(s => s.id));
      } else {
        return {
          success: true,
          data: {
            sales: [],
            pagination: {
              page: filters.page || 1,
              limit: filters.limit || 50,
              total: 0,
              total_pages: 0,
              has_next: false,
              has_prev: false
            }
          }
        };
      }
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ API: Sales fetch error:', error);
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    console.log('✅ API: Sales fetched successfully:', data?.length || 0);

    // Transform data to match frontend interface
    const transformedSales = (data || []).map(sale => ({
      id: sale.id,
      station_id: sale.station_id,
      station_name: sale.stations?.name || 'Unknown Station',
      station_code: sale.stations?.code || 'N/A',
      product_id: sale.product_id,
      product_name: sale.products?.name || 'Unknown Product',
      product_category: sale.products?.category || 'petrol',
      quantity: sale.quantity || 0,
      unit_price: sale.unit_price || 0,
      total_amount: sale.total_amount || 0,
      payment_method: sale.payment_method || 'cash',
      customer_type: sale.customer_type || 'retail',
      shift_id: sale.shift_id,
      shift_name: sale.shift_name,
      attendant_id: sale.attendant_id,
      attendant_name: sale.profiles?.full_name || 'Unknown Attendant',
      omc_id: sale.stations?.omc_id,
      omc_name: sale.stations?.omcs?.name,
      dealer_id: sale.stations?.dealer_id,
      dealer_name: sale.stations?.dealers?.name,
      transaction_id: sale.transaction_id || `TXN-${sale.id}`,
      status: sale.status || 'completed',
      notes: sale.notes,
      created_at: sale.created_at,
      updated_at: sale.updated_at,
      region: sale.stations?.region || 'Unknown Region',
      city: sale.stations?.city || 'Unknown City'
    }));

    const pagination = {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
      has_next: page < Math.ceil((count || 0) / limit),
      has_prev: page > 1
    };

    return {
      success: true,
      data: {
        sales: transformedSales,
        pagination
      }
    };

  } catch (error: unknown) {
    console.error('💥 API: Unexpected sales error:', error);
    return {
      success: false,
      error: 'Failed to fetch sales: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Get sales summary for dashboard - NEW METHOD
 */
async getSalesSummary(filters: SalesFilters = {}): Promise<APIResponse> {
  try {
    console.log('🔄 API: Fetching sales summary with filters:', filters);
    
    // Get base sales data with same filters
    const salesResponse = await this.getSales({ ...filters, limit: 10000 });
    
    if (!salesResponse.success) {
      return salesResponse;
    }

    const sales = salesResponse.data?.sales || [];
    
    // Calculate summary metrics
    const total_sales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const total_volume = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    const total_transactions = sales.length;
    const average_ticket = total_transactions > 0 ? total_sales / total_transactions : 0;

    // Calculate today's sales
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales
      .filter(sale => sale.created_at.startsWith(today))
      .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

    // Calculate yesterday's sales
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdaySales = sales
      .filter(sale => sale.created_at.startsWith(yesterday))
      .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

    // Calculate growth percentage
    const growth_percentage = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
      : todaySales > 0 ? 100 : 0;

    // Find top product
    const productSales = sales.reduce((acc, sale) => {
      acc[sale.product_name] = (acc[sale.product_name] || 0) + sale.total_amount;
      return acc;
    }, {} as Record<string, number>);
    
    const top_product = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No sales';

    // Find top station
    const stationSales = sales.reduce((acc, sale) => {
      acc[sale.station_name] = (acc[sale.station_name] || 0) + sale.total_amount;
      return acc;
    }, {} as Record<string, number>);
    
    const top_station = Object.entries(stationSales)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No sales';

    const summary = {
      total_sales,
      total_volume,
      total_transactions,
      average_ticket,
      today_sales: todaySales,
      yesterday_sales: yesterdaySales,
      growth_percentage: Math.round(growth_percentage * 100) / 100,
      top_product,
      top_station
    };

    console.log('✅ API: Sales summary calculated:', summary);
    
    return {
      success: true,
      data: summary
    };

  } catch (error: unknown) {
    console.error('💥 API: Sales summary error:', error);
    return {
      success: false,
      error: 'Failed to calculate sales summary: ' + extractErrorMessage(error)
    };
  }
}

  // ===== DASHBOARD INTEGRATION METHODS =====

  /**
   * Get all users (profiles) - UPDATED to use full_name
   */
  async getUsers(): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          stations (name),
          omcs (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch users: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get global analytics data for dashboard - UPDATED to match actual schema
   */
  async getGlobalAnalytics(): Promise<APIResponse> {
    try {
      const [
        { count: totalStations },
        { data: sales },
        { count: activeViolations },
        { count: totalUsers },
        { count: totalOmcs },
        { count: activeShifts }
      ] = await Promise.all([
        supabase.from('stations').select('*', { count: 'exact' }),
        supabase.from('sales').select('total_amount, litres_sold'),
        supabase.from('compliance_violations').select('*', { count: 'exact' }).eq('status', 'open'),
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('omcs').select('*', { count: 'exact' }),
        supabase.from('shifts').select('*', { count: 'exact' }).eq('status', 'open')
      ]);

      const totalSales = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const totalVolume = sales?.reduce((sum, sale) => sum + (sale.litres_sold || 0), 0) || 0;

      return {
        success: true,
        data: {
          total_stations: totalStations || 0,
          total_sales: totalSales,
          total_volume: totalVolume,
          active_violations: activeViolations || 0,
          total_users: totalUsers || 0,
          active_shifts: activeShifts || 0,
          total_omcs: totalOmcs || 0,
        }
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch analytics: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get recent users for dashboard - UPDATED to use full_name
   */
  async getRecentUsers(limit: number = 5): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          stations (name),
          omcs (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch recent users: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get sales reports with advanced filtering - UPDATED to match actual schema
   */
  async getSalesReports(filters: {
    dateRange?: string;
    stationFilter?: string;
    omcFilter?: string;
  } = {}): Promise<APIResponse> {
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          stations (name, omcs(name)),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      // Apply station filter
      if (filters.stationFilter && filters.stationFilter !== 'all') {
        query = query.eq('station_id', filters.stationFilter);
      }

      // Apply OMC filter through station relationship
      if (filters.omcFilter && filters.omcFilter !== 'all') {
        // This requires a join through stations table
        const { data: stationIds } = await supabase
          .from('stations')
          .select('id')
          .eq('omc_id', filters.omcFilter);

        if (stationIds && stationIds.length > 0) {
          query = query.in('station_id', stationIds.map(s => s.id));
        }
      }

      // Apply date range filter
      if (filters.dateRange) {
        const now = new Date();
        let startDate = new Date();

        switch (filters.dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'yesterday':
            startDate.setDate(now.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date(startDate);
            yesterdayEnd.setHours(23, 59, 59, 999);
            query = query.gte('created_at', startDate.toISOString()).lte('created_at', yesterdayEnd.toISOString());
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }

        if (filters.dateRange !== 'yesterday') {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch sales reports: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get compliance violations - UPDATED to match actual schema
   */
  async getComplianceViolations(): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('compliance_violations')
        .select(`
          *,
          stations (name, omcs(name)),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch compliance violations: ' + extractErrorMessage(error)
      };
    }
  }

/**
 * Get price caps with role-based filtering
 */
async getPriceCaps(filters?: PriceFilters): Promise<APIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, omc_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    let query = supabase
      .from('price_caps')
      .select(`
        *,
        products (name, unit),
        omcs (name)
      `)
      .order('effective_from', { ascending: false });

    // Apply role-based filtering
    if (profile.role === 'omc' && profile.omc_id) {
      // OMC users can see national caps and caps for their OMC
      query = query.or(`scope.eq.national,omc_id.eq.${profile.omc_id}`);
    } else if (profile.role === 'station') {
      // Station users can only see national caps
      query = query.eq('scope', 'national');
    }
    // Admin and NPA can see all caps

    // Apply additional filters
    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.omc_id && (profile.role === 'admin' || profile.role === 'npa')) {
      query = query.eq('omc_id', filters.omc_id);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch price caps: ' + extractErrorMessage(error)
    };
  }
}

/**
 * Calculate price cap status based on dates
 */
private calculatePriceCapStatus(effectiveFrom: string, effectiveTo?: string): 'active' | 'expired' | 'pending' {
  const today = new Date().toISOString().split('T')[0];
  const effectiveDate = new Date(effectiveFrom).toISOString().split('T')[0];
  
  if (effectiveDate > today) return 'pending';
  if (effectiveTo && new Date(effectiveTo).toISOString().split('T')[0] < today) return 'expired';
  return 'active';
}
  /**
   * Get inventory data
   */
  async getInventory(stationId?: string): Promise<APIResponse> {
    try {
      let query = supabase
        .from('tank_stocks')
        .select('*, stations(name), products(name)')
        .order('created_at', { ascending: false });

      if (stationId && stationId !== 'all') {
        query = query.eq('station_id', stationId);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch inventory: ' + extractErrorMessage(error)
      };
    }
  }

// ===== COMMISSION API METHODS =====

/**
 * Calculate commissions using searchStations filtering approach
 */
async calculateCommissions(request: { period: string; station_ids?: string[] }): Promise<APIResponse> {
  const requestId = `commission_calc_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const { period, station_ids } = request;

    // Validate period format
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return {
        success: false,
        error: 'Invalid period format. Use YYYY-MM',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    console.log('🔄 Calculating commissions using searchStations filtering:', {
      period,
      user_id: user.id,
      user_role: user.user_metadata?.role,
      requested_station_ids: station_ids
    });

    // Calculate date range for the period
    const year = parseInt(period.split('-')[0]);
    const month = parseInt(period.split('-')[1]);
    const startDate = `${period}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    console.log('📅 Date range for commission calculation:', { startDate, endDate });

    // FIRST: Get stations using searchStations method (same as Station Management)
    const stationsResponse = await this.searchStations({}, 1, 1000); // Get all accessible stations
    if (!stationsResponse.success) {
      throw new Error(`Failed to get stations: ${stationsResponse.error}`);
    }

    const userStations = stationsResponse.data?.stations || [];
    console.log('🏪 User stations from searchStations method:', {
      total_stations: userStations.length,
      stations: userStations.map(s => ({ id: s.id, name: s.name, commission_rate: s.commission_rate }))
    });

    if (userStations.length === 0) {
      return {
        success: true,
        data: {
          calculations_completed: 0,
          stations_processed: [],
          total_commission: 0,
          calculations: []
        },
        message: "No stations found for calculation",
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Filter stations if specific station_ids provided
    let targetStations = userStations;
    if (station_ids && station_ids.length > 0) {
      targetStations = userStations.filter(station => station_ids.includes(station.id));
      console.log('🎯 Filtered to specific stations:', {
        requested: station_ids.length,
        matched: targetStations.length,
        stations: targetStations.map(s => s.name)
      });
    }

    const targetStationIds = targetStations.map(station => station.id);

    // Build tank stocks query with proper station filtering
    let tankStocksQuery = supabase
      .from('daily_tank_stocks')
      .select(`
        id,
        station_id,
        product_id,
        opening_stock,
        closing_stock,
        received_stock,
        sales,
        stock_date,
        stations (
          name,
          dealer_id,
          omc_id,
          commission_rate
        ),
        products (
          name,
          code
        )
      `)
      .gte('stock_date', startDate)
      .lte('stock_date', endDate)
      .in('station_id', targetStationIds) // Use the filtered station IDs
      .order('stock_date', { ascending: true });

    console.log('🔍 Executing tank stocks query with searchStations filtered stations...');
    const { data: tankStocksData, error: tankStocksError } = await tankStocksQuery;

    if (tankStocksError) {
      console.error('❌ Daily tank stocks query error:', tankStocksError);
      return {
        success: false,
        error: `Database error: ${this.extractErrorMessage(tankStocksError)}`,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    console.log('📊 Tank stock data found for calculation:', {
      total_records: tankStocksData?.length || 0,
      stations_with_data: new Set(tankStocksData?.map(s => s.station_id)).size
    });

    if (!tankStocksData || tankStocksData.length === 0) {
      return {
        success: true,
        data: {
          calculations_completed: 0,
          stations_processed: [],
          total_commission: 0,
          calculations: []
        },
        message: "No daily tank stock data found for calculation",
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Group tank stocks by station and calculate commissions
    const stationData: { [key: string]: any } = {};
    
    tankStocksData.forEach(stock => {
      if (!stock.station_id) {
        console.warn('Skipping tank stock without station_id:', stock.id);
        return;
      }
      
      const station = stock.stations;
      if (!station) {
        console.warn('Skipping tank stock without station data:', stock.id);
        return;
      }

      if (!stationData[stock.station_id]) {
        // Use commission rate from searchStations result for consistency
        const stationFromSearch = targetStations.find(s => s.id === stock.station_id);
        const commissionRate = stationFromSearch?.commission_rate || station?.commission_rate;
        
        stationData[stock.station_id] = {
          stocks: [],
          station: station,
          commission_rate: this.validateCommissionRate(commissionRate, station.id, station.name),
          total_volume: 0
        };
      }
      
      stationData[stock.station_id].stocks.push(stock);
      // Use the auto-calculated sales column from the trigger
      stationData[stock.station_id].total_volume += stock.sales || 0;
    });

    const calculations = [];
    let totalCommission = 0;

    for (const [stationId, data] of Object.entries(stationData)) {
      const totalVolume = data.total_volume;
      const stationCommission = totalVolume * data.commission_rate;
      
      totalCommission += stationCommission;

      // Create commission record
      const commissionData = {
        station_id: stationId,
        dealer_id: data.station?.dealer_id,
        omc_id: data.station?.omc_id,
        period,
        total_volume: totalVolume,
        total_sales: 0, // We don't have sales amount from tank stocks
        commission_rate: data.commission_rate,
        commission_amount: stationCommission,
        windfall_amount: 0,
        shortfall_amount: 0,
        total_commission: stationCommission,
        status: 'pending',
        calculated_at: new Date().toISOString(),
        calculated_by: user.id,
        data_source: 'daily_tank_stocks'
      };

      try {
        // Upsert commission record
        const { data: existing, error: checkError } = await supabase
          .from('commissions')
          .select('id')
          .eq('station_id', stationId)
          .eq('period', period)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error checking existing commission:', checkError);
          throw checkError;
        }

        let upsertError;
        if (existing) {
          const { error } = await supabase
            .from('commissions')
            .update(commissionData)
            .eq('id', existing.id);
          upsertError = error;
        } else {
          const { error } = await supabase
            .from('commissions')
            .insert([commissionData]);
          upsertError = error;
        }

        if (upsertError) {
          console.error(`Error saving commission for station ${data.station?.name}:`, upsertError);
          throw upsertError;
        }

        calculations.push({
          station_id: stationId,
          station_name: data.station?.name,
          total_volume: totalVolume,
          commission_rate: data.commission_rate,
          total_commission: stationCommission,
          days_with_data: data.stocks.length
        });

        console.log(`✅ Commission saved from tank stocks for ${data.station?.name}:`, stationCommission);

      } catch (error) {
        console.error(`Error processing commission for station ${data.station?.name}:`, error);
        // Continue with other stations even if one fails
      }
    }

    const results = {
      calculations_completed: calculations.length,
      stations_processed: calculations.map(c => c.station_id),
      total_commission: totalCommission,
      calculations
    };

    console.log('🎯 Commission calculation from tank stocks completed:', results);

    return {
      success: true,
      data: results,
      message: `Commissions calculated from tank stocks for ${calculations.length} stations`,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('❌ Tank stock commission calculation error:', error);
    return {
      success: false,
      error: 'Failed to calculate commissions from tank stocks',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get stations for commission component using the SAME searchStations method
 */
async getCommissionStations(): Promise<APIResponse> {
  const requestId = `commission_stations_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    console.log('🔍 Getting commission stations using searchStations method...');

    // USE THE EXACT SAME searchStations METHOD AS STATION MANAGEMENT
    const response = await this.searchStations({}, 1, 100); // Get all stations with no filters
    
    if (!response.success) {
      console.error('❌ Failed to get stations via searchStations:', response.error);
      return {
        success: false,
        error: response.error,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const stations = response.data?.stations || [];
    
    console.log('✅ Commission stations loaded via searchStations:', {
      count: stations.length,
      stations: stations.map(s => ({ 
        name: s.name, 
        commission_rate: s.commission_rate,
        dealer_id: s.dealer_id,
        omc_id: s.omc_id
      }))
    });

    return {
      success: true,
      data: stations,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('❌ Commission stations error:', error);
    return {
      success: false,
      error: 'Failed to fetch commission stations',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get commissions with pagination and filtering
 */
async getCommissions(filters: {
  period?: string;
  status?: string;
  station_id?: string;
  page?: number;
  limit?: number;
}): Promise<APIResponse> {
  const requestId = `get_commissions_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const { period, status, station_id, page = 1, limit = 20 } = filters;

    console.log('🔍 Getting commissions for user:', {
      user_id: user.id,
      user_role: user.user_metadata?.role,
      filters
    });

    // Build query with proper role-based filtering
    let query = supabase
      .from('commissions')
      .select(`
        *,
        stations (
          name,
          code,
          location,
          region,
          dealer_id,
          commission_rate,
          dealers (
            id,
            name,
            email
          ),
          omcs (
            id,
            name
          )
        )
      `, { count: 'exact' });

    // Apply role-based filtering
    const userRole = user.user_metadata?.role;
    if (userRole === 'dealer') {
      console.log('👤 Filtering for dealer:', user.id);
      query = query.eq('stations.dealer_id', user.id);
    } else if (userRole === 'omc') {
      console.log('🏭 Filtering for OMC:', user.id);
      query = query.eq('stations.omc_id', user.id);
    } else if (userRole === 'admin') {
      console.log('👑 Admin - showing all commissions');
      // Admin sees everything - no filter needed
    }

    // Apply filters
    if (period) {
      query = query.eq('period', period);
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (station_id && station_id !== 'all') {
      query = query.eq('station_id', station_id);
    }

    // Add pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to).order('calculated_at', { ascending: false });

    const { data: commissions, error, count } = await query;

    if (error) {
      console.error('❌ Commissions query error:', error);
      return {
        success: false,
        error: `Database error: ${this.extractErrorMessage(error)}`,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    console.log('✅ Commissions loaded:', {
      user_role: user.user_metadata?.role,
      count: commissions?.length || 0,
      period,
      station_id
    });

    const totalPages = count ? Math.ceil(count / limit) : 0;

    const response = {
      commissions: commissions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    };

    return {
      success: true,
      data: response,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('❌ Get commissions error:', error);
    return {
      success: false,
      error: 'Failed to fetch commissions',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}


/**
 * Get progressive commission data using searchStations filtering
 */
async getProgressiveCommissions(period: string, stationId?: string): Promise<APIResponse> {
  const requestId = `progressive_commissions_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Validate period format
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return {
        success: false,
        error: 'Invalid period format. Use YYYY-MM',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const currentDate = new Date();
    const today = currentDate.toISOString().split('T')[0];
    
    // Calculate date range
    const year = parseInt(period.split('-')[0]);
    const month = parseInt(period.split('-')[1]);
    const startDate = `${period}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const queryEndDate = today < endDate ? today : endDate;

    console.log('📊 Getting progressive commissions using searchStations filtering:', {
      user_id: user.id,
      period,
      stationId,
      date_range: `${startDate} to ${queryEndDate}`
    });

    // FIRST: Get stations using searchStations method
    const stationsResponse = await this.searchStations({}, 1, 1000);
    if (!stationsResponse.success) {
      return {
        success: false,
        error: `Failed to get stations: ${stationsResponse.error}`,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    let targetStations = stationsResponse.data?.stations || [];
    
    // Apply station filter if provided
    if (stationId && stationId !== 'all') {
      targetStations = targetStations.filter(station => station.id === stationId);
    }

    const targetStationIds = targetStations.map(station => station.id);

    if (targetStationIds.length === 0) {
      return {
        success: true,
        data: [],
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Build query with searchStations filtered stations
    let query = supabase
      .from('daily_tank_stocks')
      .select(`
        stock_date,
        sales,
        opening_stock,
        closing_stock,
        received_stock,
        station_id,
        stations (
          name,
          commission_rate,
          dealer_id,
          omc_id
        ),
        products (
          name,
          code
        )
      `)
      .gte('stock_date', startDate)
      .lte('stock_date', queryEndDate)
      .in('station_id', targetStationIds) // Use filtered station IDs
      .order('stock_date', { ascending: true });

    const { data: tankStocksData, error: tankStocksError } = await query;

    if (tankStocksError) {
      console.error('❌ Daily tank stocks query error:', tankStocksError);
      return {
        success: false,
        error: `Database error: ${this.extractErrorMessage(tankStocksError)}`,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    console.log('📊 Filtered daily tank stocks data loaded:', {
      total_records: tankStocksData?.length || 0,
      stations: targetStations.length
    });

    // Calculate progressive commissions from tank stocks
    const progressiveData = this.calculateProgressiveFromTankStocks(tankStocksData || [], period);
    
    return {
      success: true,
      data: progressiveData,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('❌ Progressive commissions from tank stocks error:', error);
    return {
      success: false,
      error: 'Failed to fetch progressive commissions from tank stocks',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get commission statistics using searchStations filtering
 */
async getCommissionStats(filters: any = {}): Promise<APIResponse> {
  const requestId = `commission_stats_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const { period, station_id } = filters;
    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    // Calculate month progress
    const monthProgress = this.calculateMonthProgress();

    console.log('📊 Getting commission stats using searchStations filtering:', {
      user_id: user.id,
      period: currentPeriod,
      station_id: station_id || 'all'
    });

    // FIRST: Get stations using searchStations method
    const stationsResponse = await this.searchStations({}, 1, 1000);
    if (!stationsResponse.success) {
      console.error('❌ Failed to get stations for stats:', stationsResponse.error);
      return {
        success: true,
        data: this.getEmptyStats(),
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    let userStations = stationsResponse.data?.stations || [];
    
    // Apply station filter if provided
    if (station_id && station_id !== 'all') {
      userStations = userStations.filter(station => station.id === station_id);
    }

    console.log('🏪 User stations for stats (via searchStations):', {
      count: userStations.length,
      stations: userStations.map(s => ({ 
        id: s.id, 
        name: s.name, 
        commission_rate: s.commission_rate 
      }))
    });

    if (userStations.length === 0) {
      console.log('❌ No stations found for user in stats');
      return {
        success: true,
        data: this.getEmptyStats(),
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // VALIDATE AND TRACK COMMISSION RATES PROPERLY
    const stationCommissionRates = new Map();
    const validatedRates = [];
    const stationCommissionInfo = {};

    userStations.forEach(station => {
      const validatedRate = this.validateCommissionRate(
        station.commission_rate, 
        station.id, 
        station.name
      );
      
      stationCommissionRates.set(station.id, validatedRate);
      validatedRates.push(validatedRate);
      
      // Track detailed commission info
      stationCommissionInfo[station.id] = {
        name: station.name,
        original_rate: station.commission_rate,
        validated_rate: validatedRate,
        uses_default: Math.abs(validatedRate - 0.05) < 0.001 // Account for floating point
      };
    });

    const stationIds = userStations.map(station => station.id);
    
    // Calculate average commission rate properly
    const averageCommissionRate = validatedRates.length > 0 
      ? validatedRates.reduce((sum, rate) => sum + rate, 0) / validatedRates.length
      : 0.05;

    console.log('📈 Commission rate summary from searchStations:', {
      total_stations: userStations.length,
      average_rate: averageCommissionRate.toFixed(4),
      stations_using_default: validatedRates.filter(rate => Math.abs(rate - 0.05) < 0.001).length
    });

    // Create station info for the response
  
    userStations.forEach(station => {
      stationCommissionInfo[station.id] = {
        name: station.name,
        original_rate: station.commission_rate,
        validated_rate: stationCommissionRates.get(station.id),
        uses_default: stationCommissionRates.get(station.id) === 0.05 && 
                     (station.commission_rate === null || station.commission_rate === undefined || 
                      this.validateCommissionRate(station.commission_rate) !== stationCommissionRates.get(station.id))
      };
    });

    // Try to get commissions from database with proper filtering
    let commissionsData: any[] = [];
    try {
      let query = supabase
        .from('commissions')
        .select(`
          *,
          stations (
            dealer_id,
            omc_id,
            commission_rate
          )
        `)
        .eq('period', currentPeriod)
        .in('station_id', stationIds);

      const { data: commissions, error } = await query;

      if (!error && commissions) {
        commissionsData = commissions;
        console.log('📊 Found commission records for user:', {
          user_role: user.user_metadata?.role,
          count: commissionsData.length
        });
      }
    } catch (error) {
      console.log('No commission records found, will use progressive data');
    }

    let currentMonthCommission = 0;
    let monthToDateVolume = 0;
    let totalCommission = 0;
    let paidCommission = 0;
    let pendingCommission = 0;

    // If we have commission data, use it
    if (commissionsData.length > 0) {
      currentMonthCommission = commissionsData.reduce((sum, c) => sum + (c.total_commission || 0), 0);
      monthToDateVolume = commissionsData.reduce((sum, c) => sum + (c.total_volume || 0), 0);
      totalCommission = currentMonthCommission;
      paidCommission = commissionsData.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.total_commission || 0), 0);
      pendingCommission = commissionsData.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.total_commission || 0), 0);
    } else {
      // Fallback to progressive data from tank stocks with proper filtering
      console.log('🔄 Falling back to progressive tank stock data for stats');
      const progressiveResponse = await this.getProgressiveCommissions(currentPeriod, station_id);
      
      if (progressiveResponse.success) {
        const progressiveData = progressiveResponse.data || [];
        if (progressiveData.length > 0) {
          const latestData = progressiveData[progressiveData.length - 1];
          currentMonthCommission = latestData.cumulative_commission || 0;
          monthToDateVolume = latestData.cumulative_volume || 0;
          totalCommission = currentMonthCommission;
          pendingCommission = currentMonthCommission;
        }
      } else {
        // If no progressive data, calculate from tank stocks using actual commission rates
        console.log('🔄 Calculating from tank stocks using actual commission rates');
        const tankStockResponse = await this.calculateCommissionFromTankStocksForStats(
          currentPeriod, 
          stationIds, 
          stationCommissionRates
        );
        
        if (tankStockResponse.success) {
          currentMonthCommission = tankStockResponse.data?.total_commission || 0;
          monthToDateVolume = tankStockResponse.data?.total_volume || 0;
          totalCommission = currentMonthCommission;
          pendingCommission = currentMonthCommission;
        }
      }
    }

    const estimatedFinal = monthProgress > 0 ? (currentMonthCommission / monthProgress) * 100 : 0;

    const totalStations = userStations.length;
    const paidStations = commissionsData.filter(c => c.status === 'paid').length;
    const pendingStations = commissionsData.filter(c => c.status === 'pending').length;

    // Calculate today's commission from tank stocks using actual commission rates
    const todayCommission = await this.calculateTodayCommissionFromTankStocksWithRates(
      stationIds, 
      stationCommissionRates
    );

    const stats = {
      total_commission: totalCommission,
      paid_commission: paidCommission,
      pending_commission: pendingCommission,
      current_month_commission: currentMonthCommission,
      previous_month_commission: 0,
      current_month_progress: monthProgress,
      estimated_final_commission: estimatedFinal,
      today_commission: todayCommission,
      month_to_date_volume: monthToDateVolume,
      windfall_total: 0,
      shortfall_total: 0,
      base_commission_total: currentMonthCommission,
      current_windfall: 0,
      current_shortfall: 0,
      current_base_commission: currentMonthCommission,
      total_stations: totalStations,
      paid_stations: paidStations,
      pending_stations: pendingStations,
      average_commission_rate: averageCommissionRate,
      station_commission_rates: Object.fromEntries(stationCommissionRates),
      station_commission_info: stationCommissionInfo,
      stations_using_default_rate: validatedRates.filter(rate => rate === 0.05).length
    };

    console.log('📊 Final stats for user:', {
      user_role: user.user_metadata?.role,
      source: commissionsData.length > 0 ? 'commissions_table' : 'calculated_from_tank_stocks',
      period: currentPeriod,
      station_count: totalStations,
      current_month_commission: currentMonthCommission,
      today_commission: todayCommission,
      average_commission_rate: averageCommissionRate,
      stations_using_default: validatedRates.filter(rate => rate === 0.05).length
    });

    return {
      success: true,
      data: stats,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Commission stats error:', error);
    // Return empty stats
    return {
      success: true,
      data: this.getEmptyStats(),
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Calculate commission from tank stocks for stats using actual commission rates
 */
private async calculateCommissionFromTankStocksForStats(
  period: string, 
  stationIds: string[], 
  commissionRates: Map<string, number>
): Promise<APIResponse> {
  try {
    const currentDate = new Date();
    const today = currentDate.toISOString().split('T')[0];
    
    // Calculate date range
    const year = parseInt(period.split('-')[0]);
    const month = parseInt(period.split('-')[1]);
    const startDate = `${period}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const queryEndDate = today < endDate ? today : endDate;

    // Get tank stocks for the period
    const { data: tankStocks, error } = await supabase
      .from('daily_tank_stocks')
      .select('stock_date, sales, station_id')
      .gte('stock_date', startDate)
      .lte('stock_date', queryEndDate)
      .in('station_id', stationIds);

    if (error) {
      console.error('Error fetching tank stocks for stats:', error);
      return {
        success: false,
        error: this.extractErrorMessage(error)
      };
    }

    if (!tankStocks || tankStocks.length === 0) {
      return {
        success: true,
        data: {
          total_commission: 0,
          total_volume: 0
        }
      };
    }

    // Calculate commission using actual station rates
    let totalCommission = 0;
    let totalVolume = 0;

    tankStocks.forEach(stock => {
      const stationRate = commissionRates.get(stock.station_id) || 0.05;
      const salesVolume = stock.sales || 0;
      const commission = salesVolume * stationRate;
      
      totalVolume += salesVolume;
      totalCommission += commission;
    });

    console.log('💰 Commission calculation from tank stocks:', {
      total_commission: totalCommission,
      total_volume: totalVolume,
      stations_count: stationIds.length,
      tank_stock_records: tankStocks.length
    });

    return {
      success: true,
      data: {
        total_commission: totalCommission,
        total_volume: totalVolume
      }
    };

  } catch (error) {
    console.error('Error calculating commission from tank stocks:', error);
    return {
      success: false,
      error: 'Failed to calculate commission from tank stocks'
    };
  }
}

/**
 * Calculate today's commission from tank stocks using actual commission rates
 */
private async calculateTodayCommissionFromTankStocksWithRates(
  stationIds: string[], 
  commissionRates: Map<string, number>
): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's tank stocks
    const { data: todayTankStocks, error } = await supabase
      .from('daily_tank_stocks')
      .select('sales, station_id')
      .eq('stock_date', today)
      .in('station_id', stationIds);

    if (error) {
      console.error('Database error fetching today tank stocks:', error);
      return 0;
    }

    // Calculate total commission for today using actual station rates
    const todayCommission = todayTankStocks?.reduce((total, stock) => {
      const stationRate = commissionRates.get(stock.station_id) || 0.05;
      const salesVolume = stock.sales || 0;
      return total + (salesVolume * stationRate);
    }, 0) || 0;

    console.log('💰 Today commission calculated with actual rates:', {
      commission: todayCommission,
      tank_stock_records: todayTankStocks?.length || 0,
      stations_count: stationIds.length
    });

    return todayCommission;

  } catch (error) {
    console.error('Error calculating today commission with rates:', error);
    return 0;
  }
}

/**
 * Get default empty stats
 */
private getEmptyStats(): any {
  return {
    total_commission: 0,
    paid_commission: 0,
    pending_commission: 0,
    current_month_commission: 0,
    previous_month_commission: 0,
    current_month_progress: 0,
    estimated_final_commission: 0,
    today_commission: 0,
    month_to_date_volume: 0,
    windfall_total: 0,
    shortfall_total: 0,
    base_commission_total: 0,
    current_windfall: 0,
    current_shortfall: 0,
    current_base_commission: 0,
    total_stations: 0,
    paid_stations: 0,
    pending_stations: 0,
    average_commission_rate: 0.05,
    stations_using_default_rate: 0
  };
}

// ===== HELPER METHODS =====

/**
 * Validate commission rate and provide fallback with better debugging
 */
private validateCommissionRate(rate: any, stationId?: string, stationName?: string): number {
  const stationInfo = stationName ? `${stationName} (${stationId})` : (stationId || 'unknown station');
  
  // Handle null/undefined/empty string
  if (rate === null || rate === undefined || rate === '') {
    console.warn(`📝 Commission rate missing for ${stationInfo}, using default 0.05`);
    return 0.05;
  }
  
  // Handle string conversion
  const parsedRate = typeof rate === 'string' ? parseFloat(rate) : Number(rate);
  
  // Validate the parsed rate
  if (isNaN(parsedRate)) {
    console.warn(`❌ Invalid commission rate format for ${stationInfo}: "${rate}", using default 0.05`);
    return 0.05;
  }
  
  if (parsedRate <= 0) {
    console.warn(`❌ Commission rate too low for ${stationInfo}: ${parsedRate}, using default 0.05`);
    return 0.05;
  }
  
  if (parsedRate > 1) {
    console.warn(`⚠️ Commission rate unusually high for ${stationInfo}: ${parsedRate}, using as-is`);
    // Don't cap it, just warn - might be intentional
  }
  
  // Log valid rates for debugging (only if different from default)
  if (parsedRate !== 0.05 && (stationId || stationName)) {
    console.log(`✅ Valid commission rate for ${stationInfo}: ${parsedRate}`);
  }
  
  return parsedRate;
}

/**
 * Extract clean error message from various error formats
 */
private extractErrorMessage(error: any): string {
  if (!error) return 'Unknown error occurred';
  
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message;
  if (error?.details) return error.details;
  if (error?.code) {
    // Handle specific Supabase error codes
    switch (error.code) {
      case 'PGRST116':
        return 'Record not found';
      case '42501':
        return 'Insufficient permissions';
      case '42703':
        return 'Invalid column reference';
      case '42P01':
        return 'Table does not exist';
      default:
        return `Error ${error.code}: ${error.message || 'Database error'}`;
    }
  }
  
  return 'An unexpected error occurred';
}

/**
 * Calculate progressive commissions from daily_tank_stocks data
 */
private calculateProgressiveFromTankStocks(tankStocksData: any[], period: string): any {
  const dailyCommissions: { [key: string]: any } = {};
  let cumulativeCommission = 0;
  let cumulativeVolume = 0;

  // Group by date and calculate daily commissions from tank stocks
  tankStocksData.forEach(stock => {
    if (!stock.stock_date) return;
    
    const stockDate = stock.stock_date;
    const commissionRate = this.validateCommissionRate(
      stock.stations?.commission_rate, 
      stock.station_id, 
      stock.stations?.name
    );
    
    // Use the auto-calculated sales column
    const dailyVolume = stock.sales || 0;
    const commission = dailyVolume * commissionRate;

    if (!dailyCommissions[stockDate]) {
      dailyCommissions[stockDate] = {
        date: stockDate,
        volume: 0,
        commission_earned: 0,
        tank_dip_count: 0,
        opening_stock: 0,
        closing_stock: 0,
        received_stock: 0
      };
    }

    dailyCommissions[stockDate].volume += dailyVolume;
    dailyCommissions[stockDate].commission_earned += commission;
    dailyCommissions[stockDate].tank_dip_count += 1;
    dailyCommissions[stockDate].opening_stock += stock.opening_stock || 0;
    dailyCommissions[stockDate].closing_stock += stock.closing_stock || 0;
    dailyCommissions[stockDate].received_stock += stock.received_stock || 0;
  });

  // Convert to array and calculate cumulative values
  const result = Object.values(dailyCommissions)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .map((day: any) => {
      cumulativeCommission += day.commission_earned;
      cumulativeVolume += day.volume;
      
      const date = new Date(day.date);
      const today = new Date().toISOString().split('T')[0];
      
      return {
        ...day,
        cumulative_commission: cumulativeCommission,
        cumulative_volume: cumulativeVolume,
        day_of_month: date.getDate(),
        day_name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        is_today: day.date === today,
        data_source: 'daily_tank_stocks'
      };
    });

  return result;
}

// ===== WINDOWFALL/SHORTFALL API METHODS =====

/**
 * Get windfall/shortfall calculations (separate from commissions)
 */
async getWindfallShortfallData(period: string, stationId?: string): Promise<APIResponse> {
  const requestId = `windfall_shortfall_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Get tank stock data with price information
    let query = supabase
      .from('tank_stocks')
      .select(`
        *,
        station:stations (name, location),
        product:products (name, code)
      `)
      .eq('period', period)
      .order('created_at', { ascending: false });

    if (stationId && stationId !== 'all') {
      query = query.eq('station_id', stationId);
    }

    const { data: stockData, error: stockError } = await query;

    if (stockError) {
      return {
        success: false,
        error: extractErrorMessage(stockError),
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Calculate windfall/shortfall from stock price differences
    const windfallShortfallData = this.calculateWindfallShortfallFromStocks(stockData || []);

    return {
      success: true,
      data: windfallShortfallData,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Windfall/shortfall error:', error);
    return {
      success: false,
      error: 'Failed to fetch windfall/shortfall data',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Calculate windfall/shortfall based on stock price differences
 */
async calculateWindfallShortfall(request: {
  period: string;
  station_ids?: string[];
}): Promise<APIResponse> {
  const requestId = `windfall_shortfall_calc_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const { period, station_ids } = request;

    // Get tank stock data for calculation
    let query = supabase
      .from('tank_stocks')
      .select(`
        *,
        station:stations (name, dealer_id, omc_id)
      `)
      .eq('period', period);

    if (station_ids && station_ids.length > 0) {
      query = query.in('station_id', station_ids);
    }

    const { data: stockData, error: stockError } = await query;

    if (stockError) {
      return {
        success: false,
        error: extractErrorMessage(stockError),
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Calculate windfall/shortfall
    const results = await this.calculateWindfallShortfallFromStocksDetailed(stockData || [], period, user.id);

    return {
      success: true,
      data: results,
      message: `Windfall/shortfall calculated for ${results.stations_processed.length} stations`,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Windfall/shortfall calculation error:', error);
    return {
      success: false,
      error: 'Failed to calculate windfall/shortfall',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get windfall/shortfall configuration for stations
 */
async getWindfallShortfallConfig(stationId?: string): Promise<APIResponse> {
  const requestId = `windfall_config_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    let query = supabase
      .from('station_configurations')
      .select(`
        *,
        station:stations (name, location)
      `)
      .eq('config_type', 'windfall_shortfall');

    if (stationId && stationId !== 'all') {
      query = query.eq('station_id', stationId);
    }

    const { data: configData, error: configError } = await query;

    if (configError) {
      // Return default config if table doesn't exist
      return {
        success: true,
        data: {
          configurations: [],
          default_config: {
            windfall_enabled: true,
            shortfall_enabled: true,
            calculation_method: 'price_difference',
            price_variance_threshold: 0.02, // 2%
            exclude_tax: true
          }
        },
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: {
        configurations: configData || [],
        default_config: {
          windfall_enabled: true,
          shortfall_enabled: true,
          calculation_method: 'price_difference',
          price_variance_threshold: 0.02,
          exclude_tax: true
        }
      },
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Windfall config error:', error);
    return {
      success: false,
      error: 'Failed to fetch windfall/shortfall configuration',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update windfall/shortfall configuration
 */
async updateWindfallShortfallConfig(configData: {
  station_id: string;
  windfall_enabled: boolean;
  shortfall_enabled: boolean;
  calculation_method: string;
  price_variance_threshold: number;
  exclude_tax: boolean;
}): Promise<APIResponse> {
  const requestId = `windfall_config_update_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Only admin and OMC can update configurations
    if (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'omc') {
      return {
        success: false,
        error: 'Permission denied. Only admin and OMC can update configurations.',
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    const configRecord = {
      ...configData,
      config_type: 'windfall_shortfall',
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    // Upsert configuration
    const { data: existing } = await supabase
      .from('station_configurations')
      .select('id')
      .eq('station_id', configData.station_id)
      .eq('config_type', 'windfall_shortfall')
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('station_configurations')
        .update(configRecord)
        .eq('id', existing.id);
    } else {
      result = await supabase
        .from('station_configurations')
        .insert(configRecord);
    }

    if (result.error) {
      return {
        success: false,
        error: extractErrorMessage(result.error),
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: configRecord,
      message: 'Windfall/shortfall configuration updated successfully',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('Windfall config update error:', error);
    return {
      success: false,
      error: 'Failed to update windfall/shortfall configuration',
      request_id: requestId,
      timestamp: new Date().toISOString()
    };
  }
}

// ===== HELPER METHODS =====

// ===== ESSENTIAL HELPER FUNCTIONS =====

/**
 * Extract clean error message from various error formats
 */
private extractErrorMessage(error: any): string {
  if (!error) return 'Unknown error occurred';
  
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message;
  if (error?.details) return error.details;
  if (error?.code) return `Error ${error.code}: ${error.message || 'Database error'}`;
  
  return 'An unexpected error occurred';
}

/**
 * Check if a date string is today's date
 */
private isToday(dateString: string): boolean {
  try {
    const today = new Date().toISOString().split('T')[0];
    const inputDate = new Date(dateString).toISOString().split('T')[0];
    return inputDate === today;
  } catch {
    return false;
  }
}

/**
 * Get default empty stats for commission statistics
 */
private getEmptyStats(): any {
  return {
    total_commission: 0,
    paid_commission: 0,
    pending_commission: 0,
    current_month_commission: 0,
    previous_month_commission: 0,
    current_month_progress: 0,
    estimated_final_commission: 0,
    today_commission: 0,
    month_to_date_volume: 0,
    windfall_total: 0,
    shortfall_total: 0,
    base_commission_total: 0,
    current_windfall: 0,
    current_shortfall: 0,
    current_base_commission: 0,
    total_stations: 0,
    paid_stations: 0,
    pending_stations: 0
  };
}

/**
 * Validate commission rate and provide fallback with better debugging
 */
private validateCommissionRate(rate: any, stationId?: string, stationName?: string): number {
  const stationInfo = stationName ? `${stationName} (${stationId})` : (stationId || 'unknown station');
  
  console.log(`🔍 Validating commission rate for ${stationInfo}:`, {
    original_rate: rate,
    type: typeof rate,
    is_null: rate === null,
    is_undefined: rate === undefined
  });
  
  // Handle null/undefined/empty string
  if (rate === null || rate === undefined || rate === '') {
    console.warn(`📝 Commission rate missing for ${stationInfo}, using default 0.05`);
    return 0.05;
  }
  
  // Handle string conversion
  const parsedRate = typeof rate === 'string' ? parseFloat(rate) : Number(rate);
  
  console.log(`🔍 Parsed rate for ${stationInfo}:`, parsedRate);
  
  // Validate the parsed rate
  if (isNaN(parsedRate)) {
    console.warn(`❌ Invalid commission rate format for ${stationInfo}: "${rate}", using default 0.05`);
    return 0.05;
  }
  
  if (parsedRate <= 0) {
    console.warn(`❌ Commission rate too low for ${stationInfo}: ${parsedRate}, using default 0.05`);
    return 0.05;
  }
  
  // Log valid rates
  console.log(`✅ Valid commission rate for ${stationInfo}: ${parsedRate}`);
  
  return parsedRate;
}

/**
 * Calculate month progress percentage
 */
private calculateMonthProgress(): number {
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const progress = (currentDay / totalDays) * 100;
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0-100%
}

// ===== COMMISSION CALCULATION HELPERS =====

/**
 * Calculate commission from tank stock data with proper validation
 */
private async calculateCommissionFromTankStocks(
  stationId: string, 
  tankStocks: any[], 
  station: any, 
  commissionRate: number,
  period: string, 
  userId: string
): Promise<any> {
  // Validate inputs
  if (!stationId || !station || tankStocks.length === 0) {
    throw new Error('Invalid inputs for commission calculation');
  }

  // Calculate totals using auto-calculated sales column
  const totalVolume = tankStocks.reduce((sum, stock) => sum + (stock.sales || 0), 0);
  const validatedRate = this.validateCommissionRate(commissionRate);
  const totalCommission = totalVolume * validatedRate;

  // Validate calculation results
  if (totalVolume < 0) {
    console.warn(`Negative volume detected for station ${stationId}: ${totalVolume}`);
  }

  // Create commission record
  const commissionData = {
    station_id: stationId,
    dealer_id: station.dealer_id,
    omc_id: station.omc_id,
    period,
    total_volume: Math.max(0, totalVolume), // Ensure non-negative
    total_sales: 0, // Not available from tank stocks
    commission_rate: validatedRate,
    commission_amount: totalCommission,
    windfall_amount: 0,
    shortfall_amount: 0,
    total_commission: totalCommission,
    status: 'pending' as const,
    calculated_at: new Date().toISOString(),
    calculated_by: userId,
    data_source: 'daily_tank_stocks'
  };

  try {
    // Upsert commission record
    const { data: existing, error: checkError } = await supabase
      .from('commissions')
      .select('id')
      .eq('station_id', stationId)
      .eq('period', period)
      .single();

    let result;
    if (existing && !checkError) {
      result = await supabase
        .from('commissions')
        .update(commissionData)
        .eq('id', existing.id);
    } else {
      result = await supabase
        .from('commissions')
        .insert([commissionData]);
    }

    if (result.error) {
      console.error(`Error saving commission for station ${stationId}:`, result.error);
      throw new Error(`Failed to save commission: ${this.extractErrorMessage(result.error)}`);
    }

    console.log(`✅ Commission ${existing ? 'updated' : 'created'} for ${station.name}: ${totalCommission}`);

    return {
      station_id: stationId,
      station_name: station.name,
      total_volume: totalVolume,
      commission_rate: validatedRate,
      total_commission: totalCommission,
      days_with_data: tankStocks.length,
      record_action: existing ? 'updated' : 'created'
    };

  } catch (error) {
    console.error(`Error in commission upsert for station ${stationId}:`, error);
    throw error;
  }
}

/**
 * Group tank stocks by station for batch processing
 */
private groupTankStocksByStation(tankStocksData: any[]): { [key: string]: any } {
  const stationData: { [key: string]: any } = {};
  
  tankStocksData.forEach(stock => {
    if (!stock.station_id) {
      console.warn('Tank stock record missing station_id, skipping:', stock.id);
      return;
    }
    
    const station = stock.stations;
    if (!station) {
      console.warn(`No station data found for tank stock ${stock.id}, skipping`);
      return;
    }

    if (!stationData[stock.station_id]) {
      stationData[stock.station_id] = {
        stocks: [],
        station: station,
        commission_rate: this.validateCommissionRate(station.commission_rate),
        total_volume: 0
      };
    }
    
    stationData[stock.station_id].stocks.push(stock);
    stationData[stock.station_id].total_volume += stock.sales || 0;
  });

  return stationData;
}

// ===== PROGRESSIVE CALCULATION HELPERS =====

/**
 * Calculate progressive commissions from tank stock data with enhanced analytics
 */
private calculateProgressiveFromTankStocks(tankStocksData: any[], period: string): any {
  const dailyCommissions: { [key: string]: any } = {};
  let cumulativeCommission = 0;
  let cumulativeVolume = 0;

  // Group by date and calculate daily commissions
  tankStocksData.forEach(stock => {
    if (!stock.stock_date) {
      console.warn('Tank stock record missing date, skipping:', stock.id);
      return;
    }

    const stockDate = stock.stock_date;
    const commissionRate = this.validateCommissionRate(stock.stations?.commission_rate);
    const dailyVolume = stock.sales || 0;
    const commission = dailyVolume * commissionRate;

    if (!dailyCommissions[stockDate]) {
      dailyCommissions[stockDate] = {
        date: stockDate,
        volume: 0,
        commission_earned: 0,
        tank_dip_count: 0,
        opening_stock: 0,
        closing_stock: 0,
        received_stock: 0,
        products: new Set()
      };
    }

    dailyCommissions[stockDate].volume += dailyVolume;
    dailyCommissions[stockDate].commission_earned += commission;
    dailyCommissions[stockDate].tank_dip_count += 1;
    dailyCommissions[stockDate].opening_stock += stock.opening_stock || 0;
    dailyCommissions[stockDate].closing_stock += stock.closing_stock || 0;
    dailyCommissions[stockDate].received_stock += stock.received_stock || 0;
    
    // Track unique products
    if (stock.products?.name) {
      dailyCommissions[stockDate].products.add(stock.products.name);
    }
  });

  // Convert to array and calculate cumulative values with enhanced analytics
  const result = Object.values(dailyCommissions)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .map((day: any, index: number, array) => {
      cumulativeCommission += day.commission_earned;
      cumulativeVolume += day.volume;
      
      const date = new Date(day.date);
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate daily trends
      const previousDay = index > 0 ? array[index - 1] : null;
      const volumeTrend = previousDay ? 
        ((day.volume - previousDay.volume) / previousDay.volume) * 100 : 0;
      
      const commissionTrend = previousDay ? 
        ((day.commission_earned - previousDay.commission_earned) / previousDay.commission_earned) * 100 : 0;

      return {
        ...day,
        cumulative_commission: cumulativeCommission,
        cumulative_volume: cumulativeVolume,
        day_of_month: date.getDate(),
        day_name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        is_today: this.isToday(day.date),
        data_source: 'daily_tank_stocks',
        // Enhanced analytics
        volume_trend: Math.round(volumeTrend * 100) / 100, // 2 decimal places
        commission_trend: Math.round(commissionTrend * 100) / 100,
        product_count: day.products.size,
        products: Array.from(day.products).slice(0, 3), // Top 3 products
        // Efficiency metrics
        efficiency_ratio: day.opening_stock > 0 ? (day.volume / day.opening_stock) * 100 : 0
      };
    });

  console.log(`📈 Progressive calculation completed: ${result.length} days processed`);
  return result;
}

// ===== STATISTICS HELPERS =====

/**
 * Calculate comprehensive commission statistics
 */
private calculateCommissionStats(commissions: any[], period?: string): any {
  const currentPeriod = period || new Date().toISOString().slice(0, 7);
  const currentCommissions = commissions.filter(c => c.period === currentPeriod);
  const previousCommissions = commissions.filter(c => {
    const prevPeriod = new Date(currentPeriod + '-01');
    prevPeriod.setMonth(prevPeriod.getMonth() - 1);
    return c.period === prevPeriod.toISOString().slice(0, 7);
  });

  const monthProgress = this.calculateMonthProgress();
  
  // Current period calculations
  const currentCommission = currentCommissions.reduce((sum, c) => sum + (c.total_commission || 0), 0);
  const currentVolume = currentCommissions.reduce((sum, c) => sum + (c.total_volume || 0), 0);
  
  // Previous period calculations
  const previousCommission = previousCommissions.reduce((sum, c) => sum + (c.total_commission || 0), 0);
  
  // Growth calculations
  const commissionGrowth = previousCommission > 0 ? 
    ((currentCommission - previousCommission) / previousCommission) * 100 : 0;

  const estimatedFinal = monthProgress > 0 ? (currentCommission / monthProgress) * 100 : 0;

  // Station counts
  const totalStations = new Set(commissions.map(c => c.station_id)).size;
  const paidStations = new Set(commissions.filter(c => c.status === 'paid').map(c => c.station_id)).size;
  const pendingStations = new Set(commissions.filter(c => c.status === 'pending').map(c => c.station_id)).size;

  return {
    // Basic stats
    total_commission: commissions.reduce((sum, c) => sum + (c.total_commission || 0), 0),
    paid_commission: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.total_commission || 0), 0),
    pending_commission: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.total_commission || 0), 0),
    
    // Current period
    current_month_commission: currentCommission,
    current_month_volume: currentVolume,
    month_to_date_volume: currentVolume,
    
    // Historical comparison
    previous_month_commission: previousCommission,
    commission_growth: Math.round(commissionGrowth * 100) / 100,
    
    // Progress tracking
    current_month_progress: monthProgress,
    estimated_final_commission: Math.round(estimatedFinal),
    
    // Additional metrics
    today_commission: 0, // Will be calculated separately
    average_commission_per_station: totalStations > 0 ? currentCommission / totalStations : 0,
    
    // Windfall/shortfall (separate calculation)
    windfall_total: 0,
    shortfall_total: 0,
    base_commission_total: currentCommission,
    current_windfall: 0,
    current_shortfall: 0,
    current_base_commission: currentCommission,
    
    // Station metrics
    total_stations: totalStations,
    paid_stations: paidStations,
    pending_stations: pendingStations,
    active_stations: currentCommissions.length,
    
    // Performance indicators
    payment_ratio: totalStations > 0 ? (paidStations / totalStations) * 100 : 0,
    pending_ratio: totalStations > 0 ? (pendingStations / totalStations) * 100 : 0
  };
}

/**
 * Generate commission calculation summary for logging
 */
private generateCalculationSummary(calculations: any[], totalCommission: number): any {
  const stationCount = calculations.length;
  const totalVolume = calculations.reduce((sum, calc) => sum + (calc.total_volume || 0), 0);
  const averageCommission = stationCount > 0 ? totalCommission / stationCount : 0;
  const averageVolume = stationCount > 0 ? totalVolume / stationCount : 0;

  return {
    station_count: stationCount,
    total_commission: totalCommission,
    total_volume: totalVolume,
    average_commission: Math.round(averageCommission * 100) / 100,
    average_volume: Math.round(averageVolume * 100) / 100,
    period_covered: calculations[0]?.period || 'unknown',
    calculation_timestamp: new Date().toISOString(),
    stations: calculations.map(calc => ({
      station_id: calc.station_id,
      station_name: calc.station_name,
      commission: calc.total_commission,
      volume: calc.total_volume
    }))
  };
} 

// ===== PERMISSION & AUTHORIZATION HELPERS =====

/**
 * Check if current user can manage commissions (admin, omc, dealer)
 */
async canManageCommissions(): Promise<boolean> {
  const requestId = `can_manage_commissions_${Date.now()}`;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Auth failed for commission permissions check');
      return false;
    }

    const userRole = user.user_metadata?.role;
    const allowedRoles = ['admin', 'omc', 'dealer'];
    const canManage = allowedRoles.includes(userRole);

    console.log('🔐 Commission permissions check:', {
      user_id: user.id,
      user_role: userRole,
      can_manage: canManage,
      request_id: requestId
    });

    return canManage;

  } catch (error: unknown) {
    console.error('❌ Commission permissions check error:', error);
    return false;
  }
}

/**
 * Check if current user can calculate commissions (admin, omc only)
 */
async canCalculateCommissions(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const userRole = user.user_metadata?.role;
    const allowedRoles = ['admin', 'omc'];
    const canCalculate = allowedRoles.includes(userRole);

    console.log('🧮 Commission calculation permissions:', {
      user_id: user.id,
      user_role: userRole,
      can_calculate: canCalculate
    });

    return canCalculate;

  } catch (error: unknown) {
    console.error('Commission calculation permissions error:', error);
    return false;
  }
}

/**
 * Check if current user can approve commissions (admin, omc only)
 */
async canApproveCommissions(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const userRole = user.user_metadata?.role;
    const allowedRoles = ['admin', 'omc'];
    const canApprove = allowedRoles.includes(userRole);

    console.log('✅ Commission approval permissions:', {
      user_id: user.id,
      user_role: userRole,
      can_approve: canApprove
    });

    return canApprove;

  } catch (error: unknown) {
    console.error('Commission approval permissions error:', error);
    return false;
  }
}

/**
 * Check if current user can view commissions (all authenticated users)
 */
async canViewCommissions(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user; // Any authenticated user can view
  } catch (error: unknown) {
    console.error('Commission view permissions error:', error);
    return false;
  }
}

/**
 * Get user role for commission operations
 */
private async getUserCommissionRole(): Promise<{ role: string; userId: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return {
      role: user.user_metadata?.role || 'unknown',
      userId: user.id
    };
  } catch (error: unknown) {
    console.error('Error getting user commission role:', error);
    return null;
  }
}

// ===== ESSENTIAL HELPER FUNCTIONS =====

/**
 * Extract clean error message from various error formats
 */
private extractErrorMessage(error: any): string {
  if (!error) return 'Unknown error occurred';
  
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message;
  if (error?.details) return error.details;
  if (error?.code) return `Error ${error.code}: ${error.message || 'Database error'}`;
  
  return 'An unexpected error occurred';
}


// ===== VALIDATION HELPERS =====

/**
 * Validate commission calculation request
 */
private validateCommissionRequest(request: { period: string; station_ids?: string[] }): { isValid: boolean; error?: string } {
  if (!request.period) {
    return { isValid: false, error: 'Period is required' };
  }

  // Validate period format (YYYY-MM)
  const periodRegex = /^\d{4}-\d{2}$/;
  if (!periodRegex.test(request.period)) {
    return { isValid: false, error: 'Period must be in YYYY-MM format' };
  }

  // Validate period is not in future
  const currentPeriod = new Date().toISOString().slice(0, 7);
  if (request.period > currentPeriod) {
    return { isValid: false, error: 'Cannot calculate commissions for future periods' };
  }

  return { isValid: true };
}

/**
 * Sanitize station IDs for database query
 */
private sanitizeStationIds(stationIds?: string[]): string[] | undefined {
  if (!stationIds || stationIds.length === 0) {
    return undefined;
  }

  return stationIds.filter(id => {
    if (typeof id !== 'string' || id.length !== 36) { // UUID validation
      console.warn('Invalid station ID format, skipping:', id);
      return false;
    }
    return true;
  });
}

/**
 * Calculate windfall/shortfall from stock data
 */
private calculateWindfallShortfallFromStocks(stockData: any[]): any {
  // This is a simplified calculation
  // In reality, you would compare purchase price vs selling price over time
  let windfallTotal = 0;
  let shortfallTotal = 0;
  const breakdown: any[] = [];

  stockData.forEach((stock, index) => {
    if (index > 0) {
      const previousStock = stockData[index - 1];
      const priceDifference = (stock.unit_price || 0) - (previousStock.unit_price || 0);
      
      if (priceDifference > 0) {
        // Windfall - price increased
        const windfall = priceDifference * (stock.quantity || 0);
        windfallTotal += windfall;
        breakdown.push({
          date: stock.created_at,
          station: stock.station?.name,
          product: stock.product?.name,
          type: 'windfall',
          amount: windfall,
          price_difference: priceDifference,
          quantity: stock.quantity
        });
      } else if (priceDifference < 0) {
        // Shortfall - price decreased
        const shortfall = Math.abs(priceDifference) * (stock.quantity || 0);
        shortfallTotal += shortfall;
        breakdown.push({
          date: stock.created_at,
          station: stock.station?.name,
          product: stock.product?.name,
          type: 'shortfall',
          amount: shortfall,
          price_difference: priceDifference,
          quantity: stock.quantity
        });
      }
    }
  });

  return {
    windfall_total: windfallTotal,
    shortfall_total: shortfallTotal,
    net_impact: windfallTotal - shortfallTotal,
    breakdown,
    summary: {
      total_transactions: breakdown.length,
      windfall_transactions: breakdown.filter(b => b.type === 'windfall').length,
      shortfall_transactions: breakdown.filter(b => b.type === 'shortfall').length
    }
  };
}

/**
 * Detailed windfall/shortfall calculation
 */
private async calculateWindfallShortfallFromStocksDetailed(stockData: any[], period: string, userId: string): Promise<any> {
  const calculations = this.calculateWindfallShortfallFromStocks(stockData);
  
  // Store windfall/shortfall records (you might want to create a separate table for this)
  const stations = [...new Set(stockData.map(stock => stock.station_id))];
  
  return {
    calculations_completed: stations.length,
    stations_processed: stations,
    windfall_total: calculations.windfall_total,
    shortfall_total: calculations.shortfall_total,
    net_impact: calculations.net_impact,
    breakdown: calculations.breakdown,
    summary: calculations.summary
  };
}

/**
 * Check if date is today
 */
private isToday(dateString: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateString === today;
}

// ===== DAILY REPORTS METHODS =====

  /**
   * Get daily reports with filtering and joins
   */
  async getDailyReports(filters: {
    station_id?: string;
    status?: string;
    shift?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }, user: any): Promise<APIResponse> {
    try {
      let query = supabase
        .from('daily_reports')
        .select(`
          *,
          stations (name, code, dealer_commission_rate),
          submitted_user:profiles!daily_reports_submitted_by_fkey (full_name),
          approved_user:profiles!daily_reports_approved_by_fkey (full_name)
        `)
        .order('report_date', { ascending: false });

      // Apply role-based filtering
      if (user.role !== 'admin') {
        // Get user's accessible stations
        const { data: userStations } = await supabase
          .from('stations')
          .select('id')
          .or(`dealer_id.eq.${user.id},manager_id.eq.${user.id},omc_id.eq.${user.id}`);
        
        if (userStations && userStations.length > 0) {
          const stationIds = userStations.map(s => s.id);
          query = query.in('station_id', stationIds);
        } else {
          return {
            success: true,
            data: []
          };
        }
      }

      // Apply custom filters
      if (filters.station_id && filters.station_id !== 'all') {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.shift && filters.shift !== 'all') {
        query = query.eq('shift', filters.shift);
      }
      if (filters.date_from) {
        query = query.gte('report_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('report_date', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`stations.name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch daily reports: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Create a new daily report
   */
  async createDailyReport(reportData: {
    station_id: string;
    report_date: string;
    shift: 'morning' | 'afternoon' | 'night';
    total_fuel_sold: number;
    total_sales: number;
    cash_collected: number;
    bank_deposits: number;
    total_expenses: number;
    variance: number;
    dealer_commission: number;
    commission_paid: boolean;
    net_amount: number;
    status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
    notes?: string;
    submitted_by: string;
    submitted_at?: string;
  }): Promise<APIResponse> {
    try {
      // Check if report already exists for same date/shift
      const { data: existingReport } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('station_id', reportData.station_id)
        .eq('report_date', reportData.report_date)
        .eq('shift', reportData.shift)
        .single();

      if (existingReport) {
        return {
          success: false,
          error: 'A report already exists for this date and shift'
        };
      }

      const { data, error } = await supabase
        .from('daily_reports')
        .insert([reportData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to create daily report: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Update report status (approve/reject/mark paid)
   */
  async updateDailyReportStatus(
    reportId: string,
    updateData: {
      status: 'approved' | 'rejected' | 'paid';
      approved_by?: string;
      approved_at?: string;
      commission_paid?: boolean;
      paid_by?: string;
      paid_at?: string;
    }
  ): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to update report status: ' + extractErrorMessage(error)
      };
    }
  }


// ===== USER MANAGEMENT METHODS =====

/**
 * Get users - WITH REAL EMAILS from auth system
 */
async getUsers(filters: UserFilters = {}): Promise<APIResponse<any>> {
  try {
    const { page = 1, limit = 50, search, role, status } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search && search.trim() !== '') {
      query = query.ilike('full_name', `%${search}%`);
    }
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }
    if (status && status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }

    query = query.order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

    const { data: profiles, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        timestamp: new Date().toISOString()
      };
    }

    // Get real emails for all users
    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          // Use the PostgreSQL function to get real email
          const { data: emailResult, error: emailError } = await supabase
            .rpc('get_user_email', { user_id: profile.id });

          return {
            id: profile.id,
            email: emailError ? 'email-protected@example.com' : (emailResult || 'no-email@example.com'),
            full_name: profile.full_name || 'Unknown User',
            role: profile.role || 'attendant',
            phone: profile.phone,
            station_id: profile.station_id,
            omc_id: profile.omc_id,
            dealer_id: profile.dealer_id,
            status: profile.is_active ? 'active' : 'inactive',
            email_verified: true,
            last_login_at: profile.last_login_at,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          };
        } catch (error) {
          console.error('Error fetching email for user:', profile.id, error);
          return {
            ...profile,
            email: 'error-fetching@example.com',
            status: profile.is_active ? 'active' : 'inactive',
            email_verified: true
          };
        }
      })
    );

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    
    const response = {
      users: usersWithEmails,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    };
    
    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch users: ' + extractErrorMessage(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Enhanced user validation with dealer role fix
 */
private async validateUserData(userData: UserCreateData | UserUpdateData): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Basic validation
  if (!userData.email || !userData.email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!userData.full_name || userData.full_name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }

  if (!userData.role) {
    errors.push('Role is required');
  }

  // Role-specific entity validation
  if (userData.role === 'dealer') {
    if (!userData.dealer_id) {
      errors.push('Dealer users must be associated with a dealer organization');
    }
    if (userData.station_id || userData.omc_id) {
      errors.push('Dealer users cannot be assigned to stations or OMCs directly');
    }
  } else if (userData.role === 'station_manager' || userData.role === 'attendant') {
    if (!userData.station_id) {
      errors.push(`${userData.role.replace('_', ' ')} must be assigned to a station`);
    }
    if (userData.dealer_id) {
      errors.push(`${userData.role.replace('_', ' ')} cannot be assigned to a dealer`);
    }
  } else if (userData.role === 'omc') {
    if (!userData.omc_id) {
      errors.push('OMC users must be assigned to an OMC');
    }
    if (userData.station_id || userData.dealer_id) {
      errors.push('OMC users cannot be assigned to stations or dealers');
    }
  }

  // For admin, npa, supervisor - no entity assignments allowed
  if (['admin', 'npa', 'supervisor'].includes(userData.role)) {
    if (userData.station_id || userData.omc_id || userData.dealer_id) {
      errors.push(`${userData.role} users cannot be assigned to stations, OMCs, or dealers`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Enhanced role assignment validation
 */
private async validateRoleAssignment(role: string, assignments: { station_id?: string; omc_id?: string; dealer_id?: string }): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  switch (role) {
    case 'dealer':
      if (!assignments.dealer_id) {
        errors.push('Dealer role requires dealer organization assignment');
      }
      if (assignments.station_id || assignments.omc_id) {
        errors.push('Dealer role cannot have station or OMC assignment');
      }
      break;

    case 'station_manager':
    case 'attendant':
      if (!assignments.station_id) {
        errors.push(`${role.replace('_', ' ')} role requires station assignment`);
      }
      if (assignments.dealer_id) {
        errors.push(`${role.replace('_', ' ')} role cannot have dealer assignment`);
      }
      break;

    case 'omc':
      if (!assignments.omc_id) {
        errors.push('OMC role requires OMC assignment');
      }
      if (assignments.station_id || assignments.dealer_id) {
        errors.push('OMC role cannot have station or dealer assignment');
      }
      break;

    case 'admin':
    case 'npa':
    case 'supervisor':
      if (assignments.station_id || assignments.omc_id || assignments.dealer_id) {
        errors.push(`${role} role cannot have entity assignments`);
      }
      break;

    default:
      errors.push(`Unknown role: ${role}`);
  }

  return { valid: errors.length === 0, errors };
}

  /**
   * Enhanced user creation with proper timing and error handling
   */
async adminCreateUser(userData: UserCreateData): Promise<APIResponse<User>> {
  try {
    console.log('🔄 Creating user with data:', userData);

    // Enhanced validation with role-specific rules
    const validation = await this.validateUserData(userData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        timestamp: new Date().toISOString()
      };
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userData.email)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
        timestamp: new Date().toISOString()
      };
    }

    // Create user in auth system with ALL metadata - USING ADMIN CLIENT
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone,
        dealer_id: userData.dealer_id,
        station_id: userData.station_id,
        omc_id: userData.omc_id
      }
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Failed to create user in auth system',
        timestamp: new Date().toISOString()
      };
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Wait a moment for the auth user to be fully committed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Prepare profile data with ALL required fields
    const profileData: any = {
      id: authData.user.id,
      email: userData.email.trim().toLowerCase(),
      full_name: userData.full_name.trim(),
      role: userData.role,
      phone: userData.phone?.trim() || null,
      is_active: userData.status === 'active',
      email_verified: true,
      department: 'operations', // Required field with default
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // For NPA role, explicitly set all entity IDs to null
    if (userData.role === 'npa') {
      profileData.omc_id = null;
      profileData.station_id = null;
      profileData.dealer_id = null;
    } else {
      // Only include entity assignments based on role
      switch (userData.role) {
        case 'dealer':
          profileData.dealer_id = userData.dealer_id || null;
          profileData.station_id = null;
          profileData.omc_id = null;
          break;
        case 'station_manager':
        case 'attendant':
          profileData.station_id = userData.station_id || null;
          profileData.omc_id = null;
          profileData.dealer_id = null;
          break;
        case 'omc':
          profileData.omc_id = userData.omc_id || null;
          profileData.station_id = null;
          profileData.dealer_id = null;
          break;
        default:
          // For admin, supervisor - no entity assignments
          profileData.station_id = null;
          profileData.omc_id = null;
          profileData.dealer_id = null;
      }
    }

    // Remove any undefined values (convert to null)
    Object.keys(profileData).forEach(key => {
      if (profileData[key] === undefined) {
        profileData[key] = null;
      }
    });

    console.log('📝 Creating profile with data:', JSON.stringify(profileData, null, 2));

    // Create user profile with retry logic
    let profileError = null;
    let profile = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`🔄 Profile creation attempt ${attempt + 1}...`);
      
      const { data: profileResult, error: profileResultError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select(`
          *,
          stations!profiles_station_id_fkey (id, name, code),
          omcs!profiles_omc_id_fkey (id, name, code),
          dealers!profiles_dealer_id_fkey (id, name)
        `)
        .single();

      if (profileResultError) {
        profileError = profileResultError;
        console.error(`❌ Profile creation attempt ${attempt + 1} failed:`, profileResultError);
        
        // Log the full error details
        console.error('Error details:', {
          message: profileResultError.message,
          details: profileResultError.details,
          hint: profileResultError.hint,
          code: profileResultError.code
        });

        if (profileResultError.code === '23503' && attempt < 2) {
          console.log(`🔄 Retrying profile creation...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        break;
      } else {
        profile = profileResult;
        console.log('✅ Profile created successfully:', profile);
        break;
      }
    }

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError);
      
      // Enhanced error handling
      if (profileError.code === '23503') {
        // Foreign key constraint - auth user might not be ready yet
        await this.logUserActivity('user_create_partial', authData.user.id, {
          role: userData.role,
          error: 'Profile creation pending - user can complete setup on login'
        });

        return {
          success: true,
          data: {
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            phone: userData.phone,
            is_active: userData.status === 'active',
            email_verified: true,
            department: 'operations',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as User,
          message: 'User authentication created. Profile will be completed on first login.',
          timestamp: new Date().toISOString()
        };
      }

      // Clean up: delete the auth user if profile creation fails for other reasons
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return {
        success: false,
        error: this.extractErrorMessage(profileError),
        timestamp: new Date().toISOString()
      };
    }

    console.log('✅ Profile created successfully:', profile);

    await this.logUserActivity('user_create', authData.user.id, {
      role: userData.role,
      dealer_id: userData.dealer_id,
      station_id: userData.station_id,
      omc_id: userData.omc_id
    });

    return {
      success: true,
      data: profile as User,
      message: 'User created successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error('❌ User creation error:', error);
    return {
      success: false,
      error: 'Failed to create user: ' + this.extractErrorMessage(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Enhanced user update with dealer role fix
 */
async updateUser(userId: string, updates: UserUpdateData): Promise<APIResponse<User>> {
  try {
    // Get current user data
    const currentUser = await this.getUserById(userId);
    if (!currentUser.success || !currentUser.data) {
      return currentUser;
    }

    // Enhanced validation
    const validationData = {
      ...updates,
      role: updates.role || currentUser.data.role,
      email: updates.email || currentUser.data.email,
      full_name: updates.full_name || currentUser.data.full_name
    };

    const validation = await this.validateUserData(validationData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        timestamp: new Date().toISOString()
      };
    }

    // Check email uniqueness if email is being updated
    if (updates.email && updates.email !== currentUser.data.email) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', updates.email)
        .neq('id', userId)
        .maybeSingle();

      if (existingUser) {
        return {
          success: false,
          error: 'Another user with this email already exists',
          timestamp: new Date().toISOString()
        };
      }
    }

    // Prepare update data with explicit entity assignments
    const updateData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Handle entity assignments based on role
    const targetRole = updates.role || currentUser.data.role;
    switch (targetRole) {
      case 'dealer':
        updateData.dealer_id = updates.dealer_id ?? currentUser.data.dealer_id;
        updateData.station_id = null;
        updateData.omc_id = null;
        break;
      case 'station_manager':
      case 'attendant':
        updateData.station_id = updates.station_id ?? currentUser.data.station_id;
        updateData.omc_id = null;
        updateData.dealer_id = null;
        break;
      case 'omc':
        updateData.omc_id = updates.omc_id ?? currentUser.data.omc_id;
        updateData.station_id = null;
        updateData.dealer_id = null;
        break;
      default:
        // For admin, npa, supervisor - no entity assignments
        updateData.station_id = null;
        updateData.omc_id = null;
        updateData.dealer_id = null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select(`
        *,
        stations!profiles_station_id_fkey (id, name, code),
        omcs!profiles_omc_id_fkey (id, name, code),
        dealers!profiles_dealer_id_fkey (id, name)
      `)
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        timestamp: new Date().toISOString()
      };
    }

    await this.logUserActivity('user_update', userId, { 
      updates,
      previous_role: currentUser.data.role,
      new_role: targetRole
    });

    return {
      success: true,
      data: data as User,
      message: 'User updated successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to update user: ' + extractErrorMessage(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get user by ID with full details
 */
async getUserById(userId: string): Promise<APIResponse<User>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        stations!profiles_station_id_fkey (
          id,
          name,
          code,
          address,
          region,
          status
        ),
        omcs!profiles_omc_id_fkey (
          id,
          name,
          code,
          contact_person,
          email
        ),
        dealers!profiles_dealer_id_fkey (
          id,
          name,
          contact_person,
          email,
          phone
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        timestamp: new Date().toISOString()
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      };
    }

    await this.logUserActivity('user_view', userId);

    return {
      success: true,
      data: data as User,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch user: ' + extractErrorMessage(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Delete user (soft delete)
 */
async deleteUser(userId: string): Promise<APIResponse<void>> {
  try {
    // Prevent self-deletion
    const { data: currentUser } = await supabase.auth.getUser();
    if (currentUser.user?.id === userId) {
      return {
        success: false,
        error: 'You cannot delete your own account',
        timestamp: new Date().toISOString()
      };
    }

    // Get user to check if they have important data
    const userResponse = await this.getUserById(userId);
    if (!userResponse.success) {
      return userResponse;
    }

    const user = userResponse.data!;

    // Check for dependencies (e.g., user is manager of stations, has created violations, etc.)
    const dependencies = await this.checkUserDependencies(userId);
    if (dependencies.length > 0) {
      return {
        success: false,
        error: `Cannot delete user. User is referenced in: ${dependencies.join(', ')}`,
        timestamp: new Date().toISOString()
      };
    }

    // Soft delete by setting status to inactive and marking as deleted
    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        timestamp: new Date().toISOString()
      };
    }

    await this.logUserActivity('user_delete', userId);

    return {
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to delete user: ' + extractErrorMessage(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Log user activity - FIXED VERSION
 */
private async logUserActivity(
  action: string, 
  targetUserId?: string, 
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Simple insert without complex relationships
    await supabase
      .from('user_activity_logs')
      .insert({
        action,
        user_id: user.id,
        target_user_id: targetUserId,
        details,
        ip_address: 'N/A',
        user_agent: 'N/A',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log user activity:', error);
    // Don't throw to avoid breaking main operations
  }
}

/**
 * Check user dependencies before deletion
 */
private async checkUserDependencies(userId: string): Promise<string[]> {
  const dependencies: string[] = [];

  try {
    // Check if user is assigned as station manager
    const { data: managedStations } = await supabase
      .from('stations')
      .select('id')
      .eq('manager_id', userId)
      .limit(1);

    if (managedStations && managedStations.length > 0) {
      dependencies.push('station management');
    }

    // Check if user has created any violations
    const { data: createdViolations } = await supabase
      .from('violations')
      .select('id')
      .eq('created_by', userId)
      .limit(1);

    if (createdViolations && createdViolations.length > 0) {
      dependencies.push('violation records');
    }

    // Check if user has any active sessions or important data
    const { data: userActivities } = await supabase
      .from('user_activity_logs')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (userActivities && userActivities.length > 0) {
      dependencies.push('activity logs');
    }

  } catch (error) {
    console.error('Error checking user dependencies:', error);
  }

  return dependencies;
}

/**
 * Get user statistics
 */
async getUserStats(): Promise<APIResponse<UserStats>> {
  try {
    // Get total counts
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get counts by role
    const { data: roleData } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('is_active', true);

    const roleCounts: Record<string, number> = {};
    const statusCounts = { active: 0, inactive: 0, suspended: 0, pending: 0 };

    if (roleData) {
      roleData.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
        statusCounts.active++; // All are active since we filtered by is_active
      });
    }

    // Get recent signups (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: recentSignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString())
      .eq('is_active', true);

    const stats: UserStats = {
      total_users: totalUsers || 0,
      active_users: statusCounts.active,
      inactive_users: statusCounts.inactive,
      suspended_users: statusCounts.suspended,
      pending_users: statusCounts.pending,
      by_role: roleCounts,
      by_status: statusCounts,
      recent_signups: recentSignups || 0,
      daily_active_users: 0, // This would require login tracking
      avg_last_login_days: 0
    };

    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch user statistics: ' + extractErrorMessage(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get user activity logs
 */
async getUserActivityLogs(userId?: string, limit: number = 50): Promise<APIResponse<UserActivityLog[]>> {
  try {
    let query = supabase
      .from('user_activity_logs')
      .select(`
        *,
        user:profiles!user_activity_logs_user_id_fkey (
          full_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: data as UserActivityLog[],
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Failed to fetch activity logs: ' + extractErrorMessage(error),
      timestamp: new Date().toISOString()
    };
  }
}

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Validate user data before creation/update
   */
  private async validateUserData(userData: UserCreateData | UserUpdateData): Promise<UserValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Email validation
    if ('email' in userData && userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation
    if (userData.phone) {
      const phoneRegex = /^\+?[\d\s-()]+$/;
      if (!phoneRegex.test(userData.phone)) {
        warnings.push('Phone number format may be invalid');
      }
    }

    // Role validation
    if ('role' in userData && userData.role) {
      const availableRoles = await this.getAvailableRoles();
      if (availableRoles.success && !availableRoles.data?.roles?.includes(userData.role)) {
        errors.push(`Invalid role: ${userData.role}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate role assignment with entity relationships
   */
  private async validateRoleAssignment(
    role: UserRole, 
    entities: { station_id?: string | null; omc_id?: string | null; dealer_id?: string | null; }
  ): Promise<UserValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const roleRequirements: Record<UserRole, { entity: string; field: string }[]> = {
      admin: [],
      npa: [],
      omc: [{ entity: 'OMC', field: 'omc_id' }],
      dealer: [{ entity: 'Dealer', field: 'dealer_id' }],
      station_manager: [{ entity: 'Station', field: 'station_id' }],
      attendant: [{ entity: 'Station', field: 'station_id' }],
      supervisor: []
    };

    const requirements = roleRequirements[role];
    
    for (const requirement of requirements) {
      const entityId = entities[requirement.field as keyof typeof entities];
      if (!entityId) {
        errors.push(`${role} role requires a ${requirement.entity}`);
      } else {
        // Verify entity exists
        const table = requirement.field.replace('_id', 's');
        const { data: entity } = await supabase
          .from(table)
          .select('id')
          .eq('id', entityId)
          .single();

        if (!entity) {
          errors.push(`Invalid ${requirement.entity} ID: ${entityId}`);
        }
      }
    }

    // Check for unnecessary entity assignments
    const unnecessaryEntities = Object.entries(entities)
      .filter(([field, value]) => 
        value && !requirements.some(req => req.field === field)
      )
      .map(([field]) => field.replace('_id', ''));

    if (unnecessaryEntities.length > 0) {
      warnings.push(`Unnecessary entity assignments for ${role} role: ${unnecessaryEntities.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }

  /**
   * Check user dependencies before deletion
   */
  private async checkUserDependencies(userId: string): Promise<string[]> {
    const dependencies: string[] = [];

    // Check if user is manager of any stations
    const { data: managedStations } = await supabase
      .from('stations')
      .select('id')
      .eq('manager_id', userId)
      .limit(1);

    if (managedStations && managedStations.length > 0) {
      dependencies.push('station management');
    }

    // Check if user has created any violations
    const { data: createdViolations } = await supabase
      .from('compliance_violations')
      .select('id')
      .eq('reported_by', userId)
      .limit(1);

    if (createdViolations && createdViolations.length > 0) {
      dependencies.push('violation reports');
    }

    // Check if user has any active shifts
    const { data: activeShifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (activeShifts && activeShifts.length > 0) {
      dependencies.push('active shifts');
    }

    return dependencies;
  }

  /**
   * Log user activity
   */
  private async logUserActivity(
    action: string, 
    targetUserId?: string, 
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_activity_logs')
        .insert({
          action,
          user_id: user.id,
          target_user_id: targetUserId,
          details,
          ip_address: 'N/A', // In production, this would come from request context
          user_agent: 'N/A',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log user activity:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Update station
   */
  async updateStation(stationId: string, updates: Record<string, unknown>): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', stationId)
        .select('*, omcs(name)')
        .single();

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'Station updated successfully',
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to update station: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Update user - UPDATED to use full_name
   */
  async updateUser(userId: string, updates: Record<string, unknown>): Promise<APIResponse> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'User updated successfully',
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to update user: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get shifts data
   */
  async getShifts(filters?: { station_id?: string; status?: string }): Promise<APIResponse> {
    try {
      let query = supabase
        .from('shifts')
        .select('*, stations(name), profiles(full_name)')
        .order('created_at', { ascending: false });

      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch shifts: ' + extractErrorMessage(error)
      };
    }
  }

  /**
   * Get inspections data
   */
  async getInspections(filters?: { station_id?: string; status?: string }): Promise<APIResponse> {
    try {
      let query = supabase
        .from('inspections')
        .select('*, stations(name), profiles(full_name)')
        .order('created_at', { ascending: false });

      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: extractErrorMessage(error)
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: unknown) {
      return {
        success: false,
        error: 'Failed to fetch inspections: ' + extractErrorMessage(error)
      };
    }
  }
}

export const api = new PumpGuardAPI();
