import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase, getSupabaseWithAuth } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper to check if user is logged in
async function getValidatedToken(req: NextRequest): Promise<string | null> {
  try {
    // 1. Try to read token from Authorization header first (for iframe environment support)
    const authHeader = req.headers.get('Authorization');
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Fallback to cookies
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('admin_session')?.value || '';
    }

    if (!token) return null;

    // 3. Support local mock login bypass token
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try fetching from Supabase first
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, data });
      }
    } catch (e) {
      console.warn('Supabase fetch single job failed, falling back to memory.');
    }

    // Fallback to memory
    const store = (globalThis as any).jobsStore || [];
    const job = store.find((j: any) => j.id === id);

    if (job) {
      return NextResponse.json({ success: true, data: job });
    }

    return NextResponse.json({ error: 'ไม่พบประกาศรับสมัคร' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Gated for admins
    const token = await getValidatedToken(req);
    if (!token) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้ กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.title || !body.department) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลด่วน ชื่อประกาศและหน่วยงาน' }, { status: 400 });
    }

    // Attempt Supabase update
    try {
      const supabase = getSupabaseWithAuth(token);
      
      const dbRow = {
        title: body.title,
        department: body.department,
        content: body.content || body.description || '',
        category: body.category,
        education_level: body.education_level || body.requirements || '',
        region: body.region || '',
        salary: body.salary || '',
        application_start_date: body.application_start_date || null,
        application_end_date: body.application_end_date || null,
        source_url: body.source_url || body.officialUrl || ''
      };

      const { data, error } = await supabase
        .from('jobs')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Also sync to memory
        const store = (globalThis as any).jobsStore || [];
        const index = store.findIndex((j: any) => j.id === id);
        if (index !== -1) {
          store[index] = {
            ...store[index],
            title: body.title,
            department: body.department,
            salary: body.salary,
            description: body.content || body.description,
            requirements: body.education_level || body.requirements,
            officialUrl: body.source_url || body.officialUrl
          };
        }

        return NextResponse.json({ success: true, data });
      }
    } catch (dbErr: any) {
      console.warn('Supabase DB update failed, falling back to memory update. Reason:', dbErr.message || dbErr);
    }

    // Memory storage fallback update
    const store = (globalThis as any).jobsStore || [];
    const index = store.findIndex((j: any) => j.id === id);
    if (index !== -1) {
      store[index] = {
        ...store[index],
        title: body.title,
        department: body.department,
        salary: body.salary || store[index].salary,
        vacancies: body.vacancies || store[index].vacancies,
        period: body.period || store[index].period,
        requirements: body.requirements || body.education_level || store[index].requirements,
        description: body.description || body.content || store[index].description,
        officialUrl: body.officialUrl || body.source_url || store[index].officialUrl,
      };
      return NextResponse.json({ success: true, data: store[index], message: 'แก้ไขข้อมูลใน Memory สำเร็จ' });
    }

    return NextResponse.json({ error: 'ไม่พบประกาศเพื่อทำการแก้ไข' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Gated for admins
    const token = await getValidatedToken(req);
    if (!token) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้ กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    // Try deleting from Supabase
    try {
      const supabase = getSupabaseWithAuth(token);
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (e: any) {
      console.warn('Supabase delete failed, falling back to memory delete. Reason:', e.message || e);
    }

    // Always sync & delete from memory to ensure user gets immediate results
    const store = (globalThis as any).jobsStore || [];
    const index = store.findIndex((j: any) => j.id === id);
    if (index !== -1) {
      store.splice(index, 1);
      (globalThis as any).jobsStore = [...store];
    }

    return NextResponse.json({ success: true, message: 'ลบประกาศเรียบร้อย' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
