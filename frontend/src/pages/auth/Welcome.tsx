import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fuel, Shield, Users, Building2, LogIn, BarChart3, AlertCircle } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header - Slightly Reduced */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-md">
              <Fuel className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              PumpGuard
            </h1>
          </div>
          <p className="text-lg text-gray-600 mb-1">
            Comprehensive Fuel Station Management System
          </p>
          <p className="text-sm text-gray-500">
            Monitor, manage, and optimize your fuel station operations
          </p>
        </div>

        {/* Main Content Grid - Reduced Spacing */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Features Card - Compact */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-900 text-center">
                Key Features
              </CardTitle>
              <CardDescription className="text-center text-sm">
                Everything you need to manage fuel stations efficiently
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-3 p-2 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Compliance Monitoring</h3>
                  <p className="text-xs text-gray-600">Real-time price cap enforcement</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors">
                <Users className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Multi-Tier Access Control</h3>
                  <p className="text-xs text-gray-600">Admin, OMC, Dealers, Managers & Staff</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-purple-50/50 hover:bg-purple-50 transition-colors">
                <Building2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Station Management</h3>
                  <p className="text-xs text-gray-600">Complete station operations control</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-amber-50/50 hover:bg-amber-50 transition-colors">
                <BarChart3 className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Expense Tracking</h3>
                  <p className="text-xs text-gray-600">Real-time monitoring with approvals</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-red-50/50 hover:bg-red-50 transition-colors">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Audit Trail</h3>
                  <p className="text-xs text-gray-600">Complete activity logs & reporting</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Login Card - Compact */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-center">
                Welcome to PumpGuard
              </CardTitle>
              <CardDescription className="text-blue-100 text-center text-sm">
                Access your fuel station management dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <p className="text-blue-100 mb-3 text-sm">Please login to continue</p>
                <Button
                  asChild
                  size="default"
                  className="w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold text-base py-3 h-auto"
                >
                  <Link to="/login">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login to Your Account
                  </Link>
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-blue-200 text-center">Role-Based Access Levels:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-xs text-blue-100">OMC</span>
                    <span className="text-xs text-blue-200/80 ml-auto">Stations</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    <span className="text-xs text-blue-100">Dealer</span>
                    <span className="text-xs text-blue-200/80 ml-auto">View Only</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="text-xs text-blue-100">Staff</span>
                    <span className="text-xs text-blue-200/80 ml-auto">Limited</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-500/30 mt-2">
                <p className="text-xs text-blue-200 text-center">
                  Need help? Contact your system administrator for login credentials 
                  support@pumpguard.com
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compact Footer */}
        <div className="text-center pt-2">
          <div className="flex flex-wrap justify-center gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600">Secure & Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-600">Real-time Monitoring</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-600">Multi-role Access</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              <span className="text-xs text-gray-600">Audit Ready</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            PumpGuard v1.0 • Comprehensive Fuel Management Solution
          </p>
        </div>
      </div>
    </div>
  );
}