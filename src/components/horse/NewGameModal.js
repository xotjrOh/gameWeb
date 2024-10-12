import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

function NewGameModal({ open, onClose, roomId, socket, session }) {
  const { enqueueSnackbar } = useCustomSnackbar();

  const confirmNewGame = () => {
    socket.emit('horse-new-game', { roomId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message, { variant: 'error' });
      } else {
        enqueueSnackbar('새 게임이 성공적으로 시작되었습니다.', { variant: 'success' });
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
        <DialogContentText>
          정말 새 게임을 시작하시겠습니까?
        </DialogContentText>
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
