import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, FileText, BarChart3, CheckCircle, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const dailyReports = [
  {
    date: "2024-01-15",
    station: "Shell Spintex",
    totalSales: 45280,
    fuelSold: 3450,
    cashCollected: 44850,
    variance: -430,
    status: "approved",
    submittedBy: "Kwame A."
  },
  {
    date: "2024-01-14",
    station: "Shell Spintex", 
    totalSales: 41890,
    fuelSold: 3210,
    cashCollected: 41890,
    variance: 0,
    status: "approved",
    submittedBy: "Ama S."
  },
  {
    date: "2024-01-13",
    station: "Shell Spintex",
    totalSales: 39250,
    fuelSold: 2980,
    cashCollected: 38920,
    variance: -330,
    status: "pending",
    submittedBy: "Kofi M."
  }
];

export default function DailyReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Reports</h1>
          <p className="text-gray-600">Manage and review daily station reports</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Daily Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportDate">Report Date</Label>
              <Input id="reportDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station">Station</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shell-spintex">Shell Spintex</SelectItem>
                  <SelectItem value="total-east-lego">Total East Legon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift">Shift</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">24</p>
            <p className="text-sm text-gray-600">Reports This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">22</p>
            <p className="text-sm text-gray-600">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">2</p>
            <p className="text-sm text-gray-600">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">₵1.2M</p>
            <p className="text-sm text-gray-600">Total Sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Daily Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Fuel Sold (L)</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Cash Collected</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyReports.map((report, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{report.date}</TableCell>
                  <TableCell>{report.station}</TableCell>
                  <TableCell>{report.fuelSold.toLocaleString()}L</TableCell>
                  <TableCell>₵{report.totalSales.toLocaleString()}</TableCell>
                  <TableCell>₵{report.cashCollected.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={report.variance < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                      ₵{Math.abs(report.variance)}
                      {report.variance < 0 ? " Short" : " Over"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={report.status === 'approved' ? 'default' : 'secondary'}
                      className={report.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { metric: "Total Sales", value: "₵1,245,800", change: "+12.5%" },
                { metric: "Fuel Volume", value: "95,420 L", change: "+8.3%" },
                { metric: "Average Daily Sales", value: "₵41,527", change: "+5.2%" },
                { metric: "Variance Rate", value: "0.8%", change: "-0.3%" },
              ].map((stat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{stat.metric}</span>
                  <div className="text-right">
                    <p className="font-semibold">{stat.value}</p>
                    <p className="text-sm text-green-600">{stat.change}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { status: "Submitted", count: 24, color: "bg-blue-500" },
                { status: "Approved", count: 22, color: "bg-green-500" },
                { status: "Pending Review", count: 2, color: "bg-yellow-500" },
                { status: "Rejected", count: 0, color: "bg-red-500" },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span>{item.status}</span>
                  </div>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}