// src/pages/Reports/ReportDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Reports.css';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [review, setReview] = useState({
    scientific_value: 5,
    practical_value: 5,
    relevance: 5,
    novelty: 5,
    quality: 5,
    recommendation: 'pending',
    comments_for_author: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [isAuthorOfReport, setIsAuthorOfReport] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Проверяем активную роль
  const isReviewer = user?.activeRole === 'Рецензент';
  const isAuthor = user?.activeRole === 'Автор';

  console.log('=== ReportDetail Debug ===');
  console.log('User ID:', user?.id || user?.user_id);
  console.log('User activeRole:', user?.activeRole);
  console.log('isReviewer:', isReviewer);
  console.log('isAuthor:', isAuthor);

  // Загрузка доклада
  useEffect(() => {
    loadReport();
  }, [id]);

  // Загрузка рецензии для рецензента
  useEffect(() => {
    if (id && isReviewer) {
      loadExistingReview();
    }
  }, [isReviewer, id]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/reports/${id}`);
      const data = await response.json();
      
      console.log('Загружен доклад:', data);
      
      if (response.ok && data.success) {
        setReport(data.report);
        
        const currentUserId = user?.id || user?.user_id;
        const reportAuthorId = data.report?.user_id || data.report?.author_id;
        
        const isAuthorOfThisReport = currentUserId === reportAuthorId || 
                                     data.report?.author_name === user?.name;
        
        setIsAuthorOfReport(isAuthorOfThisReport);
        console.log('isAuthorOfReport:', isAuthorOfThisReport);
        
        // Если пользователь автор, загружаем рецензию для просмотра
        if (isAuthorOfThisReport) {
          loadReviewForAuthor();
        }
        
      } else {
        setError(data.error || 'Ошибка при загрузке доклада');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка рецензии для рецензента
  const loadExistingReview = async () => {
    try {
      const userId = user?.user_id || user?.id;
      console.log('=== ЗАГРУЗКА РЕЦЕНЗИИ ДЛЯ РЕЦЕНЗЕНТА ===');
      console.log('URL:', `http://localhost:5000/api/reviews/report/${id}/reviewer/${userId}`);
      
      const response = await fetch(`http://localhost:5000/api/reviews/report/${id}/reviewer/${userId}`);
      const data = await response.json();
      
      console.log('Ответ сервера:', data);
      
      if (response.ok && data.success && data.review) {
        console.log('✅ Рецензия найдена');
        setExistingReview(data.review);
        setReview({
          scientific_value: data.review.scientific_value || 5,
          practical_value: data.review.practical_value || 5,
          relevance: data.review.relevance || 5,
          novelty: data.review.novelty || 5,
          quality: data.review.quality || 5,
          recommendation: data.review.recommendation || 'pending',
          comments_for_author: data.review.comments_for_author || ''
        });
      } else {
        console.log('❌ Рецензия не найдена');
        setExistingReview(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки рецензии:', error);
      setExistingReview(null);
    }
  };

  // Загрузка рецензии для автора (просмотр)
  const loadReviewForAuthor = async () => {
    try {
      console.log('=== ЗАГРУЗКА РЕЦЕНЗИИ ДЛЯ АВТОРА ===');
      console.log('URL:', `http://localhost:5000/api/reviews/by-report/${id}`);
      
      const response = await fetch(`http://localhost:5000/api/reviews/by-report/${id}`);
      const data = await response.json();
      
      console.log('Ответ сервера:', data);
      
      if (response.ok && data.success && data.review) {
        console.log('✅ Рецензия найдена для автора');
        setExistingReview(data.review);
      } else {
        console.log('❌ Рецензия не найдена');
        setExistingReview(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки рецензии для автора:', error);
      setExistingReview(null);
    }
  };

  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReview(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (field, value) => {
    setReview(prev => ({ ...prev, [field]: parseInt(value) }));
  };

  const handleSubmitReview = async () => {
    if (!review.comments_for_author.trim()) {
      alert('Пожалуйста, напишите рецензию для автора');
      return;
    }

    setSubmitting(true);
    try {
      const userId = user?.user_id || user?.id;
      
      const response = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_id: parseInt(id),
          reviewer_id: userId,
          scientific_value: review.scientific_value,
          practical_value: review.practical_value,
          relevance: review.relevance,
          novelty: review.novelty,
          quality: review.quality,
          recommendation: review.recommendation,
          comments_for_author: review.comments_for_author,
          is_final: false
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('Рецензия успешно сохранена');
        loadExistingReview();
      } else {
        alert(data.error || 'Ошибка при сохранении рецензии');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    } finally {
      setSubmitting(false);
    }
  };

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

  const getRecommendationLabel = (recommendation) => {
    const map = {
      'accept': '✅ Принять',
      'revision': '🔄 Требуются доработки',
      'reject': '❌ Отклонить',
      'pending': '⏳ На рассмотрении'
    };
    return map[recommendation] || recommendation;
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

  const renderStars = (field, value, label) => {
    return (
      <div className="form-group">
        <label>{label}:</label>
        <div className="rating-input">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
            <button
              key={star}
              type="button"
              className={`rating-star ${value >= star ? 'active' : ''}`}
              onClick={() => handleRatingChange(field, star)}
            >
              ★
            </button>
          ))}
        </div>
        <span className="rating-value">{value}/10</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="reports-page">
        <div className="container">
          <div className="loading">Загрузка доклада...</div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="reports-page">
        <div className="container">
          <div className="error-message">{error || 'Доклад не найден'}</div>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="container">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            ← Назад
          </button>
          <h1>{report.title}</h1>
          <span className={`status-badge ${getStatusClass(report.status)}`}>
            {getStatusLabel(report.status)}
          </span>
        </div>

        <div className="report-detail-container">
          {/* Информация о докладе */}
          <div className="report-info-section">
            <h2>Информация о докладе</h2>
            
            <div className="info-grid">
              <div className="info-item">
                <strong>Авторы:</strong>
                <p>
                  {report.coauthors && report.coauthors.length > 0 
                    ? report.coauthors.map(a => a.name).join(', ')
                    : report.author_name || 'Не указаны'}
                </p>
              </div>

              <div className="info-item">
                <strong>Конференция:</strong>
                <p>{report.conference_title || 'Не указана'}</p>
              </div>

              <div className="info-item">
                <strong>Секция:</strong>
                <p>{report.section_name || 'Не указана'}</p>
              </div>

              <div className="info-item">
                <strong>Дата подачи:</strong>
                <p>{formatDate(report.submitted_at || report.created_at)}</p>
              </div>

              {report.keywords && (
                <div className="info-item">
                  <strong>Ключевые слова:</strong>
                  <p>{report.keywords}</p>
                </div>
              )}
            </div>

            {/* Аннотация */}
            {report.abstract && (
              <div className="info-item full-width">
                <strong>Аннотация:</strong>
                <p className="abstract-text">{report.abstract}</p>
              </div>
            )}

            {/* Содержание доклада */}
            {report.content && (
              <div className="info-item full-width">
                <strong>Содержание:</strong>
                <div className="content-text">
                  {typeof report.content === 'string' 
                    ? report.content 
                    : JSON.stringify(report.content, null, 2)}
                </div>
              </div>
            )}

            {/* Литература */}
            {report.literature && (
              <div className="info-item full-width">
                <strong>Литература:</strong>
                <p className="literature-text">{report.literature}</p>
              </div>
            )}

            {/* Дополнительная информация */}
            {report.additional_info && (
              <div className="info-item full-width">
                <strong>Дополнительная информация:</strong>
                <p>{report.additional_info}</p>
              </div>
            )}
          </div>

          {/* БЛОК ДЛЯ РЕЦЕНЗЕНТА */}
          {isReviewer && report.status !== 'draft' && (
            <div className="review-section">
              <h2>
                {existingReview ? '✏️ Редактирование рецензии' : '📝 Написать рецензию'}
              </h2>
              
              {existingReview && (
                <div className="existing-review-display" style={{background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                  <h3>Текущая рецензия:</h3>
                  <div className="review-rating">
                    <strong>Научная ценность:</strong> {existingReview.scientific_value || 'Нет оценки'}/10
                  </div>
                  <div className="review-rating">
                    <strong>Практическая ценность:</strong> {existingReview.practical_value || 'Нет оценки'}/10
                  </div>
                  <div className="review-rating">
                    <strong>Актуальность:</strong> {existingReview.relevance || 'Нет оценки'}/10
                  </div>
                  <div className="review-rating">
                    <strong>Новизна:</strong> {existingReview.novelty || 'Нет оценки'}/10
                  </div>
                  <div className="review-rating">
                    <strong>Качество оформления:</strong> {existingReview.quality || 'Нет оценки'}/10
                  </div>
                  <div className="review-recommendation">
                    <strong>Рекомендация:</strong> {getRecommendationLabel(existingReview.recommendation)}
                  </div>
                  <div className="review-comment">
                    <strong>Комментарий:</strong>
                    <p>{existingReview.comments_for_author || 'Нет комментариев'}</p>
                  </div>
                  <div className="review-date">
                    <small>Дата рецензии: {formatDate(existingReview.created_at)}</small>
                  </div>
                  <hr />
                  <p><em>Вы можете отредактировать рецензию ниже:</em></p>
                </div>
              )}

              <div className="review-form">
                {renderStars('scientific_value', review.scientific_value, 'Научная ценность')}
                {renderStars('practical_value', review.practical_value, 'Практическая ценность')}
                {renderStars('relevance', review.relevance, 'Актуальность')}
                {renderStars('novelty', review.novelty, 'Новизна')}
                {renderStars('quality', review.quality, 'Качество оформления')}

                <div className="form-group">
                  <label>Рекомендация:</label>
                  <select
                    name="recommendation"
                    value={review.recommendation}
                    onChange={handleReviewChange}
                    className="form-select"
                  >
                    <option value="pending">⏳ На рассмотрении</option>
                    <option value="accept">✅ Принять доклад</option>
                    <option value="revision">🔄 Требуются доработки</option>
                    <option value="reject">❌ Отклонить доклад</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>📄 Комментарии для автора:</label>
                  <textarea
                    name="comments_for_author"
                    value={review.comments_for_author}
                    onChange={handleReviewChange}
                    rows="8"
                    className="form-textarea"
                    placeholder="Напишите вашу рецензию здесь..."
                  />
                </div>

                <div className="review-actions">
                  <button
                    className="btn-primary"
                    onClick={handleSubmitReview}
                    disabled={submitting}
                  >
                    {submitting ? 'Сохранение...' : existingReview ? '💾 Обновить рецензию' : '📤 Отправить рецензию'}
                  </button>
                  <button className="btn-secondary" onClick={() => navigate(-1)}>
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* БЛОК ДЛЯ АВТОРА - просмотр готовой рецензии */}
          {!isReviewer && isAuthorOfReport && existingReview && (
            <div className="review-section read-only">
              <h2>📋 Рецензия на доклад</h2>
              <div className="review-display">
                <div className="review-rating">
                  <strong>Научная ценность:</strong> {existingReview.scientific_value || 'Нет оценки'}/10
                </div>
                <div className="review-rating">
                  <strong>Практическая ценность:</strong> {existingReview.practical_value || 'Нет оценки'}/10
                </div>
                <div className="review-rating">
                  <strong>Актуальность:</strong> {existingReview.relevance || 'Нет оценки'}/10
                </div>
                <div className="review-rating">
                  <strong>Новизна:</strong> {existingReview.novelty || 'Нет оценки'}/10
                </div>
                <div className="review-rating">
                  <strong>Качество оформления:</strong> {existingReview.quality || 'Нет оценки'}/10
                </div>
                <div className="review-recommendation">
                  <strong>Рекомендация:</strong> {getRecommendationLabel(existingReview.recommendation)}
                </div>
                <div className="review-comment">
                  <strong>Комментарий рецензента:</strong>
                  <p>{existingReview.comments_for_author || 'Нет комментариев'}</p>
                </div>
                <div className="review-date">
                  <small>Дата рецензии: {formatDate(existingReview.created_at)}</small>
                </div>
              </div>
            </div>
          )}

          {/* Если автор и нет рецензии */}
          {!isReviewer && isAuthorOfReport && !existingReview && (
            <div className="review-section">
              <h3>ℹ️ Информация</h3>
              <p>Рецензия на данный доклад еще не готова.</p>
              <p>Вы получите уведомление, когда рецензия будет опубликована.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ReportDetail;