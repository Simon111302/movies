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

    // Inject CSS to hide ad overlays by class/id patterns
    const styleId = 'ad-blocker-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Hide ad overlays by common patterns */
        [class*="ad-block"],
        [class*="adblock"],
        [id*="ad-block"],
        [id*="adblock"],
        [class*="advertisement"],
        [id*="advertisement"],
        [class*="ad-overlay"],
        [id*="ad-overlay"],
        [class*="ad-popup"],
        [id*="ad-popup"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Use MutationObserver to catch new elements as they're added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const text = element.textContent?.toLowerCase() || '';
            
            // Check for Ad Block Wonder and similar
            if (
              text.includes('ad block wonder') ||
              text.includes('adblock wonder') ||
              text.includes('blocks ads, crushes pop-ups') ||
              text.includes('we silence the noise') ||
              text.includes('take out the trash')
            ) {
              // Hide immediately
              element.style.display = 'none';
              element.style.visibility = 'hidden';
              element.style.opacity = '0';
              element.style.pointerEvents = 'none';
              element.style.height = '0';
              element.style.width = '0';
              element.style.overflow = 'hidden';
              
              // Also try to remove
              setTimeout(() => {
                if (element.parentElement) {
                  element.remove();
                }
              }, 10);
              console.log('🚫 Blocked ad overlay via MutationObserver');
            }
          }
        });
      });
    });

    // Observe the entire document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    overlayIntervalRef.current = startAggressiveOverlayRemoval();

    return () => {
      if (overlayIntervalRef.current) {
        clearInterval(overlayIntervalRef.current);
      }
      observer.disconnect();
    };
  }, [isOpen]);




  // Immediate popup removal on player open
  useEffect(() => {
    if (!isOpen) return;


    const removePopups = () => {
      // Scan entire document for overlays (ads can appear anywhere)
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl || !htmlEl.parentElement) return;
        
        const text = htmlEl.textContent?.toLowerCase() || '';
        const computedStyles = window.getComputedStyle(htmlEl);
        const position = computedStyles.position;
        const zIndex = parseInt(computedStyles.zIndex || '0');
        const display = computedStyles.display;
        const visibility = computedStyles.visibility;
        
        // Skip if hidden
        if (display === 'none' || visibility === 'hidden') return;
        
        // Check for "Ad Block Wonder" and related text patterns
        const isAdBlockWonder = 
          text.includes('ad block wonder') ||
          text.includes('adblock wonder') ||
          text.includes('blocks ads, crushes pop-ups') ||
          text.includes('browse the web without interruptions') ||
          text.includes('we silence the noise') ||
          text.includes('take out the trash') ||
          (text.includes('blocks ads') && text.includes('pop-ups')) ||
          (text.includes('chrome web store') && text.includes('extension'));
        
        // Check if it's an overlay (fixed/absolute with high z-index or positioned)
        const isOverlay = 
          (position === 'fixed' || position === 'absolute') &&
          (zIndex > 100 || text.length > 20); // Lower threshold for z-index
        
        if (isAdBlockWonder && isOverlay) {
          htmlEl.remove();
          console.log('🗑️ Removed AD BLOCK WONDER popup');
          return;
        }
        
        // Also check for elements with specific ad-related patterns
        if (
          (text.includes('continue') && text.includes('extension')) ||
          (text.includes('install') && (text.includes('browser') || text.includes('extension'))) ||
          (text.includes('advertisement') && position !== 'static') ||
          (text.includes('sponsored') && zIndex > 50)
        ) {
          if (position === 'fixed' || position === 'absolute') {
            htmlEl.remove();
            console.log('🗑️ Removed ad overlay');
          }
        }
      });
      
      // Also check for iframe overlays that might be injected
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          // Try to access iframe content (may fail due to CORS)
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const iframeElements = iframeDoc.querySelectorAll('*');
            iframeElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const text = htmlEl.textContent?.toLowerCase() || '';
              if (
                text.includes('ad block wonder') ||
                text.includes('blocks ads, crushes pop-ups') ||
                (text.includes('extension') && text.includes('chrome'))
              ) {
                htmlEl.remove();
                console.log('🗑️ Removed ad from iframe');
              }
            });
          }
        } catch (e) {
          // Cross-origin, can't access - this is expected
        }
      });
    };


    // Run immediately
    removePopups();
    
    // Run every 100ms for very aggressive ad removal
    const immediateInterval = setInterval(removePopups, 100);


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
            sandbox="allow-scripts allow-same-origin"
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
