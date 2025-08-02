import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  OutlinedInput,
  Alert,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbar,
  type GridColDef,
  type GridRowParams,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

interface Household {
  id: string;
  householdNumber: number;
  ownerName: string;
  email?: string;
  phone?: string;
  address?: string;
  andelstal: number;
  annualMemberFee: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    quarterlyBills: number;
    monthlyBills: number;
  };
}

interface HouseholdFormData {
  householdNumber: number;
  ownerName: string;
  email?: string;
  phone?: string;
  address?: string;
  andelstal?: number;
  annualMemberFee?: number;
}

const Households: React.FC = () => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [formData, setFormData] = useState<HouseholdFormData>({
    householdNumber: 1,
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    andelstal: 1/14,
    annualMemberFee: 3000,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'householdNumber',
      headerName: 'Hushåll #',
      flex: 0.5,
      minWidth: 100,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'ownerName',
      headerName: 'Ägare',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <PersonIcon color="action" fontSize="small" />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'contact',
      headerName: 'Kontakt',
      flex: 1.5,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => {
        const { email, phone } = params.row;
        return (
          <Box>
            {email && (
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{email}</Typography>
              </Box>
            )}
            {phone && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{phone}</Typography>
              </Box>
            )}
          </Box>
        );
      },
    },
    {
      field: 'address',
      headerName: 'Adress',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        if (!params.value) return null;
        return (
          <Box display="flex" alignItems="center" gap={0.5}>
            <HomeIcon fontSize="small" color="action" />
            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{params.value}</Typography>
          </Box>
        );
      },
    },
    {
      field: 'andelstal',
      headerName: 'Andelstal',
      flex: 0.6,
      minWidth: 90,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2">
          {(params.value * 100).toFixed(2)}%
        </Typography>
      ),
    },
    {
      field: 'annualMemberFee',
      headerName: 'Årsavgift',
      flex: 0.8,
      minWidth: 110,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value.toLocaleString('sv-SE')} kr
        </Typography>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      flex: 0.5,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Aktiv' : 'Inaktiv'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Åtgärder',
      flex: 0.6,
      minWidth: 100,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Visa detaljer">
              <ViewIcon />
            </Tooltip>
          }
          label="Visa"
          onClick={() => handleViewClick(params.row)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Redigera">
              <EditIcon />
            </Tooltip>
          }
          label="Redigera"
          onClick={() => handleEditClick(params.row)}
        />,
      ],
    },
  ];

  // Fetch households
  useEffect(() => {
    fetchHouseholds();
  }, []);

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/households', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        setHouseholds(result.data);
      } else {
        setError('Failed to fetch households');
      }
    } catch (err) {
      setError('Network error while fetching households');
      console.error('Error fetching households:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      householdNumber: Math.max(...households.map(h => h.householdNumber), 0) + 1,
      ownerName: '',
      email: '',
      phone: '',
      address: '',
      andelstal: 1/14,
      annualMemberFee: 3000,
    });
    setFormErrors({});
  };

  const handleCreateClick = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEditClick = (household: Household) => {
    setSelectedHousehold(household);
    setFormData({
      householdNumber: household.householdNumber,
      ownerName: household.ownerName,
      email: household.email || '',
      phone: household.phone || '',
      address: household.address || '',
      andelstal: household.andelstal,
      annualMemberFee: household.annualMemberFee,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleViewClick = (household: Household) => {
    setSelectedHousehold(household);
    setIsViewDialogOpen(true);
  };

  const handleFormSubmit = async (isEdit: boolean) => {
    setSubmitting(true);
    setFormErrors({});

    try {
      const url = isEdit ? `/api/households/${selectedHousehold?.id}` : '/api/households';
      const method = isEdit ? 'PUT' : 'POST';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        await fetchHouseholds();
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setSelectedHousehold(null);
      } else {
        if (result.errors) {
          setFormErrors(result.errors);
        } else {
          setError(result.message || 'Failed to save household');
        }
      }
    } catch (err) {
      setError('Network error while saving household');
      console.error('Error saving household:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof HouseholdFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
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
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexShrink: 0, px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3, md: 4 } }}>
        <Typography variant="h4" component="h1">
          Hushållshantering
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Lägg till hushåll
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0, mx: { xs: 2, sm: 3, md: 4 } }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Households DataGrid */}
      <Box 
        sx={{ 
          flex: 1,
          minHeight: 0,
          width: '100%',
          height: '100%',
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <DataGrid
          rows={households}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{
            height: '100%',
            width: '100%',
            border: 'none',
            '& .MuiDataGrid-main': {
              height: '100%',
            },
            '& .MuiDataGrid-virtualScroller': {
              height: '100%',
            },
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedHousehold(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isCreateDialogOpen ? 'Lägg till nytt hushåll' : 'Redigera hushåll'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth error={!!formErrors.householdNumber}>
                <InputLabel>Hushållsnummer</InputLabel>
                <OutlinedInput
                  type="number"
                  label="Hushållsnummer"
                  value={formData.householdNumber}
                  onChange={(e) => handleInputChange('householdNumber', parseInt(e.target.value))}
                />
              </FormControl>
              <FormControl fullWidth error={!!formErrors.ownerName}>
                <InputLabel>Ägarens namn</InputLabel>
                <OutlinedInput
                  label="Ägarens namn"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                />
              </FormControl>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth error={!!formErrors.email}>
                <InputLabel>E-postadress</InputLabel>
                <OutlinedInput
                  type="email"
                  label="E-postadress"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </FormControl>
              <FormControl fullWidth error={!!formErrors.phone}>
                <InputLabel>Telefonnummer</InputLabel>
                <OutlinedInput
                  label="Telefonnummer"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </FormControl>
            </Box>
            
            <FormControl fullWidth error={!!formErrors.address}>
              <InputLabel>Adress</InputLabel>
              <OutlinedInput
                label="Adress"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth error={!!formErrors.andelstal}>
                <InputLabel>Andelstal</InputLabel>
                <OutlinedInput
                  type="number"
                  label="Andelstal"
                  value={formData.andelstal}
                  onChange={(e) => handleInputChange('andelstal', parseFloat(e.target.value))}
                  inputProps={{ step: 0.01, min: 0, max: 1 }}
                />
              </FormControl>
              <FormControl fullWidth error={!!formErrors.annualMemberFee}>
                <InputLabel>Årsavgift (kr)</InputLabel>
                <OutlinedInput
                  type="number"
                  label="Årsavgift (kr)"
                  value={formData.annualMemberFee}
                  onChange={(e) => handleInputChange('annualMemberFee', parseFloat(e.target.value))}
                  inputProps={{ min: 0 }}
                />
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedHousehold(null);
            }}
          >
            Avbryt
          </Button>
          <Button
            onClick={() => handleFormSubmit(isEditDialogOpen)}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Sparar...' : (isCreateDialogOpen ? 'Skapa' : 'Spara')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setSelectedHousehold(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Hushåll #{selectedHousehold?.householdNumber} - {selectedHousehold?.ownerName}
        </DialogTitle>
        <DialogContent>
          {selectedHousehold && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    E-postadress
                  </Typography>
                  <Typography>{selectedHousehold.email || 'Ej angiven'}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Telefonnummer
                  </Typography>
                  <Typography>{selectedHousehold.phone || 'Ej angiven'}</Typography>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Adress
                </Typography>
                <Typography>{selectedHousehold.address || 'Ej angiven'}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Andelstal
                  </Typography>
                  <Typography>{(selectedHousehold.andelstal * 100).toFixed(2)}%</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Årsavgift
                  </Typography>
                  <Typography>{selectedHousehold.annualMemberFee.toLocaleString('sv-SE')} kr</Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedHousehold.isActive ? 'Aktiv' : 'Inaktiv'}
                    color={selectedHousehold.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Skapat
                  </Typography>
                  <Typography>
                    {new Date(selectedHousehold.createdAt).toLocaleDateString('sv-SE')}
                  </Typography>
                </Box>
              </Box>
              
              {selectedHousehold._count && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Kvartalsfakturor
                    </Typography>
                    <Typography>{selectedHousehold._count.quarterlyBills} st</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Månadsfakturor
                    </Typography>
                    <Typography>{selectedHousehold._count.monthlyBills} st</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsViewDialogOpen(false);
              setSelectedHousehold(null);
            }}
          >
            Stäng
          </Button>
          <Button
            onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedHousehold) {
                handleEditClick(selectedHousehold);
              }
            }}
            variant="contained"
            startIcon={<EditIcon />}
          >
            Redigera
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Households;
