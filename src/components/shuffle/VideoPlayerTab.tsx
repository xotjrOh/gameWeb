'use client';

import React, {
  useRef,
  useState,
  useMemo,
  memo,
  useCallback,
  useEffect,
} from 'react';
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
  Stack,
  GlobalStyles,
} from '@mui/material';
import YouTube, { YouTubeProps } from 'react-youtube';
import ExitIcon from '@mui/icons-material/ExitToApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';

import LeaveModal from './LeaveModal';
import { videoDataList } from '@/utils/constants';
import { ClientSocketType } from '@/types/socket';
import { Session } from 'next-auth';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

/** react-youtube의 target이 구현하는 최소 API */
interface YTPlayer {
  loadVideoById(opts: {
    videoId: string;
    startSeconds?: number;
    endSeconds?: number;
  }): void;
  stopVideo(): void;
  getIframe(): HTMLIFrameElement;
  /** 중요: 리사이즈 강제 */
  setSize(width: number, height: number): void;
}

interface FullscreenableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}
type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => void;
  msExitFullscreen?: () => Promise<void>;

  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
};
interface ClipWithId {
  start: number;
  end: number;
  id: string; // A/B/C/D...
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
  const [originIds, setOriginIds] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [disableAnimation, setDisableAnimation] = useState<boolean>(false);
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(null);
  const [modals, setModals] = useState<ModalsState>({ leave: false });

  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const answerWinRef = useRef<Window | null>(null);
  const { enqueueSnackbar } = useCustomSnackbar();

  const openModal = (type: keyof ModalsState) =>
    setModals((prev) => ({ ...prev, [type]: true }));
  const closeModal = (type: keyof ModalsState) =>
    setModals((prev) => ({ ...prev, [type]: false }));

  const sortedDifficulties = ['하', '중', '상'];

  const groupedVideos = useMemo(() => {
    return Object.keys(videoDataList).reduce(
      (acc: Record<string, string[]>, key) => {
        const difficulty = videoDataList[key].difficulty;
        if (!acc[difficulty]) acc[difficulty] = [];
        acc[difficulty].push(key);
        return acc;
      },
      {}
    );
  }, []);

  const menuItems = useMemo(() => {
    const items: React.ReactNode[] = [];
    sortedDifficulties.forEach((difficulty, index) => {
      items.push(
        <MenuItem key={`header-${difficulty}`} disabled>
          <Typography variant="subtitle2" color="textSecondary">
            {`난이도 ${difficulty}`}
          </Typography>
        </MenuItem>
      );
      groupedVideos[difficulty]?.forEach((key) => {
        items.push(
          <MenuItem key={key} value={key}>
            {key}
          </MenuItem>
        );
      });
      if (index < sortedDifficulties.length - 1) {
        items.push(<Divider key={`divider-${index}`} />);
      }
    });
    return items;
  }, [groupedVideos, sortedDifficulties]);

  /** 현재 문서 풀스크린 여부 */
  const isFullscreen = (): boolean => {
    const d = document as FullscreenDocument;
    return Boolean(
      document.fullscreenElement ||
        d.webkitFullscreenElement ||
        d.mozFullScreenElement ||
        d.msFullscreenElement
    );
  };

  /** 컨테이너 풀스크린 (오버레이 유지) */
  const enterContainerFullscreen = async (): Promise<boolean> => {
    const el = containerRef.current as FullscreenableElement | null;
    if (!el) return false;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return true;
      }
      if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        return true;
      }
      if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
        return true;
      }
      if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
        return true;
      }
    } catch {
      // ignore → iframe FS 폴백
    }
    return false;
  };

  /** iframe 풀스크린 (예전 동작과 완전히 동일) */
  const enterIframeFullscreen = async (): Promise<boolean> => {
    const iframe = playerRef.current?.getIframe() as
      | FullscreenableElement
      | undefined;
    if (!iframe) return false;
    try {
      if (iframe.requestFullscreen) {
        await iframe.requestFullscreen();
        return true;
      }
      if (iframe.webkitRequestFullscreen) {
        await iframe.webkitRequestFullscreen();
        return true;
      }
      if (iframe.mozRequestFullScreen) {
        await iframe.mozRequestFullScreen();
        return true;
      }
      if (iframe.msRequestFullscreen) {
        await iframe.msRequestFullscreen();
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  /** 컨테이너 → 실패 시 iframe 순으로 시도 */
  const enterFullscreenSmart = useCallback(async () => {
    const ok = await enterContainerFullscreen();
    if (!ok) await enterIframeFullscreen();
    // 크기 강제 갱신 (컨테이너/iframe 모두에 도움됨)
    forceResizePlayer();
  }, []);

  const exitFullscreen = async (): Promise<void> => {
    const d = document as FullscreenDocument;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }
      if (d.webkitExitFullscreen) {
        await d.webkitExitFullscreen();
        return;
      }
      if (d.mozCancelFullScreen) {
        await d.mozCancelFullScreen();
        return;
      }
      if (d.msExitFullscreen) {
        await d.msExitFullscreen();
        return;
      }
    } catch {
      // ignore
    }
  };

  /** ▶ 핵심: 플레이어 크기 강제 갱신 */
  const forceResizePlayer = useCallback(() => {
    const p = playerRef.current;
    const box = containerRef.current;
    if (!p || !box) return;

    // 컨테이너의 실제 크기를 기준으로 setSize
    const rect = box.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    try {
      p.setSize(w, h);
    } catch {
      // 혹시 setSize가 없어도 iframe 크기를 직접 조정
      const iframe = p.getIframe();
      iframe.style.width = `${w}px`;
      iframe.style.height = `${h}px`;
    }
  }, []);

  // 전체화면 변경/윈도 리사이즈 때마다 크기 보정
  useEffect(() => {
    const onFsChange = () => {
      // 레이아웃 안정화 후 보정
      setTimeout(forceResizePlayer, 50);
    };
    const onResize = () => forceResizePlayer();

    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('resize', onResize);
    };
  }, [forceResizePlayer]);

  // 비디오 선택
  const handleVideoSelect = (event: SelectChangeEvent) => {
    setDisableAnimation(true);
    setShowAnswer(false);
    setNowPlayingId(null);

    const key = event.target.value;
    setSelectedVideoKey(key);
    playerRef.current?.stopVideo();

    if (videoDataList[key]) {
      const videoData = videoDataList[key];
      const ids = Array.from({ length: videoData.clips.length }, (_, i) =>
        String.fromCharCode(65 + i)
      ); // A,B,C,D...
      setOriginIds(ids);

      const shuffled = [...ids].sort(() => Math.random() - 0.5);
      setAnswer(shuffled);

      const clipsWithId = videoData.clips.map((clip, index) => ({
        ...clip,
        id: shuffled[index],
      }));
      setClips(clipsWithId);

      if (socket) {
        socket.emit(
          'shuffle-start-game',
          {
            roomId,
            settings: {
              clips: clipsWithId,
              correctOrder: shuffled,
              difficulty: videoData.difficulty,
              currentPhase: 'answering',
            },
          },
          (response) => {
            if (!response.success) {
              enqueueSnackbar(response.message ?? '게임 시작에 실패했습니다.', {
                variant: 'error',
              });
            }
          }
        );
      } else {
        enqueueSnackbar('소켓 연결이 필요합니다.', { variant: 'error' });
      }
    }
  };

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target as unknown as YTPlayer;
    // 초기에도 크기 보정
    setTimeout(forceResizePlayer, 0);
  };

  const handlePlayClip = (id: string) => {
    const clip = clips.find((c) => c.id === id);
    if (!clip || !playerRef.current) return;

    setNowPlayingId(id);
    playerRef.current.loadVideoById({
      videoId: videoDataList?.[selectedVideoKey]?.videoId,
      startSeconds: clip.start,
      endSeconds: clip.end,
    });

    void enterFullscreenSmart();
  };

  const handlePlayFullVideo = () => {
    if (!playerRef.current) return;

    setNowPlayingId(null);
    playerRef.current.loadVideoById({
      videoId: videoDataList?.[selectedVideoKey]?.videoId,
      startSeconds: videoDataList?.[selectedVideoKey]?.full.start,
      endSeconds: videoDataList?.[selectedVideoKey]?.full.end,
    });

    void enterFullscreenSmart();
  };

  const handleVideoEnd = () => {
    setNowPlayingId(null);
    if (isFullscreen()) void exitFullscreen();
    playerRef.current?.stopVideo();
  };

  const onStateChange: YouTubeProps['onStateChange'] = (e) => {
    // 0 = ENDED
    if (e.data === 0) handleVideoEnd();
  };

  /** 관리자 전용: 정답 팝업 */
  const openAnswerWindow = () => {
    if (answerWinRef.current && !answerWinRef.current.closed) {
      answerWinRef.current.focus();
      return;
    }
    const w = window.open(
      '',
      'shuffle-answer-peek',
      'width=420,height=260,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no'
    );
    if (!w) return;
    answerWinRef.current = w;
    renderAnswerWindow();
  };
  const closeAnswerWindow = () => {
    if (answerWinRef.current && !answerWinRef.current.closed) {
      answerWinRef.current.close();
      answerWinRef.current = null;
    }
  };
  const renderAnswerWindow = () => {
    const w = answerWinRef.current;
    if (!w) return;
    const html = `
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>정답 미리보기</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body{margin:0;padding:0;background:#0b1220;color:#e6f0ff;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Apple SD Gothic Neo,Malgun Gothic,sans-serif}
  .wrap{padding:16px 18px}
  .title{font-size:14px;opacity:.8;margin-bottom:8px}
  .answer{font-size:28px;font-weight:800;letter-spacing:4px}
  .muted{font-size:12px;opacity:.6;margin-top:10px}
  .row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  button{background:#1f6feb;color:#fff;border:0;padding:6px 12px;border-radius:8px;cursor:pointer}
</style>
</head>
<body>
  <div class="wrap">
    <div class="row">
      <div class="title">현재 정답</div>
      <button onclick="window.close()">닫기</button>
    </div>
    <div id="answer" class="answer">${answer.join(', ') || '-'}</div>
    <div class="muted">※ 이 창은 관객 화면과 분리된 관리자 전용 미리보기입니다.</div>
  </div>
</body>
</html>
`.trim();
    w.document.open();
    w.document.write(html);
    w.document.close();
  };
  useEffect(() => {
    renderAnswerWindow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer.join(', ')]);

  return (
    <Box
      sx={{
        width: '100%',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 전체화면 시 레이아웃이 잘 채워지도록 보정 */}
      <GlobalStyles
        styles={{
          '.fs-container:fullscreen': {
            width: '100vw',
            height: '100vh',
            margin: 0,
          },
          '.fs-container:-webkit-full-screen': {
            width: '100vw',
            height: '100vh',
            margin: 0,
          },
          '.fs-container:-moz-full-screen': {
            width: '100vw',
            height: '100vh',
            margin: 0,
          },
          '.fs-container:-ms-fullscreen': {
            width: '100vw',
            height: '100vh',
            margin: 0,
          },
        }}
      />

      {/* 비디오 선택 */}
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

      {/* 상단 컨트롤 */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1}>
          <Button onClick={() => setShowAnswer((v) => !v)}>
            {showAnswer ? '정답 숨기기' : '정답 보기'}
          </Button>
          <Tooltip title="정답 미리보기 창(관리자용)">
            <Button startIcon={<VisibilityIcon />} onClick={openAnswerWindow}>
              미리보기 창
            </Button>
          </Tooltip>
          {answerWinRef.current && !answerWinRef.current.closed && (
            <Tooltip title="정답 미리보기 창 닫기">
              <IconButton onClick={closeAnswerWindow} color="default">
                <CloseIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Tooltip title="나가기">
          <IconButton
            onClick={() => openModal('leave')}
            color="error"
            size="large"
          >
            <ExitIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* 정답 표시(관객 화면에도 보임) */}
      <Collapse
        in={showAnswer}
        timeout={disableAnimation ? 0 : undefined}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">정답: {answer.join(', ') || '-'}</Typography>
      </Collapse>

      {/* A/B/C/D + 전체재생 */}
      {clips.length > 0 && (
        <ButtonGroup variant="contained" color="primary" sx={{ mb: 2 }}>
          {originIds.map((id) => (
            <Button key={id} onClick={() => handlePlayClip(id)}>
              {id}
            </Button>
          ))}
          <Button key="전체재생" onClick={handlePlayFullVideo}>
            전체재생
          </Button>
        </ButtonGroup>
      )}

      {/* ▶ 플레이어 컨테이너 (이 요소를 우선 풀스크린) */}
      <Box
        ref={containerRef}
        className="fs-container"
        sx={{
          position: 'relative',
          width: '100%',
          flexGrow: 1,
          backgroundColor: 'black',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {/* 좌측 상단 라벨 오버레이 */}
        {nowPlayingId && (
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 10, md: 16 },
              left: { xs: 10, md: 16 },
              zIndex: 3,
              px: { xs: 1.5, md: 2.5 }, // 패딩 키움
              py: { xs: 0.75, md: 1.25 },
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontWeight: 900,
              // 화면 크기에 맞춰 자동 확대 (최소 32px, 보통 5vw, 최대 96px)
              fontSize: 'clamp(32px, 5vw, 96px)',
              lineHeight: 1,
              letterSpacing: 3,
              pointerEvents: 'none',
              textTransform: 'uppercase',
              boxShadow: 3, // 가독성 향상
              border: '2px solid rgba(255,255,255,0.5)',
              backdropFilter: 'blur(2px)', // 배경 흐림(선택)
            }}
          >
            {nowPlayingId}
          </Box>
        )}

        {/* YouTube 플레이어: 100% 채움 */}
        <Box sx={{ position: 'absolute', inset: 0 }}>
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
            onStateChange={onStateChange}
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
