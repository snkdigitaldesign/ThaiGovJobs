import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Lazy initialize the SDK client if the API key is present
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const BASELINE_SQL = `-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create jobs Table (เก็บประกาศงานที่อนุมัติแล้ว)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('ข้าราชการ', 'พนักงานราชการ', 'ลูกจ้าง')),
    education_level VARCHAR(100),
    region VARCHAR(100),
    application_start_date DATE,
    application_end_date DATE,
    exam_date DATE,
    source_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create scraped_raw Table (เก็บข้อมูลที่ดึงมาจาก OCSC รออนุมัติ)
CREATE TABLE IF NOT EXISTS scraped_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_title VARCHAR(255) NOT NULL,
    raw_content TEXT NOT NULL,
    original_url TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_processed BOOLEAN DEFAULT false NOT NULL
);

-- 4. Create Auto-update trigger for updated_at on jobs table
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_raw ENABLE ROW LEVEL SECURITY;

-- 6. Define RLS Policies for jobs
-- 6.1 ให้ทุกคน (ทั้ง Public และ Authenticated) อ่านตาราง jobs ได้
CREATE POLICY "Allow public read access to jobs" 
ON jobs 
FOR SELECT 
USING (true);

-- 6.2 เฉพาะ Admin เท่านั้นที่เขียน/แก้ไขได้ (เช็คจาก user_metadata.role ใน JWT)
CREATE POLICY "Allow admin to insert jobs" 
ON jobs 
FOR INSERT 
WITH CHECK (
    (auth.jwt() ->> 'role' = 'admin') OR 
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

CREATE POLICY "Allow admin to update jobs" 
ON jobs 
FOR UPDATE 
USING (
    (auth.jwt() ->> 'role' = 'admin') OR 
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
)
WITH CHECK (
    (auth.jwt() ->> 'role' = 'admin') OR 
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

CREATE POLICY "Allow admin to delete jobs" 
ON jobs 
FOR DELETE 
USING (
    (auth.jwt() ->> 'role' = 'admin') OR 
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

-- 7. Define RLS Policies for scraped_raw
-- 7.1 เฉพาะ Admin เท่านั้นที่มีสิทธิ์จัดการข้อมูลดิบ scraped_raw
CREATE POLICY "Allow admin full access to scraped_raw"
ON scraped_raw
FOR ALL
USING (
    (auth.jwt() ->> 'role' = 'admin') OR 
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

-- 8. Create Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_region ON jobs(region);
CREATE INDEX IF NOT EXISTS idx_jobs_status_dates ON jobs(status, application_end_date);`;

const BASELINE_TABLES = {
  jobs: [
    { name: 'id', type: 'UUID', description: 'รหัสหลักแบบสุ่ม (Primary Key)', constraint: 'DEFAULT gen_random_uuid()' },
    { name: 'title', type: 'VARCHAR(255)', description: 'หัวข้อประกาศหางาน', constraint: 'NOT NULL' },
    { name: 'content', type: 'TEXT', description: 'รายละเอียดเนื้อหาเต็มของการรับสมัคร', constraint: 'NOT NULL' },
    { name: 'category', type: 'VARCHAR(50)', description: 'ประเภทบุคลากร', constraint: "CHECK (category IN ('ข้าราชการ', 'พนักงานราชการ', 'ลูกจ้าง'))" },
    { name: 'education_level', type: 'VARCHAR(100)', description: 'ระดับการศึกษาที่รับสมัคร (เช่น ป.ตรี, ป.โท)', constraint: 'NULL' },
    { name: 'region', type: 'VARCHAR(100)', description: 'ภูมิภาค/พื้นที่ปฏิบัติงาน', constraint: 'NULL' },
    { name: 'application_start_date', type: 'DATE', description: 'วันเริ่มต้นรับสมัคร', constraint: 'NULL' },
    { name: 'application_end_date', type: 'DATE', description: 'วันสิ้นสุดรับสมัคร', constraint: 'NULL' },
    { name: 'exam_date', type: 'DATE', description: 'วันที่จัดสอบ', constraint: 'NULL' },
    { name: 'source_url', type: 'TEXT', description: 'ลิ้งก์ที่มาของประกาศต้นฉบับ', constraint: 'NULL' },
    { name: 'status', type: 'VARCHAR(20)', description: 'สถานะของประกาศเพื่อการเผยแพร่', constraint: "DEFAULT 'draft' CHECK (status IN ('published', 'draft'))" },
    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', description: 'เวลาที่เพิ่มประกาศเข้าสู่ระบบ', constraint: "DEFAULT timezone('utc'::text, now())" },
    { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', description: 'เวลาแก้ไขล่าสุด', constraint: "DEFAULT timezone('utc'::text, now())" }
  ],
  scraped_raw: [
    { name: 'id', type: 'UUID', description: 'รหัสคีย์หลัก', constraint: 'DEFAULT gen_random_uuid()' },
    { name: 'raw_title', type: 'VARCHAR(255)', description: 'หัวข้อดิบที่ดูดมาจากเว็บ OCSC', constraint: 'NOT NULL' },
    { name: 'raw_content', type: 'TEXT', description: 'เนื้อหารายละเอียดดิบ (Raw HTML/Full Text)', constraint: 'NOT NULL' },
    { name: 'original_url', type: 'TEXT', description: 'ลิ้งก์ข่าวดั้งเดิมบนเว็บบน OCSC', constraint: 'NULL' },
    { name: 'scraped_at', type: 'TIMESTAMP WITH TIME ZONE', description: 'วันเวลาที่ระบบดึงข้อมูลสำเร็จ', constraint: "DEFAULT timezone('utc'::text, now())" },
    { name: 'is_processed', type: 'BOOLEAN', description: 'ผ่านการอนุมัติ/แปลงข้อมูลและจัดเก็บลงตาราง jobs หรือยัง', constraint: 'DEFAULT false' }
  ]
};

export async function POST(req: NextRequest) {
  try {
    const { prompt, currentSql, currentTables } = await req.json();

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json({
        sql: BASELINE_SQL,
        explanation: 'ใช้โครงสร้างตารางและนโยบาย RLS พื้นฐานสำหรับระบบหางานราชการตามที่คุณกำหนด',
        tables: BASELINE_TABLES,
        success: true
      });
    }

    try {
      const client = getAiClient();
      const promptInstruction = `
You are a PostgreSQL and Supabase Database Architect specializing in Thai Government Job crawling systems.
The user wants to customize the Supabase SQL schema.

The baseline tables are:
1. "jobs" (id, title, content, category, education_level, region, application_start_date, application_end_date, exam_date, source_url, status, created_at, updated_at)
2. "scraped_raw" (id, raw_title, raw_content, original_url, scraped_at, is_processed)
With Row Level Security (RLS) policies allowing public read of "jobs" but restricting insert/update/delete/management tasks to Admins.

The user's customization request is: "${prompt}"

Current SQL is:
\`\`\`sql
${currentSql || BASELINE_SQL}
\`\`\`

Based on this, generate a complete, valid PostgreSQL script incorporating their request.
If they ask for additional columns, change of types, addition of indexes, adjustment of RLS policies, or additional helper functions/functions, apply them beautifully while keeping the original table specifications intact as much as possible.

You MUST respond ONLY with a single JSON object in the following format (no extra text, no markdown block wrappers around the JSON, just the JSON string, but if you do include markdown tags, ensure they are \`\`\`json ... \`\`\`):
{
  "sql": "THE COMPLETE COMPILED POSTGRESQL SQL SCRIPT",
  "explanation": "อธิบายสิ่งที่ปรับเปลี่ยนและคำแนะนำในภาษาไทยอย่างเป็นมิตร กระชับ และเป็นมืออาชีพ",
  "tables": {
    "jobs": [
      { "name": "column_name", "type": "DATA_TYPE", "description": "คำอธิบายภาษาไทยสั้นๆ", "constraint": "เช่น NOT NULL หรือ DEFAULT" }
    ],
    "scraped_raw": [
      { "name": "column_name", "type": "DATA_TYPE", "description": "คำอธิบายภาษาไทยสั้นๆ", "constraint": "เช่น NOT NULL หรือ DEFAULT" }
    ]
  },
  "rlsDescription": "อธิบายสิทธิ์การเข้าถึง (RLS) ในภาษาไทยสั้นๆ กระชับ"
}

Make sure the SQL uses PostgreSQL and Supabase patterns (like custom JWT metadata or claims check: \`auth.jwt() ->> 'role'\` or checks like \`(auth.jwt() ->>'role' = 'admin')\`).
Return the response in Thai where applicable (explanation, table descriptions, etc.).
`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptInstruction,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text || '';
      try {
        const cleanedText = responseText.replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, '').trim();
        const parsedResult = JSON.parse(cleanedText);
        return NextResponse.json({
          ...parsedResult,
          success: true
        });
      } catch (parseErr) {
        console.error('Error parsing JSON from Gemini response:', parseErr, responseText);
        // Fallback: parse content using pattern matching if json parsing fails
        return NextResponse.json({
          sql: BASELINE_SQL + `\n\n-- [ระบบไม่สามารถนำผลรับประมวลผลเป็น UI ได้ จึงแสดงตัวเลือกหลักเพิ่มเติมด้านล่าง]\n-- คอลัมน์ที่ขอเพิ่ม: ${prompt}`,
          explanation: `เกิดข้อผิดพลาดในการแปลผล JSON ของ AI แต่ระบบจำลอง SQL พื้นฐานไว้ให้คุณใช้งาน\nคำค้นของคุณ: ${prompt}`,
          tables: BASELINE_TABLES,
          success: false
        });
      }
    } catch (aiErr: any) {
      console.error('Gemini API Error:', aiErr);
      return NextResponse.json({
        sql: BASELINE_SQL,
        explanation: `ไม่สามารถเชื่อมต่อระบบ AI ได้เนื่องจากไม่ได้เปิดใช้งาน คีย์ API แนะนำให้จำลองโครงสร้างข้อมูลเบื้องต้นที่คุณระบุไว้ โดยคุณยังสามารถปรับแต่งแก้ไขโครงสร้างแบบแมนนวลได้ในหน้าต่างหลัก\n(รายละเอียดข้อผิดพลาด: ${aiErr?.message || aiErr})`,
        tables: BASELINE_TABLES,
        success: false
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
