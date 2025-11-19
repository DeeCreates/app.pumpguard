import React from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { LogOut, Zap, User, HelpCircle } from 'lucide-react';

interface NavbarProps {
  onViewChange?: (view: string) => void;
  currentView?: string;
}

export function Navbar({ onViewChange, currentView }: NavbarProps) {
  const { user, logout } = useAuth();

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin Dashboard';
      case 'supervisor': return 'NPA Supervisor';
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

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-black">PumpGuard</h1>
              <p className="text-xs text-gray-600">{getRoleName(user?.role || '')}</p>
            </div>
          </div>

          {user?.role === 'station_manager' && onViewChange && (
            <div className="flex gap-2 ml-8 bg-gray-100 p-1 rounded-xl">
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => onViewChange('dashboard')}
                size="sm"
                className={currentView === 'dashboard' ? '' : 'hover:bg-gray-200'}
                style={currentView === 'dashboard' ? { backgroundColor: '#0B2265' } : {}}
              >
                Dashboard
              </Button>
              <Button
                variant={currentView === 'pos' ? 'default' : 'ghost'}
                onClick={() => onViewChange('pos')}
                size="sm"
                className={currentView === 'pos' ? '' : 'hover:bg-gray-200'}
                style={currentView === 'pos' ? { backgroundColor: '#0B2265' } : {}}
              >
                POS Terminal
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTourRestart}
            className="gap-2 text-gray-600 hover:text-blue-600"
          >
            <HelpCircle className="w-4 h-4" />
            Help Tour
          </Button>

          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <User className="w-4 h-4 text-gray-600" />
            <div className="text-sm">
              <p className="text-black">{user?.name}</p>
              <p className="text-xs text-gray-600 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <Button onClick={logout} variant="outline" size="sm" className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}