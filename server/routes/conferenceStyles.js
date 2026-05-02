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
                `INSERT INTO conference_styles (conference_id, page_background, container_padding, font_family, title_font_size, title_font_weight, title_color, title_text_align, title_margin_bottom, authors_font_size, authors_font_weight, authors_color, authors_text_align, authors_margin_bottom, abstract_font_size, abstract_font_weight, abstract_color, abstract_line_height, abstract_margin_bottom, text_font_size, text_line_height, text_color, text_margin_bottom)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
                    styles.title_margin_bottom || 30,
                    styles.authors_font_size || 16,
                    styles.authors_font_weight || '400',
                    styles.authors_color || '#e67e22',
                    styles.authors_text_align || 'center',
                    styles.authors_margin_bottom || 20,
                    styles.abstract_font_size || 14,
                    styles.abstract_font_weight || '400',
                    styles.abstract_color || '#333333',
                    styles.abstract_line_height || 1.6,
                    styles.abstract_margin_bottom || 30,
                    styles.text_font_size || 14,
                    styles.text_line_height || 1.6,
                    styles.text_color || '#333333',
                    styles.text_margin_bottom || 15
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
                    authors_font_size = $9,
                    authors_font_weight = $10,
                    authors_color = $11,
                    authors_text_align = $12,
                    authors_margin_bottom = $13,
                    abstract_font_size = $14,
                    abstract_font_weight = $15,
                    abstract_color = $16,
                    abstract_line_height = $17,
                    abstract_margin_bottom = $18,
                    text_font_size = $19,
                    text_line_height = $20,
                    text_color = $21,
                    text_margin_bottom = $22,
                    updated_at = CURRENT_TIMESTAMP
                WHERE conference_id = $23
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
                    styles.authors_font_size || 16,
                    styles.authors_font_weight || '400',
                    styles.authors_color || '#e67e22',
                    styles.authors_text_align || 'center',
                    styles.authors_margin_bottom || 20,
                    styles.abstract_font_size || 14,
                    styles.abstract_font_weight || '400',
                    styles.abstract_color || '#333333',
                    styles.abstract_line_height || 1.6,
                    styles.abstract_margin_bottom || 30,
                    styles.text_font_size || 14,
                    styles.text_line_height || 1.6,
                    styles.text_color || '#333333',
                    styles.text_margin_bottom || 15,
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