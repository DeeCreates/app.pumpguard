// pages/auth/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fuel, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Replace with your actual password reset API call
      // For now, simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful password reset request
      setSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setEmail('');
      }, 100);
      
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Fuel className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              PumpGuard
            </h1>
            <p className="text-gray-600 mt-1">Fuel Station Management System</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-6">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4 text-gray-600 hover:text-blue-600"
              onClick={handleBackToLogin}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
            
            <CardTitle className="text-2xl font-bold text-gray-900">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-gray-600">
              {success 
                ? "Check your email for reset instructions" 
                : "Enter your email to receive a password reset link"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success ? (
              <div className="space-y-6">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    If an account exists with {email}, you will receive password reset instructions shortly.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="text-sm text-gray-600 space-y-3">
                    <p className="font-medium">What to expect:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Check your email inbox (and spam folder)</li>
                      <li>Click the password reset link in the email</li>
                      <li>Create a new strong password</li>
                      <li>Return here to login with your new password</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => setSuccess(false)}
                      variant="outline"
                      className="w-full"
                    >
                      Request Another Reset Link
                    </Button>
                    
                    <Button
                      onClick={handleBackToLogin}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Return to Login
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="pl-10 h-12 text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the email address associated with your account
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Reset Link...
                    </div>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </Button>
              </form>
            )}

            {/* Additional Help */}
            <div className="border-t border-gray-200 pt-6">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link 
                    to="/auth/register" 
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    Contact Support
                  </Link>
                </p>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Having trouble receiving the email?</p>
                  <p>Contact <span className="text-blue-600">support@pumpguard.com</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}