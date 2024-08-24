import { createSlice } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    socket: null,
    isConnected: false,
  },
  reducers: {
    setSocket(state, action) {
      state.socket = action.payload;
    },
    setIsConnected(state, action) {
      state.isConnected = action.payload;
    },
  },
});

export const { setSocket, setIsConnected } = socketSlice.actions;

export const initializeSocket = () => (dispatch, getState) => {
	const { socket } = getState().socket;
	console.log("socket : ", socket);

	// socket이 이미 초기화되어 있는지 확인
	if (socket === null) {
	    const newSocket = io(process.env.NEXT_PUBLIC_SITE_URL, {
			path : "/api/socket/io",
			addTrailingSlash: false,
		});

	    newSocket.on('connect', () => {
			console.log("client : connect");
			dispatch(setIsConnected(true));
			dispatch(setSocket(newSocket));
	    });
  
	    newSocket.on('disconnect', () => {
			console.log("client : disconnect");
			dispatch(setIsConnected(false));
			dispatch(setSocket(null));
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

// export const store = configureStore({
//   reducer: {
//     socket: socketSlice.reducer,
//   },
// });
