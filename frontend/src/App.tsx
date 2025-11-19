// App.tsx
import React, { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PriceProvider } from "./contexts/PriceContext";
import DesktopLayout from "./components/layouts/DesktopLayout";
import MobileLayout from "./components/layouts/MobileLayout";

// Auth pages
import Welcome from "./pages/auth/Welcome";
import Login from "./pages/auth/Login";
import SetupWizard from "./pages/auth/SetupWizard";

// Desktop Dashboards
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import OMCDashboard from "./pages/dashboard/OMCDashboard";
import DealerDashboard from "./pages/dashboard/DealerDashboard";
import StationManagerDashboard from "./pages/dashboard/StationManagerDashboard";
import AttendantDashboard from "./pages/dashboard/AttendantDashboard";
import NPADashboard from "./pages/dashboard/NPADashboard";

// Mobile Dashboards
import MobileDealerDashboard from "./pages/mobile/MobileDealerDashboard";
import MobileStationManagerDashboard from "./pages/mobile/MobileStationManagerDashboard";

// Management
import OMCManagement from "./pages/management/OMCManagement";
import DealerManagement from "./pages/management/DealerManagement";

// Operations
import POSTerminal from "./pages/operations/POSTerminal";
import ShiftManagement from "./pages/operations/ShiftManagement";
import PumpCalibration from "./pages/operations/PumpCalibration";

// Mobile Operations
import MobileShiftManagement from "./pages/mobile/MobileShiftManagement";

// Financial
import BankDeposits from "./pages/financial/BankDeposits";
import CreditorsManager from "./pages/financial/CreditorsManager";
import ExpenseTracker from "./pages/financial/ExpenseTracker";
import SalesManagement from "./pages/financial/SalesManagement";

// Commission Management - SINGLE FILE
import Commission from "./pages/financial/Commission";

// Mobile Financial
import MobileBankDeposits from "./pages/mobile/MobileBankDeposits";
import MobileExpenseTracker from "./pages/mobile/MobileExpenseTracker";
import MobileSalesManagement from "./pages/mobile/MobileSalesManagement";

// Mobile Commission
import MobileCommission from "./pages/mobile/MobileCommission";

// Inventory
import InventoryManagement from "./pages/inventory/InventoryManagement";

// Mobile Inventory
import MobileInventoryManagement from "./pages/mobile/MobileInventoryManagement";

// Compliance
import ComplianceTracker from "./pages/compliance/ComplianceTracker";
import PriceCapManager from "./pages/compliance/PriceCapManager";
import ViolationManager from "./pages/compliance/ViolationManager";

// Mobile Compliance
import MobilePriceManager from "./pages/mobile/MobilePriceManager";

// Reports
import AnalyticsDashboard from "./pages/reports/AnalyticsDashboard";
import DailyReports from "./pages/reports/DailyReports";
import SalesReports from "./pages/reports/SalesReports";

// Settings
import Settings from "./pages/settings/Settings";
import Profile from "./pages/settings/Profile";
import BrandingManager from "./pages/settings/BrandingManager";

// Mobile Settings
import MobileSettings from "./pages/mobile/MobileSettings";
import MobileProfile from "./pages/mobile/MobileProfile";

// Shared
import Notifications from "./pages/shared/Notifications";
import AppTour from "./pages/shared/AppTour";
import LoaderScreen from "./pages/shared/LoaderScreen";

// Custom
import { UserManagement } from "./pages/users/UserManagement";
import { StationsList } from "./pages/stations/StationsList";

// Mobile Stations
import MobileStationsList from "./pages/mobile/MobileStationsList";

// Error boundary for runtime errors
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  sessionStorage.clear();
                  localStorage.removeItem("pumpguard_offline_user");
                  localStorage.removeItem("pumpguard_offline_email");
                  localStorage.removeItem("pumpguard-session");
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Session & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// 🚀 INSTANT: Dashboard Router with mobile detection
const DashboardRouter: React.FC = () => {
  const { user, isDataStale, refreshData } = useAuth();
  const isMobile = useIsMobile();
  
  // Show refresh prompt if data is stale
  if (isDataStale) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-yellow-800 font-medium">Showing cached data</h3>
              <p className="text-yellow-700 text-sm">We're updating your information in the background.</p>
            </div>
            <button
              onClick={refreshData}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
        
        {/* Skeleton loader */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-xl h-28"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-xl h-96"></div>
        </div>
      </div>
    );
  }
  
  // Mobile-specific dashboards
  if (isMobile) {
    switch (user?.role) {
      case "dealer": return <MobileDealerDashboard />;
      case "station_manager": return <MobileStationManagerDashboard />;
      case "attendant": return <MobileStationManagerDashboard />;
      // For other roles, fall back to desktop version
      default: break;
    }
  }
  
  // Desktop dashboards
  switch (user?.role) {
    case "admin": return <AdminDashboard />;
    case "omc": return <OMCDashboard />;
    case "dealer": return <DealerDashboard />;
    case "station_manager": return <StationManagerDashboard />;
    case "attendant": return <AttendantDashboard />;
    case "npa_supervisor": return <NPADashboard />;
    default: return <AdminDashboard />;
  }
};

// 🚀 INSTANT: Route handler with mobile detection
const RouteHandler: React.FC<{ 
  desktopComponent: React.ComponentType,
  mobileComponent: React.ComponentType 
}> = ({ desktopComponent: DesktopComponent, mobileComponent: MobileComponent }) => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileComponent /> : <DesktopComponent />;
};

// 🚀 INSTANT: Main app content - no loading delays
const AppContent: React.FC = () => {
  const { user, isLoading, isDataLoading, isSetupComplete, error } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Show loading screen during initial auth check
  if (isLoading) {
    return (
      <LoaderScreen 
        message="Launching PumpGuard..."
        subMessage="Initializing your session"
      />
    );
  }

  // Show error state if authentication failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                sessionStorage.clear();
                localStorage.removeItem("pumpguard_offline_user");
                localStorage.removeItem("pumpguard_offline_email");
                localStorage.removeItem("pumpguard-session");
                window.location.href = "/login";
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Data & Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Authenticated user: show full app
  if (user) {
    console.log("✅ User authenticated, showing main app:", user.email);
    
    // Choose layout based on device
    const Layout = isMobile ? MobileLayout : DesktopLayout;
    
    return (
      <PriceProvider>
        <Layout>
          {/* 🚀 Subtle loading indicator for background updates */}
          {isDataLoading && (
            <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-50">
              <div className="h-full bg-blue-600 animate-pulse transition-all duration-300"></div>
            </div>
          )}
          
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<DashboardRouter />} />
            <Route path="/dashboard" element={<DashboardRouter />} />

            {/* User Management */}
            <Route path="/users" element={<UserManagement />} />
            
            {/* Stations - Mobile optimized */}
            <Route 
              path="/stations" 
              element={
                <RouteHandler 
                  desktopComponent={StationsList}
                  mobileComponent={MobileStationsList}
                />
              } 
            />

            {/* Management Routes */}
            <Route path="/management/omc" element={<OMCManagement />} />
            <Route path="/management/dealer" element={<DealerManagement />} />
            <Route path="/management" element={<Navigate to="/management/omc" replace />} />

            {/* Operations - Mobile optimized */}
            <Route 
              path="/shifts" 
              element={
                <RouteHandler 
                  desktopComponent={ShiftManagement}
                  mobileComponent={MobileShiftManagement}
                />
              } 
            />
            <Route path="/pos" element={<POSTerminal />} />
            <Route path="/calibration" element={<PumpCalibration />} />

            {/* Financial - Mobile optimized */}
            <Route 
              path="/bank-deposits" 
              element={
                <RouteHandler 
                  desktopComponent={BankDeposits}
                  mobileComponent={MobileBankDeposits}
                />
              } 
            />
            <Route path="/creditors" element={<CreditorsManager />} />
            <Route 
              path="/expenses" 
              element={
                <RouteHandler 
                  desktopComponent={ExpenseTracker}
                  mobileComponent={MobileExpenseTracker}
                />
              } 
            />
            <Route path="/financial" element={<BankDeposits />} />
            
            {/* Sales Management - Mobile optimized */}
            <Route 
              path="/sales-management" 
              element={
                <RouteHandler 
                  desktopComponent={SalesManagement}
                  mobileComponent={MobileSalesManagement}
                />
              } 
            />
            <Route path="/financial/sales" element={<SalesManagement />} />
            
            {/* ✅ SINGLE COMMISSION PAGE - Everything in one file */}
            <Route 
              path="/commission" 
              element={
                <RouteHandler 
                  desktopComponent={Commission}
                  mobileComponent={MobileCommission}
                />
              } 
            />
            <Route 
              path="/commission/*" 
              element={
                <RouteHandler 
                  desktopComponent={Commission}
                  mobileComponent={MobileCommission}
                />
              } 
            />

            {/* Inventory - Mobile optimized */}
            <Route 
              path="/inventory" 
              element={
                <RouteHandler 
                  desktopComponent={InventoryManagement}
                  mobileComponent={MobileInventoryManagement}
                />
              } 
            />

            {/* Compliance - Mobile optimized */}
            <Route path="/compliance" element={<ComplianceTracker />} />
            <Route 
              path="/price-caps" 
              element={
                <RouteHandler 
                  desktopComponent={PriceCapManager}
                  mobileComponent={MobilePriceManager}
                />
              } 
            />
            <Route path="/violations" element={<ViolationManager />} />

            {/* Reports */}
            <Route path="/reports" element={<SalesReports />} />
            <Route path="/reports/analytics" element={<AnalyticsDashboard />} />
            <Route path="/reports/daily" element={<DailyReports />} />
            <Route path="/reports/sales" element={<SalesReports />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />

            {/* Settings - Mobile optimized */}
            <Route 
              path="/settings" 
              element={
                <RouteHandler 
                  desktopComponent={Settings}
                  mobileComponent={MobileSettings}
                />
              } 
            />
            <Route 
              path="/settings/profile" 
              element={
                <RouteHandler 
                  desktopComponent={Profile}
                  mobileComponent={MobileProfile}
                />
              } 
            />
            <Route path="/settings/branding" element={<BrandingManager />} />

            {/* Shared */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/tour" element={<AppTour />} />

            {/* Default - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </PriceProvider>
    );
  }

  // 🧭 Auth flow for unauthenticated users
  console.log("👤 User not authenticated, showing auth flow");
  
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Welcome isSetupComplete={isSetupComplete} />} />
        <Route path="/welcome" element={<Welcome isSetupComplete={isSetupComplete} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<SetupWizard onComplete={() => window.location.reload()} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

// 🚀 MAIN APP
const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
        
        <Toaster
          position="top-right"
          duration={4000}
          toastOptions={{
            style: {
              background: "#fff",
              color: "#1f2937",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 10px 25px -3px rgba(0,0,0,0.1)",
            },
            success: { 
              style: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
              duration: 3000
            },
            error: { 
              style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
              duration: 5000
            },
          }}
        />
      </AuthProvider>
    </AppErrorBoundary>
  );
};

export default App;