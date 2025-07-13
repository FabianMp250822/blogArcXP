'use client';

import { useState } from 'react';

interface RobinsonRadaLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function RobinsonRadaLogo({ className = '', width = 280, height = 80 }: RobinsonRadaLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 280 80"
        xmlns="http://www.w3.org/2000/svg"
        className="cursor-pointer"
      >
        {/* Gradiente de fondo */}
        <defs>
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          
          <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1" />
          </linearGradient>

          {/* Filtro de sombra */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#1e40af" floodOpacity="0.3"/>
          </filter>
        </defs>

        {/* Fondo decorativo */}
        <rect
          x="0"
          y="0"
          width="280"
          height="80"
          rx="12"
          fill="url(#shadowGradient)"
          opacity={isHovered ? "0.1" : "0.05"}
          className="transition-opacity duration-300"
        />

        {/* Línea decorativa superior */}
        <rect
          x="10"
          y="8"
          width="260"
          height="2"
          rx="1"
          fill="url(#textGradient)"
          opacity="0.6"
        >
          <animate
            attributeName="width"
            values="0;260;260"
            dur="2s"
            begin="0s"
            fill="freeze"
          />
        </rect>

        {/* Texto principal "ROBINSON" */}
        <text
          x="20"
          y="32"
          fontFamily="'Inter', 'Arial', sans-serif"
          fontSize="18"
          fontWeight="700"
          fill="url(#textGradient)"
          filter="url(#dropShadow)"
        >
          <tspan>ROBINSON</tspan>
          <animate
            attributeName="opacity"
            values="0;1"
            dur="1s"
            begin="0.5s"
            fill="freeze"
          />
        </text>

        {/* Texto "RADA GONZÁLEZ" */}
        <text
          x="20"
          y="52"
          fontFamily="'Inter', 'Arial', sans-serif"
          fontSize="16"
          fontWeight="600"
          fill="url(#textGradient)"
          opacity="0.9"
          filter="url(#dropShadow)"
        >
          <tspan>RADA GONZÁLEZ</tspan>
          <animate
            attributeName="opacity"
            values="0;0.9"
            dur="1s"
            begin="1s"
            fill="freeze"
          />
        </text>

        {/* Elemento decorativo - círculo animado */}
        <circle
          cx="240"
          cy="25"
          r="3"
          fill="#3b82f6"
          opacity="0.7"
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
            values="0.4;0.8;0.4"
            dur="2s"
            repeatCount="indefinite"
            begin="1.5s"
          />
        </circle>

        {/* Elemento decorativo - líneas animadas */}
        <g opacity={isHovered ? "0.8" : "0.4"} className="transition-opacity duration-300">
          <line
            x1="200"
            y1="35"
            x2="220"
            y2="35"
            stroke="#60a5fa"
            strokeWidth="1"
            strokeLinecap="round"
          >
            <animate
              attributeName="x2"
              values="200;220;200"
              dur="3s"
              repeatCount="indefinite"
              begin="2s"
            />
          </line>
          
          <line
            x1="200"
            y1="40"
            x2="215"
            y2="40"
            stroke="#60a5fa"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.6"
          >
            <animate
              attributeName="x2"
              values="200;215;200"
              dur="3s"
              repeatCount="indefinite"
              begin="2.5s"
            />
          </line>
        </g>

        {/* Línea decorativa inferior */}
        <rect
          x="10"
          y="70"
          width="260"
          height="2"
          rx="1"
          fill="url(#textGradient)"
          opacity="0.4"
        >
          <animate
            attributeName="width"
            values="0;260;260"
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
            width="280"
            height="80"
            rx="12"
            fill="none"
            stroke="url(#textGradient)"
            strokeWidth="1"
            opacity="0.5"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
