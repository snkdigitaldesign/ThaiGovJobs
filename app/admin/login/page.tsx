'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Shield, Mail, Lock, Loader2, ArrowLeft, AlertCircle, FileText, CheckCircle, XCircle, Database, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [testingDb, setTestingDb] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Check database configuration & connectivity
  const checkDbStatus = async () => {
    try {
      setTestingDb(true);
      const res = await fetch('/api/admin/db-test');
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      console.error('Error checking DB status:', err);
    } finally {
      setTestingDb(false);
    }
  };

  // Check if already authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') || '' : '';
        const headers: HeadersInit = {};
        if (localToken) {
          headers['Authorization'] = `Bearer ${localToken}`;
        }
        
        const res = await fetch('/api/admin/auth/status', { headers });
        const data = await res.json();
        if (data.authenticated) {
          router.replace('/admin/dashboard');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      } finally {
         setCheckingAuth(false);
      }
    }
    checkAuth();
    checkDbStatus();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

      if (data.token) {
        localStorage.setItem('admin_session_token', data.token);
      }

      router.replace('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <Loader2 size={36} className="animate-spin text-slate-900 mb-4" />
        <p className="text-slate-500 text-sm font-medium">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent)] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition text-sm font-medium mb-8">
          <ArrowLeft size={16} />
          กลับหน้าหลัก
        </Link>

        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-md">
            <Shield size={22} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">เฉพาะผู้ดูแลระบบ</h2>
        </div>
        <p className="text-center text-xs text-slate-500 font-mono tracking-wider uppercase mb-6">
          ADMINISTRATIVE CONTROL PORTAL
        </p>

        {/* Informative credentials instruction */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-4 text-xs text-emerald-900 leading-relaxed max-w-sm sm:max-w-md mx-auto">
          <p className="font-bold mb-1.5 text-emerald-800 flex items-center gap-1">💡 ข้อมูลสำหรับเข้าสู่ระบบแอดมินจำลอง:</p>
          <p className="mb-2 text-emerald-700 font-medium">แอดมินจำลองเข้าใช้งานได้ทันที (ไม่ต้องมีเน็ตก็เข้าได้):</p>
          <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/50 space-y-1 font-mono text-[11px] mb-2 text-slate-700 shadow-xs">
            <div><span className="font-bold">Email:</span> {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'}</div>
            <div><span className="font-bold">Password:</span> admin123456</div>
          </div>
        </div>

        {/* Dynamic Database & Supabase Diagnostics Panel */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mb-6 text-xs text-slate-800 max-w-sm sm:max-w-md mx-auto shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Database size={16} className="text-indigo-500" />
              การเชื่อมโยงฐานข้อมูล Supabase
            </span>
            <button
              onClick={checkDbStatus}
              disabled={testingDb}
              type="button"
              className="p-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-[11px] font-semibold text-slate-600 flex items-center gap-1 hover:text-slate-900 active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw size={11} className={`${testingDb ? 'animate-spin' : ''}`} />
              ทดสอบใหม่
            </button>
          </div>

          {!dbStatus ? (
            <div className="py-2 text-slate-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-slate-500" />
              กำลังทดสอบสิทธิ์และการเชื่อมโยงฐานข้อมูล...
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Stat 1: Environment Variables */}
              <div className="flex items-start gap-2.5">
                {dbStatus.env?.hasUrl && dbStatus.env?.hasAnonKey ? (
                  <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-slate-900">1. การตั้งค่าตัวแปรในระบบ (Env Variables)</p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {dbStatus.env?.hasUrl && dbStatus.env?.hasAnonKey ? (
                      <>ระบุค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY เรียบร้อยแล้ว ({dbStatus.env.urlSnippet})</>
                    ) : (
                      <>ยังไม่ได้ตั้งค่าตัวแปรเชื่อมต่อในระบบ (ระบบยังคงใช้ Memory โหมดจำลองข้อมูลแทน)</>
                    )}
                  </p>
                </div>
              </div>

              {/* Stat 2: Connection Status */}
              <div className="flex items-start gap-2.5">
                {dbStatus.connection?.ok ? (
                  <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-slate-900">2. การทดสอบเชื่อมต่อ (Network & Keys Connection)</p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {dbStatus.connection?.ok ? (
                      <span className="text-emerald-700 font-medium">เชื่อมต่อกับเครือข่าย Supabase สำเร็จ!</span>
                    ) : (
                      <span className="text-rose-700 font-medium">
                        {dbStatus.connection?.error || 'ไม่มีการระบุตัวแปรเพื่อทดสอบเชื่อมต่อ API Key'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Stat 3: Jobs Table Schema */}
              <div className="flex items-start gap-2.5">
                {dbStatus.schema?.jobsTableExists ? (
                  <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-slate-900">3. โครงสร้างตารางประกาศงาน (public.jobs Table)</p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {dbStatus.schema?.jobsTableExists ? (
                      <span className="text-emerald-700 font-medium">พบตาราง &quot;jobs&quot; ในระบบพร้อมใช้งาน</span>
                    ) : (
                      <span className="text-rose-700 font-medium">
                        {dbStatus.schema?.error || 'ไม่พบโครงสร้างตารางข้อมูลประกาศสอบงานในบัญชีของคุณ'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Recommendations/Advice block */}
              {dbStatus.advice?.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 mt-2 space-y-1.5 text-[11px] text-amber-900 leading-relaxed font-sans">
                  <p className="font-bold text-amber-800 flex items-center gap-1 leading-none mb-1">
                    <AlertCircle size={13} className="shrink-0" />
                    คำแนะนำในการแก้ไขปัญหาเชื่อมต่อ:
                  </p>
                  <ul className="list-decimal list-inside space-y-1.5 text-amber-800 pl-1">
                    {dbStatus.advice.map((item: string, idx: number) => (
                      <li key={idx} className="marker:font-mono pr-1">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-6 shadow-xl border border-slate-100 rounded-3xl sm:px-10"
        >
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                อีเมล (Email)
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all bg-slate-50/50"
                  disabled={loading}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all bg-slate-50/50"
                  disabled={loading}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
              </div>
            </div>

            {error && (
              <div className="space-y-2">
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs flex items-start gap-2 animate-fade-in">
                  <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">เข้าสู่ระบบไม่สำเร็จ:</p>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="w-full text-center py-2 px-3 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 focus:outline-none"
                >
                  <AlertCircle size={13} className="text-indigo-500" />
                  {showHelp ? '✕ ปิดคู่มือแนะนำวิธีแก้ไข' : '💡 ดูวิธีแก้ไขด่วนเมื่อล็อกอินบัญชีจริงไม่ได้?'}
                </button>

                {showHelp && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-indigo-50/50 border border-indigo-100/70 rounded-2xl text-xs text-indigo-950 space-y-3 leading-relaxed mt-2"
                  >
                    <p className="font-bold text-indigo-900 border-b border-indigo-150 pb-1.5 mb-1.5">🎯 วิธีการแก้ไขเพื่อใช้งานบัญชีจริง (snkdigitaldesign@gmail.com):</p>
                    
                    <div className="space-y-2.5">
                      <div className="flex gap-2 text-[11px]">
                        <span className="font-bold text-indigo-700 font-mono shrink-0">1.</span>
                        <div>
                          <span className="font-bold text-indigo-900">ตรวจสอบความถูกต้องของรหัสผ่าน:</span>
                          <p className="text-slate-600 mt-0.5 text-[10.5px]">เนื่องจากระบบเชื่อมต่อฐานข้อมูลของคุณสมบูรณ์แล้ว 3 หัวข้อ (เขียวล้วน) ปัญหาจึงมาจากรหัสผ่านไม่ถูกต้องเท่านั้น กรุณาตรวจสอบแป้นพิมพ์ (Caps Lock, พิมพ์ไทย/อังกฤษ) และไม่เว้นวรรคตอนกรอก</p>
                        </div>
                      </div>

                      <div className="flex gap-2 text-[11px]">
                        <span className="font-bold text-indigo-700 font-mono shrink-0">2.</span>
                        <div>
                          <span className="font-bold text-indigo-900">การแก้ไขรหัสผ่านใน Supabase Dashboard (ง่ายที่สุด):</span>
                          <ul className="list-disc list-inside mt-1 text-slate-600 space-y-1 text-[10.5px] pl-1">
                            <li>ในหน้าจอกล่องรายชื่อ Users ของคุณ (ตามรูปที่แคป)</li>
                            <li>คลิกปุ่มจุดสามจุด <span className="font-mono font-bold text-slate-800">...</span> หลังไอดี <span className="font-semibold text-indigo-950">snkdigitaldesign@gmail.com</span></li>
                            <li>เลือกหัวข้อ <span className="font-semibold text-indigo-600 bg-indigo-50 px-1 rounded">Reset password</span> เพื่อตั้งรหัสผ่านใหม่ที่จำง่ายยิ่งขึ้น</li>
                            <li>หรือกด <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 rounded">Delete User (ลบผู้ใช้เดิม)</span> แล้วกด <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 rounded">Add user &gt; Create user</span> อีกครั้ง และกำหนดรหัสผ่านใหม่ให้ชัดเจน</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-2 text-[11px]">
                        <span className="font-bold text-indigo-700 font-mono shrink-0">3.</span>
                        <div>
                          <span className="font-bold text-indigo-900">ข้อเสนอแนะสำรองกรณีฉุกเฉิน:</span>
                          <p className="text-slate-600 mt-0.5 text-[10.5px]">คุณยังสามารถเข้าทำงานต่อได้ทันทีโดยใช้อีเมลแอดมินจำลอง <strong>admin@example.com</strong> รหัสผ่าน <strong>admin123456</strong> เพื่อเข้าถึงระบบแผงควบคุมแอดมินไปลุยงานต่อได้ตลอดเวลาครับ!</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            <div>
              <button
                id="btn-admin-login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-2xl shadow-md text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin text-emerald-400 mr-2" size={16} />
                    กำลังตรวจสอบข้อมูล...
                  </>
                ) : (
                  'เข้าสู่ระบบควบคุมแอดมิน'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
