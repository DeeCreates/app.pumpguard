// components/layouts/Navbar.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Added Link import
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { 
  LogOut, 
  Zap, 
  User, 
  HelpCircle, 
  Menu, 
  X,
  Bell,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { ThemeToggle } from '../ThemeToggle';

interface NavbarProps {
  onViewChange?: (view: string) => void;
  currentView?: string;
}

export function Navbar({ onViewChange, currentView }: NavbarProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin Dashboard';
      case 'npa_supervisor': return 'NPA Supervisor';
      case 'omc': return 'OMC Dashboard';
      case 'station_manager': return 'Station Manager';
      case 'attendant': return 'POS Terminal';
      case 'dealer': return 'Dealer Portal';
      default: return 'Dashboard';
    }
  };

  const handleTourRestart = () => {
    localStorage.removeItem('pumpguard_tour_completed');
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Mobile menu content
  const MobileMenuContent = () => (
    <div className="space-y-6 py-6">
      {/* User Info */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.full_name || user?.email}
          </p>
          <p className="text-xs text-gray-600 capitalize">
            {user?.role?.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Mobile Navigation Links */}
      <div className="space-y-2 px-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          asChild
        >
          <Link to="/notifications" onClick={() => setMobileMenuOpen(false)}>
            <Bell className="w-4 h-4" />
            Notifications
          </Link>
        </Button>
        
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          asChild
        >
          <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </Button>
      </div>

      {/* View Switcher for Station Manager */}
      {user?.role === 'station_manager' && onViewChange && (
        <div className="space-y-2 px-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Views</p>
          <div className="flex gap-2">
            <Button
              variant={currentView === 'dashboard' ? 'default' : 'outline'}
              onClick={() => {
                onViewChange('dashboard');
                setMobileMenuOpen(false);
              }}
              size="sm"
              className="flex-1"
              style={currentView === 'dashboard' ? { backgroundColor: '#0B2265' } : {}}
            >
              Dashboard
            </Button>
            <Button
              variant={currentView === 'pos' ? 'default' : 'outline'}
              onClick={() => {
                onViewChange('pos');
                setMobileMenuOpen(false);
              }}
              size="sm"
              className="flex-1"
              style={currentView === 'pos' ? { backgroundColor: '#0B2265' } : {}}
            >
              POS Terminal
            </Button>
          </div>
        </div>
      )}

      {/* Help Tour */}
      <div className="space-y-2 px-4">
        <Button
          variant="outline"
          onClick={() => {
            handleTourRestart();
            setMobileMenuOpen(false);
          }}
          className="w-full justify-start gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Help Tour
        </Button>
      </div>

      {/* Logout */}
      <div className="px-4">
        <Button 
          onClick={handleLogout}
          variant="outline" 
          className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Section - Logo & View Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Menu Trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="sm:hidden h-9 w-9 p-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 sm:w-96">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-lg">PumpGuard</span>
              </div>
              <MobileMenuContent />
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">PumpGuard</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">{getRoleName(user?.role || '')}</p>
            </div>
          </div>

          {/* View Switcher - Desktop */}
          {user?.role === 'station_manager' && onViewChange && (
            <div className="hidden md:flex gap-2 ml-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => onViewChange('dashboard')}
                size="sm"
                className={currentView === 'dashboard' ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
                style={currentView === 'dashboard' ? { backgroundColor: '#0B2265' } : {}}
              >
                Dashboard
              </Button>
              <Button
                variant={currentView === 'pos' ? 'default' : 'ghost'}
                onClick={() => onViewChange('pos')}
                size="sm"
                className={currentView === 'pos' ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
                style={currentView === 'pos' ? { backgroundColor: '#0B2265' } : {}}
              >
                POS Terminal
              </Button>
            </div>
          )}
        </div>

        {/* Right Section - Actions & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* Notifications - FIXED: Added Link wrapper */}
          <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" asChild>
            <Link to="/notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </Link>
          </Button>

          {/* Help Tour - Desktop */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTourRestart}
            className="hidden sm:flex gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden lg:inline">Help Tour</span>
          </Button>

          {/* User Menu - Desktop */}
          <div className="hidden sm:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.full_name || user?.email}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings/profile" className="w-full flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/notifications" className="w-full flex items-center gap-2 cursor-pointer">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="w-full flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile User Info & Logout */}
          <div className="flex sm:hidden items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/notifications" className="w-full flex items-center gap-2 cursor-pointer">
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="w-full flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* View Switcher - Mobile (below navbar) */}
      {user?.role === 'station_manager' && onViewChange && (
        <div className="md:hidden mt-3 px-4">
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <Button
              variant={currentView === 'dashboard' ? 'default' : 'ghost'}
              onClick={() => onViewChange('dashboard')}
              size="sm"
              className="flex-1 text-xs"
              style={currentView === 'dashboard' ? { backgroundColor: '#0B2265' } : {}}
            >
              Dashboard
            </Button>
            <Button
              variant={currentView === 'pos' ? 'default' : 'ghost'}
              onClick={() => onViewChange('pos')}
              size="sm"
              className="flex-1 text-xs"
              style={currentView === 'pos' ? { backgroundColor: '#0B2265' } : {}}
            >
              POS Terminal
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;