// src/pages/Reports/MyReports.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reports.css';

const MyReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Обернем loadReports в useCallback
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user.id) {
        navigate('/input');
        return;
      }

      console.log('Загрузка докладов для пользователя:', user.id);
      
      const response = await fetch(`http://localhost:5000/api/reports/user/${user.id}`);
      const data = await response.json();
      
      console.log('Получены доклады:', data);
      
      if (response.ok && data.success) {
        setReports(data.reports || []);
      } else {
        setError(data.error || 'Ошибка при загрузке докладов');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  }, [navigate]); // Добавляем navigate как зависимость

  useEffect(() => {
    loadReports();
  }, [loadReports]); // Добавляем loadReports в зависимости

  const getStatusLabel = (status) => {
    const statusMap = {
      'draft': 'Черновик',
      'submitted': 'На рассмотрении',
      'under_review': 'На рецензировании',
      'revision_required': 'Требуется доработка',
      'accepted': 'Принят',
      'rejected': 'Отклонен',
      'withdrawn': 'Отозван'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'draft': 'status-draft',
      'submitted': 'status-pending',
      'under_review': 'status-review',
      'revision_required': 'status-revision',
      'accepted': 'status-approved',
      'rejected': 'status-rejected',
      'withdrawn': 'status-withdrawn'
    };
    return classMap[status] || '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="reports-page">
      <div className="container">
        <div className="page-header">
          <h1>Мои доклады</h1>
          <button 
            className="btn-primary"
            onClick={() => navigate('/submit-report')}
          >
            + Подать новый доклад
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Загрузка докладов...</div>
        ) : reports.length === 0 ? (
          <div className="no-data">
            <p>У вас пока нет поданных докладов</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/submit-report')}
            >
              Подать первый доклад
            </button>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map(report => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <h3>{report.title}</h3>
                  <span className={`status-badge ${getStatusClass(report.status)}`}>
                    {getStatusLabel(report.status)}
                  </span>
                </div>
                
                <div className="report-details">
                  <p>
                    <strong>Конференция:</strong> {report.conference_name || 'Не указана'}
                  </p>
                  <p>
                    <strong>Авторы:</strong> {report.authors?.join(', ') || 'Не указаны'}
                  </p>
                  <p>
                    <strong>Дата подачи:</strong> {formatDate(report.created_at)}
                  </p>
                  <p>
                    <strong>Версия:</strong> {report.version || 1}
                  </p>
                </div>

                <div className="report-actions">
                  <button 
                    className="btn-icon view"
                    onClick={() => navigate(`/report/${report.id}`)}
                    title="Просмотр"
                  >
                    👁️
                  </button>
                  {report.status === 'draft' && (
                    <button 
                      className="btn-icon edit"
                      onClick={() => navigate(`/edit-report/${report.id}`)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReports;