// pages/auth/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Fuel, 
  ArrowLeft, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Lock,
  Mail,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validLink, setValidLink] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();

  // Check URL for reset token on component mount
  useEffect(() => {
    const checkResetLink = async () => {
      try {
        // Supabase password reset links come with hash parameters
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const type = params.get('type');
        
        console.log('Reset URL analysis for app.pumpguard.com:', {
          hash,
          accessToken: !!accessToken,
          type,
          fullUrl: window.location.href,
          origin: window.location.origin
        });
        
        if (type === 'recovery' && accessToken) {
          setValidLink(true);
          
          // Try to get user info from the token
          try {
            // Supabase will automatically use the token in the URL
            // Let's try to get session info
            const { data: { user } } = await window.supabase?.auth.getUser() || {};
            if (user?.email) {
              setUserEmail(user.email);
            }
          } catch (userErr) {
            console.log('Could not fetch user email from token:', userErr);
          }
          
          console.log('✅ Valid reset link detected for app.pumpguard.com');
        } else {
          // Also check for query parameters
          const tokenParam = searchParams.get('token');
          const typeParam = searchParams.get('type');
          
          if (typeParam === 'recovery' && tokenParam) {
            setValidLink(true);
            console.log('✅ Valid reset link detected in query params');
          } else {
            setValidLink(false);
            setError('Invalid or expired reset link. Please request a new password reset.');
            console.log('❌ No valid reset token found in URL');
          }
        }
      } catch (err) {
        console.error('Error checking reset link:', err);
        setValidLink(false);
        setError('Unable to verify reset link. Please request a new password reset.');
      }
    };

    checkResetLink();
  }, [searchParams]);

  // Password validation
  const validatePassword = (pass: string) => {
    const errors = [];
    
    if (pass.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pass)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pass)) errors.push('One lowercase letter');
    if (!/\d/.test(pass)) errors.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) errors.push('One special character');
    
    return {
      valid: errors.length === 0,
      errors,
      score: Math.max(0, 5 - errors.length) // Score 0-5
    };
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const validation = validatePassword(value);
    setPasswordStrength({
      score: validation.score,
      feedback: validation.errors.length > 0 
        ? `Missing: ${validation.errors.join(', ')}`
        : 'Strong password!'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!validLink) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(`Password requirements not met: ${validation.errors.join(', ')}`);
      return;
    }

    if (validation.score < 3) {
      setError('Please choose a stronger password');
      return;
    }

    setLoading(true);

    try {
      // Call the resetPassword function from AuthContext
      const result = await resetPassword(password);
      
      if (result.success) {
        setSuccess(true);
        
        // Clear URL parameters to prevent re-use
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show success message with email
        const displayEmail = userEmail || 'your account';
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          navigate('/auth/login', { 
            state: { 
              message: `Password reset successful! Please login to ${displayEmail} with your new password.`,
              email: userEmail || ''
            }
          });
        }, 5000);
        
      } else {
        setError(result.message || 'Failed to reset password. Please try again.');
        
        // If token is invalid/expired, disable the form
        if (result.message.includes('Invalid') || result.message.includes('expired')) {
          setValidLink(false);
        }
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  const handleRequestNewReset = () => {
    navigate('/auth/forgot-password');
  };

  const handleOpenSupport = () => {
    window.location.href = 'mailto:support@pumpguard.app?subject=Password%20Reset%20Help%20-%20app.pumpguard.com';
  };

  // If link is invalid on load, show error state
  if (validLink === false) {
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
              <p className="text-gray-600 mt-1">Reset Password</p>
              <p className="text-xs text-blue-600 font-medium mt-1">
                app.pumpguard.com
              </p>
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
                Invalid Reset Link
              </CardTitle>
              <CardDescription className="text-gray-600">
                This password reset link is invalid or has expired
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error || 'This password reset link is no longer valid. Links expire after 24 hours and can only be used once.'}
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="text-sm text-gray-600 space-y-3">
                  <p className="font-medium">Common issues:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Link was already used (one-time use only)</li>
                    <li>Link expired (24 hour limit)</li>
                    <li>Browser cleared cookies/session</li>
                    <li>Using a different browser/device</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleRequestNewReset}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    Request New Reset Link
                  </Button>
                  
                  <Button
                    onClick={handleBackToLogin}
                    variant="outline"
                    className="w-full"
                  >
                    Return to Login
                  </Button>

                  <Button
                    onClick={handleOpenSupport}
                    variant="ghost"
                    className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    Need immediate help?
                  </p>
                  <Button
                    onClick={handleOpenSupport}
                    variant="link"
                    className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    support@pumpguard.app
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              PumpGuard
            </h1>
            <p className="text-gray-600 mt-1">Create New Password</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                app.pumpguard.com
              </div>
              {userEmail && (
                <div className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  {userEmail}
                </div>
              )}
            </div>
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
              {success ? 'Password Updated!' : 'Set New Password'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {success 
                ? 'Your password has been successfully reset' 
                : 'Create a new secure password for your account'
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
                    ✅ Password successfully reset for <span className="font-semibold">{userEmail || 'your account'}</span>! 
                    You will be redirected to login in 5 seconds.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button
                    onClick={handleBackToLogin}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    Go to Login Now
                  </Button>
                  
                  <div className="text-center text-sm text-gray-500 space-y-1">
                    <p>Remember to:</p>
                    <ul className="list-disc pl-5 text-left">
                      <li>Update your password manager</li>
                      <li>Log out of other devices if needed</li>
                      <li>Use a unique password for PumpGuard</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {userEmail && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-blue-800">
                      Resetting password for: <span className="font-semibold">{userEmail}</span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      New Password
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="Enter new password"
                        required
                        disabled={loading || !validLink}
                        className="pl-10 pr-10 h-12 text-base border-gray-300 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password strength indicator */}
                    {password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className={`w-3 h-3 ${
                            passwordStrength.score >= 4 ? 'text-green-500' : 
                            passwordStrength.score >= 3 ? 'text-yellow-500' : 
                            passwordStrength.score >= 2 ? 'text-orange-500' : 'text-red-500'
                          }`} />
                          <span className="text-xs font-medium text-gray-600">
                            Strength: {
                              passwordStrength.score >= 4 ? 'Strong' : 
                              passwordStrength.score >= 3 ? 'Good' : 
                              passwordStrength.score >= 2 ? 'Fair' : 'Weak'
                            }
                          </span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {password.length}/8+ chars
                          </span>
                        </div>
                        {passwordStrength.feedback && (
                          <p className="text-xs text-gray-500 mt-1">
                            {passwordStrength.feedback}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        disabled={loading || !validLink}
                        className="pl-10 pr-10 h-12 text-base border-gray-300 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-700">Password requirements:</p>
                    <ul className="space-y-1 mt-2">
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={password.length >= 8 ? 'text-green-600 font-medium' : ''}>
                          At least 8 characters long
                        </span>
                      </li>
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={/[A-Z]/.test(password) ? 'text-green-600 font-medium' : ''}>
                          One uppercase letter (A-Z)
                        </span>
                      </li>
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={/[a-z]/.test(password) ? 'text-green-600 font-medium' : ''}>
                          One lowercase letter (a-z)
                        </span>
                      </li>
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/\d/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={/\d/.test(password) ? 'text-green-600 font-medium' : ''}>
                          One number (0-9)
                        </span>
                      </li>
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600 font-medium' : ''}>
                          One special character (!@#$% etc.)
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !validLink || password !== confirmPassword || passwordStrength.score < 3}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating Password...
                    </div>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Security Note */}
            {!success && validLink && (
              <div className="border-t border-gray-200 pt-6">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-gray-600 font-medium">
                      Secure Password Reset • app.pumpguard.com
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Never share your password. PumpGuard staff will never ask for it.</p>
                    <p>
                      Need help?{' '}
                      <button
                        onClick={handleOpenSupport}
                        className="text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        Contact support@pumpguard.app
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
