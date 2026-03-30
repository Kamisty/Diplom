// src/pages/Reports/SubmitReport.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reports.css';

const SubmitReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [conferences, setConferences] = useState([]);
  const [loadingConferences, setLoadingConferences] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    conferenceId: '',
    authors: [''],
    abstract: '',
    keywords: '',
    file: null,
    additionalInfo: ''
  });
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Загрузка списка конференций из БД
  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    setLoadingConferences(true);
    try {
      console.log('Загрузка конференций...');
      const response = await fetch('http://localhost:5000/api/conferences');
      const data = await response.json();
      
      console.log('Полученные данные:', data);
      
      if (response.ok) {
        // Проверяем формат данных
        let conferencesList = [];
        
        if (Array.isArray(data)) {
          conferencesList = data;
        } else if (data.success && Array.isArray(data.conferences)) {
          conferencesList = data.conferences;
        } else {
          console.error('Неожиданный формат данных:', data);
        }
        
        // Фильтруем только активные конференции, где еще не прошел дедлайн
        const now = new Date();
        const activeConferences = conferencesList.filter(conf => {
          // Проверяем наличие deadline
          if (!conf.deadline) return true;
          
          const deadline = new Date(conf.deadline);
          // Проверяем, что дата валидна
          if (isNaN(deadline.getTime())) return true;
          
          return deadline > now;
        });
        
        console.log('Активные конференции:', activeConferences);
        setConferences(activeConferences);
      } else {
        console.error('Ошибка загрузки конференций:', data.error);
      }
    } catch (error) {
      console.error('Ошибка при загрузке конференций:', error);
    } finally {
      setLoadingConferences(false);
    }
  };

  // Добавление нового автора
  const addAuthor = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, '']
    }));
  };

  // Удаление автора
  const removeAuthor = (index) => {
    if (formData.authors.length > 1) {
      setFormData(prev => ({
        ...prev,
        authors: prev.authors.filter((_, i) => i !== index)
      }));
    }
  };

  // Обновление автора
  const updateAuthor = (index, value) => {
    const newAuthors = [...formData.authors];
    newAuthors[index] = value;
    setFormData(prev => ({
      ...prev,
      authors: newAuthors
    }));
  };

  // Обработка изменения полей
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Очистка ошибки при изменении поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Валидация формы
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Введите название доклада';
    }

    if (!formData.conferenceId) {
      newErrors.conferenceId = 'Выберите конференцию';
    }

    if (!formData.abstract.trim()) {
      newErrors.abstract = 'Введите аннотацию';
    } else if (formData.abstract.length < 50) {
      newErrors.abstract = 'Аннотация должна содержать минимум 50 символов';
    } else if (formData.abstract.length > 500) {
      newErrors.abstract = 'Аннотация не должна превышать 500 символов';
    }

    if (!formData.keywords.trim()) {
      newErrors.keywords = 'Введите ключевые слова';
    }

    // Проверка авторов
    const hasEmptyAuthor = formData.authors.some(author => !author.trim());
    if (hasEmptyAuthor) {
      newErrors.authors = 'Заполните ФИО всех авторов';
    }

    // Проверка файла
    if (!formData.file) {
      newErrors.file = 'Загрузите файл доклада';
    } else {
      const allowedTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(formData.file.type)) {
        newErrors.file = 'Разрешены только PDF и DOC/DOCX файлы';
      }
      if (formData.file.size > 10 * 1024 * 1024) { // 10MB
        newErrors.file = 'Файл не должен превышать 10MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);

    try {
      // Получаем ID пользователя из localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user.id) {
        alert('Необходимо авторизоваться');
        navigate('/input');
        return;
      }

      // Создаем FormData для отправки файла
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('conference_id', formData.conferenceId);
      formDataToSend.append('user_id', user.id);
      formDataToSend.append('abstract', formData.abstract);
      formDataToSend.append('keywords', formData.keywords);
      formDataToSend.append('authors', JSON.stringify(formData.authors.filter(a => a.trim())));
      formDataToSend.append('additional_info', formData.additionalInfo);
      formDataToSend.append('file', formData.file);

      const response = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          navigate('/my-reports');
        }, 2000);
      } else {
        alert(data.error || 'Ошибка при отправке доклада');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return dateString;
    }
  };

  // Если функция getShortDescription не используется, удаляем её
  // Или, если планируется использовать позже, комментируем
  // const getShortDescription = (description) => {
  //   if (!description) return '';
  //   if (description.length > 100) {
  //     return description.substring(0, 100) + '...';
  //   }
  //   return description;
  // };

  return (
    <div className="reports-page">
      <div className="container">
        <div className="page-header">
          <h1>Подача нового доклада</h1>
          <button 
            className="btn-secondary"
            onClick={() => navigate('/my-reports')}
          >
            ← К моим докладам
          </button>
        </div>

        {submitSuccess && (
          <div className="success-message">
            ✅ Доклад успешно отправлен! Перенаправление...
          </div>
        )}

        <form onSubmit={handleSubmit} className="report-form">
          {/* Выбор конференции */}
          <div className="form-group">
            <label htmlFor="conferenceId">
              Конференция <span className="required">*</span>
            </label>
            
            {loadingConferences ? (
              <div className="loading-conferences">
                <div className="spinner"></div>
                <span>Загрузка конференций...</span>
              </div>
            ) : conferences.length > 0 ? (
              <>
                <select
                  id="conferenceId"
                  name="conferenceId"
                  value={formData.conferenceId}
                  onChange={handleChange}
                  className={errors.conferenceId ? 'error' : ''}
                  disabled={loading}
                >
                  <option value="">-- Выберите конференцию --</option>
                  {conferences.map(conf => (
                    <option key={conf.id} value={conf.id}>
                      {conf.name || conf.title || `Конференция #${conf.id}`}
                      {conf.start_date && ` (${formatDate(conf.start_date)})`}
                    </option>
                  ))}
                </select>
                
                {/* Отображаем описание выбранной конференции */}
                {formData.conferenceId && (
                  <div className="selected-conference-info">
                    {(() => {
                      const selected = conferences.find(c => c.id === parseInt(formData.conferenceId));
                      return selected && selected.description ? (
                        <div className="conference-description-preview">
                          <strong>Описание:</strong>
                          <p>{selected.description}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
                
                {errors.conferenceId && (
                  <span className="error-message">{errors.conferenceId}</span>
                )}
              </>
            ) : (
              <div className="no-conferences">
                <p>Нет доступных конференций для подачи докладов</p>
                <button 
                  type="button" 
                  className="btn-link"
                  onClick={fetchConferences}
                >
                  Обновить список
                </button>
              </div>
            )}
          </div>

          {/* Название доклада */}
          <div className="form-group">
            <label htmlFor="title">Название доклада *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? 'error' : ''}
              disabled={loading}
              placeholder="Введите название доклада"
            />
            {errors.title && (
              <span className="error-message">{errors.title}</span>
            )}
          </div>

          {/* Авторы */}
          <div className="form-group">
            <label>Авторы *</label>
            {formData.authors.map((author, index) => (
              <div key={index} className="author-input">
                <input
                  type="text"
                  value={author}
                  onChange={(e) => updateAuthor(index, e.target.value)}
                  placeholder={`Автор ${index + 1} (ФИО полностью)`}
                  disabled={loading}
                  className={errors.authors ? 'error' : ''}
                />
                {formData.authors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAuthor(index)}
                    className="remove-author"
                    disabled={loading}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addAuthor}
              className="add-author-btn"
              disabled={loading}
            >
              + Добавить соавтора
            </button>
            {errors.authors && (
              <span className="error-message">{errors.authors}</span>
            )}
          </div>

          {/* Аннотация */}
          <div className="form-group">
            <label htmlFor="abstract">Аннотация *</label>
            <textarea
              id="abstract"
              name="abstract"
              value={formData.abstract}
              onChange={handleChange}
              className={errors.abstract ? 'error' : ''}
              disabled={loading}
              rows="6"
              placeholder="Краткое описание доклада (минимум 50 символов)"
            />
            <div className="field-counter">
              {formData.abstract.length}/500 символов
            </div>
            {errors.abstract && (
              <span className="error-message">{errors.abstract}</span>
            )}
          </div>

          {/* Ключевые слова */}
          <div className="form-group">
            <label htmlFor="keywords">Ключевые слова *</label>
            <input
              type="text"
              id="keywords"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              className={errors.keywords ? 'error' : ''}
              disabled={loading}
              placeholder="Например: AI, машинное обучение, нейросети"
            />
            {errors.keywords && (
              <span className="error-message">{errors.keywords}</span>
            )}
          </div>

          {/* Файл доклада */}
          <div className="form-group">
            <label htmlFor="file">Файл доклада *</label>
            <input
              type="file"
              id="file"
              name="file"
              onChange={handleChange}
              className={errors.file ? 'error' : ''}
              disabled={loading}
              accept=".pdf,.doc,.docx"
            />
            <small>Разрешены PDF, DOC, DOCX (макс. 10MB)</small>
            {errors.file && (
              <span className="error-message">{errors.file}</span>
            )}
          </div>

          {/* Дополнительная информация */}
          <div className="form-group">
            <label htmlFor="additionalInfo">Дополнительная информация</label>
            <textarea
              id="additionalInfo"
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              disabled={loading}
              rows="4"
              placeholder="Любая дополнительная информация для организаторов"
            />
          </div>

          {/* Кнопки */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/my-reports')}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || loadingConferences}
            >
              {loading ? 'Отправка...' : 'Отправить доклад'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitReport;