// src/pages/Conference/CreateConference.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Conference.css';
import StyleEditor from '../../components/StyleEditor/StyleEditor';

const CreateConference = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1); // 1: основная информация, 2: стили
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
  const [conferenceId, setConferenceId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Получаем данные администратора при загрузке компонента
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('Пользователь:', parsedUser);
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
      }
    } else {
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

  const handleSubmitConference = async (e) => {
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

      const conferenceData = {
        title: formData.title,
        description: formData.description,
        start_date: formData.startDate,
        end_date: formData.endDate,
        submission_deadline: formData.submissionDeadline,
        location: formData.location,
        format: formData.format,
        sections: nonEmptySections,
        created_by: user.user_id || user.id
      };

      console.log('Отправка данных на сервер:', conferenceData);

      const response = await fetch('https://diplom-j6uo.onrender.com/api/conferences', {
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
          text: 'Конференция успешно создана! Переход к настройке стилей...'
        });
        
        // Сохраняем ID созданной конференции и переходим к шагу 2
        setConferenceId(data.conference.id);
        setStep(2);
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

  const handleStylesComplete = () => {
    navigate('/admin/manage-conferences');
  };

  const handleBackToForm = () => {
    setStep(1);
  };

  // Шаг 1: Основная информация
  if (step === 1) {
    return (
      <div className="conference-page">
        <div className="container">
          <h1>Создание новой конференции - Шаг 1 из 2</h1>
         
          
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmitConference} className="conference-form">
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
                {isLoading ? 'Создание...' : 'Далее → Настройка стилей'}
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
  }

  // Шаг 2: Настройка стилей
  return (
    <div className="conference-page">
      <div className="container">
        <h1>Создание новой конференции - Шаг 2 из 2</h1>
        <div className="step-indicator">
          <div className="step completed">1. Основная информация</div>
          <div className="step active">2. Настройка стилей</div>
        </div>
        
        <div className="success-message" style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          ✅ Конференция "{formData.title}" успешно создана! Теперь настройте её стиль.
        </div>
        
        <StyleEditor
          conferenceId={conferenceId}
          onSave={handleStylesComplete}
          onClose={handleBackToForm}
          embedded={true} // Новый пропс для встроенного режима
        />
      </div>
    </div>
  );
};

export default CreateConference;