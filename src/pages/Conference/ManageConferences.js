// src/pages/Conference/ManageConferences.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Conference.css';

const ManageConferences = () => {
  const navigate = useNavigate();
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Загрузка конференций с сервера
  useEffect(() => {
    loadConferences();
  }, []);

  const loadConferences = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/conferences');
      const data = await response.json();

      if (response.ok && data.success) {
        setConferences(data.conferences);
      } else {
        throw new Error(data.error || 'Ошибка при загрузке конференций');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация конференций по статусу и поиску
  const filteredConferences = conferences.filter(conf => {
    // Фильтр по статусу
    if (filter !== 'all') {
      const today = new Date();
      const startDate = new Date(conf.start_date);
      const endDate = new Date(conf.end_date);
      const submissionDeadline = new Date(conf.submission_deadline);

      if (filter === 'active') {
        // Активные - сейчас идут
        if (!(startDate <= today && endDate >= today)) return false;
      } else if (filter === 'registration') {
        // Регистрация открыта
        if (!(today <= submissionDeadline)) return false;
      } else if (filter === 'completed') {
        // Завершенные
        if (!(endDate < today)) return false;
      } else if (filter === 'upcoming') {
        // Предстоящие
        if (!(startDate > today)) return false;
      }
    }

    // Поиск по названию или месту
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        conf.title.toLowerCase().includes(searchLower) ||
        (conf.location && conf.location.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Определение статуса конференции на основе дат
  const getConferenceStatus = (conf) => {
    const today = new Date();
    const startDate = new Date(conf.start_date);
    const endDate = new Date(conf.end_date);
    const submissionDeadline = new Date(conf.submission_deadline);

    if (endDate < today) return 'completed';
    if (startDate <= today && endDate >= today) return 'active';
    if (today <= submissionDeadline) return 'registration';
    return 'upcoming';
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'active': 'Активна',
      'registration': 'Регистрация',
      'completed': 'Завершена',
      'upcoming': 'Предстоит',
      'cancelled': 'Отменена'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'active': 'status-active',
      'registration': 'status-registration',
      'completed': 'status-completed',
      'upcoming': 'status-upcoming',
      'cancelled': 'status-cancelled'
    };
    return classMap[status] || '';
  };

  const handleEdit = (id) => {
    navigate(`/admin/edit-conference/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту конференцию?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/conferences/${id}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();

        if (response.ok && data.success) {
          // Обновляем список после удаления
          setConferences(conferences.filter(conf => conf.id !== id));
          alert('Конференция успешно удалена');
        } else {
          throw new Error(data.error || 'Ошибка при удалении конференции');
        }
      } catch (error) {
        console.error('Ошибка при удалении:', error);
        alert('Ошибка при удалении конференции');
      }
    }
  };

  const handleView = (id) => {
    navigate(`/conference/${id}`);
  };

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  // Получение информации о создателе
  const getCreatorName = (conf) => {
    if (conf.created_by?.name) return conf.created_by.name;
    if (conf.creator_login) return conf.creator_login;
    if (conf.creator_name) return conf.creator_name;
    return 'Не указан';
  };

  // Подсчет количества секций
  const getSectionsCount = (conf) => {
    if (conf.sections && Array.isArray(conf.sections)) {
      return conf.sections.length;
    }
    if (conf.section) {
      try {
        const sections = typeof conf.section === 'string' 
          ? JSON.parse(conf.section) 
          : conf.section;
        return Array.isArray(sections) ? sections.length : 0;
      } catch {
        return 0;
      }
    }
    return 0;
  };

  return (
    <div className="manage-conferences-page">
      <div className="container">
        <div className="page-header">
          <h1>Управление конференциями</h1>
          <button 
            className="btn-primary"
            onClick={() => navigate('/admin/create-conference')}
          >
            + Создать конференцию
          </button>
        </div>

        <div className="filters-bar">
          <div className="filter-buttons">
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            <button 
              className={filter === 'active' ? 'active' : ''}
              onClick={() => setFilter('active')}
            >
              Активные
            </button>
            <button 
              className={filter === 'registration' ? 'active' : ''}
              onClick={() => setFilter('registration')}
            >
              Регистрация
            </button>
            <button 
              className={filter === 'upcoming' ? 'active' : ''}
              onClick={() => setFilter('upcoming')}
            >
              Предстоящие
            </button>
            <button 
              className={filter === 'completed' ? 'active' : ''}
              onClick={() => setFilter('completed')}
            >
              Завершенные
            </button>
          </div>

          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Поиск конференций..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Загрузка конференций...</div>
        ) : error ? (
          <div className="error-message">
            <p>Ошибка: {error}</p>
            <button onClick={loadConferences} className="btn-retry">
              Повторить загрузку
            </button>
          </div>
        ) : (
          <div className="conferences-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Даты проведения</th>
                  <th>Место</th>
                  <th>Статус</th>
                  <th>Секции</th>
                  <th>Создатель</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredConferences.map(conf => {
                  const status = getConferenceStatus(conf);
                  return (
                    <tr key={conf.id}>
                      <td>{conf.id}</td>
                      <td className="conference-title">{conf.title}</td>
                      <td>
                        {formatDate(conf.start_date)} - {formatDate(conf.end_date)}
                        <div className="deadline-info">
                          <small>Дедлайн: {formatDate(conf.submission_deadline)}</small>
                        </div>
                      </td>
                      <td>{conf.location || 'Не указано'}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td>{getSectionsCount(conf)}</td>
                      <td>{getCreatorName(conf)}</td>
                      <td className="actions">
  <button 
    className="btn-icon template" 
    onClick={() => navigate(`/admin/conferences/${conf.id}/template`)}
    title="Настроить шаблон оформления"
  >
    🎨
  </button>
  <button 
    className="btn-icon view" 
    onClick={() => handleView(conf.id)}
    title="Просмотр"
  >
    👁️
  </button>
  <button 
    className="btn-icon edit" 
    onClick={() => handleEdit(conf.id)}
    title="Редактировать"
  >
    ✏️
  </button>
  <button 
    className="btn-icon delete" 
    onClick={() => handleDelete(conf.id)}
    title="Удалить"
  >
    🗑️
  </button>
</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredConferences.length === 0 && (
              <div className="no-data">
                {searchTerm ? 'Конференции не найдены по вашему запросу' : 'Конференции не найдены'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageConferences;