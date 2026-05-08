import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './VideoPlayer.module.css';
import {
  blockIframeAds,
  startAggressiveOverlayRemoval,
} from '../../utils/adBlocker';

type VideoPlayerProps = {
  movieId: number;
  movieTitle: string;
  moviePoster: string;
  movieOverview: string;
  isOpen: boolean;
  onClose: () => void;
};

const CINEMAOS_EMBED_URL_TEMPLATE =
  (import.meta.env.VITE_SERVER_1_EMBED_URL_TEMPLATE as string | undefined) ||
  'https://cinemaos.tech/player/{movieId}';
const PLAYER_LOAD_TIMEOUT_MS = 15000;

function buildPlayerUrl(movieId: number, reloadAttempt: number) {
  const playerUrl = CINEMAOS_EMBED_URL_TEMPLATE.replaceAll(
    '{movieId}',
    String(movieId),
  ).replaceAll('{tmdbId}', String(movieId));

  if (reloadAttempt === 0) {
    return playerUrl;
  }

  return `${playerUrl}${playerUrl.includes('?') ? '&' : '?'}reload=${reloadAttempt}`;
}

export function VideoPlayer({
  movieId,
  movieTitle,
  moviePoster,
  movieOverview,
  isOpen,
  onClose,
}: VideoPlayerProps) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeSrc, setIframeSrc] = useState('');
  const [playerMessage, setPlayerMessage] = useState('');
  const [reloadAttempt, setReloadAttempt] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const popupWindowsRef = useRef<Window[]>([]);
  const overlayIntervalRef = useRef<number | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!isOpen) return;

    const styleId = 'ad-blocker-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
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

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const element = node as HTMLElement;
          const text = element.textContent?.toLowerCase() || '';

          if (
            text.includes('ad block wonder') ||
            text.includes('adblock wonder') ||
            text.includes('blocks ads, crushes pop-ups') ||
            text.includes('we silence the noise') ||
            text.includes('take out the trash')
          ) {
            element.style.display = 'none';
            element.style.visibility = 'hidden';
            element.style.opacity = '0';
            element.style.pointerEvents = 'none';
            element.style.height = '0';
            element.style.width = '0';
            element.style.overflow = 'hidden';

            setTimeout(() => {
              if (element.parentElement) {
                element.remove();
              }
            }, 10);
            console.log('Blocked ad overlay via MutationObserver');
          }
        });
      });
    });

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

  useEffect(() => {
    if (!isOpen) return;

    const removePopups = () => {
      const allElements = document.querySelectorAll('*');

      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl || !htmlEl.parentElement) return;

        const text = htmlEl.textContent?.toLowerCase() || '';
        const computedStyles = window.getComputedStyle(htmlEl);
        const position = computedStyles.position;
        const zIndex = parseInt(computedStyles.zIndex || '0', 10);
        const display = computedStyles.display;
        const visibility = computedStyles.visibility;

        if (display === 'none' || visibility === 'hidden') return;

        const isAdBlockWonder =
          text.includes('ad block wonder') ||
          text.includes('adblock wonder') ||
          text.includes('blocks ads, crushes pop-ups') ||
          text.includes('browse the web without interruptions') ||
          text.includes('we silence the noise') ||
          text.includes('take out the trash') ||
          (text.includes('blocks ads') && text.includes('pop-ups')) ||
          (text.includes('chrome web store') && text.includes('extension'));

        const isOverlay =
          (position === 'fixed' || position === 'absolute') &&
          (zIndex > 100 || text.length > 20);

        if (isAdBlockWonder && isOverlay) {
          htmlEl.remove();
          console.log('Removed ad block popup');
          return;
        }

        if (
          (text.includes('continue') && text.includes('extension')) ||
          (text.includes('install') &&
            (text.includes('browser') || text.includes('extension'))) ||
          (text.includes('advertisement') && position !== 'static') ||
          (text.includes('sponsored') && zIndex > 50)
        ) {
          if (position === 'fixed' || position === 'absolute') {
            htmlEl.remove();
            console.log('Removed ad overlay');
          }
        }
      });

      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) return;

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
              console.log('Removed ad from iframe');
            }
          });
        } catch {
          // Cross-origin iframe access is expected to fail.
        }
      });
    };

    removePopups();
    const immediateInterval = setInterval(removePopups, 100);

    return () => clearInterval(immediateInterval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const originalWindowOpen = window.open;
    let clickCount = 0;

    window.open = function overrideWindowOpen() {
      console.log('Blocked popup attempt');
      return null;
    } as typeof window.open;

    const handleWrapperClick = () => {
      clickCount += 1;

      if (clickCount === 1) {
        console.log('First click detected, blocking popups');
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

  useEffect(() => {
    if (!isOpen) return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
      );

      if (isFullscreen) {
        console.log('Fullscreen detected, closing popups');
        closeAllPopups();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setIsIframeLoading(true);
    setPlayerMessage('');
    setIframeSrc(buildPlayerUrl(movieId, reloadAttempt));
  }, [isOpen, movieId, reloadAttempt]);

  useEffect(() => {
    if (!isOpen) return;
    setReloadAttempt(0);
  }, [isOpen, movieId]);

  useEffect(() => {
    if (!isOpen || !isIframeLoading || !iframeSrc) return;

    loadTimeoutRef.current = window.setTimeout(() => {
      setIsIframeLoading(false);
      setPlayerMessage('CinemaOS is taking too long to respond. Reload the player and try again.');
    }, PLAYER_LOAD_TIMEOUT_MS);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [isOpen, isIframeLoading, iframeSrc]);

  useEffect(() => {
    if (!isOpen) return;
    setOverviewExpanded(false);
  }, [isOpen, movieId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function closeAllPopups() {
    popupWindowsRef.current.forEach((popup) => {
      try {
        if (popup && !popup.closed) {
          popup.close();
          console.log('Closed popup');
        }
      } catch {
        // Ignore popup close errors.
      }
    });
    popupWindowsRef.current = [];

    try {
      if (window.opener) {
        window.close();
      }
    } catch {
      // Ignore close window errors.
    }
  }

  function handleIframeLoad() {
    if (!iframeRef.current) return;
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsIframeLoading(false);
    setPlayerMessage('');
    blockIframeAds(iframeRef.current);
  }

  function handleIframeError() {
    setIsIframeLoading(false);
    setPlayerMessage('CinemaOS could not load this movie. Reload the player and try again.');
  }

  function handleReloadPlayer() {
    closeAllPopups();
    setPlayerMessage('');
    setIsIframeLoading(true);
    setReloadAttempt((attempt) => attempt + 1);
  }

  function handleClose() {
    closeAllPopups();
    if (overlayIntervalRef.current) {
      clearInterval(overlayIntervalRef.current);
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    onClose();
  }

  if (!isOpen) return null;

  const shouldShowReadMore = movieOverview && movieOverview.length > 150;
  const displayOverview = overviewExpanded
    ? movieOverview
    : movieOverview?.substring(0, 150) + (shouldShowReadMore ? '...' : '');
  const hasOverview = movieOverview.trim().length > 0;

  return createPortal(
    <div className={styles.playerArea}>
      <button
        className={`${styles.closeBtn} ${styles.floatingCloseBtn}`}
        onClick={handleClose}
        aria-label="Close player"
      >
        <span className={styles.closeIcon}>X</span>
      </button>

      <div className={styles.playerContainer}>
        <div className={styles.playerHeader}>
          <div className={styles.titleBlock}>
            <span className={styles.kicker}>Streaming room</span>
            <h2 className={styles.playerTitle}>{movieTitle}</h2>
            <p className={styles.playerSubtitle}>
              CinemaOS loads the selected movie using its TMDB ID.
            </p>
          </div>
        </div>

        <div className={styles.stagePanel}>
          <div className={styles.stageHeader}>
            <div className={styles.stageBadge}>Now playing</div>
            <div className={styles.stageActions}>
              <p className={styles.stageNote}>
                Powered by the configured CinemaOS player.
              </p>
              {iframeSrc && (
                <button className={styles.reloadButton} onClick={handleReloadPlayer}>
                  Reload player
                </button>
              )}
            </div>
          </div>

          <div className={styles.iframeWrapper}>
            {isIframeLoading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.loadingPulse} aria-hidden="true" />
                <span className={styles.loadingTitle}>Loading video</span>
                <span className={styles.loadingHint}>
                  Preparing video for {movieTitle}
                </span>
              </div>
            )}

            {playerMessage && (
              <div className={styles.playerMessage}>
                <span>{playerMessage}</span>
                {iframeSrc && (
                  <button className={styles.reloadButton} onClick={handleReloadPlayer}>
                    Reload player
                  </button>
                )}
              </div>
            )}

            {iframeSrc && (
              <iframe
                ref={iframeRef}
                className={styles.videoIframe}
                src={iframeSrc}
                title={movieTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation"
                loading="lazy"
                frameBorder={0}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            )}
          </div>
        </div>

        <div className={styles.detailsContainer}>
          <img src={moviePoster} alt={movieTitle} className={styles.detailsPoster} />

          <div className={styles.detailsText}>
            <div className={styles.detailPills}>
              <span className={styles.detailPill}>Movie</span>
              <span className={styles.detailPill}>CinemaOS</span>
              <span className={styles.detailPill}>TMDB #{movieId}</span>
            </div>
            <h3 className={styles.detailsTitle}>{movieTitle}</h3>
            <p className={styles.detailsOverview}>
              {hasOverview ? displayOverview : 'No overview is available for this title yet.'}
              {hasOverview && shouldShowReadMore && (
                <button
                  className={styles.readMoreBtn}
                  onClick={() => setOverviewExpanded(!overviewExpanded)}
                >
                  {overviewExpanded ? ' Read Less' : ' Read More'}
                </button>
              )}
            </p>
          </div>

          <div className={styles.tipCard}>
            <span className={styles.tipLabel}>Playback tips</span>
            <p className={styles.tipText}>
              Use fullscreen after the video starts for a larger viewing area.
            </p>
            <p className={styles.tipText}>
              If playback stalls, reload the CinemaOS player instead of the whole page.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
