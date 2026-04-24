-- =====================================================================
-- ImageRotator v2 - Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 전체 붙여넣고 Run
-- 안전하게 재실행 가능 (IF NOT EXISTS, DROP POLICY IF EXISTS 활용)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- 업체 (한 사용자가 여러 업체 관리)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_output_dir TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_companies_user
  ON public.companies(user_id);

-- 이미지 풀 (업체별 업로드된 원본 이미지 메타데이터)
CREATE TABLE IF NOT EXISTS public.pool_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_images_company
  ON public.pool_images(company_id);

-- 실행 이력 (업체별 실행 로그, 최근 N회 제외 계산용)
CREATE TABLE IF NOT EXISTS public.usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  image_ids UUID[] NOT NULL,
  output_dir TEXT,
  pieces_count INTEGER NOT NULL DEFAULT 18,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_company_date
  ON public.usage_history(company_id, executed_at DESC);

-- 사용자 설정
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_output_dir TEXT,
  pieces INTEGER NOT NULL DEFAULT 9,
  sets_per_run INTEGER NOT NULL DEFAULT 2,
  recent_exclude INTEGER NOT NULL DEFAULT 3,
  brightness_min NUMERIC NOT NULL DEFAULT 0.92,
  brightness_max NUMERIC NOT NULL DEFAULT 1.08,
  contrast_min NUMERIC NOT NULL DEFAULT 0.95,
  contrast_max NUMERIC NOT NULL DEFAULT 1.05,
  color_min NUMERIC NOT NULL DEFAULT 0.95,
  color_max NUMERIC NOT NULL DEFAULT 1.05,
  scale_min NUMERIC NOT NULL DEFAULT 0.97,
  scale_max NUMERIC NOT NULL DEFAULT 1.03,
  quality_min INTEGER NOT NULL DEFAULT 85,
  quality_max INTEGER NOT NULL DEFAULT 95,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. updated_at 자동 갱신 트리거
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_touch ON public.companies;
CREATE TRIGGER trg_companies_touch
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_user_settings_touch ON public.user_settings;
CREATE TRIGGER trg_user_settings_touch
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    모든 테이블: 본인(auth.uid()) 데이터만 접근 가능
-- ---------------------------------------------------------------------

ALTER TABLE public.companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings  ENABLE ROW LEVEL SECURITY;

-- companies
DROP POLICY IF EXISTS "companies_own_data" ON public.companies;
CREATE POLICY "companies_own_data" ON public.companies
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- pool_images (company_id 소유자 확인)
DROP POLICY IF EXISTS "pool_images_own_data" ON public.pool_images;
CREATE POLICY "pool_images_own_data" ON public.pool_images
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- usage_history
DROP POLICY IF EXISTS "usage_history_own_data" ON public.usage_history;
CREATE POLICY "usage_history_own_data" ON public.usage_history
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- user_settings
DROP POLICY IF EXISTS "user_settings_own" ON public.user_settings;
CREATE POLICY "user_settings_own" ON public.user_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. Storage 정책
--    버킷 이름: image-pool (UI에서 수동 생성 필요, Public OFF)
--    경로 구조: {user_id}/{company_id}/{image_id}.jpg
--    → 첫 번째 폴더 segment가 본인 user_id 와 일치할 때만 접근 허용
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "storage_own_folder_select" ON storage.objects;
CREATE POLICY "storage_own_folder_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'image-pool'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "storage_own_folder_insert" ON storage.objects;
CREATE POLICY "storage_own_folder_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'image-pool'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "storage_own_folder_update" ON storage.objects;
CREATE POLICY "storage_own_folder_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'image-pool'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'image-pool'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "storage_own_folder_delete" ON storage.objects;
CREATE POLICY "storage_own_folder_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'image-pool'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- 완료. 다음 단계:
-- 1) Storage → New bucket → 이름 `image-pool`, Public OFF 로 생성
-- 2) 앱 .env 에 SUPABASE_URL / SUPABASE_ANON_KEY 입력
-- =====================================================================
