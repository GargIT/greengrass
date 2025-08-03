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
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
} from "@mui/x-data-grid";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MEMBER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  household?: {
    id: string;
    householdNumber: number;
    ownerName: string;
  };
}

interface Household {
  id: string;
  householdNumber: number;
  ownerName: string;
  isActive: boolean;
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: "ADMIN" | "MEMBER";
  householdId: string;
  isActive: boolean;
}

const Users: React.FC = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Form data
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "MEMBER",
    householdId: "",
    isActive: true,
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
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "Too many requests. Please wait a moment and try again."
          );
        }
        if (response.status === 401) {
          throw new Error("You need to log in to view users.");
        }
        throw new Error("Failed to fetch users");
      }

      const result = await response.json();
      setUsers(result.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
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

  // Initialize data
  useEffect(() => {
    fetchUsers();
    fetchHouseholds();
  }, [fetchUsers, fetchHouseholds]);

  // Handle form submission
  const handleSaveUser = async () => {
    try {
      setLoading(true);

      // Build payload conditionally
      const payload: {
        email: string;
        firstName: string;
        lastName: string;
        role: "ADMIN" | "MEMBER";
        householdId: string | null;
        isActive: boolean;
        password?: string;
      } = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        householdId: formData.householdId || null,
        isActive: formData.isActive,
      };

      // Only include password for new users or when password is provided for updates
      if (!editingUser || formData.password) {
        payload.password = formData.password;
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save user";
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.message || errorMessage;
        } catch {
          if (response.status === 429) {
            errorMessage =
              "Too many requests. Please wait a moment and try again.";
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      await fetchUsers(); // Refresh the list
      handleCloseEditDialog();
      setError(null);
    } catch (err) {
      console.error("Error saving user:", err);
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete user";
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.message || errorMessage;
        } catch {
          if (response.status === 429) {
            errorMessage =
              "Too many requests. Please wait a moment and try again.";
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      await fetchUsers(); // Refresh the list
      handleCloseDeleteDialog();
      setError(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  // Dialog handlers
  const handleOpenEditDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: "", // Don't populate password for edits
        role: user.role,
        householdId: user.household?.id || "",
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "MEMBER",
        householdId: "",
        isActive: true,
      });
    }
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingUser(null);
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "MEMBER",
      householdId: "",
      isActive: true,
    });
  };

  const handleOpenDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingUser(null);
  };

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      width: 80,
      sortable: false,
      filterable: false,
    },
    {
      field: "email",
      headerName: "E-post",
      width: 250,
    },
    {
      field: "firstName",
      headerName: "Förnamn",
      width: 150,
    },
    {
      field: "lastName",
      headerName: "Efternamn",
      width: 150,
    },
    {
      field: "role",
      headerName: "Roll",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "ADMIN" ? "primary" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "household",
      headerName: "Hushåll",
      width: 200,
      valueGetter: (_, row) =>
        row.household
          ? `${row.household.householdNumber} - ${row.household.ownerName}`
          : "Ej kopplat",
    },
    {
      field: "isActive",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Aktiv" : "Inaktiv"}
          color={params.value ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "createdAt",
      headerName: "Skapad",
      width: 130,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString("sv-SE") : "",
    },
    {
      field: "actions",
      headerName: "Åtgärder",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Redigera">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditDialog(params.row);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ta bort">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDeleteDialog(params.row);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Calculate summary stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.role === "ADMIN").length;
  const connectedUsers = users.filter((u) => u.household).length;

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
            Användarhantering
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hantera användare och koppla dem till hushåll
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
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
            Ny användare
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
              {totalUsers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Totalt antal användare
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" color="success.main">
              {activeUsers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aktiva användare
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" color="secondary">
              {adminUsers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administratörer
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" color="info.main">
              {connectedUsers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Kopplade till hushåll
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* DataGrid */}
      <Box sx={{ flexGrow: 1, minHeight: 400 }}>
        <DataGrid
          rows={users}
          columns={columns}
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
          {editingUser ? "Redigera användare" : "Ny användare"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="E-postadress"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              required
              fullWidth
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Förnamn"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                required
                fullWidth
              />

              <TextField
                label="Efternamn"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                required
                fullWidth
              />
            </Box>

            <TextField
              label={
                editingUser
                  ? "Nytt lösenord (lämna tomt för att behålla)"
                  : "Lösenord"
              }
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              required={!editingUser}
              fullWidth
              helperText={
                editingUser ? "Lämna tomt om du inte vill ändra lösenordet" : ""
              }
            />

            <FormControl fullWidth>
              <InputLabel>Roll</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    role: e.target.value as "ADMIN" | "MEMBER",
                  }))
                }
                label="Roll"
                required
              >
                <MenuItem value="MEMBER">Medlem</MenuItem>
                <MenuItem value="ADMIN">Administratör</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Hushåll</InputLabel>
              <Select
                value={formData.householdId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    householdId: e.target.value,
                  }))
                }
                label="Hushåll"
              >
                <MenuItem value="">Ingen koppling</MenuItem>
                {households
                  .filter((h) => h.isActive)
                  .map((household) => (
                    <MenuItem key={household.id} value={household.id}>
                      {household.householdNumber} - {household.ownerName}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.value === "active",
                  }))
                }
                label="Status"
                required
              >
                <MenuItem value="active">Aktiv</MenuItem>
                <MenuItem value="inactive">Inaktiv</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Avbryt</Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            disabled={
              loading ||
              !formData.email ||
              !formData.firstName ||
              !formData.lastName ||
              (!editingUser && !formData.password)
            }
          >
            {editingUser ? "Uppdatera" : "Skapa"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
      >
        <DialogTitle>Ta bort användare</DialogTitle>
        <DialogContent>
          <Typography>
            Är du säker på att du vill ta bort användaren{" "}
            <strong>{deletingUser?.email}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Denna åtgärd kan inte ångras.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Avbryt</Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
