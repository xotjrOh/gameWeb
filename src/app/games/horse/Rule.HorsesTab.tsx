'use client';

import Image from 'next/image';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

export default function HorsesTab() {
  const theme = useTheme();

  // 반응형 디자인을 위한 미디어 쿼리
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // 모바일
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 태블릿

  return (
    <Box
      id="tabpanel-5"
      aria-labelledby="tab-5"
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
          color: theme.palette.primary.main, // 테마의 primary 색상 사용
          fontSize: {
            xs: '1.5rem', // 모바일
            sm: '2rem', // 태블릿
            md: '2.5rem', // 데스크톱 이상
          },
          mb: {
            xs: 1, // 모바일
            sm: 2, // 태블릿
            md: 3, // 데스크톱 이상
          },
        }}
      >
        🏇 경주마 탭 설명
      </Typography>

      {/* 설명 내용 */}
      <Box sx={{ maxWidth: 'md', mx: 'auto' }}>
        <Typography
          variant="body1"
          sx={{
            mb: 2, // mb-4
            color: theme.palette.text.primary, // 테마의 기본 텍스트 색상 사용
            fontSize: {
              xs: '1rem', // 모바일
              sm: '1.25rem', // 태블릿
              md: '1.25rem', // 데스크톱 이상
            },
          }}
        >
          각 경주마의 위치를 볼 수 있습니다.
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
          경주마가 1마리라도 결승선에 도달하면 그 즉시 게임이 종료됩니다.
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
          종료 시점에 결승선을 통과하지 않은 말 중 가장 앞선 말이 우승자가
          됩니다.
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
          <Box
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            ‘내 경주마’
          </Box>
          는 우측 상단의{' '}
          <Box
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            ‘내 상태 보기’
          </Box>
          를 통해 확인할 수 있습니다.
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
          하단에 라운드마다 경주마들의 전진 내역을 확인할 수 있습니다.
        </Typography>

        <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
          <Image
            src="/images/rule/horse/경주마탭.webp"
            alt="경주마 탭 화면"
            width={425}
            height={1154}
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
      </Box>
    </Box>
  );
}
