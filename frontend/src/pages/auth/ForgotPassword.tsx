// pages/auth/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fuel, ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Import your auth context

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { forgotPassword } = useAuth(); // Get the forgotPassword function from context

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Email validation
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // Call the forgotPassword function from AuthContext
      const result = await forgotPassword(email);
      
      if (result.success) {
        setSuccess(true);
        // Don't clear email on success - show it in the success message
      } else {
        setError(result.message || 'Failed to send reset link. Please try again.');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  const handleRequestAnother = () => {
    setSuccess(false);
    setError('');
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
          <CardHeader className="text-center space-y-2 pb-6 relative">
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
                <AlertCircle className="h-4 w-4 text-red-600" />
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
                    Password reset instructions have been sent to <span className="font-semibold">{email}</span>. 
                    Please check your email inbox.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="text-sm text-gray-600 space-y-3">
                    <p className="font-medium">Important Notes:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The reset link expires in 24 hours</li>
                      <li>Check your spam/junk folder if you don't see it</li>
                      <li>Clicking the link will open the password reset page</li>
                      <li>You can only use the link once</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleRequestAnother}
                      variant="outline"
                      className="w-full"
                    >
                      Send Another Reset Link
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
                        onChange={(e) => setEmail(e.target.value.trim())}
                        placeholder="your@email.com"
                        required
                        disabled={loading}
                        className="pl-10 h-12 text-base border-gray-300 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the email address associated with your account
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !email}
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
                <div className="text-sm text-gray-600">
                  <p>Don't have an account?{' '}
                    <Link 
                      to="/auth/register" 
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      Contact Support
                    </Link>
                  </p>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-medium">Need help?</p>
                  <p>Contact <span className="text-blue-600 font-medium">support@pumpguard.app</span></p>
                  <p>Or call <span className="text-blue-600 font-medium">+1-800-PUMP-GUARD</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
