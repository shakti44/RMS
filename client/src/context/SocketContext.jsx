import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { EVENTS } from '../constants/socketEvents';

const SocketContext = createContext(null);

// In production, connect directly to Railway backend
// In dev, connect to localhost:4000
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const SocketProvider = ({ children, isGuest = false }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const namespace = isGuest ? `${SOCKET_URL}/guest` : SOCKET_URL;
    const token     = localStorage.getItem('accessToken');

    const socket = io(namespace, {
      auth:          { token },
      transports:    ['websocket', 'polling'],
      reconnection:  true,
      reconnectionAttempts: 10,
      reconnectionDelay:    1000,
    });

    socketRef.current = socket;
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on(EVENTS.CONNECT_ERROR, (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return () => socket.disconnect();
  }, [isGuest]);

  const joinRestaurant  = (id) => socketRef.current?.emit(EVENTS.JOIN_RESTAURANT,  { restaurantId: id });
  const leaveRestaurant = (id) => socketRef.current?.emit(EVENTS.LEAVE_RESTAURANT, { restaurantId: id });
  const joinOrder       = (id) => socketRef.current?.emit('join:order', { orderId: id });
  const on  = (event, cb) => socketRef.current?.on(event, cb);
  const off = (event, cb) => socketRef.current?.off(event, cb);

  return (
    <SocketContext.Provider value={{ connected, joinRestaurant, leaveRestaurant, joinOrder, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
