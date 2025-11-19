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
}

export interface StationDetails extends Station {
  omc_name?: string;
  dealer_name?: string;
  manager_name?: string;
  compliance_status: 'compliant' | 'non_compliant' | 'under_review';
  total_violations: number;
  total_sales: number;
}

export interface StationFilters extends BaseFilters {
  omc_id?: string;
  dealer_id?: string;
  region?: string;
  status?: string[];
  compliance_status?: string[];
}