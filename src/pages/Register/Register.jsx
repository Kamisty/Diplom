import React, { useState } from 'react';
import Button from '../../components/common/Button/Button';
import InputField from '../../components/common/InputField/InputField';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    login: '',
    fullName: '',
    email: '',
    password_hash: '',   // Основной пароль
    password2: '',       // Подтверждение пароля
    role: ''
  });

  const [showPassword, setShowPassword] = useState({
    password_hash: false,
    password2: false
  });

  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    number: false,
    uppercase: false,
    lowercase: false,
    special: false
  });
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: '', text: '' });

  // Проверка надежности пароля
  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 8,
      number: /\d/.test(password),
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  // Проверка совпадения паролей
  const doPasswordsMatch = () => {
    return formData.password_hash === formData.password2;
  };

  // Переключение видимости пароля
  const toggleShowPassword = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

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

    // ФИО (в БД поле name)
    if (!formData.fullName) {
      newErrors.fullName = 'ФИО обязательно';
    } else {
      const nameParts = formData.fullName.trim().split(' ');
      if (nameParts.length < 2) {
        newErrors.fullName = 'Введите фамилию и имя';
      }
    }

    // Email для подтверждения
    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }

    // Пароль (password_hash)
    if (!formData.password_hash) {
      newErrors.password_hash = 'Пароль обязателен';
    } else {
      const strengthChecks = Object.values(passwordStrength).filter(Boolean).length;
      if (strengthChecks < 3) {
        newErrors.password_hash = 'Пароль слишком простой';
      }
    }

    // Подтверждение пароля (password2)
    if (!formData.password2) {
      newErrors.password2 = 'Подтвердите пароль';
    } else if (!doPasswordsMatch()) {
      newErrors.password2 = 'Пароли не совпадают';
    }

    // Роль (в БД поле roles)
    if (!formData.role) {
      newErrors.role = 'Выберите роль';
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
      name: formData.fullName,
      email: formData.email,
      password_hash: formData.password_hash,
      password2: formData.password2,
      role: formData.role
    };

    console.log('📦 Отправка данных на сервер:', userData);

    try {
      const response = await fetch('http://localhost:5000/api/register', {
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
          text: 'Регистрация успешна! ✅' 
        });
        
        setFormData({
          login: '',
          fullName: '',
          email: '',
          password_hash: '',
          password2: '',
          role: ''
        });

        setTimeout(() => {
          window.location.href = '/Input';
        }, 2000);
      } else {
        setServerMessage({ 
          type: 'error', 
          text: data.error || data.details || 'Ошибка при регистрации' 
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

    if (name === 'password_hash') {
      checkPasswordStrength(value);
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const getPasswordStrengthInfo = () => {
    const checks = Object.values(passwordStrength).filter(Boolean).length;
    if (checks <= 2) return { color: '#ff4444', text: 'Слабый', width: '33%' };
    if (checks <= 4) return { color: '#ffbb33', text: 'Средний', width: '66%' };
    return { color: '#00C851', text: 'Надежный', width: '100%' };
  };

  const roleOptions = [
    { value: 'admin', label: 'Администратор конференции' },
    { value: 'author', label: 'Автор доклада' },
    { value: 'section_head', label: 'Руководитель секции' },
    { value: 'reviewer', label: 'Рецензент' }
  ];

  const strengthInfo = getPasswordStrengthInfo();

  return (
    <div className="register-page">
      <div className="container">
        <h1>Регистрация в сервисе для организации конференций</h1>
        
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
          
          <InputField 
            name="fullName"
            placeholder="ФИО (Иванов Иван Иванович)"
            value={formData.fullName}
            onChange={handleInputChange}
            error={errors.fullName}
            disabled={isLoading}
          />
          
          <InputField 
            name="email"
            placeholder="Email (для подтверждения)"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            disabled={isLoading}
          />
          
          <div className="password-field-wrapper">
            <div className="password-field">
              <InputField 
                name="password_hash"
                type={showPassword.password_hash ? "text" : "password"}
                placeholder="Пароль"
                value={formData.password_hash}
                onChange={handleInputChange}
                onFocus={() => setShowPasswordRequirements(true)}
                error={errors.password_hash}
                disabled={isLoading}
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => toggleShowPassword('password_hash')}
                tabIndex="-1"
              >
                {showPassword.password_hash ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            
            {formData.password_hash && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div className="strength-bar-fill" style={{ 
                    width: strengthInfo.width,
                    backgroundColor: strengthInfo.color
                  }} />
                </div>
                <span className="strength-text" style={{ color: strengthInfo.color }}>
                  {strengthInfo.text} пароль
                </span>
              </div>
            )}

            {showPasswordRequirements && (
              <div className="password-requirements">
                <p>Требования к паролю:</p>
                <ul>
                  <li className={passwordStrength.length ? 'met' : ''}>
                    {passwordStrength.length ? '✓' : '○'} Минимум 8 символов
                  </li>
                  <li className={passwordStrength.number ? 'met' : ''}>
                    {passwordStrength.number ? '✓' : '○'} Хотя бы одна цифра
                  </li>
                  <li className={passwordStrength.uppercase ? 'met' : ''}>
                    {passwordStrength.uppercase ? '✓' : '○'} Хотя бы одна заглавная буква
                  </li>
                  <li className={passwordStrength.lowercase ? 'met' : ''}>
                    {passwordStrength.lowercase ? '✓' : '○'} Хотя бы одна строчная буква
                  </li>
                  <li className={passwordStrength.special ? 'met' : ''}>
                    {passwordStrength.special ? '✓' : '○'} Хотя бы один спецсимвол
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="password-field-wrapper">
            <div className="password-field">
              <InputField 
                name="password2"
                type={showPassword.password2 ? "text" : "password"}
                placeholder="Подтвердите пароль"
                value={formData.password2}
                onChange={handleInputChange}
                error={errors.password2}
                disabled={isLoading}
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => toggleShowPassword('password2')}
                tabIndex="-1"
              >
                {showPassword.password2 ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            
            {formData.password2 && !doPasswordsMatch() && (
              <div className="password-mismatch">⚠️ Пароли не совпадают</div>
            )}

            {formData.password2 && doPasswordsMatch() && formData.password_hash && (
              <div className="password-match">✓ Пароли совпадают</div>
            )}
          </div>

          <InputField 
            type="select"
            name="role"
            label="Роль"
            value={formData.role}
            onChange={handleInputChange}
            options={roleOptions}
            error={errors.role}
            disabled={isLoading}
          />
          
          <Button 
            text={isLoading ? 'Регистрация...' : 'Создать аккаунт'}
            onClick={handleSubmit}
            disabled={isLoading}
          />
          
          <p className="login-link">
            Уже есть аккаунт? <a href="/input">Войдите</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;