// src/pages/Dashboard/Dashboard.jsx
import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext/Auth';
import { getRoleName, ROLES } from '../../config/roles';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    activeConferences: 0,
    myReports: 0,
    pendingReviews: 0
  });

  // Получаем АКТИВНУЮ роль пользователя
  const activeRole = user?.activeRole;
  
  // ✅ FIX: Оборачиваем userRoles в useMemo для стабильной ссылки
  const userRoles = useMemo(() => user?.roles || [], [user?.roles]);
  
  // ✅ FIX: Простая функция без useCallback (тривиальная логика)
  const isActiveRole = (role) => activeRole === role;
  
  // Для отладки
  console.log('Dashboard - user:', user);
  console.log('Dashboard - activeRole:', activeRole);
  console.log('Dashboard - userRoles:', userRoles);
  console.log('Dashboard - isAdmin:', isActiveRole(ROLES.ADMIN));
  console.log('Dashboard - isAuthor:', isActiveRole(ROLES.AUTHOR));

  // ✅ FIX: loadStats с правильными зависимостями
  const loadStats = useCallback(async () => {
    try {
      const userId = user?.user_id || user?.id;
      
      // ✅ Используем прямое сравнение вместо isActiveRole для избежания лишних зависимостей
      if (activeRole === ROLES.AUTHOR) {
        const reportsResponse = await fetch(`https://diplom-j6uo.onrender.com/api/reports/user/${userId}`);
        const reportsData = await reportsResponse.json();
        if (reportsData.success) {
          setStats(prev => ({ ...prev, myReports: reportsData.reports?.length || 0 }));
        }
      }
      
      if (activeRole === ROLES.ADMIN) {
        const confResponse = await fetch('https://diplom-j6uo.onrender.com/api/conferences');
        const confData = await confResponse.json();
        if (confData.success) {
          setStats(prev => ({ ...prev, activeConferences: confData.conferences?.length || 0 }));
        }
      }
      
      if (activeRole === ROLES.REVIEWER) {
        const reviewsResponse = await fetch(`https://diplom-j6uo.onrender.com/api/reviews/pending/${userId}`);
        const reviewsData = await reviewsResponse.json();
        if (reviewsData.success) {
          setStats(prev => ({ ...prev, pendingReviews: reviewsData.count || 0 }));
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  }, [activeRole, user?.user_id, user?.id]); // ✅ Только необходимые зависимости

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ✅ FIX: getQuickActions с правильными зависимостями
  const getQuickActions = useCallback(() => {
    const actions = [];
    
    if (activeRole === ROLES.AUTHOR) {
      actions.push({
        title: 'Подать доклад',
        description: 'Подайте новый доклад на конференцию',
        link: '/submit-report',
        icon: '📝',
        color: '#667eea'
      });
      actions.push({
        title: 'Мои доклады',
        description: 'Просмотрите свои поданные доклады',
        link: '/my-reports',
        icon: '📚',
        color: '#48bb78'
      });
    }
    
    if (activeRole === ROLES.REVIEWER) {
      actions.push({
        title: 'Рецензирование',
        description: 'Проверьте назначенные вам доклады',
        link: '/review-reports',
        icon: '🔍',
        color: '#f56565'
      });
    }
    
    if (activeRole === ROLES.SECTION_HEAD) {
      actions.push({
        title: 'Доклады секции',
        description: 'Просмотрите доклады вашей секции',
        link: '/section-reports',
        icon: '📊',
        color: '#1e90ff'
      });
      actions.push({
        title: 'Управление секцией',
        description: 'Управляйте секцией и назначениями',
        link: '/section/manage',
        icon: '⚙️',
        color: '#fbbf24'
      });
    }
    
    if (activeRole === ROLES.ADMIN) {
      actions.push({
        title: 'Создать конференцию',
        description: 'Создайте новую научную конференцию',
        link: '/admin/create-conference',
        icon: '➕',
        color: '#9f7aea'
      });
      actions.push({
        title: 'Управление конференциями',
        description: 'Редактируйте и управляйте конференциями',
        link: '/admin/conferences',
        icon: '📋',
        color: '#ed8936'
      });
      actions.push({
        title: 'Управление пользователями',
        description: 'Управляйте пользователями системы',
        link: '/admin/users',
        icon: '👥',
        color: '#fc8181'
      });
      actions.push({
        title: 'Назначить руководителей',
        description: 'Назначьте руководителей секций',
        link: '/admin/assign-section-heads',
        icon: '👑',
        color: '#fbbf24'
      });
    }
    
    return actions;
  }, [activeRole]); // ✅ Только activeRole

  // ✅ FIX: getDisplayRole с правильными зависимостями
  const getDisplayRole = useCallback(() => {
    if (!activeRole) {
      if (userRoles.length === 0) return 'Участник';
      if (userRoles.length === 1) {
        const roleMap = {
          [ROLES.ADMIN]: 'Администратор',
          [ROLES.SECTION_HEAD]: 'Руководитель секции',
          [ROLES.REVIEWER]: 'Рецензент',
          [ROLES.AUTHOR]: 'Автор'
        };
        return roleMap[userRoles[0]] || userRoles[0];
      }
      return `${userRoles.length} ролей доступно`;
    }
    
    const roleMap = {
      [ROLES.ADMIN]: 'Администратор',
      [ROLES.SECTION_HEAD]: 'Руководитель секции',
      [ROLES.REVIEWER]: 'Рецензент',
      [ROLES.AUTHOR]: 'Автор'
    };
    return roleMap[activeRole] || activeRole;
  }, [activeRole, userRoles]); // ✅ userRoles стабилизирован через useMemo

  // ✅ FIX: getDisplayRoleIcon с правильными зависимостями
  const getDisplayRoleIcon = useCallback(() => {
    if (activeRole === ROLES.ADMIN) return '👑';
    if (activeRole === ROLES.SECTION_HEAD) return '🎯';
    if (activeRole === ROLES.REVIEWER) return '⭐';
    if (activeRole === ROLES.AUTHOR) return '✍️';
    
    if (userRoles.includes(ROLES.ADMIN)) return '👑';
    if (userRoles.includes(ROLES.SECTION_HEAD)) return '🎯';
    if (userRoles.includes(ROLES.REVIEWER)) return '⭐';
    if (userRoles.includes(ROLES.AUTHOR)) return '✍️';
    return '👤';
  }, [activeRole, userRoles]); // ✅ userRoles стабилизирован

  const quickActions = getQuickActions();
  
  // ✅ FIX: otherRoles через useMemo для стабильности
  const hasMultipleRoles = userRoles.length > 1;
  const otherRoles = useMemo(() => userRoles.filter(role => role !== activeRole), [userRoles, activeRole]);

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="welcome-section">
          <h1>Добро пожаловать, {user?.name || user?.login}!</h1>
          <p className="role-info">
            {getDisplayRoleIcon()} Текущая роль: {getDisplayRole()}
          </p>
          
          {hasMultipleRoles && otherRoles.length > 0 && (
            <div className="other-roles-hint">
              💡 У вас также есть другие роли: 
              {otherRoles.map(role => (
                <span key={role} className="other-role-tag">
                  {getRoleName(role)}
                </span>
              ))}
              <br />
              <small>Нажмите на свой аватар в шапке, чтобы переключиться между ролями</small>
            </div>
          )}
        </div>

        <div className="stats-grid">
          {activeRole === ROLES.ADMIN && (
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>Активные конференции</h3>
                <p className="stat-number">{stats.activeConferences}</p>
              </div>
            </div>
          )}
          
          {activeRole === ROLES.AUTHOR && (
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <h3>Мои доклады</h3>
                <p className="stat-number">{stats.myReports}</p>
              </div>
            </div>
          )}
          
          {activeRole === ROLES.REVIEWER && (
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3>Ожидают рецензии</h3>
                <p className="stat-number">{stats.pendingReviews}</p>
              </div>
            </div>
          )}
          
          {activeRole !== ROLES.ADMIN && activeRole !== ROLES.AUTHOR && activeRole !== ROLES.REVIEWER && (
            <div className="stat-card">
              <div className="stat-icon">👋</div>
              <div className="stat-content">
                <h3>Добро пожаловать!</h3>
                <p className="stat-text">Рады видеть вас в системе</p>
              </div>
            </div>
          )}
        </div>

        {quickActions.length > 0 && (
          <div className="quick-actions">
            <h2>Быстрые действия</h2>
            <div className="actions-grid">
              {quickActions.map((action, index) => (
                <Link to={action.link} key={index} className="action-card">
                  <div className="action-icon" style={{ background: action.color }}>
                    {action.icon}
                  </div>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="recent-activity">
          <h2>Последние активности</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-date">Сегодня</span>
              <span className="activity-text">
                Вы вошли в систему как {getDisplayRole()}
              </span>
            </div>
            {activeRole === ROLES.AUTHOR && (
              <div className="activity-item">
                <span className="activity-date">Сегодня</span>
                <span className="activity-text">
                  У вас {stats.myReports} поданных докладов
                </span>
              </div>
            )}
            {activeRole === ROLES.REVIEWER && (
              <div className="activity-item">
                <span className="activity-date">Сегодня</span>
                <span className="activity-text">
                  {stats.pendingReviews} докладов ожидают вашей рецензии
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;