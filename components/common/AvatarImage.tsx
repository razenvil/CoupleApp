'use client';

import React, { useState, useEffect } from 'react';
import { getAvatarUrl } from '@/lib/avatars';

interface AvatarImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt = 'Аватар',
  className = 'w-full h-full object-cover',
  fallbackSrc = '/avatars/memoji_1.png',
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(() => getAvatarUrl(src));
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  useEffect(() => {
    setCurrentSrc(getAvatarUrl(src));
    setHasFailed(false);
  }, [src]);

  const handleError = () => {
    if (!hasFailed) {
      setHasFailed(true);
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={handleError}
      loading="eager"
    />
  );
};
