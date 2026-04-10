import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext/Auth';
import './Section_header.css';

const SectionHeadDashboard = () => {
  const { user } = useContext(AuthContext);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [reports, setReports] = useState([]);

  // Загружаем секции руководителя
  const fetchSections = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userId = user?.user_id || user?.id;
      
      const response = await fetch(`http://localhost:5000/api/sections/head/${userId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setSections(data.sections);
      } else {
        setError(data.error || 'Ошибка загрузки секций');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError('Не удалось загрузить секции');
    } finally {
      setLoading(false);
    }
  }, [user]); // Зависимость от user

  useEffect(() => {
    fetchSections();
  }, [fetchSections]); // Зависимость от fetchSections

  // Загружаем доклады для выбранной секции
  const fetchReportsBySection = useCallback(async (sectionId) => {
    if (!sectionId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/reports/section/${sectionId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setReports(data.reports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки докладов:', error);
      setReports([]);
    }
  }, []); // Нет зависимостей, так как не использует внешние переменные

  const handleSectionClick = useCallback((section) => {
    setSelectedSection(section);
    fetchReportsBySection(section.id);
  }, [fetchReportsBySection]); // Зависимость от fetchReportsBySection

  const getReportStatusBadge = (status) => {
    const statusMap = {
      'pending': 'На рассмотрении',
      'approved': 'Одобрен',
      'rejected': 'Отклонён',
      'revision': 'На доработке'
    };
    return statusMap[status] || status;
  };

  const getReportStatusClass = (status) => {
    const classMap = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'revision': 'status-revision'
    };
    return classMap[status] || '';
  };

  if (loading) {
    return <div className="section-head-loading">Загрузка секций...</div>;
  }

  return (
    <div className="section-head-dashboard">
      <div className="dashboard-header">
        <h1>Панель руководителя секции</h1>
        <p>Добро пожаловать, {user?.name || user?.login}!</p>
      </div>

      <div className="dashboard-content">
        {/* Левая колонка - список секций */}
        <div className="sections-sidebar">
  <h2>Мои секции</h2>
  {error && <div className="error-message">{error}</div>}
  
  {sections.length === 0 ? (
    <div className="no-sections">
      <p>У вас пока нет назначенных секций</p>
    </div>
  ) : (
    <div className="sections-list">
      {sections.map((section) => (
        <div
          key={section.id}
          className={`section-card ${selectedSection?.id === section.id ? 'active' : ''}`}
          onClick={() => handleSectionClick(section)}
        >
          {/* Название конференции */}
          {section.conference_title && (
            <div className="section-conference">
              <span className="conference-badge">
                🏛️ {section.conference_title}
              </span>
            </div>
          )}
          
          {/* Название секции */}
          <h3>{section.name}</h3>
          
          {/* Количество докладов */}
          <div className="section-meta">
            <span className="reports-count">
              📄 {section.reports_count || 0} докладов
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

        {/* Правая колонка - доклады выбранной секции */}
        <div className="reports-content">
        {selectedSection ? (
          <>
            <div className="reports-header">
              {/* Отображаем название конференции */}
              {selectedSection.title && (
                <div className="conference-title">
                  <span className="conference-icon">🏛️</span>
                  <span className="conference-name">{selectedSection.title}</span>
                </div>
              )}
              <h2>{selectedSection.name}</h2>
              <p>{selectedSection.description}</p>
            </div>

              <div className="reports-list">
                <h3>Доклады секции</h3>
                {reports.length === 0 ? (
                  <div className="no-reports">
                    <p>В этой секции пока нет докладов</p>
                  </div>
                ) : (
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Автор</th>
                        <th>Название доклада</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id}>
                          <td>{report.author_name || report.author_login}</td>
                          <td>{report.title}</td>
                          <td>
                            <span className={`status-badge ${getReportStatusClass(report.status)}`}>
                              {getReportStatusBadge(report.status)}
                            </span>
                           </td>
                          <td>
                            <button 
                              className="btn-view-report"
                              onClick={() => window.location.href = `/review/report/${report.id}`}
                            >
                              Просмотреть
                            </button>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="select-section-prompt">
              <p>Выберите секцию из списка слева, чтобы увидеть доклады</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionHeadDashboard;