import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  TextField,
} from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbar,
  type GridColDef,
  type GridRowParams,
} from "@mui/x-data-grid";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
} from "@mui/icons-material";

interface Household {
  id: string;
  householdNumber: number;
  ownerName: string;
  isActive: boolean;
}

interface UtilityService {
  id: string;
  name: string;
  unit: string;
  serviceType: string;
  isActive: boolean;
}

interface HouseholdMeter {
  id: string;
  householdId: string;
  serviceId: string;
  meterSerial?: string;
  installationDate?: string;
  isActive: boolean;
  createdAt: string;
  household: Household;
  service: UtilityService;
  _count: {
    readings: number;
  };
}

interface ConnectionFormData {
  householdId: string;
  serviceId: string;
  meterSerial?: string;
  installationDate?: string;
}

const HouseholdServiceConnections: React.FC = () => {
  const [connections, setConnections] = useState<HouseholdMeter[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [services, setServices] = useState<UtilityService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] =
    useState<HouseholdMeter | null>(null);
  const [formData, setFormData] = useState<ConnectionFormData>({
    householdId: "",
    serviceId: "",
    meterSerial: "",
    installationDate: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  const fetchConnections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/household-meters", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setConnections(data.data);
      } else {
        setError(data.error || "Failed to fetch connections");
      }
    } catch {
      setError("Failed to fetch connections");
    } finally {
      setLoading(false);
    }
  };

  const fetchHouseholds = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/households", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setHouseholds(data.data.filter((h: Household) => h.isActive));
      }
    } catch {
      console.error("Failed to fetch households");
    }
  };

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/utility-services", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setServices(data.data.filter((s: UtilityService) => s.isActive));
      }
    } catch {
      console.error("Failed to fetch services");
    }
  };

  useEffect(() => {
    fetchConnections();
    fetchHouseholds();
    fetchServices();
  }, []);

  // Form handlers
  const handleCreate = () => {
    setFormData({
      householdId: "",
      serviceId: "",
      meterSerial: "",
      installationDate: "",
    });
    setFormErrors({});
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (connection: HouseholdMeter) => {
    setSelectedConnection(connection);
    setFormData({
      householdId: connection.householdId,
      serviceId: connection.serviceId,
      meterSerial: connection.meterSerial || "",
      installationDate: connection.installationDate
        ? new Date(connection.installationDate).toISOString().split("T")[0]
        : "",
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      const submitData = {
        ...formData,
        installationDate: formData.installationDate || undefined,
      };

      const url = selectedConnection
        ? `/api/household-meters/${selectedConnection.id}`
        : "/api/household-meters";

      const method = selectedConnection ? "PUT" : "POST";
      const token = localStorage.getItem("accessToken");

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          selectedConnection
            ? {
                meterSerial: submitData.meterSerial,
                installationDate: submitData.installationDate,
              }
            : submitData
        ),
      });

      const data = await response.json();

      if (data.success) {
        if (selectedConnection) {
          // Update existing connection in local state
          setConnections((prevConnections) =>
            prevConnections.map((conn) =>
              conn.id === selectedConnection.id
                ? { ...conn, ...data.data }
                : conn
            )
          );
        } else {
          // Add new connection to local state
          setConnections((prevConnections) => [...prevConnections, data.data]);
        }
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setSelectedConnection(null);
      } else {
        if (data.details) {
          const errors: Record<string, string> = {};
          data.details.forEach(
            (detail: { path?: string[]; message: string }) => {
              if (detail.path) {
                errors[detail.path[0]] = detail.message;
              }
            }
          );
          setFormErrors(errors);
        } else {
          setError(data.error || "Failed to save connection");
        }
      }
    } catch {
      setError("Failed to save connection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this connection?")) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/household-meters/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Update local state by removing the deleted connection
        setConnections((prevConnections) =>
          prevConnections.filter((connection) => connection.id !== id)
        );
      } else {
        setError(data.error || "Failed to delete connection");
      }
    } catch {
      setError("Failed to delete connection");
    }
  };

  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: "householdNumber",
      headerName: "Hushåll #",
      flex: 0.3,
      minWidth: 100,
      valueGetter: (_, row) => row.household.householdNumber,
      type: "number",
      align: "center",
      headerAlign: "center",
    },
    {
      field: "ownerName",
      headerName: "Ägare",
      flex: 0.8,
      minWidth: 150,
      valueGetter: (_, row) => row.household.ownerName,
    },
    {
      field: "serviceName",
      headerName: "Tjänst",
      flex: 0.8,
      minWidth: 150,
      valueGetter: (_, row) => row.service.name,
    },
    {
      field: "serviceType",
      headerName: "Typ",
      flex: 0.4,
      minWidth: 120,
      valueGetter: (_, row) => row.service.serviceType,
      renderCell: (params) => (
        <Chip
          label={params.row.service.serviceType}
          size="small"
          variant="outlined"
          color={
            params.row.service.serviceType === "WATER"
              ? "primary"
              : params.row.service.serviceType === "ELECTRICITY"
              ? "warning"
              : params.row.service.serviceType === "HEATING"
              ? "error"
              : "default"
          }
        />
      ),
    },
    {
      field: "meterSerial",
      headerName: "Mätarnummer",
      flex: 0.5,
      minWidth: 120,
      renderCell: (params) => params.value || "-",
    },
    {
      field: "installationDate",
      headerName: "Installationsdatum",
      flex: 0.5,
      minWidth: 130,
      type: "date",
      valueGetter: (value) => (value ? new Date(value) : null),
      renderCell: (params) =>
        params.value ? new Date(params.value).toLocaleDateString("sv-SE") : "-",
    },
    {
      field: "readingsCount",
      headerName: "Avläsningar",
      flex: 0.3,
      minWidth: 100,
      type: "number",
      align: "center",
      headerAlign: "center",
      valueGetter: (_, row) => row._count.readings,
    },
    {
      field: "isActive",
      headerName: "Status",
      flex: 0.3,
      minWidth: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Aktiv" : "Inaktiv"}
          size="small"
          color={params.value ? "success" : "default"}
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Åtgärder",
      flex: 0.3,
      minWidth: 120,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          key="edit"
          icon={
            <Tooltip title="Redigera anslutning">
              <EditIcon />
            </Tooltip>
          }
          label="Redigera"
          onClick={() => handleEdit(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={
            <Tooltip title="Ta bort anslutning">
              <DeleteIcon />
            </Tooltip>
          }
          label="Ta bort"
          onClick={() => handleDelete(params.row.id)}
          showInMenu
        />,
      ],
    },
  ];

  const getAvailableServices = () => {
    if (!selectedConnection) {
      // For new connections, exclude services already connected to the selected household
      const connectedServiceIds = connections
        .filter((conn) => conn.householdId === formData.householdId)
        .map((conn) => conn.serviceId);
      return services.filter(
        (service) => !connectedServiceIds.includes(service.id)
      );
    }
    return services; // For editing, allow all services
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" component="h1">
          Hushåll-Tjänst Anslutningar
        </Typography>
        <Button
          variant="contained"
          startIcon={<LinkIcon />}
          onClick={handleCreate}
          sx={{ minWidth: 200 }}
        >
          Lägg till anslutning
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Totala Anslutningar
              </Typography>
              <Typography variant="h4">{connections.length}</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Aktiva Anslutningar
              </Typography>
              <Typography variant="h4">
                {connections.filter((c) => c.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Anslutna Hushåll
              </Typography>
              <Typography variant="h4">
                {new Set(connections.map((c) => c.householdId)).size}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: "1 1 250px", minWidth: "250px" }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Anslutna Tjänster
              </Typography>
              <Typography variant="h4">
                {new Set(connections.map((c) => c.serviceId)).size}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* DataGrid */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={connections}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          density="compact"
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>

      {/* Create Connection Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LinkIcon />
            Lägg till ny anslutning
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControl fullWidth error={!!formErrors.householdId}>
                <InputLabel>Hushåll</InputLabel>
                <Select
                  value={formData.householdId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      householdId: e.target.value,
                      serviceId: "",
                    })
                  }
                  label="Hushåll"
                  required
                >
                  {households.map((household) => (
                    <MenuItem key={household.id} value={household.id}>
                      Hushåll #{household.householdNumber} -{" "}
                      {household.ownerName}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.householdId && (
                  <Typography color="error" variant="caption">
                    {formErrors.householdId}
                  </Typography>
                )}
              </FormControl>

              <FormControl
                fullWidth
                error={!!formErrors.serviceId}
                disabled={!formData.householdId}
              >
                <InputLabel>Tjänst</InputLabel>
                <Select
                  value={formData.serviceId}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceId: e.target.value })
                  }
                  label="Tjänst"
                  required
                >
                  {getAvailableServices().map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name} ({service.serviceType})
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.serviceId && (
                  <Typography color="error" variant="caption">
                    {formErrors.serviceId}
                  </Typography>
                )}
              </FormControl>

              <TextField
                label="Mätarnummer"
                value={formData.meterSerial}
                onChange={(e) =>
                  setFormData({ ...formData, meterSerial: e.target.value })
                }
                error={!!formErrors.meterSerial}
                helperText={formErrors.meterSerial}
                fullWidth
              />

              <TextField
                label="Installationsdatum"
                type="date"
                value={formData.installationDate}
                onChange={(e) =>
                  setFormData({ ...formData, installationDate: e.target.value })
                }
                error={!!formErrors.installationDate}
                helperText={formErrors.installationDate}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateDialogOpen(false)}>Avbryt</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                submitting || !formData.householdId || !formData.serviceId
              }
            >
              {submitting ? <CircularProgress size={20} /> : "Lägg till"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Connection Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon />
            Redigera anslutning
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {selectedConnection && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Redigerar anslutning: Hushåll #
                  {selectedConnection.household.householdNumber} -{" "}
                  {selectedConnection.service.name}
                </Alert>
              )}

              <TextField
                label="Mätarnummer"
                value={formData.meterSerial}
                onChange={(e) =>
                  setFormData({ ...formData, meterSerial: e.target.value })
                }
                error={!!formErrors.meterSerial}
                helperText={formErrors.meterSerial}
                fullWidth
              />

              <TextField
                label="Installationsdatum"
                type="date"
                value={formData.installationDate}
                onChange={(e) =>
                  setFormData({ ...formData, installationDate: e.target.value })
                }
                error={!!formErrors.installationDate}
                helperText={formErrors.installationDate}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsEditDialogOpen(false)}>Avbryt</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : "Spara"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default HouseholdServiceConnections;
