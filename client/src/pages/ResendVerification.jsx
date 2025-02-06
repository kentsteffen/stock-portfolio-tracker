import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

export const ResendVerification = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setError('');

    try {
      await api.post('/api/auth/resend-verification', { email });
      setStatus('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend verification email');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Resend Verification Email</h2>

        {status === 'success' ? (
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-gray-600 mb-4">
              Verification email has been sent. Please check your inbox.
            </p>
            <Link
              to="/login"
              className="text-blue-500 hover:text-blue-600"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className={`w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 
                ${status === 'submitting' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {status === 'submitting' ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}; 