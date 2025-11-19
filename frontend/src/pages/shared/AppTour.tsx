import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { X, ChevronRight, ChevronLeft, Zap, Building2, Users, Fuel, DollarSign, Shield, TrendingUp, Smartphone } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon?: React.ComponentType<any>;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  features?: string[];
}

interface AppTourProps {
  role: string;
  onComplete: () => void;
  compact?: boolean;
}

// Lazy loaded components
const LazyFeatureHighlight = lazy(() => import('./LazyFeatureHighlight'));

export function AppTour({ role, onComplete, compact = false }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  const getTourSteps = (): TourStep[] => {
    const commonSteps: TourStep[] = [
      {
        title: 'Welcome to PumpGuard! 🎉',
        description: 'Your comprehensive fuel station management platform designed for the Ghanaian market.',
        icon: Zap,
        features: [
          'Multi-role access control',
          'Offline-first architecture',
          'Real-time analytics',
          'NPA compliance tracking'
        ]
      },
    ];

    const roleSteps: Record<string, TourStep[]> = {
      admin: [
        ...commonSteps,
        {
          title: 'System-Wide Supreme Authority',
          description: 'As an Admin, you have complete oversight of the entire PumpGuard ecosystem with override powers.',
          icon: Building2,
          features: [
            'Create and manage all user accounts',
            'Monitor nationwide station performance',
            'Set system-wide configurations',
            'Access complete audit trails'
          ]
        },
        {
          title: 'Network Architecture Management',
          description: 'Build and manage the complete OMC-Dealer-Station hierarchy across regions.',
          icon: Users,
          features: [
            'Register OMC companies and networks',
            'Assign stations to dealers or direct management',
            'Configure regional hierarchies',
            'Monitor network growth and performance'
          ]
        },
        {
          title: 'Advanced Analytics & Intelligence',
          description: 'Access real-time business intelligence and predictive insights across the entire platform.',
          icon: TrendingUp,
          features: [
            'Nationwide sales and volume analytics',
            'Compliance violation tracking',
            'Fraud detection alerts',
            'Multi-region performance comparison'
          ]
        },
        {
          title: 'Ready to Transform Fuel Management?',
          description: 'You\'re all set to oversee the complete PumpGuard ecosystem with supreme authority.',
          icon: Shield,
          features: [
            'Emergency system controls',
            'Data export and backup management',
            'User permission overrides',
            'System health monitoring'
          ]
        },
      ],
      supervisor: [
        ...commonSteps,
        {
          title: 'NPA Regulatory Authority',
          description: 'Monitor and enforce national pricing compliance across all fuel stations.',
          icon: Shield,
          features: [
            'Set and manage national price caps',
            'Automatic violation detection',
            'Fine calculation and tracking',
            'Compliance case management'
          ]
        },
        {
          title: 'Price Control Management',
          description: 'Set maximum retail prices for PMS, Diesel, LPG, and Kerosene with temporal controls.',
          icon: DollarSign,
          features: [
            'OMC-specific pricing authorizations',
            'Effective date range management',
            'Historical pricing audit trails',
            'Automatic price cap enforcement'
          ]
        },
        {
          title: 'Compliance Enforcement',
          description: 'Track violations, calculate fines, and manage the complete regulatory workflow.',
          icon: TrendingUp,
          features: [
            'Real-time station monitoring',
            'Violation impact calculation',
            'Appeal and resolution tracking',
            'Automated stakeholder notifications'
          ]
        },
        {
          title: 'Audit & Inspection System',
          description: 'Conduct regulatory inspections with GPS verification and multimedia evidence.',
          icon: Building2,
          features: [
            'Schedule and conduct station audits',
            'Location-tagged inspection evidence',
            'Compliance scoring (A-F ratings)',
            'Official certificate generation'
          ]
        },
      ],
      omc: [
        ...commonSteps,
        {
          title: 'Multi-Station Network Management',
          description: 'Oversee your complete station portfolio with brand consistency and operational control.',
          icon: Building2,
          features: [
            'Station creation and registration',
            'Dealer onboarding and management',
            'Network performance analytics',
            'Brand standard enforcement'
          ]
        },
        {
          title: 'Network Development & Expansion',
          description: 'Grow your station network with complete control over locations and operations.',
          icon: Users,
          features: [
            'Register new stations with full details',
            'Assign dealers and set commission structures',
            'Monitor network growth metrics',
            'Performance benchmarking across stations'
          ]
        },
        {
          title: 'Pricing & Revenue Optimization',
          description: 'Set competitive prices within NPA caps and maximize revenue across your network.',
          icon: DollarSign,
          features: [
            'Dynamic pricing strategies',
            'Revenue analysis by station and region',
            'Commission structure management',
            'Financial forecasting and planning'
          ]
        },
        {
          title: 'Business Intelligence Suite',
          description: 'Access advanced analytics for sales trends, inventory, and market intelligence.',
          icon: TrendingUp,
          features: [
            'Sales trend analysis by product and region',
            'Inventory intelligence and demand forecasting',
            'Loss prevention and fraud detection',
            'Competitive market analysis'
          ]
        },
      ],
      station_manager: [
        ...commonSteps,
        {
          title: 'Daily Operations Command Center',
          description: 'Manage your station operations, staff, and financial activities from one central hub.',
          icon: Building2,
          features: [
            'Real-time shift monitoring',
            'Staff assignment and scheduling',
            'Financial reconciliation',
            'Emergency incident management'
          ]
        },
        {
          title: 'Shift Operations Management',
          description: 'Oversee attendant shifts, assign pumps, and monitor real-time performance.',
          icon: Users,
          features: [
            'Create and manage shift schedules',
            'Assign pumps and responsibilities',
            'Monitor active shift performance',
            'Handle operational emergencies'
          ]
        },
        {
          title: 'Financial Operations & Banking',
          description: 'Manage daily cash reconciliation, banking operations, and expense tracking.',
          icon: DollarSign,
          features: [
            'Daily cash counting and reconciliation',
            'Bank deposit preparation and tracking',
            'Expense management with receipt tracking',
            'Petty cash control and management'
          ]
        },
        {
          title: 'Inventory & Equipment Management',
          description: 'Track fuel stock, manage deliveries, and ensure equipment maintenance.',
          icon: Fuel,
          features: [
            'Daily tank dipping and stock recording',
            'Fuel quality monitoring',
            'Pump calibration scheduling',
            'Safety compliance verification'
          ]
        },
      ],
      attendant: [
        ...commonSteps,
        {
          title: 'POS Terminal - Your Workstation',
          description: 'Process fuel transactions efficiently with our mobile-optimized POS interface.',
          icon: Smartphone,
          features: [
            'Secure QR code login',
            'Multiple payment method support',
            'Offline transaction processing',
            'Real-time shift summary'
          ]
        },
        {
          title: 'Daily Shift Operations',
          description: 'Start your shift with proper meter readings and manage transactions throughout.',
          icon: Fuel,
          features: [
            'Opening and closing meter readings',
            'Pump status monitoring',
            'Transaction processing',
            'Shift handover procedures'
          ]
        },
        {
          title: 'Cash & Payment Management',
          description: 'Handle cash securely and process various payment methods with confidence.',
          icon: DollarSign,
          features: [
            'Secure cash collection',
            'Counterfeit detection awareness',
            'Mobile money and card payments',
            'Daily revenue reconciliation'
          ]
        },
        {
          title: 'Performance & Development',
          description: 'Track your performance, earn commissions, and develop your skills.',
          icon: TrendingUp,
          features: [
            'Real-time sales performance',
            'Commission tracking',
            'Training materials access',
            'Career progression opportunities'
          ]
        },
      ],
      dealer: [
        ...commonSteps,
        {
          title: 'Business Ownership Dashboard',
          description: 'Welcome to your multi-station portfolio management center for maximum profitability.',
          icon: Building2,
          features: [
            'Consolidated financial reporting',
            'Multi-station performance tracking',
            'Commission earnings management',
            'Portfolio growth analytics'
          ]
        },
        {
          title: 'Multi-Station Financial Management',
          description: 'Monitor revenue, expenses, and profits across all your stations in real-time.',
          icon: DollarSign,
          features: [
            'Consolidated revenue tracking',
            'Expense management and optimization',
            'Profit margin analysis',
            'Commission calculation and tracking'
          ]
        },
        {
          title: 'Station Performance Oversight',
          description: 'Track operational efficiency and performance metrics across your portfolio.',
          icon: TrendingUp,
          features: [
            'Live operations monitoring',
            'Inventory level tracking',
            'Staff performance analytics',
            'Comparative station analysis'
          ]
        },
        {
          title: 'Compliance & Risk Management',
          description: 'Stay compliant with NPA regulations and manage operational risks effectively.',
          icon: Shield,
          features: [
            'NPA violation alerts and tracking',
            'Audit preparation and management',
            'Risk assessment indicators',
            'Insurance and liability tracking'
          ]
        },
        {
          title: 'Operations Oversight & Approval',
          description: 'Review daily operations, approve expenses, and manage station improvements.',
          icon: Users,
          features: [
            'Daily report review and approval',
            'Banking operation verification',
            'Expense approval workflows',
            'Strategic planning tools'
          ]
        },
      ],
    };

    return roleSteps[role] || commonSteps;
  };

  const steps = getTourSteps();

  useEffect(() => {
    // Simulate loading for better UX
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('pumpguard_tour_completed', 'true');
      localStorage.setItem('pumpguard_tour_role', role);
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Loading skeleton
  const TourSkeleton = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="max-w-lg w-full mx-4">
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <Skeleton className="w-6 h-6 rounded" />
          </div>
          <div className="space-y-2 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!isVisible) return null;

  if (loading) {
    return <TourSkeleton />;
  }

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const IconComponent = currentStepData.icon;

  if (compact) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6">
            <div className="text-center">
              {IconComponent && (
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <IconComponent className="w-6 h-6 text-blue-600" />
                </div>
              )}
              <h3 className="text-lg text-black mb-2">{currentStepData.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{currentStepData.description}</p>
              
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleSkip} size="sm">
                  Skip
                </Button>
                <Button onClick={handleNext} size="sm" style={{ backgroundColor: '#0B2265' }}>
                  {currentStep === steps.length - 1 ? 'Start' : 'Next'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: '#0B2265' }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                {IconComponent && (
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                    <span className="text-sm text-blue-600 font-medium">
                      {role.charAt(0).toUpperCase() + role.slice(1)} Platform
                    </span>
                  </div>
                  <h2 className="text-2xl text-black font-bold mb-3">{currentStepData.title}</h2>
                  <p className="text-gray-600 leading-relaxed text-lg">{currentStepData.description}</p>
                </div>
              </div>

              {/* Feature Highlights */}
              {currentStepData.features && (
                <Suspense fallback={
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                }>
                  <LazyFeatureHighlight features={currentStepData.features} />
                </Suspense>
              )}
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'bg-blue-600 w-8'
                      : index < currentStep
                      ? 'bg-blue-300 w-4'
                      : 'bg-gray-200 w-2'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              style={{ backgroundColor: '#0B2265' }}
              className="gap-2"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Zap className="w-4 h-4" />
                  Start Using PumpGuard
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip tour and explore on my own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppTour;

