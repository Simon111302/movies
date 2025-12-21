import { useState, useEffect, useRef } from 'react';
import styles from './VideoPlayer.module.css';
import { blockIframeAds } from '../../utils/adBlocker';

type VideoPlayerProps = {
  movieId: number;
  movieTitle: string;
  moviePoster: string;
  movieOverview: string;
  isOpen: boolean;
  onClose: () => void;
};

const serverConfig = {
  vidsrc: 'https://vidsrc.to/embed',
  vidlink: 'https://vidlink.pro',
  vidfast: 'https://vidfast.pro',
  vidnest: 'https://vidnest.fun',
  cinemaos: 'https://cinemaos.tech',
  videasy: 'https://player.videasy.net',
  vidora: 'https://vidora.su',
};

export function VideoPlayer({
  movieId,
  movieTitle,
  moviePoster,
  movieOverview,
  isOpen,
  onClose,
}: VideoPlayerProps) {
  const [currentServer, setCurrentServer] = useState<keyof typeof serverConfig>('vidsrc');
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Lock body scroll when player is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Note: Ad blocker is handled globally in adBlocker.ts
  // No need to detect user's adblocker here

  useEffect(() => {
    if (isOpen && iframeRef.current) {
      const base = serverConfig[currentServer];
      const path = currentServer === 'cinemaos' 
        ? `/player/${movieId}` 
        : `/movie/${movieId}`;
      iframeRef.current.src = base + path;
      
      // Try to block ads in iframe when it loads
      if (iframeRef.current) {
        const handleIframeLoad = () => {
          // Attempt to block ads in iframe (limited by CORS)
          blockIframeAds(iframeRef.current!);
        };
        
        iframeRef.current.addEventListener('load', handleIframeLoad);
        
        return () => {
          iframeRef.current?.removeEventListener('load', handleIframeLoad);
        };
      }
    }
  }, [isOpen, currentServer, movieId]);

  function handleServerChange(server: keyof typeof serverConfig) {
    setCurrentServer(server);
  }

  if (!isOpen) return null;

  const shouldShowReadMore = movieOverview && movieOverview.length > 150;
  const displayOverview = overviewExpanded 
    ? movieOverview 
    : movieOverview?.substring(0, 150) + (shouldShowReadMore ? '...' : '');

  return (
    <div className={styles.playerArea}>
      <div className={styles.playerContainer}>
        <div className={styles.playerHeader}>
          <h2 className={styles.playerTitle}>{movieTitle}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close player">
            <span className={styles.closeIcon}>×</span>
          </button>
        </div>

        <div className={styles.iframeWrapper}>
          <iframe
            ref={iframeRef}
            className={styles.videoIframe}
            src=""
            allowFullScreen
            title={movieTitle}
          />
        </div>

        <div className={styles.serverSwitcher}>
          {Object.keys(serverConfig).map((server, index) => (
            <button
              key={server}
              className={`${styles.serverBtn} ${
                currentServer === server ? styles.active : ''
              }`}
              onClick={() => handleServerChange(server as keyof typeof serverConfig)}
            >
              Server {index + 1}
            </button>
          ))}
        </div>

        <div className={styles.detailsContainer}>
          <img src={moviePoster} alt={movieTitle} className={styles.detailsPoster} />
          <div className={styles.detailsText}>
            <p className={styles.detailsOverview}>
              {displayOverview}
              {shouldShowReadMore && (
                <button
                  className={styles.readMoreBtn}
                  onClick={() => setOverviewExpanded(!overviewExpanded)}
                >
                  {overviewExpanded ? ' Read Less' : ' Read More'}
                </button>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

