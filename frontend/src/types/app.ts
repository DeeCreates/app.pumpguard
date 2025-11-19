export interface User {
  id: string;
  email?: string;
  role: 'admin' | 'supervisor' | 'omc' | 'dealer' | 'station_manager' | 'attendant';
  full_name: string;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
  phone?: string;
  is_active?: boolean;
  last_login_at?: string;
  dealer_id?: string;
  omc_id?: string;
  station_id?: string;
}

export interface OMC {
  id: string;
  name: string;
  code: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  region?: string;
  logo_url?: string;
  brand_color?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  address: string;
  region: string;
  city?: string;
  gps_coordinates?: any;
  omc_id?: string;
  dealer_id?: string;
  manager_id?: string;
  pumps_count?: number;
  down_stock?: number;
  status?: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

export interface DashboardStats {
  total_revenue: number;
  total_volume: number;
  total_transactions: number;
  active_stations: number;
  compliance_rate: number;
  average_efficiency: number;
}