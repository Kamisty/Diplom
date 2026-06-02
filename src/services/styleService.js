// src/services/styleService.js
const API_URL = process.env.REACT_APP_API_URL || 'https://diplom-j6uo.onrender.com/api';

export const styleService = {
    // Получить стили конференции
    async getConferenceStyles(conferenceId) {
        try {
            const response = await fetch(`${API_URL}/conferences/${conferenceId}/styles`);
            const data = await response.json();
            
            if (data.success && data.styles) {
                return data.styles;
            }
            return this.getDefaultStyles();
        } catch (error) {
            console.error('Ошибка загрузки стилей:', error);
            return this.getDefaultStyles();
        }
    },
    
    // Преобразовать стили из БД в CSS объект для React
    stylesToCSS(styles) {
        if (!styles) return {};
        
        return {
            container: {
                maxWidth: '1200px',
                margin: '0 auto',
                padding: `${styles.container_padding || 40}px`,
                backgroundColor: styles.page_background || '#ffffff',
                fontFamily: styles.font_family || 'Futura PT, -apple-system, BlinkMacSystemFont, sans-serif'
            },
            title: {
                fontSize: `${styles.title_font_size || 32}px`,
                fontWeight: styles.title_font_weight || '600',
                color: styles.title_color || '#f39c12',
                textAlign: styles.title_text_align || 'center',
                marginBottom: `${styles.title_margin_bottom || 30}px`
            },
            authors: {
                fontSize: `${styles.authors_font_size || 16}px`,
                fontWeight: styles.authors_font_weight || '400',
                color: styles.authors_color || '#e67e22',
                textAlign: styles.authors_text_align || 'center',
                marginBottom: `${styles.authors_margin_bottom || 20}px`
            },
            abstract: {
                fontSize: `${styles.abstract_font_size || 14}px`,
                fontWeight: styles.abstract_font_weight || '400',
                color: styles.abstract_color || '#333333',
                lineHeight: styles.abstract_line_height || 1.6,
                marginBottom: `${styles.abstract_margin_bottom || 30}px`
            },
            keywords: {
                fontSize: `${styles.keywords_font_size || 14}px`,
                fontWeight: styles.keywords_font_weight || '600',
                color: styles.keywords_color || '#e67e22',
                marginBottom: `${styles.keywords_margin_bottom || 30}px`
            },
            text: {
                fontSize: `${styles.text_font_size || 14}px`,
                lineHeight: styles.text_line_height || 1.6,
                color: styles.text_color || '#333333',
                marginBottom: `${styles.text_margin_bottom || 15}px`
            },
            image: {
                maxWidth: styles.image_max_width || '100%',
                marginTop: `${styles.image_margin_top || 20}px`,
                marginBottom: `${styles.image_margin_bottom || 20}px`
            },
            formula: {
                fontSize: `${styles.formula_font_size || 16}px`,
                color: styles.formula_color || '#333333',
                textAlign: styles.formula_text_align || 'center'
            },
            references: {
                fontSize: `${styles.references_font_size || 12}px`,
                lineHeight: styles.references_line_height || 1.4,
                color: styles.references_color || '#666666'
            }
        };
    },
    
    // Стили по умолчанию (если в БД нет)
    getDefaultStyles() {
        return {
            page_background: '#ffffff',
            container_padding: 40,
            font_family: 'Futura PT, -apple-system, BlinkMacSystemFont, sans-serif',
            title_font_size: 32,
            title_font_weight: '600',
            title_color: '#f39c12',
            title_text_align: 'center',
            title_margin_bottom: 30,
            authors_font_size: 16,
            authors_font_weight: '400',
            authors_color: '#e67e22',
            authors_text_align: 'center',
            authors_margin_bottom: 20,
            abstract_font_size: 14,
            abstract_font_weight: '400',
            abstract_color: '#333333',
            abstract_line_height: 1.6,
            abstract_margin_bottom: 30,
            keywords_font_size: 14,
            keywords_font_weight: '600',
            keywords_color: '#e67e22',
            keywords_margin_bottom: 30,
            text_font_size: 14,
            text_line_height: 1.6,
            text_color: '#333333',
            text_margin_bottom: 15,
            image_max_width: '100%',
            image_margin_top: 20,
            image_margin_bottom: 20,
            formula_font_size: 16,
            formula_color: '#333333',
            formula_text_align: 'center',
            references_font_size: 12,
            references_line_height: 1.4,
            references_color: '#666666'
        };
    }
};