// src/components/common/Header/Header.jsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext/Auth';
import { hasPermission, getRoleName, getRoleIcon } from '../../../config/roles';
import './Header.css';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Закрытие дропдауна при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/input');
    setIsDropdownOpen(false);
  };

  // Получение инициалов для аватара
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.login?.[0]?.toUpperCase() || 'U';
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h2>Конференции и сборник</h2>
        </Link>

        {/* Навигационное меню для авторизованных пользователей */}
        {user && (
          <nav className="nav-menu">
            <Link to="/dashboard" className="nav-link">Дашборд</Link>
            <Link to="/profile" className="nav-link">Профиль</Link>
            
            {/* Ссылки для авторов */}
            {hasPermission(user.role, 'submit_report') && (
              <>
                <Link to="/submit-report" className="nav-link">Подать доклад</Link>
                <Link to="/my-reports" className="nav-link">Мои доклады</Link>
              </>
            )}
            
            {/* Ссылки для рецензентов */}
            {hasPermission(user.role, 'view_assigned_reports') && (
              <Link to="/review/assigned" className="nav-link">Рецензирование</Link>
            )}
            
            {/* Ссылки для администраторов */}
            {hasPermission(user.role, 'create_conference') && (
              <>
                <Link to="/admin/create-conference" className="nav-link">Создать конф.</Link>
                <Link to="/admin/manage-conferences" className="nav-link">Управление</Link>
                <Link to="/admin/manage-users" className="nav-link">Пользователи</Link>
                <Link to="/admin/assign-section-heads" className="nav-link">Руководители</Link>
              </>
            )}
          </nav>
        )}

        <div className="auth-section">
          {!user ? (
            // Кнопки для неавторизованных пользователей
            <div className="auth-buttons">
              <Link to="/input" className="btn btn-login">Вход</Link>
              <Link to="/register" className="btn btn-register">Регистрация</Link>
            </div>
          ) : (
            // Меню авторизованного пользователя
            <div className="user-menu" ref={dropdownRef}>
              <div 
                className="user-info" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="avatar">
                  {getInitials()}
                </div>
                <span className="user-name">
                  {user.name || user.login}
                </span>
                <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>
                  ▼
                </span>
              </div>

              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <span className="dropdown-icon">👤</span>
                    Мой профиль
                  </Link>
                  
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <span className="dropdown-icon">📊</span>
                    Дашборд
                  </Link>

                  {/* Разделитель */}
                  <div className="dropdown-divider"></div>

                  {/* Роль пользователя (не кликабельно) */}
                  <div className="dropdown-item" style={{ cursor: 'default' }}>
                    <span className="dropdown-icon">{getRoleIcon(user.role)}</span>
                    {getRoleName(user.role)}
                  </div>

                  {/* Ссылки для авторов */}
                  {hasPermission(user.role, 'submit_report') && (
                    <>
                      <Link to="/submit-report" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">📝</span>
                        Подать доклад
                      </Link>
                      <Link to="/my-reports" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">📚</span>
                        Мои доклады
                      </Link>
                    </>
                  )}

                  {/* Ссылки для рецензентов */}
                  {hasPermission(user.role, 'view_assigned_reports') && (
                    <Link to="/review/assigned" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <span className="dropdown-icon">🔍</span>
                      Рецензирование
                    </Link>
                  )}

                  {/* Ссылки для администраторов */}
                  {hasPermission(user.role, 'create_conference') && (
                    <>
                      <div className="dropdown-divider"></div>
                      <Link to="/admin/create-conference" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">➕</span>
                        Создать конференцию
                      </Link>
                      <Link to="/admin/manage-conferences" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">📋</span>
                        Управление конференциями
                      </Link>
                      <Link to="/admin/manage-users" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">👥</span>
                        Управление пользователями
                      </Link>
                      <Link to="/admin/assign-section-heads" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">👑</span>
                        Назначить руководителей
                      </Link>
                    </>
                  )}

                  <div className="dropdown-divider"></div>
                  
                  <button onClick={handleLogout} className="dropdown-item logout">
                    <span className="dropdown-icon">🚪</span>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;