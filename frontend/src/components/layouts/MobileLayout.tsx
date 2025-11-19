// components/layouts/MobileLayout.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  CreditCard,
  TrendingUp,
  Calendar,
  FileText,
  Wallet,
  Zap,
  Menu,
  X,
  Bell,
  User,
  Percent,
  BadgePercent,
  Coins,
  HandCoins,
  Target,
  Landmark,
  Receipt,
  ClipboardList,
  AlertTriangle,
  Banknote,
  UserCog,
  DollarSign,
  Store,
  ChevronRight // Added missing import
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, notifications } = useAuth();
  const [activeTab, setActiveTab] = useState('/');
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getTabsForRole = () => {
    if (!user) return [];

    const baseTabs = [
      { path: '/', icon: Home, label: 'Dashboard', exact: true },
      { path: '/reports', icon: BarChart3, label: 'Reports' },
    ];

    const getCommissionSection = (role: string) => {
      const commissionItems = {
        admin: [
          { path: '/commission/omc', icon: Building2, label: 'OMC Commission' },
          { path: '/commission/dealer', icon: Store, label: 'Dealer Commission' },
          { path: '/commission/overview', icon: BarChart3, label: 'Commission Overview' }
        ],
        omc: [
          { path: '/commission/earnings', icon: Coins, label: 'Commission Earnings' },
          { path: '/commission/statements', icon: FileText, label: 'Commission Statements' },
          { path: '/commission/settings', icon: Settings, label: 'Commission Settings' }
        ],
        dealer: [
          { path: '/commission/earnings', icon: Coins, label: 'Commission Earnings' },
          { path: '/commission/history', icon: BarChart3, label: 'Commission History' },
          { path: '/commission/payouts', icon: DollarSign, label: 'Payouts' }
        ],
        station_manager: [
          { path: '/commission/earnings', icon: Coins, label: 'My Earnings' },
          { path: '/commission/targets', icon: Target, label: 'Sales Targets' }
        ],
        attendant: [
          { path: '/commission/earnings', icon: Coins, label: 'My Earnings' }
        ]
      };

      return commissionItems[role as keyof typeof commissionItems] || [];
    };

    const roleTabs = {
      admin: [
        ...baseTabs,
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
        { 
          section: 'commission',
          icon: Percent, 
          label: 'Commission Management',
          children: getCommissionSection('admin')
        },
        { path: '/creditors', icon: UserCog, label: 'Creditors' },
        { path: '/expenses', icon: CreditCard, label: 'Expenses' },
      ],
      npa_supervisor: [
        ...baseTabs,
        { path: '/compliance', icon: Shield, label: 'Compliance' },
        { path: '/violations', icon: AlertTriangle, label: 'Violations' },
        { path: '/price-caps', icon: Banknote, label: 'Price Caps' },
        { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
      ],
      npa: [
        ...baseTabs,
        { path: '/compliance', icon: Shield, label: 'Compliance' },
        { path: '/violations', icon: AlertTriangle, label: 'Violations' },
        { path: '/price-caps', icon: Banknote, label: 'Price Caps' },
      ],
      supervisor: [
        ...baseTabs,
        { path: '/stations', icon: Building2, label: 'Stations' },
        { path: '/compliance', icon: Shield, label: 'Compliance' },
        { path: '/violations', icon: AlertTriangle, label: 'Violations' },
        { path: '/sales-management', icon: Receipt, label: 'Sales' },
        { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
        { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
      ],
      omc: [
        ...baseTabs,
        { path: '/stations', icon: Building2, label: 'My Stations' },
        { path: '/management/dealer', icon: Store, label: 'Dealer Management' },
        { path: '/sales-management', icon: Receipt, label: 'Sales Management' },
        { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
        { path: '/price-caps', icon: Banknote, label: 'Price Caps' },
        { path: '/inventory', icon: Package, label: 'Inventory' },
        { path: '/financial', icon: DollarSign, label: 'Financial' },
        { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
        { 
          section: 'commission',
          icon: BadgePercent, 
          label: 'My Commission',
          children: getCommissionSection('omc')
        },
      ],
      dealer: [
        ...baseTabs,
        { path: '/stations', icon: Building2, label: 'My Stations' },
        { path: '/sales-management', icon: Receipt, label: 'Sales Management' },
        { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
        { path: '/inventory', icon: Package, label: 'Inventory' },
        { path: '/creditors', icon: UserCog, label: 'Creditors' },
        { path: '/financial', icon: DollarSign, label: 'Financial' },
        { path: '/expenses', icon: CreditCard, label: 'Expenses' },
        { 
          section: 'commission',
          icon: HandCoins, 
          label: 'My Commission',
          children: getCommissionSection('dealer')
        },
      ],
      station_manager: [
        { path: '/', icon: Home, label: 'Dashboard', exact: true },
        { path: '/pos', icon: ShoppingCart, label: 'POS Terminal' },
        { path: '/sales-management', icon: Receipt, label: 'Sales Management' },
        { path: '/bank-deposits', icon: Landmark, label: 'Bank Deposits' },
        { path: '/inventory', icon: Package, label: 'Inventory' },
        { path: '/shifts', icon: ClipboardList, label: 'Shift Management' },
        { path: '/expenses', icon: CreditCard, label: 'Expenses' },
        { path: '/reports/daily', icon: FileText, label: 'Daily Reports' },
        { path: '/creditors', icon: UserCog, label: 'Creditors' },
        { 
          section: 'commission',
          icon: Percent, 
          label: 'Commission',
          children: getCommissionSection('station_manager')
        },
      ],
      attendant: [
        { path: '/', icon: Home, label: 'Dashboard', exact: true },
        { path: '/pos', icon: ShoppingCart, label: 'POS Terminal' },
        { path: '/sales-management', icon: Receipt, label: 'My Sales' },
        { path: '/reports/daily', icon: FileText, label: 'Daily Report' },
        { path: '/commission/earnings', icon: Coins, label: 'My Earnings' },
      ]
    };

    return roleTabs[user.role as keyof typeof roleTabs] || baseTabs;
  };

  const getBottomNavigationTabs = () => {
    if (!user) return [];

    const roleBottomTabs = {
      admin: [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/stations', icon: Building2, label: 'Stations' },
        { path: '/reports', icon: BarChart3, label: 'Reports' },
        { path: '/commission', icon: Percent, label: 'Commission' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ],
      npa_supervisor: [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/compliance', icon: Shield, label: 'Compliance' },
        { path: '/price-caps', icon: CreditCard, label: 'Prices' },
        { path: '/reports', icon: BarChart3, label: 'Reports' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ],
      omc: [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/stations', icon: Building2, label: 'Stations' },
        { path: '/sales-management', icon: TrendingUp, label: 'Sales' },
        { path: '/commission', icon: BadgePercent, label: 'Commission' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ],
      dealer: [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/stations', icon: Building2, label: 'Stations' },
        { path: '/sales-management', icon: TrendingUp, label: 'Sales' },
        { path: '/commission', icon: HandCoins, label: 'Commission' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ],
      station_manager: [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/pos', icon: ShoppingCart, label: 'POS' },
        { path: '/shifts', icon: Calendar, label: 'Shifts' },
        { path: '/inventory', icon: Package, label: 'Stock' },
        { path: '/settings', icon: Settings, label: 'More' },
      ],
      attendant: [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/pos', icon: ShoppingCart, label: 'POS' },
        { path: '/shifts', icon: Calendar, label: 'Shifts' },
        { path: '/sales-management', icon: TrendingUp, label: 'Sales' },
        { path: '/settings', icon: Settings, label: 'More' },
      ]
    };

    return roleBottomTabs[user.role as keyof typeof roleBottomTabs] || [
      { path: '/', icon: Home, label: 'Home' },
      { path: '/reports', icon: BarChart3, label: 'Reports' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ];
  };

  const allTabs = getTabsForRole();
  const bottomTabs = getBottomNavigationTabs();

  const handleTabClick = (path: string) => {
    navigate(path);
    setActiveTab(path);
    setShowSidebar(false);
  };

  const isTabActive = (tab: { path: string; exact?: boolean }) => {
    if (tab.exact) {
      return activeTab === tab.path;
    }
    return activeTab.startsWith(tab.path);
  };

  const renderNavItem = (item: any, level = 0) => {
    if (item.section) {
      // This is a section with children
      const Icon = item.icon;
      const isExpanded = expandedSections.has(item.section);
      const hasActiveChild = item.children?.some((child: any) => isTabActive(child));

      return (
        <div key={item.section} className="space-y-1">
          <button
            onClick={() => toggleSection(item.section)}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-left touch-manipulation active:scale-95",
              hasActiveChild
                ? "bg-blue-50 text-blue-600 border border-blue-200"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium flex-1">{item.label}</span>
            <div className={cn(
              "transition-transform duration-200",
              isExpanded ? "rotate-90" : ""
            )}>
              <ChevronRight size={16} />
            </div>
          </button>

          {isExpanded && (
            <div className="ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
              {item.children.map((child: any) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    } else {
      // This is a regular navigation item
      const Icon = item.icon;
      const active = isTabActive(item);

      return (
        <button
          key={item.path}
          onClick={() => handleTabClick(item.path)}
          className={cn(
            "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-left touch-manipulation active:scale-95",
            active
              ? "bg-blue-50 text-blue-600 border border-blue-200"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            level > 0 && "ml-2"
          )}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium flex-1">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 min-w-[20px] text-xs">
              {item.badge}
            </Badge>
          )}
        </button>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 safe-area-padding">
      {/* Enhanced Navbar with Mobile Menu */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 supports-backdrop-blur:bg-white/60">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-3">
            <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 touch-manipulation active:scale-95 transition-transform"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Sidebar Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">PumpGuard</h2>
                        <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Navigation */}
                  <ScrollArea className="flex-1">
                    <nav className="p-4 space-y-1">
                      {allTabs.map((item) => renderNavItem(item))}
                    </nav>
                  </ScrollArea>

                  {/* Sidebar Footer */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.full_name || user?.email?.split('@')[0]}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                      </div>
                      
                      {/* Settings Link */}
                      <button
                        onClick={() => handleTabClick('/settings')}
                        className={cn(
                          "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-left touch-manipulation active:scale-95",
                          location.pathname.startsWith('/settings')
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {bottomTabs.find(tab => isTabActive(tab))?.label || 'PumpGuard'}
              </h1>
              <p className="text-sm text-gray-500 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Notifications and Quick Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleTabClick('/notifications')}
              className="h-10 w-10 relative touch-manipulation active:scale-95 transition-transform"
            >
              <Bell className="h-5 w-5" />
              {notifications?.filter((n: any) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter((n: any) => !n.read).length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container-apple px-4 pb-24 pt-4 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Enhanced Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/60 safe-area-inset-bottom z-40">
        <div className="flex justify-around items-center px-2 py-2">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab);
            
            return (
              <button
                key={tab.path}
                onClick={() => handleTabClick(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 p-2 rounded-xl transition-all duration-200 min-h-[44px] touch-manipulation active:scale-95 relative",
                  active 
                    ? "text-blue-600 bg-blue-50/80" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <div className="relative">
                  <Icon 
                    size={20} 
                    className={cn(
                      "transition-transform duration-200",
                      active ? "scale-110" : "scale-100"
                    )} 
                  />
                </div>
                <span className={cn(
                  "text-xs font-medium mt-1 transition-all duration-200",
                  active ? "text-blue-600" : "text-gray-500"
                )}>
                  {tab.label}
                </span>
                
                {/* Active indicator */}
                {active && (
                  <div className="absolute -top-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Safe area spacer for devices with home indicators */}
      <div className="h-8 safe-area-spacer" />
    </div>
  );
}