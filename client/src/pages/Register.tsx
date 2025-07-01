import { useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Register.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      try {
        await axios.post('http://localhost:5000/api/auth/register', { username, password });
        navigate('/login');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Registration failed');
      }
    },
    [username, password, navigate]
  );

  return (
    <div className="register-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit} autoComplete="off">
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
        <button type="submit">Register</button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default Register;