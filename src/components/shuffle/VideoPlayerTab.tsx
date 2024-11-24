import React, { useRef, useState, useMemo, memo } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Collapse,
  Tooltip,
  IconButton,
  Divider,
  SelectChangeEvent,
} from '@mui/material';
import YouTube, { YouTubeProps } from 'react-youtube';
import { videoDataList } from '@/utils/constants';
import ExitIcon from '@mui/icons-material/ExitToApp';
import LeaveModal from './LeaveModal';
import { ClientSocketType } from '@/types/socket';
import { Session } from 'next-auth';

interface ClipWithId {
  start: number;
  end: number;
  id: string;
}

interface ModalsState {
  leave: boolean;
}

interface VideoPlayerTabProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

function VideoPlayerTab({ roomId, socket, session }: VideoPlayerTabProps) {
  const [selectedVideoKey, setSelectedVideoKey] = useState<string>('');
  const [clips, setClips] = useState<ClipWithId[]>([]);
  const youtubeRef = useRef<YouTube['internalPlayer'] | null>(null);
  const [originIds, setOriginIds] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [disableAnimation, setDisableAnimation] = useState<boolean>(false);
  const [modals, setModals] = useState<ModalsState>({
    leave: false,
  });

  const openModal = (type: keyof ModalsState) => {
    setModals((prev) => ({ ...prev, [type]: true }));
  };

  const closeModal = (type: keyof ModalsState) => {
    setModals((prev) => ({ ...prev, [type]: false }));
  };

  const sortedDifficulties = ['하', '중', '상'];

  // groupedVideos 메모이제이션
  const groupedVideos = useMemo(() => {
    return Object.keys(videoDataList).reduce(
      (acc: Record<string, string[]>, key) => {
        const difficulty = videoDataList[key].difficulty;
        if (!acc[difficulty]) {
          acc[difficulty] = [];
        }
        acc[difficulty].push(key);
        return acc;
      },
      {}
    );
  }, [videoDataList]);

  // menuItems 메모이제이션
  const menuItems = useMemo(() => {
    const items: React.ReactNode[] = [];

    sortedDifficulties.forEach((difficulty, index) => {
      // 난이도 헤더 추가
      items.push(
        <MenuItem key={`header-${difficulty}`} disabled>
          <Typography variant="subtitle2" color="textSecondary">
            {`난이도 ${difficulty}`}
          </Typography>
        </MenuItem>
      );

      // 해당 난이도의 비디오 목록 추가
      groupedVideos[difficulty]?.forEach((key) => {
        items.push(
          <MenuItem key={key} value={key}>
            {key}
          </MenuItem>
        );
      });

      // 난이도 그룹 사이에 Divider 추가
      if (index < sortedDifficulties.length - 1) {
        items.push(<Divider key={`divider-${index}`} />);
      }
    });

    return items;
  }, [groupedVideos, sortedDifficulties]);

  // 비디오 선택 시 처리
  const handleVideoSelect = (event: SelectChangeEvent) => {
    // 정답 숨기기 (애니메이션 없이)
    setDisableAnimation(true);
    setShowAnswer(false);

    const key = event.target.value;
    setSelectedVideoKey(key);
    youtubeRef.current?.stopVideo();

    if (videoDataList[key]) {
      const videoData = videoDataList[key];

      // 클립에 랜덤한 id 부여
      const ids = Array.from({ length: videoData.clips.length }, (_, i) =>
        String.fromCharCode(65 + i)
      );
      setOriginIds(ids);
      const shuffledIds = [...ids].sort(() => Math.random() - 0.5);
      setAnswer(shuffledIds);
      const clipsWithId = videoData.clips.map((clip, index) => ({
        ...clip,
        id: shuffledIds[index],
      }));

      setClips(clipsWithId);
    }
  };

  const onReady: YouTubeProps['onReady'] = (event) => {
    youtubeRef.current = event.target;
  };

  const handlePlayClip = (id: string) => {
    const clip = clips.find((clip) => clip.id === id);
    if (!clip) return;

    if (youtubeRef.current) {
      youtubeRef.current.loadVideoById({
        videoId: videoDataList?.[selectedVideoKey]?.videoId,
        startSeconds: clip.start,
        endSeconds: clip.end,
      });

      // 전체 화면으로 전환
      const iframe = youtubeRef.current.getIframe();
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.mozRequestFullScreen) {
        iframe.mozRequestFullScreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) {
        iframe.msRequestFullscreen();
      }
    }
  };

  const handlePlayFullVideo = () => {
    if (youtubeRef.current) {
      youtubeRef.current.loadVideoById({
        videoId: videoDataList?.[selectedVideoKey]?.videoId,
        startSeconds: videoDataList?.[selectedVideoKey]?.full.start,
        endSeconds: videoDataList?.[selectedVideoKey]?.full.end,
      });

      // 전체 화면으로 전환
      const iframe = youtubeRef.current.getIframe();
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.mozRequestFullScreen) {
        iframe.mozRequestFullScreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) {
        iframe.msRequestFullscreen();
      }
    }
  };

  const handleVideoEnd = () => {
    // 재생 종료 시 전체 화면 해제
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
    youtubeRef.current?.stopVideo();
  };

  return (
    <Box
      sx={{
        width: '100%',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 비디오 선택 박스 */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="video-select-label">비디오 선택</InputLabel>
        <Select
          labelId="video-select-label"
          value={selectedVideoKey}
          label="비디오 선택"
          onChange={handleVideoSelect}
          renderValue={(selected) =>
            selected ? (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography>{selected}</Typography>
                <Typography variant="body2" color="textSecondary">
                  난이도: {videoDataList[selected]?.difficulty}
                </Typography>
              </Box>
            ) : (
              '비디오 선택'
            )
          }
        >
          {menuItems}
        </Select>
      </FormControl>

      {/* 정답 보기/숨기기 버튼과 나가기 버튼 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Button onClick={() => setShowAnswer(!showAnswer)}>
          {showAnswer ? '정답 숨기기' : '정답 보기'}
        </Button>
        <Tooltip title="나가기">
          <IconButton
            onClick={() => openModal('leave')}
            color="error"
            size="large"
          >
            <ExitIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 정답 표시 */}
      <Collapse
        in={showAnswer}
        timeout={disableAnimation ? 0 : undefined}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">정답: {answer.join(', ')}</Typography>
      </Collapse>

      {/* 버튼 그룹 */}
      {clips.length > 0 && (
        <ButtonGroup variant="contained" color="primary" sx={{ mb: 2 }}>
          {originIds.map((id) => (
            <Button key={id} onClick={() => handlePlayClip(id)}>
              {id}
            </Button>
          ))}
          <Button key={'전체재생'} onClick={() => handlePlayFullVideo()}>
            전체재생
          </Button>
        </ButtonGroup>
      )}

      {/* YouTube 플레이어 */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          flexGrow: 1,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <YouTube
            videoId={videoDataList?.[selectedVideoKey]?.videoId}
            opts={{
              playerVars: {
                autoplay: 0,
                controls: 0,
                modestbranding: 1,
              },
              width: '100%',
              height: '100%',
            }}
            onReady={onReady}
            onEnd={handleVideoEnd}
          />
        </Box>
      </Box>

      {/* 나가기 모달 */}
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

export default memo(VideoPlayerTab);
