import React, { useState, useContext } from 'react';
import Button from '../../components/common/Button/Button';
import InputField from '../../components/common/InputField/InputField';
import { AuthContext } from '../../context/AuthContext/Auth';
import './Input.css';

const Input = () => {
  const { login: authLogin } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [tempUserData, setTempUserData] = useState(null);

  // ============================================
  // СОСТОЯНИЯ ДЛЯ ВОССТАНОВЛЕНИЯ ПАРОЛЯ
  // ============================================
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    email: '',
    resetCode: '',
    new_password: '',
    confirm_password: ''
  });

  // Таймер для обратного отсчета
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ============================================
  // ФУНКЦИИ ДЛЯ ВОССТАНОВЛЕНИЯ ПАРОЛЯ
  // ============================================
  const handleResetPasswordInput = (e) => {
    const { name, value } = e.target;
    setResetPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    
    const email = resetPasswordData.email;
    
    if (!email) {
      setServerMessage({ type: 'error', text: 'Пожалуйста, укажите email' });
      setTimeout(() => setServerMessage({ type: '', text: '' }), 3000);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCountdown(60);
        setResetStep(2);
        setServerMessage({ type: 'success', text: 'Код подтверждения отправлен на вашу почту' });
        setTimeout(() => setServerMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(data.error || 'Ошибка при отправке кода');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setServerMessage({ type: 'error', text: error.message });
      setTimeout(() => setServerMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();

    if (!resetPasswordData.resetCode) {
      setServerMessage({ type: 'error', text: 'Пожалуйста, введите код подтверждения' });
      return;
    }

    if (!resetPasswordData.new_password || !resetPasswordData.confirm_password) {
      setServerMessage({ type: 'error', text: 'Пожалуйста, заполните все поля' });
      return;
    }

    if (resetPasswordData.new_password !== resetPasswordData.confirm_password) {
      setServerMessage({ type: 'error', text: 'Новый пароль и подтверждение не совпадают' });
      return;
    }

    if (resetPasswordData.new_password.length < 8) {
      setServerMessage({ type: 'error', text: 'Новый пароль должен содержать минимум 8 символов' });
      return;
    }

    setLoading(true);
    try {
      const email = resetPasswordData.email;

      const response = await fetch('http://localhost:5000/api/user/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          code: resetPasswordData.resetCode,
          newPassword: resetPasswordData.new_password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setServerMessage({ type: 'success', text: 'Пароль успешно изменен!' });
        
        setTimeout(() => {
          setIsChangingPassword(false);
          setResetStep(1);
          setResetPasswordData({
            email: '',
            resetCode: '',
            new_password: '',
            confirm_password: ''
          });
          setServerMessage({ type: '', text: '' });
        }, 2000);
      } else {
        throw new Error(data.error || 'Ошибка при смене пароля');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setServerMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  
  const getRoleDisplayName = (role) => {
    const roleNames = {
      'Администратор конференции': 'Администратор конференции',
      'Руководитель секции': 'Руководитель секции',
      'Рецензент': 'Рецензент',
      'Автор': 'Автор'
    };
    return roleNames[role] || role;
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      'Администратор конференции': 'Полный доступ к управлению конференцией, настройка секций, управление пользователями',
      'Руководитель секции': 'Управление своей секцией, модерация докладов, назначение рецензентов',
      'Рецензент': 'Оценка и рецензирование докладов, оставление отзывов',
      'Автор': 'Подача и управление своими докладами, участие в конференциях'
    };
    return descriptions[role] || 'Доступ к соответствующим функциям системы';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'Администратор конференции': '👑',
      'Руководитель секции': '📋',
      'Рецензент': '📝',
      'Автор': '✍️'
    };
    return icons[role] || '👤';
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.login) {
      newErrors.login = 'Логин (email) обязателен';
    } else if (!emailRegex.test(formData.login)) {
      newErrors.login = 'Введите корректный email';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть минимум 6 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setServerMessage({ type: 'error', text: 'Пожалуйста, исправьте ошибки в форме' });
      return;
    }

    setIsLoading(true);
    setServerMessage({ type: '', text: '' });

    const userData = {
      login: formData.login,
      password: formData.password
    };

    try {
      const response = await fetch('http://localhost:5000/api/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        let roles = [];
        
        if (data.user.roles && Array.isArray(data.user.roles)) {
          roles = data.user.roles;
        } else if (data.user.role) {
          roles = [data.user.role];
        } else if (data.user.role_name) {
          roles = [data.user.role_name];
        }
        
        console.log('Полученные роли пользователя:', roles);
        
        setTempUserData(data.user);
        setUserRoles(roles);
        
        if (roles.length > 1) {
          setShowRoleSelector(true);
          setServerMessage({ type: 'info', text: 'У вас есть несколько ролей. Выберите, под какой ролью войти:' });
        } else if (roles.length === 1) {
          completeLogin(data.user, roles);
        } else {
          setServerMessage({ type: 'error', text: 'У пользователя не найдены роли' });
        }
      } else {
        setServerMessage({ type: 'error', text: data.error || 'Ошибка при входе' });
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);
      setServerMessage({ type: 'error', text: 'Ошибка подключения к серверу. Проверьте, запущен ли сервер на порту 5000.' });
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = (userData, roles, selectedRoleName = null) => {
    const activeRole = selectedRoleName || roles[0];
    
    const userWithRoles = {
      ...userData,
      roles: roles,
      activeRole: activeRole,
      availableRoles: roles,
      roleDisplayName: getRoleDisplayName(activeRole)
    };
    
    localStorage.setItem('user', JSON.stringify(userWithRoles));
    
    if (authLogin) {
      authLogin(userWithRoles);
    }
    
    setServerMessage({ type: 'success', text: `Вход выполнен успешно! Роль: ${getRoleDisplayName(activeRole)} ✅` });

    setTimeout(() => {
      redirectBasedOnRole(activeRole);
    }, 1500);
  };

  const redirectBasedOnRole = (role) => {
    const roleRoutes = {
      'Администратор конференции': '/admin/dashboard',
      'Руководитель секции': '/section-head/dashboard',
      'Рецензент': '/reviewer/dashboard',
      'Автор': '/author/dashboard'
    };
    
    const redirectPath = roleRoutes[role] || '/dashboard';
    window.location.href = redirectPath;
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleConfirmRole = () => {
    if (!selectedRole) {
      setServerMessage({ type: 'error', text: 'Пожалуйста, выберите роль' });
      return;
    }
    
    completeLogin(tempUserData, userRoles, selectedRole);
    setShowRoleSelector(false);
  };

  const handleBackToLogin = () => {
    setShowRoleSelector(false);
    setUserRoles([]);
    setTempUserData(null);
    setSelectedRole('');
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Компонент выбора роли
  if (showRoleSelector) {
    return (
      <div className="login-page">
        <div className="container">
          <h1>Выбор роли</h1>
          
          {serverMessage.text && (
            <div className={`message ${serverMessage.type}`}>
              {serverMessage.text}
            </div>
          )}
          
          <div className="role-selector">
            <p className="role-selector-title">
              Пользователь: <strong>{formData.login}</strong>
            </p>
            <p className="role-selector-subtitle">
              У вас есть несколько ролей. Выберите, под какой ролью вы хотите войти:
            </p>
            
            <div className="roles-list">
              {userRoles.map((role, index) => (
                <div 
                  key={index}
                  className={`role-card ${selectedRole === role ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect(role)}
                >
                  <div className="role-radio">
                    <input
                      type="radio"
                      id={`role-${role}`}
                      name="role"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => handleRoleSelect(role)}
                    />
                    <label htmlFor={`role-${role}`}>
                      <span className="role-icon">{getRoleIcon(role)}</span>
                      <span className="role-name">{getRoleDisplayName(role)}</span>
                    </label>
                  </div>
                  <div className="role-description">
                    {getRoleDescription(role)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="role-actions">
              <Button text="Подтвердить" onClick={handleConfirmRole} disabled={!selectedRole} />
              <button type="button" className="back-button" onClick={handleBackToLogin}>
                Назад к входу
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Основная форма входа
  return (
    <div className="login-page">
      <div className="container">
        <h1>Вход в сервис для организации конференций</h1>
        
        {serverMessage.text && (
          <div className={`message ${serverMessage.type}`}>
            {serverMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-section">
          <InputField 
            name="login"
            placeholder="Логин (email)"
            value={formData.login}
            onChange={handleInputChange}
            error={errors.login}
            disabled={isLoading}
          />
          
          <div className="password-field">
            <InputField 
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Пароль"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              disabled={isLoading}
            />
            <button 
              type="button"
              className="password-toggle"
              onClick={toggleShowPassword}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" name="remember" /> 
              Запомнить меня
            </label>
            {/* ✅ КНОПКА "ЗАБЫЛИ ПАРОЛЬ" ОТКРЫВАЕТ МОДАЛЬНОЕ ОКНО */}
            <button 
              type="button"
              className="forgot-password"
              onClick={() => setIsChangingPassword(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Забыли пароль?
            </button>
          </div>
          
          <Button 
            text={isLoading ? 'Вход...' : 'Войти'}
            onClick={handleSubmit}
            disabled={isLoading}
          />
          
          <p className="register-link">
            Нет аккаунта? <a href="/register">Зарегистрируйтесь</a>
          </p>
        </form>
      </div>

      {/* ✅ МОДАЛЬНОЕ ОКНО ДЛЯ ВОССТАНОВЛЕНИЯ ПАРОЛЯ */}
      {isChangingPassword && (
        <div className="modal-overlay" onClick={() => !loading && setIsChangingPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Восстановление пароля</h2>
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
                      placeholder="Введите ваш email"
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
                    onClick={() => setIsChangingPassword(false)}
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

export default Input;