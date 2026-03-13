// src/pages/Reports/SubmitReport.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reports.css';

const SubmitReport = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    keywords: '',
    authors: [''],
    conference: '',
    section: '',
    file: null
  });
  const [conferences, setConferences] = useState([]);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadConferences();
  }, []);

  const loadConferences = () => {
    // Имитация загрузки конференций
    setTimeout(() => {
      setConferences([
        { id: 1, title: 'Международная конференция по IT' },
        { id: 2, title: 'Научно-практическая конференция' }
      ]);
    }, 500);
  };

  const loadSections = (conferenceId) => {
    // Имитация загрузки секций для выбранной конференции
    setTimeout(() => {
      setSections([
        { id: 1, name: 'Информационные технологии' },
        { id: 2, name: 'Искусственный интеллект' },
        { id: 3, name: 'Программная инженерия' }
      ]);
    }, 300);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'conference') {
      loadSections(value);
    }
  };

  const handleAuthorChange = (index, value) => {
    const newAuthors = [...formData.authors];
    newAuthors[index] = value;
    setFormData(prev => ({
      ...prev,
      authors: newAuthors
    }));
  };

  const addAuthor = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, '']
    }));
  };

  const removeAuthor = (index) => {
    if (formData.authors.length > 1) {
      const newAuthors = formData.authors.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        authors: newAuthors
      }));
    }
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      file: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Здесь будет запрос к серверу
      console.log('Подача доклада:', formData);
      
      setTimeout(() => {
        setMessage({
          type: 'success',
          text: 'Доклад успешно подан!'
        });
        setTimeout(() => navigate('/my-reports'), 2000);
      }, 1000);
      
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Ошибка при подаче доклада'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="container">
        <h1>Подача доклада</h1>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-group">
            <label htmlFor="title">Название доклада *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Введите название доклада"
            />
          </div>

          <div className="form-group">
            <label htmlFor="conference">Конференция *</label>
            <select
              id="conference"
              name="conference"
              value={formData.conference}
              onChange={handleChange}
              required
            >
              <option value="">Выберите конференцию</option>
              {conferences.map(conf => (
                <option key={conf.id} value={conf.id}>{conf.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="section">Секция *</label>
            <select
              id="section"
              name="section"
              value={formData.section}
              onChange={handleChange}
              required
              disabled={!formData.conference}
            >
              <option value="">Выберите секцию</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Авторы *</label>
            {formData.authors.map((author, index) => (
              <div key={index} className="author-input">
                <input
                  type="text"
                  value={author}
                  onChange={(e) => handleAuthorChange(index, e.target.value)}
                  placeholder={`Автор ${index + 1}`}
                  required
                />
                <div className="author-actions">
                  {index === formData.authors.length - 1 && (
                    <button type="button" onClick={addAuthor} className="btn-add">
                      +
                    </button>
                  )}
                  {formData.authors.length > 1 && (
                    <button type="button" onClick={() => removeAuthor(index)} className="btn-remove">
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label htmlFor="keywords">Ключевые слова</label>
            <input
              type="text"
              id="keywords"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              placeholder="Введите ключевые слова через запятую"
            />
          </div>

          <div className="form-group">
            <label htmlFor="abstract">Аннотация *</label>
            <textarea
              id="abstract"
              name="abstract"
              value={formData.abstract}
              onChange={handleChange}
              rows="5"
              required
              placeholder="Введите аннотацию доклада"
            />
          </div>

          <div className="form-group">
            <label htmlFor="file">Файл доклада (PDF, DOC)</label>
            <input
              type="file"
              id="file"
              name="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
            />
            <small>Максимальный размер: 10 МБ</small>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? 'Отправка...' : 'Подать доклад'}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitReport;