import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold">
          Stock Portfolio
        </Link>
        
        <div className="flex gap-4">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="text-white hover:text-gray-300 transition-colors"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-white hover:text-gray-300 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-white hover:text-gray-300 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 