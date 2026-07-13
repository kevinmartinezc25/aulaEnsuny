import React from 'react'

interface LogoProps extends React.SVGProps<SVGSVGElement> {}

export function Logo({ className = "w-full h-full", fill = "currentColor", ...props }: LogoProps) {
  return (
    // Pegar aquí el código <svg> real del logo cuando se convierta desde la imagen.
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 200 60" 
      className={className}
      fill={fill}
      {...props}
    >
      <text 
        x="50%" 
        y="50%" 
        dominantBaseline="middle" 
        textAnchor="middle" 
        fontSize="40" 
        fontWeight="bold" 
        fontFamily="system-ui, sans-serif"
      >
        aulaEnsuny
      </text>
    </svg>
  )
}
