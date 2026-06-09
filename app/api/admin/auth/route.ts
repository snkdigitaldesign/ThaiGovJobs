import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    // 1. Check local developer fallback credentials first
    const fallbackEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const fallbackPassword = process.env.ADMIN_PASSWORD || 'admin123456';

    if (email.toLowerCase().trim() === fallbackEmail.toLowerCase().trim() && password === fallbackPassword) {
      const cookieStore = await cookies();
      cookieStore.set('admin_session', 'mock-admin-session-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 86400, // 24 hours
      });

      return NextResponse.json({
        success: true,
        token: 'mock-admin-session-token',
        user: {
          id: 'mock-admin-id',
          email: fallbackEmail,
          role: 'admin'
        },
        message: 'เข้าสู่ระบบสำเร็จด้วยระบบความปลอดภัยทดแทน'
      });
    }

    const supabase = getSupabase();
    
    // Login using Supabase Auth with normalized email input
    const cleanEmail = email.toLowerCase().trim();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      let friendlyError = error.message;
      
      if (error.message.toLowerCase().includes('email not confirmed')) {
        friendlyError = 'อีเมลนี้ยังไม่ได้ยืนยันตัวตน (Email not confirmed)! เนื่องจากเวลาสร้างบัญชีใหม่ใน Supabase Auth ดั้งเดิมจะบังคับให้ยืนยันตัวตนผ่านอีเมล คุณสามารถแก้ไขได้โดย: 1. ไปที่โกดัง Supabase Dashboard -> Auth -> Providers -> คลิก "Email" -> เลื่อนปิดหัวข้อ "Confirm email" แล้วกด Save หรือ 2. ไปที่หน้าแรกของเมนู Users ใน Supabase แล้วกดเลือก "Confirm user" เพื่อยืนยันให้ไอดีนี้ใช้งานได้ทันที';
      } else if (error.message.toLowerCase().includes('invalid login credentials') || error.message.toLowerCase().includes('invalid credentials')) {
        friendlyError = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง (หากเพิ่งเพิ่มบัญชีใน Supabase กรอกรหัสผ่านตรงกับที่คุณตั้งค่าไว้หรือไม่)';
      } else {
        friendlyError = `เกิดข้อผิดพลาดจากระบบรักษาความปลอดภัย: ${error.message}`;
      }

      return NextResponse.json(
        { error: friendlyError },
        { status: 401 }
      );
    }

    // Set cookie with the session access token securely
    const session = data.session;
    let token = '';
    if (session) {
      token = session.access_token;
      const cookieStore = await cookies();
      cookieStore.set('admin_session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: session.expires_in || 3600, // Duration of the token
      });
    }

    return NextResponse.json({
      success: true,
      token,
      user: data.user,
      message: 'เข้าสู่ระบบสำเร็จ'
    });
  } catch (err: any) {
    console.error('Auth handler error:', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดของระบบ: ' + err.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    
    // Attempt sign out on Supabase if possible
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore if stateless
    }

    return NextResponse.json({ success: true, message: 'ออกจากระบบเรียบร้อย' });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ไม่สามารถออกจากระบบได้: ' + err.message },
      { status: 500 }
    );
  }
}
