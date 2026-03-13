// src/pages/Admin/ManageUsers.jsx
import React, { useState, useEffect } from 'react';
import './Admin.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError] = useState(null);

  // Загрузка пользователей с сервера
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || 'Ошибка при загрузке пользователей');
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.login?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Получение полного имени пользователя
  const getFullName = (user) => {
    if (user.name) return user.name;
    
    const parts = [];
    if (user.last_name) parts.push(user.last_name);
    if (user.first_name) parts.push(user.first_name);
    if (user.middle_name) parts.push(user.middle_name);
    
    return parts.length > 0 ? parts.join(' ') : 'Не указано';
  };

  // Форматирование роли для отображения
  const getRoleName = (role) => {
    const roleMap = {
      'admin': 'Администратор',
      'organizer': 'Организатор',
      'section_head': 'Руководитель секции',
      'reviewer': 'Рецензент',
      'author': 'Автор',
      'participant': 'Участник',
      'user': 'Пользователь'
    };
    return roleMap[role] || role;
  };

  // CSS класс для роли
  const getRoleClass = (role) => {
    const classMap = {
      'admin': 'role-admin',
      'organizer': 'role-organizer',
      'section_head': 'role-section-head',
      'reviewer': 'role-reviewer',
      'author': 'role-author',
      'participant': 'role-participant',
      'user': 'role-user'
    };
    return classMap[role] || 'role-default';
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  // Получение статуса пользователя (можно добавить поле в БД)
  const getUserStatus = (user) => {
    // По умолчанию все активны, если нет поля is_active
    return user.is_active !== false ? 'active' : 'inactive';
  };

  const getStatusClass = (status) => {
    return status === 'active' ? 'status-active' : 'status-inactive';
  };

  // Подсчет количества докладов пользователя
  const getUserReportsCount = (user) => {
    // Если есть данные о докладах в объекте пользователя
    if (user.reports_count !== undefined) return user.reports_count;
    if (user.reports) return user.reports;
    return 0;
  };

  const handleEditUser = async (userId) => {
    // Здесь можно открыть модальное окно для редактирования
    console.log('Редактирование пользователя:', userId);
    // Или перейти на страницу редактирования
    // navigate(`/admin/edit-user/${userId}`);
  };

  const handleChangeRole = async (userId) => {
    // Здесь можно открыть модальное окно для смены роли
    console.log('Изменение роли пользователя:', userId);
    
    // Пример вызова API для смены роли
    // const newRole = prompt('Введите новую роль (admin/organizer/section_head/reviewer/author):');
    // if (newRole) {
    //   try {
    //     const response = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
    //       method: 'PUT',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ role: newRole })
    //     });
    //     const data = await response.json();
    //     if (data.success) {
    //       loadUsers(); // Перезагружаем список
    //     }
    //   } catch (error) {
    //     console.error('Ошибка при смене роли:', error);
    //   }
    // }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    // Здесь можно реализовать блокировку/активацию пользователя
    console.log('Изменение статуса пользователя:', userId);
    
    // Пример вызова API для изменения статуса
    // try {
    //   const response = await fetch(`http://localhost:5000/api/users/${userId}/toggle-status`, {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    //   const data = await response.json();
    //   if (data.success) {
    //     loadUsers(); // Перезагружаем список
    //   }
    // } catch (error) {
    //   console.error('Ошибка при изменении статуса:', error);
    // }
  };

  return (
    <div className="admin-page">
      <div className="container">
        <h1>Управление пользователями</h1>

        <div className="admin-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Поиск по имени, email или логину..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-select">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="role-select"
            >
              <option value="all">Все роли</option>
              <option value="admin">Администраторы</option>
              <option value="section_head">Руководители секций</option>
              <option value="reviewer">Рецензенты</option>
              <option value="author">Авторы</option>

            </select>
          </div>

          <button className="btn-refresh" onClick={loadUsers}>
            🔄 Обновить
          </button>
        </div>

        {loading ? (
          <div className="loading">Загрузка пользователей...</div>
        ) : error ? (
          <div className="error-message">
            <p>Ошибка: {error}</p>
            <button onClick={loadUsers} className="btn-retry">
              Повторить загрузку
            </button>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ФИО</th>
                  <th>Логин</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Дата регистрации</th>
                  <th>Докладов</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const status = getUserStatus(user);
                  return (
                    <tr key={user.user_id || user.id}>
                      <td>{user.user_id || user.id}</td>
                      <td className="user-name">{getFullName(user)}</td>
                      <td>{user.login || '-'}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${getRoleClass(user.role)}`}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td>{formatDate(user.created_at || user.registered)}</td>
                      <td>{getUserReportsCount(user)}</td>
                      <td className="actions">
                        <button 
                          className="btn-icon edit"
                          onClick={() => handleEditUser(user.user_id || user.id)}
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon role"
                          onClick={() => handleChangeRole(user.user_id || user.id)}
                          title="Изменить роль"
                        >
                          👥
                        </button>
                        <button 
                          className={`btn-icon ${status === 'active' ? 'block' : 'activate'}`}
                          onClick={() => handleToggleStatus(user.user_id || user.id, status)}
                          title={status === 'active' ? 'Заблокировать' : 'Активировать'}
                        >
                          {status === 'active' ? '🔒' : '🔓'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="no-data">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Пользователи не найдены по заданным фильтрам'
                  : 'Пользователи не найдены'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;