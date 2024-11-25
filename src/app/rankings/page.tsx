'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import {
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  Box,
  Paper,
  Collapse,
  SelectChangeEvent,
} from '@mui/material';
import { GameType } from '@/types/room';

interface PlayerRank {
  rank: number;
  name: string;
  score: number;
}

const mockRankData: Record<GameType, PlayerRank[]> = {
  horse: [
    { rank: 1, name: '오태석', score: 13 },
    { rank: 2, name: '방준성', score: 1 },
    { rank: 3, name: '안민우', score: 0 },
    { rank: 4, name: '이승현', score: 0 },
    { rank: 5, name: '김주희', score: 0 },
  ],
  shuffle: [
    { rank: 1, name: '안민우', score: 0 },
    { rank: 2, name: '방준성', score: 0 },
    { rank: 3, name: '오태석', score: 0 },
    { rank: 4, name: '이승현', score: 0 },
    { rank: 5, name: '이다솜', score: 0 },
  ],
};

export default function RankingPage() {
  const { data: session } = useSession();
  const [selectedGame, setSelectedGame] = useState<GameType>('horse');
  const [rankData, setRankData] = useState<PlayerRank[]>(
    mockRankData[selectedGame]
  );
  const [visible, setVisible] = useState<boolean>(true);

  const handleGameChange = (e: SelectChangeEvent) => {
    const game = e.target.value as GameType;
    setVisible(false); // Fade out
    setSelectedGame(game);
  };

  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        setRankData(mockRankData[selectedGame]);
        setVisible(true); // Fade in
      }, 300); // Duration matches Fade timeout
      return () => clearTimeout(timer);
    }
  }, [visible, selectedGame]);

  return (
    <>
      <Header session={session} />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default', // 단일 배경색
          py: 6,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start', // Align to top to prevent shifting
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            sx={{ fontWeight: 'bold', color: '#3f51b5' }}
          >
            🏆 랭킹 순위
          </Typography>

          <FormControl fullWidth sx={{ mb: 4 }}>
            <InputLabel id="game-select-label">게임 선택</InputLabel>
            <Select
              labelId="game-select-label"
              value={selectedGame}
              onChange={handleGameChange}
              label="게임 선택"
              sx={{ bgcolor: 'white' }}
            >
              <MenuItem value="horse">🐎 경마게임</MenuItem>
              <MenuItem value="shuffle">🔀 뒤죽박죽</MenuItem>
            </Select>
          </FormControl>

          {/* 순위 리스트 with Fade */}
          <Collapse in={visible} timeout={200}>
            <List>
              {rankData.map((player) => (
                <ListItem
                  key={`${selectedGame}-${player.rank}`}
                  component={Paper}
                  elevation={1}
                  sx={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    mb: 2,
                    boxShadow: 1,
                    transition: 'box-shadow 0.3s, transform 0.3s',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                    },
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {/* 순위 */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 'bold',
                      color: '#3f51b5',
                      width: '15%',
                      textAlign: 'left',
                    }}
                    aria-label={`랭킹 ${player.rank}위`}
                  >
                    {player.rank}위
                  </Typography>
                  {/* 이름 */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 'bold',
                      color: '#3f51b5',
                      width: '60%',
                      textAlign: 'center',
                    }}
                  >
                    {player.name}
                  </Typography>
                  {/* 점수 */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 'bold',
                      color: '#3f51b5',
                      width: '25%',
                      textAlign: 'right',
                    }}
                  >
                    {player.score}점
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Container>
      </Box>
    </>
  );
}
