import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axios';

export const VerifyEmail = () => {
  const [status, setStatus] = useState('verifying');
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await api.get(`/api/auth/verify-email/${token}`);
        setStatus('success');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        setStatus('error');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Email Verification</h2>
        
        {status === 'verifying' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-semibold mb-2">Email Verified!</h3>
            <p className="text-gray-600">
              Your email has been successfully verified. Redirecting to login...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">✕</div>
            <h3 className="text-xl font-semibold mb-2">Verification Failed</h3>
            <p className="text-gray-600 mb-4">
              The verification link is invalid or has expired.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 