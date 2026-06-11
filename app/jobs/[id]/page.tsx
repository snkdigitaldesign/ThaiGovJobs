import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
import { 
  Calendar, 
  CircleDollarSign, 
  GraduationCap, 
  MapPin, 
  Users, 
  Globe, 
  Building2, 
  Briefcase,
  AlertCircle,
  Clock,
  ChevronLeft,
  XCircle,
  Share2,
  FileDown,
  Eye
} from 'lucide-react';
import ShareButtons from './ShareButtons';
import { getSupabase } from '@/lib/supabase';
import { getCountdownText } from '@/lib/utils';

export interface JobItem {
  id: string;
  title: string;
  department: string;
  salary: string;
  vacancies: string;
  period: string;
  requirements: string;
  description: string;
  officialUrl: string;
  isQuickScrape?: boolean;
  views?: number;

  // Additional metadata payload
  application_end_date?: string;
  source_url?: string;
  category?: string;
  logo_url?: string;
  pdf_url?: string;
}

function formatThaiDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateString;
  }
}

// Fetch single job details from Supabase or memory store
async function getJobById(id: string): Promise<JobItem | undefined> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUuid) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        const nextViews = (data.views || 0) + 1;
        try {
          await supabase
            .from('jobs')
            .update({ views: nextViews })
            .eq('id', id);
        } catch (updateErr) {
          console.error("Failed to increment views on server render:", updateErr);
        }

        return {
          id: data.id,
          title: data.title,
          department: data.department,
          salary: data.salary || 'ตามระเบียบการ',
          vacancies: 'ตามประกาศ',
          period: (data.application_start_date && data.application_end_date)
            ? `รับสมัครระหว่างวันที่ ${formatThaiDate(data.application_start_date)} - ${formatThaiDate(data.application_end_date)}`
            : 'ไม่มีกำหนดวันหมดอายุ',
          requirements: `${data.education_level || 'ไม่จำกัดวุฒิ'} | พื้นที่: ${data.region || 'ทั่วประเทศ'} | หมวดหมู่: ${data.category || 'งานราชการ'}`,
          description: data.content || 'ไม่มีรายละเอียดเพิ่มเติม',
          officialUrl: data.source_url || 'https://www.gprocurement.go.th',
          isQuickScrape: false,
          application_end_date: data.application_end_date,
          source_url: data.source_url,
          category: data.category,
          logo_url: data.logo_url || undefined,
          pdf_url: data.pdf_url || undefined,
          views: nextViews
        };
      }
    } catch (e) {
      console.warn('getJobById: Supabase failed, using memory fallback');
    }
  }

  // Fallback to memory store if database is offline, not found in DB, or not provisioned yet
  const store = (globalThis as any).jobsStore || [];
  const found = store.find((j: any) => j.id === id);
  if (found) {
    found.views = (found.views || 0) + 1;
    return {
      ...found,
      application_end_date: found.application_end_date || undefined,
      source_url: found.officialUrl || undefined,
      logo_url: found.logo_url || undefined,
      pdf_url: found.pdf_url || undefined,
      views: found.views
    };
  }
  return undefined;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate dynamic share headers
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);

  const title = job ? `${job.title} - ${job.department}` : 'หางานราชการง่ายๆ';
  const description = job 
    ? `เปิดรับสมัคร: ${job.period} | วุฒิการศึกษา: ${job.requirements}`
    : 'ระบบสอบราชการและรับสมัครงานราชการไทย';

  // Construct absolute origin URL for sharing image crawling
  let origin = 'https://government-jobs-app.vercel.app';
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    if (host) {
      const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
      origin = `${proto}://${host}`;
    }
  } catch (e) {
    console.error('generateMetadata: failed to get headers', e);
  }

  const imageUrl = job?.logo_url
    ? (job.logo_url.startsWith('http') ? job.logo_url : `${origin}${job.logo_url}`)
    : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      locale: 'th_TH',
      siteName: 'หางานราชการง่ายๆ',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
    }
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="p-4 bg-orange-50 text-orange-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">ไม่พบเอกสารประกาศงานสอบ</h1>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          ประกาศรับสมัครสอบนี้อาจไม่ปรากฏในฐานข้อมูล หรือข้อมูลถูกลบโดยฝ่ายผู้ดูแลระบบสิทธิ์
        </p>
        <Link href="/" className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition shadow-md">
          <ChevronLeft size={14} />
          กลับสู่หน้าหลัก
        </Link>
      </main>
    );
  }

  // Core Expiration calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let isExpired = false;
  if (job.application_end_date) {
    try {
      const endDate = new Date(job.application_end_date);
      endDate.setHours(23, 59, 59, 999);
      isExpired = endDate < today;
    } catch (e) {
      isExpired = false;
    }
  }

  const countdown = getCountdownText(job.application_end_date);

  return (
    <main className="min-h-screen bg-[#fafbfc] py-12 px-4 md:px-8 selection:bg-blue-600 selection:text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <Link
            id="btn-back-breadcrumb"
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-slate-900 transition-all shadow-xs"
          >
            <ChevronLeft size={14} />
            กลับไปที่หน้ารายการงานราชการ
          </Link>

          {/* Core metadata attributes */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md uppercase font-bold tracking-wide">
              ID: {job.id.substring(0, 8)}...
            </span>
          </div>
        </div>

        {/* Expired warning Banner Sheet */}
        {isExpired && (
          <div 
            id="expiration-warning-banner" 
            className="p-5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-900 flex items-start gap-3.5 shadow-sm animate-fade-in"
          >
            <XCircle size={22} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-rose-800">ปิดรับสมัครแล้ว</h3>
              <p className="text-xs text-rose-700/90 leading-relaxed">
                เนื่องจากพ้นกำหนดวันปิดรับสมัคร ({formatThaiDate(job.application_end_date || '')}) 
                เพื่อเป็นการรักษามาตรฐานข้อมูลให้สมบูรณ์ ปุ่มเปิดลิงก์สำหรับสมัครภายนอกจึงถูกระงับสิทธิ์ชั่วคราว
              </p>
            </div>
          </div>
        )}

        {/* Master Detail Card Box */}
        <article className="bg-white rounded-3xl border border-slate-100 shadow-[0_12px_45px_rgba(0,0,0,0.02)] overflow-hidden">
          
          {/* Main Cover Header */}
          <div className="p-6 md:p-8 bg-slate-950 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(19,112,176,0.15),transparent)] pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
              {job.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={job.logo_url}
                  alt={job.department}
                  className="w-20 h-20 md:w-28 md:h-28 object-contain bg-white rounded-2xl md:rounded-3xl p-2.5 md:p-3.5 border border-slate-800 shrink-0 shadow-xl"
                />
              )}
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/10 text-[10px] font-extrabold uppercase">
                    {job.category || 'ข้าราชการ'}
                  </span>
                  
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-md border font-extrabold flex items-center gap-1 ${countdown.className}`}>
                    {countdown.text}
                  </span>

                  <span className="text-slate-350 text-[10.5px] font-medium flex items-center gap-1 bg-slate-900 border border-slate-800/85 px-2.5 py-0.5 rounded-md hover:text-slate-200 transition-colors">
                    <Eye size={12} className="text-slate-400 shrink-0" />
                    <span>👁️ ผู้เข้าชม {job.views || 1} ครั้ง</span>
                  </span>
                </div>

                <h1 className="text-lg md:text-2xl font-extrabold leading-snug text-white">
                  {job.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 border-t border-slate-800 text-slate-300 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Building2 size={14} className="text-slate-500" />
                    <span>หน่วยงานผู้จัดสอบ:</span>
                    <span className="text-white font-bold">{job.department}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specs Bento Panel Grid */}
          <div className="p-6 md:p-8 bg-[#fafbfc]/30 border-b border-slate-50">
            <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider mb-4 uppercase">Spec-Sheet parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Salary bento bar */}
              <div className="p-4 rounded-xl bg-white border border-slate-100 flex items-start gap-3 shadow-xs">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <CircleDollarSign size={16} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">อัตราเงินเดือน</span>
                  <span className="text-xs md:text-sm font-bold text-slate-800">{job.salary}</span>
                </div>
              </div>

              {/* Education Level criteria */}
              <div className="p-4 rounded-xl bg-white border border-slate-100 flex items-start gap-3 shadow-xs">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600 shrink-0">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">วุฒิการศึกษาที่ระบุ</span>
                  <span className="text-xs md:text-sm font-bold text-slate-800 line-clamp-1">
                    {job.requirements?.split('|')?.[0]?.trim() || 'ปริญญาตรี'}
                  </span>
                </div>
              </div>

              {/* Calendar Registration period */}
              <div className="p-4 rounded-xl bg-white border border-slate-100 flex items-start gap-3 shadow-xs sm:col-span-2 lg:col-span-1">
                <div className="p-2 rounded-lg bg-[#f0f7ff] text-blue-600 shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">ช่วงเวลารับสมัครสอบ</span>
                  <span className="text-xs md:text-sm font-bold text-slate-800 line-clamp-1">{job.period}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Description content box */}
          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-slate-400" />
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">รายละเอียดเกณฑ์และคุณสมบัติเพิ่มเติม</h2>
              </div>
              <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50/50 p-5 md:p-6 rounded-2xl border border-slate-100">
                {job.description || 'ไม่มีข้อมูลคุณสมบัติเพิ่มเติมกรอกไว้'}
              </div>
            </div>

            {/* Application action controls combined */}
            <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              
              {/* Share block */}
              <div className="space-y-2 w-full sm:w-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">แชร์โอกาสงานสอบสอบแข่งขันนี้</span>
                <ShareButtons jobId={job.id} jobTitle={job.title} jobDept={job.department} />
              </div>

              {/* Apply link button */}
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-end">
                {job.pdf_url && (
                  <a
                    id="btn-download-pdf-doc"
                    href={job.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-100 text-sm font-extrabold text-red-700 transition shadow-sm active:scale-95 duration-100 shrink-0"
                  >
                    <FileDown size={16} />
                    <span>อ่านประกาศฉบับเต็ม (PDF)</span>
                  </a>
                )}

                {isExpired ? (
                  <button
                    id="btn-apply-disabled"
                    disabled
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 text-sm font-extrabold cursor-not-allowed shadow-none shrink-0"
                  >
                    <XCircle size={16} className="text-slate-300" />
                    <span>ปิดรับสมัครแล้ว</span>
                  </button>
                ) : (
                  <a
                    id="btn-apply-external"
                    href={job.officialUrl || job.source_url || 'https://www.gprocurement.go.th'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 text-sm font-extrabold text-white hover:bg-blue-700 transition shadow-md hover:shadow-lg active:scale-95 duration-100 shrink-0"
                  >
                    <Globe size={16} />
                    <span>ไปยังเว็บไซต์สมัครงาน</span>
                  </a>
                )}
              </div>

            </div>

          </div>

        </article>

      </div>
    </main>
  );
}
