import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext/Auth';
import './Section_reports.css';

const SectionReports = () => {
    const { user } = useContext(AuthContext);
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewers, setReviewers] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedReviewer, setSelectedReviewer] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [assignments, setAssignments] = useState({});
    const [changingStatus, setChangingStatus] = useState(false);
    const [statusDecision, setStatusDecision] = useState('');
    const [statusComment, setStatusComment] = useState('');

    // Загружаем доклады для выбранной секции
    const fetchReportsBySection = useCallback(async (sectionId) => {
        if (!sectionId) return;
        
        try {
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/reports/section/${sectionId}`);
            const data = await response.json();

            if (response.ok && data.success) {
                setReports(data.reports);
                // Загружаем назначения для этих докладов
                const assignmentsData = {};
                for (const report of data.reports) {
                    const assignResponse = await fetch(`https://diplom-j6uo.onrender.com/api/reviews/report/${report.id}/reviewers`);
                    if (assignResponse.ok) {
                        const assignData = await assignResponse.json();
                        assignmentsData[report.id] = assignData.reviewers || [];
                    } else {
                        assignmentsData[report.id] = [];
                    }
                }
                setAssignments(assignmentsData);
            } else {
                setReports([]);
            }
        } catch (error) {
            console.error('Ошибка загрузки докладов:', error);
            setReports([]);
        }
    }, []);

    // Загружаем секции, которыми руководит пользователь
    const fetchSections = useCallback(async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            const userId = user?.user_id || user?.id;
            
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/sections/head/${userId}`);
            const data = await response.json();

            if (response.ok && data.success) {
                setSections(data.sections);
                if (data.sections.length > 0) {
                    setSelectedSection(data.sections[0]);
                    fetchReportsBySection(data.sections[0].id);
                }
            } else {
                console.error('Ошибка загрузки секций:', data.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        } finally {
            setLoading(false);
        }
    }, [user, fetchReportsBySection]); // ✅ Добавлена зависимость fetchReportsBySection

    // Загрузить список рецензентов
    const fetchReviewers = useCallback(async () => {
        try {
            const response = await fetch('https://diplom-j6uo.onrender.com/api/users/reviewers');
            const data = await response.json();
            
            if (response.ok && data.success) {
                setReviewers(data.reviewers);
            }
        } catch (error) {
            console.error('Ошибка загрузки рецензентов:', error);
        }
    }, []);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    const handleSectionChange = (e) => {
        const sectionId = parseInt(e.target.value);
        const section = sections.find(s => s.id === sectionId);
        setSelectedSection(section);
        fetchReportsBySection(sectionId);
        fetchReviewers();
    };

    const handleAssignClick = (report) => {
        setSelectedReport(report);
        setSelectedReviewer('');
        setShowAssignModal(true);
    };

    const handleAssignReviewer = async () => {
        if (!selectedReviewer) {
            alert('Выберите рецензента');
            return;
        }

        setAssigning(true);
        try {
            const response = await fetch('https://diplom-j6uo.onrender.com/api/reviews/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    report_id: Number(selectedReport.id),
                    reviewer_id: Number(selectedReviewer),
                    assigned_by: user?.user_id || user?.id
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert('Рецензент успешно назначен');
                setShowAssignModal(false);
                setSelectedReviewer('');
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

    // Открыть модальное окно изменения статуса
    const handleStatusChangeClick = (report) => {
        setSelectedReport(report);
        setStatusDecision('');
        setStatusComment('');
        setShowStatusModal(true);
    };

    // Изменить статус доклада
    const handleConfirmStatusChange = async () => {
        if (!statusDecision) {
            alert('Выберите решение по докладу');
            return;
        }

        setChangingStatus(true);
        try {
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/reports/${selectedReport.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: statusDecision,
                    final_decision_notes: statusComment
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert(`Доклад успешно ${statusDecision === 'accepted' ? 'принят' : statusDecision === 'rejected' ? 'отклонён' : 'отправлен на доработку'}`);
                setShowStatusModal(false);
                await fetchReportsBySection(selectedSection.id);
            } else {
                alert(data.error || 'Ошибка при изменении статуса');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка подключения к серверу');
        } finally {
            setChangingStatus(false);
        }
    };

    // Проверка, можно ли изменить статус (есть ли рецензии)
    const canChangeStatus = (report) => {
        const hasReviews = assignments[report.id] && assignments[report.id].length > 0;
        const isPending = report.status === 'pending' || report.status === 'submitted' || report.status === 'under_review';
        return hasReviews && isPending;
    };

    // Получить текст кнопки действия
    const getActionButtonText = (report) => {
        if (report.status === 'accepted') return 'Принят ✅';
        if (report.status === 'rejected') return 'Отклонён ❌';
        if (report.status === 'revision_required') return 'На доработке 🔄';
        return 'Принять решение';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Дата не указана';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusText = (status) => {
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

    if (loading) {
        return <div className="section-reports-loading">Загрузка секций...</div>;
    }

    if (sections.length === 0) {
        return (
            <div className="section-reports-empty">
                <h2>Доклады секций</h2>
                <p>У вас пока нет назначенных секций. Обратитесь к администратору.</p>
            </div>
        );
    }

    return (
        <div className="section-reports-page">
            <div className="container">
                <div className="page-header">
                    <h1>Доклады секций</h1>
                    <p>Добро пожаловать, {user?.name || user?.login}!</p>
                </div>

                {/* Выбор секции */}
                <div className="section-selector">
                    <label htmlFor="section-select">Выберите секцию:</label>
                    <select 
                        id="section-select" 
                        value={selectedSection?.id || ''} 
                        onChange={handleSectionChange}
                        className="section-select"
                    >
                        {sections.map(section => (
                            <option key={section.id} value={section.id}>
                                {section.name} — {section.reports_count || 0} докладов
                            </option>
                        ))}
                    </select>
                </div>

                {/* Информация о конференции */}
                {selectedSection && selectedSection.conference_title && (
                    <div className="conference-info">
                        {selectedSection.conference_title}
                    </div>
                )}

                {/* Список докладов в виде карточек */}
                <div className="reports-list">
                    {reports.length === 0 ? (
                        <div className="no-reports">
                            <p>В этой секции пока нет докладов</p>
                        </div>
                    ) : (
                        <div className="reports-grid">
                            {reports.map((report) => (
                                <div key={report.id} className="report-card">
                                    <div className="report-card-header">
                                        <h3>{report.title}</h3>
                                        <span className={`status-badge ${getStatusClass(report.status)}`}>
                                            {getStatusText(report.status)}
                                        </span>
                                    </div>
                                    
                                    <div className="report-card-info">
                                        <div className="info-row">
                                            <span className="info-label">Конференция:</span>
                                            <span className="info-value">{selectedSection?.conference_title || '—'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Авторы:</span>
                                            <span className="info-value">
                                                {report.author_name || report.author_login}
                                                {report.coauthors && Array.isArray(report.coauthors) && report.coauthors.length > 0 && (
                                                    <>, {report.coauthors.map(c => c.name).join(', ')}</>
                                                )}
                                            </span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Дата подачи:</span>
                                            <span className="info-value">{formatDate(report.submitted_at || report.created_at)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Рецензенты:</span>
                                            <span className="info-value">
                                                {assignments[report.id] && assignments[report.id].length > 0 ? (
                                                    <div className="reviewers-list">
                                                        {assignments[report.id].map(r => (
                                                            <span key={r.id} className="reviewer-name">{r.name}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="no-reviewer">Не назначены</span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="report-card-actions">
                                        <button 
                                            className="btn-view"
                                            onClick={() => window.open(`/report/${report.id}`, '_blank')}
                                        >
                                            📄 Просмотреть статью
                                        </button>
                                        <button 
                                            className="btn-assign"
                                            onClick={() => handleAssignClick(report)}
                                            disabled={assignments[report.id]?.length >= 2}
                                        >
                                            {assignments[report.id]?.length >= 1 ? 'Назначить ещё' : '➕ Назначить рецензента'}
                                        </button>
                                        <button 
                                            className={`btn-decision ${!canChangeStatus(report) ? 'disabled' : ''}`}
                                            onClick={() => handleStatusChangeClick(report)}
                                            disabled={!canChangeStatus(report)}
                                            title={!canChangeStatus(report) ? 'Необходимо назначить рецензентов' : ''}
                                        >
                                            {getActionButtonText(report)}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Модальное окно назначения рецензента */}
            {showAssignModal && selectedReport && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Назначить рецензента</h3>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Доклад:</strong> {selectedReport.title}</p>
                            <p><strong>Автор:</strong> {selectedReport.author_name}</p>
                            
                            <div className="form-group">
                                <label>Выберите рецензента:</label>
                                <select 
                                    value={selectedReviewer} 
                                    onChange={(e) => setSelectedReviewer(e.target.value)}
                                    className="reviewer-select"
                                >
                                    <option value="">-- Выберите рецензента --</option>
                                    {reviewers.map((reviewer) => (
                                        <option key={reviewer.id} value={reviewer.id}>
                                            {reviewer.name} — {reviewer.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowAssignModal(false)}>
                                Отмена
                            </button>
                            <button 
                                className="btn-confirm" 
                                onClick={handleAssignReviewer}
                                disabled={assigning || !selectedReviewer}
                            >
                                {assigning ? 'Назначение...' : 'Назначить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно изменения статуса */}
            {showStatusModal && selectedReport && (
                <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
                    <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Принятие решения по докладу</h3>
                            <button className="modal-close" onClick={() => setShowStatusModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Доклад:</strong> {selectedReport.title}</p>
                            <p><strong>Автор:</strong> {selectedReport.author_name}</p>
                            
                            <div className="form-group">
                                <label>Решение:</label>
                                <div className="decision-buttons">
                                    <button 
                                        className={`decision-option ${statusDecision === 'accepted' ? 'selected accepted' : ''}`}
                                        onClick={() => setStatusDecision('accepted')}
                                    >
                                        ✅ Принять доклад
                                    </button>
                                    <button 
                                        className={`decision-option ${statusDecision === 'rejected' ? 'selected rejected' : ''}`}
                                        onClick={() => setStatusDecision('rejected')}
                                    >
                                        ❌ Отклонить доклад
                                    </button>
                                    <button 
                                        className={`decision-option ${statusDecision === 'revision_required' ? 'selected revision' : ''}`}
                                        onClick={() => setStatusDecision('revision_required')}
                                    >
                                        🔄 Отправить на доработку
                                    </button>
                                </div>
                            </div>

                            {(statusDecision === 'revision_required' || statusDecision === 'rejected') && (
                                <div className="form-group">
                                    <label>Комментарий для автора:</label>
                                    <textarea
                                        value={statusComment}
                                        onChange={(e) => setStatusComment(e.target.value)}
                                        placeholder="Укажите причину решения или замечания для доработки..."
                                        rows={4}
                                        className="comment-textarea"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowStatusModal(false)}>
                                Отмена
                            </button>
                            <button 
                                className="btn-confirm" 
                                onClick={handleConfirmStatusChange}
                                disabled={changingStatus || !statusDecision}
                            >
                                {changingStatus ? 'Сохранение...' : 'Подтвердить решение'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionReports;