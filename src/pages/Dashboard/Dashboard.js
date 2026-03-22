// src/pages/Dashboard/Dashboard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext/Auth';
import { hasPermission, getRoleName, getRoleIcon, ROLES } from '../../config/roles';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    activeConferences: 0,
    myReports: 0,
    pendingReviews: 0
  });

  // Получаем роли пользователя (массив)
  const userRoles = user?.roles || [];
  
  // Функции для проверки ролей
  const isAdmin = () => userRoles.includes(ROLES.ADMIN);
  const isAuthor = () => userRoles.includes(ROLES.AUTHOR);
  const isReviewer = () => userRoles.includes(ROLES.REVIEWER);
  const isSectionHead = () => userRoles.includes(ROLES.SECTION_HEAD);

  // Для отладки
  console.log('Dashboard - user:', user);
  console.log('Dashboard - userRoles:', userRoles);
  console.log('Dashboard - isAdmin:', isAdmin());
  console.log('Dashboard - isAuthor:', isAuthor());

  // Загрузка статистики
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const userId = user?.user_id || user?.id;
      
      // Загрузка количества докладов пользователя
      if (isAuthor()) {
        const reportsResponse = await fetch(`http://localhost:5000/api/reports/user/${userId}`);
        const reportsData = await reportsResponse.json();
        if (reportsData.success) {
          setStats(prev => ({ ...prev, myReports: reportsData.reports?.length || 0 }));
        }
      }
      
      // Загрузка количества конференций
      if (isAdmin()) {
        const confResponse = await fetch('http://localhost:5000/api/conferences');
        const confData = await confResponse.json();
        if (confData.success) {
          setStats(prev => ({ ...prev, activeConferences: confData.conferences?.length || 0 }));
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  // Быстрые действия на основе ролей
  const quickActions = [];

  // Для авторов
  if (isAuthor()) {
    quickActions.push({
      condition: true,
      title: 'Подать доклад',
      description: 'Подайте новый доклад на конференцию',
      link: '/submit-report',
      icon: '📝',
      color: '#667eea'
    });
    quickActions.push({
      condition: true,
      title: 'Мои доклады',
      description: 'Просмотрите свои поданные доклады',
      link: '/my-reports',
      icon: '📚',
      color: '#48bb78'
    });
  }

  // Для рецензентов
  if (isReviewer()) {
    quickActions.push({
      condition: true,
      title: 'Рецензирование',
      description: 'Проверьте назначенные вам доклады',
      link: '/review-reports',
      icon: '🔍',
      color: '#f56565'
    });
  }

  // Для администраторов
  if (isAdmin()) {
    quickActions.push({
      condition: true,
      title: 'Создать конференцию',
      description: 'Создайте новую научную конференцию',
      link: '/admin/create-conference',
      icon: '➕',
      color: '#9f7aea'
    });
    quickActions.push({
      condition: true,
      title: 'Управление конференциями',
      description: 'Редактируйте и управляйте конференциями',
      link: '/admin/conferences',
      icon: '📋',
      color: '#ed8936'
    });
    quickActions.push({
      condition: true,
      title: 'Управление пользователями',
      description: 'Управляйте пользователями системы',
      link: '/admin/users',
      icon: '👥',
      color: '#fc8181'
    });
    quickActions.push({
      condition: true,
      title: 'Назначить руководителей',
      description: 'Назначьте руководителей секций',
      link: '/admin/assign-section-heads',
      icon: '👑',
      color: '#fbbf24'
    });
  }

  // Для руководителей секций
  if (isSectionHead()) {
    quickActions.push({
      condition: true,
      title: 'Доклады секции',
      description: 'Просмотрите доклады вашей секции',
      link: '/section-reports',
      icon: '📊',
      color: '#1e90ff'
    });
  }

  // Получение отображаемого названия роли
  const getDisplayRole = () => {
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
    return userRoles.map(r => getRoleName(r)).join(', ');
  };

  // Получение иконки для ролей
  const getDisplayRoleIcon = () => {
    if (isAdmin()) return '👑';
    if (isSectionHead()) return '🎯';
    if (isReviewer()) return '⭐';
    if (isAuthor()) return '✍️';
    return '👤';
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="welcome-section">
          <h1>Добро пожаловать, {user?.name || user?.login}!</h1>
          <p className="role-info">
            {getDisplayRoleIcon()} Ваша роль: {getDisplayRole()}
          </p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Активные конференции</h3>
              <p className="stat-number">{stats.activeConferences}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>Мои доклады</h3>
              <p className="stat-number">{stats.myReports}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>Ожидают рецензии</h3>
              <p className="stat-number">{stats.pendingReviews}</p>
            </div>
          </div>
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
              <span className="activity-text">Добро пожаловать в систему!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;