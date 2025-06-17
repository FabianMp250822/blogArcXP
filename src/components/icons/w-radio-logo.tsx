import type { SVGProps } from 'react';

export function WRadioLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 150 50"
      width="100"
      height="33.33"
      aria-label="W Radio Logo"
      fill="currentColor" // Inherits color from text-navbar-foreground
      {...props}
    >
      <style>
        {`
          .w-text { font-family: 'Arial Black', 'Impact', sans-serif; font-weight: 900; font-size: 40px; letter-spacing: -2px; }
          .radio-text { font-family: 'Arial', 'Helvetica Neue', sans-serif; font-weight: bold; font-size: 12px; letter-spacing: 0.5px; }
        `}
      </style>
      <text x="5" y="35" className="w-text">W</text>
      <text x="47" y="32" className="radio-text">RADIO</text>
    </svg>
  );
}
