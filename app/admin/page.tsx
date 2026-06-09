'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Building2,
  Coins,
  X,
  Briefcase
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  DEFAULT_SQL, 
  DEFAULT_TABLES, 
  DEFAULT_EDGE_FUNCTION, 
  DEFAULT_RAW_ROWS, 
  DEFAULT_JOBS,
  getTodayIsoString,
  getFutureDateIsoString,
  getNowTimestampString,
  getNowTimeString,
  extractAgencyFromTitle,
  parseSalaryFromContent
} from '@/lib/constants';
import { AdSenseBlock } from '@/components/AdSenseBlock';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // Stay authenticated similarly to old mockup default
  const [username, setUsername] = useState<string>('admin@ocsc-gov.go.th');
  const [password, setPassword] = useState<string>('supabaseAdmin2026!');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Mode state for navigation active view highlights
  const currentView = 'admin-dashboard';

  // Admin Subsections: 'detect-news' | 'url-scraper' | 'published-jobs' | 'sql-schema'
  const [activeAdminTab, setActiveAdminTab] = useState<'detect-news' | 'url-scraper' | 'published-jobs' | 'sql-schema'>('detect-news');

  // Schema state
  const [sqlContent, setSqlContent] = useState<string>(DEFAULT_SQL);
  const [tablesSchema, setTablesSchema] = useState<any>(DEFAULT_TABLES);
  const [activeSqlTab, setActiveSqlTab] = useState<'all' | 'tables' | 'rls' | 'indexes' | 'edge-function'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  // Persistent shared state synced with localStorage
  const [simRawRows, setSimRawRows] = useState<any[]>(DEFAULT_RAW_ROWS);
  const [simJobs, setSimJobs] = useState<any[]>(DEFAULT_JOBS);

  const [simLogs, setSimLogs] = useState<any[]>([
    { timestamp: '17:12:00', type: 'info', message: 'ริเริ่มจำลองระบบหลังบ้านความปลอดภัยกองบัญชาการกรมการจัดหางานภาครัฐ (Supabase RLS Protected)' },
    { timestamp: '17:12:15', type: 'success', message: 'Supabase Auth Handshake: ตรวจพบคุกกี้และสิทธิ์ผู้ดลบันดาล "admin@ocsc-gov.go.th" บล็อกแอดมินปลดม่าน' }
  ]);

  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  // Safe client hydration from localStorage
  useEffect(() => {
    const storedRaws = localStorage.getItem('gov_sim_raw_rows');
    const storedJobs = localStorage.getItem('gov_sim_jobs');
    const storedLogs = localStorage.getItem('gov_sim_logs');
    
    let parsedRaws = DEFAULT_RAW_ROWS;
    let parsedJobs = DEFAULT_JOBS;
    let parsedLogs = [
      { timestamp: '17:12:00', type: 'info', message: 'ริเริ่มจำลองระบบหลังบ้านความปลอดภัยกองบัญชาการกรมการจัดหางานภาครัฐ (Supabase RLS Protected)' },
      { timestamp: '17:12:15', type: 'success', message: 'Supabase Auth Handshake: ตรวจพบคุกกี้และสิทธิ์ผู้ดลบันดาล "admin@ocsc-gov.go.th" บล็อกแอดมินปลดม่าน' }
    ];

    if (storedRaws) {
      try { parsedRaws = JSON.parse(storedRaws); } catch (e) { console.error(e); }
    }
    if (storedJobs) {
      try { parsedJobs = JSON.parse(storedJobs); } catch (e) { console.error(e); }
    }
    if (storedLogs) {
      try { parsedLogs = JSON.parse(storedLogs); } catch (e) { console.error(e); }
    }

    setTimeout(() => {
      setSimRawRows(parsedRaws);
      setSimJobs(parsedJobs);
      setSimLogs(parsedLogs);
      setHasHydrated(true);
    }, 0);
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

  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem('gov_sim_logs', JSON.stringify(simLogs));
    }
  }, [simLogs, hasHydrated]);

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

  // Run Web scraping using our server-side API (Next.js server scraper)
  const triggerScrapeJobs = async (source: 'ocsc' | 'pragard' | 'all' = 'all') => {
    const sourceLabel = source === 'ocsc' ? 'สำนักงาน ก.พ.' : source === 'pragard' ? 'ประกาศผลสอบ.com' : 'ทุกแหล่งเว็บไซต์พร้อมกัน';
    addLog('info', `🔌 รันระบบ Scraper เรียกดึงข้อมูลจาก: ${sourceLabel}...`);
    setIsUrlScraping(true);
    
    try {
      // ดึงรายการ URL เพื่อส่งไปตรวจสอบตัดซ้ำ (De-duplication) ที่ฝั่งเซิร์ฟเวอร์
      const existingUrls = simRawRows.map(r => r.original_url).concat(simJobs.map(j => j.source_url || ''));

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, existingUrls })
      });

      const result = await res.json();
      if (result.success && result.data) {
        const newlyAdded = result.data;
        if (newlyAdded.length > 0) {
          setSimRawRows(prev => [...newlyAdded, ...prev]);
        }
        addLog('success', `⚡ [Scraper Output] ${result.message}`);
      } else {
        throw new Error(result.error || 'การประมวลดึงข้อมูลขัดข้องทางระบบหลังบ้าน');
      }
    } catch (err: any) {
      addLog('error', `❌ เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message || 'การเช็คสัญญานขัดข้อง'}`);
    } finally {
      setIsUrlScraping(false);
    }
  };

  // Launch the Refine & Approve modal using live AI summaries or fallbacks
  const startRefinement = async (rawItem: any) => {
    setSelectedRawItem(rawItem);
    setIsProcessingWithAI(true);
    addLog('info', `🤖 กำลังตรวจสอบคัดประเภท... ส่งข้อมูลเข้าโมเดล Gemini เพื่อสรุปและแยกแยกคีย์ฟิลด์อัตโนมัติ`);
    
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
        addLog('success', `✨ [Gemini AI Analysis Complete] สรุปคัดฟิลด์สำเร็จ: ประเภท: "${parsed.category}" / วุฒิ: "${parsed.education_level}"`);
      } else {
        throw new Error('Fallback triggered');
      }
    } catch (err) {
      setRefineForm({
        title: rawItem.raw_title,
        category: rawItem.category || 'ข้าราชการ',
        education_level: rawItem.education_level || 'ปริญญาตรี',
        region: rawItem.region || 'กรุงเทพมหานคร',
        application_start_date: getTodayIsoString(),
        application_end_date: getFutureDateIsoString(15),
        exam_date: '',
        content: `### รายละเอียด\n\n${rawItem.raw_content}\n\n**ลิงก์ประกาศต้นทาง:** ${rawItem.original_url}`
      });
      addLog('success', `⚠️ [Local Rule Parser] กำหนดพารามิเตอร์จำลองเบื้องต้นสืบเนื่องจากการเชื่อมต่อ AI ขัดข้อง`);
    } finally {
      setIsProcessingWithAI(false);
    }
  };

  // Publish the Refine form data to jobs table
  const handlePublishJob = () => {
    if (simRole !== 'admin') {
      addLog('error', '⚠️ [RLS VIOLATION] PG System: ไม่สามารถบันทึก เนื่องจากไม่มีสิทธิ์เขียนระดับคีย์ผู้ใช้ระดับ ADMIN');
      alert('คุณไม่มีสิทธิ์ความปลอดภัยในระดับแถว (RLS) กรุณาสลับสิทธิ์เป็นแอดมินหรือล็อกอินเข้าใช้ระบบ');
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

    setSimJobs(prev => [newJob, ...prev]);
    if (selectedRawItem) {
      setSimRawRows(prev => prev.map(item => item.id === selectedRawItem.id ? { ...item, is_processed: true } : item));
    }

    addLog('success', `🎉 [PUBLISH SUCCESS] อนุมัติย้ายลงตาราง "jobs" คีย์หลัก: ${newJobId} เผยแพร่ผู้สมัครสำเร็จ!`);
    setSelectedRawItem(null);
  };

  // Scrape manual input link placed in Admin Dashboard
  const handleManualLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrlInput.trim()) {
      alert('กรุณากรอกลิงก์รับสมัครข่าวสารสแกนเนอร์');
      return;
    }

    setIsUrlScraping(true);
    addLog('info', `🌐 กำลังเชื่อมต่อเบื้องหลังอย่างสุภาพด้วยสแกนเนอร์ลิงก์ที่วาง: ${manualUrlInput}`);
    
    try {
      const mockTitle = "สำนักงานปลัดกระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม (สป.อว.) รับสมัครบุคคลเข้ารับการเลือกตั้งงานบริการคอมพิวเตอร์";
      
      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTitle: mockTitle,
          rawContent: `วิเคราะห์โครงสร้างเว็บบอร์ดสำนักงาน ก.พ. ลิงก์: ${manualUrlInput}. ดำเนินการคัดสำเนาและสังเคราะห์ข้อมูลรายละเอียดเพื่อยกระดับความสะดวก`,
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
          content: data.data.content || 'คัดลอกจากรายละเอียดทางการต้นทางเพื่ออำนวยความสะดวกการคีย์จัดกลุ่ม',
          source_url: manualUrlInput
        });
        addLog('success', `✅ [Manual Crawler Output] ดึงพาดหัวและสกัดรายละเอียดสำเร็จรวดเร็ว!`);
      }
    } catch (err) {
      addLog('error', '⚠️ ไม่สามารถประมวลผลลิงก์เฉพาะนี้ได้ คลีนแบบแมนนวลแทน');
    } finally {
      setIsUrlScraping(false);
    }
  };

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

    addLog('success', `🎉 [PUBLISH SUCCESS] โพสต์ตารางสอบแมนนวลสำเร็จ รหัสงาน: ${newJobId}`);
    setScrapedManualResult(null);
    setManualUrlInput('');
  };

  // AI SQL Schema generator custom calls
  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiFeedback('กำลังถอดสูตรคำสั่งและแก้ไข schema ด้วยปัญญาประดิษฐ์ AI Studio...');

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
        addLog('success', `🪄 [AI Schema Modeler] เรียบเรียงและเขียน SQL Script มโนทัศน์ร่วมกับโครงสร้างจริงสัมฤทธิ์ผล!`);
      } else {
        setAiFeedback(`ตรวจพบข้อกังขา: ${data.explanation || 'โมเดลไม่ตอบรับคำขอ'}`);
        addLog('error', `⚠️ [AI Code Refiner Alert] จัดเรียงสคริปต์ล้มเหลว`);
      }
    } catch (error) {
      setAiFeedback('มีสัญญาณรบกวนการเชื่อมต่อ API');
      addLog('error', `⚠️ [AI API Linkage Failure] เชื่อมต่อล้มเหลว`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyClipboard = () => {
    const textToCopy = getFilteredSql();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addLog('success', '📋 ซอร์สบอร์ด SQL โครงสร้างถูกคัดลอกลงกระดาษความจำแล้ว');
  };

  const deleteRawRowItem = (id: string) => {
    if (simRole !== 'admin') {
      addLog('error', '⚠️ ปฏิเสธการตัดลบประวัติ: สิทธิ์ความปลอดภัยระเบียบ RLS ไม่อนุญาตบุคคลภายนอกลบ scraped_raw');
      alert('สิทธิ์การจัดการบล็อกดิบลบจำกัดเฉพาะแอดมิน (ADMIN ONLY)');
      return;
    }
    setSimRawRows(prev => prev.filter(r => r.id !== id));
    addLog('success', `🗑️ นำคีย์สารบบดิบออกจากหน่วย "scraped_raw" สำเร็จ (ID: ${id})`);
  };

  const deletePublishedJobItem = (id: string) => {
    if (simRole !== 'admin') {
      addLog('error', '⚠️ ปฏิเสธการลบประกาศ: สิทธิ์ RLS ไม่อนุญาตบุคคลภายนอกแก้ไข/ลบข้อมูลเผยแพร่');
      alert('คุณไม่มีสิทธิ์ระดับเขียนบนตารางจัดจ้างทั่วไป จำเป็นต้องสลับเป็นผู้ดูแลกลาง');
      return;
    }
    setSimJobs(prev => prev.filter(j => j.id !== id));
    addLog('success', `🗑️ ตัดดึงประกาศงานถาวรออกจากตาราง "jobs" เรียบร้อยแล้ว (ID: ${id})`);
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

    return sqlContent;
  };

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <Database className="w-8 h-8 text-amber-500 animate-pulse" />
          <h1 className="text-xl font-black text-white">กำลังตรวจสอบความปลอดภัยแอดมินพาเนล...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 font-sans leading-relaxed flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Brand Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl py-4.5 px-6 sticky top-0 z-40 shadow-xl shadow-slate-950/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-amber-500 text-slate-950 p-3 rounded-2xl shadow-lg flex items-center justify-center border border-amber-300/30 relative">
              <Database className="w-7 h-7 text-amber-950" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-500/10 text-amber-400 text-[10px] tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase">
                  Supabase Command Center
                </span>
                <span className="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg animate-pulse"></div> แอดมินล็อกอินสมบูรณ์
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                แผงควบคุมระบบ (Admin Dashboard)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/40 p-1.5 rounded-2xl border border-slate-800/80">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-350 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/10 scale-[1.02]"
            >
              <ShieldCheck className="w-4 h-4" />
              แผงควบคุมระบบ (Admin Panel)
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-350 flex items-center gap-2 text-slate-400 hover:bg-slate-800/60"
            >
              <Briefcase className="w-4 h-4" />
              มุมมองผู้สมัครทั่วไป (Public View)
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RIGHT SIDEBAR / LOG TERMINAL (4 cols across) */}
        <div id="sim-terminal-sidebar" className="lg:col-span-4 flex flex-col gap-5 order-2 lg:order-1">
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
                กฎความปลอดภัยแบบ Row Level Security สั่งการให้สิทธิ์อ่านและประเมินผลตาราง <code className="font-mono text-amber-200 bg-slate-900/90 px-1 py-0.5 rounded text-[10px]">scraped_raw</code> มีผลเฉพาะแอดมินเท่านั้น หากสับเป็นกุมภาพันธ์เสรีจะล็อกทันที
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
                    <p className="text-[10px] text-emerald-400 font-medium tracking-tight">สิทธิ์ความคุมระบบเต็มเม็ดหน่วย</p>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2 bg-slate-950 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-950/10 border border-slate-800/40 transition-colors cursor-pointer"
                  title="ลงชื่อออก"
                >
                  <LogLevelIcon type="error" />
                </button>
              </div>
            )}
          </div>

          {/* Database simulation monitoring logs console */}
          <div className="bg-[#03060a] rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-md shadow-emerald-500 animate-ping"></div>
                <h3 className="font-mono font-bold text-[11px] uppercase tracking-wider text-slate-300">Supabase Logs (ตารางธุรกรรมเลียนแบบ)</h3>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Handshake Live</span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-[10.5px] leading-relaxed flex flex-col gap-2 bg-[#020407] h-[250px]">
              {simLogs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                  <div className="flex gap-1.5">
                    <span className={`font-black shrink-0 ${log.type === 'success' ? 'text-emerald-500' : log.type === 'error' ? 'text-rose-500' : 'text-blue-400'}`}>
                      {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : 'ℹ'}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-900/10 border-t border-slate-800/50 flex justify-between items-center">
              <span className="text-[9px] text-slate-500 font-mono">Row level actions tracked</span>
              <button 
                onClick={() => setSimLogs([{ timestamp: getNowTimeString(), type: 'info', message: 'รีเซ็ตล้างอักขรตู้ล็อกกลางสำเร็จ สารรับประกันความเรียบร้อย' }])}
                className="text-[9.5px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                Clear Log
              </button>
            </div>
          </div>
        </div>

        {/* LEFT WORKSPACE / MAIN WORKFLOW AREA (8 cols across) */}
        <div id="main-view-workspace" className="lg:col-span-8 flex flex-col gap-6 order-1 lg:order-2">
          
          {/* Admin view check */}
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                    placeholder="admin@ocsc.go.th"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่านลับ (Password)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
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
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> กำลังตรวจสอบสารรักษาสิทธิ์...
                    </>
                  ) : (
                    <>
                      ลงชื่อเข้าใช้งาน <ArrowRight className="w-4 h-4 text-amber-500" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-[10px] text-slate-400 mt-6 leading-relaxed text-center">
                * บัญชีสาธิตสำหรับแผงควบคุมหลัก: <strong>admin@ocsc-gov.go.th</strong> รหัสผ่าน <strong>supabaseAdmin2026!</strong>
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

              {/* TAB 1: DETECT NEWS */}
              {activeAdminTab === 'detect-news' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-7 rounded-3xl border border-slate-800 shadow-xl">
                    <span className="bg-amber-400/10 text-amber-400 text-[9.5px] font-black px-3 py-1 rounded-full border border-amber-400/20 inline-block uppercase tracking-wider">
                      Database Web Scraper (Next.js Server-Authenticated)
                    </span>
                    <h2 className="text-xl font-black text-white mt-2 flex items-center gap-2">
                      <Database className="w-5 h-5 text-amber-400" />
                      ระบบควบคุมสัญญาน Scraper สั่งดึงข่าวสารปฐมภูมิ
                    </h2>
                    <p className="text-xs text-slate-350 leading-relaxed mt-1.5 font-sans">
                      หน่วยบัญชาการกลางสำหรับดึงประกาศรับสมัครงานและข่าวสารราชการไทยโดยตรงจากเว็บไซต์ต้นทางแบบออโตเมติก ระบบจะคัดกรองจัดสัดส่วนและทำการเช็คซ้ำ (De-duplication) ผ่าน URL ต้นทาง ก่อนจะเตรียมจารึกลงระบบตรวจสอบเพื่อให้แอดมินอนุมัติใช้งาน
                    </p>

                    <div className="mt-5 border-t border-slate-800/80 pt-4">
                      <p className="text-xs text-amber-400 font-bold mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> สั่งทำงานดึงข่าวสารแมนนวลจำแนกตามเป้าหมาย (Manual Operations):
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* ปุ่มดึง OCSC */}
                        <button
                          onClick={() => triggerScrapeJobs('ocsc')}
                          disabled={isUrlScraping}
                          className="bg-[#1e293b] hover:bg-slate-700/85 text-slate-100 font-extrabold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 text-blue-400 ${isUrlScraping ? 'animate-spin' : ''}`} />
                          ดึงข้อมูลจาก ก.พ.
                        </button>

                        {/* ปุ่มดึง ประกาศผลสอบ */}
                        <button
                          onClick={() => triggerScrapeJobs('pragard')}
                          disabled={isUrlScraping}
                          className="bg-[#1e293b] hover:bg-slate-700/85 text-slate-100 font-extrabold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 text-emerald-450 ${isUrlScraping ? 'animate-spin' : ''}`} />
                          ดึง ประกาศผลสอบ.com
                        </button>

                        {/* ปุ่มดึง ทุกแหล่งพร้อมกัน */}
                        <button
                          onClick={() => triggerScrapeJobs('all')}
                          disabled={isUrlScraping}
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/10 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 text-slate-950 ${isUrlScraping ? 'animate-spin' : ''}`} />
                          ดึงข้อมูลจากทุกแหล่งพร้อมกัน
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {simRawRows.filter(r => !r.is_processed).length === 0 ? (
                      <div className="bg-slate-900/10 border border-slate-800 border-dashed rounded-3xl p-12 text-center text-slate-400 text-xs">
                        🎉 ขจัดความกังวล! ไม่มีข่าวดิบรอสรุปคัดประเภทแล้ว ทุกข่าวสารในกองบัญชาการได้รับการอนุมัติเผยแพร่หมดจด
                      </div>
                    ) : (
                      simRawRows.filter(r => !r.is_processed).map((raw) => (
                        <div key={raw.id} className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 transition-all">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-slate-800/50 pb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="bg-rose-500/10 text-rose-405 text-[9.5px] font-black px-2 py-0.5 rounded-md border border-rose-550/15">
                                  รอยืนยันประเภทงาน (Raw Format)
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">ดึงไฟล์เมื่อ: {raw.scraped_at}</span>
                              </div>
                              <h3 className="font-extrabold text-white text-sm sm:text-base leading-snug">{raw.raw_title}</h3>
                            </div>

                            <button 
                              onClick={() => deleteRawRowItem(raw.id)}
                              className="p-1.5 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                              title="ลบข่าวดิบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="bg-[#03060b] p-3 rounded-xl border border-slate-800/50 font-mono text-[11px] text-slate-400 line-clamp-3">
                            {raw.raw_content}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/30 p-2 rounded-xl">
                            <div className="text-[11px] text-slate-500">
                              ลิงก์เป้าหมายหลัก: <a href={raw.original_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{raw.original_url}</a>
                            </div>

                            <button
                              onClick={() => startRefinement(raw)}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-transform hover:scale-102 cursor-pointer shadow"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                              ให้ Gemini AI วิเคราะห์สรุป & อนุมัติเผยแพร่
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MANUAL URL SCRAPER */}
              {activeAdminTab === 'url-scraper' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-lg">
                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20 inline-block uppercase">
                      Manual Crawler Portal
                    </span>
                    <h2 className="text-lg font-black text-white mt-1">วางลิงก์สมัครสอบตรง (Quick URL Scraper)</h2>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      พบลิงก์รับสมัครหรือประกวดราคาบนเว็บ ก.พ. หรือข่าวจังหวัดอื่นใดที่คุณต้องการแปลงโฉมทันที? วางลิงก์นี้ลงไป เพื่อเปิดโมเดลจำลองการดูดเนื้อหาและเรียบเรียงเป็นระเบียบถาวร
                    </p>

                    <form onSubmit={handleManualLinkSubmit} className="mt-5 flex flex-col sm:flex-row gap-3">
                      <input
                        type="url"
                        required
                        value={manualUrlInput}
                        onChange={(e) => setManualUrlInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500/20 text-white focus:outline-none"
                        placeholder="https://job.ocsc.go.th/RegisterJob.aspx?id=your-link..."
                      />
                      <button
                        type="submit"
                        disabled={isUrlScraping}
                        className="bg-blue-600 hover:bg-blue-550 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0"
                      >
                        {isUrlScraping ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> บอทกำลังดึงข้อมูล...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4" /> วิเคราะห์ URL ด่วน
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {scrapedManualResult && (
                    <div className="bg-slate-900/40 p-5 rounded-3xl border border-blue-500/20 shadow-xl flex flex-col gap-4.5 animate-fade-in">
                      <div className="flex justify-between items-center bg-blue-500/5 p-3 rounded-2xl border border-blue-550/15">
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 p-0.5 rounded-full" />
                          <span className="text-xs font-black text-white">ประมวลเนื้อหาจาก ลิงก์ที่กำหนด สำเร็จเรียบร้อย!</span>
                        </div>
                        <button 
                          onClick={() => setScrapedManualResult(null)}
                          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">หัวข้อประกาศ (Generated Title)</label>
                          <input 
                            type="text" 
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white w-full font-bold focus:outline-none" 
                            value={scrapedManualResult.title}
                            onChange={(e) => setScrapedManualResult({ ...scrapedManualResult, title: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">ประเภท</label>
                            <select 
                              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white w-full focus:outline-none"
                              value={scrapedManualResult.category}
                              onChange={(e) => setScrapedManualResult({ ...scrapedManualResult, category: e.target.value })}
                            >
                              <option value="ข้าราชการ">ข้าราชการ</option>
                              <option value="พนักงานราชการ">พนักงานราชการ</option>
                              <option value="ลูกจ้าง">ลูกจ้าง</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">วุฒิที่จำนงค์</label>
                            <input 
                              type="text" 
                              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white w-full focus:outline-none"
                              value={scrapedManualResult.education_level}
                              onChange={(e) => setScrapedManualResult({ ...scrapedManualResult, education_level: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">ภูมิภาค / จังหวัด</label>
                          <input 
                            type="text" 
                            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white w-full focus:outline-none"
                            value={scrapedManualResult.region}
                            onChange={(e) => setScrapedManualResult({ ...scrapedManualResult, region: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">เริ่มรับสมัคร</label>
                          <input 
                            type="date" 
                            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white w-full focus:outline-none"
                            value={scrapedManualResult.application_start_date}
                            onChange={(e) => setScrapedManualResult({ ...scrapedManualResult, application_start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">สิ้นสุดรับสมัคร</label>
                          <input 
                            type="date" 
                            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white w-full focus:outline-none"
                            value={scrapedManualResult.application_end_date}
                            onChange={(e) => setScrapedManualResult({ ...scrapedManualResult, application_end_date: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">เนื้อหาคำอธิบายสัมประสิทธิ์</label>
                        <textarea 
                          className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 w-full min-h-[120px] font-sans focus:outline-none"
                          value={scrapedManualResult.content}
                          onChange={(e) => setScrapedManualResult({ ...scrapedManualResult, content: e.target.value })}
                        />
                      </div>

                      <div className="flex justify-end gap-2 border-t border-slate-800/50 pt-4">
                        <button 
                          onClick={() => setScrapedManualResult(null)}
                          className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all"
                        >
                          ล้างรายการ
                        </button>
                        <button
                          onClick={handlePublishManualJob}
                          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow transition-transform hover:scale-102 flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4 text-slate-950" />
                          อนุมัติลงประกาศบนเว็บ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PUBLISHED JOBS */}
              {activeAdminTab === 'published-jobs' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-900/45 backdrop-blur-md p-5 rounded-3xl border border-slate-800 shadow-md">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20 inline-block uppercase">
                      Jobs Table Monitor
                    </span>
                    <h2 className="text-lg font-black text-white mt-1">ประกาศเผยแพร่ปัจจุบันที่เป็นสากล (Jobs database records)</h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      ตารางเปรียบเทียบข้อมูลจริงที่บันทึกถาวรลงในฐานข้อมูลความปลอดภัยเพื่อแสดงผลให้ประชาชนคัดกรอง ยึดอิงความเข้มแข็งของระบบสิทธิ์ (Row Level Security)
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {simJobs.map(job => (
                      <div key={job.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4.5 flex gap-4.5 items-center justify-between">
                        <div className="space-y-1 truncate max-w-[80%]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-blue-600/15 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-md border border-blue-500/20">
                              {job.category}
                            </span>
                            <span className="text-slate-500 text-[10.5px] font-mono">ID: {job.id}</span>
                            <span className="text-[10px] text-emerald-400 font-bold font-mono">● PUBLISHED</span>
                          </div>
                          <h4 className="font-extrabold text-white text-xs sm:text-sm truncate">{job.title}</h4>
                          <p className="text-[10.5px] text-slate-400 font-mono">วุฒิ: {job.education_level} | จังหวัด: {job.region} | สมัครช่วง: {job.application_start_date} ถึง {job.application_end_date}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link 
                            href={`/jobs/${job.id}`}
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-850"
                            title="ดูหน้าย่อย"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => deletePublishedJobItem(job.id)}
                            className="p-2 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-xl transition-all border border-slate-850"
                            title="ถอนประกาศ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SQL SCHEMA DESIGN */}
              {activeAdminTab === 'sql-schema' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 shadow-lg">
                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/15 inline-block uppercase">
                      Supabase SQL Configurator
                    </span>
                    <h2 className="text-lg font-black text-white mt-1">โครงสร้างสร้างตาราง และ นโยบาย Row Level Security</h2>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      แผงแสดงสคริปต์ SQL ที่ใช้จัดตั้งใน Supabase Console ประกอบด้วยฟิลด์อ้างอิง, ข้อมูลทริกเกอร์อัปเดตเวลารวมไปถึงแผนสิทธิ์ความปลอดภัยซึ่งบล็อกการลักลอบแฮกเกอร์เขียนข้อมูล
                    </p>
                  </div>

                  {/* AI Assistant Prompter for SQL */}
                  <div className="bg-gradient-to-br from-[#0c121e] to-[#0d1624] p-5 rounded-3xl border border-slate-800 shadow-md flex flex-col gap-3.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                      <h3 className="font-extrabold text-xs tracking-wider uppercase text-slate-200">AI SQL Schema Adjuster (ผู้ช่วยตกแต่งสคริปต์)</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      เขียนสิ่งที่ต้องการปรับแต่งในฐานข้อมูล เช่น &ldquo;เพิ่มตาราง log ทาสคิวประมวลผล&rdquo; หรือ &ldquo;เพิ่มฟิลด์อัตราว่างในตาราง jobs&rdquo; เพื่อให้ผู้ช่วยปัญญาประดิษฐ์ออกแบบ DDL รันคำสั่งทันที!
                    </p>

                    <form onSubmit={handleAskAI} className="flex gap-2.5">
                      <input
                        type="text"
                        required
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                        placeholder="กรุณาร่างข้อความ เช่น 'เพิ่มคอล์มเนชันอัตราว่างว่าง...'"
                      />
                      <button
                        type="submit"
                        disabled={aiLoading}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow cursor-pointer shrink-0"
                      >
                        {aiLoading ? 'กำลังประดิดจูน...' : 'ปรับแก้ SQL'}
                      </button>
                    </form>

                    {aiFeedback && (
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-350 whitespace-pre-wrap leading-relaxed mt-1">
                        {aiFeedback}
                      </div>
                    )}
                  </div>

                  {/* Live SQL view tabs inside Admin dashboard */}
                  <div className="bg-[#020509] rounded-3xl border border-slate-800 overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button 
                          onClick={() => setActiveSqlTab('all')}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold ${activeSqlTab === 'all' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                        >
                          schema.sql (ทั้งหมด)
                        </button>
                        <button 
                          onClick={() => setActiveSqlTab('tables')}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold ${activeSqlTab === 'tables' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                        >
                          ตารางฐานข้อมูล
                        </button>
                        <button 
                          onClick={() => setActiveSqlTab('rls')}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold ${activeSqlTab === 'rls' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                        >
                          Security Policies (RLS)
                        </button>
                        <button 
                          onClick={() => setActiveSqlTab('indexes')}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold ${activeSqlTab === 'indexes' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                        >
                          Performance Indexes
                        </button>
                        <button 
                          onClick={() => setActiveSqlTab('edge-function')}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold ${activeSqlTab === 'edge-function' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                        >
                          Edge Function Code
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={handleCopyClipboard}
                          className="text-[10px] font-bold text-slate-250 bg-slate-850 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-all duration-200 border border-slate-800/80 flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? <Check className="w-4.5 h-4.5 text-emerald-400" /> : <Copy className="w-4.5 h-4.5 text-slate-400" />}
                          {copied ? 'คัดลอกแล้ว!' : 'Copy Code'}
                        </button>
                      </div>
                    </div>

                    <pre className="p-5 font-mono text-[11px] text-slate-350 bg-[#010306] overflow-x-auto whitespace-pre-wrap leading-relaxed h-[380px] border-b border-slate-800/50">
                      <code>{getFilteredSql()}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* REFINEMENT AND AI EXCHANGING DIALOGUE MODAL */}
      {selectedRawItem && (
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 animate-scale-up">
            <div className="p-4.5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-450 animate-pulse" />
                <h3 className="font-extrabold text-sm text-white">ถอดสมการเรียงเรียงวิชาการ (AI Refinement Suite)</h3>
              </div>
              <button 
                onClick={() => setSelectedRawItem(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5.5 overflow-y-auto flex flex-col gap-4">
              {isProcessingWithAI ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-4.5">
                  <RefreshCw className="w-9 h-9 text-amber-500 animate-spin" />
                  <div>
                    <h4 className="font-bold text-white text-base">Gemini กำลังสแกนคัดฟิลด์และสลักข้อความ...</h4>
                    <p className="text-xs text-slate-400 mt-1">ระบบกำลังเรียบเรียงเนื้อหาสอบแข่ง โฟกัสดอกจันสำคัญ อัตราค่าจ้าง รวมไปถึงภูมิภาควิถีธรรม</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">หัวข้อข่าวดิบตั้งต้น:</p>
                    <p className="text-xs font-black text-slate-200 leading-snug">{selectedRawItem.raw_title}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-bold uppercase">หัวข้อประกาศฉบับสรุป</label>
                      <input 
                        type="text" 
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none"
                        value={refineForm.title}
                        onChange={(e) => setRefineForm({ ...refineForm, title: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-bold uppercase">ประเภทจัดจ้าง</label>
                        <select 
                          className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white w-full focus:outline-none"
                          value={refineForm.category}
                          onChange={(e) => setRefineForm({ ...refineForm, category: e.target.value })}
                        >
                          <option value="ข้าราชการ">ข้าราชการ</option>
                          <option value="พนักงานราชการ">พนักงานราชการ</option>
                          <option value="ลูกจ้าง">ลูกจ้าง</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-bold uppercase">วุฒิการศึกษา</label>
                        <input 
                          type="text" 
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none"
                          value={refineForm.education_level}
                          onChange={(e) => setRefineForm({ ...refineForm, education_level: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-bold uppercase">ภูมิภาคและจังหวัด</label>
                      <input 
                        type="text" 
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none"
                        value={refineForm.region}
                        onChange={(e) => setRefineForm({ ...refineForm, region: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-bold uppercase">วันเปิดยื่นสิทธิ์</label>
                      <input 
                        type="date" 
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none"
                        value={refineForm.application_start_date}
                        onChange={(e) => setRefineForm({ ...refineForm, application_start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-bold uppercase">วันปิดกล่องรับ</label>
                      <input 
                        type="date" 
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none"
                        value={refineForm.application_end_date}
                        onChange={(e) => setRefineForm({ ...refineForm, application_end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-bold uppercase">วันเกณฑ์ประเมินข้อเขียน (พิจารณาลับ)</label>
                    <input 
                      type="date" 
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none"
                      value={refineForm.exam_date}
                      onChange={(e) => setRefineForm({ ...refineForm, exam_date: e.target.value })}
                      placeholder="ไม่ต้องสอบหากวุฒิตรงใบสัมฤทธิ์"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-bold uppercase">คำแจงบอร์ดประกาศสอบ (Markdown Editor)</label>
                    <textarea 
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 w-full min-h-[160px] font-sans focus:outline-none"
                      value={refineForm.content}
                      onChange={(e) => setRefineForm({ ...refineForm, content: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setSelectedRawItem(null)}
                className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-805 text-slate-400 rounded-xl text-xs font-bold transition-all"
              >
                ยกเลิกพิพากษา
              </button>
              <button
                onClick={handlePublishJob}
                disabled={isProcessingWithAI}
                className="bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-555 text-white font-black text-xs px-6 py-2.5 rounded-xl transition-transform hover:scale-103 shadow flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                เซ็นอนุมัติเผยแพร่เข้าระบบ (Jobs DB)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Log level bullet representation helpers
function LogLevelIcon({ type }: { type: 'info' | 'success' | 'error' }) {
  if (type === 'success') {
    return <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
  if (type === 'error') {
    return <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  }
  return <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
}
