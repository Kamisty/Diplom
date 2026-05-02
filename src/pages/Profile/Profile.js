import React, { useState, useEffect, useCallback } from 'react';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [emailChangeData, setEmailChangeData] = useState({
    new_email: '',
    confirm_email: '',
    password: ''
  });
 
  const [resetPasswordData, setResetPasswordData] = useState({
    email: '',
    resetCode: '',
    new_password: '',
    confirm_password: ''
  });
  const [resetStep, setResetStep] = useState(1);
  const [countdown, setCountdown] = useState(0);

  // Обернем loadUserProfile в useCallback
  const loadUserProfile = useCallback(async (userId) => {
    try {
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/user-profile/${userId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setProfile(data.profile);
        setEditFormData(prev => ({
          ...data.profile,
          user_id: userId,
          email: user?.email,
          login: user?.login
        }));
      } else {
        setProfile(null);
        setEditFormData(prev => ({
          user_id: userId,
          email: user?.email,
          login: user?.login
        }));
      }
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
    }
  }, [user?.email, user?.login]);

  // Обернем loadUserData в useCallback
  const loadUserData = useCallback(async () => {
    try {
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
  }, [loadUserProfile]);


  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Таймер для обратного отсчета
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);


  useEffect(() => {
    const handleUserRolesUpdated = (event) => {
      const updatedUser = event.detail;
      if (updatedUser && user?.user_id === updatedUser.user_id) {
        // Обновляем локальный state пользователя
        setUser(updatedUser);
        // Перезагружаем данные профиля для синхронизации
        loadUserProfile(updatedUser.user_id || updatedUser.id);
        console.log('🔄 Profile: роли обновлены через custom event');
      }
    };
    
    window.addEventListener('userRolesUpdated', handleUserRolesUpdated);
    
    return () => {
      window.removeEventListener('userRolesUpdated', handleUserRolesUpdated);
    };
  }, [user?.user_id, loadUserProfile]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailChangeInput = (e) => {
    const { name, value } = e.target;
    setEmailChangeData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResetPasswordInput = (e) => {
    const { name, value } = e.target;
    setResetPasswordData(prev => ({
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

      const response = await fetch('https://diplom-j6uo.onrender.com/api/user-profile/update', {
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

  // Функция для смены email
  const handleChangeEmail = async (e) => {
    e.preventDefault();

    if (!emailChangeData.new_email || !emailChangeData.confirm_email || !emailChangeData.password) {
        setMessage({
            type: 'error',
            text: 'Пожалуйста, заполните все поля'
        });
        return;
    }

    if (emailChangeData.new_email !== emailChangeData.confirm_email) {
        setMessage({
            type: 'error',
            text: 'Новый email и подтверждение не совпадают'
        });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailChangeData.new_email)) {
        setMessage({
            type: 'error',
            text: 'Введите корректный email адрес'
        });
        return;
    }

    try {
        setLoading(true);
        const userId = user?.user_id || user?.id;

        const response = await fetch('https://diplom-j6uo.onrender.com/api/user/change-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId, 
                newEmail: emailChangeData.new_email,
                password: emailChangeData.password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const updatedUser = { ...user, email: data.user.email, login: data.user.login };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            setMessage({
                type: 'success',
                text: 'Email успешно изменен!'
            });

            setIsChangingEmail(false);
            setEmailChangeData({ new_email: '', confirm_email: '', password: '' });

            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } else {
            throw new Error(data.error || 'Ошибка при смене email');
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

  // Функция для отправки кода сброса пароля на email
  const handleSendResetCode = async (e) => {
    e.preventDefault();
    
    const email = resetPasswordData.email || user?.email;
    
    if (!email) {
      setMessage({
        type: 'error',
        text: 'Пожалуйста, укажите email'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('https://diplom-j6uo.onrender.com/api/user/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCountdown(60);
        setResetStep(2);
        setMessage({
          type: 'success',
          text: 'Код подтверждения отправлен на вашу почту'
        });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(data.error || 'Ошибка при отправке кода');
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

  // Функция для подтверждения кода и смены пароля
  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();

    if (!resetPasswordData.resetCode) {
      setMessage({
        type: 'error',
        text: 'Пожалуйста, введите код подтверждения'
      });
      return;
    }

    if (!resetPasswordData.new_password || !resetPasswordData.confirm_password) {
      setMessage({
        type: 'error',
        text: 'Пожалуйста, заполните все поля'
      });
      return;
    }

    if (resetPasswordData.new_password !== resetPasswordData.confirm_password) {
      setMessage({
        type: 'error',
        text: 'Новый пароль и подтверждение не совпадают'
      });
      return;
    }

    if (resetPasswordData.new_password.length < 8) {
      setMessage({
        type: 'error',
        text: 'Новый пароль должен содержать минимум 8 символов'
      });
      return;
    }

    try {
      setLoading(true);
      const email = resetPasswordData.email || user?.email;

      const response = await fetch('https://diplom-j6uo.onrender.com/api/user/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: resetPasswordData.resetCode,
          newPassword: resetPasswordData.new_password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: 'Пароль успешно изменен!'
        });

        setTimeout(() => {
          setIsChangingPassword(false);
          setResetStep(1);
          setResetPasswordData({
            email: '',
            resetCode: '',
            new_password: '',
            confirm_password: ''
          });
          setMessage({ type: '', text: '' });
        }, 2000);
      } else {
        throw new Error(data.error || 'Ошибка при смене пароля');
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

  // ✅ FIX: Функция getDisplayRoles удалена, так как не использовалась
  // Роли отображаются через badges в JSX ниже

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
                    <button 
                      className="btn-change-email-inline" 
                      onClick={() => setIsChangingEmail(true)}
                    >
                      Изменить email
                    </button>
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
                <button 
                  className="btn-change-password" 
                  onClick={() => setIsChangingPassword(true)}
                >
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
                    <small>
                      {"Для смены email нажмите кнопку 'Изменить email' на странице профиля"}
                    </small>
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

      {/* Модальное окно для смены email */}
      {isChangingEmail && (
        <div className="modal-overlay" onClick={() => !loading && setIsChangingEmail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Смена email</h2>
              <button 
                className="modal-close" 
                onClick={() => !loading && setIsChangingEmail(false)}
                disabled={loading}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleChangeEmail}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Текущий email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="disabled-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Новый email *</label>
                  <input
                    type="email"
                    name="new_email"
                    value={emailChangeData.new_email}
                    onChange={handleEmailChangeInput}
                    placeholder="Введите новый email"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Подтверждение нового email *</label>
                  <input
                    type="email"
                    name="confirm_email"
                    value={emailChangeData.confirm_email}
                    onChange={handleEmailChangeInput}
                    placeholder="Подтвердите новый email"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Пароль *</label>
                  <input
                    type="password"
                    name="password"
                    value={emailChangeData.password}
                    onChange={handleEmailChangeInput}
                    placeholder="Введите текущий пароль"
                    required
                    disabled={loading}
                  />
                  <small>Для подтверждения операции введите текущий пароль</small>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setIsChangingEmail(false)}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={loading}
                >
                  {loading ? 'Сохранение...' : 'Сменить email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно для смены пароля через email */}
      {isChangingPassword && (
        <div className="modal-overlay" onClick={() => !loading && setIsChangingPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Смена пароля</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setIsChangingPassword(false);
                  setResetStep(1);
                  setResetPasswordData({
                    email: '',
                    resetCode: '',
                    new_password: '',
                    confirm_password: ''
                  });
                }}
                disabled={loading}
              >
                ×
              </button>
            </div>
            
            {resetStep === 1 ? (
              <form onSubmit={handleSendResetCode}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={resetPasswordData.email}
                      onChange={handleResetPasswordInput}
                      placeholder={user?.email || "Введите ваш email"}
                      defaultValue={user?.email}
                      required
                      disabled={loading}
                    />
                    <small>На указанный email будет отправлен код подтверждения</small>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={() => {
                      setIsChangingPassword(false);
                      setResetStep(1);
                    }}
                    disabled={loading}
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    className="btn-save"
                    disabled={loading || countdown > 0}
                  >
                    {loading ? 'Отправка...' : countdown > 0 ? `Отправить повторно через ${countdown}с` : 'Отправить код'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmResetPassword}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Код подтверждения *</label>
                    <input
                      type="text"
                      name="resetCode"
                      value={resetPasswordData.resetCode}
                      onChange={handleResetPasswordInput}
                      placeholder="Введите код из письма"
                      required
                      disabled={loading}
                    />
                    <small>
                      {countdown > 0 ? (
                        `Повторно отправить код можно через ${countdown} секунд`
                      ) : (
                        <button 
                          type="button" 
                          className="btn-link" 
                          onClick={handleSendResetCode}
                          disabled={loading}
                          style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0 }}
                        >
                          Отправить код повторно
                        </button>
                      )}
                    </small>
                  </div>
                  
                  <div className="form-group">
                    <label>Новый пароль *</label>
                    <input
                      type="password"
                      name="new_password"
                      value={resetPasswordData.new_password}
                      onChange={handleResetPasswordInput}
                      placeholder="Введите новый пароль (минимум 8 символов)"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Подтверждение нового пароля *</label>
                    <input
                      type="password"
                      name="confirm_password"
                      value={resetPasswordData.confirm_password}
                      onChange={handleResetPasswordInput}
                      placeholder="Подтвердите новый пароль"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={() => {
                      setResetStep(1);
                      setResetPasswordData({
                        email: '',
                        resetCode: '',
                        new_password: '',
                        confirm_password: ''
                      });
                    }}
                    disabled={loading}
                  >
                    Назад
                  </button>
                  <button 
                    type="submit" 
                    className="btn-save"
                    disabled={loading}
                  >
                    {loading ? 'Сохранение...' : 'Сменить пароль'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;