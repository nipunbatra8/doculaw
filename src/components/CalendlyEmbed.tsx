
import React, { useEffect } from 'react';

interface CalendlyEmbedProps {
  url: string;
  className?: string;
}

const CalendlyEmbed: React.FC<CalendlyEmbedProps> = ({ url, className = '' }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div 
      className={`calendly-inline-widget ${className}`} 
      data-url={url}
      style={{ minWidth: '320px', height: '630px' }}
    />
  );
};

export default CalendlyEmbed;
