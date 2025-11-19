// src/pages/operations/LazyQRCode.tsx
import React from 'react';
import { Card, CardContent } from '../../components/ui/card';

interface QRCodeProps {
  data: string;
  size?: number;
}

export function QRCode({ data, size = 200 }: QRCodeProps) {
  // Simple QR code placeholder - in production, use a QR library like qrcode.react
  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center">
        <div 
          className="border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-500"
          style={{ width: size, height: size }}
        >
          <div className="text-center">
            <div className="text-lg mb-2">QR Code</div>
            <div className="text-sm">Placeholder</div>
            <div className="text-xs mt-2">Data: {data.substring(0, 20)}...</div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4 text-center">
          Scan to view receipt
        </p>
      </CardContent>
    </Card>
  );
}

export default QRCode;