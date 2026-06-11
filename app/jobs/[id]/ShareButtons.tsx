'use client';

import { ArrowLeft, Copy, Facebook, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ShareButtonsProps {
  jobId: string;
  jobTitle: string;
  jobDept: string;
}

export default function ShareButtons({ jobId, jobTitle, jobDept }: ShareButtonsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/jobs/${jobId}`;
    }
    return '';
  };

  const handleFacebookShare = () => {
    const url = getShareUrl();
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`📢 งานราชการใหม่: ${jobTitle} (${jobDept})`)}`;
    
    // Instruct the user clearly or open sharer safely
    window.open(facebookShareUrl, '_blank', 'width=600,height=400,resizable=yes');
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        id="btn-back"
        onClick={() => router.push('/')}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
      >
        <ArrowLeft size={16} />
        กลับหน้าหลัก
      </button>

      <button
        id="btn-share-fb"
        onClick={handleFacebookShare}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
      >
        <Facebook size={16} fill="currentColor" />
        แชร์ไปยัง Facebook
      </button>

      <button
        id="btn-copy-link"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
      >
        {copied ? (
          <>
            <span className="text-blue-600 font-medium">คัดลอกแล้ว!</span>
          </>
        ) : (
          <>
            <Copy size={16} className="text-slate-500" />
            คัดลอกลิงก์
          </>
        )}
      </button>
    </div>
  );
}
