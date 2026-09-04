-- ==============================================================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ ПРИЛОЖЕНИЯ ПАР (SUPABASE / POSTGRESQL)
-- Включает Row Level Security (RLS) для полной изоляции данных конкретной пары
-- ==============================================================================

-- Включаем расширение UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Таблица пар (Общее пространство)
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invite_code VARCHAR(32) UNIQUE NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anniversary_title VARCHAR(255) DEFAULT 'Годовщина первого свидания',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица профилей пользователей (Партнеры)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE,
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(255) DEFAULT 'memoji_boy_1',
    role VARCHAR(20) CHECK (role IN ('partner_a', 'partner_b')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица документов (Сейф)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    owner_id VARCHAR(50) NOT NULL, -- UUID пользователя или 'both'
    owner_name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'passport',
    fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- Массив {label, value, copyable, masked}
    file_url TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Таблица желаний («Хотелки»)
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    price INT,
    currency VARCHAR(10) DEFAULT '₽',
    link TEXT,
    image_url TEXT,
    priority VARCHAR(20) DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high')),
    is_reserved_by_partner BOOLEAN DEFAULT FALSE,
    reserved_at TIMESTAMPTZ,
    is_gifted BOOLEAN DEFAULT FALSE,
    gifted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Таблица задач
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_mega_task BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    assignee VARCHAR(20) DEFAULT 'both' CHECK (assignee IN ('me', 'partner', 'both')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Таблица подзадач (пункты покупок)
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    text VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - ЗАЩИТА КОНФИДЕНЦИАЛЬНЫХ ДАННЫХ
-- Пользователь может получить доступ только к строкам с couple_id своей пары
-- ==============================================================================

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Функция для получения couple_id текущего пользователя
CREATE OR REPLACE FUNCTION get_current_user_couple_id()
RETURNS UUID AS $$
    SELECT couple_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Политики для документов (Сейф)
CREATE POLICY "Доступ к документам только для участников пары"
    ON public.documents
    FOR ALL
    USING (couple_id = get_current_user_couple_id());

-- Политики для вишлиста
CREATE POLICY "Доступ к хотелкам только для участников пары"
    ON public.wishlist_items
    FOR ALL
    USING (couple_id = get_current_user_couple_id());

-- Политики для задач
CREATE POLICY "Доступ к задачам только для участников пары"
    ON public.tasks
    FOR ALL
    USING (couple_id = get_current_user_couple_id());

-- Политики для подзадач
CREATE POLICY "Доступ к подзадачам только для участников пары"
    ON public.subtasks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = subtasks.task_id AND t.couple_id = get_current_user_couple_id()
        )
    );
