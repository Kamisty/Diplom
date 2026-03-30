-- =====================================================
-- ФАЙЛ: db.sql
-- ОПИСАНИЕ: Структура базы данных для конференц-системы
-- СОВМЕСТИМОСТЬ: PostgreSQL
-- =====================================================

-- Отключаем проверку внешних ключей временно
SET session_replication_role = 'replica';

-- =====================================================
-- УДАЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ (В ПРАВИЛЬНОМ ПОРЯДКЕ)
-- =====================================================
DROP TABLE IF EXISTS 
    coauthors,
    report_versions,
    reviews,
    section_program,
    section_resensent,
    reports,
    sections,
    conferences,
    resensent,
    user_roles,
    user_profiles,
    users,
    roles
CASCADE;

-- Включаем обратно проверку внешних ключей
SET session_replication_role = 'origin';

-- =====================================================
-- СОЗДАНИЕ ПОСЛЕДОВАТЕЛЬНОСТЕЙ (SEQUENCES)
-- =====================================================

-- Сброс и создание последовательностей
DROP SEQUENCE IF EXISTS users_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS users_id_seq START 1;

DROP SEQUENCE IF EXISTS conferences_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS conferences_id_seq START 1;

DROP SEQUENCE IF EXISTS sections_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS sections_id_seq START 1;

DROP SEQUENCE IF EXISTS reports_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS reports_id_seq START 1;

DROP SEQUENCE IF EXISTS report_versions_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS report_versions_id_seq START 1;

DROP SEQUENCE IF EXISTS coauthors_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS coauthors_id_seq START 1;

DROP SEQUENCE IF EXISTS reviews_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS reviews_id_seq START 1;

DROP SEQUENCE IF EXISTS roles_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS roles_id_seq START 1;

DROP SEQUENCE IF EXISTS user_roles_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS user_roles_id_seq START 1;

DROP SEQUENCE IF EXISTS resensent_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS resensent_id_seq START 1;

DROP SEQUENCE IF EXISTS section_resensent_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS section_resensent_id_seq START 1;

DROP SEQUENCE IF EXISTS section_program_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS section_program_id_seq START 1;

-- =====================================================
-- ТАБЛИЦА: users (Пользователи)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
    user_id INTEGER PRIMARY KEY DEFAULT nextval('users_id_seq'),
    login VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_login ON users(login);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- ТАБЛИЦА: roles (Роли)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.roles (
    role_id INTEGER PRIMARY KEY DEFAULT nextval('roles_id_seq'),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ТАБЛИЦА: user_roles (Связь пользователей и ролей)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id_user_role INTEGER PRIMARY KEY DEFAULT nextval('user_roles_id_seq'),
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Индекс для user_roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- =====================================================
-- ТАБЛИЦА: user_profiles (Профили пользователей)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    last_name VARCHAR(50),
    first_name VARCHAR(50),
    middle_name VARCHAR(50),
    academic_degree VARCHAR(100),
    academic_title VARCHAR(100),
    position VARCHAR(200),
    workplace VARCHAR(300),
    phone VARCHAR(20),
    orcid_id VARCHAR(20),
    avatar_url VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ТАБЛИЦА: conferences (Конференции)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conferences (
    id INTEGER PRIMARY KEY DEFAULT nextval('conferences_id_seq'),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_deadline DATE,
    location VARCHAR(300),
    format VARCHAR(50) CHECK (format IN ('offline', 'online', 'hybrid')),
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для conferences
CREATE INDEX idx_conferences_dates ON conferences(start_date, end_date);
CREATE INDEX idx_conferences_created_by ON conferences(created_by);

-- =====================================================
-- ТАБЛИЦА: sections (Секции конференций)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sections (
    id_sections INTEGER PRIMARY KEY DEFAULT nextval('sections_id_seq'),
    conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
    name_section VARCHAR(200) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- Руководитель секции
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для sections
CREATE INDEX idx_sections_conference ON sections(conference_id);
CREATE INDEX idx_sections_user ON sections(user_id);

-- =====================================================
-- ТАБЛИЦА: resensent (Рецензенты)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.resensent (
    id_resensent INTEGER PRIMARY KEY DEFAULT nextval('resensent_id_seq'),
    name_resensent VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ТАБЛИЦА: section_resensent (Связь секций и рецензентов)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.section_resensent (
    id_section_resensent INTEGER PRIMARY KEY DEFAULT nextval('section_resensent_id_seq'),
    id_section INTEGER NOT NULL REFERENCES sections(id_sections) ON DELETE CASCADE,
    id_resensent INTEGER NOT NULL REFERENCES resensent(id_resensent) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_section, id_resensent)
);

-- Индексы для section_resensent
CREATE INDEX idx_section_resensent_section ON section_resensent(id_section);
CREATE INDEX idx_section_resensent_resensent ON section_resensent(id_resensent);

-- =====================================================
-- ТАБЛИЦА: reports (Доклады)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reports (
    report_id INTEGER PRIMARY KEY DEFAULT nextval('reports_id_seq'),
    registration_id INTEGER UNIQUE,
    title_report VARCHAR(500) NOT NULL,
    abstract TEXT NOT NULL,
    keywords VARCHAR(300),
    current_version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'published')),
    final_decision_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    final_decision_at TIMESTAMP,
    final_decision_notes TEXT,
    id_sections INTEGER REFERENCES sections(id_sections) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для reports
CREATE INDEX idx_reports_section ON reports(id_sections);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_decision_by ON reports(final_decision_by);

-- =====================================================
-- ТАБЛИЦА: report_versions (Версии докладов)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.report_versions (
    id_version INTEGER PRIMARY KEY DEFAULT nextval('report_versions_id_seq'),
    report_id INTEGER NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_name VARCHAR(300) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT false,
    comments TEXT,
    UNIQUE(report_id, version_number)
);

-- Индексы для report_versions
CREATE INDEX idx_report_versions_report ON report_versions(report_id);
CREATE INDEX idx_report_versions_current ON report_versions(is_current) WHERE is_current = true;

-- =====================================================
-- ТАБЛИЦА: coauthors (Соавторы)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.coauthors (
    id_coauthor INTEGER PRIMARY KEY DEFAULT nextval('coauthors_id_seq'),
    name VARCHAR(255) NOT NULL,
    academic_degree VARCHAR(100),
    academic_title VARCHAR(100),
    position VARCHAR(200),
    workplace VARCHAR(300),
    email VARCHAR(100),
    is_corresponding BOOLEAN DEFAULT false,
    id_report INTEGER REFERENCES reports(report_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для coauthors
CREATE INDEX idx_coauthors_report ON coauthors(id_report);
CREATE INDEX idx_coauthors_email ON coauthors(email);

-- =====================================================
-- ТАБЛИЦА: reviews (Рецензии)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id_reviews INTEGER PRIMARY KEY DEFAULT nextval('reviews_id_seq'),
    assignment_id INTEGER NOT NULL UNIQUE,
    id_versions INTEGER REFERENCES report_versions(id_version) ON DELETE SET NULL,
    id_section_resensent INTEGER REFERENCES section_resensent(id_section_resensent) ON DELETE SET NULL,
    scientific_value INTEGER CHECK (scientific_value BETWEEN 1 AND 5),
    practical_value INTEGER CHECK (practical_value BETWEEN 1 AND 5),
    relevance INTEGER CHECK (relevance BETWEEN 1 AND 5),
    novelty INTEGER CHECK (novelty BETWEEN 1 AND 5),
    quality INTEGER CHECK (quality BETWEEN 1 AND 5),
    recommendation VARCHAR(20) CHECK (recommendation IN ('accept', 'minor_revision', 'major_revision', 'reject')),
    comments_for_author TEXT NOT NULL,
    comments_for_editor TEXT,
    additional_files TEXT,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_final BOOLEAN DEFAULT false
);

-- Индексы для reviews
CREATE INDEX idx_reviews_assignment ON reviews(assignment_id);
CREATE INDEX idx_reviews_version ON reviews(id_versions);
CREATE INDEX idx_reviews_section_resensent ON reviews(id_section_resensent);

-- =====================================================
-- ТАБЛИЦА: section_program (Программа секций)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.section_program (
    id_section_program INTEGER PRIMARY KEY DEFAULT nextval('section_program_id_seq'),
    section_id INTEGER NOT NULL REFERENCES sections(id_sections) ON DELETE CASCADE,
    report_id INTEGER NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
    title_report VARCHAR(500),
    presentation_order INTEGER,
    presentation_date DATE,
    presentation_time TIME,
    duration_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для section_program
CREATE INDEX idx_section_program_section ON section_program(section_id);
CREATE INDEX idx_section_program_report ON section_program(report_id);
CREATE INDEX idx_section_program_order ON section_program(section_id, presentation_order);

-- =====================================================
-- ДОБАВЛЕНИЕ НАЧАЛЬНЫХ ДАННЫХ
-- =====================================================

-- Добавление базовых ролей
INSERT INTO roles (role_name, description) VALUES
    ('admin', 'Администратор системы'),
    ('organizer', 'Организатор конференции'),
    ('section_head', 'Руководитель секции'),
    ('reviewer', 'Рецензент'),
    ('author', 'Автор'),
    ('participant', 'Участник')
ON CONFLICT (role_name) DO NOTHING;

-- Добавление тестового администратора (пароль: admin123)
INSERT INTO users (login, email, password_hash, name, role) VALUES
    ('admin@conference.ru', 'admin@conference.ru', '$2a$10$YourHashedPasswordHere', 'Администратор', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- =====================================================

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conferences_updated_at BEFORE UPDATE ON conferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_section_program_updated_at BEFORE UPDATE ON section_program
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- =====================================================

COMMENT ON TABLE users IS 'Пользователи системы';
COMMENT ON TABLE conferences IS 'Конференции';
COMMENT ON TABLE sections IS 'Секции конференций';
COMMENT ON TABLE reports IS 'Доклады';
COMMENT ON TABLE report_versions IS 'Версии докладов';
COMMENT ON TABLE coauthors IS 'Соавторы докладов';
COMMENT ON TABLE reviews IS 'Рецензии на доклады';
COMMENT ON TABLE section_program IS 'Программа секций';

-- =====================================================
-- ПРОВЕРКА СОЗДАННЫХ ТАБЛИЦ
-- =====================================================

SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =====================================================
-- КОНЕЦ СКРИПТА
-- =====================================================