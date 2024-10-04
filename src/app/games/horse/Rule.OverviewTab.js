import Image from 'next/image';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

export default function OverviewTab() {
  const theme = useTheme();

  // 반응형 디자인을 위한 미디어 쿼리
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // 모바일
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 태블릿

  return (
    <Box
      sx={{
        p: 3, // 패딩: 24px
      }}
    >
      {/* 제목 */}
      <Typography
        variant="h4"
        component="h2"
        gutterBottom
        sx={{
          fontWeight: 'bold',
          color: theme.palette.primary.main, // theme 색상 사용
          fontSize: {
            xs: '1.5rem', // 모바일
            sm: '2rem',    // 태블릿
            md: '2.5rem',  // 데스크톱 이상
          },
          mb: {
            xs: 1, // 모바일
            sm: 2, // 태블릿
            md: 3, // 데스크톱 이상
          },
        }}
      >
        🎮 경마게임이란?
      </Typography>

      {/* 설명 내용 */}
      <Box sx={{ maxWidth: 'md', mx: 'auto' }}>
        {/* 첫 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 2, // mb-4
            color: theme.palette.text.primary, // theme 색상 사용
            fontSize: {
              xs: '1rem',    // 모바일
              sm: '1.25rem', // 태블릿
              md: '1.25rem', // 데스크톱 이상
            },
          }}
        >
          경마게임은 오프라인에서 대화를 통해 진행되며, 액션 및 정보 확인은 웹에서 지원되는 하이브리드 게임입니다.
        </Typography>

        {/* 두 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 2, // mb-4
            color: theme.palette.text.primary,
            fontSize: {
              xs: '1rem',
              sm: '1.25rem',
              md: '1.25rem',
            },
          }}
        >
          게임은 2명이 1마리의 경주마를 맡아 팀전으로 진행되며 팀원은 공개되지 않고 대화를 통해 찾아야 합니다.
        </Typography>

        {/* 세 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 2, // mb-4
            color: theme.palette.text.primary,
            fontSize: {
              xs: '1rem',
              sm: '1.25rem',
              md: '1.25rem',
            },
          }}
        >
          🤫 홀수 인원으로 게임을 진행할 경우 발생하는{' '}
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘솔로 플레이어’
          </Box>
          는 혼자만 알 수 있는 비밀 혜택이 있습니다.
        </Typography>

        {/* 네 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 2, // mb-4
            color: theme.palette.text.primary,
            fontSize: {
              xs: '1rem',
              sm: '1.25rem',
              md: '1.25rem',
            },
          }}
        >
          최초로 결승선을 통과하는 말이 나오면 그 즉시 게임이 종료되며,
        </Typography>

        {/* 다섯 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 3, // mb-6
            color: theme.palette.text.primary,
            fontSize: {
              xs: '1rem',
              sm: '1.25rem',
              md: '1.25rem',
            },
          }}
        >
          통과한 말들은 꼴등이 되고 그 당시에 결승선에 가장 가까운 말을 맡은 팀이 1등이 됩니다.
        </Typography>

        {/* 여섯 번째 문단 (경고 텍스트) */}
        <Typography
          variant="body1"
          sx={{
            mb: 3, // mb-6
            color: theme.palette.error.main, // 경고 색상
            fontWeight: 'bold',
            fontSize: {
              xs: '1rem',
              sm: '1.25rem',
              md: '1.25rem',
            },
          }}
        >
          🚫 웹 화면을 직접적으로 다른 사람에게 보여주는 건{' '}
          <Box component="span" sx={{ textDecoration: 'underline' }}>
            ‘규칙 위반’
          </Box>{' '}
          입니다.
        </Typography>

        {/* 첫 번째 이미지 */}
        <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
          <Image
            src="/images/rule/horse/horsesTab.avif"
            alt="경주마 탭 화면"
            width={425}
            height={605}
            quality={90}
            sizes="(max-width: 768px) 100vw, 540px"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px', // rounded-lg
              boxShadow: '0px 4px 6px rgba(0,0,0,0.1)', // shadow-md
            }}
          />
        </Box>

        {/* 두 번째 이미지 */}
        <Box sx={{ position: 'relative', width: '100%' }}>
          <Image
            src="/images/rule/horse/myHorseWin.avif"
            alt="게임 종료 후 승리 화면"
            width={425}
            height={607}
            quality={90}
            sizes="(max-width: 768px) 100vw, 540px"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px', // rounded-lg
              boxShadow: '0px 4px 6px rgba(0,0,0,0.1)', // shadow-md
              marginTop: '20px', // mt-5
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
