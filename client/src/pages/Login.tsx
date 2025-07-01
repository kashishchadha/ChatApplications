import { useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      try {
        const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
        login(res.data.token);
        navigate('/chat');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Login failed');
      }
    },
    [username, password, login, navigate]
  );

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-switch">
          Don't have an account? <span onClick={() => navigate('/register')}>Register</span>
        </div>
      </form>
    </div>
  );
};

export default Login;