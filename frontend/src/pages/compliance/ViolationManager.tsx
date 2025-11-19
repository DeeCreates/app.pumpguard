import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Eye, MessageCircle, RefreshCw, AlertTriangle, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

// Types for violation data
interface Violation {
  id: string;
  station_id: string;
  station_name: string;
  omc_id: string;
  omc_name: string;
  product_id: string;
  product_name: string;
  actual_price: number;
  price_cap: number;
  litres_sold: number;
  fine_amount: number;
  status: 'open' | 'appealed' | 'resolved' | 'under_review' | 'cancelled';
  violation_date: string;
  created_at: string;
  resolved_at?: string;
  appeal_reason?: string;
  resolved_by?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface UserContext {
  role: string;
  omc_id?: string;
  station_id?: string;
  dealer_id?: string;
}

interface ViolationStats {
  total_violations: number;
  open_cases: number;
  appealed_cases: number;
  resolved_cases: number;
  total_fines: number;
  collected_fines: number;
}

export default function ViolationManager() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filteredViolations, setFilteredViolations] = useState<Violation[]>([]);
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [omcFilter, setOmcFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30days");

  // Available filters data
  const [omcs, setOmcs] = useState<{id: string, name: string}[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [violations, searchTerm, statusFilter, omcFilter, severityFilter]);

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Get user context
      const profileResponse = await api.getCurrentUserProfile();
      if (profileResponse.success && profileResponse.data) {
        const userData = profileResponse.data;
        setUserContext({
          role: userData.role,
          omc_id: userData.omc_id,
          station_id: userData.station_id,
          dealer_id: userData.dealer_id
        });
      }

      await Promise.all([
        loadViolations(),
        loadOMCs()
      ]);
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast({
        title: "Error",
        description: "Failed to load violation data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadViolations = async () => {
    try {
      // Get compliance violations which include price cap violations
      const response = await api.getComplianceViolations();
      if (response.success && response.data) {
        // Transform the data to match our Violation interface
        const violationData = response.data.map((item: any) => ({
          id: item.id,
          station_id: item.station_id,
          station_name: item.stations?.name || 'Unknown Station',
          omc_id: item.stations?.omc_id || 'unknown',
          omc_name: item.stations?.omcs?.name || 'Unknown OMC',
          product_id: item.product_id || 'unknown',
          product_name: item.products?.name || 'Unknown Product',
          actual_price: item.actual_price || 0,
          price_cap: item.price_cap || 0,
          litres_sold: item.litres_sold || 0,
          fine_amount: item.fine_amount || 0,
          status: item.status || 'open',
          violation_date: item.violation_date || item.created_at,
          created_at: item.created_at,
          resolved_at: item.resolved_at,
          appeal_reason: item.appeal_reason,
          resolved_by: item.resolved_by,
          severity: calculateSeverity(item.actual_price, item.price_cap, item.litres_sold)
        }));

        setViolations(violationData);
        calculateStats(violationData);
      }
    } catch (error) {
      console.error('Error loading violations:', error);
      throw error;
    }
  };

  const loadOMCs = async () => {
    try {
      // Only load OMCs for admin/supervisor roles or if user has permission to see all
      if (!userContext || userContext.role === 'admin' || userContext.role === 'supervisor' || userContext.role === 'npa') {
        const response = await api.getOMCs();
        if (response.success && response.data) {
          setOmcs(response.data);
        }
      }
    } catch (error) {
      console.error('Error loading OMCs:', error);
    }
  };

  const calculateSeverity = (actualPrice: number, priceCap: number, litresSold: number): 'low' | 'medium' | 'high' | 'critical' => {
    const priceDifference = actualPrice - priceCap;
    const percentageOver = (priceDifference / priceCap) * 100;
    const totalOvercharge = priceDifference * litresSold;

    if (percentageOver > 20 || totalOvercharge > 5000) return 'critical';
    if (percentageOver > 15 || totalOvercharge > 2000) return 'high';
    if (percentageOver > 10 || totalOvercharge > 1000) return 'medium';
    return 'low';
  };

  const calculateStats = (violationData: Violation[]) => {
    const totalViolations = violationData.length;
    const openCases = violationData.filter(v => v.status === 'open').length;
    const appealedCases = violationData.filter(v => v.status === 'appealed').length;
    const resolvedCases = violationData.filter(v => v.status === 'resolved').length;
    const totalFines = violationData.reduce((sum, v) => sum + v.fine_amount, 0);
    const collectedFines = violationData
      .filter(v => v.status === 'resolved')
      .reduce((sum, v) => sum + v.fine_amount, 0);

    setStats({
      total_violations: totalViolations,
      open_cases: openCases,
      appealed_cases: appealedCases,
      resolved_cases: resolvedCases,
      total_fines: totalFines,
      collected_fines: collectedFines
    });
  };

  const applyFilters = () => {
    let filtered = violations;

    // Apply role-based filtering
    if (userContext?.role === 'omc' && userContext.omc_id) {
      filtered = filtered.filter(v => v.omc_id === userContext.omc_id);
    } else if (userContext?.role === 'station_manager' && userContext.station_id) {
      filtered = filtered.filter(v => v.station_id === userContext.station_id);
    } else if (userContext?.role === 'dealer') {
      // For dealers, we'd need to get their stations first
      // This is a simplified version - you might need additional API calls
      filtered = filtered.filter(v => v.station_id === userContext.station_id);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.station_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.omc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Apply OMC filter (only for admin/supervisor/npa)
    if (omcFilter !== "all" && (userContext?.role === 'admin' || userContext?.role === 'supervisor' || userContext?.role === 'npa')) {
      filtered = filtered.filter(v => v.omc_id === omcFilter);
    }

    // Apply severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter(v => v.severity === severityFilter);
    }

    // Apply date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(v => new Date(v.violation_date) >= startDate);
    }

    setFilteredViolations(filtered);
  };

  const handleExport = () => {
    const exportData = {
      violations: filteredViolations,
      stats,
      exportedAt: new Date().toISOString(),
      filters: {
        searchTerm,
        statusFilter,
        omcFilter,
        severityFilter,
        dateRange
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `violations-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredViolations.length} violations`,
    });
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadViolations();
      toast({
        title: "Data Refreshed",
        description: "Violation data has been updated",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh violation data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewDetails = (violation: Violation) => {
    // Implementation for viewing violation details
    console.log('View violation details:', violation.id);
    toast({
      title: "Viewing Violation",
      description: `Details for ${violation.station_name}`,
    });
  };

  const handleAppeal = (violation: Violation) => {
    // Implementation for appeal process
    console.log('Appeal violation:', violation.id);
    toast({
      title: "Appeal Process",
      description: "Starting appeal process for violation",
    });
  };

  const calculateOvercharge = (violation: Violation) => {
    return (violation.actual_price - violation.price_cap) * violation.litres_sold;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'appealed': return 'secondary';
      case 'under_review': return 'default';
      case 'resolved': return 'default';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const canManageViolations = () => {
    return userContext?.role === 'admin' || userContext?.role === 'npa' || userContext?.role === 'supervisor';
  };

  const canAppealViolations = () => {
    return userContext?.role === 'omc' || userContext?.role === 'station_manager' || userContext?.role === 'dealer';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-500" />
          <p className="text-gray-600">Loading violation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Violation Management</h1>
          <p className="text-gray-600">
            {userContext ? `Monitor and resolve price cap violations (${userContext.role} view)` : 'Monitor and resolve price cap violations'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total_violations}</p>
              <p className="text-sm text-gray-600">Total Violations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.open_cases}</p>
              <p className="text-sm text-gray-600">Open Cases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.appealed_cases}</p>
              <p className="text-sm text-gray-600">Appealed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-green-600">₵{stats.total_fines.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Fines</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input 
                  placeholder="Search stations, OMCs, or products..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="appealed">Appealed</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            {(userContext?.role === 'admin' || userContext?.role === 'supervisor' || userContext?.role === 'npa') && (
              <Select value={omcFilter} onValueChange={setOmcFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="OMC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All OMCs</SelectItem>
                  {omcs.map(omc => (
                    <SelectItem key={omc.id} value={omc.id}>{omc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setOmcFilter("all");
              setSeverityFilter("all");
              setDateRange("30days");
            }}>
              <Filter className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Violations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Price Cap Violations</CardTitle>
          <Badge variant="outline">
            {filteredViolations.length} violations found
          </Badge>
        </CardHeader>
        <CardContent>
          {filteredViolations.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No violations found matching your filters</p>
              <Button variant="outline" className="mt-2" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setOmcFilter("all");
                setSeverityFilter("all");
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Price/Cap</TableHead>
                    <TableHead>Overcharge</TableHead>
                    <TableHead>Fine Amount</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredViolations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{violation.station_name}</p>
                          <p className="text-sm text-gray-600">{violation.omc_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{violation.product_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-red-600 font-medium">₵{violation.actual_price.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Cap: ₵{violation.price_cap.toFixed(2)}</p>
                          <p className="text-xs text-red-500">
                            +{((violation.actual_price - violation.price_cap) / violation.price_cap * 100).toFixed(1)}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calculator className="w-3 h-3 text-orange-500" />
                          <span className="font-medium text-orange-600">
                            ₵{calculateOvercharge(violation).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₵{violation.fine_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityVariant(violation.severity)}>
                          {violation.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(violation.status)}>
                          {violation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(violation.violation_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(violation)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(violation.status === 'open' && canAppealViolations()) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAppeal(violation)}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}