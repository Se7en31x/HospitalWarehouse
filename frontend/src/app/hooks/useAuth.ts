import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface Department {
  code: string;
  name: string;
}

interface DecodedToken {
  user_id: string; 
  user_fullname: string;
  role: string;
  departments: Department[];
  iat: number;
  exp: number;
}

export function useAuth() {
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const token = Cookies.get('user_token');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setUser(decoded);
      } catch (error) {
        console.error("❌ Token Decode Failed:", error);
        setUser(null);
      }
    }
    setIsLoaded(true);
  }, []);

  return { 
    user, 
    isLoaded, 
    userId: user?.user_id || null, 
    role: user?.role || null,
    fullName: user?.user_fullname || "ไม่ระบุชื่อ",
    departments: user?.departments || [] 
  };
}