import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { useSelector } from 'react-redux';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

export default function GameStatusButton({ roomId, socket, session }) {
  const { statusInfo } = useSelector((state) => state.shuffle);

  return (
    <Tooltip title={statusInfo.isAlive ? '생존' : '탈락'}>
      <IconButton color={statusInfo.isAlive ? 'primary' : 'default'}>
        {statusInfo.isAlive ? <CheckCircleIcon /> : <CancelIcon />}
      </IconButton>
    </Tooltip>
  );
}
