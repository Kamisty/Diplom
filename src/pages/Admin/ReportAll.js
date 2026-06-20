import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext/Auth';
import './Admin.css';

import katex from 'katex';
import 'katex/dist/katex.min.css';


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
    console.log('📍 DOCX Conference location:', conference.location);
    setIsGenerating(true);
    try {
         const { 
            Document, Packer, Paragraph, TextRun, 
            AlignmentType, PageBreak, HeadingLevel, 
            TableOfContents, ImageRun,
            Table, TableRow, TableCell, WidthType, BorderStyle,
            Header, Footer, PageNumber 
        } = await import('docx');
        const fetchImageForDocx = async (src) => {
            try {
                if (src && src.startsWith('data:image')) {
                    const matches = src.match(/^data:image\/(\w+);base64,(.+)$/);
                    if (matches) {
                        const mimeType = `image/${matches[1]}`;
                        const binary = atob(matches[2]);
                        const arr = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                        return { data: arr, mime: mimeType };
                    }
                } else if (src) {
                    let fullUrl = src;
                    if (src.startsWith('/')) {
                        fullUrl = `https://diplom-j6uo.onrender.com${src}`;
                    } else if (!src.startsWith('http')) {
                        fullUrl = `https://diplom-j6uo.onrender.com/${src}`;
                    }
                    const resp = await fetch(fullUrl);
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const blob = await resp.blob();
                    const buffer = await blob.arrayBuffer();
                    return { data: new Uint8Array(buffer), mime: blob.type || 'image/png' };
                }
                return null;
            } catch (err) {
                console.error('Ошибка загрузки изображения:', src, err);
                return null;
            }
        };

        const htmlToStructuredContent = (html) => {
            if (!html) return [];
            const result = [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const processNode = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    if (text && text.trim()) return text;
                    return '';
                }
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tagName = node.tagName.toLowerCase();
                    if (tagName === 'p') {
                        let text = '';
                        for (const child of node.childNodes) text += processNode(child);
                        if (text.trim()) result.push({ type: 'paragraph', content: text.trim() });
                        return '';
                    }
                    if (tagName.match(/^h[1-6]$/)) {
                        let text = '';
                        for (const child of node.childNodes) text += processNode(child);
                        if (text.trim()) result.push({ type: 'heading', level: parseInt(tagName[1]), content: text.trim() });
                        return '';
                    }
                    if (tagName === 'ul') {
                        for (const li of node.children) {
                            if (li.tagName.toLowerCase() === 'li') {
                                let text = '';
                                for (const child of li.childNodes) text += processNode(child);
                                if (text.trim()) result.push({ type: 'listItem', bullet: '•', content: text.trim(), listType: 'bullet' });
                            }
                        }
                        return '';
                    }
                    if (tagName === 'ol') {
                        let counter = 1;
                        for (const li of node.children) {
                            if (li.tagName.toLowerCase() === 'li') {
                                let text = '';
                                for (const child of li.childNodes) text += processNode(child);
                                if (text.trim()) {
                                    result.push({ type: 'listItem', bullet: `${counter}.`, content: text.trim(), listType: 'numbered' });
                                    counter++;
                                }
                            }
                        }
                        return '';
                    }
                    if (tagName === 'br') return '\n';
                    let text = '';
                    for (const child of node.childNodes) text += processNode(child);
                    return text;
                }
                return '';
            };
            
            for (const child of doc.body.childNodes) processNode(child);
            
            if (result.length === 0) {
                const plainText = html.replace(/<[^>]*>/g, '').trim();
                if (plainText) {
                    const paragraphs = plainText.split(/\n\s*\n/);
                    for (const para of paragraphs) {
                        if (para.trim()) result.push({ type: 'paragraph', content: para.trim() });
                    }
                }
            }
            return result;
        };

        const formatLatexToText = (latex) => {
            if (!latex) return '';
            let result = latex;
            result = result.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '√[$1]($2)');
            result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
            result = result.replace(/\\iiint/g, '∭');
            result = result.replace(/\\iint/g, '∬');
            result = result.replace(/\\int/g, '∫');
            result = result.replace(/_\{([^}]+)\}/g, '₍$1₎');
            result = result.replace(/\^\{([^}]+)\}/g, '⁽$1⁾');
            result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
            result = result.replace(/\\alpha/g, 'α');
            result = result.replace(/\\beta/g, 'β');
            result = result.replace(/\\gamma/g, 'γ');
            result = result.replace(/\\delta/g, 'δ');
            result = result.replace(/\\epsilon/g, 'ε');
            result = result.replace(/\\pi/g, 'π');
            result = result.replace(/\\sigma/g, 'σ');
            result = result.replace(/\\omega/g, 'ω');
            result = result.replace(/\\infty/g, '∞');
            result = result.replace(/\\times/g, '×');
            result = result.replace(/\\div/g, '÷');
            result = result.replace(/\\pm/g, '±');
            result = result.replace(/\\le/g, '≤');
            result = result.replace(/\\ge/g, '≥');
            result = result.replace(/\\neq/g, '≠');
            result = result.replace(/\\approx/g, '≈');
            result = result.replace(/\\sum/g, 'Σ');
            result = result.replace(/\\prod/g, 'Π');
            result = result.replace(/\\[a-zA-Z]+/g, '');
            result = result.replace(/[{}]/g, '');
            return result;
        };

        const defaultStyles = {
            font_family: 'Times New Roman',
            title_font_size: 32,
            title_font_weight: 'bold',
            title_color: '000000',
            title_text_align: 'center',
            title_margin_bottom: 40,
            authors_font_size: 18,
            authors_font_weight: '400',
            authors_color: '333333',
            authors_text_align: 'center',
            authors_margin_bottom: 25,
            abstract_font_size: 14,
            abstract_font_weight: '400',
            abstract_color: '333333',
            abstract_margin_bottom: 40,
            keywords_font_size: 14,
            keywords_font_weight: 'bold',
            keywords_color: 'e67e22',
            keywords_margin_bottom: 40,
            section_title_font_size: 28,
            section_title_font_weight: 'bold',
            section_title_color: '000000',
            section_title_margin_top: 40,
            section_title_margin_bottom: 20,
            text_font_size: 14,
            text_color: '333333',
            text_margin_bottom: 20,
            formula_font_size: 16,
            formula_color: '333333',
            formula_text_align: 'center',
            references_font_size: 13,
            references_color: '666666',
            image_margin_top: 30,
            image_margin_bottom: 30,
            table_border_color: '000000',
            table_header_bg: 'f0f0f0',
            table_cell_padding: 8
        };

        const safeNumber = (value, defaultValue) => {
            if (value === null || value === undefined || value === '') return defaultValue;
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
        };

        const safeString = (value, defaultValue) => {
            if (value === undefined || value === null) return defaultValue;
            return String(value);
        };

        const s = { ...defaultStyles };
        if (styles) {
            Object.keys(defaultStyles).forEach(key => {
                if (styles[key] !== undefined && styles[key] !== null) {
                    const defaultValue = defaultStyles[key];
                    if (typeof defaultValue === 'number') {
                        s[key] = safeNumber(styles[key], defaultValue);
                    } else {
                        s[key] = safeString(styles[key], defaultValue);
                    }
                }
            });
        }

        // ВАЖНО: УМНОЖАЕМ НА 2, так как docx использует полупункты (half-points)
        // 1 пункт в Word = 2 полупункта в коде
        const titleFontSize = safeNumber(s.title_font_size, 32) * 2;
        const titleMarginBottom = safeNumber(s.title_margin_bottom, 40);
        const titleColor = safeString(s.title_color, '000000').replace('#', '');
        const titleTextAlign = safeString(s.title_text_align, 'center');
        const titleFontWeight = safeString(s.title_font_weight, 'bold');

        const authorsFontSize = safeNumber(s.authors_font_size, 18) * 2;
        const authorsMarginBottom = safeNumber(s.authors_margin_bottom, 25);
        const authorsColor = safeString(s.authors_color, '333333').replace('#', '');
        const authorsTextAlign = safeString(s.authors_text_align, 'center');

        const abstractFontSize = safeNumber(s.abstract_font_size, 14) * 2;
        const abstractMarginBottom = safeNumber(s.abstract_margin_bottom, 40);
        const abstractColor = safeString(s.abstract_color, '333333').replace('#', '');
        const abstractFontWeight = safeString(s.abstract_font_weight, '400');

        const keywordsFontSize = safeNumber(s.keywords_font_size, 14) * 2;
        const keywordsMarginBottom = safeNumber(s.keywords_margin_bottom, 40);
        const keywordsColor = safeString(s.keywords_color, 'e67e22').replace('#', '');
        const keywordsFontWeight = safeString(s.keywords_font_weight, 'bold');

        const sectionTitleFontSize = safeNumber(s.section_title_font_size, 28) * 2;
        const sectionTitleMarginTop = safeNumber(s.section_title_margin_top, 40);
        const sectionTitleMarginBottom = safeNumber(s.section_title_margin_bottom, 20);
        const sectionTitleColor = safeString(s.section_title_color, '000000').replace('#', '');
        const sectionTitleFontWeight = safeString(s.section_title_font_weight, 'bold');

        const textFontSize = safeNumber(s.text_font_size, 14) * 2;
        const textMarginBottom = safeNumber(s.text_margin_bottom, 20);
        const textColor = safeString(s.text_color, '333333').replace('#', '');

        const referencesFontSize = safeNumber(s.references_font_size, 13) * 2;
        const referencesColor = safeString(s.references_color, '666666').replace('#', '');

        const formulaFontSize = safeNumber(s.formula_font_size, 16) * 2;
        const formulaColor = safeString(s.formula_color, '333333').replace('#', '');
        const formulaTextAlign = safeString(s.formula_text_align, 'center');

        const imageMarginTop = safeNumber(s.image_margin_top, 30);
        const imageMarginBottom = safeNumber(s.image_margin_bottom, 30);
        const tableCellPadding = safeNumber(s.table_cell_padding, 8);
        const tableBorderColor = safeString(s.table_border_color, '000000').replace('#', '');
        const tableHeaderBg = safeString(s.table_header_bg, 'f0f0f0');

        const formatDateLocal = (dateString) => {
            if (!dateString) return 'Дата не указана';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const docChildren = [];

        // Титульная страница
        docChildren.push(new Paragraph({
            children: [new TextRun({
                text: conference.title || '',
                bold: titleFontWeight === 'bold',
                size: titleFontSize,
                font: s.font_family,
                color: titleColor
            })],
            alignment: titleTextAlign === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 400, after: titleMarginBottom }
        }));

        docChildren.push(new Paragraph({
            children: [new TextRun({ text: "СБОРНИК МАТЕРИАЛОВ", bold: true, size: titleFontSize - 16, font: s.font_family })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }));

        docChildren.push(new Paragraph({
            children: [new TextRun({ text: conference.location || "Место проведения не указано", size: titleFontSize - 24, font: s.font_family })],
            alignment: AlignmentType.CENTER
        }));

        docChildren.push(new Paragraph({
            children: [new TextRun({ text: formatDateLocal(conference.start_date), size: titleFontSize - 24, font: s.font_family })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }));

        docChildren.push(new Paragraph({ children: [new PageBreak()] }));

        // Оглавление
        docChildren.push(new Paragraph({
            children: [new TextRun({ text: "СОДЕРЖАНИЕ", bold: true, size: sectionTitleFontSize, font: s.font_family, color: sectionTitleColor })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }));

        docChildren.push(new TableOfContents("Оглавление", { hyperlink: true, headingStyleRange: "1-3" }));
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));

        // Доклады
        for (const section of sections) {
            if (!section) continue;

            docChildren.push(new Paragraph({
                children: [new TextRun({
                    text: section.name || '',
                    bold: sectionTitleFontWeight === 'bold',
                    size: sectionTitleFontSize,
                    font: s.font_family,
                    color: sectionTitleColor
                })],
                alignment: AlignmentType.CENTER,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: sectionTitleMarginTop, after: sectionTitleMarginBottom }
            }));

            const reports = section.reports || [];
            for (const report of reports) {
                if (!report) continue;

                // Заголовок доклада
                docChildren.push(new Paragraph({
                    children: [new TextRun({
                        text: report.title || '',
                        bold: true,
                        size: titleFontSize,
                        font: s.font_family,
                        color: titleColor
                    })],
                    alignment: AlignmentType.CENTER,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 160, after: 80 }
                }));

                // Авторы
                let authorsText = report.author_name || '';
                if (report.coauthors && report.coauthors.length > 0) {
                    const coauthorNames = report.coauthors.map(c => c.name).filter(n => n);
                    if (coauthorNames.length > 0) {
                        authorsText += `, ${coauthorNames.join(', ')}`;
                    }
                }
                if (authorsText) {
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: authorsText, italics: true, size: authorsFontSize, color: authorsColor, font: s.font_family })],
                        alignment: authorsTextAlign === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
                        spacing: { after: authorsMarginBottom }
                    }));
                }

                // Аннотация
                if (report.abstract) {
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: "Аннотация", bold: abstractFontWeight === 'bold', size: abstractFontSize, color: abstractColor, font: s.font_family })],
                        spacing: { after: 10 }
                    }));

                    const abstractLines = report.abstract.split(/\r?\n/);
                    for (const line of abstractLines) {
                        if (line.trim()) {
                            docChildren.push(new Paragraph({
                                children: [new TextRun({ text: line, size: abstractFontSize, color: abstractColor, font: s.font_family })],
                                spacing: { after: 5 },
                                alignment: AlignmentType.JUSTIFIED,
                                indent: { left: 720, right: 720, firstLine: 720 }
                            }));
                        } else {
                            docChildren.push(new Paragraph({ spacing: { after: 5 } }));
                        }
                    }
                    docChildren.push(new Paragraph({ spacing: { after: abstractMarginBottom } }));
                }

                // Ключевые слова
                if (report.keywords) {
                    docChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: "Ключевые слова: ", bold: keywordsFontWeight === 'bold', size: keywordsFontSize, color: keywordsColor, font: s.font_family }),
                            new TextRun({ text: report.keywords, italics: true, size: keywordsFontSize, color: keywordsColor, font: s.font_family })
                        ],
                        spacing: { after: keywordsMarginBottom }
                    }));
                }

                // Контент
                if (report.content && Array.isArray(report.content)) {
                    for (const block of report.content) {
                        if (!block) continue;

                        if (block.type === 'text' && block.content) {
                            const structuredContent = htmlToStructuredContent(block.content);
                            for (const item of structuredContent) {
                                if (item.type === 'paragraph') {
                                    docChildren.push(new Paragraph({
                                        children: [new TextRun({ text: item.content, size: textFontSize, color: textColor, font: s.font_family })],
                                        spacing: { after: textMarginBottom },
                                        alignment: AlignmentType.JUSTIFIED,
                                        indent: { firstLine: 720 }
                                    }));
                                } else if (item.type === 'heading') {
                                    docChildren.push(new Paragraph({
                                        children: [new TextRun({ text: item.content, bold: true, size: textFontSize, color: sectionTitleColor, font: s.font_family })],
                                        spacing: { before: textMarginBottom, after: textMarginBottom / 2 }
                                    }));
                                } else if (item.type === 'listItem') {
                                    docChildren.push(new Paragraph({
                                        children: [
                                            new TextRun({ text: `${item.bullet} `, size: textFontSize, color: textColor, font: s.font_family }),
                                            new TextRun({ text: item.content, size: textFontSize, color: textColor, font: s.font_family })
                                        ],
                                        spacing: { after: textMarginBottom / 2 },
                                        indent: { left: 720 }
                                    }));
                                }
                            }
                        }

                        // Таблица
                        if (block.type === 'table' && block.data && block.data.length > 0) {
                            const tableData = block.data || [];
                            const headers = block.headers || [];
                            const mergedCells = block.mergedCells || {};
                            const hasHeaders = headers.length > 0 && headers.some(h => h && h.trim());
                            
                            const numRows = tableData.length;
                            const numCols = Math.max(headers.length, ...tableData.map(row => row?.length || 0));
                            
                            const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor };
                            const cellBorders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };
                            
                            const shouldRenderCell = (row, col) => {
                                for (const [key, info] of Object.entries(mergedCells)) {
                                    const [startRow, startCol] = key.split('-').map(Number);
                                    if (row >= startRow && row < startRow + info.rowspan && col >= startCol && col < startCol + info.colspan) {
                                        return startRow === row && startCol === col;
                                    }
                                }
                                return true;
                            };
                            
                            const getMerge = (row, col) => {
                                for (const [key, info] of Object.entries(mergedCells)) {
                                    const [startRow, startCol] = key.split('-').map(Number);
                                    if (row === startRow && col === startCol) {
                                        return { rowSpan: info.rowspan, colSpan: info.colspan };
                                    }
                                }
                                return { rowSpan: 1, colSpan: 1 };
                            };
                            
                            const getCellValue = (row, col) => {
                                for (const [key, info] of Object.entries(mergedCells)) {
                                    const [startRow, startCol] = key.split('-').map(Number);
                                    if (row >= startRow && row < startRow + info.rowspan && col >= startCol && col < startCol + info.colspan) {
                                        return info.value !== undefined ? info.value : (tableData[startRow]?.[startCol] || '');
                                    }
                                }
                                const value = tableData[row]?.[col];
                                return value !== undefined && value !== null ? String(value) : '';
                            };
                            
                            const tableRows = [];
                            
                            if (hasHeaders) {
                                const headerCells = [];
                                for (let col = 0; col < numCols; col++) {
                                    headerCells.push(new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: headers[col] || '', bold: true, size: textFontSize, font: s.font_family, color: textColor })] })],
                                        shading: { fill: tableHeaderBg },
                                        borders: cellBorders
                                    }));
                                }
                                tableRows.push(new TableRow({ children: headerCells }));
                            }
                            
                            for (let row = 0; row < numRows; row++) {
                                const cells = [];
                                for (let col = 0; col < numCols; col++) {
                                    if (!shouldRenderCell(row, col)) continue;
                                    const { rowSpan, colSpan } = getMerge(row, col);
                                    const cellValue = getCellValue(row, col);
                                   cells.push(new TableCell({
    children: [new Paragraph({ 
        children: [new TextRun({ text: cellValue, size: textFontSize, font: s.font_family, color: textColor })],
        alignment: safeString(s.table_cell_text_align, 'center') === 'center' 
            ? AlignmentType.CENTER 
            : AlignmentType.LEFT
    })],
    rowSpan: rowSpan,
    columnSpan: colSpan,
    borders: cellBorders
}));
                                }
                                if (cells.length > 0) tableRows.push(new TableRow({ children: cells }));
                            }
                            
                            if (tableRows.length > 0) {
                                docChildren.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: tableCellPadding, bottom: tableCellPadding, left: tableCellPadding, right: tableCellPadding } }));
                            }
                            
                            if (block.caption) {
                                docChildren.push(new Paragraph({
                                    children: [new TextRun({ text: `Таблица ${block.number || ''} — ${block.caption}`, italics: true, size: textFontSize, font: s.font_family, color: textColor })],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 10, after: 20 }
                                }));
                            }
                        }

                        // Изображение
                        if (block.type === 'image' && block.src) {
                            try {
                                const img = await fetchImageForDocx(block.src);
                                if (img && img.data && img.data.length > 0) {
                                    let imgWidth = 400;
                                    let imgHeight = 300;
                                    try {
                                        const blob = new Blob([img.data], { type: img.mime });
                                        const url = URL.createObjectURL(blob);
                                        const image = new Image();
                                        await new Promise((resolve, reject) => {
                                            image.onload = () => {
                                                imgHeight = Math.round(imgWidth * (image.height / image.width));
                                                URL.revokeObjectURL(url);
                                                resolve();
                                            };
                                            image.onerror = () => { URL.revokeObjectURL(url); reject(); };
                                            image.src = url;
                                        });
                                    } catch (err) { imgHeight = 300; }
                                    
                                    const imageRun = new ImageRun({ data: img.data, transformation: { width: imgWidth, height: imgHeight }, type: img.mime });
                                    docChildren.push(new Paragraph({ children: [imageRun], alignment: AlignmentType.CENTER, spacing: { before: imageMarginTop, after: imageMarginBottom / 2 } }));
                                    if (block.caption) {
                                        docChildren.push(new Paragraph({ children: [new TextRun({ text: `Рисунок ${block.number || ''} — ${block.caption}`, italics: true, size: textFontSize, font: s.font_family, color: textColor })], alignment: AlignmentType.CENTER, spacing: { before: 5, after: imageMarginBottom / 2 } }));
                                    }
                                }
                            } catch (err) { console.error('Ошибка вставки изображения:', err); }
                        }

                        // Формула
                        if (block.type === 'formula') {
                            const formulaText = block.formulaString || block.latexString || block.content || '';
                            if (formulaText) {
                                const formattedFormula = formatLatexToText(formulaText);
                                docChildren.push(new Paragraph({
                                    children: [new TextRun({ text: formattedFormula, italics: true, size: formulaFontSize, font: 'Cambria Math', color: formulaColor })],
                                    alignment: formulaTextAlign === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
                                    spacing: { before: 20, after: 10 }
                                }));
                                if (block.number) {
                                    docChildren.push(new Paragraph({
                                        children: [new TextRun({ text: `(${block.number})`, size: textFontSize, font: s.font_family, color: textColor })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 5, after: 15 }
                                    }));
                                }
                            }
                        }
                    }
                }

                if (report.additional_info) {
                    const lines = report.additional_info.split(/\r?\n/);
                    for (const line of lines) {
                        if (line.trim()) {
                            docChildren.push(new Paragraph({
                                children: [new TextRun({ text: line, size: textFontSize, italics: true, color: textColor, font: s.font_family })],
                                spacing: { after: 10 }
                            }));
                        }
                    }
                }

                let literatureText = report.literature || '';
                if (Array.isArray(literatureText)) literatureText = literatureText.join('\n');
                if (typeof literatureText === 'object') literatureText = JSON.stringify(literatureText, null, 2);

                if (literatureText && literatureText.trim()) {
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: "Список литературы", bold: true, size: referencesFontSize, color: referencesColor, font: s.font_family })],
                        spacing: { before: 60, after: 20 }
                    }));
                    const items = literatureText.split(/\r?\n/);
                    let litNum = 1;
                    for (const item of items) {
                        if (item && item.trim()) {
                            docChildren.push(new Paragraph({
                                children: [
                                    new TextRun({ text: `${litNum}. `, size: referencesFontSize, color: referencesColor, font: s.font_family }),
                                    new TextRun({ text: item.trim(), size: referencesFontSize, color: referencesColor, font: s.font_family })
                                ],
                                spacing: { after: 8 },
                                indent: { hanging: 360 }
                            }));
                            litNum++;
                        }
                    }
                }

                docChildren.push(new Paragraph({ children: [new PageBreak()] }));
            }
        }

        const doc = new Document({
    styles: {
        default: {
            document: {
                run: {
                    font: s.font_family || "Times New Roman",
                    size: 24  // 12 pt по умолчанию
                }
            }
        },
        paragraphStyles: [
            {
                id: "TableOfContents",
                name: "Table of Contents",
                basedOn: "Normal",
                next: "Normal",
                run: {
                    size: 36,        // ← 16 pt (32 полупункта) — ИЗМЕНИТЕ ЭТО ЗНАЧЕНИЕ
                    font: s.font_family || "Times New Roman",
                    color: "000000"
                },
                paragraph: {
                    spacing: { 
                        before: 60, 
                        after: 60 
                    }
                }
            },
            {
                id: "TableOfContentsTitle",
                name: "Table of Contents Title",
                basedOn: "Normal",
                next: "Normal",
                run: {
                    size: 48,        // ← 24 pt для заголовка "СОДЕРЖАНИЕ"
                    font: s.font_family || "Times New Roman",
                    bold: true,
                    color: "000000"
                },
                paragraph: {
                    spacing: { 
                        before: 200, 
                        after: 200 
                    }
                }
            }
        ]
    },
    sections: [{
        properties: {
            page: {
                margin: { 
                    top: 720, 
                    right: 720, 
                    bottom: 720, 
                    left: 720 
                }
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `${conference.title || 'Сборник материалов'} | Страница `,
                                    font: s.font_family || "Times New Roman",
                                    size: 20  // 10 pt для footer
                                }),
                                new TextRun({ 
                                    children: [PageNumber.CURRENT],
                                    font: s.font_family || "Times New Roman",
                                    size: 20
                                }),
                                new TextRun({ 
                                    text: ` из `,
                                    font: s.font_family || "Times New Roman",
                                    size: 20
                                }),
                                new TextRun({ 
                                    children: [PageNumber.TOTAL_PAGES],
                                    font: s.font_family || "Times New Roman",
                                    size: 20
                                })
                            ],
                            alignment: AlignmentType.CENTER
                        })
                    ]
                })
            }
        },
        children: docChildren
    }]
});
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${(conference.title || 'conference').replace(/[^а-яА-Яa-zA-Z0-9]/g, '_')}_сборник_материалов.docx`;
        link.download = fileName;
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