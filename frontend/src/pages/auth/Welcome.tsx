import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fuel, Shield, Users, Building2, ArrowRight, Play, LogIn } from 'lucide-react';

interface WelcomeProps {
  isSetupComplete: boolean;
}

export default function Welcome({ isSetupComplete }: WelcomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
              <Fuel className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              PumpGuard
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive Fuel Station Management System
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Features Card */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Powerful Features
              </CardTitle>
              <CardDescription className="text-lg">
                Everything you need to manage your fuel stations efficiently
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-50/50">
                <Shield className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Compliance Monitoring</h3>
                  <p className="text-sm text-gray-600">Real-time price cap enforcement</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-green-50/50">
                <Users className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Multi-User Roles</h3>
                  <p className="text-sm text-gray-600">Admin, OMC, Dealers, Station Staff</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-50/50">
                <Building2 className="w-8 h-8 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Station Management</h3>
                  <p className="text-sm text-gray-600">Complete station operations control</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">
                Get Started
              </CardTitle>
              <CardDescription className="text-blue-100">
                Choose how you want to begin your PumpGuard journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSetupComplete ? (
                <>
                  <div className="text-center mb-6">
                    <p className="text-blue-100 mb-4">New to PumpGuard?</p>
                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold text-lg py-6"
                    >
                      <Link to="/setup">
                        <Play className="w-5 h-5 mr-2" />
                        Setup Demo Environment
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                    </Button>
                    <p className="text-sm text-blue-200 mt-2">
                      Creates demo accounts and sample data
                    </p>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-blue-500"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-blue-600 text-blue-100">Or</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-blue-100 mb-4">Already have an account?</p>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="w-full bg-transparent border-white text-white hover:bg-white/10 font-semibold text-lg py-6"
                    >
                      <Link to="/login">
                        <LogIn className="w-5 h-5 mr-2" />
                        Login to Existing Account
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-blue-100 mb-6">Welcome back to PumpGuard!</p>
                  <Button
                    asChild
                    size="lg"
                    className="w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold text-lg py-6"
                  >
                    <Link to="/login">
                      <LogIn className="w-5 h-5 mr-2" />
                      Login to Your Account
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <p className="text-sm text-blue-200 mt-4">
                    Demo environment is ready. Use the credentials from setup.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            PumpGuard v1.0 • Comprehensive Fuel Management Solution
          </p>
        </div>
      </div>
    </div>
  );
}