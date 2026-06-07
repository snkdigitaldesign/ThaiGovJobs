export interface Column {
  name: string;
  type: string;
  description: string;
  constraint: string;
}

export interface Tables {
  jobs: Column[];
  scraped_raw: Column[];
}

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export const DEFAULT_SQL = `-- 1. Enable UUID Extension
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

-- 6.2 เฉพาะ Admin เท่านั้นที่เขียน/แก้ไขได้ (เช็คจาก user_metadata.role ใน JWT ของ Supabase)
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

export const DEFAULT_TABLES: Tables = {
  jobs: [
    { name: 'id', type: 'UUID', description: 'รหัสประกาศงานแบบสุ่ม (Primary Key)', constraint: 'PRIMARY KEY DEFAULT' },
    { name: 'title', type: 'VARCHAR(255)', description: 'หัวข้อประกาศสมัครงานราชการ', constraint: 'NOT NULL' },
    { name: 'content', type: 'TEXT', description: 'รายละเอียดประกาศรับสมัครงานฉบับเต็ม', constraint: 'NOT NULL' },
    { name: 'category', type: 'VARCHAR(50)', description: 'ประเภทงาน (ข้าราชการ/พนักงานราชการ/ลูกจ้าง)', constraint: "CHECK (category IN ('ข้าราชการ', 'พนักงานราชการ', 'ลูกจ้าง'))" },
    { name: 'education_level', type: 'VARCHAR(100)', description: 'คุณวุฒิการศึกษาที่กำหนด (เช่น ป.ตรี, ป.โท)', constraint: 'NULL' },
    { name: 'region', type: 'VARCHAR(100)', description: 'พื้นที่ปฏิบัติงาน / ภูมิภาค', constraint: 'NULL' },
    { name: 'application_start_date', type: 'DATE', description: 'วันเริ่มต้นรับสมัครงาน', constraint: 'NULL' },
    { name: 'application_end_date', type: 'DATE', description: 'วันสิ้นสุดการรับสมัครงาน', constraint: 'NULL' },
    { name: 'exam_date', type: 'DATE', description: 'วันจัดตารางทดสอบความรู้ความสามารถ', constraint: 'NULL' },
    { name: 'source_url', type: 'TEXT', description: 'ลิ้งก์ประกาศอย่างเป็นทางการต้นฉบับ', constraint: 'NULL' },
    { name: 'status', type: 'VARCHAR(20)', description: 'สถานะประกาศเผยแพร่', constraint: "DEFAULT 'draft' CHECK (status IN ('published', 'draft'))" },
    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', description: 'วันเวลาที่ระบบเพิ่มประกาศครั้งแรก', constraint: 'DEFAULT timezone(utc)' },
    { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', description: 'วันเวลาอัปเดตข้อมูลล่าสุด', constraint: 'DEFAULT timezone(utc)' }
  ],
  scraped_raw: [
    { name: 'id', type: 'UUID', description: 'รหัสคีย์หลักข้อมูลดิบ', constraint: 'PRIMARY KEY DEFAULT' },
    { name: 'raw_title', type: 'VARCHAR(255)', description: 'หัวข้อประกาศต้นฉบับจาก Crawler', constraint: 'NOT NULL' },
    { name: 'raw_content', type: 'TEXT', description: 'เนื้อหา HTML/ข้อมูลแบบมีโครงสร้างทั่วไปที่ดึงมา', constraint: 'NOT NULL' },
    { name: 'original_url', type: 'TEXT', description: 'ลิ้งก์ประกาศต้นฉบับบนเว็บ OCSC', constraint: 'NULL' },
    { name: 'scraped_at', type: 'TIMESTAMP WITH TIME ZONE', description: 'วันเวลาดึงข้อมูลด้วย Crawler สำเร็จ', constraint: 'DEFAULT timezone(utc)' },
    { name: 'is_processed', type: 'BOOLEAN', description: 'ผ่านการคัดแยกประเภทและอนุมัติเผยแพร่เข้าระบบ jobs แล้วหรือยัง', constraint: 'DEFAULT false' }
  ]
};

export const DEFAULT_EDGE_FUNCTION = `// Supabase Edge Function: scrape-ocsc-jobs
// Path: /supabase/functions/scrape-ocsc-jobs/index.ts
// สำหรับดึงตำแหน่งงานล่าสุดจากเว็บสำนักงาน ก.พ. และ บันทึกลงในตาราง scraped_raw (หลีกเลี่ยงข้อมูลซ้ำ)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const targetUrl = "https://job.ocsc.go.th/Default.aspx";
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    if (!doc) {
      throw new Error("ไม่สามารถประมวลผล HTML เอกสารได้");
    }

    const anchors = doc.querySelectorAll("a");
    let newlyInsertedCount = 0;
    let duplicateSkippedCount = 0;

    for (const node of anchors) {
      const anchor = node as any;
      const href = anchor.getAttribute("href") || "";
      const text = anchor.textContent?.trim() || "";

      if (text.length > 10 && (text.includes("รับสมัคร") || text.includes("ตำแหน่ง"))) {
        const fullUrl = href.startsWith("http") ? href : new URL(href, targetUrl).toString();

        const { data: existing, error: checkError } = await supabase
          .from("scraped_raw")
          .select("id")
          .eq("original_url", fullUrl)
          .maybeSingle();

        if (checkError) continue;

        if (existing) {
          duplicateSkippedCount++;
          continue;
        }

        const { error: insertError } = await supabase
          .from("scraped_raw")
          .insert({
            raw_title: text,
            raw_content: \`[นำเข้าระบบ Edge Function อัตโนมัติ] พบประกาศสมัครงานหัวข้อ: "\${text}". กรุณาตรวจสอบเอกสารแนบท้ายผ่านลิงก์ต้นทางอย่างเป็นทางการ\`,
            original_url: fullUrl,
            is_processed: false
          });

        if (!insertError) {
          newlyInsertedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: \`จัดเก็บสำเร็จ \${newlyInsertedCount} รายการ, ข้ามรายการซ้ำ \${duplicateSkippedCount} รายการ\`,
        inserted: newlyInsertedCount,
        skipped: duplicateSkippedCount
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});`;

export function getTodayIsoString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getFutureDateIsoString(days: number): string {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().split('T')[0];
}

export function getNowTimestampString(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 16);
}

export function getNowTimeString(): string {
  return new Date().toTimeString().split(' ')[0];
}

export function getMonthNameTh(month: number): string {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return months[month] || '';
}

export function parseSalaryFromContent(content: string): string {
  if (!content) return "ตามโครงสร้างเงินเดือนราชการ (ประมาณ 15,000 - 18,000 บาท)";
  const regex = /(?:เงินเดือน|อัตราเงินเดือน|ค่าตอบแทน|สูงถึง|สูงสุด)\s*(?:ประมาณ\s*|เริ่มต้น\s*)?([\d,]+\s*(?:-\s*[\d,]+)?\s*(?:บาท|บ\.|\/เดือน)?)/i;
  const match = content.match(regex);
  if (match && match[1]) {
    let salaryText = match[1].trim();
    if (!salaryText.includes("บาท") && !salaryText.includes("บ.")) {
      salaryText += " บาท";
    }
    return salaryText;
  }
  return "ตามโครงสร้างเงินเดือนราชการ (ประมาณ 15,000 - 18,000 บาท)";
}

export function extractAgencyFromTitle(title: string): string {
  if (!title) return "หน่วยงานราชการหรือองค์กรผู้ประกาศ";
  const regex = /(สำนักงานคณะกรรมการ|สำนักงานปลัด|สำนักงาน|กรมควบคุม|กรมการ|กรมทรัพยากร|กรมป่าไม้|กรม|กระทรวง|สถาบัน|มหาวิทยาลัย|สำนัก|กอง)\s*[^\s]+/i;
  const match = title.match(regex);
  if (match) {
    return match[0].trim();
  }
  return "หน่วยงานราชการหรือองค์กรผู้ประกาศ";
}

export const DEFAULT_RAW_ROWS = [
  {
    id: 'raw-101',
    raw_title: 'กรมชลประทาน เปิดรับสมัครสอบเพื่อบรรจุแต่งตั้งบุคคลเข้ารับราชการ 180 อัตรา',
    raw_content: 'เปิดสมัครสอบแข่งขันเป็นข้าราชการพลเรือนสามัญในตำแหน่งวิศวกรชลประทานปฏิบัติการ, นายช่างโยธาปฏิบัติงาน และนักจัดการทั่วไป ปริญญาตรี อัตราค่าจ้างสูงสุด 16,500 บาท ตั้งแต่วันที่ 12 มิถุนายน ถึง 5 กรกฎาคม 2026 สแกนใบสมัครผ่านออนไลน์สำเร็จ',
    original_url: 'https://job.ocsc.go.th/RegisterJob.aspx?id=rid-2026',
    scraped_at: '2026-06-07 09:15',
    is_processed: false,
    category: 'ข้าราชการ',
    education_level: 'ปริญญาตรี',
    region: 'กรุงเทพมหานคร'
  },
  {
    id: 'raw-102',
    raw_title: 'กรมศุลกากร เปิดรับสมัครพนักงานราชการ ตำแหน่งเจ้าพนักงานศุลกากร ฝ่ายตรวจสอบและสกัดกั้นด่านหนองคาย',
    raw_content: 'จัดจ้างพนักงานราชการทั่วไป จำนวน 15 อัตรา ตำแหน่งตรวจสอบภาษีและคุมสถิติรถยนต์ข้ามสะพานมิตรภาพ วุฒิ ปวส. ทุกสาขา สอบข้อเขียนวิชาความรู้ศุลกากรเบื้องต้น สมัครออนไลน์',
    original_url: 'https://job.ocsc.go.th/RegisterJob.aspx?id=customs-nongkhai',
    scraped_at: '2026-06-07 09:30',
    is_processed: false,
    category: 'พนักงานราชการ',
    education_level: 'ปวส.',
    region: 'ภาคตะวันออกเฉียงเหนือ'
  },
  {
    id: 'raw-103',
    raw_title: 'สำนักงานสาธารณสุขจังหวัดเชียงใหม่ รับสมัครลูกจ้างชั่วคราวรายเดือน ตำแหน่งเจ้าหน้าที่ธุรการส่วนกลาง',
    raw_content: 'ตำแหน่งธุรการคีย์ข้อมูลเวชระเบียนและเอกสารจัดเก็บ ยอดจัดจ้างสัญญารายปี เงินเดือน 10,200 บาท รับวุฒิ ม.6 หรือ ปวช. สมัครด้วยตนเองที่จังหวัดเชียงใหม่ สสจ.เชียงใหม่',
    original_url: 'https://job.ocsc.go.th/RegisterJob.aspx?id=moph-cm2026',
    scraped_at: '2026-06-07 09:44',
    is_processed: false,
    category: 'ลูกจ้าง',
    education_level: 'ปวช. / ม.6',
    region: 'ภาคเหนือ'
  }
];

export const DEFAULT_JOBS = [
  {
    id: 'job-201',
    title: 'นักจัดการงานทั่วไปปฏิบัติการ สำนักงาน ก.พ.',
    content: 'เปิดรับสมัครสอบแข่งขันเพื่อบรรจุเข้ารับราชการจำนวน 5 อัตรา ปฏิบัติงานที่นนทบุรี รับสมัครด้วยตนเองและทดสอบภาค ข. ภาค ค. ตามระเบียบราชการที่ตั้งขึ้น',
    category: 'ข้าราชการ',
    education_level: 'ปริญญาตรี',
    region: 'ภาคกลาง',
    application_start_date: '2026-06-10',
    application_end_date: '2026-06-30',
    exam_date: '2026-07-20',
    source_url: 'https://job.ocsc.go.th/RegisterJob_ocsc.aspx',
    status: 'published',
    created_at: '2026-06-05 10:00'
  },
  {
    id: 'job-202',
    title: 'นักอุทกวิทยาปฏิบัติการ กรมทรัพยากรน้ำ',
    content: 'วิเคราะห์ระบบน้ำฝน คาดการณ์สภาวะภัยแล้งลุ่มน้ำยมลุ่มน้ำน่าน เงินเดือน 15,000 - 16,500 บาท ปริญญาตรีวิศวกรรมชลประทานหรือวิทยาศาสตร์เทคโนโลยีภูมิสารสนเทศ',
    category: 'ข้าราชการ',
    education_level: 'ปริญญาตรี',
    region: 'ทั่วประเทศ',
    application_start_date: '2026-06-01',
    application_end_date: '2026-06-25',
    exam_date: '2026-07-11',
    source_url: 'https://job.ocsc.go.th/water-resource',
    status: 'published',
    created_at: '2026-06-06 14:00'
  },
  {
    id: 'job-203',
    title: 'นักวิเคราะห์นโยบายและแผนปฏิบัติการ สำนักงานปลัดกระทรวงมหาดไทย',
    content: 'รับสมัครบุคคลเพื่อเลือกสรรเป็นพนักงานราชการทั่วไป วุฒิการศึกษาระดับปริญญาตรีทุกสาขา เพื่อจัดทำงานยุทธศาสตร์และการบริการศูนย์ดำรงธรรมจังหวัดในสาขาภูมิภาค',
    category: 'พนักงานราชการ',
    education_level: 'ปริญญาตรี',
    region: 'ภาคเหนือ',
    application_start_date: '2026-06-02',
    application_end_date: '2026-06-15',
    exam_date: '2026-06-18',
    source_url: 'https://job.ocsc.go.th/moi-provincial',
    status: 'published',
    created_at: '2026-06-07 08:00'
  },
  {
    id: 'job-204',
    title: 'นายช่างเทคนิคปฎิบัติงาน (คอมพิวเตอร์) กรมการกงสุล',
    content: 'รับสมัครข้าราชการด่วน วุฒิ ปวส. โยธา/ไฟฟ้า/คอมพิวเตอร์ ทำหน้าที่ดูแลบำรุงรักษาระบบพิมพ์หนังสือเดินทางด่วนและระบบสารสนเทศคูหากันกระสุนส่วนความก้าวหน้า',
    category: 'ข้าราชการ',
    education_level: 'ปวส.',
    region: 'กรุงเทพมหานคร',
    application_start_date: '2026-06-05',
    application_end_date: '2026-06-21',
    exam_date: '2026-06-23',
    source_url: 'https://job.ocsc.go.th/consular-tech',
    status: 'published',
    created_at: '2026-06-07 09:10'
  }
];
