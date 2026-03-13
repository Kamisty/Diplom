import React, { useState } from 'react';
import Button from '../../components/common/Button/Button';
import InputField from '../../components/common/InputField/InputField';
import './Input.css';

const Input = () => {
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Валидация формы
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Логин
    if (!formData.login) {
      newErrors.login = 'Логин (email) обязателен';
    } else if (!emailRegex.test(formData.login)) {
      newErrors.login = 'Введите корректный email';
    }

    // Пароль
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть минимум 6 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Отправка формы
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

    console.log('📦 Отправка данных на сервер:', userData);

    try {
      const response = await fetch('http://localhost:5000/api/input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      console.log('📦 Ответ сервера:', data);

      if (response.ok && data.success) {
        setServerMessage({ 
          type: 'success', 
          text: 'Вход выполнен успешно! ✅' 
        });
        
        // Сохраняем токен/данные пользователя
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        setTimeout(() => {
          window.location.href = '/Profile'; // или другая страница после входа
        }, 1500);
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