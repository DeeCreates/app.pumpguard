// pages/auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Wifi, WifiOff, Fuel, Eye, EyeOff, LogIn, Play, Shield, Users, Building2, Smartphone } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { login, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('pumpguard_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('pumpguard_remembered_email', email);
      } else {
        localStorage.removeItem('pumpguard_remembered_email');
      }

      await login(email, password);
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Admin', email: 'admin@pumpguard.com', password: 'admin123' },
    { role: 'Manager', email: 'manager@station.com', password: 'manager123' },
    { role: 'Attendant', email: 'attendant@station.com', password: 'attendant123' },
    { role: 'Dealer', email: 'dealer@pumpguard.com', password: 'dealer123' }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 mobile-height">
      <div className="container mx-auto px-4 py-8">
        {/* Mobile Header - Only shows on small screens */}
        <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              PumpGuard
            </h1>
            <p className="text-gray-600 text-sm">Fuel Station Management</p>
          </div>
        </div>

        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Left Side - Branding and Features (Hidden on mobile) */}
          <div className="hidden lg:block text-center lg:text-left space-y-8">
            <div className="flex items-center justify-center lg:justify-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
                <Fuel className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  PumpGuard
                </h1>
                <p className="text-lg text-gray-600 mt-1">Fuel Station Management System</p>
              </div>
            </div>

            <div className="space-y-6 max-w-lg mx-auto lg:mx-0">
              <h2 className="text-3xl font-bold text-gray-900">
                Manage Your Fuel Stations <span className="text-blue-600">Efficiently</span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Comprehensive solution for oil marketing companies, dealers, and station operators 
                to streamline operations and ensure compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Real-time Sync</h3>
                  <p className="text-xs text-gray-600">Online & offline</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Compliance</h3>
                  <p className="text-xs text-gray-600">Price monitoring</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Multi-User</h3>
                  <p className="text-xs text-gray-600">Role-based access</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Mobile Ready</h3>
                  <p className="text-xs text-gray-600">Responsive design</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md border-0 shadow-xl lg:shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center space-y-2 pb-4 lg:pb-6">
                <div className="lg:hidden flex justify-center mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                    <LogIn className="w-6 h-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-xl lg:text-2xl font-bold text-gray-900">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-sm lg:text-lg text-gray-600">
                  Sign in to your account
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4 lg:space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200 py-3">
                    <AlertDescription className="text-red-800 text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
                  <div className="space-y-2 lg:space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="h-11 lg:h-12 text-base border-gray-300 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2 lg:space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="h-11 lg:h-12 text-base border-gray-300 focus:border-blue-500 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" /> : <Eye className="w-4 h-4 lg:w-5 lg:h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer select-none">
                        Remember me
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs lg:text-sm">
                      {isOnline ? (
                        <>
                          <Wifi className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
                          <span className="text-green-600 font-medium">Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3 lg:w-4 lg:h-4 text-orange-600" />
                          <span className="text-orange-600 font-medium">Offline</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 lg:h-12 text-sm lg:text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                    disabled={loading || authLoading}
                  >
                    {(loading || authLoading) ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="w-4 h-4 lg:w-5 lg:h-5" />
                        Sign In
                      </div>
                    )}
                  </Button>
                </form>

                {/* Demo Accounts Section */}
                <div className="border-t border-gray-200 pt-4 lg:pt-6">
                  <div className="text-center mb-3 lg:mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2 lg:mb-3">Demo Accounts</p>
                    <div className="space-y-1 lg:space-y-2 text-left">
                      {demoAccounts.map((account, index) => (
                        <div key={index} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-200">
                          <span className="font-medium text-gray-600 truncate mr-2">{account.role}:</span>
                          <span className="text-gray-500 font-mono text-xs truncate">{account.email}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 lg:mt-3">
                      Run setup wizard to create demo accounts
                    </p>
                  </div>

                  <div className="text-center">
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full h-10 text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Link to="/setup">
                        <Play className="w-4 h-4 mr-2" />
                        Run Setup Wizard
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="text-center pt-3 lg:pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Need help? Contact <span className="text-blue-600">support@pumpguard.com</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}