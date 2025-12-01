import React, { useState, useEffect } from 'react';
import { supabase } from "../../utils/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Activity, Thermometer, Droplet, Plus, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export function IoTDashboard() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [latestReadings, setLatestReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  const [deviceForm, setDeviceForm] = useState({
    type: 'pump_meter',
    serial_number: '',
    pump_number: '',
    tank_number: ''
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    if (!user?.station_id) return;
    
    setLoading(true);
    try {
      const data = await api.getIoTDashboard(user.station_id);
      setDevices(data.devices || []);
      setLatestReadings(data.latest_readings || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id) return;

    try {
      await api.registerDevice({
        station_id: user.station_id,
        ...deviceForm,
        pump_number: deviceForm.pump_number ? parseInt(deviceForm.pump_number) : undefined,
        tank_number: deviceForm.tank_number ? parseInt(deviceForm.tank_number) : undefined
      });
      
      setShowRegisterDialog(false);
      setDeviceForm({ type: 'pump_meter', serial_number: '', pump_number: '', tank_number: '' });
      loadDevices();
    } catch (error) {
      console.error('Failed to register device:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'pump_meter':
        return <Activity className="w-6 h-6" />;
      case 'tank_gauge':
        return <Droplet className="w-6 h-6" />;
      case 'dipping_stick':
        return <Thermometer className="w-6 h-6" />;
      default:
        return <Activity className="w-6 h-6" />;
    }
  };

  const getDeviceTypeColor = (type: string) => {
    switch (type) {
      case 'pump_meter':
        return 'bg-blue-100 text-blue-600';
      case 'tank_gauge':
        return 'bg-purple-100 text-purple-600';
      case 'dipping_stick':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-600' : 'text-red-600';
  };

  const isDeviceOnline = (lastSync: string) => {
    const lastSyncTime = new Date(lastSync).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return now - lastSyncTime < fiveMinutes;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-black">IoT Device Management</h2>
        <div className="flex gap-3">
          <Button onClick={loadDevices} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: '#0B2265' }}>
                <Plus className="w-4 h-4 mr-2" />
                Register Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register IoT Device</DialogTitle>
                <DialogDescription>Enter the details of the device you want to register.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRegisterDevice} className="space-y-4">
                <div>
                  <Label>Device Type</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    value={deviceForm.type}
                    onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
                  >
                    <option value="pump_meter">Pump Meter</option>
                    <option value="tank_gauge">Tank Gauge (ATG)</option>
                    <option value="dipping_stick">Digital Dipping Stick</option>
                  </select>
                </div>
                <div>
                  <Label>Serial Number</Label>
                  <Input
                    value={deviceForm.serial_number}
                    onChange={(e) => setDeviceForm({ ...deviceForm, serial_number: e.target.value })}
                    placeholder="SN-12345678"
                    required
                  />
                </div>
                {deviceForm.type === 'pump_meter' && (
                  <div>
                    <Label>Pump Number</Label>
                    <Input
                      type="number"
                      value={deviceForm.pump_number}
                      onChange={(e) => setDeviceForm({ ...deviceForm, pump_number: e.target.value })}
                      placeholder="1"
                      required
                    />
                  </div>
                )}
                {(deviceForm.type === 'tank_gauge' || deviceForm.type === 'dipping_stick') && (
                  <div>
                    <Label>Tank Number</Label>
                    <Input
                      type="number"
                      value={deviceForm.tank_number}
                      onChange={(e) => setDeviceForm({ ...deviceForm, tank_number: e.target.value })}
                      placeholder="1"
                      required
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" style={{ backgroundColor: '#0B2265' }}>
                  Register Device
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {latestReadings.map((reading) => {
          const device = reading.device;
          const isOnline = isDeviceOnline(device.last_sync);
          
          return (
            <Card key={device.id} className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${getDeviceTypeColor(device.type)}`}>
                  {getDeviceIcon(device.type)}
                </div>
                {isOnline ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                )}
              </div>

              <h3 className="text-lg text-black mb-1 capitalize">
                {device.type.replace('_', ' ')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {device.pump_number ? `Pump ${device.pump_number}` : `Tank ${device.tank_number}`}
              </p>

              {reading.latest_reading ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Current Reading</p>
                    <p className="text-2xl text-black">
                      {reading.latest_reading.reading.toLocaleString()}
                      {device.type === 'tank_gauge' ? 'L' : ''}
                    </p>
                  </div>

                  {reading.latest_reading.temperature && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Thermometer className="w-4 h-4 text-blue-600" />
                          <p className="text-xs text-blue-600">Temperature</p>
                        </div>
                        <p className="text-lg text-black">{reading.latest_reading.temperature}°C</p>
                      </div>
                      {reading.latest_reading.water_level !== undefined && (
                        <div className="p-3 bg-purple-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <Droplet className="w-4 h-4 text-purple-600" />
                            <p className="text-xs text-purple-600">Water</p>
                          </div>
                          <p className="text-lg text-black">{reading.latest_reading.water_level}mm</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Last sync: {new Date(reading.latest_reading.timestamp).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No readings yet</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Serial</span>
                  <span className="text-black">{device.serial_number}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Status</span>
                  <span className={`capitalize ${getStatusColor(device.status)}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}

        {latestReadings.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No IoT devices registered</p>
            <Button onClick={() => setShowRegisterDialog(true)} variant="outline">
              Register Your First Device
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}