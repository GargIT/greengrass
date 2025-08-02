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
  MenuItem,
  Select,
  FormHelperText,
  Switch,
  FormControlLabel,
  InputAdornment,
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
  Water as WaterIcon,
  Bolt as ElectricityIcon,
  Whatshot as HeatingIcon,
  Wifi as InternetIcon,
} from '@mui/icons-material';

interface UtilityService {
  id: string;
  name: string;
  description?: string;
  unit: string;
  unitPrice: number;
  serviceType: 'WATER' | 'ELECTRICITY' | 'HEATING' | 'INTERNET' | 'OTHER';
  isActive: boolean;
  isMandatory: boolean;
  billingFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  createdAt: string;
  _count?: {
    householdMeters: number;
  };
}

interface ServiceFormData {
  name: string;
  description?: string;
  unit: string;
  unitPrice?: number;
  serviceType: string;
  isActive: boolean;
  isMandatory: boolean;
  billingFrequency: string;
}

const serviceTypeIcons = {
  WATER: <WaterIcon />,
  ELECTRICITY: <ElectricityIcon />,
  HEATING: <HeatingIcon />,
  INTERNET: <InternetIcon />,
  OTHER: <AddIcon />,
};

const serviceTypeLabels = {
  WATER: 'Vatten',
  ELECTRICITY: 'El',
  HEATING: 'Värme',
  INTERNET: 'Internet',
  OTHER: 'Övrigt',
};

const billingFrequencyLabels = {
  MONTHLY: 'Månatlig',
  QUARTERLY: 'Kvartalsvis',
  ANNUALLY: 'Årlig',
};

const UtilityServices: React.FC = () => {
  const [services, setServices] = useState<UtilityService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<UtilityService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    unit: '',
    unitPrice: 0,
    serviceType: 'WATER',
    isActive: true,
    isMandatory: false,
    billingFrequency: 'QUARTERLY',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'serviceType',
      headerName: 'Typ',
      flex: 0.4,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title={serviceTypeLabels[params.value as keyof typeof serviceTypeLabels]}>
          <Box display="flex" justifyContent="center" color="action.active">
            {serviceTypeIcons[params.value as keyof typeof serviceTypeIcons]}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'name',
      headerName: 'Tjänst',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">{params.value}</Typography>
          {params.row.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {params.row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'unit',
      headerName: 'Enhet',
      flex: 0.5,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'unitPrice',
      headerName: 'Pris/Enhet',
      flex: 0.7,
      minWidth: 100,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value?.toLocaleString('sv-SE', { 
            style: 'currency', 
            currency: 'SEK',
            minimumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      field: 'billingFrequency',
      headerName: 'Fakturering',
      flex: 0.8,
      minWidth: 110,
      renderCell: (params) => (
        <Chip
          label={billingFrequencyLabels[params.value as keyof typeof billingFrequencyLabels]}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Box display="flex" gap={0.5}>
          <Chip
            label={params.row.isActive ? 'Aktiv' : 'Inaktiv'}
            color={params.row.isActive ? 'success' : 'default'}
            size="small"
          />
          {params.row.isMandatory && (
            <Chip
              label="Obligatorisk"
              color="warning"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      ),
    },
    {
      field: 'householdCount',
      headerName: 'Hushåll',
      flex: 0.5,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row._count?.householdMeters || 0}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Åtgärder',
      flex: 0.6,
      minWidth: 120,
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

  // Fetch services
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/utility-services', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        setServices(result.data);
      } else {
        setError('Failed to fetch utility services');
      }
    } catch (err) {
      setError('Network error while fetching services');
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unit: '',
      unitPrice: 0,
      serviceType: 'WATER',
      isActive: true,
      isMandatory: false,
      billingFrequency: 'QUARTERLY',
    });
    setFormErrors({});
  };

  const handleCreateClick = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEditClick = (service: UtilityService) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      unit: service.unit,
      unitPrice: service.unitPrice,
      serviceType: service.serviceType,
      isActive: service.isActive,
      isMandatory: service.isMandatory,
      billingFrequency: service.billingFrequency,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleViewClick = (service: UtilityService) => {
    setSelectedService(service);
    setIsViewDialogOpen(true);
  };

  const handleFormSubmit = async (isEdit: boolean) => {
    setSubmitting(true);
    setFormErrors({});

    try {
      const url = isEdit ? `/api/utility-services/${selectedService?.id}` : '/api/utility-services';
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
        await fetchServices();
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setSelectedService(null);
      } else {
        if (result.errors) {
          setFormErrors(result.errors);
        } else {
          setError(result.message || 'Failed to save service');
        }
      }
    } catch (err) {
      setError('Network error while saving service');
      console.error('Error saving service:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ServiceFormData, value: string | number | boolean) => {
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
          Tjänstehantering
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Lägg till tjänst
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0, mx: { xs: 2, sm: 3, md: 4 } }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Services DataGrid */}
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
          rows={services}
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
          setSelectedService(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isCreateDialogOpen ? 'Lägg till ny tjänst' : 'Redigera tjänst'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth error={!!formErrors.name}>
                <InputLabel>Tjänstens namn</InputLabel>
                <OutlinedInput
                  label="Tjänstens namn"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
                {formErrors.name && <FormHelperText>{formErrors.name}</FormHelperText>}
              </FormControl>
              <FormControl fullWidth error={!!formErrors.serviceType}>
                <InputLabel>Typ av tjänst</InputLabel>
                <Select
                  label="Typ av tjänst"
                  value={formData.serviceType}
                  onChange={(e) => handleInputChange('serviceType', e.target.value)}
                >
                  {Object.entries(serviceTypeLabels).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {serviceTypeIcons[key as keyof typeof serviceTypeIcons]}
                        {label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.serviceType && <FormHelperText>{formErrors.serviceType}</FormHelperText>}
              </FormControl>
            </Box>
            
            <FormControl fullWidth error={!!formErrors.description}>
              <InputLabel>Beskrivning (valfri)</InputLabel>
              <OutlinedInput
                label="Beskrivning (valfri)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={2}
              />
              {formErrors.description && <FormHelperText>{formErrors.description}</FormHelperText>}
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth error={!!formErrors.unit}>
                <InputLabel>Mätenhet</InputLabel>
                <OutlinedInput
                  label="Mätenhet"
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  placeholder="t.ex. m³, kWh, st"
                />
                {formErrors.unit && <FormHelperText>{formErrors.unit}</FormHelperText>}
              </FormControl>
              <FormControl fullWidth error={!!formErrors.unitPrice}>
                <InputLabel>Pris per enhet</InputLabel>
                <OutlinedInput
                  type="number"
                  label="Pris per enhet"
                  value={formData.unitPrice}
                  onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value))}
                  inputProps={{ min: 0, step: 0.01 }}
                  endAdornment={<InputAdornment position="end">kr</InputAdornment>}
                />
                {formErrors.unitPrice && <FormHelperText>{formErrors.unitPrice}</FormHelperText>}
              </FormControl>
            </Box>
            
            <FormControl fullWidth error={!!formErrors.billingFrequency}>
              <InputLabel>Faktureringsfrekvens</InputLabel>
              <Select
                label="Faktureringsfrekvens"
                value={formData.billingFrequency}
                onChange={(e) => handleInputChange('billingFrequency', e.target.value)}
              >
                {Object.entries(billingFrequencyLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.billingFrequency && <FormHelperText>{formErrors.billingFrequency}</FormHelperText>}
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  />
                }
                label="Tjänst aktiv"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isMandatory}
                    onChange={(e) => handleInputChange('isMandatory', e.target.checked)}
                  />
                }
                label="Obligatorisk för alla hushåll"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedService(null);
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
          setSelectedService(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {selectedService && serviceTypeIcons[selectedService.serviceType]}
            {selectedService?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedService && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Typ av tjänst
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  {serviceTypeIcons[selectedService.serviceType]}
                  <Typography>{serviceTypeLabels[selectedService.serviceType]}</Typography>
                </Box>
              </Box>
              
              {selectedService.description && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Beskrivning
                  </Typography>
                  <Typography>{selectedService.description}</Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Mätenhet
                  </Typography>
                  <Typography>{selectedService.unit}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Pris per enhet
                  </Typography>
                  <Typography>
                    {selectedService.unitPrice.toLocaleString('sv-SE', {
                      style: 'currency',
                      currency: 'SEK',
                      minimumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Faktureringsfrekvens
                </Typography>
                <Typography>{billingFrequencyLabels[selectedService.billingFrequency]}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Chip
                      label={selectedService.isActive ? 'Aktiv' : 'Inaktiv'}
                      color={selectedService.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    {selectedService.isMandatory && (
                      <Chip
                        label="Obligatorisk"
                        color="warning"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Antal hushåll
                  </Typography>
                  <Typography>{selectedService._count?.householdMeters || 0} st</Typography>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Skapad
                </Typography>
                <Typography>
                  {new Date(selectedService.createdAt).toLocaleDateString('sv-SE')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsViewDialogOpen(false);
              setSelectedService(null);
            }}
          >
            Stäng
          </Button>
          <Button
            onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedService) {
                handleEditClick(selectedService);
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

export default UtilityServices;
