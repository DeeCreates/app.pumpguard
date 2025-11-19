// contexts/DeviceContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useDeviceType, DeviceInfo, Breakpoints } from '../hooks/useDeviceType';

interface DeviceContextValue extends DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isMobileOrTablet: boolean;
  isTabletOrDesktop: boolean;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

interface DeviceProviderProps {
  children: ReactNode;
  customBreakpoints?: Partial<Breakpoints>;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ 
  children, 
  customBreakpoints 
}) => {
  const deviceInfo = useDeviceType(customBreakpoints);
  
  const contextValue: DeviceContextValue = {
    ...deviceInfo,
    isMobile: deviceInfo.type === 'mobile',
    isTablet: deviceInfo.type === 'tablet',
    isDesktop: deviceInfo.type === 'desktop',
    isMobileOrTablet: deviceInfo.type === 'mobile' || deviceInfo.type === 'tablet',
    isTabletOrDesktop: deviceInfo.type === 'tablet' || deviceInfo.type === 'desktop',
  };

  return (
    <DeviceContext.Provider value={contextValue}>
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = (): DeviceContextValue => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};