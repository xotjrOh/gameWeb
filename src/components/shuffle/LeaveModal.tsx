import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { ClientSocketType } from '@/types/socket';
import { Session } from 'next-auth';

interface LeaveModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

function LeaveModal({
  open,
  onClose,
  roomId,
  socket,
  session,
}: LeaveModalProps) {
  const { enqueueSnackbar } = useCustomSnackbar();

  const confirmLeaveRoom = () => {
    if (!socket) {
      // socket 미연결
      enqueueSnackbar('연결이 되지 않았습니다. 새로고침해주세요', {
        variant: 'error',
      });
      return;
    }
    if (!session) {
      // socket 미연결
      enqueueSnackbar('로그인이 확인되지 않습니다.', {
        variant: 'error',
      });
      return;
    }
    socket.emit(
      'leave-room',
      { roomId, sessionId: session.user.id },
      (response) => {
        if (response.success) {
          enqueueSnackbar('방장이 방을 나갔습니다. 방이 종료되었습니다.', {
            variant: 'info',
          });
          onClose();
          window.location.replace('/');
        } else {
          enqueueSnackbar(response.message, { variant: 'error' });
        }
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>방 나가기</DialogTitle>
      <DialogContent>
        <DialogContentText>정말 방을 나가시겠습니까?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          취소
        </Button>
        <Button onClick={confirmLeaveRoom} color="primary">
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LeaveModal;
