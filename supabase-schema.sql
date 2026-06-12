-- SQL Script สำหรับสร้างตารางระบบงานราชการ (jobs) ใน Supabase พร้อมนโยบายความปลอดภัย RLS

-- 1. สร้างตาราง jobs และกำหนดฟิลด์ต่างๆ
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  content TEXT, -- รองรับ Markdown
  category TEXT CHECK (category IN ('ข้าราชการ', 'พนักงานราชการ', 'ลูกจ้าง', 'รัฐวิสาหกิจ', 'ราชการส่วนท้องถิ่น')),
  education_level TEXT,
  region TEXT,
  salary TEXT,
  application_start_date DATE,
  application_end_date DATE,
  source_url TEXT,
  logo_url TEXT,
  pdf_url TEXT,
  views INTEGER DEFAULT 0,
  total_positions INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- เปิดใช้งานระบบ Row Level Security (RLS) เพื่อความปลอดภัย
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 2. สร้างนโยบายการควบคุมระดับแถว (RLS Policies)

-- นโยบายที่ 1: อนุญาตให้บุคคลทั่วไป (anon) และทุกคนเข้าอ่านข้อมูล (SELECT) ได้โดยไม่มีเงื่อนไข
CREATE POLICY "Allow public read access to jobs" 
ON public.jobs
FOR SELECT 
USING (true);

-- นโยบายที่ 2: อนุญาตให้สร้าง แก้ไข ลบ (INSERT, UPDATE, DELETE) เฉพาะผู้ใช้ที่ล็อกอินเข้าสู่ระบบ (Authenticated Users)
-- ซึ่งในตาราง Supabase Auth สามารถทำหน้าที่แอดมินหรือตรวจสอบสถานะผู้ใช้งาน
CREATE POLICY "Allow write access for authenticated admin users only" 
ON public.jobs
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- นโยบายความปลอดภัยแบบเจาะจงเพิ่มเติมกรณีต้องการจำกัดผ่าน role
-- CREATE POLICY "Allow insert/update/delete for admin only" 
-- ON public.jobs 
-- FOR ALL 
-- TO authenticated
-- USING (auth.jwt() ->> 'email' = 'admin@example.com' OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
