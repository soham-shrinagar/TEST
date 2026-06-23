import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const OAuthTokenHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) return;

    const completeOAuthLogin = async () => {
      localStorage.setItem('csUser', JSON.stringify({ token }));
      try {
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        login({ ...data, token });
      } catch {
        localStorage.removeItem('csUser');
      }

      params.delete('token');
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
    };

    completeOAuthLogin();
  }, [location.pathname, location.search, login, navigate]);

  return null;
};

export default OAuthTokenHandler;
