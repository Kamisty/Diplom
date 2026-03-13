// src/pages/Reports/MyReports.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reports.css';

const MyReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    setLoading(true);
    // Имитация загрузки данных
    setTimeout(() => {
      setReports([
        {
          id: 1,
          title: 'Искусственный интеллект в медицине',
          conference: 'Международная конференция по IT',
          status: 'approved',
          submittedDate: '2024-03-15',
          reviewers: 2
        },
        {
          id: 2,
          title: 'Блокчейн технологии в образовании',
          conference: 'Научно-практическая конференция',
          status: 'pending',
          submittedDate: '2024-03-20',
          reviewers: 1
        },
        {
          id: 3,
          title: 'Анализ больших данных',
          conference: 'Всероссийский форум',
          status: 'rejected',
          submittedDate: '2024-03-10',
          reviewers: 3,
          comment: 'Требуется доработка'
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'На рассмотрении',
      'approved': 'Принят',
      'rejected': 'Отклонен',
      'revision': 'На доработке'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'revision': 'status-revision'
    };
    return classMap[status] || '';
  };

  const handleEdit = (id) => {
    navigate(`/edit-report/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот доклад?')) {
      setReports(reports.filter(report => report.id !== id));
    }
  };

  const handleView = (id) => {
    navigate(`/report/${id}`);
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

        {loading ? (
          <div className="loading">Загрузка докладов...</div>
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
                  <p><strong>Конференция:</strong> {report.conference}</p>
                  <p><strong>Дата подачи:</strong> {report.submittedDate}</p>
                  <p><strong>Рецензентов:</strong> {report.reviewers}</p>
                  {report.comment && (
                    <p className="review-comment">
                      <strong>Комментарий:</strong> {report.comment}
                    </p>
                  )}
                </div>

                <div className="report-actions">
                  <button 
                    className="btn-icon view"
                    onClick={() => handleView(report.id)}
                    title="Просмотр"
                  >
                    👁️
                  </button>
                  {report.status !== 'approved' && (
                    <button 
                      className="btn-icon edit"
                      onClick={() => handleEdit(report.id)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                  )}
                  <button 
                    className="btn-icon delete"
                    onClick={() => handleDelete(report.id)}
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="no-data">
                <p>У вас пока нет поданных докладов</p>
                <button 
                  className="btn-primary"
                  onClick={() => navigate('/submit-report')}
                >
                  Подать первый доклад
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReports;