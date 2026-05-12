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
  const [reviewers, setReviewers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignments, setAssignments] = useState({});

  // Загружаем секции руководителя
  const fetchSections = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userId = user?.user_id || user?.id;
      
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/sections/head/${userId}`);
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
  }, [user]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // Загружаем доклады для выбранной секции
  const fetchReportsBySection = useCallback(async (sectionId) => {
    if (!sectionId) return;
    
    try {
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/reports/section/${sectionId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setReports(data.reports);
        // Загрузить назначения для этих докладов
        fetchAssignmentsForReports(data.reports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки докладов:', error);
      setReports([]);
    }
  }, []);

  // Загрузить назначения рецензентов для докладов
  const fetchAssignmentsForReports = async (reportsList) => {
    try {
      const assignmentsData = {};
      for (const report of reportsList) {
        const response = await fetch(`https://diplom-j6uo.onrender.com/reviews/report/${report.id}/reviewers`);
        if (response.ok) {
          const data = await response.json();
          assignmentsData[report.id] = data.reviewers || [];
        }
      }
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Ошибка загрузки назначений:', error);
    }
  };

  // Загрузить список рецензентов
  const fetchReviewers = useCallback(async () => {
    try {
      console.log('Загрузка рецензентов...');
      const response = await fetch('https://diplom-j6uo.onrender.com/api/users/reviewers');
      const data = await response.json();
      console.log('Получены рецензенты:', data);
      
      if (response.ok && data.success) {
        setReviewers(data.reviewers);
        console.log('Количество рецензентов:', data.reviewers.length);
        if (data.reviewers.length > 0) {
          console.log('Первый рецензент:', data.reviewers[0]);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки рецензентов:', error);
    }
  }, []);

  const handleSectionClick = useCallback((section) => {
    setSelectedSection(section);
    fetchReportsBySection(section.id);
    fetchReviewers();
  }, [fetchReportsBySection, fetchReviewers]);

  const handleAssignClick = (report) => {
    setSelectedReport(report);
    setSelectedReviewer('');
    setShowAssignModal(true);
  };

  const handleAssignReviewer = async () => {
    console.log('Выбранный рецензент (selectedReviewer):', selectedReviewer);
    console.log('Тип selectedReviewer:', typeof selectedReviewer);
    
    if (!selectedReviewer) {
      alert('Выберите рецензента');
      return;
    }

    // Преобразуем в число
    const reviewerIdNum = Number(selectedReviewer);
    if (isNaN(reviewerIdNum)) {
      alert('Некорректный ID рецензента');
      return;
    }

    setAssigning(true);
    try {
      const requestBody = {
        report_id: Number(selectedReport.id),
        reviewer_id: reviewerIdNum,
        assigned_by: user?.user_id || user?.id
      };
      console.log('Отправка запроса:', requestBody);
      
      const response = await fetch('https://diplom-j6uo.onrender.com/api/reviews/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Ответ сервера:', data);

      if (response.ok && data.success) {
        alert('Рецензент успешно назначен');
        setShowAssignModal(false);
        setSelectedReviewer('');
        // Обновить список докладов и назначений
        await fetchReportsBySection(selectedSection.id);
        await fetchReviewers();
      } else {
        alert(data.error || 'Ошибка при назначении рецензента');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    } finally {
      setAssigning(false);
    }
  };

  const getReportStatusBadge = (status) => {
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

  const getReportStatusClass = (status) => {
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
                  {section.conference_title && (
                    <div className="section-conference">
                      <span className="conference-badge">
                        🏛️ {section.conference_title}
                      </span>
                    </div>
                  )}
                  <h3>{section.name}</h3>
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
                        <th>Рецензенты</th>
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
                            {assignments[report.id] && assignments[report.id].length > 0 ? (
                              <div className="reviewers-list">
                                {assignments[report.id].map(r => (
                                  <span key={r.id} className="reviewer-badge">
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="no-reviewer">Не назначен</span>
                            )}
                          </td>
                          <td>
                            <button 
                              className="btn-view-report"
                              onClick={() => window.location.href = `/review/report/${report.id}`}
                            >
                              Просмотреть
                            </button>
                            <button 
                              className="btn-assign-reviewer"
                              onClick={() => handleAssignClick(report)}
                            >
                              Назначить рецензента
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

      {/* Модальное окно назначения рецензента */}
      {showAssignModal && selectedReport && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Назначить рецензента</h3>
            <p><strong>Доклад:</strong> {selectedReport.title}</p>
            <p><strong>Автор:</strong> {selectedReport.author_name}</p>
            
            <div className="form-group">
              <label>Выберите рецензента:</label>
              <select 
                value={selectedReviewer} 
                onChange={(e) => {
                  console.log('Выбран рецензент с ID:', e.target.value);
                  setSelectedReviewer(e.target.value);
                }}
                className="reviewer-select"
              >
                <option value="">-- Выберите рецензента --</option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.name} - {reviewer.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-confirm" 
                onClick={handleAssignReviewer}
                disabled={assigning}
              >
                {assigning ? 'Назначение...' : 'Назначить'}
              </button>
              <button 
                className="btn-cancel" 
                onClick={() => setShowAssignModal(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionHeadDashboard;