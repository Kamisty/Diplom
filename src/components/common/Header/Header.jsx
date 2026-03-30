// src/components/common/Header/Header.jsx
import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext/Auth';
import { getRoleName, getRoleIcon, ROLES } from '../../../config/roles';
import RoleSwitcher from '../RoleSwitcher/RoleSwitcher';
import './Header.css';

const Header = () => {
  const { user, logout, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ✅ Мемоизируем роли
  const userRoles = useMemo(() => user?.roles || [], [user?.roles]);
  const availableRoles = useMemo(() => user?.availableRoles || userRoles, [user?.availableRoles, userRoles]);
  
  // ✅ УДАЛЕНО: isAdmin, isAuthor, isReviewer, isSectionHead — не использовались
// В Header.jsx, внутри компонента:
useEffect(() => {
  // Обработчик кастомного события от ManageUsers
  const handleUserRolesUpdated = (event) => {
    const updatedUser = event.detail;
    if (updatedUser && login) {
      // Обновляем контекст авторизации
      login(updatedUser);
      console.log('🔄 Header: роли обновлены через custom event');
    }
  };
  
  window.addEventListener('userRolesUpdated', handleUserRolesUpdated);
  
  return () => {
    window.removeEventListener('userRolesUpdated', handleUserRolesUpdated);
  };
}, [login]);

  // ✅ Отслеживаем изменения в localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user' && login) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          if (updatedUser) login(updatedUser);
        } catch (err) {
          console.error('Ошибка парсинга user из localStorage:', err);
        }
      }
    };

    let lastUserRef = JSON.stringify(user);
    const checkInterval = setInterval(() => {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== lastUserRef && login) {
        try {
          const updatedUser = JSON.parse(storedUser);
          if (JSON.stringify(updatedUser.roles) !== JSON.stringify(user?.roles)) {
            login(updatedUser);
          }
          lastUserRef = storedUser;
        } catch (err) {
          console.error('Ошибка при проверке обновлений:', err);
        }
      }
    }, 1000);

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, [user, login]);

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

  const getInitials = useMemo(() => {
    if (user?.name) {
      return user.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.login?.[0]?.toUpperCase() || 'U';
  }, [user?.name, user?.login]);

  const getDisplayRole = useMemo(() => {
    if (user?.activeRole) return getRoleName(user.activeRole);
    if (userRoles.length === 0) return 'Участник';
    if (userRoles.length === 1) return getRoleName(userRoles[0]);
    return `${userRoles.length} роли`;
  }, [user?.activeRole, userRoles]);

  const getDisplayRoleIcon = useMemo(() => {
    if (user?.activeRole) return getRoleIcon(user.activeRole);
    if (userRoles.includes(ROLES.ADMIN)) return '👑';
    if (userRoles.includes(ROLES.SECTION_HEAD)) return '🎯';
    if (userRoles.includes(ROLES.REVIEWER)) return '⭐';
    if (userRoles.includes(ROLES.AUTHOR)) return '✍️';
    return '👤';
  }, [user?.activeRole, userRoles]);

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h2>Конференции и сборник</h2>
        </Link>

        {user && (
          <nav className="nav-menu">
            <Link to="/dashboard" className="nav-link">Дашборд</Link>
            <Link to="/profile" className="nav-link">Профиль</Link>
            
            {user?.activeRole === ROLES.AUTHOR && (
              <>
                <Link to="/submit-report" className="nav-link">Подать доклад</Link>
                <Link to="/my-reports" className="nav-link">Мои доклады</Link>
              </>
            )}
            
            {user?.activeRole === ROLES.REVIEWER && (
              <Link to="/review-reports" className="nav-link">Рецензирование</Link>
            )}
            
            {user?.activeRole === ROLES.SECTION_HEAD && (
              <>
                <Link to="/section/manage" className="nav-link">Управление секцией</Link>
                <Link to="/section/reports" className="nav-link">Доклады секции</Link>
              </>
            )}
            
            {user?.activeRole === ROLES.ADMIN && (
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
            <div className="auth-buttons">
              <Link to="/input" className="btn btn-login">Вход</Link>
              <Link to="/register" className="btn btn-register">Регистрация</Link>
            </div>
          ) : (
            <div className="user-menu" ref={dropdownRef}>
              <div className="user-info" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <div className="avatar">{getInitials}</div>
                <span className="user-name">{user.name || user.login}</span>
                <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
              </div>

              {isDropdownOpen && (
                <div className="dropdown-menu">
                  {availableRoles && availableRoles.length > 0 && (
                    <>
                      <RoleSwitcher closeDropdown={() => setIsDropdownOpen(false)} />
                      <div className="dropdown-divider"></div>
                    </>
                  )}

                  <Link to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <span className="dropdown-icon">👤</span>Мой профиль
                  </Link>
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <span className="dropdown-icon">📊</span>Дашборд
                  </Link>
                  <div className="dropdown-divider"></div>

                  <div className="dropdown-item" style={{ cursor: 'default', background: '#f5f5f5' }}>
                    <span className="dropdown-icon">{getDisplayRoleIcon}</span>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Текущая роль:</div>
                      <div style={{ fontWeight: 'bold' }}>{getDisplayRole}</div>
                    </div>
                  </div>

                  {user?.activeRole === ROLES.AUTHOR && (
                    <>
                      <Link to="/submit-report" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">📝</span>Подать доклад
                      </Link>
                      <Link to="/my-reports" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">📚</span>Мои доклады
                      </Link>
                    </>
                  )}

                  {user?.activeRole === ROLES.REVIEWER && (
                    <Link to="/review-reports" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <span className="dropdown-icon">🔍</span>Рецензирование
                    </Link>
                  )}

                  {user?.activeRole === ROLES.SECTION_HEAD && (
                    <>
                      <Link to="/section/manage" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">🎯</span>Управление секцией
                      </Link>
                      <Link to="/section/reports" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">📄</span>Доклады секции
                      </Link>
                    </>
                  )}

                  {user?.activeRole === ROLES.ADMIN && (
                    <>
                      <div className="dropdown-divider"></div>
                      <Link to="/admin/create-conference" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">➕</span>Создать конференцию
                      </Link>
                      <Link to="/admin/conferences" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">📋</span>Управление конференциями
                      </Link>
                      <Link to="/admin/users" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">👥</span>Управление пользователями
                      </Link>
                      <Link to="/admin/assign-section-heads" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-icon">👑</span>Назначить руководителей
                      </Link>
                    </>
                  )}

                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="dropdown-item logout">
                    <span className="dropdown-icon">🚪</span>Выйти
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