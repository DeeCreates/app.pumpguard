import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Palette, Upload, Eye, Save, Download, RefreshCw, Building2, Receipt, Zap } from 'lucide-react';

interface BrandingSettings {
  omc_id: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  company_name: string;
  tagline?: string;
  receipt_footer?: string;
  station_count: number;
  established_year?: number;
  contact_email?: string;
  website?: string;
}

interface BrandingManagerProps {
  omcId: string;
  currentBranding?: BrandingSettings;
  onUpdate?: (branding: BrandingSettings) => void;
  compact?: boolean;
}

// Lazy loaded components
const LazyLogoUpload = lazy(() => import('./LazyLogoUpload'));
const LazyColorPicker = lazy(() => import('./LazyColorPicker'));

export function BrandingManager({ omcId, currentBranding, onUpdate, compact = false }: BrandingManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>({
    omc_id: omcId,
    primary_color: currentBranding?.primary_color || '#0B2265',
    secondary_color: currentBranding?.secondary_color || '#000000',
    company_name: currentBranding?.company_name || '',
    tagline: currentBranding?.tagline || '',
    receipt_footer: currentBranding?.receipt_footer || '',
    logo_url: currentBranding?.logo_url,
    station_count: currentBranding?.station_count || 0,
    established_year: currentBranding?.established_year || 2024,
    contact_email: currentBranding?.contact_email || '',
    website: currentBranding?.website || '',
  });

  useEffect(() => {
    loadBranding();
  }, [omcId]);

  const loadBranding = async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Load from localStorage (in real app, this would be from backend)
    const savedBranding = localStorage.getItem(`branding_${omcId}`);
    if (savedBranding) {
      setBranding(JSON.parse(savedBranding));
    } else {
      // Default branding
      setBranding({
        omc_id: omcId,
        primary_color: '#0B2265',
        secondary_color: '#000000',
        company_name: 'Total Ghana',
        tagline: 'Energy in Motion',
        receipt_footer: 'Thank you for choosing Total Ghana. Drive safely!',
        station_count: 45,
        established_year: 2020,
        contact_email: 'info@totalghana.com',
        website: 'www.totalghana.com',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to localStorage (in real app, this would go to backend)
      localStorage.setItem(`branding_${omcId}`, JSON.stringify(branding));
      
      if (onUpdate) {
        onUpdate(branding);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save branding:', error);
      alert('Failed to save branding settings');
    } finally {
      setLoading(false);
    }
  };

  const presetColors = [
    { name: 'PumpGuard Blue', primary: '#0B2265', secondary: '#000000' },
    { name: 'Shell Red', primary: '#DD1D21', secondary: '#FCDB03' },
    { name: 'BP Green', primary: '#00923F', secondary: '#FFF200' },
    { name: 'Total Blue', primary: '#0055A4', secondary: '#EF3340' },
    { name: 'Goil Gold', primary: '#FFB81C', secondary: '#000000' },
    { name: 'Puma Blue', primary: '#003087', secondary: '#ED1C24' },
    { name: 'Engen Orange', primary: '#FF6600', secondary: '#000000' },
    { name: 'Mobil Red', primary: '#E60000', secondary: '#000000' },
  ];

  // Loading skeletons
  const SettingsSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );

  const PreviewSkeleton = () => (
    <Card className="p-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-24" />
      </div>
    </Card>
  );

  if (compact) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Palette className="w-4 h-4" />
            Brand
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Brand Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={branding.company_name}
                onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                placeholder="Company Name"
              />
            </div>
            <div>
              <Label>Primary Color</Label>
              <Input
                type="color"
                value={branding.primary_color}
                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                className="w-full h-10"
              />
            </div>
            <Button
              onClick={handleSave}
              style={{ backgroundColor: branding.primary_color }}
              className="w-full"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Palette className="w-4 h-4" />
          Brand Management
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OMC Branding & Identity Management</DialogTitle>
          <DialogDescription>
            Customize your company's brand identity across {branding.station_count} stations
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-black font-semibold">Brand Configuration</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadBranding}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Reset
              </Button>
            </div>

            {loading ? (
              <SettingsSkeleton />
            ) : (
              <div className="space-y-6">
                {/* Company Information */}
                <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Company Name *</Label>
                      <Input
                        value={branding.company_name}
                        onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                        placeholder="Your Oil Marketing Company"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Tagline</Label>
                      <Input
                        value={branding.tagline}
                        onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                        placeholder="Your company slogan or mission statement"
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Contact Email</Label>
                        <Input
                          type="email"
                          value={branding.contact_email}
                          onChange={(e) => setBranding({ ...branding, contact_email: e.target.value })}
                          placeholder="contact@company.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Website</Label>
                        <Input
                          value={branding.website}
                          onChange={(e) => setBranding({ ...branding, website: e.target.value })}
                          placeholder="www.company.com"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Brand Colors */}
                <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Brand Colors
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Primary Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Suspense fallback={<Skeleton className="w-20 h-10" />}>
                            <LazyColorPicker
                              value={branding.primary_color}
                              onChange={(color) => setBranding({ ...branding, primary_color: color })}
                            />
                          </Suspense>
                          <Input
                            value={branding.primary_color}
                            onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                            placeholder="#0B2265"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Secondary Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Suspense fallback={<Skeleton className="w-20 h-10" />}>
                            <LazyColorPicker
                              value={branding.secondary_color}
                              onChange={(color) => setBranding({ ...branding, secondary_color: color })}
                            />
                          </Suspense>
                          <Input
                            value={branding.secondary_color}
                            onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Industry Color Presets</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        {presetColors.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() =>
                              setBranding({
                                ...branding,
                                primary_color: preset.primary,
                                secondary_color: preset.secondary,
                              })
                            }
                            className="p-3 border border-gray-200 rounded-xl hover:border-blue-500 transition-all hover:shadow-md text-left group"
                          >
                            <div className="flex gap-2 items-center mb-2">
                              <div
                                className="w-8 h-8 rounded-lg shadow-sm"
                                style={{ backgroundColor: preset.primary }}
                              />
                              <div
                                className="w-8 h-8 rounded-lg shadow-sm"
                                style={{ backgroundColor: preset.secondary }}
                              />
                            </div>
                            <p className="text-xs text-gray-600 font-medium group-hover:text-black">
                              {preset.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Logo & Assets */}
                <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Logo & Brand Assets
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-4">
                    <Suspense fallback={
                      <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl text-center">
                        <Skeleton className="w-16 h-16 mx-auto mb-2" />
                        <Skeleton className="h-4 w-32 mx-auto" />
                      </div>
                    }>
                      <LazyLogoUpload
                        currentLogo={branding.logo_url}
                        onLogoChange={(logoUrl) => setBranding({ ...branding, logo_url: logoUrl })}
                      />
                    </Suspense>
                  </div>
                </Card>

                {/* Receipt Customization */}
                <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Receipt & Documentation
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Receipt Footer Text</Label>
                      <textarea
                        value={branding.receipt_footer}
                        onChange={(e) => setBranding({ ...branding, receipt_footer: e.target.value })}
                        placeholder="Thank you for your business! Visit us again soon."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This text appears at the bottom of all customer receipts
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-black font-semibold">Live Preview</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {previewMode ? 'Edit Mode' : 'Preview Mode'}
              </Button>
            </div>

            {loading ? (
              <PreviewSkeleton />
            ) : (
              <div className="space-y-6">
                {/* Receipt Preview */}
                <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg">Receipt Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div
                      className="border-2 rounded-xl p-4 space-y-4 bg-white"
                      style={{ borderColor: branding.primary_color }}
                    >
                      {/* Header */}
                      <div
                        className="text-center p-4 rounded-lg"
                        style={{ backgroundColor: branding.primary_color }}
                      >
                        {branding.logo_url ? (
                          <img 
                            src={branding.logo_url} 
                            alt="Company Logo" 
                            className="h-12 mx-auto mb-2"
                          />
                        ) : (
                          <Building2 className="w-12 h-12 text-white mx-auto mb-2" />
                        )}
                        <h3 className="text-xl text-white font-bold">
                          {branding.company_name || 'Your Company Name'}
                        </h3>
                        {branding.tagline && (
                          <p className="text-sm text-white/90 mt-1">{branding.tagline}</p>
                        )}
                      </div>

                      {/* Transaction Details */}
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transaction #</span>
                          <span className="text-black font-medium">TXN-20251018-001</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date & Time</span>
                          <span className="text-black font-medium">{new Date().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Station</span>
                          <span className="text-black font-medium">Accra Central</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Attendant</span>
                          <span className="text-black font-medium">Kwame M.</span>
                        </div>
                        
                        <hr className="border-gray-200" />
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Product</span>
                          <span className="text-black font-medium">Petrol</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Volume</span>
                          <span className="text-black font-medium">25.00 L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price/L</span>
                          <span className="text-black font-medium">₵15.50</span>
                        </div>
                        
                        <hr 
                          className="border-2" 
                          style={{ borderColor: branding.secondary_color }} 
                        />
                        
                        <div className="flex justify-between text-lg font-bold">
                          <span style={{ color: branding.primary_color }}>Total Amount</span>
                          <span style={{ color: branding.primary_color }}>₵387.50</span>
                        </div>
                      </div>

                      {/* Footer */}
                      {branding.receipt_footer && (
                        <div className="text-center pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-600">{branding.receipt_footer}</p>
                        </div>
                      )}

                      {/* QR Code Area */}
                      <div className="text-center pt-3">
                        <div 
                          className="w-24 h-24 mx-auto rounded-lg flex items-center justify-center border-2"
                          style={{ borderColor: branding.secondary_color }}
                        >
                          <span className="text-xs text-gray-400">QR Code</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Scan for verification</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* UI Elements Preview */}
                <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg">UI Elements</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Button Styles</Label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-4 py-2 rounded-lg text-white font-medium transition-all hover:shadow-lg"
                          style={{ backgroundColor: branding.primary_color }}
                        >
                          Primary Action
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg text-white font-medium transition-all hover:shadow-lg"
                          style={{ backgroundColor: branding.secondary_color }}
                        >
                          Secondary
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg border-2 font-medium transition-all hover:shadow-lg"
                          style={{ 
                            borderColor: branding.primary_color,
                            color: branding.primary_color
                          }}
                        >
                          Outline
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Status Indicators</Label>
                      <div className="flex flex-wrap gap-2">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: branding.primary_color }}
                        >
                          Active
                        </span>
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: branding.secondary_color + '20',
                            color: branding.secondary_color
                          }}
                        >
                          Pending
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Brand Summary */}
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border-0">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Brand Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stations</span>
                      <span className="text-black font-medium">{branding.station_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Established</span>
                      <span className="text-black font-medium">{branding.established_year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contact</span>
                      <span className="text-black font-medium">{branding.contact_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Website</span>
                      <span className="text-black font-medium">{branding.website}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Brand Guide
          </Button>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              style={{ backgroundColor: branding.primary_color }} 
              className="gap-2"
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Brand Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BrandingManager;

