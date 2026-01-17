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
import {
  DEFAULT_GAME_ID,
  GAME_CATALOG,
  GameId,
  isGameId,
} from '@/lib/gameCatalog';

interface PlayerRank {
  rank: number;
  name: string;
  score: number;
}

interface RankingResponse {
  game: string;
  updatedAt: string;
  rankings: Array<{ rank: number; name: string; wins: number }>;
}

export default function RankingPage() {
  const { data: session } = useSession();
  const [selectedGame, setSelectedGame] = useState<GameId>(DEFAULT_GAME_ID);
  const [rankData, setRankData] = useState<PlayerRank[]>([]);
  const [visible, setVisible] = useState<boolean>(true);

  const handleGameChange = (e: SelectChangeEvent) => {
    const value = String(e.target.value);
    const game = isGameId(value) ? value : DEFAULT_GAME_ID;
    setVisible(false); // Fade out
    setSelectedGame(game);
  };

  useEffect(() => {
    let isActive = true;

    const loadRankings = async () => {
      try {
        const response = await fetch(`/api/rankings?game=${selectedGame}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Failed to load rankings');
        }
        const data: RankingResponse = await response.json();
        if (!isActive) return;

        const normalized = (data.rankings ?? []).map((item) => ({
          rank: item.rank,
          name: item.name,
          score: item.wins,
        }));
        setRankData(normalized);
      } catch (error) {
        if (isActive) {
          setRankData([]);
        }
      } finally {
        if (isActive) {
          setVisible(true); // Fade in
        }
      }
    };

    loadRankings();
    return () => {
      isActive = false;
    };
  }, [selectedGame]);

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
              {GAME_CATALOG.map((game) => (
                <MenuItem key={game.id} value={game.id}>
                  {game.label}
                </MenuItem>
              ))}
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
