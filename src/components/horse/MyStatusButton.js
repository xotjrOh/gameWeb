'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setStatusInfo } from '@/store/horseSlice';
import {
  Box,
  Typography,
  IconButton,
  Modal,
  Fade,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

export default function MyStatusButton({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [showStatus, setShowStatus] = useState(false);
  const { statusInfo } = useSelector((state) => state.horse);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (socket) {
      socket.on('status-update', (data) => {
        dispatch(setStatusInfo(data));
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
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={showStatus}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile && statusInfo?.isSolo ? '80%' : 250,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 24,
              p: 4,
              textAlign: 'left',
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
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon color="primary" sx={{ mr: 1 }} />내 상태
              </Box>
            </Typography>
            <IconButton
              sx={{ position: 'absolute', top: 16, right: 16 }}
              onClick={handleClose}
            >
              <CancelIcon />
            </IconButton>
            <Box sx={{ display: 'flex', mb: 1 }}>
              <Typography
                variant="body1"
                fontWeight="bold"
                color="textPrimary"
                sx={{ flex: '0 0 120px' }}
              >
                닉네임
              </Typography>
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ flex: 1 }}
              >
                {statusInfo?.name ?? '없음'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', mb: 1 }}>
              <Typography
                variant="body1"
                fontWeight="bold"
                color="textPrimary"
                sx={{ flex: '0 0 120px' }}
              >
                익명 이름
              </Typography>
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ flex: 1 }}
              >
                {statusInfo?.dummyName ?? '없음'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', mb: 1 }}>
              <Typography
                variant="body1"
                fontWeight="bold"
                color="textPrimary"
                sx={{ flex: '0 0 120px' }}
              >
                내 경주마
              </Typography>
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ flex: 1 }}
              >
                {statusInfo?.horse ?? '없음'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', mb: 1 }}>
              <Typography
                variant="body1"
                fontWeight="bold"
                color="textPrimary"
                sx={{ flex: '0 0 120px' }}
              >
                남은 칩 개수
              </Typography>
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ flex: 1 }}
              >
                {statusInfo?.chips ?? 0}
              </Typography>
            </Box>
            {statusInfo?.isSolo && (
              <Typography variant="body2" color="textSecondary" mt={2}>
                당신은 팀원이 없는 솔로 플레이어입니다.
                <br />
                당신에게는 2가지 혜택이 주어집니다.
                <br />
                1. 예측으로 얻는 보상이 증가합니다.
                <br /> (2개 {'->'} 5개)
                <br />
                2. ‘경주마’탭의 ‘라운드별 현황’에서
                <br />
                혼자만 베팅 개수를 확인할 수 있습니다.
              </Typography>
            )}
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}
