import { useState } from 'react';
import { Button, IconButton, Tooltip, Box, Grid2 as Grid } from '@mui/material';
import {
  Settings as SettingsIcon,
  AssignmentInd as AssignRolesIcon,
  PlayArrow as StartRoundIcon,
  Casino as NewGameIcon,
  ExitToApp as ExitIcon,
} from '@mui/icons-material';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import StartRoundModal from './StartRoundModal';
import SettingsModal from './SettingsModal';
import NewGameModal from './NewGameModal';
import LeaveModal from './LeaveModal';
import { Session } from 'next-auth';
import { ClientSocketType } from '@/types/socket';

interface AdminButtonsProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
  isRoundStarted: boolean;
  isTimeover: boolean;
}

interface ModalsState {
  startRound: boolean;
  settings: boolean;
  newGame: boolean;
  leave: boolean;
}

type ModalType = keyof ModalsState;

function AdminButtons({
  roomId,
  socket,
  session,
  isRoundStarted,
  isTimeover,
}: AdminButtonsProps) {
  const { enqueueSnackbar } = useCustomSnackbar();
  const [modals, setModals] = useState<ModalsState>({
    startRound: false,
    settings: false,
    newGame: false,
    leave: false,
  });

  const openModal = (type: ModalType) => {
    if (type === 'settings' && isRoundStarted) {
      enqueueSnackbar('라운드가 시작된 후에는 설정을 변경할 수 없습니다.', {
        variant: 'error',
      });
      return;
    }

    if (type === 'startRound' && !isTimeover) {
      enqueueSnackbar('현재 라운드가 진행 중입니다.', { variant: 'error' });
      return;
    }

    setModals((prev) => ({ ...prev, [type]: true }));
  };

  const closeModal = (type: ModalType) => {
    setModals((prev) => ({ ...prev, [type]: false }));
  };

  const assignRoles = () => {
    if (isRoundStarted) {
      enqueueSnackbar('라운드가 시작된 후에는 역할을 할당할 수 없습니다.', {
        variant: 'error',
      });
      return;
    }

    if (!socket) {
      // socket 미연결
      enqueueSnackbar('연결이 되지 않았습니다. 새로고침해주세요', {
        variant: 'error',
      });
      return;
    }

    socket.emit('horse-assign-roles', { roomId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message, { variant: 'error' });
      } else {
        enqueueSnackbar('성공적으로 역할이 할당되었습니다.', {
          variant: 'success',
        });
      }
    });
  };

  return (
    <Box mt={2} mb={4}>
      <Box>{session ? session.user.id : ''}</Box>
      <Grid
        container
        spacing={2}
        justifyContent="space-between"
        alignItems="center"
      >
        <Grid size={{ xs: 12, sm: 3 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => openModal('settings')}
            disabled={isRoundStarted}
            startIcon={<SettingsIcon />}
          >
            설정
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={assignRoles}
            disabled={isRoundStarted}
            startIcon={<AssignRolesIcon />}
          >
            역할 할당
          </Button>
        </Grid>

        <Grid size={{ xs: 12, sm: 3 }}>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={() => openModal('startRound')}
            disabled={!isTimeover}
            startIcon={<StartRoundIcon />}
          >
            라운드 시작
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={() => openModal('newGame')}
            startIcon={<NewGameIcon />}
          >
            새 게임
          </Button>
        </Grid>

        <Grid size={{ xs: 12 }} style={{ textAlign: 'right' }}>
          <Tooltip title="나가기">
            <IconButton
              onClick={() => openModal('leave')}
              color="error"
              size="large"
            >
              <ExitIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>

      {/* 모달 컴포넌트 */}
      <StartRoundModal
        open={modals.startRound}
        onClose={() => closeModal('startRound')}
        roomId={roomId}
        socket={socket}
      />

      <SettingsModal
        open={modals.settings}
        onClose={() => closeModal('settings')}
        roomId={roomId}
        socket={socket}
      />

      <NewGameModal
        open={modals.newGame}
        onClose={() => closeModal('newGame')}
        roomId={roomId}
        socket={socket}
        session={session}
      />

      <LeaveModal
        open={modals.leave}
        onClose={() => closeModal('leave')}
        roomId={roomId}
        socket={socket}
        session={session}
      />
    </Box>
  );
}

export default AdminButtons;
