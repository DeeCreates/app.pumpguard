import React from 'react';
import { User, Building2, MapPin } from 'lucide-react';
import { Dealer, DealerStation } from '../../types';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface DealerHeaderProps {
  dealer: Dealer;
  stations: DealerStation[];
}

export function DealerHeader({ dealer, stations }: DealerHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border-0 p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Profile Section */}
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20 border-4 border-blue-100">
            <AvatarFallback className="text-2xl" style={{ backgroundColor: '#0B2265', color: 'white' }}>
              {getInitials(dealer.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl text-black mb-1">{dealer.name}</h2>
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>Dealer Account</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-600">Stations</p>
            </div>
            <p className="text-2xl text-black">{stations.length}</p>
          </div>

          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-green-600" />
              <p className="text-sm text-gray-600">Active</p>
            </div>
            <p className="text-2xl text-black">
              {stations.filter(s => s.status === 'active').length}
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Commission Rate</p>
            <p className="text-2xl text-black">{dealer.commission_rate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
