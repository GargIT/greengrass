import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'MEMBER';
  allowedRoles?: ('ADMIN' | 'MEMBER')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles 
}) => {
  // Get user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Du måste vara inloggad för att komma åt denna sida.
        </Alert>
      </Box>
    );
  }

  // Check if user has required role
  if (requiredRole && user.role !== requiredRole) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>
            Åtkomst nekad
          </Typography>
          <Typography>
            Du har inte behörighet att komma åt denna sida. 
            {requiredRole === 'ADMIN' 
              ? ' Endast administratörer kan komma åt denna sida.' 
              : ' Endast medlemmar kan komma åt denna sida.'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Check if user has one of the allowed roles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>
            Åtkomst nekad
          </Typography>
          <Typography>
            Du har inte behörighet att komma åt denna sida.
            Tillåtna roller: {allowedRoles.join(', ')}.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
