import React from 'react';
import { Box, List, ListItem, ListItemText, Avatar } from '@mui/material';
import { useSelector } from 'react-redux';

export default function ParticipantsTab({ roomId, socket, session }) {
  const { players } = useSelector((state) => state.shuffle);

  return (
    <Box>
      <List>
        {players.map((player) => (
          <ListItem key={player.id}>
            <Avatar>{player.name.charAt(0)}</Avatar>
            <ListItemText
              primary={player.name}
              secondary={player.isAlive ? '생존' : '탈락'}
              style={{ color: player.isAlive ? 'black' : 'gray' }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
