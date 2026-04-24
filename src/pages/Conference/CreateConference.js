// src/pages/Conference/CreateConference.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Conference.css';

const CreateConference = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    submissionDeadline: '',
    location: '',
    format: 'offline',
    sections: ['']
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Получаем данные администратора при загрузке компонента
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('Пользователь:', parsedUser); // Для отладки
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
      }
    } else {
      // Если пользователь не авторизован, перенаправляем на страницу входа
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSectionChange = (index, value) => {
    const newSections = [...formData.sections];
    newSections[index] = value;
    setFormData(prev => ({
      ...prev,
      sections: newSections
    }));
  };

  const addSectionField = () => {
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, '']
    }));
  };

  const removeSectionField = (index) => {
    if (formData.sections.length > 1) {
      const newSections = formData.sections.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        sections: newSections
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!user) {
        throw new Error('Не удалось определить создателя конференции');
      }

      const nonEmptySections = formData.sections.filter(section => section.trim() !== '');
      
      if (nonEmptySections.length === 0) {
        setMessage({
          type: 'error',
          text: 'Добавьте хотя бы одну секцию'
        });
        setIsLoading(false);
        return;
      }

      // Подготавливаем данные для отправки на сервер
      const conferenceData = {
        title: formData.title,
        description: formData.description,
        start_date: formData.startDate,
        end_date: formData.endDate,
        submission_deadline: formData.submissionDeadline,
        location: formData.location,
        format: formData.format,
        sections: nonEmptySections, // Отправляем как массив, сервер сам преобразует в JSON
        created_by: user.user_id || user.id
      };

      console.log('Отправка данных на сервер:', conferenceData);

      const response = await fetch('https://diplom-1-ss8u.onrender.com/api/conferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conferenceData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: 'Конференция успешно создана!'
        });
        
        setTimeout(() => navigate('/admin/manage-conferences'), 2000);
      } else {
        throw new Error(data.error || 'Ошибка при создании конференции');
      }
      
    } catch (error) {
      console.error('Ошибка:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Ошибка при создании конференции'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="conference-page">
      <div className="container">
        <h1>Создание новой конференции</h1>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="conference-form">
          {/* Форма остается без изменений */}
          <div className="form-group">
            <label htmlFor="title">Название конференции *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Введите название конференции"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              required
              placeholder="Опишите конференцию"
            />
          </div>

          <div className="form-group sections-group">
            <label>Секции конференции *</label>
            {formData.sections.map((section, index) => (
              <div key={index} className="section-input-wrapper">
                <div className="section-input-container">
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => handleSectionChange(index, e.target.value)}
                    placeholder={`Название секции ${index + 1}`}
                    className="section-input"
                    required={index === 0}
                  />
                  <button
                    type="button"
                    onClick={() => removeSectionField(index)}
                    className="btn-remove-section"
                    disabled={formData.sections.length === 1}
                    aria-label="Удалить секцию"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addSectionField}
              className="btn-add-section"
            >
              + Добавить секцию
            </button>
            <small className="section-hint">
              Добавьте названия секций конференции (минимум 1)
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Дата начала *</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">Дата окончания *</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="submissionDeadline">Дедлайн подачи заявок *</label>
            <input
              type="date"
              id="submissionDeadline"
              name="submissionDeadline"
              value={formData.submissionDeadline}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Место проведения *</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="Город, адрес или ссылка на онлайн-платформу"
            />
          </div>

          <div className="form-group">
            <label htmlFor="format">Формат проведения *</label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleChange}
              required
            >
              <option value="offline">Офлайн</option>
              <option value="online">Онлайн</option>
              <option value="hybrid">Гибридный</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? 'Создание...' : 'Создать конференцию'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/admin/manage-conferences')} 
              className="btn-secondary"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateConference;