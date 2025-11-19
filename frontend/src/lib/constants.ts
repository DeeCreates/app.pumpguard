export const ROLE_HIERARCHY = {
  admin: ['admin', 'npa', 'omc', 'dealer', 'station_manager', 'attendant', 'supervisor'],
  npa: ['npa', 'omc', 'dealer', 'station_manager', 'attendant'],
  omc: ['dealer', 'station_manager', 'attendant'],
  dealer: ['station_manager', 'attendant'],
  station_manager: ['attendant'],
  attendant: [],
  supervisor: ['station_manager', 'attendant']
} as const;

export const ALL_ROLES = ['admin', 'npa', 'omc', 'dealer', 'station_manager', 'attendant', 'supervisor'] as const;

export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100
} as const;