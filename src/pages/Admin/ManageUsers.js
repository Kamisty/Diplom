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

      console.log('Загруженные пользователи:', data); // Добавляем отладку

      if (response.ok && data.success) {
        setUsers(data.users);
        console.log('✅ Загружено пользователей:', data.users.length);
      } else {
        throw new Error(data.error || 'Ошибка при загрузке пользователей');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Получение всех ролей пользователя в виде строки
  const getUserRolesString = (user) => {
    if (!user.roles || !Array.isArray(user.roles)) return 'Участник';
    if (user.roles.length === 0) return 'Участник';
    
    const roleMap = {
      'Администратор конференции': 'Администратор',
      'Руководитель секции': 'Руководитель секции',
      'Рецензент': 'Рецензент',
      'Автор': 'Автор'
    };
    
    return user.roles.map(r => roleMap[r] || r).join(', ');
  };

  // Проверка, имеет ли пользователь определенную роль
  const hasRole = (user, roleName) => {
    return user.roles?.includes(roleName) || false;
  };

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.login?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    let matchesRole = true;
    if (roleFilter !== 'all') {
      // Преобразуем фильтр в русское название
      const roleMap = {
        'admin': 'Администратор конференции',
        'section_head': 'Руководитель секции',
        'reviewer': 'Рецензент',
        'author': 'Автор'
      };
      const roleName = roleMap[roleFilter];
      matchesRole = hasRole(user, roleName);
    }
    
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

  // CSS класс для роли (берем первую роль)
  const getRoleClass = (user) => {
    if (!user.roles || user.roles.length === 0) return 'role-default';
    
    const role = user.roles[0];
    if (role.includes('Администратор')) return 'role-admin';
    if (role.includes('Руководитель')) return 'role-section-head';
    if (role.includes('Рецензент')) return 'role-reviewer';
    if (role.includes('Автор')) return 'role-author';
    return 'role-default';
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    try {
      const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      };
      return new Date(dateString).toLocaleDateString('ru-RU', options);
    } catch {
      return dateString;
    }
  };

  const handleEditUser = async (userId) => {
    console.log('Редактирование пользователя:', userId);
  };

  const handleChangeRole = async (userId) => {
    console.log('Изменение роли пользователя:', userId);
    // Здесь можно добавить модальное окно для изменения ролей
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    console.log('Изменение статуса пользователя:', userId);
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
                  <th>Роли</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.user_id}>
                    <td>{user.user_id}</td>
                    <td className="user-name">{getFullName(user)}</td>
                    <td>{user.login || '-'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${getRoleClass(user)}`}>
                        {getUserRolesString(user)}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td className="actions">
                      <button 
                        className="btn-icon edit"
                        onClick={() => handleEditUser(user.user_id)}
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon role"
                        onClick={() => handleChangeRole(user.user_id)}
                        title="Изменить роль"
                      >
                        👥
                      </button>
                    </td>
                  </tr>
                ))}
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