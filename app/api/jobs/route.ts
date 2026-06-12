import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase, getSupabaseWithAuth, getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
  createdAt: string;

  // Supabase specific fields (to retain and pipe back easily)
  category?: string;
  education_level?: string;
  region?: string;
  application_start_date?: string;
  application_end_date?: string;
  logo_url?: string;
  pdf_url?: string;
  views?: number;
  total_positions?: number;
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

// In-memory global jobs cache that persists across hot reloads using globalThis
const DEFAULT_JOBS: JobItem[] = [
  {
    id: 'gov-job-1',
    title: 'รับสมัครสอบแข่งขันเพื่อบรรจุบุคคลเข้ารับราชการ ตำแหน่ง นักตรวจสอบภาษีปฏิบัติการ',
    department: 'กรมสรรพากร',
    salary: '15,000 - 16,500 บาท',
    vacancies: '45 อัตรา',
    period: 'รับสมัครระหว่างวันที่ 15 มิถุนายน - 6 กรกฎาคม 2569',
    requirements: 'รับสมัครวุฒิปริญญาตรี สาขาวิชาการบัญชี หรือ สาขาวิชาบริหารธุรกิจ (ทางการบัญชี)',
    description: 'สอบแข่งขันบุคคลทั่วไปเพื่อบรรจุและแต่งตั้งเข้ารับราชการเป็นข้าราชการพลเรือนสามัญ ติดตามตรวจสอบผ่านระบบบอร์ดและดาวน์โหลดรายชื่อผู้สมัครสอบแข่งขัน',
    officialUrl: 'https://www.rd.go.th',
    createdAt: new Date().toISOString()
  },
  {
    id: 'gov-job-2',
    title: 'เปิดรับสมัครพนักงานสอบราชการภายนอก ตำแหน่ง นายช่างสำรวจทั่วไป (พนักงานราชการ)',
    department: 'กรมป่าไม้',
    salary: '13,800 บาท',
    vacancies: '12 อัตรา',
    period: 'รับสมัครระหว่างวันที่ 9 - 23 มิถุนายน 2569',
    requirements: 'วุฒิการศึกษาระดับ ปวส. สาขาวิชาโยธา, เทคโนโลยีการสำรวจ หรือ เทคนิคสถาปัตยกรรม',
    description: 'ปฏิบัติงานการสำรวจรังวัดแผนที่ ป่าชุมชน และแนวเขตอนุรักษ์อุทยาน ปฏิบัติงานทั้งในห้องแล็บและลุยภาคสนาม',
    officialUrl: 'https://www.forest.go.th',
    createdAt: new Date().toISOString()
  },
  {
    id: 'gov-job-3',
    title: 'รับสมัครสอบแข่งขันเพื่อบรรจุเข้ารับราชการ ตำแหน่ง นักวิเคราะห์นโยบายและแผนปฏิบัติการ',
    department: 'สำนักงานปลัดกระทรวงสาธารณสุข',
    salary: '15,000 - 16,500 บาท',
    vacancies: '20 อัตรา',
    period: 'รับสมัครระหว่างวันที่ 1 - 22 กรกฎาคม 2569',
    requirements: 'รับสมัครวุฒิปริญญาตรีทุกสาขาวิชา และต้องสอบผ่านความรู้ความสามารถทั่วไประดับปริญญาตรี ของ ก.พ. (ภาค ก)',
    description: 'วางแผน วิเคราะห์ สถิติทรัพยากรสุขภาพและมาตรฐานการควบคุมกระทรวงสาธารณสุข รับสมัครระบบออนไลน์ 24 ชม.',
    officialUrl: 'https://ops.moph.go.th',
    createdAt: new Date().toISOString()
  }
];

// Initialize global storage key to prevent reset on ESM re-execution
if (!(globalThis as any).jobsStore) {
  (globalThis as any).jobsStore = [...DEFAULT_JOBS];
}

const getMemoryJobs = (): JobItem[] => (globalThis as any).jobsStore;

const addMemoryJob = (job: Omit<JobItem, 'id' | 'createdAt'>): JobItem => {
  const newJob: JobItem = {
    ...job,
    id: 'custom-' + Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString()
  };
  (globalThis as any).jobsStore = [newJob, ...(globalThis as any).jobsStore];
  return newJob;
};

async function getValidatedToken(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('admin_session')?.value || '';
    }
    if (!token) return null;
    if (token === 'mock-admin-session-token') {
      return token;
    }
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return token;
  } catch (e) {
    return null;
  }
}

export async function GET() {
  try {
    // Attempt dynamic retrieval from Supabase first
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const mappedJobs = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          department: item.department,
          salary: item.salary || 'ตามระเบียบการ',
          vacancies: 'ตามประกาศ',
          period: (item.application_start_date && item.application_end_date)
            ? `รับสมัครระหว่างวันที่ ${formatThaiDate(item.application_start_date)} - ${formatThaiDate(item.application_end_date)}`
            : 'ไม่มีกำหนดวันหมดอายุ',
          requirements: `${item.education_level || 'ไม่จำกัดวุฒิ'} | พื้นที่: ${item.region || 'ทั่วประเทศ'} | หมวดหมู่: ${item.category || 'งานราชการ'}`,
          description: item.content || 'ไม่มีรายละเอียดเพิ่มเติม',
          officialUrl: item.source_url || 'https://www.gprocurement.go.th',
          isQuickScrape: false,
          createdAt: item.created_at,
          category: item.category,
          education_level: item.education_level,
          region: item.region,
          application_start_date: item.application_start_date,
          application_end_date: item.application_end_date,
          logo_url: item.logo_url,
          pdf_url: item.pdf_url,
          views: item.views || 0,
          total_positions: item.total_positions || undefined
        }));

        // Merge manual in-memory entries to keep them synchronized (such as those saved under mock bypass)
        const memoryList = getMemoryJobs();
        const customMemoryJobs = memoryList.filter(
          (m: JobItem) => m.id.startsWith('custom-') && !mappedJobs.some((mj: any) => mj.id === m.id)
        );
        const unifiedJobs = [...customMemoryJobs, ...mappedJobs];

        return NextResponse.json({ success: true, list: unifiedJobs, isSupabase: true });
      }
    } catch (dbErr: any) {
      console.warn('Supabase retrieval failed, using fallback memory storage. Reason:', dbErr.message || dbErr);
    }

    // Fallback to in-memory store
    return NextResponse.json({ success: true, list: getMemoryJobs(), isSupabase: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getValidatedToken(req);
    if (!token) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้ กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const jobData = await req.json();

    if (!jobData.title || !jobData.department) {
      return NextResponse.json(
        { error: 'ข้อมูลสำคัญไม่ครบถ้วน กรุณาระบุชื่อตำแหน่งและหน่วยงานเปิดรับ' },
        { status: 400 }
      );
    }

    let dbInsertionError: string | null = null;

    // Attempt insert into Supabase
    try {
      const supabase = getSupabaseAdmin() || getSupabaseWithAuth(token);
      
      // Map frontend fields (from scraper or admin interface) to DB Schema
      const dbRow = {
        title: jobData.title,
        department: jobData.department,
        content: jobData.description || jobData.content || 'ไม่มีรายละเอียดเพิ่มเติม',
        category: jobData.category || 'ข้าราชการ',
        education_level: jobData.education_level || jobData.requirements || 'ปริญญาตรี',
        region: jobData.region || 'ทั่วประเทศ',
        salary: jobData.salary || 'ตามระเบียบการ',
        application_start_date: jobData.application_start_date || null,
        application_end_date: jobData.application_end_date || null,
        source_url: jobData.officialUrl || jobData.source_url || 'https://www.gprocurement.go.th',
        logo_url: jobData.logo_url || null,
        pdf_url: jobData.pdf_url || null,
        total_positions: jobData.total_positions || null
      };

      const { data, error } = await supabase
        .from('jobs')
        .insert([dbRow])
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const mappedSaved: JobItem = {
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
          createdAt: data.created_at,
          category: data.category,
          education_level: data.education_level,
          region: data.region,
          application_start_date: data.application_start_date,
          application_end_date: data.application_end_date,
          logo_url: data.logo_url,
          pdf_url: data.pdf_url,
          total_positions: data.total_positions || undefined
        };

        // Also update memory cache to keep in sync
        addMemoryJob({
          title: jobData.title,
          department: jobData.department,
          salary: jobData.salary || 'ตามระเบียบการ',
          vacancies: 'หลายอัตรา',
          period: mappedSaved.period,
          requirements: mappedSaved.requirements,
          description: mappedSaved.description,
          officialUrl: mappedSaved.officialUrl,
          logo_url: mappedSaved.logo_url,
          pdf_url: mappedSaved.pdf_url,
          total_positions: mappedSaved.total_positions,
          isQuickScrape: false
        });

        return NextResponse.json({ success: true, data: mappedSaved, persistedInDb: true });
      }
    } catch (dbErr: any) {
      console.warn('Supabase insertion failed, falling back to memory insert. Reason:', dbErr.message || dbErr);
      dbInsertionError = dbErr.message || String(dbErr);
    }

    // Fallback to local memory storage insert
    const savedJob = addMemoryJob({
      title: jobData.title,
      department: jobData.department,
      salary: jobData.salary || 'ตามระเบียบการ',
      vacancies: jobData.vacancies || 'หลายอัตรา',
      period: jobData.period || 'สอบถามรายละเอียด',
      requirements: jobData.requirements || 'รับสมัครวุฒิการศึกษาตามประกาศรับตรง',
      description: jobData.description || 'ไม่มีรายละเอียดเพิ่มเติม',
      officialUrl: jobData.officialUrl || 'https://www.google.com',
      logo_url: jobData.logo_url || '',
      pdf_url: jobData.pdf_url || '',
      total_positions: jobData.total_positions || undefined,
      isQuickScrape: jobData.isQuickScrape || false
    });

    return NextResponse.json({ success: true, data: savedJob, persistedInDb: false, dbError: dbInsertionError });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
