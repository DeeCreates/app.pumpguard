// contexts/PriceContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/utils/supabase-client';

interface PriceContextType {
  allStationPrices: any[];
  currentPrices: Map<string, number>;
  stationPrices: Map<string, Map<string, number>>;
  loading: boolean;
  refreshPrices: () => Promise<void>;
  getCurrentPrice: (productId: string, stationId?: string) => number | null;
  getStationPrice: (stationId: string, productId: string) => number | null;
  getStationAllPrices: (stationId: string) => { product_id: string; selling_price: number; product_name: string }[];
  omcPrices: any[];
  priceCaps: any[];
  pricesLoading: boolean;
  omcPricesLoading: boolean;
  priceCapsLoading: boolean;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export const PriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allStationPrices, setAllStationPrices] = useState<any[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Map<string, number>>(new Map());
  const [stationPrices, setStationPrices] = useState<Map<string, Map<string, number>>>(new Map());
  const [omcPrices, setOmcPrices] = useState<any[]>([]);
  const [priceCaps, setPriceCaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [omcPricesLoading, setOmcPricesLoading] = useState(true);
  const [priceCapsLoading, setPriceCapsLoading] = useState(true);
  
  const { toast } = useToast();
  const initializedRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Load all price data
  const refreshPrices = async () => {
    try {
      setLoading(true);
      setPricesLoading(true);
      setOmcPricesLoading(true);
      setPriceCapsLoading(true);

      console.log('🔄 PriceContext: Refreshing prices...');

      // Load station prices, OMC prices, and price caps in parallel
      const [stationPricesResponse, omcPricesResponse, priceCapsResponse] = await Promise.allSettled([
        api.getAllStationPrices(),
        api.getAllOMCPrices(),
        api.getPriceCaps()
      ]);

      // Process station prices
      if (stationPricesResponse.status === 'fulfilled' && stationPricesResponse.value.success && stationPricesResponse.value.data) {
        const prices = stationPricesResponse.value.data;
        setAllStationPrices(prices);
        
        // Create maps for quick access
        const priceMap = new Map<string, number>();
        const stationPriceMap = new Map<string, Map<string, number>>();
        const today = new Date().toISOString().split('T')[0];
        
        prices.forEach((price: any) => {
          // Only consider active/approved prices that are effective
          if ((price.status === 'active' || price.status === 'approved') && 
              price.effective_date <= today && 
              (!price.end_date || price.end_date >= today)) {
            
            // Add to current prices map (latest price per product)
            if (!priceMap.has(price.product_id) || price.effective_date > prices.find(p => p.product_id === price.product_id)?.effective_date) {
              priceMap.set(price.product_id, price.selling_price);
            }
            
            // Add to station prices map
            if (price.station_id) {
              if (!stationPriceMap.has(price.station_id)) {
                stationPriceMap.set(price.station_id, new Map());
              }
              stationPriceMap.get(price.station_id)!.set(price.product_id, price.selling_price);
            }
          }
        });
        
        setCurrentPrices(priceMap);
        setStationPrices(stationPriceMap);
        console.log('✅ PriceContext: Station prices loaded');
      } else {
        console.error('❌ PriceContext: Failed to load station prices:', stationPricesResponse);
      }

      // Process OMC prices
      if (omcPricesResponse.status === 'fulfilled' && omcPricesResponse.value.success && omcPricesResponse.value.data) {
        setOmcPrices(omcPricesResponse.value.data);
        console.log('✅ PriceContext: OMC prices loaded');
      } else {
        console.error('❌ PriceContext: Failed to load OMC prices:', omcPricesResponse);
      }

      // Process price caps
      if (priceCapsResponse.status === 'fulfilled' && priceCapsResponse.value.success && priceCapsResponse.value.data) {
        setPriceCaps(priceCapsResponse.value.data);
        console.log('✅ PriceContext: Price caps loaded');
      } else {
        console.error('❌ PriceContext: Failed to load price caps:', priceCapsResponse);
      }

    } catch (error) {
      console.error('💥 PriceContext: Error refreshing prices:', error);
      toast({
        title: "Error",
        description: "Failed to load current prices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setPricesLoading(false);
      setOmcPricesLoading(false);
      setPriceCapsLoading(false);
    }
  };

  const getCurrentPrice = (productId: string, stationId?: string): number | null => {
    if (stationId) {
      return getStationPrice(stationId, productId);
    }
    return currentPrices.get(productId) || null;
  };

  const getStationPrice = (stationId: string, productId: string): number | null => {
    const station = stationPrices.get(stationId);
    return station?.get(productId) || null;
  };

  const getStationAllPrices = (stationId: string) => {
    const station = stationPrices.get(stationId);
    if (!station) return [];
    
    return Array.from(station.entries()).map(([productId, sellingPrice]) => {
      const priceInfo = allStationPrices.find(p => 
        p.station_id === stationId && p.product_id === productId
      );
      return {
        product_id: productId,
        selling_price: sellingPrice,
        product_name: priceInfo?.product_name || 'Unknown Product'
      };
    });
  };

  // Initial load - only once
  useEffect(() => {
    if (initializedRef.current) return;
    
    initializedRef.current = true;
    console.log('🚀 PriceContext: Initializing...');
    
    refreshPrices();
    
    // Refresh prices every 10 minutes (reduced from 5)
    refreshTimeoutRef.current = setInterval(refreshPrices, 10 * 60 * 1000);

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Real-time subscription for price changes - only subscribe after initial load
  useEffect(() => {
    if (loading) return; // Don't subscribe until initial load is complete

    console.log('📡 PriceContext: Setting up real-time subscription');
    
    const subscription = supabase
      .channel('price-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'station_prices'
        },
        (payload) => {
          console.log('🔄 PriceContext: New price detected, refreshing...');
          refreshPrices();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'station_prices'
        },
        (payload) => {
          console.log('🔄 PriceContext: Price update detected, refreshing...');
          refreshPrices();
        }
      )
      .subscribe();

    return () => {
      console.log('📡 PriceContext: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [loading]); // Only re-subscribe when loading state changes

  const value: PriceContextType = {
    allStationPrices,
    currentPrices,
    stationPrices,
    loading,
    refreshPrices,
    getCurrentPrice,
    getStationPrice,
    getStationAllPrices,
    omcPrices,
    priceCaps,
    pricesLoading,
    omcPricesLoading,
    priceCapsLoading
  };

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
};

export const usePrices = () => {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePrices must be used within a PriceProvider');
  }
  return context;
};

export { PriceContext };