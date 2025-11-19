// components/layouts/DesktopLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from './Navbar';
import { cn } from '@/lib/utils';
import { 
  Home, 
  BarChart3, 
  Users, 
  Settings,
  ShoppingCart,
  Package,
  Shield,
  Building2,
  Fuel,
  Banknote,
  FileText,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Landmark,
  Receipt,
  ClipboardList,
  Scale,
  Store,
  UserCog,
  Calendar,
  Zap,
  Target,
  Percent,
  BadgePercent,
  Coins,
  HandCoins
} from 'lucide-react';

interface DesktopLayoutProps {
  children: React.ReactNode;
}

export default function DesktopLayout({ children }: DesktopLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user } = useAuth();

  const getNavigationItems = () => {
    if (!user) return [];

    const commonItems = [
      { path: '/', icon: Home, label: 'Dashboard' },
      { path: '/reports', icon: BarChart3, label: 'Reports' },
    ];

    switch (user.role) {
      case 'admin':
        return [
          ...commonItems,
          { path: '/users', icon: Users, label: 'User Management' },
          { path: '/stations', icon: Building2, label: 'Stations' },
          { path: '/management/omc', icon: Building2, label: 'OMC Management' },
          { path: '/management/dealer', icon: Store, label: 'Dealer Management' },
          { path: '/compliance', icon: Shield, label: 'Compliance' },
          { path: '/violations', icon: AlertTriangle, label: 'Violations' },
          { path: '/price-caps', icon: Banknote, label: 'Price Caps' },
          { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
          { path: '/sales-management', icon: Receipt, label: 'Sales Management' },
          { path: '/inventory', icon: Package, label: 'Inventory' },
          { path: '/shifts', icon: ClipboardList, label: 'Shifts' },
          { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
          { path: '/financial', icon: DollarSign, label: 'Financial' },
          { path: '/commission', icon: BadgePercent, label: 'Commission Management' },
          { path: '/creditors', icon: UserCog, label: 'Creditors' },
          { path: '/expenses', icon: CreditCard, label: 'Expenses' },
        ];
      case 'npa_supervisor':
        return [
          ...commonItems,
          { path: '/compliance', icon: Shield, label: 'Compliance' },
          { path: '/violations', icon: AlertTriangle, label: 'Violations' },
          { path: '/price-caps', icon: Banknote, label: 'Price Caps' },
          { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
        ];
      case 'npa':
        return [
          ...commonItems,
          { path: '/compliance', icon: Shield, label: 'Compliance' },
          { path: '/violations', icon: AlertTriangle, label: 'Violations' },
          { path: '/price-caps', icon: Banknote, label: 'Price Caps' },
        ];
      case 'supervisor':
        return [
          ...commonItems,
          { path: '/stations', icon: Building2, label: 'Stations' },
          { path: '/compliance', icon: Shield, label: 'Compliance' },
          { path: '/violations', icon: AlertTriangle, label: 'Violations' },
          { path: '/sales-management', icon: Receipt, label: 'Sales' },
          { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
          { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
        ];
      case 'omc':
        return [
          ...commonItems,
          { path: '/stations', icon: Building2, label: 'My Stations' },
          { path: '/management/dealer', icon: Store, label: 'Dealer Management' },
          { path: '/sales-management', icon: Receipt, label: 'Sales Management' },
          { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
          { path: '/price-caps', icon: Banknote, label: 'Price Caps' },
          { path: '/inventory', icon: Package, label: 'Inventory' },
          { path: '/financial', icon: DollarSign, label: 'Financial' },
          { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
          { path: '/commission', icon: BadgePercent, label: 'Commission Management' },
        ];
      case 'dealer':
        return [
          ...commonItems,
          { path: '/stations', icon: Building2, label: 'My Stations' },
          { path: '/sales-management', icon: Receipt, label: 'Sales Management' },
          { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
          { path: '/inventory', icon: Package, label: 'Inventory' },
          // ✅ ADDED: Creditors for Dealer
          { path: '/creditors', icon: UserCog, label: 'Creditors' },
          { path: '/financial', icon: DollarSign, label: 'Financial' },
          { path: '/expenses', icon: CreditCard, label: 'Expenses' },
          { path: '/commission', icon: BadgePercent, label: 'Commission Management' },
        ];
      case 'station_manager':
        return [
          ...commonItems,
          { path: '/pos', icon: ShoppingCart, label: 'POS Terminal' },
          { path: '/sales-management', icon: Receipt, label: 'Sales Management' },
          { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
          { path: '/inventory', icon: Package, label: 'Inventory' },
          { path: '/shifts', icon: ClipboardList, label: 'Shift Management' },
          { path: '/expenses', icon: CreditCard, label: 'Expenses' },
          { path: '/reports/daily', icon: FileText, label: 'Daily Reports' },
          // ✅ ADDED: Creditors for Station Manager
          { path: '/creditors', icon: UserCog, label: 'Creditors' },
         
        ];
      case 'attendant':
        return [
          { path: '/', icon: Home, label: 'Dashboard' },
          { path: '/pos', icon: ShoppingCart, label: 'POS Terminal' },
          { path: '/sales-management', icon: Receipt, label: 'My Sales' },
          { path: '/reports/daily', icon: FileText, label: 'Daily Report' },
         
        ];
      default:
        return commonItems;
    }
  };

  const navItems = getNavigationItems();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedItems(newExpanded);
  };

  const isActivePath = (itemPath: string) => {
    return location.pathname === itemPath || 
           (itemPath !== '/' && location.pathname.startsWith(itemPath));
  };

  const renderNavItem = (item: any, level = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isActivePath(item.path);
    const isExpanded = expandedItems.has(item.path);

    return (
      <div key={item.path}>
        <Link
          to={hasChildren ? '#' : item.path}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpanded(item.path);
            }
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
            isActive
              ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            level > 0 && "ml-4"
          )}
        >
          <Icon size={20} className={cn(
            "flex-shrink-0",
            isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
          )} />
          {sidebarOpen && (
            <>
              <span className="font-medium flex-1">{item.label}</span>
              {hasChildren && (
                <ChevronRight 
                  size={16} 
                  className={cn(
                    "transition-transform duration-200",
                    isExpanded ? "rotate-90" : ""
                  )} 
                />
              )}
            </>
          )}
          {!sidebarOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              {item.label}
            </div>
          )}
        </Link>

        {/* Render children if expanded */}
        {hasChildren && sidebarOpen && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children.map((child: any) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <Fuel className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-lg">PumpGuard</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {/* User Info & Settings at Bottom */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {/* User Info */}
          {sidebarOpen && user && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Settings Link */}
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
              location.pathname === '/settings' || location.pathname.startsWith('/settings/')
                ? "bg-blue-50 text-blue-600 border border-blue-200"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Settings size={20} className={cn(
              "flex-shrink-0",
              location.pathname === '/settings' ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
            )} />
            {sidebarOpen && (
              <span className="font-medium">Settings</span>
            )}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Settings
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}