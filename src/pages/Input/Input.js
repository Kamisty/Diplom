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

  // Функция для получения отображаемого имени роли
  const getRoleDisplayName = (role) => {
    const roleNames = {
      'Администратор конференции': 'Администратор конференции',
      'Руководитель секции': 'Руководитель секции',
      'Рецензент': 'Рецензент',
      'Автор': 'Автор'
    };
    return roleNames[role] || role;
  };

  // Функция для получения описания роли
  const getRoleDescription = (role) => {
    const descriptions = {
      'Администратор конференции': 'Полный доступ к управлению конференцией, настройка секций, управление пользователями',
      'Руководитель секции': 'Управление своей секцией, модерация докладов, назначение рецензентов',
      'Рецензент': 'Оценка и рецензирование докладов, оставление отзывов',
      'Автор': 'Подача и управление своими докладами, участие в конференциях'
    };
    return descriptions[role] || 'Доступ к соответствующим функциям системы';
  };

  // Функция для получения иконки роли
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
      setServerMessage({ 
        type: 'error', 
        text: 'Пожалуйста, исправьте ошибки в форме' 
      });
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Определяем роли пользователя из ответа сервера
        let roles = [];
        
        // Предполагаем, что сервер возвращает роли в поле roles или role
        if (data.user.roles && Array.isArray(data.user.roles)) {
          roles = data.user.roles;
        } else if (data.user.role) {
          roles = [data.user.role];
        } else if (data.user.role_name) {
          roles = [data.user.role_name];
        }
        
        console.log('Полученные роли пользователя:', roles);
        
        // Сохраняем данные пользователя временно
        setTempUserData(data.user);
        setUserRoles(roles);
        
        // Если у пользователя несколько ролей, показываем выбор
        if (roles.length > 1) {
          setShowRoleSelector(true);
          setServerMessage({ 
            type: 'info', 
            text: 'У вас есть несколько ролей. Выберите, под какой ролью войти:' 
          });
        } else if (roles.length === 1) {
          // Если только одна роль, входим сразу
          completeLogin(data.user, roles);
        } else {
          setServerMessage({ 
            type: 'error', 
            text: 'У пользователя не найдены роли' 
          });
        }
      } else {
        setServerMessage({ 
          type: 'error', 
          text: data.error || 'Ошибка при входе' 
        });
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);
      setServerMessage({ 
        type: 'error', 
        text: 'Ошибка подключения к серверу. Проверьте, запущен ли сервер на порту 5000.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = (userData, roles, selectedRoleName = null) => {
    // Если выбрана конкретная роль, используем её
    const activeRole = selectedRoleName || roles[0];
    
    const userWithRoles = {
      ...userData,
      roles: roles,
      activeRole: activeRole,
      availableRoles: roles, // Список всех доступных ролей
      roleDisplayName: getRoleDisplayName(activeRole)
    };
    
    // Сохраняем в localStorage
    localStorage.setItem('user', JSON.stringify(userWithRoles));
    
    // Обновляем AuthContext
    if (authLogin) {
      authLogin(userWithRoles);
    }
    
    setServerMessage({ 
      type: 'success', 
      text: `Вход выполнен успешно! Роль: ${getRoleDisplayName(activeRole)} ✅` 
    });

    // Перенаправление в зависимости от роли
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
      setServerMessage({ 
        type: 'error', 
        text: 'Пожалуйста, выберите роль' 
      });
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
              <Button 
                text="Подтвердить"
                onClick={handleConfirmRole}
                disabled={!selectedRole}
              />
              <button 
                type="button"
                className="back-button"
                onClick={handleBackToLogin}
              >
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
            <a href="/forgot-password" className="forgot-password">
              Забыли пароль?
            </a>
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
    </div>
  );
};

export default Input;