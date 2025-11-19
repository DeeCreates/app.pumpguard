// components/layouts/index.tsx
import React from 'react';
import { useDeviceType } from '@/hooks/useDeviceType';
import MobileLayout from './MobileLayout';
import DesktopLayout from './DesktopLayout';
import AuthLayout from './AuthLayout';

interface LayoutProps {
  children: React.ReactNode;
  type?: 'auth' | 'app';
}

export default function Layout({ children, type = 'app' }: LayoutProps) {
  const deviceType = useDeviceType();

  if (type === 'auth') {
    return <AuthLayout>{children}</AuthLayout>;
  }

  if (deviceType === 'mobile') {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return <DesktopLayout>{children}</DesktopLayout>;
}