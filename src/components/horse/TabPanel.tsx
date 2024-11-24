import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface TabPanelProps extends BoxProps {
  children?: React.ReactNode;
  index: string;
  value: string;
}

export default function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      sx={{ width: '100%' }}
    >
      {children}
    </Box>
  );
}
