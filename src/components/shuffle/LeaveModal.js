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

function LeaveModal({ open, onClose, roomId, socket, session }) {
  const { enqueueSnackbar } = useCustomSnackbar();

  const confirmLeaveRoom = () => {
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
