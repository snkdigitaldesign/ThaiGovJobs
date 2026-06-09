import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const status = {
    env: {
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
      urlSnippet: url ? `${url.substring(0, 15)}...` : null,
      keySnippet: anonKey ? `${anonKey.substring(0, 15)}...` : null,
    },
    connection: {
      ok: false,
      error: null as string | null,
    },
    schema: {
      jobsTableExists: false,
      error: null as string | null,
    },
    advice: [] as string[],
  };

  if (!url || !anonKey) {
    status.advice.push(
      'กรุณาติดตั้งและกรอกข้อมูล Supabase environment variables (VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY) ในเมนู Settings ของ Google AI Studio'
    );
    return NextResponse.json({ success: false, ...status });
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Test generic connectivity / Auth metadata retrieval
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      status.connection.error = authError.message;
      status.advice.push(`ไม่สามารถเข้าถึง Supabase Auth ได้: ${authError.message}. ตรวจสอบให้แน่ใจว่าค่า ANON_KEY หรือ URL ถูกต้อง`);
    } else {
      status.connection.ok = true;
    }

    // Test if public.jobs table can be queried
    const { error: tableError } = await supabase
      .from('jobs')
      .select('id')
      .limit(1);

    if (tableError) {
      status.schema.jobsTableExists = false;
      status.schema.error = tableError.message;
      
      if (tableError.message.includes('relation "public.jobs" does not exist') || tableError.message.includes('does not exist')) {
        status.advice.push(
          'พบว่าตาราง "jobs" ยังไม่ได้ถูกสร้างขึ้นในฐานข้อมูล Supabase! กรุณาเปิดหน้า "SQL Editor" ใน Supabase Dashboard แล้วคัดลอกคำสั่งในไฟล์ "supabase-schema.sql" ไปวางและกด "Run" เพื่อสร้างตาราง'
        );
      } else {
        status.advice.push(`เกิดข้อผิดพลาดในการตรวจสอบหน้าตาราง: ${tableError.message}`);
      }
    } else {
      status.schema.jobsTableExists = true;

      // 4. Detailed column checking to diagnose missing columns like 'department'
      const missingColumns: string[] = [];
      const expectedCols = [
        { name: 'title', definition: 'title TEXT' },
        { name: 'department', definition: 'department TEXT' },
        { name: 'content', definition: 'content TEXT' },
        { name: 'category', definition: "category TEXT CHECK (category IN ('ข้าราชการ', 'พนักงานราชการ', 'ลูกจ้าง', 'รัฐวิสาหกิจ', 'ราชการส่วนท้องถิ่น'))" },
        { name: 'education_level', definition: 'education_level TEXT' },
        { name: 'region', definition: 'region TEXT' },
        { name: 'salary', definition: 'salary TEXT' },
        { name: 'application_start_date', definition: 'application_start_date DATE' },
        { name: 'application_end_date', definition: 'application_end_date DATE' },
        { name: 'source_url', definition: 'source_url TEXT' },
        { name: 'logo_url', definition: 'logo_url TEXT' },
        { name: 'pdf_url', definition: 'pdf_url TEXT' },
        { name: 'created_at', definition: "created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())" }
      ];

      for (const col of expectedCols) {
        const { error: colError } = await supabase
          .from('jobs')
          .select(col.name)
          .limit(1);
        
        if (colError && (
          colError.message.includes('Could not find') || 
          colError.message.includes('column') || 
          colError.message.includes('does not exist')
        )) {
          missingColumns.push(col.name);
        }
      }

      if (missingColumns.length > 0) {
        status.schema.jobsTableExists = false; // Flag as unhealthy schema
        status.schema.error = `ตรวจพบคอลัมน์ขาดหายไปในตาราง: ${missingColumns.join(', ')}`;
        
        const alterStatements = missingColumns.map(colName => {
          const colDef = expectedCols.find(c => c.name === colName)?.definition || '';
          return `ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ${colDef};`;
        }).join('\n');

        status.advice.push(
          `⚠️ มีคอลัมน์ขาดหายไปในตาราง "jobs"! 
คอลัมน์ที่หายไป: [${missingColumns.join(', ')}]
กรุณาเข้าไปที่ Supabase Dashboard -> คลิก SQL Editor -> ป้อนคำสั่งต่อไปนี้แล้วกด Run:

${alterStatements}

-- กรณีรันแล้วระบบยังแจ้งเตือนว่าไม่พบคอลัมน์ ให้ใช้คำสั่งเคลียร์แคช PostgREST นี้:
NOTIFY pgrst, 'reload schema';`
        );
      }
    }

  } catch (err: any) {
    status.connection.error = err.message;
    status.advice.push(`เกิดปัญหาเชื่อมต่อกับ Supabase: ${err.message}`);
  }

  const isFullyConfigured = status.env.hasUrl && status.env.hasAnonKey && status.connection.ok && status.schema.jobsTableExists;

  return NextResponse.json({
    success: isFullyConfigured,
    ...status
  });
}
