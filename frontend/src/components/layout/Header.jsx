import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUser, FiLogOut, FiMenu } from 'react-icons/fi';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Check user on Header load
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      try {
        setUser(JSON.parse(loggedInUser));
      } catch (e) {
        console.error("Error reading user data", e);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div 
        className="header-logo" 
        onClick={() => navigate('/')} 
        style={{ cursor: 'pointer' }}
      >
        🚌 VIETBUS
      </div>
      
      <ul className="header-nav">
        <li 
          onClick={() => navigate('/')}
          className={isActive('/') ? 'active' : ''}
        >
          Homepage
        </li>
        <li 
          onClick={() => navigate('/schedule')}
          className={isActive('/schedule') ? 'active' : ''}
        >
          Schedule
        </li>
        <li 
          onClick={() => navigate('/lookup')}
          className={isActive('/lookup') ? 'active' : ''}
        >
          Lookup
        </li>
        {user && user.role === 'STAFF' && (
          <li 
            onClick={() => navigate('/manage-trips')}
            className={isActive('/manage-trips') ? 'active' : ''}
          >
            Manage Routes and Trips
          </li>
        )}
      </ul>
      {user ? (
        <div className="user-menu">
          <div 
            className="user-info"
            onClick={() => navigate('/profile')}
            style={{ cursor: 'pointer' }}
          >
            <FiUser className="user-icon" />
            <span className="user-name">Hi, {user.name}</span>
          </div>
          <button 
            className="logout-button" 
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      ) : (
        <button className="login-button" onClick={() => navigate('/login')}>
          <FiUser style={{ marginRight: '8px' }} />
          Login
        </button>
      )}
    </nav>
  );
};

export default Header;