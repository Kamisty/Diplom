// src/components/article/ImageManager.jsx
import React, { useState, useEffect } from 'react';

const ImageManager = ({ isOpen, onClose, onSave, editingBlock, imageCounter }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [align, setAlign] = useState('center');
  const [width, setWidth] = useState(400);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (editingBlock) {
      setImageUrl(editingBlock.src || '');
      setCaption(editingBlock.caption || '');
      setAlign(editingBlock.align || 'center');
      setWidth(editingBlock.width || 400);
      setPreviewUrl(editingBlock.src || '');
    } else {
      setImageUrl('');
      setCaption('');
      setAlign('center');
      setWidth(400);
      setPreviewUrl('');
    }
  }, [editingBlock]);

  const handleUrlChange = (url) => {
    setImageUrl(url);
    setPreviewUrl(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!imageUrl) {
      alert('❌ Введите URL изображения или загрузите файл');
      return;
    }

    const imageData = {
      src: imageUrl,
      caption: caption.trim() || `Рисунок ${editingBlock?.number || imageCounter}`,
      align: align,
      width: width
    };
    onSave(imageData);
    handleClose();
  };

  const handleClose = () => {
    setImageUrl('');
    setCaption('');
    setAlign('center');
    setWidth(400);
    setPreviewUrl('');
    onClose();
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: '#fff',
      padding: '25px',
      borderRadius: '12px',
      width: '550px',
      maxWidth: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '20px',
      textAlign: 'center',
      color: '#e67e22'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 'bold',
      color: '#333'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px'
    },
    fileInput: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px'
    },
    widthControl: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    rangeInput: {
      flex: 1,
      margin: '0 10px'
    },
    preview: {
      marginTop: '15px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      textAlign: align
    },
    previewLabel: {
      fontSize: '12px',
      color: '#999',
      marginBottom: '8px'
    },
    previewImage: {
      maxWidth: '100%',
      maxHeight: '150px',
      display: 'block',
      margin: '0 auto',
      borderRadius: '4px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px'
    },
    saveButton: {
      flex: 1,
      padding: '10px',
      backgroundColor: '#f39c12',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    cancelButton: {
      flex: 1,
      padding: '10px',
      backgroundColor: '#95a5a6',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>
          {editingBlock ? '✏️ Редактирование изображения' : '🖼️ Добавление изображения'}
        </h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>Загрузить файл:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={styles.fileInput}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Или URL изображения:</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Подпись:</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={`Подпись к рисунку ${editingBlock?.number || imageCounter}`}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Выравнивание:</label>
          <select value={align} onChange={(e) => setAlign(e.target.value)} style={styles.select}>
            <option value="left">По левому краю</option>
            <option value="center">По центру</option>
            <option value="right">По правому краю</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Ширина: {width}px</label>
          <div style={styles.widthControl}>
            <span>100px</span>
            <input
              type="range"
              min="100"
              max="800"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value))}
              style={styles.rangeInput}
            />
            <span>800px</span>
          </div>
        </div>

        {previewUrl && (
          <div style={styles.preview}>
            <div style={styles.previewLabel}>Предпросмотр:</div>
            <img src={previewUrl} alt={caption || 'Превью'} style={styles.previewImage} />
            {caption && <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', textAlign: 'center' }}>{caption}</div>}
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button onClick={handleSave} style={styles.saveButton}>
            {editingBlock ? '💾 Сохранить' : '➕ Добавить изображение'}
          </button>
          <button onClick={handleClose} style={styles.cancelButton}>
            ✕ Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageManager;