'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ShieldCheck,
  ShieldAlert, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Download, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ExternalLink, 
  Link as LinkIcon, 
  Clock, 
  Calendar, 
  Check, 
  Lock, 
  LogOut, 
  ChevronRight, 
  Edit3, 
  Send,
  Search,
  Tag,
  MapPin,
  GraduationCap,
  Briefcase,
  X
} from 'lucide-react';

interface Column {
  name: string;
  type: string;
  description: string;
  constraint: string;
}

interface Tables {
  jobs: Column[];
  scraped_raw: Column[];
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

const DEFAULT_SQL = `-- 1. Enable UUID Extension
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

const DEFAULT_TABLES: Tables = {
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

const DEFAULT_EDGE_FUNCTION = `// Supabase Edge Function: scrape-ocsc-jobs
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

function getTodayIsoString(): string {
  return new Date().toISOString().split('T')[0];
}

function getFutureDateIsoString(days: number): string {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().split('T')[0];
}

function getNowTimestampString(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 16);
}

function getNowTimeString(): string {
  return new Date().toTimeString().split(' ')[0];
}

function getMonthNameTh(month: number): string {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return months[month] || '';
}

function AdSenseBlock({ slot, type }: { slot: string; type: 'banner' | 'sidebar' | 'inline' }) {
  if (type === 'banner') {
    return (
      <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-4 mb-4 flex flex-col items-center justify-center text-center relative overflow-hidden" id={`adsense-banner-${slot}`}>
        <div className="absolute top-2 right-3 text-[9px] uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
          Google AdSense Top Banner
        </div>
        <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          พื้นที่ประชาสัมพันธ์เด่น (Google AdSense)
        </div>
        <div className="w-full max-w-2xl min-h-[50px] flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-3xs">
          <ins 
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '50px' }}
            data-ad-client="ca-pub-9999999999999999"
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <div className="text-center font-sans">
            <p className="text-xs font-bold text-slate-600 block">ยินดีต้อนรับผู้สนับสนุน สแกนข่าวสมัครสอบไม่มีสะดุด</p>
            <p className="text-[9px] font-mono text-slate-400">Position: Header Banner | Slot: {slot}</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'sidebar') {
    return (
      <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-5 flex flex-col gap-3 relative overflow-hidden" id={`adsense-sidebar-${slot}`}>
        <div className="absolute top-2 right-3 text-[9px] uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
          Ad
        </div>
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          เทคนิคเตรียมสอบ & ข้อมูลแนะแนวสำคัญ
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          คู่มือผ่านภาค ก. ความรอบรู้ กฎหมายลักษณะข้าราชการที่ดี และแนวข้อสอบภาษาอังกฤษสำหรับพิชิตตำแหน่งราชการ
        </p>
        <div className="min-h-[100px] border border-slate-200 bg-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-3xs">
          <ins 
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '60px' }}
            data-ad-client="ca-pub-9999999999999999"
            data-ad-slot={slot}
            data-ad-format="vertical"
          />
          <span className="block text-xs font-bold text-slate-600 font-sans mt-1">ผู้สนับสนุนเว็บไซต์หลัก</span>
          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">Slot: {slot}</span>
        </div>
      </div>
    );
  }

  // inline details
  return (
    <div className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-4 my-2 flex flex-col items-center justify-center text-center" id={`adsense-inline-${slot}`}>
      <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1.5 justify-center">
        <span>Google AdSense</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
        <span>ช่องโฆษณาในหน้าเนื้อหาประกาศข่าว</span>
      </div>
      <div className="w-full max-w-md min-h-[50px] bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2">
        <ins 
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client="ca-pub-9999999999999999"
          data-ad-slot={slot}
          data-ad-format="fluid"
          data-ad-layout-key="-6t+ed+2i-1n-4w"
        />
        <div className="text-center font-sans">
          <span className="text-xs font-bold text-slate-600 block">งานแนะแนวยกระดับความรู้ตำแหน่งที่เปิดรับ</span>
          <span className="text-[9px] text-slate-400 font-mono block">Slot: {slot}</span>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_RAW_ROWS = [
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

const DEFAULT_JOBS = [
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
    region: 'เชียงใหม่',
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

export default function Home() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // Logged in inside mock state so admin can see sandbox directly, but can log out
  const [username, setUsername] = useState<string>('admin@ocsc-gov.go.th');
  const [password, setPassword] = useState<string>('supabaseAdmin2026!');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Mode Selection: 'public-view' | 'admin-dashboard'
  const [currentView, setCurrentView] = useState<'admin-dashboard' | 'public-view'>('admin-dashboard');

  // Public-view state variables for reactive filters and tabs
  const [publicSearchQuery, setPublicSearchQuery] = useState<string>('');
  const [publicSelectedEducation, setPublicSelectedEducation] = useState<string>('all');
  const [publicSelectedRegion, setPublicSelectedRegion] = useState<string>('all');
  const [publicSelectedCategory, setPublicSelectedCategory] = useState<string>('all');
  
  // Public tabs inside public workspace ('list' represent Home List, 'calendar' represents Exam Calendar)
  const [publicActiveTab, setPublicActiveTab] = useState<'list' | 'calendar'>('list');

  // Selected job for detailed popup modal
  const [publicSelectedJob, setPublicSelectedJob] = useState<any | null>(null);

  // Calendar Year and Month states (default: June 2026, matching current metadata timestamp)
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(5); // 0-indexed (5 for June)

  // Admin Subsections: 'detect-news' | 'url-scraper' | 'sql-schema' | 'published-jobs'
  const [activeAdminTab, setActiveAdminTab] = useState<'detect-news' | 'url-scraper' | 'published-jobs' | 'sql-schema'>('detect-news');

  // Schema state
  const [sqlContent, setSqlContent] = useState<string>(DEFAULT_SQL);
  const [tablesSchema, setTablesSchema] = useState<Tables>(DEFAULT_TABLES);
  const [activeSqlTab, setActiveSqlTab] = useState<'all' | 'tables' | 'rls' | 'indexes' | 'edge-function'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  // Persistent States loaded safely via client hydration
  const [simRawRows, setSimRawRows] = useState<any[]>(DEFAULT_RAW_ROWS);
  const [simJobs, setSimJobs] = useState<any[]>(DEFAULT_JOBS);

  const [simLogs, setSimLogs] = useState<LogEntry[]>([
    { timestamp: '17:12:00', type: 'info', message: 'ริเริ่มจำลองระบบหลังบ้านความปลอดภัยกองบัญชาการกรมการจัดหางานภาครัฐ (Supabase RLS Protected)' },
    { timestamp: '17:12:15', type: 'success', message: 'Supabase Auth Handshake: ตรวจพบคุกกี้และสิทธิ์ผู้ดลบันดาล "admin@ocsc-gov.go.th" บล็อกแอดมินปลดม่าน' }
  ]);

  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  // Safe client hydration
  useEffect(() => {
    const storedRaws = localStorage.getItem('gov_sim_raw_rows');
    const storedJobs = localStorage.getItem('gov_sim_jobs');
    
    const hTimer = setTimeout(() => {
      if (storedRaws) {
        try {
          setSimRawRows(JSON.parse(storedRaws));
        } catch (e) {
          console.error(e);
        }
      }

      if (storedJobs) {
        try {
          setSimJobs(JSON.parse(storedJobs));
        } catch (e) {
          console.error(e);
        }
      }
      setHasHydrated(true);
    }, 0);

    return () => clearTimeout(hTimer);
  }, []);

  // Save states to localStorage
  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem('gov_sim_raw_rows', JSON.stringify(simRawRows));
    }
  }, [simRawRows, hasHydrated]);

  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem('gov_sim_jobs', JSON.stringify(simJobs));
    }
  }, [simJobs, hasHydrated]);

  // Refinement modal state
  const [selectedRawItem, setSelectedRawItem] = useState<any | null>(null);
  const [isProcessingWithAI, setIsProcessingWithAI] = useState<boolean>(false);
  const [refineForm, setRefineForm] = useState({
    title: '',
    category: 'ข้าราชการ',
    education_level: 'ปริญญาตรี',
    region: 'กรุงเทพมหานคร',
    application_start_date: '',
    application_end_date: '',
    exam_date: '',
    content: ''
  });

  // Manual link input scrap state
  const [manualUrlInput, setManualUrlInput] = useState<string>('');
  const [isUrlScraping, setIsUrlScraping] = useState<boolean>(false);
  const [scrapedManualResult, setScrapedManualResult] = useState<any | null>(null);

  // DB Simulator Global Settings
  const [simRole, setSimRole] = useState<'guest' | 'admin'>('admin');

  // AI SQL Assistant Input
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiFeedback, setAiFeedback] = useState<string>('');

  // Add Log Helper
  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    const timeStr = getNowTimeString();
    setSimLogs(prev => [...prev, { timestamp: timeStr, type, message }]);
  };

  // Auth Functions
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError('กรุณากรอกอีเมล และ รหัสผ่าน ด่านเข้าถึง');
      return;
    }
    setIsLoggingIn(true);
    setLoginError('');

    setTimeout(() => {
      if (username.includes('admin') || password === 'supabaseAdmin2026!') {
        setIsLoggedIn(true);
        setSimRole('admin');
        addLog('success', `Supabase Auth Success: ล็อกอินผ่านอีเมล ${username} สำเร็จ กำหนดบทบาทสิทธิ์ JWT Token เป็น 'admin'`);
      } else {
        setLoginError('รหัสผ่านหรือบัญชีผู้ใช้งานไม่ถูกต้องตามระบบจัดเก็บของสำนักงาน');
        addLog('error', `Supabase Auth Failure: บล็อกการเข้าถึงระบบจากอีเมล ${username}`);
      }
      setIsLoggingIn(false);
    }, 1200);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSimRole('guest');
    addLog('info', 'Supabase Auth: ออกจากระบบเรียบร้อย สิทธิ์การจารึกข้อมูลและสิทธิ์แก้ไข RLS ถูกตั้งกลับเป็นตระกูลสิทธิ์เสรี (Guest Select only)');
  };

  // Run Web scraping simulator (calling the edge function logic visually)
  const triggerScrapeJobs = async () => {
    addLog('info', '🔌 เรียกคำสั่งประมวลผล Edge Function [scrape-ocsc-jobs] เพื่อดาวน์โหลดหน้าข่าวจากศูนย์กลาง ก.พ...');
    
    // Simulating call to edge function
    setIsUrlScraping(true);
    setTimeout(() => {
      // Pick random mock templates
      const templates = [
        {
          raw_title: 'กรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช รับสมัครบุคคลเพื่อเลือกสรรเป็นพนักงานราชการทั่วไป 42 อัตรา',
          raw_content: 'ตำแหน่งนักวิชาการป่าไม้, นักวิชาการคอมพิวเตอร์ และเจ้าหน้าที่ธุรการ วุฒิการศึกษาระดับ ปริญญาตรี และปวส. เงินเดือนสูงสุด 18,000 บาท สมัครระหว่าง 20 มิถุนายน - 10 กรกฎาคม 2026',
          original_url: 'https://job.ocsc.go.th/RegisterJob.aspx?id=dnp-forestry2026',
          category: 'พนักงานราชการ',
          education_level: 'ปริญญาตรี',
          region: 'ทั่วประเทศ'
        },
        {
          raw_title: 'กรมป่าไม้ เปิดรับสมัครสอบบรรจุข้าราชการ ตำแหน่งวิชาการป่าไม้ปฏิบัติการ',
          raw_content: 'กรมป่าไม้สรรหาบุคคลเข้ารับราชการ 25 อัตรา วุฒิ ปริญญาตรี วารสารศาสตร์ เกษตรศาสตร์ ปฐพีวิทยา เงินเดือนสตาร์ทที่ 15,000 บาท รับสมัครออนไลน์',
          original_url: 'https://job.ocsc.go.th/RegisterJob.aspx?id=forest-officer-2026',
          category: 'ข้าราชการ',
          education_level: 'ปริญญาตรี',
          region: 'ภาคกลาง'
        }
      ];

      let added = 0;
      let skipped = 0;
      const updatedRaws = [...simRawRows];

      templates.forEach(t => {
        const isDup = updatedRaws.some(r => r.original_url === t.original_url);
        if (isDup) {
          skipped++;
        } else {
          updatedRaws.unshift({
            id: 'raw-' + Math.floor(Math.random() * 1000 + 100),
            raw_title: t.raw_title,
            raw_content: t.raw_content,
            original_url: t.original_url,
            scraped_at: getNowTimestampString(),
            is_processed: false,
            category: t.category,
            education_level: t.education_level,
            region: t.region
          });
          added++;
        }
      });

      setSimRawRows(updatedRaws);
      setIsUrlScraping(false);
      addLog('success', `⚡ [Edge Function Output] บันทึกลงตาราง raw ข้อมูลคัดกรองใหม่สำเร็จ ${added} รายการ (ข้ามคิวรีซ้ำ ${skipped} รายการ)`);
    }, 1500);
  };

  // Launch the Refine & Approve modal using live AI summaries or fallbacks
  const startRefinement = async (rawItem: any) => {
    setSelectedRawItem(rawItem);
    setIsProcessingWithAI(true);
    addLog('info', `🤖 กำลังเปิดระเบียบพิพากษาเรียบเรียง... ส่งส่งข้อมูลเข้าโมเดล Gemini เพื่อสรุปและคัดแยก Metadata โดยอัตโนมัติ`);
    
    try {
      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTitle: rawItem.raw_title,
          rawContent: rawItem.raw_content,
          url: rawItem.original_url
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const parsed = data.data;
        setRefineForm({
          title: parsed.title || rawItem.raw_title,
          category: parsed.category || rawItem.category || 'ข้าราชการ',
          education_level: parsed.education_level || rawItem.education_level || 'ปริญญาตรี',
          region: parsed.region || rawItem.region || 'กรุงเทพมหานคร',
          application_start_date: parsed.application_start_date || getTodayIsoString(),
          application_end_date: parsed.application_end_date || getFutureDateIsoString(15),
          exam_date: parsed.exam_date || '',
          content: parsed.content || `### รายละเอียด\n\n${rawItem.raw_content}`
        });
        addLog('success', `✨ [Gemini AI Analysis Complete] แกะรหัสและดึงแท็กสำเร็จหมวดหมู่: "${parsed.category}" / วุฒิ: "${parsed.education_level}"`);
      } else {
        throw new Error('Fallback triggered');
      }
    } catch (err) {
      // Manual Fallback if AI fails
      setRefineForm({
        title: rawItem.raw_title,
        category: rawItem.category || 'ข้าราชการ',
        education_level: rawItem.education_level || 'ปริญญาตรี',
        region: rawItem.region || 'กรุงเทพมหานคร',
        application_start_date: getTodayIsoString(),
        application_end_date: getFutureDateIsoString(15),
        exam_date: '',
        content: `### รายละเอียด\n\n${rawItem.raw_content}\n\n**ลิงก์ประกาศต้นทาง:** [คลิกชมลิงก์ข้าราชการ](${rawItem.original_url})`
      });
      addLog('success', `⚠️ [Local Rule Parser] ออกค่าพารามิเตอร์จำลองเบื้องต้นสำเร็จสำหรับเอกสารอ้างอิง`);
    } finally {
      setIsProcessingWithAI(false);
    }
  };

  // Publish the Refine form data to jobs table
  const handlePublishJob = () => {
    if (simRole !== 'admin') {
      addLog('error', '⚠️ [RLS VIOLATION] PG System: ไม่สามารถดำเนินการเขียน (INSERT ON jobs) เนื่องจากไม่มีสิทธิ์ ADMIN');
      alert('คุณไม่มีสิทธิ์ความปลอดภัยในระดับแถว (RLS) กรุณาสลับสถานะเป็นแอดมินหรือลงชื่อเข้าใช้งาน');
      return;
    }

    const newJobId = 'job-' + Math.floor(Math.random() * 10000);
    const newJob = {
      id: newJobId,
      title: refineForm.title,
      content: refineForm.content,
      category: refineForm.category,
      education_level: refineForm.education_level,
      region: refineForm.region,
      application_start_date: refineForm.application_start_date,
      application_end_date: refineForm.application_end_date,
      exam_date: refineForm.exam_date || null,
      source_url: selectedRawItem?.original_url || '',
      status: 'published',
      created_at: getNowTimestampString()
    };

    // Update state
    setSimJobs(prev => [newJob, ...prev]);
    if (selectedRawItem) {
      setSimRawRows(prev => prev.map(item => item.id === selectedRawItem.id ? { ...item, is_processed: true } : item));
    }

    addLog('success', `🎉 [PUBLISH SUCCESS] ย้ายข่าวดิบและฝังลงตาราง "jobs" คีย์อารักษ์: ${newJobId} เผยแพร่สู่ประชาชนสำเร็จ!`);
    setSelectedRawItem(null);
  };

  // Scrape manual input link placed in Admin Dashboard
  const handleManualLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrlInput.trim()) {
      alert('กรุณากรอกลิงก์รับสมัครหรือลิงก์ศูนย์ข่าว ก.พ.');
      return;
    }

    setIsUrlScraping(true);
    addLog('info', `🌐 กำลังทดลองเชื่อมต่อและถอดข้อมูลอย่างสุภาพจากลิงก์: ${manualUrlInput}`);
    
    try {
      // Make a guess title based on link pathing or call AI
      const mockTitle = "สำนักงานปลัดกระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม (สป.อว.) รับสมัครบุคคลเข้ารับการเลือกตั้งงานบริการคอมพิวเตอร์";
      
      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTitle: mockTitle,
          rawContent: `ค้นพบจากประกาศสมัครงานด่วนทางออนไลน์: ${manualUrlInput}. ดำเนินการคัดแยกประเภทความรู้สอบแข่งขันวิชาคอมพิวเตอร์ภาคภาษาไทยและภาษาอังกฤษ`,
          url: manualUrlInput
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setScrapedManualResult({
          title: data.data.title || mockTitle,
          category: data.data.category || 'พนักงานราชการ',
          education_level: data.data.education_level || 'ปริญญาตรี',
          region: data.data.region || 'กรุงเทพมหานคร',
          application_start_date: data.data.application_start_date || getTodayIsoString(),
          application_end_date: data.data.application_end_date || getFutureDateIsoString(14),
          exam_date: data.data.exam_date || '',
          content: data.data.content || `คัดลอกจากเบื้องหลังอย่างรวดเร็วเพื่ออำนวยความสะดวกให้ฝ่ายงานทรัพยากรบุคคลต้นสังกัด`,
          source_url: manualUrlInput
        });
        addLog('success', `✅ [Manual Crawler Output] ดึงหัวข้อและคัดกรองเบื้องต้นจาก URL ของ ก.พ. สำเร็จสถิติการดึงรวดเร็ว!`);
      }
    } catch (err) {
      addLog('error', '⚠️ ไม่สามารถประมวลผลข้อมูลหน้ากึ่งแมนนวลนี้ได้ กรุณาร่างโพสต์อย่างรวดเร็วแทน');
    } finally {
      setIsUrlScraping(false);
    }
  };

  // Publish manual scraped job
  const handlePublishManualJob = () => {
    if (!scrapedManualResult) return;
    if (simRole !== 'admin') {
      alert('กรุณาสลับสิทธิ์เป็นแอดมินหรือล็อกอินเข้าใช้ระบบเพื่อแก้ไข');
      return;
    }

    const newJobId = 'job-manual-' + Math.floor(Math.random() * 1000);
    const newJob = {
      id: newJobId,
      title: scrapedManualResult.title,
      content: scrapedManualResult.content,
      category: scrapedManualResult.category,
      education_level: scrapedManualResult.education_level,
      region: scrapedManualResult.region,
      application_start_date: scrapedManualResult.application_start_date,
      application_end_date: scrapedManualResult.application_end_date,
      exam_date: scrapedManualResult.exam_date || null,
      source_url: scrapedManualResult.source_url,
      status: 'published',
      created_at: getNowTimestampString()
    };

    setSimJobs(prev => [newJob, ...prev]);
    
    // Also push to scraped_raw as a processed log element
    const newRawLog = {
      id: 'raw-man-' + Math.floor(Math.random() * 1000 + 100),
      raw_title: scrapedManualResult.title,
      raw_content: scrapedManualResult.content,
      original_url: scrapedManualResult.source_url,
      scraped_at: getNowTimestampString(),
      is_processed: true,
      category: scrapedManualResult.category,
      education_level: scrapedManualResult.education_level,
      region: scrapedManualResult.region
    };
    setSimRawRows(prev => [newRawLog, ...prev]);

    addLog('success', `🎉 [PUBLISH SUCCESS] สร้างและเผยแพร่ข่าวงานแมนนวลจากแหล่งเรียนรู้สำเร็จ (รหัสงาน: ${newJobId})`);
    setScrapedManualResult(null);
    setManualUrlInput('');
  };

  // AI SQL Schema generator custom calls
  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiFeedback('กำลังปรับแต่งคิวรีของท่านและตรวจสอบมาตรฐาน PostgreSQL ด้วย AI Studio...');

    try {
      const response = await fetch('/api/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentSql: sqlContent,
          currentTables: tablesSchema
        })
      });

      const data = await response.json();
      if (data.success) {
        setSqlContent(data.sql);
        if (data.tables) {
          setTablesSchema(data.tables);
        }
        if (data.explanation) {
          setAiFeedback(data.explanation);
        }
        addLog('success', `🪄 [AI Schema Modeler] เรียบเรียงและปรับแก้ไข SQL ใหม่ตามคำขอของคุณเรียบร้อยแล้ว!`);
      } else {
        setAiFeedback(`ตรวจพบข้อกังขา: ${data.explanation || 'โมเดลไม่ตอบรับคำขอ'}`);
        addLog('error', `⚠️ [AI Code Refiner Alert] จัดเรียงสคริปต์แก้ไขไม่ตอบสนองมาตรฐาน`);
      }
    } catch (error) {
      setAiFeedback('ข้อผิดพลาดทางเทคนิคด้านความปลอดภัยเครือข่าย');
      addLog('error', `⚠️ [AI API Linkage failure] การเชื่อมต่อขัดข้อง`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyClipboard = () => {
    const textToCopy = getFilteredSql();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addLog('success', '📋 คัดลอกซอร์สโค้ดและ SQL Script ลงคลิปบอร์ดเครื่องคุณเรียบร้อยแล้ว');
  };

  const deleteRawRowItem = (id: string) => {
    if (simRole !== 'admin') {
      addLog('error', '⚠️ ปฏิเสธการตัดลบบันทึกดิบ:สิทธิ์ RLS คัดค้านนโยบาย "Allow admin full access to scraped_raw"');
      alert('คุณต้องลงชื่อผู้มีสิทธิ์ลบข้อมูลดิบ (ADMIN ONLY)');
      return;
    }
    setSimRawRows(prev => prev.filter(r => r.id !== id));
    addLog('success', `🗑️ นำเอกสารดิบออกจากคลังประวัติ "scraped_raw" สำเร็จ (ID: ${id})`);
  };

  const deletePublishedJobItem = (id: string) => {
    if (simRole !== 'admin') {
      addLog('error', '⚠️ ปฏิเสธสิทธิ์การถอนประกาศ: แผนสิทธิ์แอดมินค้านนโยบายการลบ "Allow admin to delete jobs"');
      alert('สิทธิ์เขียน/ลบ จำกัดเฉพาะแอดมิน (ADMIN ONLY)');
      return;
    }
    setSimJobs(prev => prev.filter(j => j.id !== id));
    addLog('success', `🗑️ ลบประกาศที่เผยแพร่ออกจากระบบ "jobs" ถาวรแล้ว (ID: ${id})`);
  };

  const getFilteredSql = () => {
    if (activeSqlTab === 'all') return sqlContent;

    const lines = sqlContent.split('\n');
    let output: string[] = [];

    if (activeSqlTab === 'tables') {
      let capture = false;
      for (const line of lines) {
        if (line.includes('CREATE TABLE') || line.includes('CREATE EXTENSION')) {
          capture = true;
        }
        if (capture) {
          output.push(line);
        }
        if (capture && (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('ALTER TABLE') || line.includes('CREATE POLICY'))) {
          output.pop();
          capture = false;
        }
      }
      if (output.length === 0) return sqlContent;
      return output.join('\n');
    }

    if (activeSqlTab === 'rls') {
      let capture = false;
      for (const line of lines) {
        if (line.includes('ENABLE ROW LEVEL SECURITY') || line.includes('CREATE POLICY') || line.includes('ALTER TABLE')) {
          capture = true;
        }
        if (capture) {
          output.push(line);
        }
        if (capture && (line.includes('CREATE INDEX'))) {
          output.pop();
          capture = false;
        }
      }
      return output.join('\n');
    }

    if (activeSqlTab === 'indexes') {
      let capture = false;
      for (const line of lines) {
        if (line.includes('CREATE INDEX')) {
          capture = true;
        }
        if (capture) {
          output.push(line);
        }
      }
      return output.join('\n');
    }

    if (activeSqlTab === 'edge-function') {
      return DEFAULT_EDGE_FUNCTION;
    }

    return sqlContent;
  };

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="relative">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 p-4 rounded-3xl shadow-2xl shadow-amber-500/20 flex items-center justify-center border border-amber-400/30">
              <Database className="w-8 h-8 animate-pulse" />
            </div>
            <div className="absolute -inset-1.5 rounded-3xl bg-amber-500/10 blur opacity-75 animate-ping -z-10"></div>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight mt-4">
              THAI GOVERNMENT RECRUITS
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 animate-pulse">
              ระบบศูนย์ข้อมูลกลาง กำลังเชื่อมต่อฐานข้อมูลความปลอดภัย...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 font-sans leading-relaxed flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* State-of-the-art Royal Thai Gov Administration Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl py-4.5 px-6 sticky top-0 z-40 shadow-xl shadow-slate-950/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 p-3 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center border border-amber-400/30 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-500/10 text-amber-400 text-[10px] tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase">
                  Supabase Backend
                </span>
                <span className="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse"></div> Local SQLite Emulator
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                Thai Government Recruits <span className="text-amber-500 font-normal text-xs md:text-sm bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10 tracking-normal font-sans">Command Center</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium max-w-2xl mt-0.5">
                ระบบจัดการและเรียบเรียงงานราชการไทยอัจฉริยะที่เชื่อมต่อ Supabase Auth, ตาราง <code className="bg-slate-800 text-amber-300 font-bold rounded px-1 font-mono text-xs">scraped_raw</code> และระบบสรุปย่อด้วย Gemini AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/40 p-1.5 rounded-2xl border border-slate-800/80">
            {/* Main Toggle View */}
            <button
              id="btn-toggle-to-dashboard"
              onClick={() => setCurrentView('admin-dashboard')}
              className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-350 flex items-center gap-2 cursor-pointer ${currentView === 'admin-dashboard' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/10 scale-[1.02]' : 'hover:bg-slate-800/60 text-slate-400'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              แผงควบคุมระบบ (Admin Panel)
            </button>
            <button
              id="btn-toggle-to-public"
              onClick={() => setCurrentView('public-view')}
              className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-350 flex items-center gap-2 cursor-pointer ${currentView === 'public-view' ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/10 scale-[1.02]' : 'hover:bg-slate-800/60 text-slate-400'}`}
            >
              <Briefcase className="w-4 h-4" />
              มุมมองผู้สมัครทั่วไป (Public View)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Render Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RIGHT SIDEBAR / LOG TERMINAL (4 cols across) shown mainly on Dashboard mode */}
        <div id="sim-terminal-sidebar" className="lg:col-span-4 flex flex-col gap-5 order-2 lg:order-1">
          {currentView === 'admin-dashboard' ? (
            <>
              {/* Supabase JWT & RLS Simulator Status Details */}
              <div className="bg-slate-900/45 backdrop-blur-md rounded-3xl p-5.5 border border-slate-800/95 shadow-lg flex flex-col gap-4">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />
                  ตัวจำลองสิทธิ์ความปลอดภัย (Supabase RLS Simulator)
                </h3>
                
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/60">
                  <button
                    onClick={() => setSimRole('admin')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${simRole === 'admin' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' : 'hover:bg-slate-900 text-slate-400'}`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    ADMIN ROLE
                  </button>
                  <button
                    onClick={() => setSimRole('guest')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${simRole === 'guest' ? 'bg-slate-800 text-white shadow-inner font-black' : 'hover:bg-slate-900 text-slate-400'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    ANON GUEST
                  </button>
                </div>

                <div className="text-xs text-slate-400 space-y-2.5">
                  <div className="flex justify-between items-center bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                    <span className="font-medium text-[11px] text-slate-400">สัญญะ Token RLS:</span>
                    <span className={`font-black text-[11px] px-2.5 py-1 rounded-lg ${simRole === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-300'}`}>
                      {simRole === 'admin' ? '🛡️ แอดมินกลาง (BYPASS)' : '🔒 บุคคลภายนอก (READ-ONLY)'}
                    </span>
                  </div>
                  <div className="leading-relaxed bg-slate-950/40 p-3 rounded-2xl border border-slate-800/40 text-[11px]">
                    <span className="text-amber-500 font-bold block mb-1">💡 ข้อมูลระเบียบระบบ:</span>
                    กฎความปลอดภัยแบบ Row Level Security สั่งการให้สิทธิ์อ่านแทร็กดิบ <code className="font-mono text-amber-200 bg-slate-900/90 px-1 py-0.5 rounded text-[10px]">scraped_raw</code> มีผลเฉพาะแอดมินเท่านั้น หากสลับเป็น GUEST จะถูกบล็อกด้วยฐานข้อมูลทันที
                  </div>
                </div>

                {isLoggedIn && (
                  <div className="border-t border-slate-800/80 pt-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 w-8.5 h-8.5 rounded-2xl flex items-center justify-center text-xs font-black shadow-md border border-white/10">
                          AD
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-1.5 border-slate-900"></div>
                      </div>
                      <div className="truncate max-w-[140px]">
                        <p className="text-xs font-bold text-white leading-normal truncate">{username}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Session Active</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2 px-3.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      title="Logout From Supabase Auth"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      ออกระบบ Auth
                    </button>
                  </div>
                )}
              </div>

              {/* Database Server Live Simulator Logs Terminal */}
              <div className="bg-[#0b101b] rounded-3xl border border-slate-800 p-5 shadow-2xl flex-1 flex flex-col gap-3 min-h-[340px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block shadow-sm"></span>
                      <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-sm"></span>
                      <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-sm"></span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono font-bold tracking-tight pl-2">supabase_pg_command_center</span>
                  </div>
                  <button
                    onClick={() => setSimLogs([])}
                    className="text-[10.5px] text-slate-500 hover:text-slate-300 font-bold transition-colors cursor-pointer"
                  >
                    ล้างหน้าจอ
                  </button>
                </div>

                <div 
                  id="sandbox-terminal-pre" 
                  className="flex-1 font-mono text-[11px] text-slate-300 overflow-y-auto space-y-3 max-h-[360px] select-text scrollbar-thin scrollbar-thumb-slate-800 pr-1"
                >
                  {simLogs.length === 0 ? (
                    <div className="text-slate-600 text-center py-10 flex flex-col items-center justify-center gap-2">
                      <div className="w-1.5 h-3 bg-slate-500 animate-pulse"></div>
                      <span className="text-[10px]">-- เปล่าเปลี่ยว พร้อมดำเนินการจำลอง SQL --</span>
                    </div>
                  ) : (
                    simLogs.map((log, idx) => (
                      <div key={idx} className="leading-snug border-l-2 border-slate-800 pl-2">
                        <span className="text-slate-500 text-[9.5px]">[{log.timestamp}]</span>{' '}
                        <span className={`font-extrabold mr-1 ${log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {log.type === 'success' ? '✔' : log.type === 'error' ? '✖' : 'ℹ'}
                        </span>{' '}
                        <span className="text-slate-200">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick scraping catalyst to help tests */}
                <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2">
                  <button
                    onClick={triggerScrapeJobs}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/5 duration-300 flex items-center justify-center gap-2 cursor-pointer scale-100 hover:scale-[1.01]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                    รันบอท Crawler สแกนข่าวสะสม (scrape-ocsc-jobs)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* PUBLIC APPLICANT SIDEBAR INFO */}
              <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-5.5 border border-slate-800/90 shadow-lg flex flex-col gap-4">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  หลักความโปร่งใสและสิทธิ์ข้อมูลทั่วไป
                </h3>
                <div className="bg-emerald-500/5 p-3.5 rounded-2xl border border-emerald-500/10 flex flex-col gap-2 text-xs text-emerald-300">
                  <p className="font-bold flex items-center gap-1.5 text-[12px] text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50"></span>
                    สั่นพ้องผ่านกฎ PostgreSQL RLS
                  </p>
                  <p className="leading-relaxed text-[11px] text-slate-400">
                    เว็บไซต์รับสมัครสอบส่วนหน้า (Public Viewer) ดึงสืบค้นข้อมูลโดยตรงจากตารางถาวร <code className="bg-slate-950 text-emerald-300 rounded px-1.5 py-0.5 font-mono text-[10px]">jobs</code> เผยแพร่ตำแหน่งงานให้ประชาชนสากลทราบอย่างเสมอภาค
                  </p>
                  <p className="leading-relaxed text-[11px] text-slate-400 border-t border-slate-800 mt-2 pt-2">
                    🔒 สิทธิ์เขียน อนุมัติ หรือลบทิ้ง ถูกจำกัดสิทธิ์เด็ดขาดผ่านการเช็ค JWT Token ของแอดมินเท่านั้น (Blocked Writes to Guest)
                  </p>
                </div>
              </div>

              {/* CATEGORY COUNTERS SUMMARY CARD */}
              <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-5.5 border border-slate-800/90 shadow-lg flex flex-col gap-4">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  ตัวกรองแยกประเภทงานหลัก
                </h3>
                
                <div className="flex flex-col gap-2 text-xs">
                  <button 
                    onClick={() => setPublicSelectedCategory('all')} 
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${publicSelectedCategory === 'all' ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-extrabold border-transparent shadow-md shadow-sky-500/10 scale-102' : 'bg-slate-950/80 hover:bg-slate-800/60 border-slate-800/60 text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      ทุกตำแหน่งงานราชการ
                    </span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${publicSelectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {simJobs.filter(j => j.status === 'published').length} อัตรา
                    </span>
                  </button>

                  <button 
                    onClick={() => setPublicSelectedCategory('ข้าราชการ')} 
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${publicSelectedCategory === 'ข้าราชการ' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold border-transparent shadow-md shadow-blue-500/10 scale-102' : 'bg-slate-950/80 hover:bg-slate-800/60 border-slate-800/60 text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      ข้าราชการพลเรือนสามัญ
                    </span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${publicSelectedCategory === 'ข้าราชการ' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'}`}>
                      {simJobs.filter(j => j.status === 'published' && j.category === 'ข้าราชการ').length} อัตรา
                    </span>
                  </button>

                  <button 
                    onClick={() => setPublicSelectedCategory('พนักงานราชการ')} 
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${publicSelectedCategory === 'พนักงานราชการ' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold border-transparent shadow-md shadow-amber-500/10 scale-102' : 'bg-slate-950/80 hover:bg-slate-800/60 border-slate-800/60 text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      พนักงานราชการทั่วไป
                    </span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${publicSelectedCategory === 'พนักงานราชการ' ? 'bg-slate-950/60 text-slate-800' : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'}`}>
                      {simJobs.filter(j => j.status === 'published' && j.category === 'พนักงานราชการ').length} อัตรา
                    </span>
                  </button>

                  <button 
                    onClick={() => setPublicSelectedCategory('ลูกจ้าง')} 
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${publicSelectedCategory === 'ลูกจ้าง' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-extrabold border-transparent shadow-md shadow-indigo-500/10 scale-102' : 'bg-slate-950/80 hover:bg-slate-800/60 border-slate-800/60 text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      ลูกจ้างชั่วคราว/พนักงานจ้าง
                    </span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${publicSelectedCategory === 'ลูกจ้าง' ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'}`}>
                      {simJobs.filter(j => j.status === 'published' && j.category === 'ลูกจ้าง').length} อัตรา
                    </span>
                  </button>
                </div>
              </div>

              {/* Google AdSense Sidebar component */}
              <AdSenseBlock slot="adsense-sidebar-widget" type="sidebar" />
            </>
          )}
        </div>

        {/* LEFT WORKSPACE / MAIN WORKFLOW AREA (8 cols across) */}
        <div id="main-view-workspace" className="lg:col-span-8 flex flex-col gap-6 order-1 lg:order-2">

          {/* VIEW 1: ADMIN DASHBOARD */}
          {currentView === 'admin-dashboard' && (
            <div className="flex flex-col gap-6">

              {/* Check authentication state first. If logged out, show simulated login card */}
              {!isLoggedIn ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-md flex flex-col items-center justify-center py-12 max-w-xl mx-auto w-full">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-full text-amber-600 mb-4">
                    <Lock className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 text-center">เข้าสู่ระบบแอดมินกลาง (กรมข่าวรับสมัครงาน)</h2>
                  <p className="text-xs text-slate-500 text-center mt-1 mb-6 max-w-sm">
                    ลงชื่อเข้าใช้ด้วยระบบข้อมูลความปลอดภัย Supabase Authenticated เพื่ออนุมัติจัดการข่าวและเขียนประกาศตารางข้อมูลถาวร
                  </p>

                  <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">บัญชีแอดมินผู้ดูแล (Email Address)</label>
                      <input
                        type="email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        placeholder="admin@ocsc.go.th"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่านลับ (Password)</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        placeholder="••••••••••••"
                      />
                    </div>

                    {loginError && (
                      <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> {loginError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-900/10 transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {isLoggingIn ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> กำลังตรวจสอบสารบบ...
                        </>
                      ) : (
                        <>
                          ลงชื่อเข้าใช้งาน <ArrowRight className="w-4 h-4 text-amber-500" />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-[10px] text-slate-400 mt-6 leading-relaxed text-center">
                    * บัญชีสาธิตพร้อมเชื่อมต่อ: <strong>admin@ocsc-gov.go.th</strong> รหัสผ่าน <strong>supabaseAdmin2026!</strong>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  
                  {/* Admin Tab Navigation */}
                  <div className="flex border border-slate-800 bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl shadow-lg gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveAdminTab('detect-news')}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeAdminTab === 'detect-news' ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' : 'hover:bg-slate-800/50 text-slate-400'}`}
                    >
                      <Sparkles className="w-4 h-4" />
                      ตรวจจับข่าวใหม่ (scraped_raw)
                      {simRawRows.filter(r => !r.is_processed).length > 0 && (
                        <span className="bg-rose-500 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse">
                          {simRawRows.filter(r => !r.is_processed).length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveAdminTab('url-scraper')}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeAdminTab === 'url-scraper' ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' : 'hover:bg-slate-800/50 text-slate-400'}`}
                    >
                      <LinkIcon className="w-4 h-4" />
                      วางลิงก์ดึงข่าวด่วน (Quick URL)
                    </button>

                    <button
                      onClick={() => setActiveAdminTab('published-jobs')}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeAdminTab === 'published-jobs' ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' : 'hover:bg-slate-800/50 text-slate-400'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      งานราชการที่อนุมัติแล้ว (Jobs Table)
                    </button>

                    <button
                      onClick={() => setActiveAdminTab('sql-schema')}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeAdminTab === 'sql-schema' ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' : 'hover:bg-slate-800/50 text-slate-400'}`}
                    >
                      <FileText className="w-4 h-4" />
                      โครงสร้าง SQL & Config
                    </button>
                  </div>

                  {/* SUBTAB 1: DETECT NEWS */}
                  {activeAdminTab === 'detect-news' && (
                    <div className="flex flex-col gap-4">
                      
                      {/* Top instruction segment */}
                      <div className="bg-slate-900/40 backdrop-blur-md p-5.5 rounded-3xl border border-slate-800 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h2 className="text-lg font-black text-white flex items-center gap-2">
                              ตรวจจับหัดกรองข่าวสาร (Table: <code className="font-mono text-xs bg-slate-950 text-rose-400 px-2 py-0.5 rounded border border-rose-500/10">scraped_raw</code>)
                            </h2>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                              คลังสารสนเทศตรวจจับข่าวและประกาศด่วนดิบที่ดิ่งเข้ามาด้วยบอทหรือการสแกนอัตโนมัติ รอทีมแอดมินใช้ปัญญาประดิษฐ์สกัด และแปลงสารบัญลงฐานข้อมูลถาวร
                            </p>
                          </div>
                          
                          <button
                            onClick={triggerScrapeJobs}
                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg shadow-amber-500/10 transition-all duration-300 shrink-0 flex items-center gap-2 cursor-pointer scale-100 hover:scale-102"
                          >
                            <RefreshCw className="w-4 h-4" />
                            ดึงข่าวใหม่ผ่านบอท ก.พ.
                          </button>
                        </div>
                      </div>

                      {/* Raw entries list */}
                      <div className="flex flex-col gap-3.5">
                        {simRawRows.filter(r => !r.is_processed).length === 0 ? (
                          <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-14 text-center flex flex-col items-center justify-center gap-4">
                            <div className="p-4 bg-slate-900 rounded-full text-slate-500">
                              <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
                            </div>
                            <h3 className="text-base font-bold text-white">ตรวจสอบวิเคราะห์ลุล่วงหมดสิ้นสพรรพคลังแล้ว!</h3>
                            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                              ไม่มีข่าวดิบตกค้างรอประมวลผล คุณสามารถทดลองกดปุ่ม &quot;ดึงข่าวใหม่ผ่านบอท ก.พ.&quot; ด้านบนเพื่อจำลองข้อมูลเข้าตารางถัดไปได้ทันที
                            </p>
                          </div>
                        ) : (
                          simRawRows.filter(r => !r.is_processed).map((item) => (
                            <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col gap-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                      {item.category || 'ประเภทงานดิบ'}
                                    </span>
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                      <GraduationCap className="w-3 h-3 text-slate-500" />
                                      {item.education_level || 'ป.ตรี'}
                                    </span>
                                    <span className="text-slate-400 text-[10px] font-medium flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      เวลาที่บอทเก็บ: {item.scraped_at}
                                    </span>
                                  </div>
                                  <h4 className="font-extrabold text-[#111827] text-[15px] leading-snug">
                                    {item.raw_title}
                                  </h4>
                                  <p className="text-xs text-slate-500 line-clamp-3">
                                    {item.raw_content}
                                  </p>
                                </div>

                                <div className="flex flex-col gap-1.5 shrink-0">
                                  <button
                                    onClick={() => startRefinement(item)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    เรียบเรียงและอนุมัติ
                                  </button>
                                  <button
                                    onClick={() => deleteRawRowItem(item.id)}
                                    className="bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 font-bold text-xs p-2 rounded-xl transition-all flex items-center justify-center border border-slate-100 cursor-pointer"
                                    title="ลบข้อมูลข่าวทิ้งจากสารบบดิบ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-400">
                                <span className="truncate max-w-[250px] font-mono">
                                  คลังอ้างอิง: {item.original_url}
                                </span>
                                <a 
                                  href={item.original_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-amber-600 font-bold flex items-center gap-1 hover:underline"
                                >
                                  ดูประกาศต้นฉบับจริง <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                  {/* SUBTAB 2: QUICK URL INPUT */}
                  {activeAdminTab === 'url-scraper' && (
                    <div className="flex flex-col gap-5">
                      
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                            <LinkIcon className="w-5 h-5 text-emerald-500" />
                            วางลิงก์ข่าวเพื่อดึงข้อมูลด่วนจากเว็บ สำนักงาน ก.พ.
                          </h2>
                          <p className="text-xs text-slate-500 mt-1">
                            ป้อนยูอาร์แอลหรือสิทธิ์ข่าวประกาศจากสำนักงานคณะกรรมการข้าราชการพลเรือน (ก.พ.) แล้วสกัดข้อมูลด้วย AI เพื่อจัดกลุ่มและร่างความพร้อมด่วน
                          </p>
                        </div>

                        <form onSubmit={handleManualLinkSubmit} className="flex gap-2">
                          <input
                            type="url"
                            required
                            value={manualUrlInput}
                            onChange={(e) => setManualUrlInput(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 font-mono"
                            placeholder="ตัวอย่าง: https://job.ocsc.go.th/RegisterJob.aspx?id=office-2026-commission"
                          />
                          <button
                            type="submit"
                            disabled={isUrlScraping}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all flex items-center gap-1 shrink-0"
                          >
                            {isUrlScraping ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'สแกนดึงด่วน'
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Display scraped metadata or draft frame ready to adjust */}
                      {scrapedManualResult && (
                        <div className="bg-white border-2 border-dashed border-emerald-500 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                          
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 px-2.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full">
                                AI Extracted Ripe
                              </span>
                              <span className="text-slate-400 text-[10px] font-mono">
                                URL target: {scrapedManualResult.source_url}
                              </span>
                            </div>
                            <button
                              onClick={() => setScrapedManualResult(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              ยกเลิกการร่าง
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อจัดเกลาเรียบเรียงใหม่</label>
                              <input
                                type="text"
                                value={scrapedManualResult.title}
                                onChange={(e) => setScrapedManualResult({...scrapedManualResult, title: e.target.value})}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่คัดเกรด</label>
                              <select
                                value={scrapedManualResult.category}
                                onChange={(e) => setScrapedManualResult({...scrapedManualResult, category: e.target.value})}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                              >
                                <option value="ข้าราชการ">ข้าราชการ (Civil Servant)</option>
                                <option value="พนักงานราชการ">พนักงานราชการ (Government Officer)</option>
                                <option value="ลูกจ้าง">ลูกจ้างชั่วคราว/รายปี (Employee)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">ระดับวุฒิการศึกษา</label>
                              <select
                                value={scrapedManualResult.education_level}
                                onChange={(e) => setScrapedManualResult({...scrapedManualResult, education_level: e.target.value})}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                              >
                                <option value="ปริญญาตรี">ปริญญาตรี</option>
                                <option value="ปริญญาโท">ปริญญาโท</option>
                                <option value="ปริญญาเอก">ปริญญาเอก</option>
                                <option value="ปวส.">ปวส. / ปวช.</option>
                                <option value="ปวช.">ปวช.</option>
                                <option value="ม.3 / ม.6">มัธยมปลาย (ม.3 / ม.6)</option>
                                <option value="ทั่วประเทศ">ไม่จำกัดวุฒิ</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">วันที่เริ่มต้นรับสมัคร</label>
                              <input
                                type="date"
                                value={scrapedManualResult.application_start_date}
                                onChange={(e) => setScrapedManualResult({...scrapedManualResult, application_start_date: e.target.value})}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">วันที่สิ้นสุดปิดรับสมัคร</label>
                              <input
                                type="date"
                                value={scrapedManualResult.application_end_date}
                                onChange={(e) => setScrapedManualResult({...scrapedManualResult, application_end_date: e.target.value})}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                              />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-xs font-bold text-slate-700 mb-1">ข้อมูลรายละเอียดงานย่อราชการ</label>
                              <textarea
                                rows={4}
                                value={scrapedManualResult.content}
                                onChange={(e) => setScrapedManualResult({...scrapedManualResult, content: e.target.value})}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                              />
                            </div>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-2xl text-[11px] text-slate-500">
                            * เมื่อกดปุ่มและโพสต์เข้าระบบทันที ข้อมูลจะถูกจัดเข้าในฐานข้อมูลหลักตาราง <strong>jobs</strong> และเพิ่มบันทึกความจำนงเป็นหลักฐานในระบบเรียบร้อย
                          </div>

                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setScrapedManualResult(null)}
                              className="border px-4 py-2.5 rounded-xl text-slate-600 font-bold"
                            >
                              รีเซ็ตทิ้ง
                            </button>
                            <button
                              onClick={handlePublishManualJob}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" /> สร้างโพสต์และ Publish
                            </button>
                          </div>

                        </div>
                      )}

                    </div>
                  )}

                  {/* SUBTAB 3: PUBLISHED JOBS LIST TABLE */}
                  {activeAdminTab === 'published-jobs' && (
                    <div className="flex flex-col gap-4">
                      
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                        <h2 className="text-lg font-bold text-slate-900">คลังประกาศงานราชการฉบับทางการ (Table: <code className="font-mono text-xs bg-slate-100 text-emerald-600 px-1 rounded">jobs</code>)</h2>
                        <p className="text-xs text-slate-500 mt-1">
                          ตารางบันทึกประกาศสอบข้าราชการที่ผ่านการกลั่นกรอง เรียบเรียง AI และอนุมัติจารึกถาวร พร้อมเผยแพร่แก่คนทำงานและผู้เตรียมสอบทั่วคาบสมุทรไทย
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {simJobs.length === 0 ? (
                          <div className="bg-white border rounded-3xl p-10 text-center text-slate-400 text-xs">
                            ไม่มีตำแหน่งงานที่เผยแพร่นอนนิ่งในอาร์เรย์ตอนชั่วคราว
                          </div>
                        ) : (
                          simJobs.map(job => (
                            <div key={job.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col gap-3.5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200/20">
                                      {job.category}
                                    </span>
                                    <span className="bg-sky-50 text-sky-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-sky-100">
                                      {job.region || 'ทั่วไทย'}
                                    </span>
                                    <span className="bg-indigo-50 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                      {job.education_level || 'ป.ตรี'}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-[15px] text-slate-950 mt-1">{job.title}</h4>
                                </div>
                                <button
                                  onClick={() => deletePublishedJobItem(job.id)}
                                  className="text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-all border border-slate-100 hover:bg-slate-50 cursor-pointer"
                                  title="ปิดสิทธิ์และลบงานถาวร"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="bg-slate-50 p-3.5 rounded-2xl text-xs text-slate-600 whitespace-pre-wrap leading-relaxed border border-slate-100">
                                {job.content}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                                <div>
                                  <span className="block text-slate-400 font-medium">วันเริ่มต้นรับสมัคร:</span>
                                  <span className="font-semibold text-slate-700">{job.application_start_date || 'ไม่ระบุ'}</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-medium">วันสิ้นสุดรับสมัคร:</span>
                                  <span className="font-semibold text-slate-700">{job.application_end_date || 'ไม่ระบุ'}</span>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <span className="block text-slate-400 font-medium">แหล่งพึ่งพิงข้อมูลดั้งเดิม:</span>
                                  <a href={job.source_url} target="_blank" rel="noreferrer" className="text-amber-600 font-semibold truncate block hover:underline">
                                    {job.source_url || 'ไม่มีบันทึก'}
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                  {/* SUBTAB 4: SQL STRUCTURAL VIEWER */}
                  {activeAdminTab === 'sql-schema' && (
                    <div className="flex flex-col gap-5">
                      
                      {/* AI Generator Integration Panel */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-5 h-5 text-amber-500" />
                          <h3 className="font-extrabold text-sm text-slate-950">
                            ปรับปรุงแก้ไขโครงสร้างตารางด้วย AI Studio Engine
                          </h3>
                        </div>
                        <form onSubmit={handleAskAI} className="flex gap-2">
                          <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            placeholder="เช่น 'แก้ไขตาราง jobs ให้เพิ่มระดับเงินเดือนเริ่มต้นและสิ้นสุด' หรือ 'เพิ่มฟังก์ชันค้นหาตำแหน่งงานตามวุฒิและภูมิภาค'"
                          />
                          <button
                            type="submit"
                            disabled={aiLoading}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all shrink-0"
                          >
                            {aiLoading ? 'กำลังปรับแก้...' : 'ปรับโครงสร้าง'}
                          </button>
                        </form>
                        {aiFeedback && (
                          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-[11px] text-slate-600 mt-3 font-mono leading-relaxed max-h-[120px] overflow-y-auto">
                            {aiFeedback}
                          </div>
                        )}
                      </div>

                      {/* Code Area */}
                      <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-800">
                        <div className="border-b border-slate-800 p-4.5 bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-amber-400 font-bold text-xs tracking-wide uppercase">PostgreSQL SQL Script</span>
                            <span className="text-slate-500 text-[10px] block mt-0.5">คัดลอกนำไฟฝังลงใน SQL Editor ของ Supabase Project ได้เลย</span>
                          </div>
                          
                          <div className="flex gap-1 bg-slate-800/80 p-1.5 rounded-xl">
                            <button
                              onClick={() => setActiveSqlTab('all')}
                              className={`px-3 py-1 text-[10.5px] rounded-lg font-bold transition-all cursor-pointer ${activeSqlTab === 'all' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                              แสดงทั้งหมด
                            </button>
                            <button
                              onClick={() => setActiveSqlTab('tables')}
                              className={`px-3 py-1 text-[10.5px] rounded-lg font-bold transition-all cursor-pointer ${activeSqlTab === 'tables' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                              โครงสร้างตาราง
                            </button>
                            <button
                              onClick={() => setActiveSqlTab('rls')}
                              className={`px-3 py-1 text-[10.5px] rounded-lg font-bold transition-all cursor-pointer ${activeSqlTab === 'rls' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                              สิทธิ์ RLS
                            </button>
                            <button
                              onClick={() => setActiveSqlTab('edge-function')}
                              className={`px-3 py-1 text-[10.5px] rounded-lg font-bold transition-all cursor-pointer ${activeSqlTab === 'edge-function' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                              Edge Function
                            </button>
                          </div>
                        </div>

                        <div className="p-5 bg-slate-950 font-mono text-[11px] text-slate-200 leading-relaxed overflow-x-auto select-all max-h-[480px]">
                          <pre>{getFilteredSql()}</pre>
                        </div>

                        <div className="border-t border-slate-800 p-4 bg-slate-900 flex justify-between items-center">
                          <span className="text-[10px] text-slate-500">
                            * ตารางมีความปลอดภัยสูงด้วย Row Level Security สูงสุด
                          </span>
                          <button
                            onClick={handleCopyClipboard}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-500" />}
                            {copied ? 'คัดลอกสำเร็จ!' : 'คัดลอกโค้ด SQL ร้อนๆ'}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* VIEW 2: PUBLIC APPLICANT WORKSPACE */}
          {currentView === 'public-view' && (
            <div className="flex flex-col gap-5">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-2">
                <span className="bg-sky-50 text-sky-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-sky-200/50 w-max">
                  Thai Citizens Recruitment portal
                </span>
                <h2 className="text-xl font-bold text-[#1e293b]">คลังข่าวสารรับสมัครงานและสอบราชการ</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  บริการสถิติและคลังสืบค้นข้อมูลตำแหน่งงานของกระทรวง ทบวง กรม ทุกหน่วยงานรัฐบาล ดำเนินการคัดตรวจสอบวิเคราะห์อย่างซื่อตรงจากบอทของสำนักงาน ก.พ. สู่ประชาชน
                </p>
              </div>

              {/* Advanced job filters for user ease */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white/70 backdrop-blur-md p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400 font-medium"
                    placeholder="สืบค้นชื่อหน่วยงาน ความรู้ความสามารถ..."
                  />
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <Tag className="w-4 h-4 text-[#d97706]" />
                  <span className="text-xs text-slate-500 font-medium">ประเภท: ข้าราชการ / ทั่วไทย</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <GraduationCap className="w-4 h-4 text-[#2563eb]" />
                  <span className="text-xs text-slate-500 font-medium">วุฒิสมัคร: ปริญญาตรี / โท</span>
                </div>
              </div>

              {/* Real and Simulated Jobs List inside public view */}
              <div className="flex flex-col gap-4">
                {simJobs.filter(j => j.status === 'published').length === 0 ? (
                  <div className="bg-white border rounded-3xl p-12 text-center text-slate-400 text-xs">
                    ไม่พบประกาศงานราชการวิเคราะห์เรียบร้อย ณ ขณะนี้ดึงข้อมูล
                  </div>
                ) : (
                  simJobs.filter(j => j.status === 'published').map(job => (
                    <div key={job.id} className="bg-white border border-slate-200 hover:border-slate-300 transition-all rounded-3xl p-6 shadow-xs flex flex-col gap-4">
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200/50">
                              {job.category}
                            </span>
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              จังหวัด {job.region}
                            </span>
                            <span className="bg-indigo-50 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                              ระดับ {job.education_level || 'ปริญญาตรี'}
                            </span>
                          </div>
                          
                          <h3 className="font-extrabold text-[#0f172a] text-lg leading-snug mt-1">
                            {job.title}
                          </h3>
                        </div>

                        <div className="flex flex-col text-[11px] text-slate-400 text-left sm:text-right font-medium">
                          <span>วันสิ้นสุดโพสต์สมัคร</span>
                          <span className="text-rose-600 font-extrabold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full text-[10.5px] mt-1 pr-3 w-max sm:ml-auto">
                            <Calendar className="w-3.5 h-3.5" />
                            {job.application_end_date}
                          </span>
                        </div>
                      </div>

                      {/* Content block with nice text padding */}
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {job.content}
                      </p>

                      <div className="bg-slate-50 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-100 text-xs">
                        <div className="space-y-1">
                          <p className="text-slate-400 font-medium">
                            * ตารางคิวรีสอบสัมภาษณ์ / บรรจุคัดเลือก:
                          </p>
                          <p className="font-extrabold text-slate-800 flex items-center gap-1">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            วันที่จัดคัดเลือก: {job.exam_date || 'ไม่ขอนัดหมาย (พิจารณาจากแฟ้มคุณวุฒิ)'}
                          </p>
                        </div>

                        <a
                          href={job.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 px-5 rounded-xl text-center shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
                        >
                          เยี่ยมชมรายละเอียด PDF จริง <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        </a>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Refinement & Gemini AI Processing modal screen */}
      {selectedRawItem && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-[15px]">เรียบเรียงและสรุปเนื้อหาอัจฉริยะ (Gemini Engine)</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">คัดกรองข้อมูลดิบพร้อมคัดลอกคุณวุฒิเพื่อเตรียมจัดเก็บลงฐานข้อมูล</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRawItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isProcessingWithAI ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                  <p className="text-xs text-slate-600 font-bold">กำลังติดต่อกับ Gemini เพื่อถอดหัวข้อและคัดกรองแท็ก...</p>
                  <p className="text-[10px] text-slate-400">กรุณารอสักครู่ (ไม่เกิน 5 วินาที)</p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-700 mb-1">ข้อมูลดิบที่บอทเก็บกวาดมา:</p>
                    {selectedRawItem.raw_title}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อประกาศขัดเกลาใหม่เพื่อประชาชน</label>
                      <input
                        type="text"
                        value={refineForm.title}
                        onChange={(e) => setRefineForm({...refineForm, title: e.target.value})}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่ขงสรรพกำลัง</label>
                      <select
                        value={refineForm.category}
                        onChange={(e) => setRefineForm({...refineForm, category: e.target.value})}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-medium text-slate-800"
                      >
                        <option value="ข้าราชการ">ข้าราชการ</option>
                        <option value="พนักงานราชการ">พนักงานราชการ</option>
                        <option value="ลูกจ้าง">ลูกจ้างชั่วคราว/รายเดือน</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ระดับวุฒิการศึกษาสอบ</label>
                      <select
                        value={refineForm.education_level}
                        onChange={(e) => setRefineForm({...refineForm, education_level: e.target.value})}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-medium text-slate-800"
                      >
                        <option value="ปริญญาตรี">ปริญญาตรี</option>
                        <option value="ปริญญาโท">ปริญญาโท</option>
                        <option value="ปริญญาเอก">ปริญญาเอก</option>
                        <option value="ปวส.">ปวส.</option>
                        <option value="ปวช.">ปวช.</option>
                        <option value="ม.3 / ม.6">มัธยม (ม.3 / ม.6)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">พื้นที่พืกปฏิบัติงาน</label>
                      <input
                        type="text"
                        value={refineForm.region}
                        onChange={(e) => setRefineForm({...refineForm, region: e.target.value})}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">วันคัดเลือกทดสอบ (ถ้ามี)</label>
                      <input
                        type="date"
                        value={refineForm.exam_date}
                        onChange={(e) => setRefineForm({...refineForm, exam_date: e.target.value})}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">วันที่รับสมัครสอบเริ่มต้น</label>
                      <input
                        type="date"
                        value={refineForm.application_start_date}
                        onChange={(e) => setRefineForm({...refineForm, application_start_date: e.target.value})}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">วันสิ้นสุดปิดรับสมัครสอบ</label>
                      <input
                        type="date"
                        value={refineForm.application_end_date}
                        onChange={(e) => setRefineForm({...refineForm, application_end_date: e.target.value})}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none text-slate-800"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">เนื้อหารายละเอียดเผยแพร่สรุปย่อ</label>
                      <textarea
                        rows={6}
                        value={refineForm.content}
                        onChange={(e) => setRefineForm({...refineForm, content: e.target.value})}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none text-slate-800 font-medium font-sans"
                      />
                    </div>
                  </div>

                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">เมื่อคลิกเผยแพร่ ข้อมูลชุดนี้จะมีสถานะประมวลผลแล้ว (is_processed = true)</span>
              
              <div className="flex gap-2.5">
                <button
                  onClick={() => setSelectedRawItem(null)}
                  className="px-4 py-2.5 rounded-xl border font-bold text-slate-600 transition-colors"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={handlePublishJob}
                  disabled={isProcessingWithAI}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> อนุมัติ & Publish ทันที
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Public Applicant Job Details Modal */}
      {publicSelectedJob && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="public-job-detail-modal">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/40 via-white to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-full ${publicSelectedJob.category === 'ข้าราชการ' ? 'bg-blue-100 text-blue-600' : publicSelectedJob.category === 'พนักงานราชการ' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400 block">Government Active Posting</span>
                  <h3 className="font-extrabold text-slate-950 text-base">{publicSelectedJob.category} — {publicSelectedJob.region}</h3>
                </div>
              </div>
              <button 
                onClick={() => setPublicSelectedJob(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-blue-50 text-blue-800 text-[10.5px] font-bold px-3 py-0.5 rounded-full border border-blue-100">
                    🏢 {publicSelectedJob.category}
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-[10.5px] font-bold px-3 py-0.5 rounded-full">
                    📍 จังหวัด {publicSelectedJob.region}
                  </span>
                  <span className="bg-indigo-50 text-indigo-800 text-[10.5px] font-bold px-3 py-0.5 rounded-full">
                    🎓 ได้รับวุฒิ {publicSelectedJob.education_level || 'ปริญญาตรี'}
                  </span>
                </div>
                <h1 className="text-[#0f172a] font-extrabold text-xl md:text-2xl mt-1 leading-snug">
                  {publicSelectedJob.title}
                </h1>
              </div>

              {/* Countdown Alert Panel */}
              {(() => {
                const todayVal = new Date('2026-06-07'); // virtual current time Jun 7, 2026
                const endVal = new Date(publicSelectedJob.application_end_date);
                const diffTime = endVal.getTime() - todayVal.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
                
                if (diffDays > 0) {
                  return (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase font-mono font-bold text-emerald-700 tracking-wide">เร่งระงับเวลาการเสนอชื่อเข้ารับราชการ</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">เหลือเวลาส่งเอกสารสมัครสอบอีก <span className="text-emerald-600 font-extrabold text-[14px]">{diffDays} วัน</span> ถ้วน!</p>
                      </div>
                      <div className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full animate-bounce">
                        ก้าวรุดหน้า
                      </div>
                    </div>
                  );
                } else if (diffDays === 0) {
                  return (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase font-mono font-bold text-amber-700 tracking-wider">วันสิ้นรับสิทธิเฉลยการเปิดรับสมัครสอบ</p>
                        <p className="text-xs font-bold text-amber-800 mt-0.5">⚠️ สิ้นสุดและปิดรับข้อเสนอสมัครสอบภายในเย็นวันนี้!</p>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase font-mono font-bold text-rose-700 tracking-wider">สถานะการเสนอตัวรับสมัคร</p>
                        <p className="text-xs font-bold text-rose-800 mt-0.5">🔒 ปิดกล่องรับสมัครตามประกาศราชการแล้ว</p>
                      </div>
                    </div>
                  );
                }
              })()}

              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">รายละเอียดและข้อมูลความสามารถ:</h4>
                <div className="p-4.5 bg-slate-50 border border-slate-100 rounded-2xl whitespace-pre-wrap leading-relaxed text-slate-700 text-xs font-sans">
                  {publicSelectedJob.content}
                </div>
              </div>

              {/* AdSense Inline block inside the active content view */}
              <AdSenseBlock slot="adsense-inline-job-modal" type="inline" />

              {/* Date tables summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">รอบคัดเลือกลงทะเบียนรับสมัคร:</span>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-1">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    {publicSelectedJob.application_start_date} ถึง {publicSelectedJob.application_end_date}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">กำหนดวันและค่ายทดสอบข้อเขียน:</span>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {publicSelectedJob.exam_date || 'ไม่ขอนัดหมาย (พิจารณาจากแฟ้มคุณวุฒิ)'}
                  </span>
                </div>
              </div>

            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex sm:flex-row items-center justify-between gap-4">
              <span className="text-[10.5px] text-slate-400 font-medium">รหัสอ้างอิงตำแหน่ง: OCSC-{publicSelectedJob.id}</span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setPublicSelectedJob(null)}
                  className="px-4.5 py-2.5 rounded-xl border bg-white hover:bg-slate-100 font-bold text-slate-600 text-xs transition-colors cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <a
                  href={publicSelectedJob.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  ยื่นเอกสาร / ดาวน์โหลด PDF ทางการ <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Aesthetic Footer Credit */}
      <footer className="border-t border-slate-200 py-6 text-center text-[11px] text-slate-500 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-medium">
          <p>© 2026 คณะกรรมการบริหารจัดการข้อมูลอรรถประโยชน์สาธารณะและสถิติตำแหน่งงาน</p>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">พจนานุกรมความรับผิดชอบ</span>
            <span className="hover:underline cursor-pointer">เอกสารวิจัยมาตรฐาน RLS</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
