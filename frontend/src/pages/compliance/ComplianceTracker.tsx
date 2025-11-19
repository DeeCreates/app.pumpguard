import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, AlertTriangle, MapPin, Calendar, Download, Filter, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

// Types for our compliance data
interface StationCompliance {
  id: string;
  name: string;
  omc: string;
  omc_id: string;
  region: string;
  compliance_score: number;
  last_inspection: string;
  status: 'compliant' | 'warning' | 'non-compliant';
  open_violations: number;
  total_inspections: number;
  address?: string;
  city?: string;
}

interface ComplianceStats {
  overall_compliance: number;
  compliant_stations: number;
  warning_stations: number;
  non_compliant_stations: number;
  total_stations: number;
  total_violations: number;
}

interface RegionalCompliance {
  region: string;
  stations: number;
  compliant: number;
  compliance: number;
  total_violations: number;
}

interface UserContext {
  role: string;
  omc_id?: string;
  station_id?: string;
  dealer_id?: string;
}

export default function ComplianceTracker() {
  const [stations, setStations] = useState<StationCompliance[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [regionalData, setRegionalData] = useState<RegionalCompliance[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedOMC, setSelectedOMC] = useState<string>("all");
  const [complianceStatus, setComplianceStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30days");

  // Available filters data
  const [regions, setRegions] = useState<string[]>([]);
  const [omcs, setOmcs] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (userContext) {
      loadComplianceData();
    }
  }, [selectedRegion, selectedOMC, complianceStatus, dateRange, userContext]);

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Get user context first
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

      // Load available filters
      await loadFilterOptions();
      
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      // Load regions from stations
      const stationsResponse = await api.getAllStations();
      if (stationsResponse.success && stationsResponse.data) {
        const uniqueRegions = [...new Set(stationsResponse.data
          .filter((station: any) => station.region)
          .map((station: any) => station.region))] as string[];
        setRegions(uniqueRegions.sort());
      }

      // Load OMCs based on user role
      if (!userContext || userContext.role === 'admin' || userContext.role === 'supervisor') {
        const omcsResponse = await api.getOMCs();
        if (omcsResponse.success && omcsResponse.data) {
          setOmcs(omcsResponse.data);
        }
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadComplianceData = async () => {
    try {
      setRefreshing(true);
      
      // Get compliance violations data
      const violationsResponse = await api.getComplianceViolations();
      
      // Get stations data based on user role
      let stationsResponse;
      if (userContext?.role === 'omc' && userContext.omc_id) {
        stationsResponse = await api.getStationsByOMC(userContext.omc_id);
      } else if (userContext?.role === 'station_manager' && userContext.station_id) {
        // For station managers, only show their station
        const allStations = await api.getAllStations();
        if (allStations.success) {
          stationsResponse = {
            success: true,
            data: allStations.data?.filter((station: any) => station.id === userContext.station_id) || []
          };
        }
      } else {
        stationsResponse = await api.getAllStations();
      }

      if (violationsResponse.success && stationsResponse.success) {
        await processComplianceData(violationsResponse.data, stationsResponse.data);
      }
      
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const processComplianceData = async (violations: any[], allStations: any[]) => {
    try {
      // Calculate compliance for each station
      const stationComplianceData: StationCompliance[] = [];
      const regionalStats: { [key: string]: RegionalCompliance } = {};

      for (const station of allStations) {
        // Filter violations for this station
        const stationViolations = violations.filter(v => v.station_id === station.id);
        const openViolations = stationViolations.filter(v => v.status === 'open').length;
        
        // Calculate compliance score (0-100)
        const totalInspections = stationViolations.length > 0 ? 
          Math.max(stationViolations.length, 1) : 1;
        const complianceScore = Math.max(0, 100 - (openViolations * 10));
        
        // Determine status
        let status: 'compliant' | 'warning' | 'non-compliant' = 'compliant';
        if (openViolations >= 3) status = 'non-compliant';
        else if (openViolations >= 1) status = 'warning';

        // Get last inspection date
        const lastInspection = stationViolations.length > 0 ? 
          new Date(Math.max(...stationViolations.map((v: any) => new Date(v.created_at).getTime()))).toISOString().split('T')[0] :
          'No inspections';

        const complianceData: StationCompliance = {
          id: station.id,
          name: station.name,
          omc: station.omcs?.name || 'Unknown OMC',
          omc_id: station.omc_id,
          region: station.region || 'Unknown Region',
          compliance_score: complianceScore,
          last_inspection: lastInspection,
          status,
          open_violations: openViolations,
          total_inspections: stationViolations.length,
          address: station.address,
          city: station.city
        };

        stationComplianceData.push(complianceData);

        // Aggregate regional data
        if (!regionalStats[station.region]) {
          regionalStats[station.region] = {
            region: station.region,
            stations: 0,
            compliant: 0,
            compliance: 0,
            total_violations: 0
          };
        }

        regionalStats[station.region].stations++;
        regionalStats[station.region].total_violations += openViolations;
        if (status === 'compliant') {
          regionalStats[station.region].compliant++;
        }
      }

      // Calculate regional compliance percentages
      const regionalData = Object.values(regionalStats).map(region => ({
        ...region,
        compliance: region.stations > 0 ? Math.round((region.compliant / region.stations) * 100) : 0
      }));

      // Calculate overall stats
      const totalStations = stationComplianceData.length;
      const compliantStations = stationComplianceData.filter(s => s.status === 'compliant').length;
      const warningStations = stationComplianceData.filter(s => s.status === 'warning').length;
      const nonCompliantStations = stationComplianceData.filter(s => s.status === 'non-compliant').length;
      const overallCompliance = totalStations > 0 ? 
        Math.round(stationComplianceData.reduce((sum, station) => sum + station.compliance_score, 0) / totalStations) : 0;

      const totalViolations = stationComplianceData.reduce((sum, station) => sum + station.open_violations, 0);

      setStats({
        overall_compliance: overallCompliance,
        compliant_stations: compliantStations,
        warning_stations: warningStations,
        non_compliant_stations: nonCompliantStations,
        total_stations: totalStations,
        total_violations: totalViolations
      });

      setRegionalData(regionalData);
      
      // Apply filters
      let filteredStations = stationComplianceData;
      
      if (selectedRegion !== "all") {
        filteredStations = filteredStations.filter(station => station.region === selectedRegion);
      }
      
      if (selectedOMC !== "all") {
        filteredStations = filteredStations.filter(station => station.omc_id === selectedOMC);
      }
      
      if (complianceStatus !== "all") {
        filteredStations = filteredStations.filter(station => station.status === complianceStatus);
      }

      setStations(filteredStations);

    } catch (error) {
      console.error('Error processing compliance data:', error);
    }
  };

  const handleScheduleInspection = () => {
    // Implementation for scheduling inspections
    console.log('Schedule inspection functionality');
  };

  const handleExportData = () => {
    // Implementation for exporting compliance data
    const exportData = {
      stations,
      stats,
      regionalData,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    loadComplianceData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'non-compliant':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'non-compliant':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-500" />
          <p className="text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Tracker</h1>
          <p className="text-gray-600">
            {userContext ? `Viewing data for ${userContext.role} role` : 'Monitor station compliance nationwide'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {(userContext?.role === 'admin' || userContext?.role === 'supervisor' || userContext?.role === 'npa') && (
            <Button onClick={handleScheduleInspection}>
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Inspection
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedRegion("all");
                setSelectedOMC("all");
                setComplianceStatus("all");
                setDateRange("30days");
              }}
            >
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(userContext?.role === 'admin' || userContext?.role === 'supervisor') && (
              <Select value={selectedOMC} onValueChange={setSelectedOMC}>
                <SelectTrigger>
                  <SelectValue placeholder="All OMCs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All OMCs</SelectItem>
                  {omcs.map(omc => (
                    <SelectItem key={omc.id} value={omc.id}>{omc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={complianceStatus} onValueChange={setComplianceStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="warning">Needs Attention</SelectItem>
                <SelectItem value="non-compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Last 30 Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.overall_compliance}%</p>
              <p className="text-sm text-gray-600">Overall Compliance</p>
              <p className="text-xs text-gray-500 mt-1">{stats.total_stations} stations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 font-bold text-sm">{stats.compliant_stations}</span>
              </div>
              <p className="text-2xl font-bold">{stats.compliant_stations}</p>
              <p className="text-sm text-gray-600">Compliant Stations</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total_stations > 0 ? Math.round((stats.compliant_stations / stats.total_stations) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.warning_stations}</p>
              <p className="text-sm text-gray-600">Needs Attention</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total_violations} open violations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.non_compliant_stations}</p>
              <p className="text-sm text-gray-600">Non-Compliant</p>
              <p className="text-xs text-gray-500 mt-1">Requires immediate action</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stations Compliance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Station Compliance Details</CardTitle>
          <Badge variant="outline" className="ml-2">
            {stations.length} stations
          </Badge>
        </CardHeader>
        <CardContent>
          {stations.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No stations found matching your filters</p>
              <Button variant="outline" className="mt-2" onClick={() => {
                setSelectedRegion("all");
                setSelectedOMC("all");
                setComplianceStatus("all");
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
                    <TableHead>Region</TableHead>
                    <TableHead>Compliance Score</TableHead>
                    <TableHead>Last Inspection</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations.map((station) => (
                    <TableRow key={station.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{station.name}</p>
                          <p className="text-sm text-gray-600">{station.omc}</p>
                          {station.city && (
                            <p className="text-xs text-gray-500">{station.city}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                          {station.region}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Progress value={station.compliance_score} className="h-2" />
                          <span className="text-sm font-medium">{station.compliance_score}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-gray-500" />
                          {station.last_inspection}
                        </div>
                      </TableCell>
                      <TableCell>
                        {station.open_violations > 0 ? (
                          <Badge variant="destructive">
                            {station.open_violations} open
                          </Badge>
                        ) : (
                          <Badge variant="secondary">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(station.status)}
                          <Badge variant="outline" className={getStatusColor(station.status)}>
                            {station.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          {(userContext?.role === 'admin' || userContext?.role === 'supervisor' || userContext?.role === 'npa') && (
                            <Button variant="outline" size="sm">
                              Log Inspection
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

      {/* Regional Breakdown */}
      {regionalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionalData.map((region, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{region.region}</span>
                      <span className="text-sm text-gray-600">
                        {region.compliant}/{region.stations} compliant • {region.total_violations} violations
                      </span>
                    </div>
                    <Progress value={region.compliance} className="h-2" />
                  </div>
                  <Badge variant="outline" className="ml-4">
                    {region.compliance}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}