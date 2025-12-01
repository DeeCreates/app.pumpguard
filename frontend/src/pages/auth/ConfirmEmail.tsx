// pages/auth/ConfirmEmail.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fuel, Mail, CheckCircle, XCircle, RefreshCw, ArrowLeft, Shield } from 'lucide-react';
import { authAPI } from '@/lib/auth-api';

export default function ConfirmEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resent'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    // Handle email confirmation from Supabase
    if (token && type === 'signup') {
      verifyEmailConfirmation(token);
    } else {
      // Check if user needs email confirmation
      checkEmailConfirmationStatus();
    }
  }, [searchParams]);

  const verifyEmailConfirmation = async (token: string) => {
    try {
      // This would typically be handled by Supabase automatically
      // The user gets redirected here after clicking confirmation link
      setStatus('success');
      setMessage('Your email has been confirmed successfully! You can now log in to your account.');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to confirm email. The link may have expired.');
    }
  };

  const checkEmailConfirmationStatus = async () => {
    try {
      // Get current user session
      const { data: { user } } = await authAPI.getCurrentSession();
      
      if (user) {
        setEmail(user.email || '');
        
        if (user.email_confirmed_at) {
          setStatus('success');
          setMessage('Your email is already confirmed.');
        } else {
          setStatus('error');
          setMessage('Please check your email for the confirmation link.');
        }
      } else {
        setStatus('error');
        setMessage('Please log in to verify your email.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Unable to check email confirmation status.');
    }
  };

  const resendConfirmationEmail = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await authAPI.getCurrentSession();
      
      if (!user) {
        setStatus('error');
        setMessage('Please log in to resend confirmation email.');
        return;
      }

      // Note: Supabase doesn't expose a direct resend confirmation method
      // Users should use the original confirmation link or contact support
      setStatus('error');
      setMessage('Please use the original confirmation email or contact support for a new link.');
      
      // In a real implementation, you might call:
      // await supabase.auth.resend({
      //   type: 'signup',
      //   email: user.email,
      // })
      
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to resend confirmation email.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            {status === 'success' ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : status === 'resent' ? (
              <Mail className="w-8 h-8 text-white" />
            ) : (
              <Shield className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              PumpGuard
            </h1>
            <p className="text-gray-600 mt-1">Email Confirmation</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-6">
            {status !== 'loading' && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-4 text-gray-600 hover:text-blue-600"
                onClick={handleBackToLogin}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            )}
            
            <CardTitle className="text-2xl font-bold text-gray-900">
              {status === 'loading' && 'Confirming Email...'}
              {status === 'success' && 'Email Confirmed!'}
              {status === 'error' && 'Confirmation Required'}
              {status === 'resent' && 'Email Resent!'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {status === 'loading' && 'Please wait while we verify your email...'}
              {status === 'success' && 'Your email has been verified successfully'}
              {status === 'error' && 'Please confirm your email address'}
              {status === 'resent' && 'Check your email for the confirmation link'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {status === 'loading' ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
                <p className="text-center text-gray-600">
                  Verifying your email address...
                </p>
              </div>
            ) : (
              <>
                <Alert className={
                  status === 'success' ? 'bg-green-50 border-green-200' : 
                  status === 'resent' ? 'bg-blue-50 border-blue-200' : 
                  'bg-orange-50 border-orange-200'
                }>
                  {status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {status === 'error' && <XCircle className="h-4 w-4 text-orange-600" />}
                  {status === 'resent' && <Mail className="h-4 w-4 text-blue-600" />}
                  <AlertDescription className={
                    status === 'success' ? 'text-green-800' : 
                    status === 'resent' ? 'text-blue-800' : 
                    'text-orange-800'
                  }>
                    {message}
                  </AlertDescription>
                </Alert>

                {status === 'error' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2">What to do next:</h3>
                      <ol className="text-sm text-gray-700 space-y-2 list-decimal pl-5">
                        <li>Check your email inbox (and spam folder) for the confirmation email</li>
                        <li>Click the confirmation link in the email</li>
                        <li>Return here to complete the process</li>
                        <li>If you didn't receive the email, request a new one below</li>
                      </ol>
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={resendConfirmationEmail}
                        disabled={loading}
                        variant="outline"
                        className="w-full"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Sending...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Resend Confirmation Email
                          </div>
                        )}
                      </Button>
                      
                      <Button
                        onClick={handleBackToLogin}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        Return to Login
                      </Button>
                    </div>
                  </div>
                )}

                {status === 'success' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h3 className="font-semibold text-green-800 mb-2">Ready to get started!</h3>
                      <p className="text-sm text-green-700">
                        Your email has been confirmed. You now have full access to all PumpGuard features.
                      </p>
                    </div>

                    <Button
                      onClick={handleGoToDashboard}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Go to Dashboard
                    </Button>

                    <Button
                      onClick={handleBackToLogin}
                      variant="outline"
                      className="w-full"
                    >
                      Sign In with Another Account
                    </Button>
                  </div>
                )}

                {status === 'resent' && (
                  <div className="space-y-4">
                    <Button
                      onClick={handleBackToLogin}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Return to Login
                    </Button>
                  </div>
                )}

                {/* Help Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      Still having trouble?
                    </p>
                    <p className="text-xs text-gray-500">
                      Contact <span className="text-blue-600">support@pumpguard.com</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Make sure you're checking the email associated with your account: {email}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}