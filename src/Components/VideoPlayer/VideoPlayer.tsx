// src/Components/VideoPlayer/VideoPlayer.tsx
import { useState, useEffect, useRef } from 'react';
import styles from './VideoPlayer.module.css';
import { blockIframeAds, startAggressiveOverlayRemoval } from '../../utils/adBlocker';




type VideoPlayerProps = {
  movieId: number;
  movieTitle: string;
  moviePoster: string;
  movieOverview: string;
  isOpen: boolean;
  onClose: () => void;
};




const serverConfig = {
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
  const [currentServer, setCurrentServer] =
    useState<keyof typeof serverConfig>('vidnest');
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const popupWindowsRef = useRef<Window[]>([]);
  const overlayIntervalRef = useRef<number | null>(null);




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




  // Start aggressive overlay removal
  useEffect(() => {
    if (!isOpen) return;




    overlayIntervalRef.current = startAggressiveOverlayRemoval();




    return () => {
      if (overlayIntervalRef.current) {
        clearInterval(overlayIntervalRef.current);
      }
    };
  }, [isOpen]);




  // Immediate popup removal on player open
  useEffect(() => {
    if (!isOpen) return;


    const removePopups = () => {
      // ONLY scan within the player area, not the entire document
      const playerArea = document.querySelector(`.${styles.playerArea}`);
      if (!playerArea) return;


      // Remove by text content - ONLY within player
      const allElements = playerArea.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const text = htmlEl.textContent?.toLowerCase() || '';
        
        // More specific targeting for "AD BLOCK WONDER"
        if (
          text.includes('ad block wonder') ||
          text.includes('browse the web without interruptions') ||
          text.includes('chrome web store') ||
          (text.includes('add extension') && text.includes('privacy policy'))
        ) {
          // Check if element is positioned over video
          const computedStyles = window.getComputedStyle(htmlEl);
          const position = computedStyles.position;
          
          if (position === 'fixed' || position === 'absolute') {
            htmlEl.remove();
            console.log('🗑️ Removed AD BLOCK WONDER popup');
          }
        }
      });


      // Also scan for high z-index overlays ONLY
      const highZIndexElements = document.querySelectorAll('*');
      highZIndexElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computedStyles = window.getComputedStyle(htmlEl);
        const zIndex = parseInt(computedStyles.zIndex || '0');
        
        // Only target elements with very high z-index (likely overlays)
        if (zIndex > 9999) {
          const text = htmlEl.textContent?.toLowerCase() || '';
          if (text.includes('extension') || text.includes('chrome') || text.includes('install')) {
            htmlEl.remove();
            console.log('🗑️ Removed high z-index popup');
          }
        }
      });
    };


    // Run immediately
    removePopups();
    
    // Run every 500ms (slower to reduce interference)
    const immediateInterval = setInterval(removePopups, 500);


    return () => clearInterval(immediateInterval);
  }, [isOpen]);




 // Block popups on click/play
useEffect(() => {
  if (!isOpen) return;

  const originalWindowOpen = window.open;
  let clickCount = 0;

  // Override window.open completely - use type assertion
  (window.open as any) = function (
    url?: string | URL,
    _target?: string,
    _features?: string
  ): Window | null {
    const urlString = url ? (typeof url === 'string' ? url : url.toString()) : '';

    console.log('🚫 Blocked popup attempt:', urlString);

    // Block ALL popups from iframe clicks
    return null;
  };

  // Intercept clicks on iframe wrapper to prevent popups
  const handleWrapperClick = () => {
    clickCount++;

    // First click usually triggers popup
    if (clickCount === 1) {
      console.log('🛡️ First click detected - blocking popups');

      // Close any popups that might have opened
      setTimeout(() => {
        closeAllPopups();
      }, 100);
    }
  };

  const iframeWrapper = iframeRef.current?.parentElement;
  if (iframeWrapper) {
    iframeWrapper.addEventListener('click', handleWrapperClick);
  }

  return () => {
    window.open = originalWindowOpen;
    if (iframeWrapper) {
      iframeWrapper.removeEventListener('click', handleWrapperClick);
    }
  };
}, [isOpen]);





  // Monitor fullscreen changes
  useEffect(() => {
    if (!isOpen) return;




    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );




      if (isFullscreen) {
        console.log('🎬 Fullscreen - closing popups');
        closeAllPopups();
      }
    };




    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);




    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange
      );
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isOpen]);




  // Close all tracked popups
  function closeAllPopups() {
    // Close tracked windows
    popupWindowsRef.current.forEach((popup) => {
      try {
        if (popup && !popup.closed) {
          popup.close();
          console.log('✅ Closed popup');
        }
      } catch (e) {
        // Ignore errors
      }
    });
    popupWindowsRef.current = [];




    // Also try to close any new windows
    try {
      if (window.opener) {
        window.close();
      }
    } catch (e) {
      // Ignore errors
    }
  }




  // Set iframe src when opened / server changes
  useEffect(() => {
    if (!isOpen || !iframeRef.current) return;




    const base = serverConfig[currentServer];
    const path =
      currentServer === 'cinemaos' ? `/player/${movieId}` : `/movie/${movieId}`;
    iframeRef.current.src = base + path;
  }, [isOpen, currentServer, movieId]);




  function handleServerChange(server: keyof typeof serverConfig) {
    setCurrentServer(server);
    closeAllPopups();
  }




  function handleIframeLoad() {
    if (!iframeRef.current) return;
    blockIframeAds(iframeRef.current);
  }




  function handleClose() {
    closeAllPopups();
    if (overlayIntervalRef.current) {
      clearInterval(overlayIntervalRef.current);
    }
    onClose();
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
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close player"
          >
            <span className={styles.closeIcon}>×</span>
          </button>
        </div>




        <div className={styles.iframeWrapper}>
          <iframe
            ref={iframeRef}
            className={styles.videoIframe}
            src=""
            title={movieTitle}
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
            loading="lazy"
            frameBorder={0}
            onLoad={handleIframeLoad}
          />
        </div>




        <div className={styles.serverSwitcher}>
          {Object.keys(serverConfig).map((server, index) => (
            <button
              key={server}
              className={`${styles.serverBtn} ${
                currentServer === server ? styles.active : ''
              }`}
              onClick={() =>
                handleServerChange(server as keyof typeof serverConfig)
              }
            >
              Server {index + 1}
            </button>
          ))}
        </div>




        <div className={styles.detailsContainer}>
          <img
            src={moviePoster}
            alt={movieTitle}
            className={styles.detailsPoster}
          />
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
