import React from 'react';

export default function Background() {
  return (
    <div 
      className="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-multiply grayscale z-0"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2073&auto=format&fit=crop)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    />
  );
}
