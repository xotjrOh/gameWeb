import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Room } from '@/types/room';

interface RoomInitialState {
  rooms: { [key: string]: Room };
}

const initialState: RoomInitialState = {
  rooms: {},
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRooms(state, action: PayloadAction<{ [key: string]: Room }>) {
      state.rooms = action.payload;
    },
  },
});

export const { setRooms } = roomSlice.actions; // state 변경함수들 남음
export default roomSlice;
