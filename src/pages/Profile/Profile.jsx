import React, { useState, useEffect } from 'react';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  // Загрузка данных пользователя при монтировании компонента
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Получаем основные данные пользователя из localStorage
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        window.location.href = '/login';
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('Загружен пользователь:', parsedUser);
      console.log('Роли пользователя:', parsedUser.roles);

      // Загружаем дополнительные данные из таблицы user_profiles
      await loadUserProfile(parsedUser.user_id || parsedUser.id);

    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setMessage({
        type: 'error',
        text: 'Ошибка при загрузке данных профиля'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/user-profile/${userId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setProfile(data.profile);
        setEditFormData({
          ...data.profile,
          user_id: userId,
          email: user?.email,
          login: user?.login
        });
      } else {
        setProfile(null);
        setEditFormData({
          user_id: userId,
          email: user?.email,
          login: user?.login
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
    }
  };

  // Функции для проверки ролей (используем массив roles)
  const hasRole = (roleName) => {
    return user?.roles?.includes(roleName) || false;
  };

  const isAuthor = () => hasRole('Автор');
  const isReviewer = () => hasRole('Рецензент');
  const isSectionHead = () => hasRole('Руководитель секции');
  const isAdmin = () => hasRole('Администратор конференции');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditFormData({
        ...profile,
        user_id: user?.user_id || user?.id,
        email: user?.email,
        login: user?.login
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      const userId = user?.user_id || user?.id;
      
      const profileData = {
        user_id: userId,
        last_name: editFormData.last_name || '',
        first_name: editFormData.first_name || '',
        middle_name: editFormData.middle_name || '',
        academic_degree: editFormData.academic_degree || '',
        academic_title: editFormData.academic_title || '',
        position: editFormData.position || '',
        workplace: editFormData.workplace || '',
        phone: editFormData.phone || '',
        orcid_id: editFormData.orcid_id || '',
        avatar_url: editFormData.avatar_url || ''
      };

      const response = await fetch('http://localhost:5000/api/user-profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProfile(data.profile);
        
        setMessage({
          type: 'success',
          text: 'Профиль успешно обновлен!'
        });
        setIsEditing(false);
        
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(data.error || 'Ошибка при обновлении профиля');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setMessage({
        type: 'error',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getFullName = () => {
    if (!profile) return user?.name || 'Не указано';
    
    const parts = [];
    if (profile.last_name) parts.push(profile.last_name);
    if (profile.first_name) parts.push(profile.first_name);
    if (profile.middle_name) parts.push(profile.middle_name);
    
    return parts.length > 0 ? parts.join(' ') : (user?.name || 'Не указано');
  };

  // Получение отображаемого названия роли
  const getRoleDisplayName = (roleName) => {
    const roleMap = {
      'Администратор конференции': 'Администратор',
      'Руководитель секции': 'Руководитель секции',
      'Рецензент': 'Рецензент',
      'Автор': 'Автор',
    };
    return roleMap[roleName] || roleName;
  };

  // Получение CSS класса для роли
  const getRoleClass = (roleName) => {
    if (roleName.includes('Администратор')) return 'role-admin';
    if (roleName.includes('Руководитель')) return 'role-section_head';
    if (roleName.includes('Рецензент')) return 'role-reviewer';
    if (roleName.includes('Автор')) return 'role-author';
    return 'role-participant';
  };

  // Формирование строки с ролями для отображения
  const getDisplayRoles = () => {
    const roles = user?.roles || [];
    if (roles.length === 0) return 'Участник';
    if (roles.length === 1) return getRoleDisplayName(roles[0]);
    return roles.map(r => getRoleDisplayName(r)).join(', ');
  };

  if (loading) {
    return <div className="loading">Загрузка профиля...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Мой профиль</h1>
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="profile-content">
          {!isEditing ? (
            <div className="profile-view">
              <div className="profile-section">
                <h3>Основная информация</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>ФИО:</label>
                    <span>{getFullName()}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{user?.email || user?.login}</span>
                  </div>
                  <div className="info-item">
                    <label>Логин:</label>
                    <span>{user?.login}</span>
                  </div>
                  <div className="info-item">
                    <label>Роль в системе:</label>
                    <div className="role-container">
                      {user?.roles && user.roles.length > 0 ? (
                        user.roles.map((role, index) => (
                          <span key={index} className={`role-badge ${getRoleClass(role)}`}>
                            {getRoleDisplayName(role)}
                          </span>
                        ))
                      ) : (
                        <span className="role-badge role-participant">Участник</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

             
              
           
          
              {/* Личная информация */}
              <div className="profile-section">
                <h3>Личная информация</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Фамилия:</label>
                    <span>{profile?.last_name || 'Не указано'}</span>
                  </div>
                  <div className="info-item">
                    <label>Имя:</label>
                    <span>{profile?.first_name || 'Не указано'}</span>
                  </div>
                  <div className="info-item">
                    <label>Отчество:</label>
                    <span>{profile?.middle_name || 'Не указано'}</span>
                  </div>
                  <div className="info-item">
                    <label>Телефон:</label>
                    <span>{profile?.phone || 'Не указано'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h3>Научная деятельность</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Ученая степень:</label>
                    <span>{profile?.academic_degree || 'Не указано'}</span>
                  </div>
                  <div className="info-item">
                    <label>Ученое звание:</label>
                    <span>{profile?.academic_title || 'Не указано'}</span>
                  </div>
                  <div className="info-item">
                    <label>Должность:</label>
                    <span>{profile?.position || 'Не указано'}</span>
                  </div>
                  <div className="info-item">
                    <label>Место работы:</label>
                    <span>{profile?.workplace || 'Не указано'}</span>
                  </div>
                  <div className="info-item">
                    <label>ORCID ID:</label>
                    <span>{profile?.orcid_id || 'Не указано'}</span>
                  </div>
                </div>
              </div>

              {profile?.avatar_url && (
                <div className="profile-section">
                  <h3>Аватар</h3>
                  <div className="avatar-container">
                    <img src={profile.avatar_url} alt="Avatar" className="profile-avatar" />
                  </div>
                </div>
              )}

              <div className="profile-actions">
                <button className="btn-edit" onClick={handleEditToggle}>
                  Редактировать профиль
                </button>
                <button className="btn-change-password">
                  Сменить пароль
                </button>
                <button className="btn-logout" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            </div>
          ) : (
            // Режим редактирования (без изменений)
            <div className="profile-edit">
              <div className="profile-section">
                <h3>Основная информация</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="disabled-input"
                    />
                    <small>Email нельзя изменить</small>
                  </div>

                  <div className="form-group">
                    <label>Фамилия *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={editFormData.last_name || ''}
                      onChange={handleInputChange}
                      placeholder="Введите фамилию"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Имя *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={editFormData.first_name || ''}
                      onChange={handleInputChange}
                      placeholder="Введите имя"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Отчество</label>
                    <input
                      type="text"
                      name="middle_name"
                      value={editFormData.middle_name || ''}
                      onChange={handleInputChange}
                      placeholder="Введите отчество"
                    />
                  </div>

                  <div className="form-group">
                    <label>Телефон</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone || ''}
                      onChange={handleInputChange}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h3>Научная деятельность</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Ученая степень</label>
                    <select
                      name="academic_degree"
                      value={editFormData.academic_degree || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">Выберите степень</option>
                      <option value="Нет степени">Нет степени</option>
                      <option value="Кандидат наук">Кандидат наук</option>
                      <option value="Доктор наук">Доктор наук</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Ученое звание</label>
                    <select
                      name="academic_title"
                      value={editFormData.academic_title || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">Выберите звание</option>
                      <option value="Нет звания">Нет звания</option>
                      <option value="Доцент">Доцент</option>
                      <option value="Профессор">Профессор</option>
                      <option value="Старший научный сотрудник">Старший научный сотрудник</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Должность</label>
                    <input
                      type="text"
                      name="position"
                      value={editFormData.position || ''}
                      onChange={handleInputChange}
                      placeholder="Ваша должность"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Место работы / Организация</label>
                    <input
                      type="text"
                      name="workplace"
                      value={editFormData.workplace || ''}
                      onChange={handleInputChange}
                      placeholder="Название организации"
                    />
                  </div>

                  <div className="form-group">
                    <label>ORCID ID</label>
                    <input
                      type="text"
                      name="orcid_id"
                      value={editFormData.orcid_id || ''}
                      onChange={handleInputChange}
                      placeholder="0000-0000-0000-0000"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>URL аватара</label>
                    <input
                      type="url"
                      name="avatar_url"
                      value={editFormData.avatar_url || ''}
                      onChange={handleInputChange}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="edit-actions">
                <button 
                  className="btn-save" 
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
                <button 
                  className="btn-cancel" 
                  onClick={handleEditToggle}
                  disabled={loading}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;