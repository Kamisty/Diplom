import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext/Auth';
import { useParams, useNavigate } from 'react-router-dom';
import './Conference.css';

const EditConference = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    submission_deadline: '',
    location: '',
    location_url: '',
    format: 'offline',
    status: 'draft'
  });

  const [sections, setSections] = useState([]);
  const [newSection, setNewSection] = useState({ name: '' });

  const loadSections = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/conferences/${id}/sections`);
      const data = await response.json();
      
      console.log('📦 Загружены секции:', data);
      
      if (response.ok && data.success) {
        setSections(data.sections || []);
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки секций:', error);
      setSections([]);
    }
  }, [id]);

  const loadConference = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5000/api/conferences/${id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setFormData({
          title: data.conference.title || '',
          description: data.conference.description || '',
          start_date: data.conference.start_date ? data.conference.start_date.split('T')[0] : '',
          end_date: data.conference.end_date ? data.conference.end_date.split('T')[0] : '',
          submission_deadline: data.conference.submission_deadline ? data.conference.submission_deadline.split('T')[0] : '',
          location: data.conference.location || '',
          location_url: data.conference.location_url || '',
          format: data.conference.format || 'offline',
          status: data.conference.status || 'draft'
        });
        
        await loadSections();
      } else {
        throw new Error(data.error || 'Ошибка при загрузке конференции');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, loadSections]);

  useEffect(() => {
    loadConference();
  }, [loadConference]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`http://localhost:5000/api/conferences/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Конференция успешно обновлена!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Ошибка при обновлении');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = async () => {
    if (!newSection.name || !newSection.name.trim()) {
      setError('Введите название секции');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSaving(true);
    
    const userId = user?.user_id || user?.id;
    
    console.log('👤 Текущий пользователь:', user);
    console.log('👤 ID пользователя:', userId);
    
    if (!userId) {
      setError('Не удалось определить текущего пользователя');
      setSaving(false);
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/conferences/${id}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: newSection.name.trim(),
          user_id: userId
        })
      });

      const data = await response.json();
      
      console.log('📦 Ответ сервера:', data);

      if (response.ok && data.success) {
        setSections([...sections, data.section]);
        setNewSection({ name: '' });
        setSuccess('Секция добавлена');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Ошибка при добавлении секции');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Удалить эту секцию?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/sections/${sectionId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSections(sections.filter(s => s.id !== sectionId));
        setSuccess('Секция удалена');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Ошибка при удалении');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка конференции...</div>;
  }

  return (
    <div className="edit-conference-page">
      <div className="container">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate('/admin/conferences')}>
            ← Назад
          </button>
          <h1>Редактирование конференции</h1>
          <button 
            className="btn-save" 
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="edit-conference-form">
          <div className="form-section">
            <h2>Основная информация</h2>
            
            <div className="form-group">
              <label>Название конференции *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Введите название"
              />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                placeholder="Описание конференции"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Дата начала *</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Дата окончания *</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Дедлайн подачи заявок *</label>
              <input
                type="date"
                name="submission_deadline"
                value={formData.submission_deadline}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Место проведения</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Город, место проведения"
                />
              </div>

          
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Формат проведения</label>
                <select name="format" value={formData.format} onChange={handleChange}>
                  <option value="offline">Офлайн</option>
                  <option value="online">Онлайн</option>
                  <option value="mixed">Смешанный</option>
                </select>
              </div>

            </div>
          </div>

          <div className="form-section">
            <h2>Секции конференции</h2>
            
            <div className="sections-list">
              {sections.length === 0 ? (
                <p className="no-data">Нет добавленных секций</p>
              ) : (
                sections.map(section => (
                  <div key={section.id} className="section-item">
                    <div className="section-info">
                      <h3>{section.name}</h3>
                    </div>
                    <button 
                      type="button"
                      className="btn-delete-section"
                      onClick={() => handleDeleteSection(section.id)}
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="add-section-form">
              <h4>Добавить новую секцию</h4>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Название секции"
                    value={newSection.name}
                    onChange={(e) => setNewSection({ name: e.target.value })}
                  />
                </div>
                <button type="button" className="btn-add" onClick={handleAddSection}>
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditConference;