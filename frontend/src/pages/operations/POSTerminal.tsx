import React, { useState, useEffect, lazy, Suspense } from 'react';
import { api } from '../../utils/supabase-client';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { CreditCard, DollarSign, Smartphone, Wallet, Fuel, Wifi, WifiOff, Receipt, Check, RefreshCw, Zap, User, QrCode } from 'lucide-react';
import { offlineSync } from '../../utils/offline-sync';

// Lazy loaded components for better performance
const LazyQRCode = lazy(() => import('./LazyQRCode'));

type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'credit';

interface Transaction {
  id: string;
  station_id: string;
  pump_number: number;
  attendant_id: string;
  volume_sold: number;
  price_per_liter: number;
  total_amount: number;
  payment_method: PaymentMethod;
  customer_name: string;
  timestamp: string;
  sync_status?: 'pending' | 'synced';
}

export function POSTerminal() {
  const { user } = useAuth();
  const [pumpNumber, setPumpNumber] = useState<number>(1);
  const [volume, setVolume] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('15.50');
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    offlineSync.init();
    loadRecentTransactions();
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (volume && pricePerLiter) {
      const total = parseFloat(volume) * parseFloat(pricePerLiter);
      setTotalAmount(isNaN(total) ? 0 : total);
    } else {
      setTotalAmount(0);
    }
  }, [volume, pricePerLiter]);

  const loadRecentTransactions = async () => {
    if (!user?.station_id) return;
    
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      const mockTransactions: Transaction[] = [
        {
          id: 'txn_1',
          station_id: user.station_id,
          pump_number: 2,
          attendant_id: user.id,
          volume_sold: 25.5,
          price_per_liter: 15.50,
          total_amount: 395.25,
          payment_method: 'cash',
          customer_name: 'Walk-in',
          timestamp: new Date(Date.now() - 300000).toISOString(),
        },
        {
          id: 'txn_2',
          station_id: user.station_id,
          pump_number: 1,
          attendant_id: user.id,
          volume_sold: 32.0,
          price_per_liter: 15.50,
          total_amount: 496.00,
          payment_method: 'mobile_money',
          customer_name: 'John Mensah',
          timestamp: new Date(Date.now() - 600000).toISOString(),
        },
        {
          id: 'txn_3',
          station_id: user.station_id,
          pump_number: 3,
          attendant_id: user.id,
          volume_sold: 18.75,
          price_per_liter: 15.50,
          total_amount: 290.63,
          payment_method: 'card',
          customer_name: 'Corporate Account',
          timestamp: new Date(Date.now() - 900000).toISOString(),
        },
      ];
      
      setRecentTransactions(mockTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePendingCount = async () => {
    const count = await offlineSync.getPendingCount();
    setPendingSyncCount(count);
  };

  const syncOfflineData = async () => {
    try {
      const result = await offlineSync.syncAll();
      console.log('Sync complete:', result);
      await offlineSync.clearSynced();
      updatePendingCount();
      loadRecentTransactions();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleProcessTransaction = async () => {
    if (!user?.station_id || !volume || !pricePerLiter) return;

    const transactionData: Omit<Transaction, 'id' | 'timestamp'> = {
      station_id: user.station_id,
      pump_number: pumpNumber,
      attendant_id: user.id,
      volume_sold: parseFloat(volume),
      price_per_liter: parseFloat(pricePerLiter),
      total_amount: totalAmount,
      payment_method: paymentMethod,
      customer_name: customerName || 'Walk-in Customer'
    };

    try {
      let result: Transaction;
      if (isOnline) {
        // In production, this would be an API call
        result = {
          ...transactionData,
          id: `txn_${Date.now()}`,
          timestamp: new Date().toISOString()
        };
      } else {
        const txnId = await offlineSync.addPendingTransaction('transaction', transactionData);
        result = {
          ...transactionData,
          id: txnId,
          timestamp: new Date().toISOString(),
          sync_status: 'pending'
        };
        updatePendingCount();
      }

      setLastTransaction(result);
      setShowReceipt(true);
      
      // Add to recent transactions
      setRecentTransactions(prev => [result, ...prev.slice(0, 4)]);
      
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Transaction failed. Please try again.');
    }
  };

  const handleQuickAmount = (amount: number) => {
    const liters = amount / parseFloat(pricePerLiter);
    setVolume(liters.toFixed(2));
  };

  const handleVolumeChange = (value: string) => {
    // Allow only numbers and decimal point
    const validatedValue = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = validatedValue.split('.');
    if (parts.length > 2) return;
    
    setVolume(validatedValue);
  };

  // Loading skeletons
  const PumpSkeleton = () => (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="p-4 bg-gray-100 rounded-2xl animate-pulse">
          <div className="w-6 h-6 bg-gray-300 rounded-full mx-auto mb-2" />
          <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto" />
        </div>
      ))}
    </div>
  );

  const TransactionSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 bg-gray-50 rounded-xl space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );

  if (showReceipt && lastTransaction) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0B2265' }}>
        <Card className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl">
          <CardContent className="p-0">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl text-black mb-2">Transaction Complete</h2>
              <p className="text-gray-600">Receipt generated successfully</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-2">
                  <Fuel className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-gray-600 font-semibold">PumpGuard Technologies</p>
                <p className="text-xs text-gray-500">Official Receipt</p>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pump #</span>
                  <span className="text-black font-semibold">{lastTransaction.pump_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Volume</span>
                  <span className="text-black font-semibold">{lastTransaction.volume_sold} Liters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price/L</span>
                  <span className="text-black font-semibold">₵{lastTransaction.price_per_liter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment</span>
                  <span className="text-black font-semibold capitalize">
                    {lastTransaction.payment_method.replace('_', ' ')}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between">
                  <span className="text-black font-bold">Total</span>
                  <span className="text-2xl text-black font-bold">₵{lastTransaction.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <Suspense fallback={<div className="w-32 h-32 mx-auto bg-gray-200 animate-pulse rounded" />}>
                <LazyQRCode 
                  data={`PUMPGUARD-TXN-${lastTransaction.id}-${Date.now()}`}
                  className="w-32 h-32 mx-auto"
                />
              </Suspense>

              <div className="text-center mt-4 text-xs text-gray-500 space-y-1">
                <p>{new Date(lastTransaction.timestamp).toLocaleString()}</p>
                <p>Attendant: {user?.name}</p>
                <p>Station: {user?.station_id}</p>
                {lastTransaction.sync_status === 'pending' && (
                  <p className="mt-2 text-orange-600 font-medium">
                    ⚠️ Offline - Will sync when online
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={() => setShowReceipt(false)}
              className="w-full h-12 text-lg"
              style={{ backgroundColor: '#0B2265' }}
            >
              <Zap className="w-5 h-5 mr-2" />
              New Transaction
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: '#0B2265' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-white">
            <h1 className="text-3xl md:text-4xl mb-1 font-bold">POS Terminal</h1>
            <p className="text-blue-200">Pump Attendant: {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${
              isOnline ? 'bg-green-500' : 'bg-orange-500'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">Offline Mode</span>
                </>
              )}
              {pendingSyncCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-white rounded-lg text-xs text-orange-600">
                  {pendingSyncCount} pending
                </span>
              )}
            </div>
            
            {pendingSyncCount > 0 && isOnline && (
              <Button 
                onClick={syncOfflineData}
                variant="outline" 
                size="sm"
                className="bg-white text-blue-600 border-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Transaction Panel */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Pump Selector */}
            <Card className="p-4 md:p-6 bg-white rounded-3xl shadow-xl border-0">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg text-black">Select Pump</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <PumpSkeleton />
                ) : (
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <button
                        key={num}
                        onClick={() => setPumpNumber(num)}
                        className={`p-3 md:p-4 rounded-2xl transition-all duration-200 ${
                          pumpNumber === num
                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Fuel className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2" />
                        <p className="text-sm font-medium">Pump {num}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction Form */}
            <Card className="p-4 md:p-6 bg-white rounded-3xl shadow-xl border-0">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg text-black">Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4 md:space-y-6">
                {/* Volume Input */}
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Volume (Liters)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={volume}
                    onChange={(e) => handleVolumeChange(e.target.value)}
                    placeholder="0.00"
                    className="text-2xl h-14 md:h-16 text-center font-semibold"
                  />
                </div>

                {/* Price Input */}
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Price per Liter (₵)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(e.target.value)}
                    className="text-2xl h-14 md:h-16 text-center font-semibold"
                  />
                </div>

                {/* Customer Name */}
                <div>
                  <label className="text-sm text-gray-600 mb-2 block flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Name (Optional)
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in customer"
                    className="h-12"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Quick Amount</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[20, 50, 100, 200].map((amount) => (
                      <Button
                        key={amount}
                        onClick={() => handleQuickAmount(amount)}
                        variant="outline"
                        className="h-10 md:h-12 text-sm font-medium"
                      >
                        ₵{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Total Display */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-4 md:p-6 text-center">
                  <p className="text-blue-200 mb-2 text-sm">Total Amount</p>
                  <p className="text-4xl md:text-5xl text-white font-bold">₵{totalAmount.toFixed(2)}</p>
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="text-sm text-gray-600 mb-3 block">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3 md:p-4 rounded-2xl flex flex-col items-center gap-1 md:gap-2 transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
                      <span className="text-sm font-medium">Cash</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('mobile_money')}
                      className={`p-3 md:p-4 rounded-2xl flex flex-col items-center gap-1 md:gap-2 transition-all ${
                        paymentMethod === 'mobile_money'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 md:w-6 md:h-6" />
                      <span className="text-sm font-medium">Mobile Money</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 md:p-4 rounded-2xl flex flex-col items-center gap-1 md:gap-2 transition-all ${
                        paymentMethod === 'card'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 md:w-6 md:h-6" />
                      <span className="text-sm font-medium">Card</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('credit')}
                      className={`p-3 md:p-4 rounded-2xl flex flex-col items-center gap-1 md:gap-2 transition-all ${
                        paymentMethod === 'credit'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Wallet className="w-5 h-5 md:w-6 md:h-6" />
                      <span className="text-sm font-medium">Credit</span>
                    </button>
                  </div>
                </div>

                {/* Process Button */}
                <Button
                  onClick={handleProcessTransaction}
                  disabled={!volume || !pricePerLiter || totalAmount === 0}
                  className="w-full h-14 md:h-16 text-lg font-semibold"
                  style={{ backgroundColor: '#0B2265' }}
                >
                  <Receipt className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                  Process Transaction
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 md:p-6 bg-white rounded-3xl shadow-xl border-0 h-full">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg text-black flex items-center justify-between">
                  <span>Recent Transactions</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadRecentTransactions}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <TransactionSkeleton />
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {recentTransactions.map((txn) => (
                      <div key={txn.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Fuel className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-black">Pump {txn.pump_number}</span>
                          </div>
                          <span className="text-sm font-bold text-black">₵{txn.total_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{txn.volume_sold}L • {txn.payment_method}</span>
                          <span>{new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {txn.customer_name !== 'Walk-in Customer' && (
                          <div className="text-xs text-gray-600 mt-1">
                            👤 {txn.customer_name}
                          </div>
                        )}
                      </div>
                    ))}
                    {recentTransactions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No recent transactions</p>
                        <p className="text-xs mt-1">Completed transactions will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default POSTerminal;

