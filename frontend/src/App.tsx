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

// Verification
import ReportVerification from "./pages/verify/report";

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
        <LoaderScreen 
          message="Application Error"
          subMessage="Something went wrong. Please try reloading the application."
        />
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

// 🚀 Dashboard Router with mobile detection
const DashboardRouter: React.FC = () => {
  const { user, isDataStale } = useAuth();
  const isMobile = useIsMobile();
  
  if (isDataStale) {
    return (
      <LoaderScreen 
        message="Updating Data..."
        subMessage="We're refreshing your information in the background"
      />
    );
  }
  
  if (!user) {
    return (
      <LoaderScreen 
        message="Loading Dashboard..."
        subMessage="Preparing your personalized view"
      />
    );
  }
  
  if (isMobile) {
    switch (user?.role) {
      case "dealer": return <MobileDealerDashboard />;
      case "station_manager": return <MobileStationManagerDashboard />;
      case "attendant": return <MobileStationManagerDashboard />;
      default: return (
        <LoaderScreen 
          message="Preparing Mobile View..."
          subMessage="Setting up your mobile interface"
        />
      );
    }
  }
  
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

// 🚀 Route handler with mobile detection
const RouteHandler: React.FC<{ 
  desktopComponent: React.ComponentType,
  mobileComponent: React.ComponentType 
}> = ({ desktopComponent: DesktopComponent, mobileComponent: MobileComponent }) => {
  const isMobile = useIsMobile();
  const { isDataLoading } = useAuth();
  
  if (isDataLoading) {
    return (
      <LoaderScreen 
        message="Loading Content..."
        subMessage="Fetching the latest data"
      />
    );
  }
  
  return isMobile ? <MobileComponent /> : <DesktopComponent />;
};

// 🚀 Suspense wrapper for lazy loaded routes
const SuspenseLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <LoaderScreen 
      message="Loading Module..."
      subMessage="Please wait while we prepare this section"
    />
  }>
    {children}
  </Suspense>
);

// 🚀 Main app content - ULTIMATE FIX
const AppContent: React.FC = () => {
  const { user, isLoading, isDataLoading, isSetupComplete, error } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [initialLoad, setInitialLoad] = useState(true);
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  useEffect(() => {
    if (!isLoading && user !== undefined) {
      const timer = setTimeout(() => {
        setInitialLoad(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  // 🚀 CRITICAL: Handle logout redirect without flash
  useEffect(() => {
    // Check if we should show auth flow (no user, not loading)
    if (!isLoading && !user && !showAuthFlow) {
      // Use setTimeout to allow React to finish current render cycle
      const timer = setTimeout(() => {
        setShowAuthFlow(true);
      }, 0);
      
      return () => clearTimeout(timer);
    }
    
    // Reset if user logs back in
    if (user && showAuthFlow) {
      setShowAuthFlow(false);
    }
  }, [isLoading, user, showAuthFlow]);

  // Show initial app loader
  if (initialLoad) {
    return (
      <LoaderScreen 
        message="Launching PumpGuard..."
        subMessage="Initializing your session"
      />
    );
  }

  // Show loading screen during auth check
  if (isLoading) {
    return (
      <LoaderScreen 
        message="Checking Authentication..."
        subMessage="Verifying your credentials"
      />
    );
  }

  // Show error state if authentication failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-white"
            >
              <path d="M12 2v20M9 22h6" />
              <path d="M9 6h6v4H9z" />
              <path d="M17 7V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3" />
              <circle cx="12" cy="10" r="2" />
            </svg>
          </div>
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
                localStorage.removeItem("supabase_last_refresh");
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
    const Layout = isMobile ? MobileLayout : DesktopLayout;
    
    return (
      <PriceProvider>
        <Layout>
          {isDataLoading && (
            <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-700 z-50">
              <div className="h-full bg-blue-400 animate-pulse transition-all duration-300"></div>
            </div>
          )}
          
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<DashboardRouter />} />
            <Route path="/dashboard" element={<DashboardRouter />} />

            {/* Verification Route - Public access */}
            <Route path="/verify/report" element={
              <SuspenseLoader>
                <ReportVerification />
              </SuspenseLoader>
            } />

            {/* User Management */}
            <Route path="/users" element={
              <SuspenseLoader>
                <UserManagement />
              </SuspenseLoader>
            } />
            
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
            <Route path="/management/omc" element={
              <SuspenseLoader>
                <OMCManagement />
              </SuspenseLoader>
            } />
            <Route path="/management/dealer" element={
              <SuspenseLoader>
                <DealerManagement />
              </SuspenseLoader>
            } />
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
            <Route path="/pos" element={
              <SuspenseLoader>
                <POSTerminal />
              </SuspenseLoader>
            } />
            <Route path="/calibration" element={
              <SuspenseLoader>
                <PumpCalibration />
              </SuspenseLoader>
            } />

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
            <Route path="/creditors" element={
              <SuspenseLoader>
                <CreditorsManager />
              </SuspenseLoader>
            } />
            <Route 
              path="/expenses" 
              element={
                <RouteHandler 
                  desktopComponent={ExpenseTracker}
                  mobileComponent={MobileExpenseTracker}
                />
              } 
            />
            <Route path="/financial" element={
              <SuspenseLoader>
                <BankDeposits />
              </SuspenseLoader>
            } />
            
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
            <Route path="/financial/sales" element={
              <SuspenseLoader>
                <SalesManagement />
              </SuspenseLoader>
            } />
            
            {/* ✅ SINGLE COMMISSION PAGE */}
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
            <Route path="/compliance" element={
              <SuspenseLoader>
                <ComplianceTracker />
              </SuspenseLoader>
            } />
            <Route 
              path="/price-caps" 
              element={
                <RouteHandler 
                  desktopComponent={PriceCapManager}
                  mobileComponent={MobilePriceManager}
                />
              } 
            />
            <Route path="/violations" element={
              <SuspenseLoader>
                <ViolationManager />
              </SuspenseLoader>
            } />

            {/* Reports */}
            <Route path="/reports" element={
              <SuspenseLoader>
                <SalesReports />
              </SuspenseLoader>
            } />
            <Route path="/reports/analytics" element={
              <SuspenseLoader>
                <AnalyticsDashboard />
              </SuspenseLoader>
            } />
            <Route path="/reports/daily" element={
              <SuspenseLoader>
                <DailyReports />
              </SuspenseLoader>
            } />
            <Route path="/reports/sales" element={
              <SuspenseLoader>
                <SalesReports />
              </SuspenseLoader>
            } />
            <Route path="/analytics" element={
              <SuspenseLoader>
                <AnalyticsDashboard />
              </SuspenseLoader>
            } />

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
            <Route path="/settings/branding" element={
              <SuspenseLoader>
                <BrandingManager />
              </SuspenseLoader>
            } />

            {/* Shared */}
            <Route path="/notifications" element={
              <SuspenseLoader>
                <Notifications />
              </SuspenseLoader>
            } />
            <Route path="/tour" element={
              <SuspenseLoader>
                <AppTour />
              </SuspenseLoader>
            } />

            {/* Default - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </PriceProvider>
    );
  }

  // 🧭 Show auth flow ONLY when explicitly triggered
  if (showAuthFlow) {
    const currentPath = window.location.pathname;
    const isPublicRoute = currentPath.includes('/verify/report');
    
    if (isPublicRoute) {
      return (
        <div className="min-h-screen">
          <Routes>
            <Route path="/verify/report" element={<ReportVerification />} />
            <Route path="*" element={<Navigate to="/verify/report" replace />} />
          </Routes>
        </div>
      );
    }

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
  }

  // 🚀 Show loader while deciding what to show (prevents flash)
  return (
    <LoaderScreen 
      message="Preparing Application..."
      subMessage="Loading your session"
    />
  );
};

// 🚀 MAIN APP
const App: React.FC = () => {
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AppErrorBoundary>
      {appLoading ? (
        <LoaderScreen 
          message="Starting PumpGuard..."
          subMessage="Initializing application"
        />
      ) : (
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
      )}
    </AppErrorBoundary>
  );
};

export default App;
