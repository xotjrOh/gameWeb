import Image from 'next/image';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

export default function OverviewTab() {
  const theme = useTheme();

  // 반응형 디자인을 위한 미디어 쿼리
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // 모바일
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 태블릿

  return (
    <Box
      id="tabpanel-0"
      aria-labelledby="tab-0"
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
          경마게임은 오프라인에서 대화를 통해 정보를 얻고, 폰으로는 베팅을 하면 되는 간단한 게임입니다.
        </Typography>
        
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
          설명 순서는 개요에 대해 간략하게만 짚고, 이어서 화면 내의 각 탭에 대해 자세히 설명드리겠습니다.
        </Typography>

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
          게임이 시작될 때 각자 경주마를 맡게될거에요. 라운드마다 베팅을 해서, 베팅 집계에 따라 말들이 전진하게 됩니다.
        </Typography>

        <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
          <Image
            src="/images/rule/horse/onlyHorses.webp"
            alt="경주마 탭 화면"
            width={425}
            height={482}
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
          그러다 최초로 결승선을 통과하는 말이 나오면 그 즉시 게임이 종료되며,
        </Typography>

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
          그리고 상단의 탭 중 처음 두 개(베팅, 예측)는 라운드마다 할 수 있는 액션에 해당하는 부분입니다. 
          해당 라운드에 액션을 하게 되면 우측상단의 붉은 점은 사라지게 됩니다.<br/>
          그리고 뒤의 두 개(칩개수, 경주마)의 탭은 게임 내의 진행에 참고가 될 정보를 제공하는 화면입니다.
        </Typography>

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

      </Box>
    </Box>
  );
}
