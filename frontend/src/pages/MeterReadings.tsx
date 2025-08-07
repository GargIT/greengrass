import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Fab,
  Tooltip,
  Paper,
} from "@mui/material";
import { Add as AddIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
} from "@mui/x-data-grid";

interface BillingPeriod {
  id: string;
  periodName: string;
  periodType: "tertiary" | "monthly";
  startDate: string;
  endDate: string;
  readingDeadline: string;
  isOfficialBilling: boolean;
  isBillingEnabled: boolean;
  _count: {
    householdMeterReadings: number;
    mainMeterReadings: number;
  };
}

interface UtilityService {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
}

interface Household {
  id: string;
  householdNumber: number;
  ownerName: string;
  isActive: boolean;
}

interface HouseholdMeter {
  id: string;
  meterSerial: string | null;
  installationDate: string | null;
  isActive: boolean;
  household: {
    id: string;
    householdNumber: number;
    ownerName: string;
  };
  service: {
    id: string;
    name: string;
    unit: string;
  };
}

interface MainMeter {
  id: string;
  meterIdentifier: string;
  meterSerial: string | null;
  installationDate: string | null;
  isActive: boolean;
  service: {
    id: string;
    name: string;
    unit: string;
  };
}

interface HouseholdMeterReading {
  id: string;
  meterReading: number;
  readingDate: string;
  rawConsumption: number | null;
  notes: string | null;
  createdAt: string;
  householdMeter: {
    id: string;
    meterSerial: string | null;
    household: {
      id: string;
      householdNumber: number;
      ownerName: string;
    };
    service: {
      id: string;
      name: string;
      unit: string;
    };
  };
  billingPeriod: {
    id: string;
    periodName: string;
    periodType: string;
    startDate: string;
    endDate: string;
  };
}

interface MainMeterReading {
  id: string;
  meterReading: number;
  readingDate: string;
  consumption: number | null;
  notes: string | null;
  createdAt: string;
  meter: {
    id: string;
    meterIdentifier: string;
    meterSerial: string | null;
    service: {
      id: string;
      name: string;
      unit: string;
    };
  };
  billingPeriod: {
    id: string;
    periodName: string;
    periodType: string;
    startDate: string;
    endDate: string;
  };
}

type ReadingType = "household" | "main";

interface ReadingFormData {
  householdMeterId?: string;
  meterId?: string;
  billingPeriodId: string;
  meterReading: number | "";
  readingDate: string;
  notes: string;
  type: ReadingType;
}

const MeterReadings: React.FC = () => {
  // Get current user
  const userString = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : null;
  const isAdmin = currentUser?.role === "ADMIN";
  const isMember = currentUser?.role === "MEMBER";

  // State management
  const [readingType, setReadingType] = useState<ReadingType>("household");
  const [readings, setReadings] = useState<
    (HouseholdMeterReading | MainMeterReading)[]
  >([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [services, setServices] = useState<UtilityService[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdMeters, setHouseholdMeters] = useState<HouseholdMeter[]>([]);
  const [mainMeters, setMainMeters] = useState<MainMeter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState<
    HouseholdMeterReading | MainMeterReading | null
  >(null);

  // Form data
  const [formData, setFormData] = useState<ReadingFormData>({
    billingPeriodId: "",
    meterReading: "",
    readingDate: new Date().toISOString().split("T")[0],
    notes: "",
    type: "household",
  });

  // API helpers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Fetch data functions
  const fetchBillingPeriods = useCallback(async () => {
    try {
      // For meter readings page, only fetch past and current/next periods
      const response = await fetch(
        "/api/billing/periods?forMeterReadings=true",
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch billing periods");

      const result = await response.json();
      setBillingPeriods(result.data || []);
    } catch (err) {
      console.error("Error fetching billing periods:", err);
      setError("Failed to fetch billing periods");
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch("/api/utility-services", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch services");

      const result = await response.json();
      setServices(result.data || []);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("Failed to fetch services");
    }
  }, []);

  const fetchHouseholds = useCallback(async () => {
    try {
      const response = await fetch("/api/households", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch households");

      const result = await response.json();
      setHouseholds(result.data || []);
    } catch (err) {
      console.error("Error fetching households:", err);
      setError("Failed to fetch households");
    }
  }, []);

  const fetchHouseholdMeters = useCallback(async () => {
    try {
      const response = await fetch("/api/household-meters", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch household meters");

      const result = await response.json();
      setHouseholdMeters(result.data || []);
    } catch (err) {
      console.error("Error fetching household meters:", err);
      setError("Failed to fetch household meters");
    }
  }, []);

  const fetchMainMeters = useCallback(async () => {
    try {
      const response = await fetch("/api/main-meters", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // If main meters endpoint doesn't exist, just skip
        console.log("Main meters endpoint not available");
        return;
      }

      const result = await response.json();
      setMainMeters(result.data || []);
    } catch (err) {
      console.error("Error fetching main meters:", err);
      // Don't set error since main meters might not be implemented yet
    }
  }, []);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedPeriod) params.append("periodId", selectedPeriod);
      if (selectedService) params.append("serviceId", selectedService);
      if (selectedHousehold) params.append("householdId", selectedHousehold);
      params.append("type", readingType);

      const response = await fetch(`/api/meter-readings?${params}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "Too many requests. Please wait a moment and try again."
          );
        }
        if (response.status === 401) {
          throw new Error("You need to log in to view readings.");
        }
        throw new Error("Failed to fetch readings");
      }

      const result = await response.json();
      setReadings(result.data || []);
    } catch (err) {
      console.error("Error fetching readings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch meter readings"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedService, selectedHousehold, readingType]);

  // Initialize data
  useEffect(() => {
    fetchBillingPeriods();
    fetchServices();
    fetchHouseholds();
    fetchHouseholdMeters();
    fetchMainMeters();
  }, [
    fetchBillingPeriods,
    fetchServices,
    fetchHouseholds,
    fetchHouseholdMeters,
    fetchMainMeters,
  ]);

  // Force household type for members
  useEffect(() => {
    if (isMember && readingType !== "household") {
      setReadingType("household");
    }
  }, [isMember, readingType]);

  // Fetch readings when filters change
  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  // Handle form submission
  const handleSaveReading = async () => {
    try {
      setLoading(true);

      const payload = {
        ...formData,
        type: readingType,
        meterReading: Number(formData.meterReading),
        readingDate: new Date(formData.readingDate).toISOString(),
      };

      const url = editingReading
        ? `/api/meter-readings/${editingReading.id}`
        : "/api/meter-readings";

      const method = editingReading ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save reading";
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.message || errorMessage;
        } catch {
          // If JSON parsing fails, use status text or generic message
          if (response.status === 429) {
            errorMessage =
              "Too many requests. Please wait a moment and try again.";
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (editingReading) {
        // Update existing reading in local state
        setReadings((prev) =>
          prev.map((reading) =>
            reading.id === editingReading.id ? result.data : reading
          )
        );
      } else {
        // Add new reading to local state
        setReadings((prev) => [result.data, ...prev]);
      }

      handleCloseEditDialog();
      setError(null);
    } catch (err) {
      console.error("Error saving reading:", err);
      setError(err instanceof Error ? err.message : "Failed to save reading");
    } finally {
      setLoading(false);
    }
  };

  // Dialog handlers
  const handleOpenEditDialog = (
    reading?: HouseholdMeterReading | MainMeterReading
  ) => {
    if (reading) {
      setEditingReading(reading);
      if ("householdMeter" in reading) {
        // Household reading
        setFormData({
          householdMeterId: reading.householdMeter.id,
          billingPeriodId: reading.billingPeriod.id,
          meterReading: reading.meterReading,
          readingDate: reading.readingDate,
          notes: reading.notes || "",
          type: "household",
        });
      } else {
        // Main meter reading
        setFormData({
          meterId: reading.meter.id,
          billingPeriodId: reading.billingPeriod.id,
          meterReading: reading.meterReading,
          readingDate: reading.readingDate,
          notes: reading.notes || "",
          type: "main",
        });
      }
    } else {
      setEditingReading(null);
      setFormData({
        billingPeriodId: selectedPeriod,
        meterReading: "",
        readingDate: new Date().toISOString().split("T")[0],
        notes: "",
        type: isMember ? "household" : readingType,
      });
    }
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingReading(null);
    setFormData({
      billingPeriodId: "",
      meterReading: "",
      readingDate: new Date().toISOString().split("T")[0],
      notes: "",
      type: "household",
    });
  };

  // DataGrid columns for household readings
  const householdColumns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      width: 90,
      sortable: false,
      filterable: false,
    },
    ...(isAdmin
      ? [
          {
            field: "householdNumber",
            headerName: "Hushåll",
            width: 100,
            valueGetter: (_, row) =>
              row.householdMeter?.household?.householdNumber || "",
          } as GridColDef,
          {
            field: "ownerName",
            headerName: "Ägare",
            width: 200,
            valueGetter: (_, row) =>
              row.householdMeter?.household?.ownerName || "",
          } as GridColDef,
        ]
      : []),
    {
      field: "serviceName",
      headerName: "Tjänst",
      width: 150,
      valueGetter: (_, row) => row.householdMeter?.service?.name || "",
    },
    {
      field: "meterReading",
      headerName: "Mätarställning",
      width: 130,
      type: "number",
      valueFormatter: (value: number) => value?.toLocaleString("sv-SE") || "",
    },
    {
      field: "unit",
      headerName: "Enhet",
      width: 80,
      valueGetter: (_, row) => row.householdMeter?.service?.unit || "",
    },
    {
      field: "rawConsumption",
      headerName: "Förbrukning",
      width: 120,
      type: "number",
      valueFormatter: (value: number) =>
        value ? value.toLocaleString("sv-SE") : "-",
    },
    {
      field: "readingDate",
      headerName: "Avläsningsdatum",
      width: 130,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString("sv-SE") : "",
    },
    {
      field: "periodName",
      headerName: "Period",
      width: 120,
      valueGetter: (_, row) => row.billingPeriod?.periodName || "",
    },
    {
      field: "notes",
      headerName: "Anteckningar",
      width: 200,
      valueFormatter: (value: string) => value || "-",
    },
  ];

  // DataGrid columns for main meter readings
  const mainMeterColumns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      width: 90,
      sortable: false,
      filterable: false,
    },
    {
      field: "meterIdentifier",
      headerName: "Mätar-ID",
      width: 150,
      valueGetter: (_, row) => row.meter?.meterIdentifier || "",
    },
    {
      field: "serviceName",
      headerName: "Tjänst",
      width: 150,
      valueGetter: (_, row) => row.meter?.service?.name || "",
    },
    {
      field: "meterReading",
      headerName: "Mätarställning",
      width: 130,
      type: "number",
      valueFormatter: (value: number) => value?.toLocaleString("sv-SE") || "",
    },
    {
      field: "unit",
      headerName: "Enhet",
      width: 80,
      valueGetter: (_, row) => row.meter?.service?.unit || "",
    },
    {
      field: "consumption",
      headerName: "Förbrukning",
      width: 120,
      type: "number",
      valueFormatter: (value: number) =>
        value ? value.toLocaleString("sv-SE") : "-",
    },
    {
      field: "readingDate",
      headerName: "Avläsningsdatum",
      width: 130,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString("sv-SE") : "",
    },
    {
      field: "periodName",
      headerName: "Period",
      width: 120,
      valueGetter: (_, row) => row.billingPeriod?.periodName || "",
    },
    {
      field: "notes",
      headerName: "Anteckningar",
      width: 200,
      valueFormatter: (value: string) => value || "-",
    },
  ];

  // Calculate summary stats
  const totalReadings = readings.length;
  const recentReadings = readings.filter((r) => {
    const readingDate = new Date(r.readingDate);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return readingDate >= weekAgo;
  }).length;

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
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            {isMember ? "Mina mätaravläsningar" : "Mätaravläsningar"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isMember
              ? "Registrera och visa dina hushållsmätare"
              : "Hantera mätaravläsningar för hushåll och huvudmätare"}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {isAdmin && (
            <ToggleButtonGroup
              value={readingType}
              exclusive
              onChange={(_, value) => value && setReadingType(value)}
              size="small"
            >
              <ToggleButton value="household">Hushållsmätare</ToggleButton>
              <ToggleButton value="main">Huvudmätare</ToggleButton>
            </ToggleButtonGroup>
          )}

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReadings}
            disabled={loading}
            size="small"
          >
            Uppdatera
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenEditDialog()}
            size="small"
          >
            Ny avläsning
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "1fr 1fr 1fr 1fr",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" color="primary">
              {totalReadings}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Totalt antal avläsningar
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" color="secondary">
              {recentReadings}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nya senaste veckan
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" color="success.main">
              {billingPeriods.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Faktureringsperioder
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" color="info.main">
              {readingType === "household" ? "Hushåll" : "Huvudmätare"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aktuell vy
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: isMember ? "1fr 1fr" : "1fr 1fr",
              md: isMember ? "1fr 1fr 1fr" : "1fr 1fr 1fr 1fr",
            },
            gap: 2,
            alignItems: "center",
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel>Faktureringsperiod</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              label="Faktureringsperiod"
            >
              <MenuItem value="">Alla perioder</MenuItem>
              {billingPeriods.map((period) => (
                <MenuItem key={period.id} value={period.id}>
                  {period.periodName} ({period.periodType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Tjänst</InputLabel>
            <Select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              label="Tjänst"
            >
              <MenuItem value="">Alla tjänster</MenuItem>
              {services
                .filter((s) => s.isActive)
                .map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {readingType === "household" && isAdmin && (
            <FormControl fullWidth size="small">
              <InputLabel>Hushåll</InputLabel>
              <Select
                value={selectedHousehold}
                onChange={(e) => setSelectedHousehold(e.target.value)}
                label="Hushåll"
              >
                <MenuItem value="">Alla hushåll</MenuItem>
                {households
                  .filter((h) => h.isActive)
                  .map((household) => (
                    <MenuItem key={household.id} value={household.id}>
                      {household.householdNumber} - {household.ownerName}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="outlined"
            onClick={() => {
              setSelectedPeriod("");
              setSelectedService("");
              if (isAdmin) {
                setSelectedHousehold("");
              }
            }}
            fullWidth
            size="small"
          >
            Rensa filter
          </Button>
        </Box>
      </Paper>

      {/* DataGrid */}
      <Box sx={{ flexGrow: 1, minHeight: 400 }}>
        <DataGrid
          rows={readings}
          columns={
            isMember || readingType === "household"
              ? householdColumns
              : mainMeterColumns
          }
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            columns: {
              columnVisibilityModel: {
                id: false,
              },
            },
          }}
          onRowDoubleClick={(params: GridRowParams) =>
            handleOpenEditDialog(params.row)
          }
          sx={{
            "& .MuiDataGrid-row": {
              cursor: "pointer",
            },
          }}
        />
      </Box>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingReading ? "Redigera avläsning" : "Ny mätaravläsning"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Faktureringsperiod</InputLabel>
              <Select
                value={formData.billingPeriodId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    billingPeriodId: e.target.value,
                  }))
                }
                label="Faktureringsperiod"
                required
              >
                {billingPeriods.map((period) => (
                  <MenuItem key={period.id} value={period.id}>
                    {period.periodName} ({period.periodType})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {isMember || readingType === "household" ? (
              <FormControl fullWidth>
                <InputLabel>
                  {isMember ? "Mätare" : "Hushållsmätare"}
                </InputLabel>
                <Select
                  value={formData.householdMeterId || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      householdMeterId: e.target.value,
                    }))
                  }
                  label={isMember ? "Mätare" : "Hushållsmätare"}
                  required
                >
                  {householdMeters
                    .filter((meter) => meter.isActive)
                    .map((meter) => (
                      <MenuItem key={meter.id} value={meter.id}>
                        {isMember
                          ? // Simplified view for members - just service and meter serial
                            `${meter.service.name}${
                              meter.meterSerial ? ` (${meter.meterSerial})` : ""
                            }`
                          : // Full view for admins
                            `${meter.household.householdNumber} - ${
                              meter.household.ownerName
                            } (${meter.service.name})${
                              meter.meterSerial ? ` - ${meter.meterSerial}` : ""
                            }`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Huvudmätare</InputLabel>
                <Select
                  value={formData.meterId || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      meterId: e.target.value,
                    }))
                  }
                  label="Huvudmätare"
                  required
                >
                  {mainMeters
                    .filter((meter) => meter.isActive)
                    .map((meter) => (
                      <MenuItem key={meter.id} value={meter.id}>
                        {meter.meterIdentifier} ({meter.service.name})
                        {meter.meterSerial && ` - ${meter.meterSerial}`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Mätarställning"
              type="number"
              value={formData.meterReading}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  meterReading: value === "" ? "" : Number(value),
                }));
              }}
              required
              fullWidth
              inputProps={{ min: 0, step: 0.001 }}
            />

            <TextField
              label="Avläsningsdatum"
              type="date"
              value={formData.readingDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  readingDate: e.target.value,
                }))
              }
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Anteckningar"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Avbryt</Button>
          <Button
            onClick={handleSaveReading}
            variant="contained"
            disabled={
              loading ||
              !formData.billingPeriodId ||
              !formData.meterReading ||
              ((isMember || readingType === "household") &&
                !formData.householdMeterId) ||
              (isAdmin && readingType === "main" && !formData.meterId)
            }
          >
            {editingReading ? "Uppdatera" : "Skapa"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Box sx={{ position: "fixed", bottom: 24, right: 24 }}>
        <Tooltip title="Ny avläsning">
          <Fab color="primary" onClick={() => handleOpenEditDialog()}>
            <AddIcon />
          </Fab>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default MeterReadings;
