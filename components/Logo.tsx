import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function LogoImage({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform hover:scale-105 duration-300`}
    >
      {/* Outer Navy Ring */}
      <circle cx="100" cy="100" r="94" fill="#0F1E36" />
      
      {/* White Accent Thin border */}
      <circle cx="100" cy="100" r="88" stroke="#FFFFFF" strokeWidth="3.5" />
      
      {/* Royal Blue Inner Ring */}
      <circle cx="100" cy="100" r="80" fill="#1370B0" />
      
      {/* Circular starry pattern lining the inner edge (10 stars matching the curve) */}
      <g fill="#FFFFFF">
        {/* Left Side Stars */}
        <polygon points="56,66 58,72 64,72 59,75 61,81 56,77 51,81 53,75 48,72 54,72" />
        <polygon points="42,88 44,94 50,94 45,97 47,103 42,99 37,103 39,97 34,94 40,94" />
        <polygon points="40,112 42,118 48,118 43,121 45,127 40,123 35,127 37,121 32,118 38,118" />
        <polygon points="51,134 53,140 59,140 54,143 56,149 51,145 46,149 48,143 43,140 49,140" />
        <polygon points="68,152 70,158 76,158 71,161 73,167 68,163 63,167 65,161 60,158 66,158" />
        <polygon points="90,162 92,168 98,168 93,171 95,177 90,173 85,177 87,171 82,168 88,168" />
        
        {/* Right Side Stars */}
        <polygon points="144,66 146,72 152,72 147,75 149,81 144,77 139,81 141,75 136,72 142,72" />
        <polygon points="158,88 160,94 166,94 161,97 163,103 158,99 153,103 155,97 150,94 156,94" />
        <polygon points="160,112 162,118 168,118 163,121 165,127 160,123 155,127 157,121 152,118 158,118" />
        <polygon points="149,134 151,140 157,140 152,143 154,149 149,145 144,149 146,143 141,140 147,140" />
      </g>
      
      {/* Inner White Plate with Dark Navy Outline */}
      <circle cx="100" cy="100" r="62" fill="#FFFFFF" stroke="#0F1E36" strokeWidth="5.5" />
      
      {/* Document Sheet representation */}
      <g transform="translate(68, 52)">
        {/* Page outline with a nice drop corner */}
        <path d="M4 0 H48 L58 10 V68 C58 70.2 56.2 72 54 72 H4 C1.8 72 0 70.2 0 68 V4 C0 1.8 1.8 0 4 0 Z" fill="#FFFFFF" stroke="#0F1E36" strokeWidth="4.5" strokeLinejoin="miter" />
        
        {/* Top left mini blue star inside page */}
        <polygon points="15,14 17,19 22,19 18,22 20,27 15,24 10,27 12,22 8,19 13,19" fill="#1370B0" />
        
        {/* Folded page corner in dark navy */}
        <path d="M48 0 V10 H58 Z" fill="#0F1E36" />
        
        {/* Horizontal text lines */}
        <line x1="28" y1="16" x2="46" y2="16" stroke="#0F1E36" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="30" x2="46" y2="30" stroke="#0F1E36" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="40" x2="46" y2="40" stroke="#0F1E36" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="50" x2="34" y2="50" stroke="#0F1E36" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="60" x2="28" y2="60" stroke="#0F1E36" strokeWidth="3" strokeLinecap="round" />
      </g>
      
      {/* Magnifying Glass Laid over Bottom Right */}
      <g transform="translate(110, 110)">
        {/* Thick Handle */}
        <line x1="15" y1="15" x2="38" y2="38" stroke="#0F1E36" strokeWidth="12" strokeLinecap="round" />
        {/* Inset white shininess inside the handle */}
        <line x1="16" y1="16" x2="32" y2="32" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        
        {/* Outer frame ring */}
        <circle cx="5" cy="5" r="21" fill="#FFFFFF" stroke="#0F1E36" strokeWidth="6" />
        {/* Cool modern blue lens flare overlay */}
        <circle cx="5" cy="5" r="15" fill="#1370B0" fillOpacity="0.15" />
        
        {/* Plus sign (+) inside the lens */}
        <line x1="5" y1="0" x2="5" y2="10" stroke="#1370B0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="0" y1="5" x2="10" y2="5" stroke="#1370B0" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function Logo({ className = "", size = 48, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoImage size={size} className="shrink-0" />
      {showText && (
        <div className="flex flex-col select-none text-left">
          {/* Styled Branding Title with correct colors */}
          <div className="flex items-baseline leading-none">
            <span className="text-lg md:text-[22px] font-extrabold tracking-tight text-[#0F1E36] font-sans">Job</span>
            <span className="text-lg md:text-[22px] font-extrabold tracking-tight text-[#1370B0] font-sans">Gov</span>
            <span className="text-lg md:text-[22px] font-extrabold tracking-tight text-[#0F1E36] font-sans">Easy</span>
          </div>
          
          {/* Subtitle 1 with high character spacing */}
          <span className="text-[7.5px] md:text-[8.5px] font-extrabold tracking-[0.14em] text-[#0F1E36]/70 uppercase mt-1 font-sans">
            A GOVERNMENT JOB SEARCH BLOG
          </span>
          
          {/* Royal Blue Divider Line */}
          <div className="h-[2px] bg-[#1370B0] w-full mt-0.5 rounded-full" />
          
          {/* Subtitle 2 */}
          <span className="text-[7px] md:text-[8px] font-bold tracking-[0.08em] text-[#1370B0] uppercase mt-0.5 font-sans">
            FOR GOVERNMENT WORK
          </span>
        </div>
      )}
    </div>
  );
}
