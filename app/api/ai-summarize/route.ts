import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const { rawTitle, rawContent, url } = await req.json();

    if (!rawTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    try {
      const client = getAiClient();
      
      const prompt = `
You are an expert AI parser for Thai Government Job recruitments.
Given a raw job recruitment title and content crawled from OCSC (Office of the Civil Service Commission), parse and extract the structured information.

Raw Title: "${rawTitle}"
Raw Content: "${rawContent || ''}"
URL: "${url || ''}"

Please classify and extract the following:
1. "title": Refined Thai title. Keep it professional.
2. "category": Choose exactly one of: "ข้าราชการ", "พนักงานราชการ", "ลูกจ้าง"
3. "education_level": Usually values like "ปริญญาตรี", "ปริญญาโท", "ปวส.", "ปวช.", "ม.3", "ม.6" or "ไม่ระบุ"
4. "region": Usually provinces or regions like "กรุงเทพมหานคร", "ภาคกลาง", "ภาคเหนือ", "ภาคใต้", "ภาคตะวันออกเฉียงเหนือ" or "ทั่วประเทศ"
5. "application_start_date": Format 'YYYY-MM-DD' if found, otherwise estimate or return null.
6. "application_end_date": Format 'YYYY-MM-DD' if found, otherwise estimate or return null.
7. "exam_date": Format 'YYYY-MM-DD' if found, otherwise return null.
8. "content": A structured Thai markdown summary of the role, benefits, and application methods. Keep it neat and beautifully formatted.

Return the result strictly as a JSON object (no markdown block wrapper unless it is \`\`\`json):
{
  "title": "...",
  "category": "...",
  "education_level": "...",
  "region": "...",
  "application_start_date": "YYYY-MM-DD or null",
  "application_end_date": "YYYY-MM-DD or null",
  "exam_date": "YYYY-MM-DD or null",
  "content": "..."
}
`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text || '';
      const cleanedText = text.replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, '').trim();
      const result = JSON.parse(cleanedText);

      return NextResponse.json({ success: true, data: result });
    } catch (aiErr: any) {
      console.error('Gemini parsing error:', aiErr);
      
      // Fallback heuristics if Gemini fails or is not configured
      let category = 'ข้าราชการ';
      if (rawTitle.includes('พนักงานราชการ')) category = 'พนักงานราชการ';
      else if (rawTitle.includes('ลูกจ้าง')) category = 'ลูกจ้าง';

      let education_level = 'ปริญญาตรี';
      if (rawTitle.includes('ปวส')) education_level = 'ปวส.';
      else if (rawTitle.includes('ปวช')) education_level = 'ปวช.';
      else if (rawTitle.includes('โท')) education_level = 'ปริญญโท';
      else if (rawTitle.includes('ม.3') || rawTitle.includes('ม.6')) education_level = 'มัธยมศึกษา';

      let region = 'กรุงเทพมหานคร';
      if (rawTitle.includes('เชียงใหม่') || rawTitle.includes('ลำปาง')) region = 'ภาคเหนือ';
      else if (rawTitle.includes('ขอนแก่น') || rawTitle.includes('โคราช')) region = 'ภาคตะวันออกเฉียงเหนือ';
      else if (rawTitle.includes('สงขลา') || rawTitle.includes('ด่านสะเดา')) region = 'ภาคใต้';

      return NextResponse.json({
        success: true,
        isFallback: true,
        data: {
          title: rawTitle,
          category,
          education_level,
          region,
          application_start_date: new Date().toISOString().split('T')[0],
          application_end_date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
          exam_date: null,
          content: `### รายละเอียดการรับสมัคร\n\n${rawContent || 'ดึงรายละเอียดอัตโนมัติจากเว็บบอร์ดสำนักงาน ก.พ.'}\n\n**ลิงก์ข้อมูลเพิ่มเติม:** [คลิกเพื่อเข้าชมคลังข้อมูล](${url || '#'})`
        }
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
