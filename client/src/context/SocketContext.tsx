import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (token && user && user._id) {
      console.log('Creating socket for user', user._id);
      const s = io(import.meta.env.VITE_SOCKET_URL, {
        auth: { token }
      });
      s.on('connect', () => {
        console.log('Socket connected:', s.id);
        s.emit('joinUser', user._id); // Join user room for direct messaging
        s.emit('joinGroup', user._id); // (optional: if you want to keep group join for userId)
        s.emit('userOnline', user._id); // Emit user online status
      });
      setSocket(s);
      return () => {
        s.disconnect();
      };
    } else {
      setSocket(null);
    }
  }, [token, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
