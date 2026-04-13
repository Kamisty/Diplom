// src/components/TemplatedReportViewer.js
import React from 'react';

const TemplatedReportViewer = ({ report, template }) => {
  const styles = template?.styles || {};
  const rules = template?.rules || {};
  
  // Применяем стили шаблона к контенту
  const applyStyles = (element, styleKey) => {
    const elementStyles = styles[styleKey] || {};
    return { ...element, style: elementStyles };
  };
  
  const renderAuthors = () => {
    if (!report.all_authors) return null;
    
    let authorsString = '';
    if (rules.authorFormat === 'lastname_initials') {
      authorsString = report.all_authors.map(a => {
        const parts = a.name.split(' ');
        if (parts.length >= 2) {
          return `${parts[0]} ${parts[1].charAt(0)}.${parts[2] ? parts[2].charAt(0) + '.' : ''}`;
        }
        return a.name;
      }).join(', ');
    } else {
      authorsString = report.all_authors.map(a => a.name).join(', ');
    }
    
    return <div style={styles.authors}>{authorsString}</div>;
  };
  
  return (
    <div className="templated-report" style={{
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px'
    }}>
      <h1 style={styles.title}>{report.title}</h1>
      {renderAuthors()}
      
      {report.affiliations && (
        <div style={styles.affiliation}>{report.affiliations}</div>
      )}
      
      <div className="abstract-section">
        <h3 style={styles.sectionTitle}>Аннотация</h3>
        <p style={styles.abstract}>{report.abstract}</p>
      </div>
      
      <div className="keywords-section">
        <h3 style={styles.sectionTitle}>Ключевые слова</h3>
        <p style={styles.keywords}>{report.keywords}</p>
      </div>
      
      <div className="content-section">
        <h3 style={styles.sectionTitle}>Содержание</h3>
        {report.content?.map((block, idx) => {
          if (block.type === 'text') {
            return <div key={idx} dangerouslySetInnerHTML={{ __html: block.content }} />;
          }
          if (block.type === 'table') {
            return (
              <div key={idx} className="table-wrapper">
                <div style={styles.tableCaption}>
                  Таблица {block.number} — {block.caption}
                  {report.language !== 'russian' && ` (${block.captionEnglish})`}
                </div>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      {block.headers?.map((header, i) => (
                        <th key={i} style={{ border: '1px solid black', padding: '8px' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.data?.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ border: '1px solid black', padding: '8px' }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          if (block.type === 'image') {
            return (
              <div key={idx} className="image-wrapper" style={{ textAlign: block.align || 'center' }}>
                <img src={block.src} alt={block.caption} style={{ maxWidth: '100%' }} />
                <div style={styles.figureCaption}>
                  Рисунок {block.number} — {block.caption}
                  {block.source && <span> ({block.source})</span>}
                </div>
              </div>
            );
          }
          if (block.type === 'formula') {
            return (
              <div key={idx} className="formula-wrapper" style={{ textAlign: 'center', margin: '15px 0' }}>
                <div style={styles.formula}>
                  {block.formulaString || block.content}
                  {block.number && <span style={{ marginLeft: '15px' }}>({block.number})</span>}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
      
      {report.literature && (
        <div className="references-section">
          <h3 style={styles.sectionTitle}>Список литературы</h3>
          <div style={styles.references}>
            {report.literature.split('\n').map((ref, idx) => (
              <p key={idx} style={{ margin: '5px 0' }}>{ref}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatedReportViewer;