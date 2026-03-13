// src/pages/Dashboard/Dashboard.jsx
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext/Auth';
import { hasPermission, getRoleName, getRoleIcon } from '../../config/roles';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  const quickActions = [
    // Для авторов
    {
      condition: hasPermission(user?.role, 'submit_report'),
      title: 'Подать доклад',
      description: 'Подайте новый доклад на конференцию',
      link: '/submit-report',
      icon: '📝',
      color: '#667eea'
    },
    {
      condition: hasPermission(user?.role, 'view_own_reports'),
      title: 'Мои доклады',
      description: 'Просмотрите свои поданные доклады',
      link: '/my-reports',
      icon: '📚',
      color: '#48bb78'
    },
    // Для рецензентов
    {
      condition: hasPermission(user?.role, 'view_assigned_reports'),
      title: 'Рецензирование',
      description: 'Проверьте назначенные вам доклады',
      link: '/review/assigned',
      icon: '🔍',
      color: '#f56565'
    },
    // Для администраторов
    {
      condition: hasPermission(user?.role, 'create_conference'),
      title: 'Создать конференцию',
      description: 'Создайте новую научную конференцию',
      link: '/admin/create-conference',
      icon: '➕',
      color: '#9f7aea'
    },
    {
      condition: hasPermission(user?.role, 'edit_conference'),
      title: 'Управление конференциями',
      description: 'Редактируйте и управляйте конференциями',
      link: '/admin/manage-conferences',
      icon: '📋',
      color: '#ed8936'
    },
    {
      condition: hasPermission(user?.role, 'manage_users'),
      title: 'Управление пользователями',
      description: 'Управляйте пользователями системы',
      link: '/admin/manage-users',
      icon: '👥',
      color: '#fc8181'
    },
    {
      condition: hasPermission(user?.role, 'assign_section_heads'),
      title: 'Назначить руководителей',
      description: 'Назначьте руководителей секций',
      link: '/admin/assign-section-heads',
      icon: '👑',
      color: '#fbbf24'
    }
  ].filter(action => action.condition);

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="welcome-section">
          <h1>Добро пожаловать, {user?.name || user?.login}!</h1>
          <p className="role-info">
            {getRoleIcon(user?.role)} Ваша роль: {getRoleName(user?.role)}
          </p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Активные конференции</h3>
              <p className="stat-number">0</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>Мои доклады</h3>
              <p className="stat-number">0</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>Ожидают рецензии</h3>
              <p className="stat-number">0</p>
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