'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Backdrop,
  IconButton,
  Box,
  Typography,
  FormHelperText,
} from '@mui/material';
import { Cancel as CancelIcon } from '@mui/icons-material';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { useHideScroll } from '@/hooks/useHideScroll';
import { setIsLoading } from '@/store/loadingSlice';
import { useRouter } from 'next/navigation';
import { Session } from 'next-auth';
import { ClientSocketType } from '@/types/socket';
import { AppDispatch } from '@/store';
import { GameType } from '@/types/room';
import LockedFocusedMaxPlayersField from '@/components/LockedFocusedMaxPlayersField';

type RouterType = ReturnType<typeof useRouter>;

interface RoomModalProps {
  closeModal: () => void;
  socket: ClientSocketType | null;
  router: RouterType;
  dispatch: AppDispatch;
  session: Session | null;
}

interface FormData {
  roomName: string;
  gameType: GameType;
  maxPlayers: number;
  scenarioId: string;
}

interface MurderMysteryScenarioOption {
  id: string;
  title: string;
  roomDisplayName: string;
  players: {
    min: number;
    max: number;
  };
}

export default function RoomModal({
  closeModal,
  socket,
  router,
  dispatch,
  session,
}: RoomModalProps) {
  const { enqueueSnackbar } = useCustomSnackbar();
  const [scenarioOptions, setScenarioOptions] = useState<
    MurderMysteryScenarioOption[]
  >([]);
  const [isScenarioLoading, setIsScenarioLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      roomName: '',
      gameType: 'horse',
      maxPlayers: undefined,
      scenarioId: '',
    },
  });
  const selectedGameType = watch('gameType');
  const selectedScenarioId = watch('scenarioId');

  const selectedScenario = useMemo(
    () =>
      scenarioOptions.find((scenario) => scenario.id === selectedScenarioId) ??
      null,
    [scenarioOptions, selectedScenarioId]
  );
  const isFixedMurderPlayerCount =
    selectedGameType === 'murder_mystery' &&
    Boolean(selectedScenario) &&
    selectedScenario?.players.min === selectedScenario?.players.max;

  useEffect(() => {
    if (selectedGameType !== 'murder_mystery') {
      setValue('scenarioId', '');
      return;
    }
    if (scenarioOptions.length > 0 || isScenarioLoading) {
      return;
    }

    setIsScenarioLoading(true);
    fetch('/api/murder-mystery/scenarios', {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('시나리오 목록을 불러오지 못했습니다.');
        }
        const data = (await response.json()) as {
          scenarios?: MurderMysteryScenarioOption[];
        };
        const nextScenarios = Array.isArray(data.scenarios)
          ? data.scenarios
          : [];
        setScenarioOptions(nextScenarios);
        if (nextScenarios.length > 0) {
          setValue('scenarioId', nextScenarios[0].id, {
            shouldValidate: true,
          });
          setValue('maxPlayers', nextScenarios[0].players.max, {
            shouldValidate: true,
          });
        }
      })
      .catch((error) => {
        enqueueSnackbar((error as Error).message, {
          variant: 'error',
        });
      })
      .finally(() => {
        setIsScenarioLoading(false);
      });
  }, [
    selectedGameType,
    scenarioOptions,
    isScenarioLoading,
    setValue,
    enqueueSnackbar,
  ]);

  useEffect(() => {
    if (selectedGameType !== 'murder_mystery' || !selectedScenario) {
      return;
    }
    setValue('maxPlayers', selectedScenario.players.max, {
      shouldValidate: true,
    });
  }, [selectedGameType, selectedScenario, setValue]);

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (!socket || !socket.connected || !socket.id) {
      return enqueueSnackbar('소켓 연결 대기 중입니다.', {
        variant: 'warning',
      });
    }
    if (!session) {
      // socket 미연결
      enqueueSnackbar('로그인이 확인되지 않습니다.', {
        variant: 'error',
      });
      return;
    }

    const userName = session.user.name ?? 'Anonymous';
    const sessionId = session.user.id;
    const resolvedMaxPlayers =
      data.gameType === 'murder_mystery' && selectedScenario
        ? selectedScenario.players.max
        : data.maxPlayers;

    if (data.gameType === 'murder_mystery') {
      if (!data.scenarioId) {
        return enqueueSnackbar('머더미스터리 시나리오를 선택해주세요.', {
          variant: 'error',
        });
      }
      if (
        selectedScenario &&
        (resolvedMaxPlayers < selectedScenario.players.min ||
          resolvedMaxPlayers > selectedScenario.players.max)
      ) {
        return enqueueSnackbar(
          `이 시나리오는 ${selectedScenario.players.min}~${selectedScenario.players.max}명 설정만 가능합니다.`,
          {
            variant: 'error',
          }
        );
      }
    }

    const payload =
      data.gameType === 'murder_mystery'
        ? { ...data, maxPlayers: resolvedMaxPlayers, userName, sessionId }
        : {
            roomName: data.roomName,
            gameType: data.gameType,
            maxPlayers: resolvedMaxPlayers,
            userName,
            sessionId,
          };

    dispatch(setIsLoading(true));
    socket.emit('create-room', payload, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message, { variant: 'error' });
        return dispatch(setIsLoading(false));
      }

      router.replace(`/${data.gameType}/${response.roomId}/host`);
      dispatch(setIsLoading(false));
    });
  };

  useHideScroll();

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      {/* 어두운 배경 */}
      <Backdrop open={true} onClick={closeModal} />

      {/* 모달 내용 */}
      <Box
        sx={{
          backgroundColor: 'background.card',
          p: 4,
          borderRadius: 2,
          boxShadow: 24,
          zIndex: 10,
          width: '80%',
          maxWidth: 400,
          position: 'relative',
        }}
      >
        <IconButton
          sx={{ position: 'absolute', top: 16, right: 16 }}
          onClick={closeModal}
        >
          <CancelIcon />
        </IconButton>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h5" color="primary" fontWeight="bold">
              방 만들기
            </Typography>
          </Box>
        </Box>

        {/* 방 이름 입력 */}
        <TextField
          label="방 이름"
          {...register('roomName', { required: '방 이름을 입력해주세요.' })}
          error={!!errors.roomName}
          helperText={errors.roomName?.message}
          fullWidth
          variant="outlined"
          margin="normal"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
          slotProps={{
            formHelperText: {
              sx: {
                margin: 0,
                paddingLeft: '12px',
                backgroundColor: 'background.card', // 여기서 에러 문구의 색상을 검정으로 설정
              },
            },
          }}
        />

        {/* 게임 종류 선택 */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="game-type-label">게임 종류</InputLabel>
          <Select
            labelId="game-type-label"
            defaultValue="horse"
            MenuProps={{
              PaperProps: { style: { maxHeight: 200, overflowY: 'auto' } },
            }}
            {...register('gameType', {
              required: '게임 종류가 미설정된 상태입니다.',
            })}
            label="게임 종류"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <MenuItem value="horse">🏇경마게임</MenuItem>
            <MenuItem value="shuffle">🔀뒤죽박죽</MenuItem>
            <MenuItem value="animal">🦁동물 능력전</MenuItem>
            <MenuItem value="jamo">🔤단어게임</MenuItem>
            <MenuItem value="murder_mystery">🕵️머더미스터리</MenuItem>
          </Select>
        </FormControl>

        {selectedGameType === 'murder_mystery' && (
          <FormControl
            fullWidth
            margin="normal"
            error={Boolean(errors.scenarioId)}
            disabled={isScenarioLoading}
          >
            <InputLabel id="scenario-id-label">
              머더미스터리 시나리오
            </InputLabel>
            <Select
              labelId="scenario-id-label"
              defaultValue=""
              label="머더미스터리 시나리오"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }}
              {...register('scenarioId', {
                validate: (value) =>
                  selectedGameType !== 'murder_mystery' ||
                  value.length > 0 ||
                  '시나리오를 선택해주세요.',
              })}
              onChange={(event) => {
                const value = String(event.target.value);
                setValue('scenarioId', value, { shouldValidate: true });
                const foundScenario = scenarioOptions.find(
                  (scenario) => scenario.id === value
                );
                if (foundScenario) {
                  setValue('maxPlayers', foundScenario.players.max, {
                    shouldValidate: true,
                  });
                }
              }}
            >
              {scenarioOptions.map((scenario) => (
                <MenuItem key={scenario.id} value={scenario.id}>
                  {scenario.roomDisplayName}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {errors.scenarioId?.message ??
                (selectedScenario
                  ? `${selectedScenario.players.min}~${selectedScenario.players.max}명 플레이`
                  : '시나리오를 불러오는 중입니다.')}
            </FormHelperText>
          </FormControl>
        )}

        {/* 최대 인원 입력 */}
        {isFixedMurderPlayerCount ? (
          <>
            <LockedFocusedMaxPlayersField
              value={selectedScenario?.players.max ?? 0}
              error={Boolean(errors.maxPlayers)}
              helperText={errors.maxPlayers?.message}
            />
            <input
              type="hidden"
              value={selectedScenario?.players.max ?? ''}
              {...register('maxPlayers', {
                required: '최대 인원을 입력해주세요.',
                valueAsNumber: true,
              })}
            />
          </>
        ) : (
          <TextField
            label="최대 인원"
            type="text"
            {...register('maxPlayers', {
              required: '최대 인원을 입력해주세요.',
              valueAsNumber: true,
            })}
            error={!!errors.maxPlayers}
            helperText={errors.maxPlayers?.message}
            fullWidth
            variant="outlined"
            margin="normal"
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = target.value.replace(/[^0-9]/g, '');
            }}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            }}
            slotProps={{
              formHelperText: {
                sx: {
                  margin: 0,
                  paddingLeft: '12px',
                  backgroundColor: 'background.card',
                },
              },
            }}
          />
        )}

        {/* 방 만들기 버튼 */}
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          방 만들기
        </Button>
      </Box>
    </Box>
  );
}
