import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCountdownText(endDateString: string | null | date): string {
  if (!endDateString) return "⏳ ไม่ระบุวันปิดรับสมัคร";
  
  const now = new Date();
  const endDate = new Date(endDateString);
  
  // รีเซ็ตเวลาให้เหลือแค่ วัน/เดือน/ปี เพื่อการคำนวณที่แม่นยำ
  now.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 1) {
    return `⏳ เหลือเวลาอีก ${diffDays} วัน`;
  } else if (diffDays === 1) {
    return `⏳ เหลือเวลาอีก 1 วันสุดท้าย`;
  } else if (diffDays === 0) {
    return `⚠️ ปิดรับสมัครวันนี้!`;
  } else {
    return `❌ ปิดรับสมัครแล้ว`;
  }
}
