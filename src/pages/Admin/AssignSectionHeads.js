import React, { useState, useEffect, useCallback } from 'react';
import './Admin.css';

const AssignSectionHeads = () => {
  const [conferences, setConferences] = useState([]);
  const [selectedConference, setSelectedConference] = useState('');
  const [sections, setSections] = useState([]);
  const [sectionHeads, setSectionHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHeads, setLoadingHeads] = useState(false);
  const [savingSectionId, setSavingSectionId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Загрузка конференций
  const fetchConferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/conferences');
      if (!response.ok) throw new Error('Ошибка загрузки конференций');
      const data = await response.json();
      console.log('Полученные конференции:', data);
      
      if (data.success && Array.isArray(data.conferences)) {
        setConferences(data.conferences);
      } else {
        setConferences([]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка руководителей
  const fetchSectionHeads = useCallback(async () => {
    try {
      setLoadingHeads(true);
      const response = await fetch('http://localhost:5000/api/users/section-heads');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить руководителей');
      }
      
      const data = await response.json();
      console.log('Руководители секций:', data);
      
      if (data.success && Array.isArray(data.users)) {
        setSectionHeads(data.users);
      } else {
        setSectionHeads([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки руководителей:', err);
      setError('Не удалось загрузить список руководителей');
    } finally {
      setLoadingHeads(false);
    }
  }, []);

  // Загрузка секций и назначений для выбранной конференции
  const loadSectionsAndAssignments = useCallback(async (conferenceId) => {
    try {
      // Загружаем секции конференции
      const sectionsResponse = await fetch(`http://localhost:5000/api/conferences/${conferenceId}/sections`);
      const sectionsData = await sectionsResponse.json();
      
      console.log('Загруженные секции:', sectionsData);
      
      if (sectionsData.success && Array.isArray(sectionsData.sections)) {
        // Загружаем назначения
        const assignmentsResponse = await fetch(`http://localhost:5000/api/section-assignments?conferenceId=${conferenceId}`);
        let assignments = [];
        
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          if (assignmentsData.success && Array.isArray(assignmentsData.assignments)) {
            assignments = assignmentsData.assignments;
          }
        }
        
        // Объединяем секции с назначениями
        const sectionsWithHeads = sectionsData.sections.map(section => ({
          id: section.id,
          name: section.name,
          conferenceId: parseInt(conferenceId),
          headId: assignments.find(a => a.section_name === section.name)?.head_id || null
        }));
        
        setSections(sectionsWithHeads);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки секций:', err);
      setError('Не удалось загрузить секции');
      setSections([]);
    }
  }, []);

  useEffect(() => {
    fetchConferences();
    fetchSectionHeads();
  }, [fetchConferences, fetchSectionHeads]);

  // Когда выбрана конференция, загружаем её секции
  useEffect(() => {
    if (selectedConference) {
      loadSectionsAndAssignments(parseInt(selectedConference));
    } else {
      setSections([]);
    }
  }, [selectedConference, loadSectionsAndAssignments]);

  const handleConferenceChange = (e) => {
    setSelectedConference(e.target.value);
    setSuccessMessage('');
    setError(null);
  };

  const handleAssignHead = (sectionIndex, userId) => {
    setSections(prevSections => 
      prevSections.map((section, index) =>
        index === sectionIndex ? { ...section, headId: userId ? parseInt(userId) : null } : section
      )
    );
  };

  const handleSaveSection = async (sectionIndex) => {
    const section = sections[sectionIndex];
    setSavingSectionId(section.id);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/section-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conferenceId: parseInt(selectedConference),
          sectionName: section.name,
          headId: section.headId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при сохранении');
      }

      const result = await response.json();
      console.log('Результат сохранения:', result);
      
      setSuccessMessage(`Руководитель для секции "${section.name}" назначен!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Обновляем данные после сохранения
      await loadSectionsAndAssignments(parseInt(selectedConference));
      
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError(`Ошибка: ${err.message}`);
    } finally {
      setSavingSectionId(null);
    }
  };

  // Ручное обновление секций
  const handleRefreshSections = async () => {
    if (selectedConference) {
      setSuccessMessage('');
      setError(null);
      await loadSectionsAndAssignments(parseInt(selectedConference));
      setSuccessMessage('Список секций обновлён');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const getHeadName = (headId) => {
    if (!headId) return 'Не назначен';
    if (!Array.isArray(sectionHeads) || sectionHeads.length === 0) return 'Загрузка...';
    
    const head = sectionHeads.find(u => u.id === headId);
    if (!head) return 'Не назначен';
    
    return head.name || head.login || 'Имя не указано';
  };

  const getSelectedConferenceTitle = () => {
    const conf = conferences.find(c => c.id === parseInt(selectedConference));
    return conf ? conf.title : '';
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="container">
          <div className="loading">Загрузка конференций...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="container">
        <h1>Назначение руководителей секций</h1>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="close-error">×</button>
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <div className="assignment-form">
          <div className="form-group">
            <label htmlFor="conference">Выберите конференцию:</label>
            <select
              id="conference"
              value={selectedConference}
              onChange={handleConferenceChange}
              className="conference-select"
            >
              <option value="">-- Выберите конференцию --</option>
              {conferences.map(conf => (
                <option key={conf.id} value={conf.id}>
                  {conf.title} 
                  {conf.start_date && ` (${new Date(conf.start_date).toLocaleDateString()})`}
                </option>
              ))}
            </select>
          </div>

          {selectedConference && (
            <div className="sections-list">
              <div className="sections-header">
                <h2>Секции конференции: {getSelectedConferenceTitle()}</h2>
                <button 
                  className="btn-refresh" 
                  onClick={handleRefreshSections}
                  disabled={loadingHeads}
                >
                  🔄 Обновить секции
                </button>
              </div>
              
              {loadingHeads && (
                <div className="loading-small">Загрузка списка руководителей...</div>
              )}
              
              <div className="sections-grid">
                {sections.length > 0 ? (
                  sections.map((section, index) => (
                    <div key={section.id} className="section-card">
                      <div className="section-header">
                        <h3>{section.name}</h3>
                        <span className={`status-badge ${section.headId ? 'assigned' : 'unassigned'}`}>
                          {section.headId ? 'Назначен' : 'Не назначен'}
                        </span>
                      </div>

                      <div className="current-head">
                        <strong>Текущий руководитель:</strong>
                        <p>{getHeadName(section.headId)}</p>
                      </div>

                      <div className="assign-control">
                        <label htmlFor={`head-${section.id}`}>Назначить руководителя:</label>
                        <select
                          id={`head-${section.id}`}
                          value={section.headId || ''}
                          onChange={(e) => handleAssignHead(index, e.target.value)}
                          className="head-select"
                          disabled={savingSectionId === section.id || loadingHeads}
                        >
                          <option value="">-- Не назначать --</option>
                          {sectionHeads.map(head => (
                            <option key={head.id} value={head.id}>
                              {head.name || head.login}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="section-actions">
                        <button 
                          className="btn-save"
                          onClick={() => handleSaveSection(index)}
                          disabled={savingSectionId === section.id}
                        >
                          {savingSectionId === section.id ? 'Сохранение...' : 'Сохранить'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">
                    У этой конференции нет секций
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignSectionHeads;