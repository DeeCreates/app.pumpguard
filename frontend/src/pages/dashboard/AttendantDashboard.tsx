import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Fuel, CreditCard, Users, CheckCircle } from "lucide-react";

export default function AttendantDashboard() {
  const currentShift = {
    name: "Morning Shift",
    startTime: "06:00",
    endTime: "14:00",
    progress: 65,
    sales: 12540,
    transactions: 89,
    averageSale: 141
  };

  const pumpStatus = [
    { number: 1, product: "PMS", status: "active", sales: 4200 },
    { number: 2, product: "PMS", status: "active", sales: 3850 },
    { number: 3, product: "Diesel", status: "active", sales: 3150 },
    { number: 4, product: "Diesel", status: "maintenance", sales: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shift Dashboard</h1>
          <p className="text-gray-600">Welcome back, Kwame! Current shift overview</p>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-500" />
          <span className="font-medium">10:24 AM</span>
          <Badge variant="secondary">Live</Badge>
        </div>
      </div>

      {/* Current Shift Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{currentShift.name}</h3>
              <p className="text-gray-600">
                {currentShift.startTime} - {currentShift.endTime} • {currentShift.progress}% complete
              </p>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-4 h-4 mr-1" />
              Active
            </Badge>
          </div>
          <Progress value={currentShift.progress} className="h-2 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold">₵{currentShift.sales.toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-600">Total Sales</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold">{currentShift.transactions}</span>
              </div>
              <p className="text-sm text-gray-600">Transactions</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <Fuel className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold">₵{currentShift.averageSale}</span>
              </div>
              <p className="text-sm text-gray-600">Average Sale</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pump Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pump Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pumpStatus.map((pump) => (
              <div key={pump.number} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    pump.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="font-medium">Pump {pump.number}</p>
                    <p className="text-sm text-gray-600">{pump.product}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₵{pump.sales.toLocaleString()}</p>
                  <Badge 
                    variant={pump.status === 'active' ? 'default' : 'secondary'}
                    className={pump.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {pump.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
              <Fuel className="w-4 h-4 mr-2" />
              New Sale
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Clock className="w-4 h-4 mr-2" />
              Shift Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <CreditCard className="w-4 h-4 mr-2" />
              Cash Reconciliation
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Customer Lookup
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: "10:15", pump: 1, product: "PMS", amount: 250, method: "Cash" },
              { time: "10:12", pump: 2, product: "PMS", amount: 180, method: "Mobile Money" },
              { time: "10:08", pump: 3, product: "Diesel", amount: 320, method: "Card" },
              { time: "10:05", pump: 1, product: "PMS", amount: 150, method: "Cash" },
            ].map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{transaction.time} • Pump {transaction.pump}</p>
                  <p className="text-sm text-gray-600">{transaction.product} • {transaction.method}</p>
                </div>
                <p className="font-semibold">₵{transaction.amount}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}