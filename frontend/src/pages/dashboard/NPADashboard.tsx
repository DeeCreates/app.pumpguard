import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

const complianceData = [
  { region: "Greater Accra", compliant: 85, nonCompliant: 15 },
  { region: "Ashanti", compliant: 78, nonCompliant: 22 },
  { region: "Western", compliant: 92, nonCompliant: 8 },
  { region: "Eastern", compliant: 81, nonCompliant: 19 },
];

export default function NPADashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NPA Compliance Dashboard</h1>
          <p className="text-gray-600">National Petroleum Authority Monitoring</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Shield className="w-4 h-4 mr-2" />
          Set Price Caps
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stations</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliant Stations</p>
                <p className="text-2xl font-bold">1,089</p>
                <p className="text-sm text-green-600">87.3%</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Violations</p>
                <p className="text-2xl font-bold">158</p>
                <p className="text-sm text-red-600">12.7%</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fines Collected</p>
                <p className="text-2xl font-bold">₵284,500</p>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                This Month
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Compliance Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="compliant" fill="#10b981" name="Compliant Stations" />
                <Bar dataKey="nonCompliant" fill="#ef4444" name="Non-Compliant Stations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Violations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { station: "Shell Spintex", omc: "Shell", product: "PMS", price: 13.50, cap: 12.80, fine: 2500 },
              { station: "Total East Legon", omc: "Total", product: "Diesel", price: 14.20, cap: 13.50, fine: 3200 },
              { station: "GOIL Madina", omc: "GOIL", product: "PMS", price: 13.10, cap: 12.80, fine: 1200 },
            ].map((violation, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="font-semibold">{violation.station}</p>
                    <p className="text-sm text-gray-600">{violation.omc} • {violation.product}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">₵{violation.price}/L</p>
                  <p className="text-sm text-gray-600">Cap: ₵{violation.cap}/L</p>
                  <Badge variant="destructive">Fine: ₵{violation.fine}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}