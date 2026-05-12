// server/routes/conferenceStyles.js
const express = require('express');
const router = express.Router();

// Получить стили конференции
router.get('/api/conferences/:conferenceId/styles', async (req, res) => {
    const { conferenceId } = req.params;
    const db = req.app.get('db');
    
    try {
        const result = await db.query(
            'SELECT * FROM conference_styles WHERE conference_id = $1',
            [parseInt(conferenceId)]
        );
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                styles: null,
                message: 'Стили не найдены'
            });
        }
        
        res.json({
            success: true,
            styles: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка получения стилей:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Сохранить стили конференции
router.post('/api/conferences/:conferenceId/styles', async (req, res) => {
    const { conferenceId } = req.params;
    const styles = req.body;
    const db = req.app.get('db');
    
    console.log('POST /api/conferences/', conferenceId, '/styles');
    console.log('Получены стили:', styles);
    
    try {
        const conferenceIdInt = parseInt(conferenceId);
        
        // Проверяем, существуют ли уже стили
        const checkResult = await db.query(
            'SELECT id FROM conference_styles WHERE conference_id = $1',
            [conferenceIdInt]
        );
        
        let result;
        if (checkResult.rows.length === 0) {
            // Вставляем новые стили
            result = await db.query(
                `INSERT INTO conference_styles (conference_id, page_background, container_padding, font_family, title_font_size, title_font_weight, title_color, title_text_align, title_margin_bottom)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    conferenceIdInt,
                    styles.page_background || '#ffffff',
                    styles.container_padding || 40,
                    styles.font_family || 'Arial, sans-serif',
                    styles.title_font_size || 32,
                    styles.title_font_weight || '600',
                    styles.title_color || '#f39c12',
                    styles.title_text_align || 'center',
                    styles.title_margin_bottom || 30
                ]
            );
        } else {
            // Обновляем существующие стили
            result = await db.query(
                `UPDATE conference_styles SET
                    page_background = $1,
                    container_padding = $2,
                    font_family = $3,
                    title_font_size = $4,
                    title_font_weight = $5,
                    title_color = $6,
                    title_text_align = $7,
                    title_margin_bottom = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE conference_id = $9
                RETURNING *`,
                [
                    styles.page_background || '#ffffff',
                    styles.container_padding || 40,
                    styles.font_family || 'Arial, sans-serif',
                    styles.title_font_size || 32,
                    styles.title_font_weight || '600',
                    styles.title_color || '#f39c12',
                    styles.title_text_align || 'center',
                    styles.title_margin_bottom || 30,
                    conferenceIdInt
                ]
            );
        }
        
        res.json({
            success: true,
            message: 'Стили успешно сохранены',
            styles: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка сохранения стилей:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;