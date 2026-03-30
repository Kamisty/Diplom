// src/pages/Admin/ManageUsers.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Admin.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError] = useState(null);
  
  // Состояния для модального окна изменения ролей
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [roleMessage, setRoleMessage] = useState({ type: '', text: '' });
  
  // Состояния для модального окна просмотра профиля
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ✅ FIX: allRoles в useMemo для стабильной ссылки
  const allRoles = useMemo(() => [
    { id: 'author', name: 'Автор', dbName: 'Автор', description: 'Подача докладов' },
    { id: 'reviewer', name: 'Рецензент', dbName: 'Рецензент', description: 'Рецензирование докладов' },
    { id: 'section_head', name: 'Руководитель секции', dbName: 'Руководитель секции', description: 'Управление секцией' },
    { id: 'admin', name: 'Администратор', dbName: 'Администратор конференции', description: 'Полный доступ к системе' }
  ], []);

  // ✅ FIX: loadUsers через useCallback
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();

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
  }, []);

  // ✅ FIX: useEffect с loadUsers в зависимостях
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Получение всех ролей пользователя в виде строки
  const getUserRolesString = useCallback((user) => {
    if (!user.roles || !Array.isArray(user.roles)) return 'Участник';
    if (user.roles.length === 0) return 'Участник';
    
    const roleMap = {
      'Администратор конференции': 'Администратор',
      'Руководитель секции': 'Руководитель секции',
      'Рецензент': 'Рецензент',
      'Автор': 'Автор'
    };
    
    return user.roles.map(r => roleMap[r] || r).join(', ');
  }, []);

  // Проверка, имеет ли пользователь определенную роль
  const hasRole = useCallback((user, roleName) => {
    return user.roles?.includes(roleName) || false;
  }, []);

  // ✅ FIX: filteredUsers через useMemo
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.login?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      let matchesRole = true;
      if (roleFilter !== 'all') {
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
  }, [users, searchTerm, roleFilter, hasRole]);

  // Получение полного имени пользователя
  const getFullName = useCallback((user) => {
    if (user.name) return user.name;
    
    const parts = [];
    if (user.last_name) parts.push(user.last_name);
    if (user.first_name) parts.push(user.first_name);
    if (user.middle_name) parts.push(user.middle_name);
    
    return parts.length > 0 ? parts.join(' ') : 'Не указано';
  }, []);

  const getRoleClass = useCallback((user) => {
    if (!user.roles || user.roles.length === 0) return 'role-default';
    
    const role = user.roles[0];
    if (role.includes('Администратор')) return 'role-admin';
    if (role.includes('Руководитель')) return 'role-section-head';
    if (role.includes('Рецензент')) return 'role-reviewer';
    if (role.includes('Автор')) return 'role-author';
    return 'role-default';
  }, []);

  // Функция для просмотра профиля пользователя
  const handleViewProfile = useCallback(async (userId) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    
    setProfileUser(user);
    setLoadingProfile(true);
    setShowProfileModal(true);
    
    try {
      const response = await fetch(`http://localhost:5000/api/user-profile/${userId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setProfileData(data.profile);
      } else {
        setProfileData(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      setProfileData(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [users]);

  // Функция для открытия модального окна изменения ролей
  const handleChangeRole = useCallback((userId) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    
    setSelectedUser(user);
    setSelectedRoles(user.roles || []);
    setRoleMessage({ type: '', text: '' });
    setShowRoleModal(true);
  }, [users]);

  // Функция для переключения роли (добавление/удаление)
  const toggleRole = useCallback((roleId) => {
    const role = allRoles.find(r => r.id === roleId);
    if (!role) return;
    
    setSelectedRoles(prev => {
      if (prev.includes(role.dbName)) {
        return prev.filter(r => r !== role.dbName);
      } else {
        return [...prev, role.dbName];
      }
    });
  }, [allRoles]);

  // ✅ FIX: Функция для сохранения изменений ролей (ОСНОВНОЕ ИСПРАВЛЕНИЕ)
  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    
    setSavingRoles(true);
    setRoleMessage({ type: '', text: '' });
    
    try {
      const response = await fetch('http://localhost:5000/api/user/update-roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.user_id,
          roles: selectedRoles
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // ✅ FIX 1: Используем data.roles из ответа сервера
        const updatedRoles = data.roles || selectedRoles;
        
        // ✅ FIX 2: Обновляем список пользователей в таблице
        setUsers(prev => prev.map(u => 
          u.user_id === selectedUser.user_id 
            ? { ...u, roles: updatedRoles }
            : u
        ));
        
        // ✅ FIX 3: Если это текущий пользователь — обновляем localStorage!
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const currentUser = JSON.parse(storedUser);
            
            // Проверяем, что это тот же пользователь
            if (currentUser.user_id === selectedUser.user_id || currentUser.id === selectedUser.user_id) {
              const updatedUser = {
                ...currentUser,
                roles: updatedRoles,
                availableRoles: updatedRoles,
                // Если активная роль была удалена, переключаем на первую доступную
                activeRole: updatedRoles.includes(currentUser.activeRole) 
                  ? currentUser.activeRole 
                  : (updatedRoles[0] || null)
              };
              
              // ✅ Сохраняем обновлённого пользователя
              localStorage.setItem('user', JSON.stringify(updatedUser));
              
              // ✅ Dispatch custom event для обновления всех компонентов (Header, Profile)
              window.dispatchEvent(new CustomEvent('userRolesUpdated', { 
                detail: updatedUser 
              }));
              
              console.log('✅ Текущий пользователь обновлён в localStorage:', updatedUser);
            }
          }
        } catch (err) {
          console.error('❌ Ошибка при обновлении localStorage:', err);
        }
        
        setRoleMessage({ 
          type: 'success', 
          text: `Роли пользователя "${getFullName(selectedUser)}" успешно обновлены!` 
        });
        
        // ✅ FIX 4: Закрываем модальное окно и сбрасываем состояния
        setTimeout(() => {
          setShowRoleModal(false);
          setSelectedUser(null);
          setSelectedRoles([]);
          setRoleMessage({ type: '', text: '' });
          
          // ✅ FIX 5: Принудительное обновление страницы (можно убрать для более плавного UX)
          window.location.reload();
        }, 600);
        
      } else {
        setRoleMessage({ 
          type: 'error', 
          text: data.error || 'Ошибка при обновлении ролей' 
        });
      }
    } catch (error) {
      console.error('❌ Ошибка при сохранении ролей:', error);
      setRoleMessage({ 
        type: 'error', 
        text: 'Ошибка подключения к серверу' 
      });
    } finally {
      setSavingRoles(false);
    }
  };

  // Функция для закрытия модального окна ролей
  const closeRoleModal = useCallback(() => {
    setShowRoleModal(false);
    setSelectedUser(null);
    setSelectedRoles([]);
    setRoleMessage({ type: '', text: '' });
  }, []);

  // Функция для закрытия модального окна профиля
  const closeProfileModal = useCallback(() => {
    setShowProfileModal(false);
    setProfileUser(null);
    setProfileData(null);
  }, []);

  const handleEditUser = useCallback((userId) => {
    console.log('Редактирование пользователя:', userId);
  }, []);

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
                  <th>№</th>
                  <th>ФИО</th>
                  <th>Логин</th>
                  <th>Email</th>
                  <th>Роли</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr key={user.user_id}>
                    <td>{index + 1}</td>
                    <td className="user-name">{getFullName(user)}</td>
                    <td>{user.login || '-'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${getRoleClass(user)}`}>
                        {getUserRolesString(user)}
                      </span>
                    </td>
                    <td className="actions">
                      <button 
                        className="btn-icon profile"
                        onClick={() => handleViewProfile(user.user_id)}
                        title="Просмотр профиля"
                      >
                        👤
                      </button>
                     
                      <button 
                        className="btn-icon role"
                        onClick={() => handleChangeRole(user.user_id)}
                        title="Изменить роль"
                      >
                        ✏️
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

      {/* Модальное окно для изменения ролей */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay" onClick={closeRoleModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Изменение ролей пользователя</h2>
              <button className="modal-close" onClick={closeRoleModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="user-info">
                <p><strong>Пользователь:</strong> {getFullName(selectedUser)}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
              </div>
              
              {roleMessage.text && (
                <div className={`role-message ${roleMessage.type}`}>
                  {roleMessage.text}
                </div>
              )}
              
              <div className="roles-selection">
                <label>Выберите роли:</label>
                <div className="roles-checkboxes">
                  {allRoles.map(role => (
                    <label key={role.id} className="role-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.dbName)}
                        onChange={() => toggleRole(role.id)}
                        disabled={savingRoles}
                      />
                      <div className="role-info">
                        <span className="role-name">{role.name}</span>
                        <span className="role-desc">{role.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={closeRoleModal}
                disabled={savingRoles}
              >
                Отмена
              </button>
              <button 
                className="btn-save" 
                onClick={handleSaveRoles}
                disabled={savingRoles}
              >
                {savingRoles ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для просмотра профиля */}
      {showProfileModal && profileUser && (
        <div className="modal-overlay" onClick={closeProfileModal}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Профиль пользователя</h2>
              <button className="modal-close" onClick={closeProfileModal}>×</button>
            </div>
            
            <div className="modal-body">
              {loadingProfile ? (
                <div className="loading-profile">Загрузка данных...</div>
              ) : (
                <>
                  <div className="profile-avatar">
                    {profileData?.avatar_url ? (
                      <img src={profileData.avatar_url} alt="Avatar" className="profile-avatar-img" />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {getFullName(profileUser).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="profile-section">
                    <h3>Основная информация</h3>
                    <div className="profile-info-grid">
                      <div className="profile-info-item">
                        <label>ФИО:</label>
                        <span>{getFullName(profileUser)}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Логин:</label>
                        <span>{profileUser.login}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Email:</label>
                        <span>{profileUser.email}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Роли:</label>
                        <span>{getUserRolesString(profileUser)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="profile-section">
                    <h3>Личная информация</h3>
                    <div className="profile-info-grid">
                      <div className="profile-info-item">
                        <label>Фамилия:</label>
                        <span>{profileData?.last_name || 'Не указано'}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Имя:</label>
                        <span>{profileData?.first_name || 'Не указано'}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Отчество:</label>
                        <span>{profileData?.middle_name || 'Не указано'}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Телефон:</label>
                        <span>{profileData?.phone || 'Не указано'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="profile-section">
                    <h3>Научная деятельность</h3>
                    <div className="profile-info-grid">
                      <div className="profile-info-item">
                        <label>Ученая степень:</label>
                        <span>{profileData?.academic_degree || 'Не указано'}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Ученое звание:</label>
                        <span>{profileData?.academic_title || 'Не указано'}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Должность:</label>
                        <span>{profileData?.position || 'Не указано'}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>Место работы:</label>
                        <span>{profileData?.workplace || 'Не указано'}</span>
                      </div>
                      <div className="profile-info-item">
                        <label>ORCID ID:</label>
                        <span>{profileData?.orcid_id || 'Не указано'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {profileData?.created_at && (
                    <div className="profile-section">
                      <h3>Дата регистрации</h3>
                      <div className="profile-info-item">
                        <span>{new Date(profileData.created_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeProfileModal}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;