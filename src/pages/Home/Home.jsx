import React from 'react';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      <div className="container">
        <h1>Добро пожаловать в сервис для организации конференций</h1>
        <div class="stroka">
        <p>Управляйте конференциями, докладами и участниками в одном месте</p>
        </div>
        <div className="features">
          <div className="feature-card">
            <h3>Регистрация участников</h3>
            <p>Простая система регистрации для всех ролей</p>
          </div>
          <div className="feature-card">
            <h3>Управление докладами</h3>
            <p>Организуйте и рецензируйте научные работы</p>
          </div>
          <div className="feature-card">
            <h3>Планирование секций</h3>
            <p>Создавайте расписание и управляйте секциями</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;