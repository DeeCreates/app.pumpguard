// src/pages/settings/LazyColorPicker.tsx
import React from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Palette, Eye, Check } from 'lucide-react';

interface ColorPickerProps {
  brandColor: string;
  onColorChange: (color: string) => void;
  label?: string;
  description?: string;
  presetColors?: string[];
}

export function ColorPicker({ 
  brandColor, 
  onColorChange, 
  label = "Brand Color", 
  description,
  presetColors = [
    '#0B2265', // PumpGuard blue
    '#DC2626', // Red
    '#059669', // Green
    '#7C3AED', // Purple
    '#EA580C', // Orange
    '#0891B2', // Cyan
    '#65A30D', // Lime
    '#9333EA', // Violet
    '#E11D48', // Pink
    '#CA8A04', // Yellow
    '#000000', // Black
    '#64748B', // Gray
    '#FFFFFF', // White
    '#F59E0B', // Amber
    '#EF4444'  // Light Red
  ]
}: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = React.useState(brandColor);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onColorChange(color);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let color = e.target.value;
    // Ensure the color has # prefix
    if (!color.startsWith('#')) {
      color = '#' + color;
    }
    // Validate hex color format
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      handleColorChange(color);
    }
  };

  const getTextColor = (backgroundColor: string) => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <Label className="text-lg font-semibold text-gray-900">{label}</Label>
              {description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
          </div>

          {/* Current Color Display */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div 
              className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm flex items-center justify-center"
              style={{ backgroundColor: selectedColor }}
            >
              <span 
                className="text-xs font-bold px-2 py-1 rounded"
                style={{ 
                  backgroundColor: getTextColor(selectedColor) === '#000000' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)',
                  color: getTextColor(selectedColor) === '#000000' ? '#000000' : '#FFFFFF'
                }}
              >
                Aa
              </span>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: selectedColor }}
                />
                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {selectedColor}
                </code>
              </div>
              <p className="text-xs text-gray-600">
                This color will be used for buttons, headers, and accents throughout the application.
              </p>
            </div>
          </div>

          {/* Color Input */}
          <div className="space-y-3">
            <Label htmlFor="color-picker" className="text-sm font-medium">
              Custom Color
            </Label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  id="color-picker"
                  type="color"
                  value={selectedColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-full h-10 p-1 cursor-pointer"
                />
              </div>
              
              <div className="flex-1">
                <Input
                  type="text"
                  value={selectedColor}
                  onChange={handleInputChange}
                  placeholder="#0B2265"
                  className="font-mono text-sm h-10"
                  maxLength={7}
                />
              </div>

              <div 
                className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-white text-xs font-medium shadow-sm"
                style={{ backgroundColor: selectedColor }}
              >
                <Eye className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Preset Colors */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Preset Colors
            </Label>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  className={`
                    relative w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 hover:shadow-md
                    ${selectedColor === color ? 'border-gray-800 shadow-lg scale-110' : 'border-gray-300'}
                  `}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  title={color}
                >
                  {selectedColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check 
                        className="w-4 h-4" 
                        style={{ 
                          color: getTextColor(color) 
                        }} 
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color Preview */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Preview
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div 
                className="p-3 rounded-lg text-white font-medium text-center"
                style={{ backgroundColor: selectedColor }}
              >
                Primary Button
              </div>
              <div 
                className="p-3 rounded-lg border text-center"
                style={{ 
                  borderColor: selectedColor,
                  color: selectedColor
                }}
              >
                Outline Button
              </div>
            </div>
          </div>

          {/* Color Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              💡 Color Selection Tips
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Choose colors with good contrast for readability</li>
              <li>• Consider your brand identity and station theme</li>
              <li>• Test colors in both light and dark environments</li>
              <li>• Ensure accessibility for color-blind users</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ColorPicker;