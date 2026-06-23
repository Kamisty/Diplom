// src/pages/Reports/ReportDetail.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Reports.css';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conferenceStyles, setConferenceStyles] = useState(null);
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
  const isReviewer = user?.activeRole === 'Рецензент';

  // Загрузка стилей конференции - ИСПРАВЛЕННЫЙ URL
  const loadConferenceStyles = useCallback(async (conferenceId) => {
    if (!conferenceId) return null;
    
    try {
      console.log(`🔍 Загрузка стилей для конференции ${conferenceId}...`);
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${conferenceId}/styles`);
      const data = await response.json();
      
      console.log('📦 Ответ стилей:', data);
      
      if (response.ok && data.success && data.styles) {
        setConferenceStyles(data.styles);
        console.log('✅ Стили загружены:', data.styles);
        return data.styles;
      } else {
        console.log('⚠️ Стили не найдены, используем стандартные');
        setConferenceStyles(null);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки стилей:', error);
      setConferenceStyles(null);
    }
    return null;
  }, []);

  // Загрузка рецензии для автора (просмотр)
  const loadReviewForAuthor = useCallback(async () => {
    try {
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/reviews/by-report/${id}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.review) {
        setExistingReview(data.review);
      } else {
        setExistingReview(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки рецензии для автора:', error);
      setExistingReview(null);
    }
  }, [id]);

  // Загрузка доклада
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/reports/${id}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setReport(data.report);
        
        // Загружаем стили конференции
        if (data.report?.conference_id) {
          await loadConferenceStyles(data.report.conference_id);
        }
        
        const currentUserId = user?.id || user?.user_id;
        const reportAuthorId = data.report?.user_id || data.report?.author_id;
        
        const isAuthorOfThisReport = currentUserId === reportAuthorId || 
                                     data.report?.author_name === user?.name;
        
        setIsAuthorOfReport(isAuthorOfThisReport);
        
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
  }, [id, user?.id, user?.user_id, user?.name, loadReviewForAuthor, loadConferenceStyles]);

  // Загрузка рецензии для рецензента
  const loadExistingReview = useCallback(async () => {
    try {
      const userId = user?.user_id || user?.id;
      const response = await fetch(`https://diplom-j6uo.onrender.com/api/reviews/report/${id}/reviewer/${userId}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.review) {
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
        setExistingReview(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки рецензии:', error);
      setExistingReview(null);
    }
  }, [id, user?.user_id, user?.id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (id && isReviewer) {
      loadExistingReview();
    }
  }, [id, isReviewer, loadExistingReview]);

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
      
      const response = await fetch('https://diplom-j6uo.onrender.com/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Функция для получения стилей с увеличением в 2 раза
  const getStyles = () => {
    const s = conferenceStyles || {};
    
    console.log('🎨 Применяемые стили:', s);
    
    return {
      // Фон страницы
      pageBackground: s.page_background || '#ffffff',
      containerPadding: s.container_padding || 60,
      fontFamily: s.font_family || 'Futura PT, -apple-system, BlinkMacSystemFont, sans-serif',
      
      // Название (увеличено в 2 раза)
      titleFontSize: (s.title_font_size || 28) * 2,
      titleFontWeight: s.title_font_weight || '600',
      titleColor: s.title_color || '#2c3e50',
      titleTextAlign: s.title_text_align || 'center',
      titleMarginBottom: (s.title_margin_bottom || 30) * 2,
      
      // Авторы (увеличено в 2 раза)
      authorsFontSize: (s.authors_font_size || 16) * 2,
      authorsFontWeight: s.authors_font_weight || '400',
      authorsColor: s.authors_color || '#34495e',
      authorsTextAlign: s.authors_text_align || 'center',
      authorsMarginBottom: (s.authors_margin_bottom || 20) * 2,
      
      // Аннотация (увеличено в 2 раза)
      abstractFontSize: (s.abstract_font_size || 14) * 2,
      abstractFontWeight: s.abstract_font_weight || '400',
      abstractColor: s.abstract_color || '#333333',
      abstractLineHeight: s.abstract_line_height || 1.6,
      abstractMarginBottom: (s.abstract_margin_bottom || 25) * 2,
      
      // Ключевые слова (увеличено в 2 раза)
      keywordsFontSize: (s.keywords_font_size || 14) * 2,
      keywordsFontWeight: s.keywords_font_weight || '600',
      keywordsColor: s.keywords_color || '#34495e',
      keywordsMarginBottom: (s.keywords_margin_bottom || 25) * 2,
      
      // Заголовки секций (увеличено в 2 раза)
      sectionTitleFontSize: (s.section_title_font_size || 22) * 2,
      sectionTitleFontWeight: s.section_title_font_weight || '600',
      sectionTitleColor: s.section_title_color || '#2c3e50',
      sectionTitleMarginTop: (s.section_title_margin_top || 25) * 2,
      sectionTitleMarginBottom: (s.section_title_margin_bottom || 15) * 2,
      
      // Текст (увеличено в 2 раза)
      textFontSize: (s.text_font_size || 14) * 2,
      textLineHeight: s.text_line_height || 1.6,
      textColor: s.text_color || '#333333',
      textMarginBottom: (s.text_margin_bottom || 15) * 2,
      
      // Таблицы (увеличено в 2 раза)
      tableBorderColor: s.table_border_color || '#000000',
      tableHeaderBg: s.table_header_bg || '#f8f9fa',
      tableCellPadding: (s.table_cell_padding || 8) * 2,
      
      // Изображения
      imageMaxWidth: s.image_max_width || '100%',
      imageMarginTop: (s.image_margin_top || 20) * 2,
      imageMarginBottom: (s.image_margin_bottom || 20) * 2,
      
      // Формулы (увеличено в 2 раза)
      formulaFontSize: (s.formula_font_size || 18) * 2,
      formulaColor: s.formula_color || '#333333',
      formulaTextAlign: s.formula_text_align || 'center',
      
      // Литература (увеличено в 2 раза)
      referencesFontSize: (s.references_font_size || 12) * 2,
      referencesLineHeight: s.references_line_height || 1.4,
      referencesColor: s.references_color || '#666666',
    };
  };

  // Функция рендеринга контента статьи
  const renderArticleContent = () => {
    if (!report?.content || !Array.isArray(report.content) || report.content.length === 0) {
      return <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        Содержание статьи пусто
      </div>;
    }

    const styles = getStyles();

    return report.content.map((block, index) => {
      switch (block.type) {
        case 'text':
          return (
            <div 
              key={block.id || index} 
              style={{
                fontSize: styles.textFontSize,
                lineHeight: styles.textLineHeight,
                color: styles.textColor,
                marginBottom: styles.textMarginBottom,
                fontFamily: styles.fontFamily,
                textAlign: 'justify'
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: block.content }} />
            </div>
          );

        case 'table': {
          const mergedCells = block.mergedCells || {};
          const rotatedCells = block.rotatedCells || {};
          const tableData = block.data || [];
          const rows = tableData.length;
          const cols = tableData[0]?.length || 0;

          const shouldRenderCell = (row, col) => {
            for (const [key, info] of Object.entries(mergedCells)) {
              const [startRow, startCol] = key.split('-').map(Number);
              if (row >= startRow && row < startRow + info.rowspan &&
                  col >= startCol && col < startCol + info.colspan) {
                return startRow === row && startCol === col;
              }
            }
            return true;
          };

          const getCellValue = (row, col) => {
            for (const [key, info] of Object.entries(mergedCells)) {
              const [startRow, startCol] = key.split('-').map(Number);
              if (row >= startRow && row < startRow + info.rowspan &&
                  col >= startCol && col < startCol + info.colspan) {
                return info.value || tableData[startRow]?.[startCol] || '';
              }
            }
            return tableData[row]?.[col] || '';
          };

          const getSpan = (row, col) => {
            for (const [key, info] of Object.entries(mergedCells)) {
              const [startRow, startCol] = key.split('-').map(Number);
              if (row === startRow && col === startCol) {
                return { rowSpan: info.rowspan, colSpan: info.colspan };
              }
            }
            return { rowSpan: 1, colSpan: 1 };
          };

          const isRotated = (row, col) => {
            return rotatedCells[`${row}-${col}`] || false;
          };

          const hasHeaders = block.headers &&
                            block.headers.length > 0 &&
                            block.headers.some(header => header && header.trim() !== '');

          return (
            <div key={block.id || index} style={{ margin: `${styles.textMarginBottom} 0` }}>
              <div style={{ 
                textAlign: 'center', 
                fontWeight: '600',
                marginBottom: styles.textMarginBottom,
                fontSize: styles.textFontSize,
                color: styles.textColor
              }}>
                Таблица {block.number || index + 1} — {block.caption || ''}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  border: `1px solid ${styles.tableBorderColor}`,
                  fontSize: styles.textFontSize
                }}>
                  {hasHeaders && (
                    <thead>
                      <tr>
                        {block.headers.map((header, i) => (
                          <th key={i} style={{
                            border: `1px solid ${styles.tableBorderColor}`,
                            padding: `${styles.tableCellPadding}px`,
                            backgroundColor: styles.tableHeaderBg,
                            fontWeight: '600',
                            textAlign: 'center',
                            color: styles.textColor
                          }}>
                            {header || ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}

                  <tbody>
                    {Array.from({ length: rows }).map((_, rowIndex) => {
                      let hasVisibleCells = false;
                      for (let colIndex = 0; colIndex < cols; colIndex++) {
                        if (shouldRenderCell(rowIndex, colIndex)) {
                          hasVisibleCells = true;
                          break;
                        }
                      }
                      if (!hasVisibleCells) return null;

                      return (
                        <tr key={rowIndex}>
                          {Array.from({ length: cols }).map((_, colIndex) => {
                            if (!shouldRenderCell(rowIndex, colIndex)) {
                              return null;
                            }

                            const { rowSpan, colSpan } = getSpan(rowIndex, colIndex);
                            const cellValue = getCellValue(rowIndex, colIndex);
                            const rotated = isRotated(rowIndex, colIndex);

                            return (
                              <td
                                key={`${rowIndex}-${colIndex}`}
                                rowSpan={rowSpan}
                                colSpan={colSpan}
                                style={{
                                  border: `1px solid ${styles.tableBorderColor}`,
                                  padding: rotated ? `${styles.tableCellPadding / 2}px` : `${styles.tableCellPadding}px`,
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  color: styles.textColor,
                                  ...(rotated && {
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    whiteSpace: 'nowrap',
                                    minWidth: '30px',
                                    height: 'auto'
                                  })
                                }}
                              >
                                {rotated ? (
                                  <div style={{
                                    display: 'inline-block',
                                    transform: 'rotate(0deg)'
                                  }}>
                                    {cellValue}
                                  </div>
                                ) : (
                                  cellValue
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        case 'image': {
          return (
            <div key={block.id || index} style={{
              textAlign: block.align || 'center',
              margin: `${styles.imageMarginTop}px 0 ${styles.imageMarginBottom}px 0`
            }}>
              <img
                src={block.src}
                alt={block.caption || ''}
                style={{
                  maxWidth: styles.imageMaxWidth,
                  width: block.width || 'auto',
                  height: 'auto'
                }}
              />
              <div style={{
                marginTop: '8px',
                fontSize: styles.textFontSize,
                color: styles.textColor,
                textAlign: 'center'
              }}>
                Рисунок {block.number || index + 1} — {block.caption || ''}
              </div>
            </div>
          );
        }

        case 'formula': {
          const formulaText = block.formulaString || block.content || '';
          const cleanFormula = formulaText
            .replace(/\\\\/g, '\\')
            .replace(/\\\[|\\\]|\\\(|\\\)/g, '');

          return (
            <div key={block.id || index} style={{
              textAlign: styles.formulaTextAlign,
              margin: `${styles.textMarginBottom} 0`,
              padding: `${styles.textMarginBottom} 0`,
              overflowX: 'auto'
            }}>
              <div style={{
                fontSize: styles.formulaFontSize,
                fontFamily: '"Times New Roman", "Cambria Math", serif',
                padding: '10px',
                color: styles.formulaColor
              }}>
                <BlockMath math={cleanFormula} />
              </div>
              <div style={{
                marginTop: '10px',
                textAlign: 'center',
                fontSize: styles.referencesFontSize,
                color: styles.referencesColor,
                fontStyle: 'italic'
              }}>
                Формула {block.number || index + 1}
              </div>
            </div>
          );
        }

        default:
          return null;
      }
    });
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
          <button className="btn-secondary" onClick={() => navigate(-1)}>Назад</button>
        </div>
      </div>
    );
  }

  const styles = getStyles();

  return (
    <div className="reports-page" style={{
      backgroundColor: '#e8e8e8',
      minHeight: '100vh',
      padding: '30px 20px',
      fontFamily: styles.fontFamily
    }}>
      {/* Кнопка назад */}
      <div style={{ 
        maxWidth: '210mm', 
        margin: '0 auto 20px auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button 
          className="btn-back" 
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Назад
        </button>
        <span className={`status-badge ${getStatusClass(report.status)}`}>
          {getStatusLabel(report.status)}
        </span>
      </div>

      {/* Страница документа как в Word */}
      <div style={{
        maxWidth: '210mm',
        width: '100%',
        margin: '0 auto',
        backgroundColor: styles.pageBackground,
        padding: `${styles.containerPadding}px`,
        boxShadow: '0 2px 20px rgba(0,0,0,0.12)',
        borderRadius: '4px',
        minHeight: '297mm'
      }}>
        {/* НАЗВАНИЕ СТАТЬИ */}
        <h1 style={{
          fontSize: styles.titleFontSize,
          fontWeight: styles.titleFontWeight,
          color: styles.titleColor,
          textAlign: styles.titleTextAlign,
          marginBottom: styles.titleMarginBottom,
          marginTop: 0,
          fontFamily: styles.fontFamily
        }}>
          {report.title}
        </h1>

        {/* ИНФОРМАЦИЯ О ДОКЛАДЕ (конференция, секция, дата) */}
        <div style={{
          textAlign: 'center',
          marginBottom: styles.authorsMarginBottom,
          fontSize: styles.textFontSize,
          color: '#666',
          borderBottom: '1px solid #eee',
          paddingBottom: styles.textMarginBottom
        }}>
          {report.conference_title && (
            <div><strong>Конференция:</strong> {report.conference_title}</div>
          )}
          {report.section_name && (
            <div><strong>Секция:</strong> {report.section_name}</div>
          )}
          {report.submitted_at && (
            <div><strong>Дата подачи:</strong> {formatDate(report.submitted_at)}</div>
          )}
        </div>

        {/* АВТОРЫ */}
        <div style={{
          fontSize: styles.authorsFontSize,
          fontWeight: styles.authorsFontWeight,
          color: styles.authorsColor,
          textAlign: styles.authorsTextAlign,
          marginBottom: styles.authorsMarginBottom
        }}>
          {report.coauthors && report.coauthors.length > 0 
            ? report.coauthors.map(a => a.name).join(', ')
            : report.author_name || 'Авторы не указаны'}
        </div>

        {/* КЛЮЧЕВЫЕ СЛОВА */}
        {report.keywords && (
          <div style={{
            fontSize: styles.keywordsFontSize,
            fontWeight: styles.keywordsFontWeight,
            color: styles.keywordsColor,
            marginBottom: styles.keywordsMarginBottom
          }}>
            <strong>Ключевые слова:</strong> {report.keywords}
          </div>
        )}

        {/* АННОТАЦИЯ */}
        {report.abstract && (
          <div style={{
            fontSize: styles.abstractFontSize,
            fontWeight: styles.abstractFontWeight,
            color: styles.abstractColor,
            lineHeight: styles.abstractLineHeight,
            marginBottom: styles.abstractMarginBottom,
            textAlign: 'justify'
          }}>
            <strong>Аннотация:</strong> {report.abstract}
          </div>
        )}

        {/* СОДЕРЖАНИЕ (без заголовка) */}
        <div>
          {renderArticleContent()}
        </div>

        {/* СПИСОК ЛИТЕРАТУРЫ */}
        {report.literature && (
          <div style={{
            marginTop: styles.sectionTitleMarginTop,
            fontSize: styles.referencesFontSize,
            lineHeight: styles.referencesLineHeight,
            color: styles.referencesColor,
            borderTop: '1px solid #eee',
            paddingTop: styles.sectionTitleMarginBottom
          }}>
            <h2 style={{
              fontSize: styles.sectionTitleFontSize,
              fontWeight: styles.sectionTitleFontWeight,
              color: styles.sectionTitleColor,
              marginTop: 0,
              marginBottom: styles.sectionTitleMarginBottom
            }}>
              Список литературы
            </h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {report.literature}
            </div>
          </div>
        )}
      </div>

      {/* Блоки рецензий */}
      <div style={{ maxWidth: '210mm', margin: '20px auto 0 auto' }}>
        {/* Блок для рецензента */}
        {isReviewer && report.status !== 'draft' && (
          <div className="review-section" style={{
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h2 style={{
              fontSize: styles.sectionTitleFontSize,
              fontWeight: styles.sectionTitleFontWeight,
              color: styles.sectionTitleColor,
              marginTop: 0,
              marginBottom: '20px'
            }}>{existingReview ? '✏️ Редактирование рецензии' : '📝 Написать рецензию'}</h2>
            
            {existingReview && (
              <div className="existing-review-display" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>Текущая рецензия:</h3>
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
                <select name="recommendation" value={review.recommendation} onChange={handleReviewChange} className="form-select" style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ffe6cc',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <option value="pending">⏳ На рассмотрении</option>
                  <option value="accept">✅ Принять доклад</option>
                  <option value="revision">🔄 Требуются доработки</option>
                  <option value="reject">❌ Отклонить доклад</option>
                </select>
              </div>

              <div className="form-group">
                <label>📄 Комментарии для автора:</label>
                <textarea name="comments_for_author" value={review.comments_for_author} onChange={handleReviewChange} rows="8" className="form-textarea" style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ffe6cc',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  minHeight: '150px'
                }} placeholder="Напишите вашу рецензию здесь..." />
              </div>

              <div className="review-actions" style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                <button className="btn-primary" onClick={handleSubmitReview} disabled={submitting} style={{
                  padding: '12px 30px',
                  backgroundColor: '#f39c12',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 500
                }}>
                  {submitting ? 'Сохранение...' : existingReview ? '💾 Обновить рецензию' : '📤 Отправить рецензию'}
                </button>
                <button className="btn-secondary" onClick={() => navigate(-1)} style={{
                  padding: '12px 30px',
                  backgroundColor: '#95a5a6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 500
                }}>Отмена</button>
              </div>
            </div>
          </div>
        )}

        {/* Блок для автора */}
        {!isReviewer && isAuthorOfReport && existingReview && (
          <div className="review-section read-only" style={{
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h2 style={{
              fontSize: styles.sectionTitleFontSize,
              fontWeight: styles.sectionTitleFontWeight,
              color: styles.sectionTitleColor,
              marginTop: 0,
              marginBottom: '20px'
            }}>📋 Рецензия на доклад</h2>
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

        {!isReviewer && isAuthorOfReport && !existingReview && (
          <div className="review-section" style={{
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h3>ℹ️ Информация</h3>
            <p>Рецензия на данный доклад еще не готова.</p>
            <p>Вы получите уведомление, когда рецензия будет опубликована.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetail;