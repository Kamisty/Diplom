import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext/Auth';
import './Admin.css';

const ReportAll = () => {
    const { user } = useContext(AuthContext);
    const [conferences, setConferences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedConferences, setExpandedConferences] = useState({});
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        const fetchReports = async () => {
            // Получаем userId из localStorage напрямую
            let userId = null;
            
            // Способ 1: из контекста
            if (user?.user_id) userId = user.user_id;
            else if (user?.id) userId = user.id;
            
            // Способ 2: из localStorage
            if (!userId) {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const localUser = JSON.parse(userStr);
                        userId = localUser?.user_id || localUser?.id;
                    } catch(e) {}
                }
            }
            
            // Способ 3: из отдельного ключа userId в localStorage
            if (!userId) {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) userId = storedUserId;
            }
            
            console.log('=== ReportAll компонент ===');
            console.log('Найденный userId:', userId);
            console.log('user из контекста:', user);
            
            if (!userId) {
                console.error('Не удалось определить userId');
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                
                // Используем правильный маршрут для администратора
                const response = await fetch(`https://diplom-j6uo.onrender.com/api/admin/conferences/accepted-reports/${userId}`);
                console.log('Response status:', response.status);
                

                // Добавьте console.log для проверки:
                    console.log('Полный URL запроса:', `https://diplom-j6uo.onrender.com/api/admin/conferences/accepted-reports/${userId}`);
                    console.log('userId:', userId);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('Полученные данные:', data);
                
                if (data.success && data.conferences) {
                    setConferences(data.conferences);
                    
                    // Инициализируем раскрытие всех конференций
                    const initialExpandConf = {};
                    data.conferences.forEach(conf => {
                        initialExpandConf[conf.id] = true;
                    });
                    setExpandedConferences(initialExpandConf);
                    
                    // Инициализируем раскрытие всех секций
                    const initialExpandSect = {};
                    data.conferences.forEach(conf => {
                        initialExpandSect[conf.id] = {};
                        if (conf.sections) {
                            conf.sections.forEach(section => {
                                initialExpandSect[conf.id][section.id] = true;
                            });
                        }
                    });
                    setExpandedSections(initialExpandSect);
                } else {
                    console.error('Ошибка в данных:', data);
                    setConferences([]);
                }
                
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                setConferences([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchReports();
    }, [user]);

    const toggleConference = (conferenceId) => {
        setExpandedConferences(prev => ({
            ...prev,
            [conferenceId]: !prev[conferenceId]
        }));
    };

    const toggleSection = (conferenceId, sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [conferenceId]: {
                ...prev[conferenceId],
                [sectionId]: !prev[conferenceId]?.[sectionId]
            }
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Дата не указана';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatusText = (status) => {
        const statusMap = {
            'accepted': 'Принят',
            'pending': 'На рассмотрении',
            'submitted': 'На рассмотрении',
            'under_review': 'На рецензировании',
            'revision_required': 'Требуется доработка',
            'rejected': 'Отклонен',
            'withdrawn': 'Отозван'
        };
        return statusMap[status] || status;
    };

    const getStatusClass = (status) => {
        const classMap = {
            'accepted': 'status-approved',
            'pending': 'status-pending',
            'submitted': 'status-pending',
            'under_review': 'status-review',
            'revision_required': 'status-revision',
            'rejected': 'status-rejected',
            'withdrawn': 'status-withdrawn'
        };
        return classMap[status] || '';
    };

    const getTotalAcceptedReports = () => {
        let total = 0;
        conferences.forEach(conference => {
            if (conference.sections) {
                conference.sections.forEach(section => {
                    total += section.reports?.length || 0;
                });
            }
        });
        return total;
    };

    if (loading) {
        return <div className="section-reports-loading">Загрузка принятых докладов...</div>;
    }

    if (conferences.length === 0) {
        return (
            <div className="section-reports-empty">
                <h2>Принятые доклады</h2>
                <p>У вас пока нет принятых докладов в конференциях, где вы являетесь администратором.</p>
                <p>Ваш ID: {localStorage.getItem('userId') || JSON.parse(localStorage.getItem('user') || '{}')?.user_id || 'не найден'}</p>
            </div>
        );
    }

    const totalReports = getTotalAcceptedReports();

    return (
        <div className="accepted-reports-page">
            <div className="container">
                <div className="page-header">
                    <h1>Принятые доклады</h1>
                    <p>Добро пожаловать, {user?.name || user?.login}!</p>
                    {totalReports > 0 && (
                        <div className="total-count">Всего принятых докладов: {totalReports}</div>
                    )}
                </div>

                {conferences.map((conference) => {
                    const conferenceReportsCount = conference.sections?.reduce(
                        (total, section) => total + (section.reports?.length || 0), 0
                    ) || 0;
                    
                    return (
                        <div key={conference.id} className="conference-block">
                            <div 
                                className="conference-header"
                                onClick={() => toggleConference(conference.id)}
                            >
                                <div className="conference-header-left">
                                    <span className="expand-icon">
                                        {expandedConferences[conference.id] ? '▼' : '▶'}
                                    </span>
                                    <h2>{conference.title}</h2>
                                </div>
                                <div className="conference-meta">
                                    <span className="conference-date">
                                        {formatDate(conference.start_date)}
                                        {conference.end_date && ` - ${formatDate(conference.end_date)}`}
                                    </span>
                                    {conferenceReportsCount > 0 && (
                                        <span className="reports-count">
                                            Принято: {conferenceReportsCount}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {expandedConferences[conference.id] && (
                                <div className="conference-content">
                                    {!conference.sections || conference.sections.length === 0 ? (
                                        <div className="no-sections">
                                            <p>В этой конференции нет секций</p>
                                        </div>
                                    ) : (
                                        conference.sections.map((section) => (
                                            <div key={section.id} className="section-block">
                                                <div 
                                                    className="section-header"
                                                    onClick={() => toggleSection(conference.id, section.id)}
                                                >
                                                    <span className="expand-icon">
                                                        {expandedSections[conference.id]?.[section.id] ? '▼' : '▶'}
                                                    </span>
                                                    <h3>{section.name}</h3>
                                                    {section.head_name && (
                                                        <span className="section-head">
                                                            Руководитель: {section.head_name}
                                                        </span>
                                                    )}
                                                    <span className="section-reports-count">
                                                        {section.reports?.length || 0} докл.
                                                    </span>
                                                </div>

                                                {expandedSections[conference.id]?.[section.id] && (
                                                    <div className="section-content">
                                                        {!section.reports || section.reports.length === 0 ? (
                                                            <div className="no-reports">
                                                                <p>В этой секции пока нет принятых докладов</p>
                                                            </div>
                                                        ) : (
                                                            <div className="reports-grid">
                                                                {section.reports.map((report) => (
                                                                    <div key={report.report_id} className="report-card accepted">
                                                                        <div className="report-card-header">
                                                                            <h4>{report.title}</h4>
                                                                            <span className={`status-badge ${getStatusClass(report.status)}`}>
                                                                                {getStatusText(report.status)}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        <div className="report-card-info">
                                                                            <div className="info-row">
                                                                                <span className="info-label">Автор:</span>
                                                                                <span className="info-value">
                                                                                    {report.author_name || 'Не указан'}
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            {report.coauthors && report.coauthors.length > 0 && (
                                                                                <div className="info-row">
                                                                                    <span className="info-label">Соавторы:</span>
                                                                                    <span className="info-value">
                                                                                        {report.coauthors.map(c => c.name).join(', ')}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {report.abstract && (
                                                                                <div className="info-row">
                                                                                    <span className="info-label">Аннотация:</span>
                                                                                    <span className="info-value abstract">
                                                                                        {report.abstract.length > 200 
                                                                                            ? `${report.abstract.substring(0, 200)}...` 
                                                                                            : report.abstract}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            <div className="info-row">
                                                                                <span className="info-label">Дата подачи:</span>
                                                                                <span className="info-value">
                                                                                    {formatDate(report.submitted_at || report.created_at)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="report-card-actions">
                                                                            <button 
                                                                                className="btn-view"
                                                                                onClick={() => window.open(`/report/${report.report_id}`, '_blank')}
                                                                            >
                                                                                📄 Просмотреть статью
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReportAll;