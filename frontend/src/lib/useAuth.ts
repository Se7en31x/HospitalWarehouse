import { useEffect, useState } from "react";

export interface Department {
  code: string;
  name: string;
}

export const useAuth = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch departments and user info from auth provider
    const fetchAuthData = async () => {
      try {
        // This is a placeholder implementation
        // You should connect to your actual auth provider (Auth0, etc.)
        setDepartments([]);
        setUser(null);
      } catch (error) {
        console.error("Error fetching auth data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthData();
  }, []);

  return {
    departments,
    user,
    isLoading,
  };
};
