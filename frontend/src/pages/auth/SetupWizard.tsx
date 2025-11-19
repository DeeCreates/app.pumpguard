import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Building2, Fuel, User, Users, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [adminData, setAdminData] = useState({
    email: 'admin@pumpguard.com',
    password: 'admin123',
    name: 'System Administrator'
  });
  const [omcData, setOmcData] = useState({
    name: 'Total Ghana',
    license_number: 'OMC-2024-001',
    contact: '+233 20 123 4567',
    region: 'Greater Accra'
  });
  const [stationData, setStationData] = useState({
    name: 'Total - Airport Shell',
    location: 'Airport Road, Accra',
    omc_id: ''
  });
  const [managerData, setManagerData] = useState({
    email: 'manager@station.com',
    password: 'manager123',
    name: 'Station Manager',
    station_id: ''
  });
  const [attendantData, setAttendantData] = useState({ 
    name: 'POS Attendant', 
    email: 'attendant@station.com', 
    password: 'attendant123', 
    station_id: '' 
  });
  const [dealerData, setDealerData] = useState({ 
    name: 'Demo Dealer', 
    email: 'dealer@pumpguard.com', 
    password: 'dealer123',
    station_id: '',
    omc_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Step configurations for better organization
  const steps = [
    { number: 1, title: 'Admin Account', icon: Shield, description: 'Create system administrator' },
    { number: 2, title: 'Admin Login', icon: User, description: 'Authenticate admin user' },
    { number: 3, title: 'Oil Company', icon: Building2, description: 'Set up OMC details' },
    { number: 4, title: 'Fuel Station', icon: Fuel, description: 'Create station profile' },
    { number: 5, title: 'Station Manager', icon: User, description: 'Add station manager' },
    { number: 6, title: 'POS Attendant', icon: Users, description: 'Create attendant account' },
    { number: 7, title: 'Fuel Dealer', icon: Users, description: 'Set up dealer account' },
    { number: 8, title: 'Complete', icon: CheckCircle, description: 'Setup finished' }
  ];

  // FIXED: Admin creation with proper error handling
  const handleCreateAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      // First run diagnostic
      console.log('Running database diagnostic...');
      const diagnostic = await api.auth.debugDatabase();
      
      if (!diagnostic.success) {
        setError(`Database issue: ${diagnostic.error}. Please check RLS policies.`);
        return;
      }

      console.log('Database diagnostic passed, creating admin...');
      
      // Now proceed with admin creation
      const result = await api.signup({
        email: adminData.email,
        password: adminData.password,
        fullName: adminData.name,
        role: 'admin',
        omc_id: null,
        station_id: null
      });

      if (result.success) {
        setStep(2);
        toast({
          title: 'Admin account created!',
          description: result.message || 'Admin account created successfully',
        });
      } else {
        if (result.error?.includes('already exists') || result.error?.includes('user_already_exists')) {
          setError('Admin account already exists. Proceeding to login step...');
          setTimeout(() => setStep(2), 2000);
        } else if (result.error?.includes('foreign key constraint')) {
          setError('Database setup issue. Please check if profiles table exists and try again.');
        } else {
          setError(result.error || 'Failed to create admin account');
        }
      }
    } catch (err: any) {
      console.error('Admin creation error:', err);
      setError(err.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.login(adminData.email, adminData.password);

      if (result.success) {
        setStep(3);
        toast({
          title: 'Login successful!',
          description: 'Admin login completed',
        });
      } else {
        setError(result.error || 'Failed to login. You can try the default credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOMC = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.createOMC(omcData);
      if (result.success) {
        setStationData(prev => ({ ...prev, omc_id: result.data.id }));
        setStep(4);
        toast({
          title: 'OMC created!',
          description: 'Oil Marketing Company created successfully',
        });
      } else {
        setError(result.error || 'Failed to create OMC');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create OMC');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStation = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.createStation({
        ...stationData,
        address: stationData.location,
        region: omcData.region,
        code: `STATION-${Date.now()}`
      });

      if (result.success) {
        // Update all subsequent data with the new station ID
        setManagerData(prev => ({ ...prev, station_id: result.data.id }));
        setAttendantData(prev => ({ ...prev, station_id: result.data.id }));
        setDealerData(prev => ({ 
          ...prev, 
          station_id: result.data.id, 
          omc_id: stationData.omc_id 
        }));
        setStep(5);
        toast({
          title: 'Station created!',
          description: 'Fuel station created successfully',
        });
      } else {
        setError(result.error || 'Failed to create station');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create station');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManager = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.signup({
        email: managerData.email,
        password: managerData.password,
        fullName: managerData.name,
        role: 'station_manager',
        station_id: managerData.station_id,
        omc_id: stationData.omc_id
      });

      if (result.success) {
        setStep(6);
        toast({
          title: 'Manager account created!',
          description: result.message || 'Manager account created successfully',
        });
      } else {
        if (result.error?.includes('already exists')) {
          setError('Manager account already exists. Proceeding to next step...');
          setTimeout(() => setStep(6), 2000);
        } else {
          setError(result.error || 'Failed to create manager');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create manager');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAttendant = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.signup({
        email: attendantData.email,
        password: attendantData.password,
        fullName: attendantData.name,
        role: 'attendant',
        station_id: attendantData.station_id,
        omc_id: stationData.omc_id
      });

      if (result.success) {
        setStep(7);
        toast({
          title: 'Attendant account created!',
          description: result.message || 'Attendant account created successfully',
        });
      } else {
        if (result.error?.includes('already exists')) {
          setError('Attendant account already exists. Proceeding to next step...');
          setTimeout(() => setStep(7), 2000);
        } else {
          setError(result.error || 'Failed to create attendant');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create attendant');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDealer = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.signup({
        email: dealerData.email,
        password: dealerData.password,
        fullName: dealerData.name,
        role: 'dealer',
        station_id: dealerData.station_id,
        omc_id: dealerData.omc_id
      });

      if (result.success) {
        setStep(8);
        toast({
          title: 'Dealer account created!',
          description: result.message || 'Dealer account created successfully',
        });
      } else {
        if (result.error?.includes('already exists')) {
          setError('Dealer account already exists. Proceeding to completion...');
          setTimeout(() => setStep(8), 2000);
        } else {
          setError(result.error || 'Failed to create dealer');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create dealer');
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Create Admin Account</h2>
              <p className="text-gray-600 mt-2">Set up the system administrator for PumpGuard</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="adminName">Admin Name</Label>
                <Input
                  id="adminName"
                  value={adminData.name}
                  onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                  placeholder="Enter admin full name"
                />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  placeholder="Enter admin email"
                />
              </div>
              <div>
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="Enter admin password"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateAdmin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Creating Admin...' : 'Create Admin Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Admin Account Ready!</h2>
              <p className="text-gray-600 mt-2">Your admin account has been created. Let's log in to continue setup.</p>
            </div>
            <Button
              onClick={handleLoginAdmin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Logging in...' : 'Login as Admin'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Create Oil Marketing Company</h2>
              <p className="text-gray-600 mt-2">Set up your fuel company details</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="omcName">Company Name</Label>
                <Input
                  id="omcName"
                  value={omcData.name}
                  onChange={(e) => setOmcData({ ...omcData, name: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={omcData.license_number}
                  onChange={(e) => setOmcData({ ...omcData, license_number: e.target.value })}
                  placeholder="License number"
                />
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={omcData.region}
                  onChange={(e) => setOmcData({ ...omcData, region: e.target.value })}
                  placeholder="Operating region"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  value={omcData.contact}
                  onChange={(e) => setOmcData({ ...omcData, contact: e.target.value })}
                  placeholder="Contact information"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateOMC}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Creating OMC...' : 'Create Oil Company'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Fuel className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Create Fuel Station</h2>
              <p className="text-gray-600 mt-2">Set up your first fuel station</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="stationName">Station Name</Label>
                <Input
                  id="stationName"
                  value={stationData.name}
                  onChange={(e) => setStationData({ ...stationData, name: e.target.value })}
                  placeholder="Enter station name"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={stationData.location}
                  onChange={(e) => setStationData({ ...stationData, location: e.target.value })}
                  placeholder="Enter station location"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateStation}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Creating Station...' : 'Create Fuel Station'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Create Station Manager</h2>
              <p className="text-gray-600 mt-2">Set up station manager account</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="managerName">Manager Name</Label>
                <Input
                  id="managerName"
                  value={managerData.name}
                  onChange={(e) => setManagerData({ ...managerData, name: e.target.value })}
                  placeholder="Enter manager name"
                />
              </div>
              <div>
                <Label htmlFor="managerEmail">Email</Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={managerData.email}
                  onChange={(e) => setManagerData({ ...managerData, email: e.target.value })}
                  placeholder="Enter manager email"
                />
              </div>
              <div>
                <Label htmlFor="managerPassword">Password</Label>
                <Input
                  id="managerPassword"
                  type="password"
                  value={managerData.password}
                  onChange={(e) => setManagerData({ ...managerData, password: e.target.value })}
                  placeholder="Enter manager password"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateManager}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Creating Manager...' : 'Create Manager Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Create POS Attendant</h2>
              <p className="text-gray-600 mt-2">Set up attendant account for POS operations</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="attendantName">Attendant Name</Label>
                <Input
                  id="attendantName"
                  value={attendantData.name}
                  onChange={(e) => setAttendantData({ ...attendantData, name: e.target.value })}
                  placeholder="Enter attendant name"
                />
              </div>
              <div>
                <Label htmlFor="attendantEmail">Email</Label>
                <Input
                  id="attendantEmail"
                  type="email"
                  value={attendantData.email}
                  onChange={(e) => setAttendantData({ ...attendantData, email: e.target.value })}
                  placeholder="Enter attendant email"
                />
              </div>
              <div>
                <Label htmlFor="attendantPassword">Password</Label>
                <Input
                  id="attendantPassword"
                  type="password"
                  value={attendantData.password}
                  onChange={(e) => setAttendantData({ ...attendantData, password: e.target.value })}
                  placeholder="Enter attendant password"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateAttendant}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Creating Attendant...' : 'Create Attendant Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Create Fuel Dealer</h2>
              <p className="text-gray-600 mt-2">Set up dealer account for the station</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="dealerName">Dealer Name</Label>
                <Input
                  id="dealerName"
                  value={dealerData.name}
                  onChange={(e) => setDealerData({ ...dealerData, name: e.target.value })}
                  placeholder="Enter dealer name"
                />
              </div>
              <div>
                <Label htmlFor="dealerEmail">Email</Label>
                <Input
                  id="dealerEmail"
                  type="email"
                  value={dealerData.email}
                  onChange={(e) => setDealerData({ ...dealerData, email: e.target.value })}
                  placeholder="Enter dealer email"
                />
              </div>
              <div>
                <Label htmlFor="dealerPassword">Password</Label>
                <Input
                  id="dealerPassword"
                  type="password"
                  value={dealerData.password}
                  onChange={(e) => setDealerData({ ...dealerData, password: e.target.value })}
                  placeholder="Enter dealer password"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> This dealer will be associated with {omcData.name} and {stationData.name}
                </p>
              </div>
            </div>
            <Button
              onClick={handleCreateDealer}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Creating Dealer...' : 'Create Dealer Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 8:
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="w-24 h-24 text-green-600 mx-auto" />
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Setup Complete!</h2>
              <p className="text-gray-600 mt-2 text-lg">Your PumpGuard environment is ready to use</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Credentials</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Admin</p>
                  <p className="text-gray-900">{adminData.email}</p>
                  <p className="text-gray-500">{adminData.password}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Station Manager</p>
                  <p className="text-gray-900">{managerData.email}</p>
                  <p className="text-gray-500">{managerData.password}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">POS Attendant</p>
                  <p className="text-gray-900">{attendantData.email}</p>
                  <p className="text-gray-500">{attendantData.password}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Fuel Dealer</p>
                  <p className="text-gray-900">{dealerData.email}</p>
                  <p className="text-gray-500">{dealerData.password}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">
                  <strong>Organization:</strong> {omcData.name} → {stationData.name}
                </p>
              </div>
            </div>

            <Button
              onClick={onComplete}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Launch PumpGuard Dashboard
            </Button>
          </div>
        );

      default:
        return <div>Step {step} content</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="grid grid-cols-4">
          {/* Sidebar */}
          <div className="col-span-1 bg-blue-600 text-white p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold">PumpGuard</h1>
              <p className="text-blue-100 text-sm mt-2">Setup Wizard</p>
            </div>
            
            <div className="space-y-4">
              {steps.map((stepItem) => {
                const Icon = stepItem.icon;
                return (
                  <div
                    key={stepItem.number}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      step === stepItem.number
                        ? 'bg-blue-700 text-white'
                        : step > stepItem.number
                        ? 'bg-blue-500 text-white'
                        : 'text-blue-100 hover:bg-blue-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= stepItem.number ? 'bg-white text-blue-600' : 'bg-blue-400 text-white'
                    }`}>
                      {step > stepItem.number ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Step {stepItem.number}</p>
                      <p className="text-xs opacity-90">{stepItem.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-3 p-8">
            <div className="max-w-2xl mx-auto">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Step {step} of 8</span>
                  <span>{steps[step - 1]?.title}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(step / 8) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700">{error}</p>
                  {error.includes('already exists') && (
                    <p className="text-sm text-red-600 mt-2">
                      You can proceed with setup or login directly with existing credentials.
                    </p>
                  )}
                </div>
              )}

              {/* Step Content */}
              <Card className="border-0 shadow-none">
                <CardContent className="p-6">
                  {getStepContent()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SetupWizard;