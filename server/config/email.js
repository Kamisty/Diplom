// config/email.js - ТЕСТОВАЯ ВЕРСИЯ (без реальной отправки)
async function sendResetCode(email, login, code) {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 КОД ДЛЯ СБРОСА ПАРОЛЯ (ТЕСТОВЫЙ РЕЖИМ)');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Пользователь: ${login}`);
    console.log(`🔑 Код подтверждения: ${code}`);
    console.log(`⏰ Действителен: 15 минут`);
    console.log('='.repeat(60) + '\n');
    
    // Всегда возвращаем true для тестирования
    return true;
}

module.exports = { sendResetCode };