import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import ConsumptionTrends from "../components/charts/ConsumptionTrends";
import CostAnalysis from "../components/charts/CostAnalysis";
import ServiceCostBreakdown from "../components/charts/ServiceCostBreakdown";
import HouseholdComparison from "../components/charts/HouseholdComparison";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface Service {
  id: string;
  name: string;
  serviceType: string;
}

interface Household {
  id: string;
  householdNumber: number;
  ownerName: string;
}

interface ConsumptionTrend {
  period: string;
  totalConsumption: number;
  avgConsumption: number;
  readingsCount: number;
}

interface CostAnalysisData {
  period: string;
  totalAmount: number;
  memberFees: number;
  utilityCosts: number;
  sharedCosts: number;
}

interface ServiceCost {
  serviceType: string;
  totalCost: number;
  avgCostPerUnit: number;
  totalConsumption: number;
}

interface HouseholdComparisonData {
  household: {
    number: number;
    owner: string;
  };
  costs: {
    total: number;
    utilities: number;
    average: number;
  };
  consumption: {
    total: number;
    average: number;
  };
}

interface DashboardData {
  overview: {
    totalHouseholds: number;
    activeServices: number;
    pendingBills: number;
    totalRevenue: number;
  };
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Reports: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");

  // Data states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consumptionTrends, setConsumptionTrends] = useState<
    ConsumptionTrend[]
  >([]);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysisData[]>([]);
  const [serviceCosts, setServiceCosts] = useState<ServiceCost[]>([]);
  const [householdComparison, setHouseholdComparison] = useState<
    HouseholdComparisonData[]
  >([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );

  // Available options
  const [services, setServices] = useState<Service[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);

  // Generate years from 2011 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2011 + 1 },
    (_, i) => 2011 + i
  ).reverse(); // Reverse to show newest years first

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/utility-services", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch {
      console.error("Error fetching services");
    }
  };

  const fetchHouseholds = async () => {
    try {
      const response = await fetch("/api/households", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setHouseholds(data.data);
      }
    } catch {
      console.error("Error fetching households");
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/reports/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch {
      console.error("Error fetching dashboard data");
    }
  }, []);

  const fetchConsumptionTrends = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        ...(selectedService && { serviceId: selectedService }),
        ...(selectedHousehold && { householdId: selectedHousehold }),
      });

      const response = await fetch(
        `/api/reports/analytics/consumption-trends?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setConsumptionTrends(data.data.trends);
      }
    } catch {
      console.error("Error fetching consumption trends");
    }
  }, [selectedYear, selectedService, selectedHousehold]);

  const fetchCostAnalysis = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        ...(selectedHousehold && { householdId: selectedHousehold }),
      });

      const response = await fetch(
        `/api/reports/analytics/cost-analysis?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setCostAnalysis(data.data.costByPeriod);
        setServiceCosts(data.data.costByService);
      }
    } catch {
      console.error("Error fetching cost analysis");
    }
  }, [selectedYear, selectedHousehold]);

  const fetchHouseholdComparison = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        ...(selectedService && { serviceId: selectedService }),
      });

      const response = await fetch(
        `/api/reports/analytics/household-comparison?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setHouseholdComparison(data.data.households);
      }
    } catch {
      console.error("Error fetching household comparison");
    }
  }, [selectedYear, selectedService]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchDashboardData(),
        fetchConsumptionTrends(),
        fetchCostAnalysis(),
        fetchHouseholdComparison(),
      ]);
    } catch {
      setError("Kunde inte ladda rapportdata. Försök igen.");
    } finally {
      setLoading(false);
    }
  }, [
    fetchDashboardData,
    fetchConsumptionTrends,
    fetchCostAnalysis,
    fetchHouseholdComparison,
  ]);

  useEffect(() => {
    fetchServices();
    fetchHouseholds();
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflow: "hidden",
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Rapporter och Analyser
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadAllData}
          disabled={loading}
        >
          Uppdatera
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
            }}
          >
            <Box sx={{ minWidth: 120, flex: "1 1 200px" }}>
              <FormControl fullWidth>
                <InputLabel>År</InputLabel>
                <Select
                  value={selectedYear}
                  label="År"
                  onChange={(e) => setSelectedYear(e.target.value as number)}
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ minWidth: 120, flex: "1 1 200px" }}>
              <FormControl fullWidth>
                <InputLabel>Tjänst</InputLabel>
                <Select
                  value={selectedService}
                  label="Tjänst"
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  <MenuItem value="">Alla tjänster</MenuItem>
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ minWidth: 120, flex: "1 1 200px" }}>
              <FormControl fullWidth>
                <InputLabel>Hushåll</InputLabel>
                <Select
                  value={selectedHousehold}
                  label="Hushåll"
                  onChange={(e) => setSelectedHousehold(e.target.value)}
                >
                  <MenuItem value="">Alla hushåll</MenuItem>
                  {households.map((household) => (
                    <MenuItem key={household.id} value={household.id}>
                      Hushåll {household.householdNumber} -{" "}
                      {household.ownerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Dashboard Overview */}
      {dashboardData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Översikt
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                gap: 3,
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="primary">
                  {dashboardData.overview.totalHouseholds}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aktiva hushåll
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="warning.main">
                  {dashboardData.overview.pendingBills}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Väntande fakturor
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(dashboardData.overview.totalRevenue)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total intäkt ({selectedYear})
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="info.main">
                  {dashboardData.overview.activeServices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aktiva tjänster
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Card sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
          >
            <Tab label="Förbrukningstrender" />
            <Tab label="Kostnadsanalys" />
            <Tab label="Hushållsjämförelse" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box>
            <ConsumptionTrends
              data={consumptionTrends}
              title={`Förbrukningstrender ${selectedYear}`}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 3,
            }}
          >
            <Box sx={{ flex: "2 1 0" }}>
              <CostAnalysis
                data={costAnalysis}
                title={`Kostnadsanalys ${selectedYear}`}
              />
            </Box>
            <Box sx={{ flex: "1 1 0" }}>
              <ServiceCostBreakdown
                data={serviceCosts}
                title="Kostnader per tjänst"
              />
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 3,
            }}
          >
            <Box sx={{ flex: "1 1 0" }}>
              <HouseholdComparison
                data={householdComparison}
                title="Kostnadsjämförelse"
                showCosts={true}
                showConsumption={false}
              />
            </Box>
            <Box sx={{ flex: "1 1 0" }}>
              <HouseholdComparison
                data={householdComparison}
                title="Förbrukningsjämförelse"
                showCosts={false}
                showConsumption={true}
              />
            </Box>
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default Reports;
