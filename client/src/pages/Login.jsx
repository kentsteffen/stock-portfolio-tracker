import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  // try {
    
  //   await login(email, password); // Pass email and password separately
  //   navigate('/dashboard');
  // } catch (error) {
  //   setError(error.message || 'Login failed');
    
  //   console.error('Login failed:', error);
  //   // Handle error (e.g., show error message to user)
  // }
  try {
    await login(email, password);
    navigate('/dashboard'); // or wherever you want to redirect after login
  } catch (err) {
    console.error('Login failed:', err);
    setError(err.message);
    setPassword(''); // Clear password field on error
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Login
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/register" className="text-blue-500 hover:text-blue-600">
            Need an account? Register
          </Link>
        </div>
        <div className="mt-2 text-center">
          <Link to="/forgot-password" className="text-blue-500 hover:text-blue-600">
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}; 