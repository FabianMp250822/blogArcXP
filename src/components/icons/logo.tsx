import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width="150"
      height="37.5"
      aria-label="Firebase News Logo"
      {...props}
    >
      <rect width="200" height="50" rx="5" fill="hsl(var(--primary))" />
      <text
        x="100"
        y="32"
        fontFamily="'Space Grotesk', sans-serif"
        fontSize="24"
        fill="hsl(var(--primary-foreground))"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        FirebaseNews
      </text>
    </svg>
  );
}
