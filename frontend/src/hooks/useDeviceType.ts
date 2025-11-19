// hooks/useDeviceType.ts
import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  type: DeviceType;
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouchDevice: boolean;
}

// Default breakpoints (can be customized)
export interface Breakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

const defaultBreakpoints: Breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
};

export const useDeviceType = (
  customBreakpoints?: Partial<Breakpoints>
): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => 
    getDeviceInfo(customBreakpoints)
  );

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo(customBreakpoints));
    };

    // Check if device supports touch
    const checkTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };

    // Initial check
    handleResize();

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Check for touch capability (only once as it doesn't change)
    if (checkTouchDevice()) {
      setDeviceInfo(prev => ({ ...prev, isTouchDevice: true }));
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [customBreakpoints]);

  return deviceInfo;
};

// Helper function to get device information
const getDeviceInfo = (customBreakpoints?: Partial<Breakpoints>): DeviceInfo => {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  let type: DeviceType = 'desktop';
  
  if (width < breakpoints.mobile) {
    type = 'mobile';
  } else if (width < breakpoints.tablet) {
    type = 'tablet';
  } else {
    type = 'desktop';
  }

  return {
    type,
    width,
    height,
    isPortrait: height > width,
    isLandscape: width > height,
    isTouchDevice: false, // Will be updated in useEffect
  };
};

// Additional hook for responsive conditionals
export const useResponsive = () => {
  const device = useDeviceType();

  return {
    isMobile: device.type === 'mobile',
    isTablet: device.type === 'tablet',
    isDesktop: device.type === 'desktop',
    isMobileOrTablet: device.type === 'mobile' || device.type === 'tablet',
    isTabletOrDesktop: device.type === 'tablet' || device.type === 'desktop',
    ...device,
  };
};

// Hook for specific breakpoint monitoring
export const useBreakpoint = (breakpoint: number): boolean => {
  const [isBreakpoint, setIsBreakpoint] = useState(false);

  useEffect(() => {
    const checkBreakpoint = () => {
      setIsBreakpoint(window.innerWidth <= breakpoint);
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    
    return () => {
      window.removeEventListener('resize', checkBreakpoint);
    };
  }, [breakpoint]);

  return isBreakpoint;
};