import React from 'react';
import { Box, Typography } from '@mui/material';

const Billing: React.FC = () => {
  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%',
        overflow: 'hidden',
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Typography variant="h4" gutterBottom>
        Fakturering
      </Typography>
      <Typography variant="body1">
        Kvartals- och månadsfakturering kommer att implementeras här.
      </Typography>
    </Box>
  );
};

export default Billing;
