// src/pages/settings/LazyLogoUpload.tsx
import React, { useState, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Upload, X, Image, CheckCircle, AlertCircle } from 'lucide-react';

interface LogoUploadProps {
  currentLogo?: string;
  onLogoChange: (file: File | null) => void;
  stationName?: string;
}

export function LogoUpload({ currentLogo, onLogoChange, stationName }: LogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(currentLogo || '');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, SVG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError('');
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onLogoChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setPreviewUrl('');
    setError('');
    onLogoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="logo-upload" className="text-sm font-medium text-gray-700">
              Station Logo
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Upload your station logo. Recommended: 200x200px PNG or SVG
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white">
                {previewUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewUrl}
                      alt="Station Logo"
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-semibold text-lg">
                        {stationName ? getInitials(stationName) : 'PG'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">No logo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Area */}
            <div className="flex-1">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging 
                    ? 'border-blue-400 bg-blue-50' 
                    : previewUrl 
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {previewUrl ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-green-700">Logo uploaded successfully</p>
                    <p className="text-xs text-green-600">Click to change or drag a new file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-sm font-medium text-gray-700">Drag and drop your logo here</p>
                    <p className="text-xs text-gray-500">or click to browse files</p>
                  </div>
                )}

                <Input
                  ref={fileInputRef}
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant={previewUrl ? "outline" : "default"}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3"
                >
                  <Image className="w-4 h-4 mr-2" />
                  {previewUrl ? 'Change Logo' : 'Browse Files'}
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Supported formats: JPG, PNG, SVG, WebP</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Max file size: 5MB</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Recommended: 200x200px for best quality</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LogoUpload;