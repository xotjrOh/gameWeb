import { createSlice } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    socket: null,
  },
  reducers: {
    setSocket(state, action) {
      state.socket = action.payload;
    },
  },
});

export const { setSocket } = socketSlice.actions;

export const initializeSocket = () => (dispatch, getState) => {
	const { socket } = getState().socket;

	// socket이 이미 초기화되어 있는지 확인
	if (!socket || !socket.connected) {
	    const newSocket = io(process.env.NEXT_PUBLIC_SITE_URL, {
			path : "/api/socket/io",
			addTrailingSlash: false,
			// reconnection: true, 		// 자동 재연결 활성화
			// reconnectionAttempts: 10, // 재연결 시도 횟수
			// reconnectionDelay: 1000, // 재연결 시도 간격 (1초)
		});

	    newSocket.on('connect', () => {
			console.log("client : connect");
			dispatch(setSocket(newSocket));
	    });
  
	    newSocket.on('disconnect', () => {
			console.log("client : disconnect");
			dispatch(setSocket(null));
	    });

		newSocket.on('reconnect', (attempt) => {
			console.log(`client : reconnect (${attempt} attempts)`);
		});
	  
		newSocket.on('reconnect_failed', () => {
			console.log('client : reconnect_failed');
		});

		newSocket.on("error", (err) => {
			console.log("client : error");
			console.error(err);
		})
  
	} else {
	    console.log("Socket is already initialized.");
	}
};

export default socketSlice;