export type UserRole = 
  | 'admin' 
  | 'npa' 
  | 'omc' 
  | 'dealer' 
  | 'station_manager' 
  | 'attendant' 
  | 'supervisor';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role?: UserRole;
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
}