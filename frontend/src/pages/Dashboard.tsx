import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Home as HouseholdIcon,
  Water as UtilityIcon,
  Receipt as BillingIcon,
  TrendingUp as RevenueIcon,
} from '@mui/icons-material';

interface DashboardData {
  overview: {
    totalHouseholds: number;
    activeServices: number;
    pendingBills: number;
    totalRevenue: number;
  };
  recentReadings: Array<{
    id: string;
    meterReading: number;
    readingDate: string;
    householdMeter: {
      household: {
        householdNumber: number;
        ownerName: string;
      };
      service: {
        name: string;
        unit: string;
      };
    };
    billingPeriod: {
      periodName: string;
    };
  }>;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2">
            {value}
          </Typography>
        </Box>
        <Box sx={{ color, fontSize: 40 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/reports/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error('API returned error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Fel vid hämtning av data: {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Ingen data tillgänglig
      </Alert>
    );
  }

  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ p: { xs: 2, sm: 3, md: 4 }, pb: 0 }}>
        Översikt
      </Typography>
      
      {/* Statistics Cards */}
      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }}
        gap={3}
        sx={{ mb: 4, px: { xs: 2, sm: 3, md: 4 } }}
      >
        <StatCard
          title="Hushåll"
          value={data.overview.totalHouseholds}
          icon={<HouseholdIcon />}
          color="#1976d2"
        />
        <StatCard
          title="Aktiva tjänster"
          value={data.overview.activeServices}
          icon={<UtilityIcon />}
          color="#388e3c"
        />
        <StatCard
          title="Väntande fakturor"
          value={data.overview.pendingBills}
          icon={<BillingIcon />}
          color="#f57c00"
        />
        <StatCard
          title="Total intäkt (SEK)"
          value={new Intl.NumberFormat('sv-SE').format(data.overview.totalRevenue)}
          icon={<RevenueIcon />}
          color="#388e3c"
        />
      </Box>

      {/* Recent Readings and System Status */}
      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: '1fr', lg: '2fr 1fr' }}
        gap={3}
        sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 2, sm: 3, md: 4 } }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Senaste mätaravläsningar
          </Typography>
          {data.recentReadings.length > 0 ? (
            <Box>
              {data.recentReadings.map((reading) => (
                <Box
                  key={reading.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    borderBottom: '1px solid #e0e0e0',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box>
                    <Typography variant="body1">
                      Hushåll {reading.householdMeter.household.householdNumber} - {reading.householdMeter.household.ownerName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {reading.householdMeter.service.name} - {reading.billingPeriod.periodName}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h6">
                      {new Intl.NumberFormat('sv-SE').format(reading.meterReading)} {reading.householdMeter.service.unit}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(reading.readingDate).toLocaleDateString('sv-SE')}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="textSecondary">
              Inga avläsningar tillgängliga
            </Typography>
          )}
        </Paper>
        
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Systemstatus
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </Typography>
            <Typography variant="body2" color="success.main">
              ✓ Systemet fungerar normalt
            </Typography>
            <Typography variant="body2" color="success.main">
              ✓ Databas ansluten
            </Typography>
            <Typography variant="body2" color="success.main">
              ✓ API tillgängligt
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;
