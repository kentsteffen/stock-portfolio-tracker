import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/auth/status', {
        withCredentials: true
      });
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(
        'http://localhost:5001/api/auth/login',
        { email, password },
        { withCredentials: true }
      );
      
      if (response.data) {
        setUser(response.data);
        setIsAuthenticated(true);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (formData) => {
    try {
      const response = await axios.post(
        'http://localhost:5001/api/auth/register',
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        'http://localhost:5001/api/auth/logout',
        {},
        { withCredentials: true }
      );
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated, 
        isLoading,
        login, 
        register, 
        logout, 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 