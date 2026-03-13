// src/pages/AccessDenied/AccessDenied.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const AccessDenied = () => {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '50px',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '48px', color: '#e53e3e' }}>🚫</h1>
      <h2>Доступ запрещен</h2>
      <p>У вас нет прав для доступа к этой странице.</p>
      <Link to="/" style={{ 
        marginTop: '20px',
        padding: '10px 20px',
        background: '#667eea',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '5px'
      }}>
        Вернуться на главную
      </Link>
    </div>
  );
};

export default AccessDenied;