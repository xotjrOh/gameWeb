'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateStatusInfo } from '@/store/horseSlice';
import {
  Box,
  Typography,
  IconButton,
  Modal,
  Button,
  Fade,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

export default function MyStatusButton({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [showStatus, setShowStatus] = useState(false);
  const { statusInfo } = useSelector((state) => state.horse.gameData);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (socket) {
      socket.on('status-update', (data) => {
        dispatch(updateStatusInfo(data));
      });

      return () => {
        socket.off('status-update');
      };
    }
  }, [roomId, socket?.id, session, dispatch]);

  const handleOpen = () => setShowStatus(true);
  const handleClose = () => setShowStatus(false);

  return (
    <Box>
      {/* 사람 모양 아이콘 버튼 */}
      <IconButton color="primary" onClick={handleOpen}>
        <PersonIcon />
      </IconButton>

      {/* 상태 모달 */}
      <Modal
        open={showStatus}
        onClose={handleClose}
        aria-labelledby="status-modal-title"
        aria-describedby="status-modal-description"
        closeAfterTransition
        slotProps={{
          backdrop:{
            timeout: 500,
          }
        }}
      >
        <Fade in={showStatus}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '80%' : 250,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 24,
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography
              id="status-modal-title"
              variant="h6"
              component="h2"
              color="primary"
              fontWeight="bold"
              mb={2}
            >
              내 상태
            </Typography>
            <Typography variant="body1" mb={1}>
              닉네임: {statusInfo?.name ?? '없음'}
            </Typography>
            <Typography variant="body1" mb={1}>
              익명 이름: {statusInfo?.dummyName ?? '없음'}
            </Typography>
            <Typography variant="body1" mb={1}>
              내 경주마: {statusInfo?.horse ?? '없음'}
            </Typography>
            <Typography variant="body1" mb={1}>
              남은 칩 개수: {statusInfo?.chips ?? 0}
            </Typography>
            {statusInfo?.isSolo && (
              <Typography variant="body2" color="textSecondary" mt={2}>
                당신은 팀원이 없는 솔로 플레이어입니다.<br/>
                당신에게는 2가지 혜택이 주어집니다.<br/>
                1. 예측으로 얻는 보상이 증가합니다.<br/> (2개 {'->'} 5개)<br/>
                2. '경주마'탭의 '라운드별 현황'에서<br/>
                혼자만 베팅 개수를 확인할 수 있습니다.
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleClose}
              sx={{ mt: 3 }}
            >
              닫기
            </Button>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}
