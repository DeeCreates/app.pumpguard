// hooks/useSession.ts
import { useSessionStorage } from 'react-use';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface SessionData {
  user: User;
  loggedInAt: string;
}

export function useSession() {
  const [session, setSession, removeSession] = useSessionStorage<SessionData | null>('app-session', null);

  const login = (userData: User) => {
    const sessionData: SessionData = {
      user: userData,
      loggedInAt: new Date().toISOString()
    };
    setSession(sessionData);
  };

  const logout = () => {
    removeSession();
  };

  return {
    user: session?.user || null,
    isLoggedIn: !!session?.user,
    login,
    logout
  };
}