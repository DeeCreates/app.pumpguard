// src/pages/shared/LazyFeatureHighlight.tsx
import React from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Zap, 
  Building2, 
  Users, 
  Fuel, 
  DollarSign, 
  Shield, 
  TrendingUp, 
  Smartphone,
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  Settings
} from 'lucide-react';

interface FeatureHighlightProps {
  feature: string;
  role?: string;
}

const featureData = {
  real_time_pos: {
    title: 'Real-time POS Terminal',
    description: 'Process fuel transactions instantly with multiple payment methods including cash, mobile money, and cards. Offline-capable with automatic sync.',
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  shift_management: {
    title: 'Smart Shift Management',
    description: 'Track attendant shifts, monitor performance metrics, and automate reconciliation with discrepancy alerts.',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  inventory_tracking: {
    title: 'Live Inventory Tracking',
    description: 'Monitor fuel stock levels in real-time, track variances, and receive low-stock alerts automatically.',
    icon: Fuel,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  financial_reports: {
    title: 'Financial Analytics',
    description: 'Comprehensive revenue tracking, expense management, and profit analysis with visual dashboards.',
    icon: DollarSign,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  compliance_tools: {
    title: 'NPA Compliance',
    description: 'Automatic price cap enforcement, violation detection, and regulatory reporting for Ghanaian standards.',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  performance_analytics: {
    title: 'Performance Analytics',
    description: 'Track station efficiency, identify peak hours, and optimize operations with data-driven insights.',
    icon: TrendingUp,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50'
  },
  mobile_optimized: {
    title: 'Mobile-First Design',
    description: 'Fully responsive interface optimized for field operations on smartphones and tablets.',
    icon: Smartphone,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50'
  },
  multi_station: {
    title: 'Multi-Station Management',
    description: 'Manage multiple fuel stations from a single dashboard with consolidated reporting.',
    icon: Building2,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  analytics_dashboard: {
    title: 'Advanced Analytics',
    description: 'Interactive charts and reports for sales trends, volume analysis, and business intelligence.',
    icon: BarChart3,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50'
  },
  creditor_management: {
    title: 'Creditor Management',
    description: 'Track credit sales, manage customer accounts, and automate payment collection.',
    icon: CreditCard,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  bank_deposits: {
    title: 'Bank Deposit Tracking',
    description: 'Monitor cash deposits, track banking operations, and reconcile financial records.',
    icon: DollarSign,
    color: 'text-lime-600',
    bgColor: 'bg-lime-50'
  },
  daily_reports: {
    title: 'Daily Reports',
    description: 'Generate comprehensive daily reports for sales, inventory, and compliance metrics.',
    icon: FileText,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50'
  },
  pump_calibration: {
    title: 'Pump Calibration',
    description: 'Schedule and track pump calibration with NPA compliance automation and technician management.',
    icon: Settings,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50'
  }
};

export function FeatureHighlight({ feature, role }: FeatureHighlightProps) {
  const featureInfo = featureData[feature as keyof typeof featureData] || featureData.real_time_pos;
  const IconComponent = featureInfo.icon;

  const roleFeatures = {
    admin: ['multi_station', 'analytics_dashboard', 'compliance_tools'],
    omc: ['multi_station', 'performance_analytics', 'financial_reports'],
    dealer: ['financial_reports', 'multi_station', 'creditor_management'],
    station_manager: ['real_time_pos', 'shift_management', 'inventory_tracking'],
    attendant: ['real_time_pos', 'mobile_optimized'],
    supervisor: ['compliance_tools', 'analytics_dashboard']
  };

  const isRelevantForRole = role && roleFeatures[role as keyof typeof roleFeatures]?.includes(feature);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${featureInfo.bgColor}`}>
            <IconComponent className={`w-6 h-6 ${featureInfo.color}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {featureInfo.title}
              </h3>
              {isRelevantForRole && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  For {role}
                </Badge>
              )}
            </div>
            
            <p className="text-gray-600 leading-relaxed">
              {featureInfo.description}
            </p>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {feature === 'real_time_pos' && (
                <>
                  <Badge variant="outline">Offline Support</Badge>
                  <Badge variant="outline">Multiple Payments</Badge>
                  <Badge variant="outline">QR Receipts</Badge>
                </>
              )}
              {feature === 'compliance_tools' && (
                <>
                  <Badge variant="outline">NPA Standards</Badge>
                  <Badge variant="outline">Auto Violation Detection</Badge>
                  <Badge variant="outline">Audit Ready</Badge>
                </>
              )}
              {feature === 'shift_management' && (
                <>
                  <Badge variant="outline">Performance Metrics</Badge>
                  <Badge variant="outline">Auto Reconciliation</Badge>
                  <Badge variant="outline">Efficiency Tracking</Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FeatureHighlight;