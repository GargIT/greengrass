import React from 'react';
import { Box, Typography } from '@mui/material';

const Reports: React.FC = () => {
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
        Rapporter
      </Typography>
      <Typography variant="body1">
        Rapporter och analyser kommer att implementeras här.
      </Typography>
    </Box>
  );
};

export default Reports;
