import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Calendar, Download, Filter, TrendingUp, DollarSign, Fuel, Users } from "lucide-react";
import { api } from "../../lib/api";

interface SalesReport {
  id: string;
  created_at: string;
  station_id: string;
  product_id: string;
  volume: number;
  amount: number;
  attendant_id?: string;
  shift?: string;
  stations?: {
    name: string;
    omcs?: {
      name: string;
    };
  };
  products?: {
    name: string;
  };
  profiles?: {
    name: string;
  };
}

interface Station {
  id: string;
  name: string;
  omc_id: string;
  omcs?: {
    name: string;
  };
}

interface OMC {
  id: string;
  name: string;
}

export function SalesReports() {
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [omcs, setOmcs] = useState<OMC[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("today");
  const [stationFilter, setStationFilter] = useState("all");
  const [omcFilter, setOmcFilter] = useState("all");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadSalesReports();
  }, [dateRange, stationFilter, omcFilter]);

  const loadInitialData = async () => {
    try {
      // Load stations and OMCs for filters
      const [stationsResponse, omcsResponse] = await Promise.all([
        api.getAllStations(),
        api.getOMCs()
      ]);

      if (stationsResponse.success) {
        setStations(stationsResponse.data || []);
      }

      if (omcsResponse.success) {
        setOmcs(omcsResponse.data || []);
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  };

  const loadSalesReports = async () => {
    setLoading(true);
    try {
      const filters: {
        dateRange?: string;
        stationFilter?: string;
        omcFilter?: string;
      } = {};

      if (dateRange !== "all") {
        filters.dateRange = dateRange;
      }

      if (stationFilter !== "all") {
        filters.stationFilter = stationFilter;
      }

      if (omcFilter !== "all") {
        filters.omcFilter = omcFilter;
      }

      const response = await api.getSalesReports(filters);
      
      if (response.success) {
        setReports(response.data || []);
      } else {
        console.error("Failed to load sales reports:", response.error);
        setReports([]);
      }
    } catch (error) {
      console.error("Failed to load sales reports:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredReports = () => {
    let filtered = reports;

    // Apply station filter
    if (stationFilter !== "all") {
      filtered = filtered.filter(report => report.station_id === stationFilter);
    }

    // Apply OMC filter
    if (omcFilter !== "all") {
      filtered = filtered.filter(report => {
        const station = stations.find(s => s.id === report.station_id);
        return station?.omc_id === omcFilter;
      });
    }

    return filtered;
  };

  const filteredReports = getFilteredReports();

  const totalSales = filteredReports.reduce((sum, report) => sum + (report.amount || 0), 0);
  const totalVolume = filteredReports.reduce((sum, report) => sum + (report.volume || 0), 0);
  const totalTransactions = filteredReports.length;

  const getShiftBadgeVariant = (shift: string) => {
    const variants: { [key: string]: "default" | "secondary" | "outline" } = {
      morning: "default",
      evening: "secondary",
      night: "outline"
    };
    return variants[shift] || "default";
  };

  const getProductBadgeVariant = (product: string) => {
    const variants: { [key: string]: "default" | "secondary" | "outline" } = {
      Petrol: "default",
      Diesel: "secondary",
      Gas: "outline"
    };
    return variants[product] || "default";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Station', 'OMC', 'Product', 'Volume (L)', 'Amount', 'Attendant', 'Shift'];
    const csvData = filteredReports.map(report => [
      new Date(report.created_at).toLocaleString(),
      report.stations?.name || 'N/A',
      report.stations?.omcs?.name || 'N/A',
      report.products?.name || 'N/A',
      report.volume,
      report.amount,
      report.profiles?.name || 'N/A',
      report.shift || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sales reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales Reports</h1>
            <p className="text-gray-600">Track and analyze sales performance</p>
          </div>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
                  <p className="text-sm text-green-600">Real-time data</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Volume</p>
                  <p className="text-2xl font-bold text-gray-900">{totalVolume.toFixed(1)}L</p>
                  <p className="text-sm text-green-600">Real-time data</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
                  <p className="text-sm text-green-600">Real-time data</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={omcFilter} onValueChange={setOmcFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by OMC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All OMCs</SelectItem>
                  {omcs.map(omc => (
                    <SelectItem key={omc.id} value={omc.id}>
                      {omc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Sales Transactions
              {filteredReports.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredReports.length} records
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sales records found for the selected filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>OMC</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Attendant</TableHead>
                    <TableHead>Shift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {new Date(report.created_at).toLocaleDateString()} {" "}
                        {new Date(report.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {report.stations?.name || 'Unknown Station'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {report.stations?.omcs?.name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getProductBadgeVariant(report.products?.name || '')}>
                          {report.products?.name || 'Unknown Product'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{report.volume}L</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(report.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {report.profiles?.name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getShiftBadgeVariant(report.shift || '')}>
                          {report.shift || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SalesReports;