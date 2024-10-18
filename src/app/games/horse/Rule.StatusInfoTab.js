import Image from 'next/image';
import { Box, Typography, useTheme } from '@mui/material';

export default function StatusInfoTab() {
  const theme = useTheme();

  return (
    <Box
      id="tabpanel-1"
      aria-labelledby="tab-1"
      sx={{
        p: 3, // 패딩: 24px (p-4)
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
        👥 내 상태 보기란?
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
          플레이할 인원이 모두 게임방에 들어오면 방장이{' '}
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘역할 분배’
          </Box>
          를 클릭할 거예요.
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
          그러면{' '}
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘익명이름’
          </Box>
          ,{' '}
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘내 경주마’
          </Box>
          ,{' '}
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘남은 칩 개수’
          </Box>
          가 초기화됩니다.
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
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘익명이름’
          </Box>
          은{' '}
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘칩 개수’
          </Box>{' '}
          탭에서 표기될 나의 익명이름입니다.
        </Typography>

        {/* 네 번째 문단 */}
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
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘내 경주마’
          </Box>
          와 같은 경주마를 맡은 팀원을 찾고 힘을 합쳐 2등의 위치를 사수해야 합니다.
        </Typography>

        {/* 첫 번째 이미지 */}
        <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
          <Image
            src="/images/rule/horse/statusInfo.avif"
            alt="내 상태 보기"
            width={423}
            height={580}
            quality={90}
            sizes="(max-width: 768px) 100vw, 540px"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',         // rounded-lg
              boxShadow: '0px 4px 6px rgba(0,0,0,0.1)', // shadow-md
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
