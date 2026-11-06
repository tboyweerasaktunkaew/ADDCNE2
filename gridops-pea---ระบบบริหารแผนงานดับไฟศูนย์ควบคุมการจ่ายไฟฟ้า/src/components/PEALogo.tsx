import React from 'react';

/**
 * Official PEA (Provincial Electricity Authority) Emblem SVG
 * High-resolution vector reproduction of the official PEA letterhead emblem
 */
export const PEALogo: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 76,
}) => {
  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Outer Circular Rings */}
        <circle cx="50" cy="50" r="47" stroke="#5B2D82" strokeWidth="3" fill="#FFF" />
        <circle cx="50" cy="50" r="43" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
        <circle cx="50" cy="50" r="39" stroke="#5B2D82" strokeWidth="1" fill="#FFF" />

        {/* Traditional Thai Lotus Rays / Flaming Halo */}
        <path
          d="M50 14 C51 22 55 25 50 32 C45 25 49 22 50 14 Z"
          fill="#D4AF37"
          stroke="#5B2D82"
          strokeWidth="0.8"
        />
        <path
          d="M32 23 C38 29 40 33 36 40 C31 35 30 30 32 23 Z"
          fill="#D4AF37"
          stroke="#5B2D82"
          strokeWidth="0.8"
        />
        <path
          d="M68 23 C62 29 60 33 64 40 C69 35 70 30 68 23 Z"
          fill="#D4AF37"
          stroke="#5B2D82"
          strokeWidth="0.8"
        />
        <path
          d="M20 42 C28 44 31 47 30 55 C23 52 20 48 20 42 Z"
          fill="#D4AF37"
          stroke="#5B2D82"
          strokeWidth="0.8"
        />
        <path
          d="M80 42 C72 44 69 47 70 55 C77 52 80 48 80 42 Z"
          fill="#D4AF37"
          stroke="#5B2D82"
          strokeWidth="0.8"
        />

        {/* Central Energy / Lightning Wheel */}
        <circle cx="50" cy="54" r="22" fill="#5B2D82" />
        <circle cx="50" cy="54" r="20" stroke="#D4AF37" strokeWidth="1.5" fill="none" />

        {/* Garuda Wings / Power Arc Motif */}
        <path
          d="M35 54 C35 44 43 38 50 38 C57 38 65 44 65 54 C65 62 58 68 50 68 C42 68 35 62 35 54 Z"
          fill="#FFF"
        />
        
        {/* Dynamic Electric Lightning Bolt */}
        <path
          d="M52 40 L44 53 L49 53 L46 67 L57 51 L51 51 L55 40 Z"
          fill="#5B2D82"
          stroke="#D4AF37"
          strokeWidth="0.6"
        />

        {/* Thai Lettering Arc Text */}
        <path
          id="peaCurve"
          d="M22 58 A 32 32 0 0 0 78 58"
          fill="none"
        />
        <text fontSize="6.5" fontWeight="bold" fill="#5B2D82" textAnchor="middle">
          <textPath href="#peaCurve" startOffset="50%">
            การไฟฟ้าส่วนภูมิภาค
          </textPath>
        </text>
      </svg>

      {/* Official Typography Under Logo */}
      <div className="mt-1 text-center font-sans tracking-tight">
        <div className="text-[11px] font-bold text-[#5B2D82] leading-none">
          การไฟฟ้าส่วนภูมิภาค
        </div>
        <div className="text-[5.5px] font-bold text-gray-700 tracking-wider uppercase mt-0.5 leading-none">
          PROVINCIAL ELECTRICITY AUTHORITY
        </div>
      </div>
    </div>
  );
};
