import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCountdownText(endDateString?: string): { text: string; className: string; variant: 'normal' | 'urgent' | 'expired' } {
  if (!endDateString) {
    return { text: '⏳ ไม่ระบุวันปิดรับสมัคร', className: 'bg-slate-100 text-slate-600 border border-slate-200/65', variant: 'normal' };
  }
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateString);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    if (diffTime < 0) {
      return { text: '❌ ปิดรับสมัครแล้ว', className: 'bg-rose-50 text-rose-700 border border-rose-100 font-bold', variant: 'expired' };
    }

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return { text: '⚠️ ปิดรับสมัครวันนี้!', className: 'bg-red-50 text-red-600 border border-red-200 font-black animate-pulse', variant: 'urgent' };
    } else if (diffDays === 1) {
      return { text: '⏳ เหลือเวลาอีก 1 วัน', className: 'bg-amber-50 text-amber-700 border border-amber-200 font-bold', variant: 'normal' };
    } else {
      return { text: `⏳ เหลือเวลาอีก ${diffDays} วัน`, className: 'bg-blue-50 text-blue-700 border border-blue-100 font-semibold', variant: 'normal' };
    }
  } catch (e) {
    return { text: '⏳ ตรวจสอบวันปิดรับสมัคร', className: 'bg-slate-100 text-slate-600 border border-slate-200', variant: 'normal' };
  }
}
