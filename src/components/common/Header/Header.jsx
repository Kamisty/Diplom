// src/components/common/Header/Header.jsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext/Auth';
import { hasPermission, getRoleName, getRoleIcon, ROLES } from '../../../config/roles';
import './Header.css';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Получаем роли пользователя (массив)
  const userRoles = user?.roles || [];
  
  // Функции для проверки ролей
  const isAdmin = () => userRoles.includes(ROLES.ADMIN);
  const isAuthor = () => userRoles.includes(ROLES.AUTHOR);
  const isReviewer = () => userRoles.includes(ROLES.REVIEWER);
  const isSectionHead = () => userRoles.includes(ROLES.SECTION_HEAD);

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

  // Получение отображаемой роли (если несколько ролей, показываем первую)
  const getDisplayRole = () => {
    if (userRoles.length === 0) return 'Участник';
    if (userRoles.length === 1) return getRoleName(userRoles[0]);
    return `${userRoles.length} роли`;
  };

  // Получение иконки для отображения (приоритет: админ > руководитель > рецензент > автор)
  const getDisplayRoleIcon = () => {
    if (isAdmin()) return '👑';
    if (isSectionHead()) return '🎯';
    if (isReviewer()) return '⭐';
    if (isAuthor()) return '✍️';
    return '👤';
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
            {isAuthor() && (
              <>
                <Link to="/submit-report" className="nav-link">Подать доклад</Link>
                <Link to="/my-reports" className="nav-link">Мои доклады</Link>
              </>
            )}
            
            {/* Ссылки для рецензентов */}
            {isReviewer() && (
              <Link to="/review-reports" className="nav-link">Рецензирование</Link>
            )}
            
            {/* Ссылки для администраторов */}
            {isAdmin() && (
              <>
                <Link to="/admin/create-conference" className="nav-link">Создать конф.</Link>
                <Link to="/admin/conferences" className="nav-link">Управление</Link>
                <Link to="/admin/users" className="nav-link">Пользователи</Link>
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
                    <span className="dropdown-icon">{getDisplayRoleIcon()}</span>
                    {getDisplayRole()}
                  </div>

                  {/* Ссылки для авторов */}
                  {isAuthor() && (
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
                  {isReviewer() && (
                    <Link to="/review-reports" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <span className="dropdown-icon">🔍</span>
                      Рецензирование
                    </Link>
                  )}

                  {/* Ссылки для администраторов */}
                  {isAdmin() && (
                    <>
                      <div className="dropdown-divider"></div>
                      <Link to="/admin/create-conference" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">➕</span>
                        Создать конференцию
                      </Link>
                      <Link to="/admin/conferences" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">📋</span>
                        Управление конференциями
                      </Link>
                      <Link to="/admin/users" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
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