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

        <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
          <Image
            src="/images/rule/horse/내상태보기.avif"
            alt="내 상태 보기"
            width={424}
            height={575}
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
          그리고 해당 값은 우측상단의 버튼을 통해 확인하실 수 있습니다.
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
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘익명이름’
          </Box>
          은{' '}
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘칩 개수’
          </Box>{' '}
          탭에서 표기될 나의 익명이름입니다. 타인과 겹치지않는 고유한 이름입니다. 정체를 숨기라고 만든거니까 익명이름은 숨기는게 좋습니다.
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
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘내 경주마’
          </Box>
          와 같은 경주마를 맡은 팀원이 1명 존재할겁니다. 승리여부는 경주마를 통해 정해지기때문에 팀원을 빨리 찾는다면 칩을 효율적으로 사용하실 수 있을겁니다.
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
          <Box component="span" sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
            ‘남은 칩 개수’
          </Box>
          는 처음에 20개를 할당받게 됩니다. 라운드마다 초기화되는게 아니니까 아껴서 사용해주세요.
        </Typography>
      </Box>
    </Box>
  );
}
