import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Conference.css';

const ConferenceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conference, setConference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConference = useCallback(async () => {
    try {
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${id}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setConference(data.conference);
      } else {
        setError(data.error || 'Ошибка загрузки');
      }
    } catch (err) {
      setError('Не удалось загрузить конференцию');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConference();
  }, [fetchConference]);  // ← теперь зависимость fetchConference

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('ru-RU');
  };

  const getStatus = () => {
    if (!conference) return '';
    const today = new Date();
    const endDate = new Date(conference.end_date);
    return endDate < today ? 'completed' : 'active';
  };

  const getStatusText = () => {
    return getStatus() === 'active' ? 'Активна' : 'Завершена';
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!conference) return <div className="not-found">Конференция не найдена</div>;

  return (
    <div className="conference-details">
      <div className="container">
        <button className="btn-back" onClick={() => navigate('/admin/conferences')}>
          ← Назад
        </button>
        
        <div className="details-header">
          <h1>{conference.title}</h1>
          <span className={`status-badge ${getStatus() === 'active' ? 'status-active' : 'status-completed'}`}>
            {getStatusText()}
          </span>
        </div>
        
        <div className="info-section">
          <h2>Основная информация</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Даты проведения:</label>
              <span>{formatDate(conference.start_date)} — {formatDate(conference.end_date)}</span>
            </div>
            <div className="info-item">
              <label>Дедлайн подачи:</label>
              <span>{formatDate(conference.submission_deadline)}</span>
            </div>
            <div className="info-item">
              <label>Место проведения:</label>
              <span>{conference.location || '—'}</span>
            </div>
            <div className="info-item">
              <label>Формат:</label>
              <span>{conference.format === 'online' ? 'Онлайн' : conference.format === 'offline' ? 'Офлайн' : 'Смешанный'}</span>
            </div>
            <div className="info-item">
              <label>Создатель:</label>
              <span>{conference.creator_name || conference.creator_login || '—'}</span>
            </div>
          </div>
        </div>
        
        <div className="info-section">
          <h2>Описание</h2>
          <p className="description-text">{conference.description || 'Нет описания'}</p>
        </div>
        
        <div className="info-section">
          <h2>Секции конференции</h2>
          {conference.sections && conference.sections.length > 0 ? (
            <ul className="sections-list">
              {conference.sections.map((section, idx) => (
                <li key={idx} className="section-item">
                  <span className="section-name">{section.name || section}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">Нет добавленных секций</p>
          )}
        </div>
        
        <div className="details-actions">
          <button 
            className="btn-edit" 
            onClick={() => navigate(`/admin/edit-conference/${conference.id}`)}
          >
            ✏️ Редактировать
          </button>
          <button 
            className="btn-back" 
            onClick={() => navigate('/admin/conferences')}
          >
            📋 К списку
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceDetails;