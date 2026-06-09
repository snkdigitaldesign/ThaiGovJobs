import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. First attempt to read the access token from the Authorization header (key fallback for iframe environments)
    const authHeader = req.headers.get('Authorization');
    let adminToken = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      adminToken = authHeader.substring(7).trim();
    }

    // 2. Fallback to extracting the token from HTTP-only cookie
    if (!adminToken) {
      const cookieStore = await cookies();
      adminToken = cookieStore.get('admin_session')?.value || '';
    }

    if (!adminToken) {
      return NextResponse.json({ authenticated: false, reason: 'No session token' });
    }

    // 1. Support local mock login bypass token
    if (adminToken === 'mock-admin-session-token') {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: 'mock-admin-id',
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          role: 'admin',
        }
      });
    }

    const supabase = getSupabase();
    
    // Verify the JWT with Supabase to make it server-side secure
    const { data: { user }, error } = await supabase.auth.getUser(adminToken);

    if (error || !user) {
      // Token invalid or expired
      return NextResponse.json({ authenticated: false, reason: 'Invalid or expired token' });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    });
  } catch (err: any) {
    console.error('Auth verification status error:', err);
    return NextResponse.json({ authenticated: false, error: err.message });
  }
}
