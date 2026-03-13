// src/pages/Admin/AssignSectionHeads.jsx
import React, { useState, useEffect } from 'react';
import './Admin.css';

const AssignSectionHeads = () => {
  const [conferences, setConferences] = useState([]);
  const [selectedConference, setSelectedConference] = useState('');
  const [sections, setSections] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    // Имитация загрузки данных
    setTimeout(() => {
      setConferences([
        { id: 1, title: 'Международная конференция по IT' },
        { id: 2, title: 'Научно-практическая конференция' }
      ]);
      
      setUsers([
        { id: 1, name: 'Иванов Иван Иванович', role: 'section_head' },
        { id: 2, name: 'Петров Петр Петрович', role: 'section_head' },
        { id: 3, name: 'Сидорова Анна Сергеевна', role: 'section_head' },
        { id: 4, name: 'Козлов Дмитрий Александрович', role: 'author' }
      ]);

      setSections([
        { id: 1, name: 'Информационные технологии', conferenceId: 1, headId: null },
        { id: 2, name: 'Искусственный интеллект', conferenceId: 1, headId: 1 },
        { id: 3, name: 'Программная инженерия', conferenceId: 1, headId: null },
        { id: 4, name: 'Математическое моделирование', conferenceId: 2, headId: 3 }
      ]);
      
      setLoading(false);
    }, 1000);
  };

  const loadSectionsForConference = (conferenceId) => {
    return sections.filter(section => section.conferenceId === conferenceId);
  };

  const handleConferenceChange = (e) => {
    setSelectedConference(e.target.value);
  };

  const handleAssignHead = (sectionId, userId) => {
    setSections(sections.map(section =>
      section.id === sectionId ? { ...section, headId: userId } : section
    ));
  };

  const getHeadName = (headId) => {
    if (!headId) return 'Не назначен';
    const head = users.find(u => u.id === headId);
    return head ? head.name : 'Не назначен';
  };

  const availableHeads = users.filter(u => u.role === 'section_head');

  return (
    <div className="admin-page">
      <div className="container">
        <h1>Назначение руководителей секций</h1>

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
                <option key={conf.id} value={conf.id}>{conf.title}</option>
              ))}
            </select>
          </div>

          {selectedConference && (
            <div className="sections-list">
              <h2>Секции конференции</h2>
              
              {loading ? (
                <div className="loading">Загрузка...</div>
              ) : (
                <div className="sections-grid">
                  {loadSectionsForConference(parseInt(selectedConference)).map(section => (
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
                          onChange={(e) => handleAssignHead(section.id, parseInt(e.target.value))}
                          className="head-select"
                        >
                          <option value="">-- Выберите руководителя --</option>
                          {availableHeads.map(head => (
                            <option key={head.id} value={head.id}>{head.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="section-actions">
                        <button 
                          className="btn-save"
                          onClick={() => console.log('Сохранение для секции:', section.id)}
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ))}

                  {loadSectionsForConference(parseInt(selectedConference)).length === 0 && (
                    <div className="no-data">
                      Для этой конференции нет секций
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignSectionHeads;