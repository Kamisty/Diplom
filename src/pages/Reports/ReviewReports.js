// src/pages/Reports/ReviewReports.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reports.css';

const ReviewReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user.id) {
        navigate('/input');
        return;
      }

      console.log('Загрузка докладов для рецензирования, рецензент ID:', user.id);
      
      // ✅ ИСПРАВЛЕНО: Загружаем доклады, назначенные на рецензирование
      const response = await fetch(`http://localhost:5000/api/reports/for-review/${user.id}`);
      const data = await response.json();
      
      console.log('Получены доклады для рецензирования:', data);
      
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
  }, [navigate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const getStatusLabel = (status) => {
    const statusMap = {
      'draft': 'Черновик',
      'pending': 'На рассмотрении',
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
      'pending': 'status-pending',
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
          <h1>Доклады на рецензирование</h1>
          <p className="subtitle">Доклады, назначенные вам для рецензирования</p>
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
            <p>Нет докладов, назначенных на рецензирование</p>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map(report => {
              const reportId = report.report_id || report.id;
              
              return (
                <div key={reportId} className="report-card">
                  <div className="report-header">
                    <h3>{report.title}</h3>
                    <span className={`status-badge ${getStatusClass(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                  </div>
                  
                  <div className="report-details">
                    <p>
                      <strong>Конференция:</strong> {report.conference_title || 'Не указана'}
                    </p>
                    <p>
                      <strong>Автор:</strong> {report.author_name || report.authors?.[0]?.name || 'Не указан'}
                    </p>
                    <p>
                      <strong>Секция:</strong> {report.section_name || 'Не указана'}
                    </p>
                    <p>
                      <strong>Дата подачи:</strong> {formatDate(report.submitted_at || report.created_at)}
                    </p>
                  </div>

                  <div className="report-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        if (reportId) {
                          navigate(`/report/${reportId}`);
                        }
                      }}
                      title="Просмотр статьи и рецензия"
                    >
                      Просмотр статьи и рецензия
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewReports;