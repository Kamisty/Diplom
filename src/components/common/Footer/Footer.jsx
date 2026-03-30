// src/components/common/Footer.js
import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3> Конференция и сборник</h3>
            <p>Профессиональная система организации научных конференций</p>
          </div>
          
          <div className="footer-section">
            <h4>Контакты</h4>
            <p>Email: support@conferencepro.ru</p>
            <p>Телефон: +7 (999) 123-45-67</p>
          </div>
          
          <div className="footer-section">
            <h4>Быстрые ссылки</h4>
            <a href="#help">Помощь</a>
            <a href="#docs">Документация</a>
            <a href="#privacy">Политика конфиденциальности</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; Конференция и сборник. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;