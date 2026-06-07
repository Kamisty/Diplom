import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext/Auth';
import './Admin.css';

const ReportAll = () => {
    const { user } = useContext(AuthContext);
    const [conferences, setConferences] = useState([]);
    const [filteredConferences, setFilteredConferences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedConferences, setExpandedConferences] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('default');
    const [draggedSection, setDraggedSection] = useState(null);
    const [draggedReport, setDraggedReport] = useState(null);
    
    const [showPreview, setShowPreview] = useState(false);
    const [previewConference, setPreviewConference] = useState(null);
    const [previewSections, setPreviewSections] = useState([]);
    const [previewStyles, setPreviewStyles] = useState({});
    const [isGenerating, setIsGenerating] = useState(false);

    // ========== ФУНКЦИЯ ФОРМАТИРОВАНИЯ ДАТЫ ==========
    const formatDate = (dateString) => {
        if (!dateString) return 'Дата не указана';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // ========== ЗАГРУЗКА ДАННЫХ ==========
    useEffect(() => {
        const fetchReports = async () => {
            let userId = null;
            
            if (user?.user_id) userId = user.user_id;
            else if (user?.id) userId = user.id;
            
            if (!userId) {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const localUser = JSON.parse(userStr);
                        userId = localUser?.user_id || localUser?.id;
                    } catch(e) {}
                }
            }
            
            if (!userId) {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) userId = storedUserId;
            }
            
            if (!userId) {
                console.error('Не удалось определить userId');
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                const response = await fetch(`https://diplom-j6uo.onrender.com/api/admin/conferences/accepted-reports/${userId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.conferences) {
                    // Загружаем полные данные для каждого доклада
                    const conferencesWithFullReports = await Promise.all(
                        data.conferences.map(async (conference) => {
                            const sectionsWithFullReports = await Promise.all(
                                (conference.sections || []).map(async (section) => {
                                    const reportsWithFullContent = await Promise.all(
                                        (section.reports || []).map(async (report) => {
                                            try {
                                                const versionResponse = await fetch(`https://diplom-j6uo.onrender.com/api/reports/${report.report_id}`);
                                                if (versionResponse.ok) {
                                                    const versionData = await versionResponse.json();
                                                    if (versionData.success && versionData.report) {
                                                        return {
                                                            ...report,
                                                            content: versionData.report.content,
                                                            literature: versionData.report.literature || report.literature,
                                                            keywords: versionData.report.keywords || report.keywords,
                                                            abstract: versionData.report.abstract || report.abstract,
                                                            title: versionData.report.title || report.title,
                                                            additional_info: versionData.report.additional_info || report.additional_info
                                                        };
                                                    }
                                                }
                                            } catch (err) {
                                                console.error(`Ошибка загрузки доклада ${report.report_id}:`, err);
                                            }
                                            return report;
                                        })
                                    );
                                    return { ...section, reports: reportsWithFullContent };
                                })
                            );
                            return { ...conference, sections: sectionsWithFullReports };
                        })
                    );
                    
                    setConferences(conferencesWithFullReports);
                    setFilteredConferences(conferencesWithFullReports);
                    
                    const initialExpandConf = {};
                    const initialExpandSect = {};
                    conferencesWithFullReports.forEach(conf => {
                        initialExpandConf[conf.id] = true;
                        initialExpandSect[conf.id] = {};
                        if (conf.sections) {
                            conf.sections.forEach(section => {
                                initialExpandSect[conf.id][section.id] = true;
                            });
                        }
                    });
                    setExpandedConferences(initialExpandConf);
                    setExpandedSections(initialExpandSect);
                } else {
                    setConferences([]);
                    setFilteredConferences([]);
                }
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                setConferences([]);
                setFilteredConferences([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchReports();
    }, [user]);

    // ========== ПОЛУЧЕНИЕ СТИЛЕЙ КОНФЕРЕНЦИИ ==========
    const fetchConferenceStyles = async (conferenceId) => {
        try {
            const response = await fetch(`https://diplom-j6uo.onrender.com/api/conferences/${conferenceId}/styles`);
            const data = await response.json();
            if (data.success && data.styles) {
                return data.styles;
            }
        } catch (error) {
            console.error('Ошибка загрузки стилей:', error);
        }
        return null;
    };

    // ========== ФИЛЬТРАЦИЯ И ПОИСК ==========
    const filterConferences = (query, filter) => {
        let filtered = [...conferences];
        
        if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(conf => 
                conf.title?.toLowerCase().includes(lowerQuery) ||
                conf.location?.toLowerCase().includes(lowerQuery)
            );
        }
        
        if (filter === 'hasReports') {
            filtered = filtered.filter(conf => {
                const reportsCount = conf.sections?.reduce(
                    (total, section) => total + (section.reports?.length || 0), 0
                ) || 0;
                return reportsCount > 0;
            });
        } else if (filter === 'noReports') {
            filtered = filtered.filter(conf => {
                const reportsCount = conf.sections?.reduce(
                    (total, section) => total + (section.reports?.length || 0), 0
                ) || 0;
                return reportsCount === 0;
            });
        }
        
        setFilteredConferences(filtered);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        filterConferences(query, searchFilter);
    };

    const handleFilterChange = (filter) => {
        setSearchFilter(filter);
        filterConferences(searchQuery, filter);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchFilter('all');
        setFilteredConferences(conferences);
    };

    // ========== СОРТИРОВКА ==========
    const sortReports = (reports, order) => {
        if (!reports) return [];
        if (order === 'alphabetical') {
            return [...reports].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
        }
        return reports;
    };

    const handleSortChange = (order) => {
        setSortOrder(order);
    };

    // ========== DRAG & DROP для секций ==========
    const handleSectionDragStart = (conferenceId, sectionIndex) => {
        setDraggedSection({ conferenceId, sectionIndex });
    };

    const handleSectionDragOver = (e) => {
        e.preventDefault();
    };

    const handleSectionDrop = (conferenceId, targetIndex) => {
        if (!draggedSection || draggedSection.conferenceId !== conferenceId) return;
        
        const newConferences = [...conferences];
        const conferenceIndex = newConferences.findIndex(c => c.id === conferenceId);
        const sections = [...newConferences[conferenceIndex].sections];
        const [draggedItem] = sections.splice(draggedSection.sectionIndex, 1);
        sections.splice(targetIndex, 0, draggedItem);
        newConferences[conferenceIndex].sections = sections;
        
        setConferences(newConferences);
        filterConferences(searchQuery, searchFilter);
        setDraggedSection(null);
    };

    // ========== DRAG & DROP для докладов ==========
    const handleReportDragStart = (conferenceId, sectionId, reportIndex) => {
        setDraggedReport({ conferenceId, sectionId, reportIndex });
    };

    const handleReportDragOver = (e) => {
        e.preventDefault();
    };

    const handleReportDrop = (conferenceId, sectionId, targetIndex) => {
        if (!draggedReport || 
            draggedReport.conferenceId !== conferenceId || 
            draggedReport.sectionId !== sectionId) return;
        
        const newConferences = [...conferences];
        const conferenceIndex = newConferences.findIndex(c => c.id === conferenceId);
        const sectionIndex = newConferences[conferenceIndex].sections.findIndex(s => s.id === sectionId);
        const reports = [...newConferences[conferenceIndex].sections[sectionIndex].reports];
        const [draggedItem] = reports.splice(draggedReport.reportIndex, 1);
        reports.splice(targetIndex, 0, draggedItem);
        newConferences[conferenceIndex].sections[sectionIndex].reports = reports;
        
        setConferences(newConferences);
        filterConferences(searchQuery, searchFilter);
        setDraggedReport(null);
    };

    // ========== ПРЕДПРОСМОТР ==========
    const openPreview = async (conference) => {
        const styles = await fetchConferenceStyles(conference.id);
        setPreviewStyles(styles || {});
        setPreviewConference(conference);
        setPreviewSections(conference.sections || []);
        setShowPreview(true);
    };

    const closePreview = () => {
        setShowPreview(false);
        setPreviewConference(null);
        setPreviewSections([]);
        setPreviewStyles({});
    };

    // ========== РАСКРЫТИЕ/СВЁРТЫВАНИЕ ==========
    const toggleConference = (conferenceId) => {
        setExpandedConferences(prev => ({
            ...prev,
            [conferenceId]: !prev[conferenceId]
        }));
    };

    const toggleSection = (conferenceId, sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [conferenceId]: {
                ...prev[conferenceId],
                [sectionId]: !prev[conferenceId]?.[sectionId]
            }
        }));
    };

    // ========== СТАТУСЫ ==========
    const getStatusText = (status) => {
        const statusMap = {
            'accepted': 'Принят',
            'pending': 'На рассмотрении',
            'submitted': 'На рассмотрении',
            'under_review': 'На рецензировании',
            'revision_required': 'Требуется доработка',
            'rejected': 'Отклонен',
            'withdrawn': 'Отозван'
        };
        return statusMap[status] || status;
    };

    const getStatusClass = (status) => {
        const classMap = {
            'accepted': 'status-approved',
            'pending': 'status-pending',
            'submitted': 'status-pending',
            'under_review': 'status-review',
            'revision_required': 'status-revision',
            'rejected': 'status-rejected',
            'withdrawn': 'status-withdrawn'
        };
        return classMap[status] || '';
    };

    // ========== ПОДСЧЁТ ДОКЛАДОВ ==========
    const getTotalAcceptedReports = () => {
        let total = 0;
        conferences.forEach(conference => {
            if (conference.sections) {
                conference.sections.forEach(section => {
                    total += section.reports?.length || 0;
                });
            }
        });
        return total;
    };

    const getConferenceReportsCount = (conference) => {
        return conference.sections?.reduce(
            (total, section) => total + (section.reports?.length || 0), 0
        ) || 0;
    };

    // ========== СТИЛИ ДЛЯ ПРЕДПРОСМОТРА ==========
    const getPreviewStyle = (styleName, defaultValue) => {
        if (previewStyles && previewStyles[styleName] !== undefined && previewStyles[styleName] !== null) {
            return previewStyles[styleName];
        }
        return defaultValue;
    };

    // ========== ГЕНЕРАЦИЯ DOCX (ИСПРАВЛЕННАЯ) ==========
const generateDOCX = async (conference, sections, styles) => {
    setIsGenerating(true);
    try {
        const docx = await import('docx');
        const { 
            Document, Packer, Paragraph, TextRun, 
            AlignmentType, PageBreak, HeadingLevel, 
            TableOfContents, ImageRun
        } = docx;

        // Функция загрузки изображения
        const fetchImageForDocx = async (src) => {
            try {
                let imageData = null;
                let mimeType = 'image/png';
                if (src && src.startsWith('data:image')) {
                    const matches = src.match(/^data:image\/(\w+);base64,(.+)$/);
                    if (matches) {
                        mimeType = `image/${matches[1]}`;
                        const binary = atob(matches[2]);
                        const arr = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                        return { data: arr, mime: mimeType };
                    }
                } else {
                    let fullUrl = src;
                    if (src.startsWith('/')) fullUrl = `https://diplom-j6uo.onrender.com${src}`;
                    else if (!src.startsWith('http')) fullUrl = `https://diplom-j6uo.onrender.com/${src}`;
                    const resp = await fetch(fullUrl);
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const blob = await resp.blob();
                    const buffer = await blob.arrayBuffer();
                    return { data: new Uint8Array(buffer), mime: blob.type || 'image/png' };
                }
            } catch (err) {
                console.error('Ошибка загрузки изображения:', src, err);
                return null;
            }
        };

        // Стили по умолчанию
        // Стили по умолчанию (УВЕЛИЧЕННЫЕ РАЗМЕРЫ)
const defaultStyles = {
    font_family: 'Times New Roman',
    title_font_size: 32,           // было 28 → 32
    title_font_weight: 'bold',
    title_color: '000000',
    title_text_align: 'center',
    title_margin_bottom: 40,
    authors_font_size: 18,          // было 14 → 18
    authors_font_weight: '400',
    authors_color: '333333',
    authors_text_align: 'center',
    authors_margin_bottom: 25,
    abstract_font_size: 14,         // было 12 → 14
    abstract_font_weight: '400',
    abstract_color: '333333',
    abstract_line_height: 1.6,
    abstract_margin_bottom: 40,
    keywords_font_size: 14,         // было 12 → 14
    keywords_font_weight: 'bold',
    keywords_color: 'e67e22',
    keywords_margin_bottom: 40,
    section_title_font_size: 28,    // было 24 → 28
    section_title_font_weight: 'bold',
    section_title_color: '000000',
    section_title_margin_top: 40,
    section_title_margin_bottom: 20,
    text_font_size: 14,             // было 12 → 14
    text_line_height: 1.6,
    text_color: '333333',
    text_margin_bottom: 20,
    table_border_color: '000000',
    table_header_bg: 'f8f9fa',
    table_cell_padding: 8,
    image_max_width: '100%',
    image_margin_top: 30,
    image_margin_bottom: 30,
    formula_font_size: 18,          // было 16 → 18
    formula_color: '333333',
    formula_text_align: 'center',
    references_font_size: 13,       // было 11 → 13
    references_line_height: 1.4,
    references_color: '666666',
    container_padding: 40,
    page_background: '#ffffff'
};
        
        const s = { ...defaultStyles, ...(styles || {}) };
        Object.keys(defaultStyles).forEach(key => {
            if (s[key] == null) s[key] = defaultStyles[key];
        });
        const hexToRgb = (color) => (!color ? '000000' : color.replace('#', ''));

        const docChildren = [];

        // ---- ТИТУЛЬНАЯ СТРАНИЦА (применены стили) ----
        docChildren.push(new Paragraph({
            children: [new TextRun({
                text: conference.title || '',
                bold: s.title_font_weight === 'bold',
                size: s.title_font_size * 2,
                font: s.font_family,
                color: hexToRgb(s.title_color)
            })],
            alignment: s.title_text_align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 400, after: s.title_margin_bottom * 2 }
        }));
        docChildren.push(new Paragraph({
            children: [new TextRun({ text: "СБОРНИК МАТЕРИАЛОВ", bold: true, size: 24, font: s.font_family })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }));
        docChildren.push(new Paragraph({
            children: [new TextRun({ text: conference.location || "Место проведения не указано", size: 20, font: s.font_family })],
            alignment: AlignmentType.CENTER
        }));
        docChildren.push(new Paragraph({
            children: [new TextRun({ text: formatDate(conference.start_date), size: 20, font: s.font_family })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }));
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));

        // ---- ОГЛАВЛЕНИЕ ----
        docChildren.push(new Paragraph({
            children: [new TextRun({ text: "СОДЕРЖАНИЕ", bold: true, size: 24, font: s.font_family, color: hexToRgb(s.title_color) })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }));
        docChildren.push(new TableOfContents("Оглавление", { hyperlink: true, headingStyleRange: "1-3" }));
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));

        // ---- ДОКЛАДЫ ----
        let reportCounter = 1;
        for (const section of sections) {
            // Заголовок секции – уровень 2 (применены стили)
            docChildren.push(new Paragraph({
                children: [new TextRun({
                    text: section.name || '',
                    bold: s.section_title_font_weight === 'bold',
                    size: s.section_title_font_size,
                    font: s.font_family,
                    color: hexToRgb(s.section_title_color)
                })],
                alignment: AlignmentType.CENTER,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: s.section_title_margin_top * 2, after: s.section_title_margin_bottom * 2 }
            }));
            
            for (const report of (section.reports || [])) {
                // Заголовок доклада – уровень 3 (применены стили)
                docChildren.push(new Paragraph({
                    children: [new TextRun({
                        text: `${reportCounter}. ${report.title || ''}`,
                        bold: true,
                        size: s.text_font_size + 2,
                        font: s.font_family,
                        color: hexToRgb(s.title_color)
                    })],
                    alignment: AlignmentType.CENTER,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 160, after: 80 }
                }));
                
                // Авторы (применены стили из БД)
                let authorsText = report.author_name || '';
                if (report.coauthors?.length) authorsText += `, ${report.coauthors.map(c => c.name).join(', ')}`;
                docChildren.push(new Paragraph({
                    children: [new TextRun({ text: authorsText, italics: true, size: s.authors_font_size, color: hexToRgb(s.authors_color), font: s.font_family })],
                    alignment: s.authors_text_align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
                    spacing: { after: s.authors_margin_bottom }
                }));
                
                // Аннотация (применены стили из БД)
                if (report.abstract) {
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: "Аннотация", bold: s.abstract_font_weight === 'bold', size: s.abstract_font_size + 2, color: hexToRgb(s.abstract_color), font: s.font_family })],
                        spacing: { after: 10 }
                    }));
                    // Разбиваем аннотацию на абзацы с отступами
                    const abstractLines = report.abstract.split(/\r?\n/);
                    for (const line of abstractLines) {
                        if (line.trim()) {
                            docChildren.push(new Paragraph({
                                children: [new TextRun({ text: line, size: s.abstract_font_size, color: hexToRgb(s.abstract_color), font: s.font_family })],
                                spacing: { after: 5 },
                                indent: { left: 720, right: 720, firstLine: 720 }
                            }));
                        } else {
                            docChildren.push(new Paragraph({ spacing: { after: 5 } }));
                        }
                    }
                    docChildren.push(new Paragraph({ spacing: { after: s.abstract_margin_bottom } }));
                }
                
                // Ключевые слова (применены стили из БД)
                if (report.keywords) {
                    docChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: "Ключевые слова: ", bold: s.keywords_font_weight === 'bold', size: s.keywords_font_size, color: hexToRgb(s.keywords_color), font: s.font_family }),
                            new TextRun({ text: report.keywords, italics: true, size: s.keywords_font_size, color: hexToRgb(s.keywords_color), font: s.font_family })
                        ],
                        spacing: { after: s.keywords_margin_bottom }
                    }));
                }
                
                // Контент (текст, таблицы, формулы, изображения)
                if (report.content && Array.isArray(report.content)) {
                    for (const block of report.content) {
                        // Текст (применены стили из БД)
                        if (block.type === 'text' && block.content) {
                            const plainText = block.content.replace(/<[^>]*>/g, '');
                            const paragraphs = plainText.split(/\r?\n/);
                            for (const para of paragraphs) {
                                if (para.trim()) {
                                    docChildren.push(new Paragraph({
                                        children: [new TextRun({ text: para, size: s.text_font_size, color: hexToRgb(s.text_color), font: s.font_family })],
                                        spacing: { after: s.text_margin_bottom },
                                        indent: { firstLine: 720 }
                                    }));
                                } else {
                                    docChildren.push(new Paragraph({ spacing: { after: s.text_margin_bottom } }));
                                }
                            }
                        }
                        // Таблица
                        if (block.type === 'table' && block.data) {
                            if (block.caption) {
                                docChildren.push(new Paragraph({
                                    children: [new TextRun({ text: `Таблица ${block.number || ''} — ${block.caption}`, italics: true, size: s.text_font_size - 2, font: s.font_family, color: hexToRgb(s.text_color) })],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { after: 10 }
                                }));
                            }
                            let tableText = '';
                            if (block.headers?.length) {
                                tableText += block.headers.join(' | ') + '\n';
                                tableText += block.headers.map(() => '---').join(' | ') + '\n';
                            }
                            for (const row of (block.data || [])) {
                                tableText += row.join(' | ') + '\n';
                            }
                            if (tableText.trim()) {
                                const tableLines = tableText.split('\n');
                                for (const line of tableLines) {
                                    if (line.trim()) {
                                        docChildren.push(new Paragraph({
                                            children: [new TextRun({ text: line, size: s.text_font_size - 2, font: "Courier New", color: hexToRgb(s.text_color) })],
                                            spacing: { after: 8 }
                                        }));
                                    }
                                }
                            }
                            docChildren.push(new Paragraph({ spacing: { after: 20 } }));
                        }
                        // Изображение
                        if (block.type === 'image' && block.src) {
                            try {
                                const img = await fetchImageForDocx(block.src);
                                if (img?.data?.length) {
                                    let imgWidth = 400;
                                    let imgHeight = 300;
                                    try {
                                        const blob = new Blob([img.data], { type: img.mime });
                                        const url = URL.createObjectURL(blob);
                                        const image = new Image();
                                        await new Promise((resolve, reject) => {
                                            image.onload = () => {
                                                const aspect = image.height / image.width;
                                                imgHeight = Math.round(imgWidth * aspect);
                                                URL.revokeObjectURL(url);
                                                resolve();
                                            };
                                            image.onerror = () => {
                                                URL.revokeObjectURL(url);
                                                reject(new Error('Не удалось загрузить изображение'));
                                            };
                                            image.src = url;
                                        });
                                    } catch (err) {
                                        console.warn('Не удалось вычислить пропорции, используется высота 300', err);
                                        imgHeight = 300;
                                    }
                                    const imageRun = new ImageRun({
                                        data: img.data,
                                        transformation: { width: imgWidth, height: imgHeight },
                                        type: img.mime
                                    });
                                    docChildren.push(new Paragraph({
                                        children: [imageRun],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: s.image_margin_top, after: s.image_margin_bottom / 2 }
                                    }));
                                    if (block.caption) {
                                        docChildren.push(new Paragraph({
                                            children: [new TextRun({ text: `Рисунок ${block.number || ''} — ${block.caption}`, italics: true, size: s.text_font_size - 2, font: s.font_family, color: hexToRgb(s.text_color) })],
                                            alignment: AlignmentType.CENTER,
                                            spacing: { before: 5, after: s.image_margin_bottom / 2 }
                                        }));
                                    }
                                } else {
                                    docChildren.push(new Paragraph({
                                        children: [new TextRun({ text: `[Изображение не загружено: ${block.caption || block.src}]`, size: s.text_font_size - 2, italics: true, color: '888888' })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 20 }
                                    }));
                                }
                            } catch (err) {
                                console.error('Ошибка вставки изображения:', err);
                                docChildren.push(new Paragraph({
                                    children: [new TextRun({ text: `[Ошибка вставки изображения]`, size: s.text_font_size - 2, italics: true, color: 'red' })],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { after: 20 }
                                }));
                            }
                        }
                        // Формула
                        if (block.type === 'formula' && block.formulaString) {
                            docChildren.push(new Paragraph({
                                children: [new TextRun({ text: `Формула ${block.number || ''}: ${block.formulaString}`, italics: true, size: s.formula_font_size, color: hexToRgb(s.formula_color), font: s.font_family })],
                                alignment: s.formula_text_align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
                                spacing: { after: 20 }
                            }));
                        }
                    }
                }
                
                // Дополнительная информация
                if (report.additional_info) {
                    const lines = report.additional_info.split(/\r?\n/);
                    for (const line of lines) {
                        if (line.trim()) {
                            docChildren.push(new Paragraph({
                                children: [new TextRun({ text: line, size: s.text_font_size - 2, italics: true, color: hexToRgb(s.text_color), font: s.font_family })],
                                spacing: { after: 10 }
                            }));
                        } else {
                            docChildren.push(new Paragraph({ spacing: { after: 10 } }));
                        }
                    }
                }
                
                // СПИСОК ЛИТЕРАТУРЫ (применены стили из БД)
                let literatureText = report.literature || '';
                if (Array.isArray(literatureText)) literatureText = literatureText.join('\n');
                if (typeof literatureText === 'object') literatureText = JSON.stringify(literatureText, null, 2);
                if (literatureText.trim()) {
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: "Список литературы", bold: true, size: s.references_font_size + 2, color: hexToRgb(s.references_color), font: s.font_family })],
                        spacing: { before: 60, after: 20 }
                    }));
                    const items = literatureText.split(/\r?\n/);
                    let litNum = 1;
                    for (const item of items) {
                        if (item.trim()) {
                            docChildren.push(new Paragraph({
                                children: [
                                    new TextRun({ text: `${litNum}. `, size: s.references_font_size, color: hexToRgb(s.references_color), font: s.font_family }),
                                    new TextRun({ text: item.trim(), size: s.references_font_size, color: hexToRgb(s.references_color), font: s.font_family })
                                ],
                                spacing: { after: 8 },
                                indent: { hanging: 360 }
                            }));
                            litNum++;
                        }
                    }
                }
                
                docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                reportCounter++;
            }
        }
        
        const doc = new Document({
            styles: {
                default: {
                    document: { run: { font: s.font_family } }
                }
            },
            sections: [{
                properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
                children: docChildren
            }]
        });
        
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(conference.title || 'conference').replace(/[^а-яА-Яa-zA-Z0-9]/g, '_')}_сборник_материалов.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Ошибка генерации DOCX:', error);
        alert('Ошибка при формировании сборника DOCX: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        setIsGenerating(false);
    }
};
    // ========== УСЛОВНЫЙ РЕНДЕРИНГ ==========
    if (loading) {
        return <div className="section-reports-loading">Загрузка принятых докладов...</div>;
    }

    if (conferences.length === 0) {
        return (
            <div className="section-reports-empty">
                <h2>Принятые доклады</h2>
                <p>У вас пока нет принятых докладов в конференциях, где вы являетесь администратором.</p>
            </div>
        );
    }

    const totalReports = getTotalAcceptedReports();

    return (
        <>
            <div className="accepted-reports-page">
                <div className="container">
                    <div className="page-header">
                        <h1>Принятые доклады</h1>
                        <p>Добро пожаловать, {user?.name || user?.login}!</p>
                        {totalReports > 0 && (
                            <div className="total-count">Всего принятых докладов: {totalReports}</div>
                        )}
                    </div>

                    <div className="search-section">
                        <div className="search-container">
                            <div className="search-input-wrapper">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Поиск конференции по названию или месту проведения..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                                {searchQuery && (
                                    <button className="search-clear" onClick={clearSearch}>✕</button>
                                )}
                            </div>
                            
                            <div className="filter-buttons">
                                <button className={`filter-btn ${searchFilter === 'all' ? 'active' : ''}`} onClick={() => handleFilterChange('all')}>Все конференции</button>
                                <button className={`filter-btn ${searchFilter === 'hasReports' ? 'active' : ''}`} onClick={() => handleFilterChange('hasReports')}>С докладами</button>
                                <button className={`filter-btn ${searchFilter === 'noReports' ? 'active' : ''}`} onClick={() => handleFilterChange('noReports')}>Без докладов</button>
                            </div>
                        </div>
                        
                        {searchQuery && (
                            <div className="search-results-info">
                                Найдено конференций: {filteredConferences.length}
                                <button className="clear-search-btn" onClick={clearSearch}>Очистить поиск</button>
                            </div>
                        )}
                    </div>

                    {filteredConferences.length === 0 && (
                        <div className="no-search-results">
                            <p>По вашему запросу "{searchQuery}" ничего не найдено</p>
                            <button onClick={clearSearch} className="reset-search-btn">Показать все конференции</button>
                        </div>
                    )}

                    {filteredConferences.map((conference) => {
                        const conferenceReportsCount = getConferenceReportsCount(conference);
                        
                        return (
                            <div key={conference.id} className="conference-block">
                                <div className="conference-header" onClick={() => toggleConference(conference.id)}>
                                    <div className="conference-header-left">
                                        <span className="expand-icon">{expandedConferences[conference.id] ? '▼' : '▶'}</span>
                                        <h2>{conference.title}</h2>
                                    </div>
                                    <div className="conference-meta">
                                        <span className="conference-date">{formatDate(conference.start_date)}{conference.end_date && ` - ${formatDate(conference.end_date)}`}</span>
                                        {conferenceReportsCount > 0 && (<span className="reports-count">Принято: {conferenceReportsCount}</span>)}
                                    </div>
                                </div>

                                {expandedConferences[conference.id] && (
                                    <div className="conference-content">
                                        <div className="control-panels">
                                            <div className="sort-panel">
                                                <span>Сортировка докладов:</span>
                                                <button className={`sort-btn ${sortOrder === 'default' ? 'active' : ''}`} onClick={() => handleSortChange('default')}>Порядок из БД</button>
                                                <button className={`sort-btn ${sortOrder === 'alphabetical' ? 'active' : ''}`} onClick={() => handleSortChange('alphabetical')}>По алфавиту (А-Я)</button>
                                            </div>
                                            <div className="proceedings-panel">
                                                <button className="preview-btn" onClick={() => openPreview(conference)} disabled={conferenceReportsCount === 0}>👁️ Предпросмотр сборника</button>
                                                <button className="generate-docx-btn" onClick={async () => { const styles = await fetchConferenceStyles(conference.id); generateDOCX(conference, conference.sections || [], styles); }} disabled={conferenceReportsCount === 0 || isGenerating}>{isGenerating ? '⏳ Генерация...' : '📝 Скачать DOCX'}</button>
                                                {conferenceReportsCount === 0 && (<span className="no-reports-hint">Нет принятых докладов</span>)}
                                            </div>
                                        </div>

                                        {!conference.sections || conference.sections.length === 0 ? (
                                            <div className="no-sections"><p>В этой конференции нет секций</p></div>
                                        ) : (
                                            conference.sections.map((section, sectionIndex) => {
                                                const displayReports = sortReports(section.reports, sortOrder);
                                                return (
                                                    <div key={section.id} className="section-block" draggable onDragStart={() => handleSectionDragStart(conference.id, sectionIndex)} onDragOver={handleSectionDragOver} onDrop={() => handleSectionDrop(conference.id, sectionIndex)}>
                                                        <div className="section-header" onClick={() => toggleSection(conference.id, section.id)}>
                                                            <span className="drag-handle-section">⋮⋮</span>
                                                            <span className="expand-icon">{expandedSections[conference.id]?.[section.id] ? '▼' : '▶'}</span>
                                                            <h3>{section.name}</h3>
                                                            {section.head_name && (<span className="section-head">Руководитель: {section.head_name}</span>)}
                                                            <span className="section-reports-count">{section.reports?.length || 0} докл.</span>
                                                        </div>
                                                        {expandedSections[conference.id]?.[section.id] && (
                                                            <div className="section-content">
                                                                {!section.reports || section.reports.length === 0 ? (
                                                                    <div className="no-reports"><p>В этой секции пока нет принятых докладов</p></div>
                                                                ) : (
                                                                    <div className="reports-grid">
                                                                        {displayReports.map((report, reportIndex) => (
                                                                            <div key={report.report_id} className="report-card accepted" draggable onDragStart={() => handleReportDragStart(conference.id, section.id, reportIndex)} onDragOver={handleReportDragOver} onDrop={() => handleReportDrop(conference.id, section.id, reportIndex)}>
                                                                                <div className="report-card-header">
                                                                                    <span className="drag-handle-report">⋮⋮</span>
                                                                                    <h4>{report.title}</h4>
                                                                                    <span className={`status-badge ${getStatusClass(report.status)}`}>{getStatusText(report.status)}</span>
                                                                                </div>
                                                                                <div className="report-card-info">
                                                                                    <div className="info-row"><span className="info-label">Автор:</span><span className="info-value">{report.author_name || 'Не указан'}</span></div>
                                                                                    {report.coauthors && report.coauthors.length > 0 && (<div className="info-row"><span className="info-label">Соавторы:</span><span className="info-value">{report.coauthors.map(c => c.name).join(', ')}</span></div>)}
                                                                                    {report.abstract && (<div className="info-row"><span className="info-label">Аннотация:</span><span className="info-value abstract">{report.abstract.length > 200 ? `${report.abstract.substring(0, 200)}...` : report.abstract}</span></div>)}
                                                                                    {report.keywords && (<div className="info-row"><span className="info-label">Ключевые слова:</span><span className="info-value">{report.keywords}</span></div>)}
                                                                                    <div className="info-row"><span className="info-label">Дата подачи:</span><span className="info-value">{formatDate(report.submitted_at || report.created_at)}</span></div>
                                                                                </div>
                                                                                <div className="report-card-actions"><button className="btn-view" onClick={() => window.open(`/report/${report.report_id}`, '_blank')}>📄 Просмотреть статью</button></div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* МОДАЛЬНОЕ ОКНО ПРЕДПРОСМОТРА */}
            {showPreview && previewConference && (
                <div className="preview-modal-overlay" onClick={closePreview}>
                    <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-modal-header">
                            <h2>Предпросмотр сборника</h2>
                            <button className="close-modal-btn" onClick={closePreview}>✕</button>
                        </div>
                        <div className="preview-modal-content" style={{ backgroundColor: getPreviewStyle('page_background', '#ffffff'), padding: `${getPreviewStyle('container_padding', 40)}px`, fontFamily: getPreviewStyle('font_family', 'Times New Roman, serif') }}>
                            <div className="preview-title-page">
                                <div className="preview-title-page-content">
                                    <h1 style={{ fontSize: `${getPreviewStyle('title_font_size', 32)}px`, fontWeight: getPreviewStyle('title_font_weight', 'bold'), color: getPreviewStyle('title_color', '#000000'), textAlign: getPreviewStyle('title_text_align', 'center'), marginBottom: `${getPreviewStyle('title_margin_bottom', 30)}px` }}>{previewConference.title}</h1>
                                    <h3>СБОРНИК МАТЕРИАЛОВ</h3>
                                    <p>{previewConference.location || 'Место проведения не указано'}</p>
                                    <p>{formatDate(previewConference.start_date)}</p>
                                </div>
                            </div>
                            <div className="page-break"></div>
                            <div className="preview-toc">
                                <h2>СОДЕРЖАНИЕ</h2>
                                <div className="preview-toc-list">
                                    {previewSections.map((section, sIdx) => (
                                        <div key={section.id} className="preview-toc-section">
                                            <div className="preview-toc-section-title">{sIdx + 1}. {section.name}</div>
                                            <div className="preview-toc-reports">{(section.reports || []).map((report, rIdx) => (<div key={report.report_id} className="preview-toc-report">{sIdx + 1}.{rIdx + 1} {report.title}<span className="preview-toc-authors">{report.author_name}{report.coauthors?.length > 0 && ` и др.`}</span></div>))}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                                                    </div>
                        <div className="preview-modal-footer">
                            <button className="preview-close-btn" onClick={closePreview}>Закрыть</button>
                            <button className="preview-generate-docx-btn" onClick={async () => { const styles = await fetchConferenceStyles(previewConference.id); generateDOCX(previewConference, previewSections, styles); closePreview(); }}>📝 Скачать DOCX</button>
                        </div>
                    </div> 
                </div>     
            )}             
        </>               
    );                    
};                    


export default ReportAll;