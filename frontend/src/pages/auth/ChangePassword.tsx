// pages/auth/ChangePassword.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fuel, ArrowLeft, Key, Eye, EyeOff, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/auth-api';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: ''
  });
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    navigate('/settings/profile');
  };

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let messages = [];

    // Length check
    if (password.length >= 8) score++;
    else messages.push('At least 8 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) score++;
    else messages.push('One uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) score++;
    else messages.push('One lowercase letter');

    // Number check
    if (/[0-9]/.test(password)) score++;
    else messages.push('One number');

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    else messages.push('One special character');

    // Common password check
    const commonPasswords = ['password', '123456', '12345678', 'admin123', 'qwerty'];
    if (commonPasswords.includes(password.toLowerCase())) {
      score = 0;
      messages = ['Password is too common'];
    }

    let message = '';
    if (score === 0) message = 'Very weak';
    else if (score <= 2) message = 'Weak';
    else if (score <= 3) message = 'Medium';
    else if (score === 4) message = 'Strong';
    else message = 'Very strong';

    if (messages.length > 0 && score < 5) {
      message += ` - Needs: ${messages.join(', ')}`;
    }

    return { score, message };
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate inputs
    if (!currentPassword) {
      setError('Current password is required');
      setLoading(false);
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      setLoading(false);
      return;
    }

    if (passwordStrength.score < 3) {
      setError('New password is too weak. Please choose a stronger password.');
      setLoading(false);
      return;
    }

    try {
      const result = await authAPI.changePassword(currentPassword, newPassword);
      
      if (result.success) {
        setSuccess(true);
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getStrengthTextColor = (score: number) => {
    if (score === 0) return 'text-red-600';
    if (score <= 2) return 'text-orange-600';
    if (score <= 3) return 'text-yellow-600';
    if (score === 4) return 'text-green-600';
    return 'text-emerald-600';
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              PumpGuard
            </h1>
            <p className="text-gray-600 mt-1">Secure Your Account</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-6">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4 text-gray-600 hover:text-blue-600"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
            
            <CardTitle className="text-2xl font-bold text-gray-900">
              {success ? 'Password Changed!' : 'Change Password'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {success 
                ? 'Your password has been updated successfully' 
                : 'Update your account password'
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
                    Your password has been changed successfully! You'll need to use your new password for your next login.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Security Tips:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Don't reuse passwords across different sites</li>
                      <li>• Consider using a password manager</li>
                      <li>• Enable two-factor authentication if available</li>
                      <li>• Never share your password with anyone</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setSuccess(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Change Password Again
                    </Button>
                    
                    <Button
                      onClick={handleBack}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Return to Profile
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        required
                        className="pl-10 pr-10 h-12 text-base border-gray-300 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                      New Password
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={handleNewPasswordChange}
                        placeholder="Enter new password"
                        required
                        className="pl-10 pr-10 h-12 text-base border-gray-300 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Password strength:</span>
                          <span className={`font-semibold ${getStrengthTextColor(passwordStrength.score)}`}>
                            {passwordStrength.message}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
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
                        className="pl-10 pr-10 h-12 text-base border-gray-300 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-red-500 text-xs">Passwords do not match</p>
                    )}
                  </div>

                  {/* Password Requirements */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-900 text-sm mb-2">Password Requirements:</h3>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        At least 8 characters long
                      </li>
                      <li className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`} />
                        One uppercase letter
                      </li>
                      <li className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`} />
                        One lowercase letter
                      </li>
                      <li className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`} />
                        One number
                      </li>
                      <li className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`} />
                        One special character
                      </li>
                      <li className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${newPassword !== currentPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
                        Different from current password
                      </li>
                    </ul>
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
                      Updating Password...
                    </div>
                  ) : (
                    'Change Password'
                  )}
                </Button>

                {/* Security Note */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-center space-y-2">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold">Note:</span> Changing your password will log you out of all other devices.
                    </p>
                    <p className="text-xs text-gray-500">
                      Forgot your current password?{' '}
                      <button 
                        type="button"
                        onClick={() => navigate('/auth/forgot-password')}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Reset it here
                      </button>
                    </p>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}