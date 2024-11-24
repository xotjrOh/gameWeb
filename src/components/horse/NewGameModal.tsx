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

interface NewGameModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

function NewGameModal({
  open,
  onClose,
  roomId,
  socket,
  session,
}: NewGameModalProps) {
  const { enqueueSnackbar } = useCustomSnackbar();

  const confirmNewGame = () => {
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

    socket.emit('horse-new-game', { roomId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message, { variant: 'error' });
      } else {
        enqueueSnackbar('새 게임이 성공적으로 시작되었습니다.', {
          variant: 'success',
        });
        socket.emit(
          'horse-get-game-data',
          { roomId, sessionId: session.user.id },
          (response) => {
            if (!response.success) {
              enqueueSnackbar(response.message, { variant: 'error' });
            }
          }
        );
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>새 게임 시작</DialogTitle>
      <DialogContent>
        <DialogContentText>정말 새 게임을 시작하시겠습니까?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          취소
        </Button>
        <Button onClick={confirmNewGame} color="primary">
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default NewGameModal;
