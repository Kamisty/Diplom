// src/pages/Reports/SubmitReport.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import TableManager from '../../components/article/TableManager.jsx';
import ImageManager from '../../components/article/ImageManager.jsx';
import FormulaManager from '../../components/article/FormulaManager.jsx';
// import wordStyles from '../../wordStyles.json';
import './Reports.css';

const SubmitReport = () => {
  const navigate = useNavigate();
  
  // Состояния для отправки
  const [loading, setLoading] = useState(false);
  const [conferences, setConferences] = useState([]);
  const [loadingConferences, setLoadingConferences] = useState(true);
  const [reportFile, setReportFile] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Состояния для статьи
  const [article, setArticle] = useState({
    annotation: '',
    keywords: '',
  });
  const [contentBlocks, setContentBlocks] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [editingBlock, setEditingBlock] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Состояния для менеджеров
  const [isTableManagerOpen, setIsTableManagerOpen] = useState(false);
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [isFormulaManagerOpen, setIsFormulaManagerOpen] = useState(false);
  
  const [tableCounter, setTableCounter] = useState(1);
  const [imageCounter, setImageCounter] = useState(1);
  const [formulaCounter, setFormulaCounter] = useState(1);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState(null);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Состояния для формы доклада
  const [formData, setFormData] = useState({
    title: '',
    conferenceId: '',
    authors: [''],
    additionalInfo: ''
  });
  
  const quillRef = useRef(null);
  
  // Настройки редактора
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ],
  };
  
  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'script', 'sub', 'super', 'list', 'bullet', 'indent',
    'link', 'color', 'background'
  ];
  
  // Загрузка конференций
  useEffect(() => {
    fetchConferences();
  }, []);
  
  const fetchConferences = async () => {
    setLoadingConferences(true);
    try {
      const response = await fetch('http://localhost:5000/api/conferences');
      const data = await response.json();
      
      if (response.ok) {
        let conferencesList = Array.isArray(data) ? data : (data.conferences || []);
        const now = new Date();
        const activeConferences = conferencesList.filter(conf => {
          if (!conf.deadline) return true;
          const deadline = new Date(conf.deadline);
          return isNaN(deadline.getTime()) || deadline > now;
        });
        setConferences(activeConferences);
      }
    } catch (error) {
      console.error('Ошибка загрузки конференций:', error);
    } finally {
      setLoadingConferences(false);
    }
  };
  
  // Загрузка черновика
  useEffect(() => {
    const savedArticle = localStorage.getItem('articleDraft');
    if (savedArticle) {
      try {
        const parsed = JSON.parse(savedArticle);
        setArticle(parsed.article || { annotation: '', keywords: '' });
        setContentBlocks(parsed.contentBlocks || []);
        setTableCounter(parsed.counters?.table || 1);
        setImageCounter(parsed.counters?.image || 1);
        setFormulaCounter(parsed.counters?.formula || 1);
        if (parsed.formData) {
          setFormData(prev => ({ ...prev, ...parsed.formData }));
        }
        showTemporaryMessage('📂 Черновик загружен');
      } catch (error) {
        console.error('Ошибка загрузки черновика:', error);
      }
    }
  }, []);
  
  const showTemporaryMessage = (message) => {
    setSaveMessage(message);
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };
  
  // Функции для работы с авторами
  const addAuthor = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, '']
    }));
  };
  
  const removeAuthor = (index) => {
    if (formData.authors.length > 1) {
      setFormData(prev => ({
        ...prev,
        authors: prev.authors.filter((_, i) => i !== index)
      }));
    }
  };
  
  const updateAuthor = (index, value) => {
    const newAuthors = [...formData.authors];
    newAuthors[index] = value;
    setFormData(prev => ({
      ...prev,
      authors: newAuthors
    }));
  };
  
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      setReportFile(files[0]);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Функции для работы с контентом
  const insertTextBlock = () => {
    const quillEditor = document.querySelector('.ql-editor');
    if (!quillEditor) {
      alert('❌ Редактор не найден');
      return;
    }
    
    const content = quillEditor.innerHTML;
    const textContent = quillEditor.innerText || quillEditor.textContent || '';
    
    if (textContent.trim().length > 0 && content !== '<p><br></p>' && content !== '<p></p>') {
      const newBlock = {
        id: Date.now(),
        type: 'text',
        content: content
      };
      setContentBlocks(prevBlocks => [...prevBlocks, newBlock]);
      setCurrentText('');
      if (quillRef.current) {
        try {
          const editor = quillRef.current.getEditor();
          editor.setText('');
        } catch (err) {
          console.error('Ошибка при очистке редактора:', err);
        }
      }
      showTemporaryMessage('✅ Текст добавлен');
    } else {
      alert('❌ Введите текст перед добавлением');
    }
  };
  
  const clearTextField = () => {
    setCurrentText('');
    if (quillRef.current) {
      try {
        const editor = quillRef.current.getEditor();
        editor.setText('');
      } catch (err) {
        console.error('Ошибка при очистке редактора:', err);
      }
    }
  };
  
  const updateTextBlock = () => {
    if (!editingBlock) return;
    
    const quillEditor = document.querySelector('.ql-editor');
    if (!quillEditor) {
      alert('❌ Редактор не найден');
      return;
    }
    
    const content = quillEditor.innerHTML;
    const textContent = quillEditor.innerText || quillEditor.textContent || '';
    
    if (textContent.trim().length > 0 && content !== '<p><br></p>' && content !== '<p></p>') {
      const updatedBlocks = contentBlocks.map(block => 
        block.id === editingBlock.id ? { ...block, content: content } : block
      );
      setContentBlocks(updatedBlocks);
      cancelEditing();
      showTemporaryMessage('✅ Текст обновлен');
    } else {
      alert('❌ Введите текст перед обновлением');
    }
  };
  
  const openBlockForEditing = (block, e) => {
    e.stopPropagation();
    setEditingBlock(block);
    
    switch (block.type) {
      case 'text':
        setCurrentText(block.content);
        setTimeout(() => {
          const editorElement = document.querySelector('.ql-container');
          if (editorElement) {
            editorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        break;
      case 'table':
        setIsTableManagerOpen(true);
        break;
      case 'image':
        setIsImageManagerOpen(true);
        break;
      case 'formula':
        setIsFormulaManagerOpen(true);
        break;
      default:
        break;
    }
  };
  
  const cancelEditing = () => {
    setEditingBlock(null);
    setCurrentText('');
    setIsTableManagerOpen(false);
    setIsImageManagerOpen(false);
    setIsFormulaManagerOpen(false);
    if (quillRef.current) {
      try {
        const editor = quillRef.current.getEditor();
        editor.setText('');
      } catch (err) {
        console.error('Ошибка при очистке редактора:', err);
      }
    }
  };
  
  // Обработчик для таблиц
  const handleSaveTable = (tableData) => {
    if (editingBlock?.type === 'table') {
      // Обновление существующей таблицы
      const updatedBlocks = contentBlocks.map(block => 
        block.id === editingBlock.id 
          ? { 
              ...block, 
              caption: tableData.caption,
              headers: tableData.headers || [],
              data: tableData.data,
              mergedCells: tableData.mergedCells || {},
              rotatedCells: tableData.rotatedCells || {}
            }
          : block
      );
      setContentBlocks(updatedBlocks);
      setEditingBlock(null);
      showTemporaryMessage('✅ Таблица обновлена');
    } else {
      // Создание новой таблицы
      const newBlock = {
        id: Date.now(),
        type: 'table',
        number: tableCounter,
        caption: tableData.caption,
        headers: tableData.headers || [],
        data: tableData.data,
        mergedCells: tableData.mergedCells || {},
        rotatedCells: tableData.rotatedCells || {},
        createdAt: new Date().toISOString()
      };
      setContentBlocks([...contentBlocks, newBlock]);
      setTableCounter(tableCounter + 1);
      showTemporaryMessage(`✅ Таблица "${tableData.caption}" добавлена`);
    }
    setIsTableManagerOpen(false);
  };
  
  // Обработчик для изображений
  const handleSaveImage = (imageData) => {
    if (editingBlock?.type === 'image') {
      // Обновление существующего изображения
      const updatedBlocks = contentBlocks.map(block => 
        block.id === editingBlock.id 
          ? { 
              ...block, 
              src: imageData.src,
              caption: imageData.caption,
              align: imageData.align,
              width: imageData.width
            }
          : block
      );
      setContentBlocks(updatedBlocks);
      setEditingBlock(null);
      showTemporaryMessage('✅ Изображение обновлено');
    } else {
      // Создание нового изображения
      const newBlock = {
        id: Date.now(),
        type: 'image',
        number: imageCounter,
        src: imageData.src,
        caption: imageData.caption,
        align: imageData.align,
        width: imageData.width,
        createdAt: new Date().toISOString()
      };
      setContentBlocks([...contentBlocks, newBlock]);
      setImageCounter(imageCounter + 1);
      showTemporaryMessage(`✅ Изображение "${imageData.caption}" добавлено`);
    }
    setIsImageManagerOpen(false);
  };
  
  // Обработчик для формул
  const handleSaveFormula = (formulaData) => {
    if (editingBlock?.type === 'formula') {
      // Обновление существующей формулы
      const updatedBlocks = contentBlocks.map(block => 
        block.id === editingBlock.id 
          ? { 
              ...block, 
              content: formulaData.content,
              formulaString: formulaData.formulaString,
              latexString: formulaData.latexString,
              align: formulaData.align,
              size: formulaData.size
            }
          : block
      );
      setContentBlocks(updatedBlocks);
      setEditingBlock(null);
      showTemporaryMessage('✅ Формула обновлена');
    } else {
      // Создание новой формулы
      const newBlock = {
        id: Date.now(),
        type: 'formula',
        number: formulaCounter,
        content: formulaData.content,
        formulaString: formulaData.formulaString,
        latexString: formulaData.latexString,
        align: formulaData.align,
        size: formulaData.size,
        createdAt: new Date().toISOString()
      };
      setContentBlocks([...contentBlocks, newBlock]);
      setFormulaCounter(formulaCounter + 1);
      showTemporaryMessage(`✅ Формула ${formulaCounter} добавлена`);
    }
    setIsFormulaManagerOpen(false);
  };
  
  const moveBlockUp = (index) => {
    if (index > 0) {
      const newBlocks = [...contentBlocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      setContentBlocks(newBlocks);
    }
  };
  
  const moveBlockDown = (index) => {
    if (index < contentBlocks.length - 1) {
      const newBlocks = [...contentBlocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      setContentBlocks(newBlocks);
    }
  };
  
  const deleteBlock = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Удалить этот блок?')) {
      setContentBlocks(contentBlocks.filter(block => block.id !== id));
      if (editingBlock?.id === id) cancelEditing();
    }
  };
  
  const handleDragStart = (index) => {
    setDraggedBlockIndex(index);
  };
  
  const handleDragOver = (index) => {
    if (draggedBlockIndex !== null && draggedBlockIndex !== index) {
      setDragOverBlockIndex(index);
    }
  };
  
  const handleDragEnd = () => {
    if (draggedBlockIndex !== null && dragOverBlockIndex !== null) {
      const newBlocks = [...contentBlocks];
      const [draggedBlock] = newBlocks.splice(draggedBlockIndex, 1);
      newBlocks.splice(dragOverBlockIndex, 0, draggedBlock);
      setContentBlocks(newBlocks);
    }
    setDraggedBlockIndex(null);
    setDragOverBlockIndex(null);
  };
  
  // Сохранение черновика
  const saveDraft = () => {
    const articleData = { 
      article, 
      contentBlocks, 
      counters: { table: tableCounter, image: imageCounter, formula: formulaCounter },
      formData: { title: formData.title, authors: formData.authors, additionalInfo: formData.additionalInfo },
      lastModified: new Date().toISOString()
    };
    localStorage.setItem('articleDraft', JSON.stringify(articleData));
    showTemporaryMessage('💾 Черновик сохранен');
  };
  
  // Валидация
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Введите название доклада';
    if (!formData.conferenceId) newErrors.conferenceId = 'Выберите конференцию';
    if (!article.annotation.trim()) {
      newErrors.annotation = 'Введите аннотацию';
    } else if (article.annotation.length < 50) {
      newErrors.annotation = 'Аннотация должна содержать минимум 50 символов';
    }
    if (!article.keywords.trim()) newErrors.keywords = 'Введите ключевые слова';
    
    const hasEmptyAuthor = formData.authors.some(author => !author.trim());
    if (hasEmptyAuthor) newErrors.authors = 'Заполните ФИО всех авторов';
    
    if (!reportFile) {
      newErrors.file = 'Загрузите файл доклада';
    } else if (reportFile.size > 10 * 1024 * 1024) {
      newErrors.file = 'Файл не должен превышать 10MB';
    }
    
    if (contentBlocks.length === 0) {
      newErrors.content = 'Добавьте хотя бы один блок контента';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Отправка доклада
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setLoading(true);
    
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id) {
        alert('Необходимо авторизоваться');
        navigate('/input');
        return;
      }
      
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('conference_id', formData.conferenceId);
      formDataToSend.append('user_id', user.id);
      formDataToSend.append('abstract', article.annotation);
      formDataToSend.append('keywords', article.keywords);
      formDataToSend.append('authors', JSON.stringify(formData.authors.filter(a => a.trim())));
      formDataToSend.append('content', JSON.stringify(contentBlocks));
      formDataToSend.append('additional_info', formData.additionalInfo);
      formDataToSend.append('file', reportFile);
      
      const response = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitSuccess(true);
        localStorage.removeItem('articleDraft');
        setTimeout(() => {
          navigate('/my-reports');
        }, 2000);
      } else {
        alert(data.error || 'Ошибка при отправке доклада');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return dateString;
    }
  };
  
  // Функция для рендеринга таблицы с учетом объединенных и повернутых ячеек
  const renderTableBlock = (block) => {
    const mergedCells = block.mergedCells || {};
    const rotatedCells = block.rotatedCells || {};
    const tableData = block.data || [];
    const rows = tableData.length;
    const cols = tableData[0]?.length || 0;
    
    // Функция для получения реальных координат с учетом объединения
    const getActualCell = (row, col) => {
      for (const [key, info] of Object.entries(mergedCells)) {
        const [startRow, startCol] = key.split('-').map(Number);
        if (row >= startRow && row < startRow + info.rowspan &&
            col >= startCol && col < startCol + info.colspan) {
          return { row: startRow, col: startCol, merged: true, info };
        }
      }
      return { row, col, merged: false };
    };
    
    // Функция для получения значения ячейки
    const getCellValue = (row, col) => {
      const actual = getActualCell(row, col);
      if (actual.merged) {
        const key = `${actual.row}-${actual.col}`;
        return mergedCells[key]?.value || '';
      }
      return tableData[row]?.[col] || '';
    };
    
    // Функция для проверки, нужно ли рендерить ячейку
    const shouldRenderCell = (row, col) => {
      const actual = getActualCell(row, col);
      if (actual.merged) {
        return actual.row === row && actual.col === col;
      }
      return true;
    };
    
    // Функция для проверки поворота ячейки
    const isRotated = (row, col) => {
      const actual = getActualCell(row, col);
      return rotatedCells[`${actual.row}-${actual.col}`] || false;
    };
    
    return (
      <div key={block.id} style={{ margin: '30px 0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000' }}>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: cols }).map((_, colIndex) => {
                    if (!shouldRenderCell(rowIndex, colIndex)) {
                      return null;
                    }
                    
                    const actual = getActualCell(rowIndex, colIndex);
                    const rowSpan = actual.merged ? actual.info.rowspan : 1;
                    const colSpan = actual.merged ? actual.info.colspan : 1;
                    const cellValue = getCellValue(rowIndex, colIndex);
                    const rotated = isRotated(rowIndex, colIndex);
                    
                    return (
                      <td 
                        key={`${rowIndex}-${colIndex}`}
                        rowSpan={rowSpan}
                        colSpan={colSpan}
                        style={{
                          border: '1px solid #000',
                          padding: rotated ? '2px' : '8px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          ...(rotated && {
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            whiteSpace: 'nowrap',
                            height: '60px',
                            width: '40px'
                          })
                        }}
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          Таблица {block.number} — {block.caption}
        </div>
      </div>
    );
  };
  
  // Стили
  const styles = {
    app: { 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '40px 20px', 
      backgroundColor: '#f8f9fa', 
      fontFamily: 'Futura PT, -apple-system, BlinkMacSystemFont, sans-serif',
      minHeight: '100vh'
    },
    header: { 
      textAlign: 'center', 
      marginBottom: '40px', 
      fontSize: '36px', 
      fontWeight: 600,
      color: '#f39c12'
    },
    tabContainer: { 
      display: 'flex', 
      gap: '15px', 
      marginBottom: '40px', 
      justifyContent: 'center' 
    },
    tabButton: (isActive) => ({ 
      padding: '12px 30px', 
      backgroundColor: isActive ? '#f39c12' : 'white', 
      color: isActive ? 'white' : '#f39c12',
      border: '2px solid #f39c12',
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '16px',
      fontWeight: 500
    }),
    formGroup: { 
      marginBottom: '30px',
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '15px',
      boxShadow: '0 5px 20px rgba(243, 156, 18, 0.1)'
    },
    label: { 
      display: 'block', 
      marginBottom: '10px', 
      fontWeight: 500,
      fontSize: '16px',
      color: '#e67e22'
    },
    input: { 
      width: '100%', 
      padding: '12px 15px', 
      border: '2px solid #ffe6cc',
      borderRadius: '10px',
      fontSize: '15px',
      fontFamily: 'Futura PT, sans-serif'
    },
    textarea: { 
      width: '100%', 
      padding: '12px 15px', 
      border: '2px solid #ffe6cc',
      borderRadius: '10px',
      fontSize: '15px',
      fontFamily: 'Futura PT, sans-serif',
      resize: 'vertical',
      minHeight: '120px'
    },
    editorContainer: { 
      height: '300px', 
      marginBottom: '15px', 
      border: '2px solid #ffe6cc',
      borderRadius: '10px',
      overflow: 'hidden'
    },
    textControls: { 
      display: 'flex', 
      gap: '15px', 
      marginBottom: '20px', 
      flexWrap: 'wrap' 
    },
    addTextButton: { 
      padding: '12px 25px', 
      backgroundColor: '#27ae60', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '15px',
      fontWeight: 500
    },
    clearTextButton: { 
      padding: '12px 25px', 
      backgroundColor: '#95a5a6', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '15px',
      fontWeight: 500
    },
    updateButton: { 
      padding: '12px 25px', 
      backgroundColor: '#3498db', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '15px',
      fontWeight: 500
    },
    cancelButton: { 
      padding: '12px 25px', 
      backgroundColor: '#e74c3c', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '15px',
      fontWeight: 500
    },
    constructorsSection: { 
      marginTop: '50px', 
      padding: '30px', 
      backgroundColor: 'white',
      borderRadius: '15px',
      boxShadow: '0 5px 20px rgba(243, 156, 18, 0.1)'
    },
    sectionTitle: { 
      fontSize: '28px', 
      fontWeight: 500, 
      marginTop: 0, 
      marginBottom: '30px', 
      textAlign: 'center',
      color: '#e67e22'
    },
    constructorsGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(3, 1fr)', 
      gap: '25px', 
      marginBottom: '30px' 
    },
    constructorCard: { 
      padding: '25px', 
      backgroundColor: '#fff9f0',
      borderRadius: '15px',
      textAlign: 'center',
      border: '1px solid #ffe6cc'
    },
    cardTitle: { 
      fontSize: '20px', 
      fontWeight: 500, 
      marginBottom: '15px', 
      color: '#e67e22'
    },
    toggleButton: { 
      width: '100%', 
      padding: '12px', 
      backgroundColor: '#f39c12', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '15px',
      fontWeight: 500
    },
    contentBlocksSection: { 
      marginTop: '40px', 
      padding: '25px', 
      backgroundColor: 'white',
      borderRadius: '15px',
      boxShadow: '0 5px 20px rgba(243, 156, 18, 0.1)'
    },
    contentBlocksTitle: { 
      fontSize: '20px', 
      fontWeight: 500, 
      marginTop: 0, 
      marginBottom: '20px', 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      color: '#e67e22'
    },
    blockCounter: { 
      fontSize: '14px', 
      color: '#f39c12', 
      fontWeight: 500,
      backgroundColor: '#fff9f0',
      padding: '5px 12px',
      borderRadius: '20px'
    },
    contentBlock: (isDragged, isDragOver) => ({
      marginBottom: '20px',
      padding: '20px',
      border: isDragOver ? '3px dashed #f39c12' : '1px solid #ffe6cc',
      borderRadius: '12px',
      backgroundColor: isDragged ? '#fff9f0' : '#fff',
      opacity: isDragged ? 0.7 : 1,
      cursor: 'grab',
      transition: 'all 0.2s ease'
    }),
    blockHeader: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '15px', 
      paddingBottom: '10px', 
      borderBottom: '2px solid #fff0e0' 
    },
    blockType: { 
      fontWeight: 500,
      color: '#e67e22',
      fontSize: '16px'
    },
    blockActions: { 
      display: 'flex', 
      gap: '8px' 
    },
    moveButtons: { 
      display: 'flex', 
      gap: '5px', 
      marginRight: '10px' 
    },
    moveButton: { 
      padding: '6px 10px', 
      backgroundColor: '#95a5a6', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '6px',
      cursor: 'pointer', 
      fontSize: '12px'
    },
    editButton: { 
      padding: '6px 12px', 
      backgroundColor: '#3498db', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '6px',
      cursor: 'pointer', 
      fontSize: '12px'
    },
    deleteButton: { 
      padding: '6px 12px', 
      backgroundColor: '#e74c3c', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '6px',
      cursor: 'pointer', 
      fontSize: '12px'
    },
    mainButtons: { 
      display: 'flex', 
      gap: '20px', 
      marginTop: '40px', 
      marginBottom: '20px', 
      flexWrap: 'wrap' 
    },
    previewButton: { 
      flex: 2, 
      padding: '15px', 
      backgroundColor: '#fff', 
      color: '#f39c12',
      border: '2px solid #f39c12',
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '16px',
      fontWeight: 500
    },
    clearButton: { 
      flex: 1, 
      padding: '15px', 
      backgroundColor: '#e74c3c', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '16px',
      fontWeight: 500
    },
    submitButton: { 
      flex: 1, 
      padding: '15px', 
      backgroundColor: '#f39c12', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '16px',
      fontWeight: 500
    },
    saveButtons: { 
      display: 'flex', 
      gap: '15px', 
      marginTop: '30px', 
      flexWrap: 'wrap', 
      justifyContent: 'center' 
    },
    draftButton: { 
      padding: '12px 25px', 
      backgroundColor: '#f39c12', 
      color: '#fff', 
      border: 'none', 
      borderRadius: '30px',
      cursor: 'pointer', 
      fontSize: '15px',
      fontWeight: 500
    },
    previewContainer: { 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px',
      backgroundColor: 'white',
      borderRadius: '20px',
      boxShadow: '0 10px 30px rgba(243, 156, 18, 0.15)'
    },
    previewTitle: { 
      fontSize: '32px', 
      fontWeight: 500, 
      textAlign: 'center', 
      marginBottom: '30px', 
      color: '#e67e22'
    },
    previewSection: { 
      marginBottom: '30px' 
    },
    previewLabel: { 
      fontSize: '16px', 
      fontWeight: 500, 
      marginBottom: '10px',
      color: '#f39c12'
    },
    emptyState: { 
      textAlign: 'center', 
      padding: '60px', 
      color: '#999', 
      fontSize: '16px',
      backgroundColor: '#fff9f0',
      borderRadius: '15px'
    },
    dragHandle: { 
      display: 'inline-block', 
      marginRight: '15px', 
      color: '#f39c12',
      fontSize: '20px',
      cursor: 'grab'
    },
    saveMessage: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#f39c12',
      color: '#fff',
      padding: '15px 25px',
      borderRadius: '30px',
      fontSize: '15px',
      fontWeight: 500,
      zIndex: 2000,
      boxShadow: '0 5px 20px rgba(243, 156, 18, 0.3)'
    },
    authorInput: {
      display: 'flex',
      gap: '10px',
      marginBottom: '10px'
    },
    removeAuthor: {
      padding: '0 15px',
      backgroundColor: '#e74c3c',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '18px'
    },
    addAuthorBtn: {
      marginTop: '10px',
      padding: '8px 20px',
      backgroundColor: '#27ae60',
      color: '#fff',
      border: 'none',
      borderRadius: '20px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    fileInput: {
      width: '100%',
      padding: '10px',
      border: '2px solid #ffe6cc',
      borderRadius: '10px',
      fontSize: '14px'
    },
    loadingSpinner: {
      display: 'inline-block',
      width: '20px',
      height: '20px',
      border: '3px solid #ffe6cc',
      borderTop: '3px solid #f39c12',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '10px'
    },
    successMessage: {
      backgroundColor: '#27ae60',
      color: '#fff',
      padding: '15px',
      borderRadius: '10px',
      marginBottom: '20px',
      textAlign: 'center'
    },
    errorMessage: {
      color: '#e74c3c',
      fontSize: '12px',
      marginTop: '5px',
      display: 'block'
    }
  };
  
  // Добавляем анимацию
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
  
  return (
    <div style={styles.app}>
      {showSaveMessage && (
        <div style={styles.saveMessage}>{saveMessage}</div>
      )}
      
      {submitSuccess && (
        <div style={styles.successMessage}>
          ✅ Доклад успешно отправлен! Перенаправление...
        </div>
      )}
      
      <h1 style={styles.header}>Подача нового доклада</h1>
      
      <div style={styles.tabContainer}>
        <button style={styles.tabButton(!showPreview)} onClick={() => setShowPreview(false)}>
          ✏️ Редактор
        </button>
        <button style={styles.tabButton(showPreview)} onClick={() => setShowPreview(true)}>
          👁️ Предпросмотр
        </button>
      </div>
      
      {!showPreview ? (
        <form onSubmit={handleSubmit}>
          {/* Выбор конференции */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Конференция *</label>
            {loadingConferences ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={styles.loadingSpinner}></div>
                <span>Загрузка конференций...</span>
              </div>
            ) : conferences.length > 0 ? (
              <>
                <select
                  name="conferenceId"
                  value={formData.conferenceId}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={loading}
                >
                  <option value="">-- Выберите конференцию --</option>
                  {conferences.map(conf => (
                    <option key={conf.id} value={conf.id}>
                      {conf.name || conf.title || `Конференция #${conf.id}`}
                      {conf.start_date && ` (${formatDate(conf.start_date)})`}
                    </option>
                  ))}
                </select>
                {errors.conferenceId && <span style={styles.errorMessage}>{errors.conferenceId}</span>}
              </>
            ) : (
              <div>
                <p>Нет доступных конференций</p>
                <button type="button" onClick={fetchConferences}>Обновить</button>
              </div>
            )}
          </div>
          
          {/* Название доклада */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Название доклада *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              style={styles.input}
              disabled={loading}
              placeholder="Введите название доклада"
            />
            {errors.title && <span style={styles.errorMessage}>{errors.title}</span>}
          </div>
          
          {/* Авторы */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Авторы *</label>
            {formData.authors.map((author, index) => (
              <div key={index} style={styles.authorInput}>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => updateAuthor(index, e.target.value)}
                  placeholder={`Автор ${index + 1} (ФИО полностью)`}
                  style={styles.input}
                  disabled={loading}
                />
                {formData.authors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAuthor(index)}
                    style={styles.removeAuthor}
                    disabled={loading}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addAuthor} style={styles.addAuthorBtn} disabled={loading}>
              + Добавить соавтора
            </button>
            {errors.authors && <span style={styles.errorMessage}>{errors.authors}</span>}
          </div>
          
          {/* Аннотация */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Аннотация *</label>
            <textarea
              value={article.annotation}
              onChange={(e) => setArticle({...article, annotation: e.target.value})}
              rows="4"
              style={styles.textarea}
              placeholder="Краткое описание доклада (минимум 50 символов)"
              disabled={loading}
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
              {article.annotation.length}/500 символов
            </div>
            {errors.annotation && <span style={styles.errorMessage}>{errors.annotation}</span>}
          </div>
          
          {/* Ключевые слова */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Ключевые слова *</label>
            <input
              type="text"
              value={article.keywords}
              onChange={(e) => setArticle({...article, keywords: e.target.value})}
              style={styles.input}
              placeholder="например: AI, машинное обучение, нейросети"
              disabled={loading}
            />
            {errors.keywords && <span style={styles.errorMessage}>{errors.keywords}</span>}
          </div>
          
          {/* Текстовый редактор */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              {editingBlock?.type === 'text' ? '✏️ Редактирование текста' : '📝 Добавить текст'}
            </label>
            <div style={styles.editorContainer}>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={currentText}
                onChange={setCurrentText}
                modules={modules}
                formats={formats}
                placeholder="Напишите текст здесь..."
                style={{ height: '250px' }}
                readOnly={loading}
              />
            </div>
            <div style={styles.textControls}>
              {editingBlock?.type === 'text' ? (
                <>
                  <button type="button" style={styles.updateButton} onClick={updateTextBlock}>
                    💾 Сохранить изменения
                  </button>
                  <button type="button" style={styles.cancelButton} onClick={cancelEditing}>
                    ✕ Отмена
                  </button>
                </>
              ) : (
                <>
                  <button type="button" style={styles.addTextButton} onClick={insertTextBlock}>
                    + Добавить текст
                  </button>
                  <button type="button" style={styles.clearTextButton} onClick={clearTextField}>
                    🧹 Очистить поле
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Блоки контента */}
          {contentBlocks.length > 0 && (
            <div style={styles.contentBlocksSection}>
              <div style={styles.contentBlocksTitle}>
                <span>📄 Содержание статьи</span>
                <span style={styles.blockCounter}>Всего блоков: {contentBlocks.length}</span>
              </div>
              {contentBlocks.map((block, index) => {
                const isDragged = draggedBlockIndex === index;
                const isDragOver = dragOverBlockIndex === index;
                
                return (
                  <div
                    key={block.id}
                    style={styles.contentBlock(isDragged, isDragOver)}
                    draggable={!loading}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOver(index);
                    }}
                    onDragEnd={handleDragEnd}
                    onDragLeave={() => setDragOverBlockIndex(null)}
                  >
                    <div style={styles.blockHeader}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={styles.dragHandle}>⋮⋮</span>
                        <span style={styles.blockType}>
                          {block.type === 'text' ? '📝 Текст' :
                           block.type === 'table' ? '📊 Таблица' :
                           block.type === 'image' ? '🖼️ Рисунок' : '🧮 Формула'} • Блок {index + 1}
                          {editingBlock?.id === block.id && ' (ред.)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={styles.moveButtons}>
                          <button
                            type="button"
                            style={styles.moveButton}
                            onClick={() => moveBlockUp(index)}
                            disabled={index === 0 || loading}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            style={styles.moveButton}
                            onClick={() => moveBlockDown(index)}
                            disabled={index === contentBlocks.length - 1 || loading}
                          >
                            ↓
                          </button>
                        </div>
                        <div style={styles.blockActions}>
                          <button type="button" style={styles.editButton} onClick={(e) => openBlockForEditing(block, e)}>
                            ✏️
                          </button>
                          <button type="button" style={styles.deleteButton} onClick={(e) => deleteBlock(block.id, e)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {block.type === 'text' && (
                      <div style={{ maxHeight: '100px', overflow: 'hidden' }}>
                        <div dangerouslySetInnerHTML={{ __html: block.content.substring(0, 200) }} />
                        {block.content.length > 200 && <span>...</span>}
                      </div>
                    )}
                    
                    {block.type === 'table' && (
                      <div>
                        <div><strong>{block.caption}</strong></div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          Размер: {block.data?.length || 0} × {block.data?.[0]?.length || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                          Таблица {block.number}
                        </div>
                      </div>
                    )}
                    
                    {block.type === 'image' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img
                          src={block.src}
                          alt={block.caption}
                          style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <div>
                          <div><strong>{block.caption}</strong></div>
                          <div style={{ fontSize: '14px', color: '#666' }}>{block.width}px</div>
                        </div>
                      </div>
                    )}
                    
                    {block.type === 'formula' && (
                      <div>
                        <div><strong>Формула {block.number}</strong></div>
                        <div style={{
                          fontSize: '14px',
                          fontFamily: 'Times New Roman, serif',
                          padding: '10px',
                          backgroundColor: '#fff9f0',
                          borderRadius: '8px',
                          marginTop: '8px'
                        }}>
                          {block.formulaString || block.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Секция конструкторов */}
          <div style={styles.constructorsSection}>
            <h2 style={styles.sectionTitle}>Создание элементов</h2>
            <div style={styles.constructorsGrid}>
              <div style={styles.constructorCard}>
                <h3 style={styles.cardTitle}>📊 Таблица {tableCounter}</h3>
                <button 
                  type="button" 
                  style={styles.toggleButton} 
                  onClick={() => setIsTableManagerOpen(true)}
                >
                  Создать таблицу
                </button>
              </div>
              <div style={styles.constructorCard}>
                <h3 style={styles.cardTitle}>🖼️ Рисунок {imageCounter}</h3>
                <button 
                  type="button" 
                  style={styles.toggleButton} 
                  onClick={() => setIsImageManagerOpen(true)}
                >
                  Загрузить рисунок
                </button>
              </div>
              <div style={styles.constructorCard}>
                <h3 style={styles.cardTitle}>🧮 Формула {formulaCounter}</h3>
                <button 
                  type="button" 
                  style={styles.toggleButton} 
                  onClick={() => setIsFormulaManagerOpen(true)}
                >
                  Создать формулу
                </button>
              </div>
            </div>
          </div>
          
         
          {/* Дополнительная информация */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Дополнительная информация</label>
            <textarea
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              rows="3"
              style={styles.textarea}
              placeholder="Любая дополнительная информация для организаторов"
              disabled={loading}
            />
          </div>
          
          {/* Кнопки сохранения */}
          <div style={styles.saveButtons}>
            <button type="button" onClick={saveDraft} style={styles.draftButton}>
              💾 Сохранить черновик
            </button>
          </div>
          
          {/* Основные кнопки */}
          <div style={styles.mainButtons}>
            <button type="button" onClick={() => setShowPreview(true)} style={styles.previewButton}>
              👁️ Предпросмотр
            </button>
            <button type="button" onClick={() => {
              if (window.confirm('Очистить все поля?')) {
                setArticle({ annotation: '', keywords: '' });
                setContentBlocks([]);
                setCurrentText('');
                setTableCounter(1);
                setImageCounter(1);
                setFormulaCounter(1);
                setFormData({ title: '', conferenceId: '', authors: [''], additionalInfo: '' });
                setReportFile(null);
                setEditingBlock(null);
                localStorage.removeItem('articleDraft');
              }
            }} style={styles.clearButton}>
              ✖ Очистить
            </button>
            <button type="submit" style={styles.submitButton} disabled={loading || loadingConferences}>
              {loading ? 'Отправка...' : '📤 Отправить доклад'}
            </button>
          </div>
          
          {errors.content && <span style={styles.errorMessage}>{errors.content}</span>}
        </form>
      ) : (
        <div style={styles.previewContainer}>
          <h2 style={styles.previewTitle}>Научная статья</h2>
          
          <div style={styles.previewSection}>
            <div style={styles.previewLabel}>Авторы</div>
            <div>{formData.authors.filter(a => a.trim()).join(', ') || 'Не указаны'}</div>
          </div>
          
          <div style={styles.previewSection}>
            <div style={styles.previewLabel}>Аннотация</div>
            <div>{article.annotation || 'Аннотация отсутствует'}</div>
          </div>
          
          {article.keywords && (
            <div style={styles.previewSection}>
              <div style={styles.previewLabel}>Ключевые слова</div>
              <div>{article.keywords}</div>
            </div>
          )}
          
          <div style={styles.previewSection}>
            <div style={styles.previewLabel}>Содержание</div>
            <div>
              {contentBlocks.length > 0 ? (
                contentBlocks.map((block) => {
                  switch (block.type) {
                    case 'text':
                      return (
                        <div key={block.id} style={{ margin: '20px 0' }}>
                          <div dangerouslySetInnerHTML={{ __html: block.content }} />
                        </div>
                      );
                    case 'table':
                      return renderTableBlock(block);
                    case 'image':
                      return (
                        <div key={block.id} style={{ textAlign: block.align, margin: '30px 0' }}>
                          <img src={block.src} alt={block.caption} style={{ maxWidth: '100%', width: block.width }} />
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                            Рисунок {block.number} — {block.caption}
                          </div>
                        </div>
                      );
                    case 'formula':
                      return (
                        <div key={block.id} style={{ textAlign: block.align || 'center', margin: '30px 0', fontSize: block.size || 16 }}>
                          <strong>Формула {block.number}:</strong> {block.formulaString || block.content}
                        </div>
                      );
                    default:
                      return null;
                  }
                })
              ) : (
                <div style={styles.emptyState}>Содержание статьи пусто</div>
              )}
            </div>
          </div>
          
          {contentBlocks.length > 0 && (
            <div style={{ marginTop: '30px', padding: '20px', borderTop: '2px solid #fff0e0' }}>
              <strong>Статистика:</strong> Всего: {contentBlocks.length},
              Таблиц: {contentBlocks.filter(b => b.type === 'table').length},
              Рисунков: {contentBlocks.filter(b => b.type === 'image').length},
              Формул: {contentBlocks.filter(b => b.type === 'formula').length}
            </div>
          )}
          
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button onClick={() => setShowPreview(false)} style={styles.previewButton}>
              ← Вернуться к редактированию
            </button>
          </div>
        </div>
      )}
      
      {/* Модальные окна */}
      <TableManager
        isOpen={isTableManagerOpen}
        onClose={() => {
          setIsTableManagerOpen(false);
          if (editingBlock?.type === 'table') setEditingBlock(null);
        }}
        onSave={handleSaveTable}
        editingBlock={editingBlock?.type === 'table' ? editingBlock : null}
        tableCounter={tableCounter}
      />
      
      <ImageManager
        isOpen={isImageManagerOpen}
        onClose={() => {
          setIsImageManagerOpen(false);
          if (editingBlock?.type === 'image') setEditingBlock(null);
        }}
        onSave={handleSaveImage}
        editingBlock={editingBlock?.type === 'image' ? editingBlock : null}
        imageCounter={imageCounter}
      />
      
      <FormulaManager
        isOpen={isFormulaManagerOpen}
        onClose={() => {
          setIsFormulaManagerOpen(false);
          if (editingBlock?.type === 'formula') setEditingBlock(null);
        }}
        onSave={handleSaveFormula}
        editingBlock={editingBlock?.type === 'formula' ? editingBlock : null}
        formulaCounter={formulaCounter}
      />
    </div>
  );
};

export default SubmitReport;