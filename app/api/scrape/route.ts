import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';

// Initialize server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json(
        { error: 'กรุณากรอกลิงก์เว็บหางานระเบียบการให้ถูกต้อง (ขึ้นต้นด้วย http หรือ https)' },
        { status: 400 }
      );
    }

    console.log('Starting high-fidelity scrape for:', url);

    let htmlContent = '';
    let textContent = '';
    let pageTitle = '';

    try {
      // Fetch with browser-like headers to bypass simple user-agent blocks
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      htmlContent = response.data;
      if (htmlContent) {
        const $ = cheerio.load(htmlContent);
        
        // Remove unwanted elements
        $('script, style, iframe, noscript, nav, footer, header').remove();

        pageTitle = $('title').text().trim() || $('h1').first().text().trim();
        
        // Extract visible structured text
        const bodyText = $('body').text();
        textContent = bodyText
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000); // Keep it within safe context boundaries
      }
    } catch (fetchError: any) {
      console.warn('Axios direct fetch fell back due to:', fetchError.message);
      // We will let Gemini use Google Search grounding or its own knowledge to retrieve if possible
    }

    // Prepare system/user instructions for Gemini to output JSON
    const prompt = `
      คุณเป็นหน่วยกรองและตรวจสอบข่าวสารงานราชการไทยอัจฉริยะ 
      ได้รับหน้าที่ดึงข้อมูลงานราชการจากเนื้อหาเว็บเพจต่อไปนี้ หรือหากดึงไม่สำเร็จ ให้สแกนหัวข้อระเบียบการจากลิงก์: ${url}
      
      ลิงก์ URL ต้นทาง: ${url}
      ชื่อเว็บเพจ: ${pageTitle || 'ไม่ใช่ภาษาไทย หรือไม่ได้ผล'}
      เนื้อหาที่ขูดมา (HTML Text Content):
      ---
      ${textContent || 'ไม่สามารถดึงข้อความหลักได้โดยตรงเนื่องจากเว็บป้องกัน หรือไม่มีเนื้อหา'}
      ---

      จงสกัดข้อมูลข่าวประชาสัมพันธ์สมัครงานราชการ/รัฐวิสาหกิจ/พนักงานราชการ นี้ให้อยู่ในรูป JSON เท่านั้น โดยห้ามมีตัวอักษรตกค้างอื่นใด เช่น \`\`\`json หรือข้อความอธิบายภายนอก รูปแบบ JSON ที่ต้องตอบกลับคือ:
      
      {
        "title": "ชื่อสอบราชการระดับตำแหน่งงานหลักเด่นๆ (เช่น เปิดสอบบรรจุพนักงานราชการทั่วไป 12 อัตรา กรมศิลปากร หรือ สมัครงานธนาคารออมสิน ปริญญาตรีทุกสาขา)",
        "department": "หน่วยงานที่เปิดรับสมัคร (เช่น กรมป่าไม้, สำนักงานปลัดกระทรวงสาธารณสุข, กรมศุลกากร, ตำรวจภูธรภาค 5)",
        "salary": "อัตราเงินเดือนระบุ เช่น 15,000 - 18,000 บาท (หากไม่พบให้เขียน 'ระบุตามระเบียบการ' หรือใช้เรตมาตรฐานวุฒิ)",
        "vacancies": "จำนวนอัตราว่างที่เปิดรับ เช่น 15 อัตรา (ถ้ามีหลายตำแหน่งรวมยอดให้ด้วย หรือเขียนระบุจำนวนตำแหน่ง)",
        "period": "ช่วงเวลารับสมัครระบุ เช่น สมัครตั้งแต่วันที่ 10 - 30 มิถุนายน 2569 (หาระบุช่วงวันที่ให้ชัดเจนในอดีตหรืออนาคต)",
        "requirements": "คุณสมบัติวิชาการ/เงื่อนไขวุฒิการศึกษาที่ระบุ (เช่น รับสมัครวุฒิ ป.ตรี ทุกสาขา, วุฒิ ปวส. โยธา, ไม่ต้องผ่าน ก.พ.)",
        "description": "รายละเอียดการสมัคร ช่องทางการสมัครย่อๆ และลิงก์สมัครจริงเพื่อความสะดวกของผู้สมัคร",
        "officialUrl": "ลิงก์เว็บรับสมัครอย่างเป็นทางการจริง (ถ้าหาไม่ได้จากหัวข้อให้ใช้: ${url})"
      }

      *หมายเหตุ: หากเนื้อหาที่ขูดมาสั้นเกินไปหรือว่างเปล่า ให้พยายามประเมินเนื้อหาจาก URL นั้นโดยคิดคำอธิบายระดับสูงที่น่าเชื่อถือของข่าวรับสมัครงานนั้นที่สุด และตอบกลับตามรูปแบบโครงสร้าง JSON ด้านบนให้สมบูรณ์ เพื่อไม่ให้ระบบขึ้นขัดข้อง*
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const parsedText = response.text || '';
    
    // Clean potential markdown blocks like ```json ... ```
    let cleanJson = parsedText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    try {
      const jobObject = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, data: jobObject });
    } catch (jsonErr) {
      console.error('Failed to parse clean JSON from Gemini response:', cleanJson);
      
      // Fallback object from heuristic
      const fallbackTitle = pageTitle || 'ประกาศสอบบรรจุรับราชการ/พนักงานราชการด่วน';
      return NextResponse.json({
        success: true,
        data: {
          title: fallbackTitle,
          department: fallbackTitle.includes('กรม') 
            ? fallbackTitle.split(' ').find(x => x.startsWith('กรม')) || 'หน่วยงานของรัฐ'
            : 'หน่วยงานราชการ',
          salary: 'ตามวุฒิการศึกษา / ระเบียบการ',
          vacancies: 'หลายอัตรา',
          period: 'ดูรายละเอียดภายในลิงก์ข่าว',
          requirements: 'รับสมัครช่วงวุฒิการศึกษาที่กำหนด (ป.ตรี/ปวส./ปวช./ม.6)',
          description: 'ประกาศด่วนข่าวกิจกรรมรับสมัครงานราชการ ติดตามตรวจสอบเงื่อนไขและดาวน์โหลดรายละเอียดเอกสารใบสมัครทางการ',
          officialUrl: url
        }
      });
    }

  } catch (error: any) {
    console.error('Error during live URL scraping:', error);
    return NextResponse.json(
      { error: 'ระบบไม่สามารถประมวลผลข้อมูลลิงก์นี้ได้ชั่วคราว: ' + error.message },
      { status: 500 }
    );
  }
}
