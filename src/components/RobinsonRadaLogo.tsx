'use client';

import { useState } from 'react';

interface RobinsonRadaLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function RobinsonRadaLogo({ className = '', width = 360, height = 70 }: RobinsonRadaLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`inline-block w-full max-w-full ${className}`}
      style={{ minWidth: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        width="100%"
        height={height}
        viewBox="0 0 360 70"
        preserveAspectRatio="xMinYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className="cursor-pointer block w-full h-auto"
        style={{ display: 'block', width: '100%', height: 'auto', minWidth: 0 }}
      >
        {/* Gradientes actualizados para texto blanco */}
        <defs>
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          
          <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.05" />
          </linearGradient>

          {/* Filtro de sombra para texto blanco */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.3"/>
          </filter>
        </defs>

        {/* Fondo decorativo más sutil */}
        <rect
          x="0"
          y="0"
          width="360"
          height="70"
          rx="8"
          fill="url(#shadowGradient)"
          opacity={isHovered ? "0.08" : "0.03"}
          className="transition-opacity duration-300"
        />

        {/* Línea decorativa superior */}
        <rect
          x="15"
          y="8"
          width="330"
          height="1"
          rx="0.5"
          fill="url(#textGradient)"
          opacity="0.4"
        >
          <animate
            attributeName="width"
            values="0;330;330"
            dur="2s"
            begin="0s"
            fill="freeze"
          />
        </rect>

        {/* Texto completo en una sola línea "ROBINSON RADA GONZÁLEZ" */}
        <text
          x="20"
          y="42"
          fontFamily="'Inter', 'Arial', sans-serif"
          fontSize="24"
          fontWeight="700"
          fill="url(#textGradient)"
          filter="url(#dropShadow)"
          letterSpacing="1px"
          textLength="320"
          lengthAdjust="spacingAndGlyphs"
          style={{ minWidth: 0 }}
        >
          ROBINSON RADA GONZÁLEZ
          <animate
            attributeName="opacity"
            values="0;1"
            dur="1.5s"
            begin="0.5s"
            fill="freeze"
          />
        </text>

        {/* Elemento decorativo - círculo animado */}
        <circle
          cx="320"
          cy="35"
          r="3"
          fill="#ffffff"
          opacity="0.6"
        >
          <animate
            attributeName="r"
            values="2;4;2"
            dur="2s"
            repeatCount="indefinite"
            begin="1.5s"
          />
          <animate
            attributeName="opacity"
            values="0.3;0.7;0.3"
            dur="2s"
            repeatCount="indefinite"
            begin="1.5s"
          />
        </circle>

        {/* Elemento decorativo - líneas animadas (más sutiles) */}
        <g opacity={isHovered ? "0.6" : "0.3"} className="transition-opacity duration-300">
          <line
            x1="300"
            y1="50"
            x2="320"
            y2="50"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinecap="round"
          >
            <animate
              attributeName="x2"
              values="300;320;300"
              dur="3s"
              repeatCount="indefinite"
              begin="2s"
            />
          </line>
          
          <line
            x1="305"
            y1="54"
            x2="315"
            y2="54"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.4"
          >
            <animate
              attributeName="x2"
              values="305;315;305"
              dur="3s"
              repeatCount="indefinite"
              begin="2.5s"
            />
          </line>
        </g>

        {/* Línea decorativa inferior */}
        <rect
          x="15"
          y="60"
          width="330"
          height="1"
          rx="0.5"
          fill="url(#textGradient)"
          opacity="0.3"
        >
          <animate
            attributeName="width"
            values="0;330;330"
            dur="2s"
            begin="0.3s"
            fill="freeze"
          />
        </rect>

        {/* Efecto de brillo al hover */}
        {isHovered && (
          <rect
            x="0"
            y="0"
            width="360"
            height="70"
            rx="8"
            fill="none"
            stroke="url(#textGradient)"
            strokeWidth="1"
            opacity="0.4"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
