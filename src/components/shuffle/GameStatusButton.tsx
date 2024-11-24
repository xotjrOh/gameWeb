import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { useAppSelector } from '@/hooks/useAppSelector';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { ClientSocketType } from '@/types/socket';
import { Session } from 'next-auth';

interface GameStatusButtonProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

export default function GameStatusButton({
  roomId,
  socket,
  session,
}: GameStatusButtonProps) {
  const { statusInfo } = useAppSelector((state) => state.shuffle);

  return (
    <Tooltip title={statusInfo.isAlive ? '생존' : '탈락'}>
      <IconButton color={statusInfo.isAlive ? 'primary' : 'default'}>
        {statusInfo.isAlive ? <CheckCircleIcon /> : <CancelIcon />}
      </IconButton>
    </Tooltip>
  );
}
