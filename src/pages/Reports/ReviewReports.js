// src/pages/Reports/ReviewReports.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reports.css';

const ReviewReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadAssignedReports();
  }, []);

  const loadAssignedReports = () => {
    setLoading(true);
    // Имитация загрузки данных
    setTimeout(() => {
      setReports([
        {
          id: 1,
          title: 'Искусственный интеллект в медицине',
          author: 'Иванов И.И.',
          conference: 'Международная конференция по IT',
          deadline: '2024-04-15',
          status: 'pending',
          priority: 'high'
        },
        {
          id: 2,
          title: 'Блокчейн технологии в образовании',
          author: 'Петров П.П.',
          conference: 'Научно-практическая конференция',
          deadline: '2024-04-20',
          status: 'in_progress',
          priority: 'medium'
        },
        {
          id: 3,
          title: 'Анализ больших данных',
          author: 'Сидоров С.С.',
          conference: 'Всероссийский форум',
          deadline: '2024-04-10',
          status: 'pending',
          priority: 'high'
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'Ожидает',
      'in_progress': 'В процессе',
      'completed': 'Завершено',
      'overdue': 'Просрочено'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'status-pending',
      'in_progress': 'status-progress',
      'completed': 'status-approved',
      'overdue': 'status-rejected'
    };
    return classMap[status] || '';
  };

  const getPriorityClass = (priority) => {
    const classMap = {
      'high': 'priority-high',
      'medium': 'priority-medium',
      'low': 'priority-low'
    };
    return classMap[priority] || '';
  };

  const handleReview = (id) => {
    navigate(`/review-report/${id}`);
  };

  const handleDownload = (id) => {
    console.log('Скачивание файла доклада:', id);
  };

  return (
    <div className="reviews-page">
      <div className="container">
        <h1>Рецензирование докладов</h1>

        <div className="filters-bar">
          <div className="filter-buttons">
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            <button 
              className={filter === 'pending' ? 'active' : ''}
              onClick={() => setFilter('pending')}
            >
              Ожидают
            </button>
            <button 
              className={filter === 'in_progress' ? 'active' : ''}
              onClick={() => setFilter('in_progress')}
            >
              В процессе
            </button>
            <button 
              className={filter === 'completed' ? 'active' : ''}
              onClick={() => setFilter('completed')}
            >
              Завершены
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Загрузка докладов...</div>
        ) : (
          <div className="reviews-list">
            {filteredReports.map(report => (
              <div key={report.id} className="review-item">
                <div className="review-header">
                  <div className="review-title">
                    <h3>{report.title}</h3>
                    <span className={`priority-badge ${getPriorityClass(report.priority)}`}>
                      {report.priority === 'high' ? 'Высокий приоритет' : 
                       report.priority === 'medium' ? 'Средний приоритет' : 'Низкий приоритет'}
                    </span>
                  </div>
                  <span className={`status-badge ${getStatusClass(report.status)}`}>
                    {getStatusLabel(report.status)}
                  </span>
                </div>

                <div className="review-details">
                  <div className="detail-item">
                    <strong>Автор:</strong> {report.author}
                  </div>
                  <div className="detail-item">
                    <strong>Конференция:</strong> {report.conference}
                  </div>
                  <div className="detail-item">
                    <strong>Дедлайн:</strong> {report.deadline}
                  </div>
                </div>

                <div className="review-actions">
                  <button 
                    className="btn-review"
                    onClick={() => handleReview(report.id)}
                  >
                    {report.status === 'completed' ? 'Просмотреть рецензию' : 'Рецензировать'}
                  </button>
                  <button 
                    className="btn-download"
                    onClick={() => handleDownload(report.id)}
                  >
                    📥 Скачать
                  </button>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="no-data">
                Нет назначенных докладов для рецензирования
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewReports;