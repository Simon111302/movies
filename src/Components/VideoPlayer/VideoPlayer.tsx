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

const serverConfig = {
  cinemaos: 'https://cinemaos.tech',
  vidnest: 'https://vidnest.fun',
  videasy: 'https://player.videasy.net',
  vidora: 'https://vidora.su',
};

type ServerId = keyof typeof serverConfig;

const serverOptions: Array<{
  id: ServerId;
  label: string;
  provider: string;
  hint: string;
}> = [
  {
    id: 'cinemaos',
    label: 'Server 1',
    provider: 'CinemaOS',
    hint: 'Best default source',
  },
  {
    id: 'vidnest',
    label: 'Server 2',
    provider: 'Vidnest',
    hint: 'Fast alternate stream',
  },
  {
    id: 'videasy',
    label: 'Server 3',
    provider: 'Videasy',
    hint: 'Try if playback stalls',
  },
  {
    id: 'vidora',
    label: 'Server 4',
    provider: 'Vidora',
    hint: 'Last backup option',
  },
];

export function VideoPlayer({
  movieId,
  movieTitle,
  moviePoster,
  movieOverview,
  isOpen,
  onClose,
}: VideoPlayerProps) {
  const [currentServer, setCurrentServer] = useState<ServerId>('cinemaos');
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const popupWindowsRef = useRef<Window[]>([]);
  const overlayIntervalRef = useRef<number | null>(null);

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
    if (!isOpen || !iframeRef.current) return;

    const base = serverConfig[currentServer];
    const path = currentServer === 'cinemaos' ? `/player/${movieId}` : `/movie/${movieId}`;
    setIsIframeLoading(true);
    iframeRef.current.src = base + path;
  }, [isOpen, currentServer, movieId]);

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

  function handleServerChange(server: ServerId) {
    setCurrentServer(server);
    setIsIframeLoading(true);
    closeAllPopups();
  }

  function handleIframeLoad() {
    if (!iframeRef.current) return;
    setIsIframeLoading(false);
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
  const activeServer =
    serverOptions.find((server) => server.id === currentServer) ?? serverOptions[0];
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
              Clean playback view with quick server switching if the stream hangs or stays
              blank.
            </p>
          </div>
        </div>

        <div className={styles.stagePanel}>
          <div className={styles.stageHeader}>
            <div className={styles.stageBadge}>Now playing</div>
            <p className={styles.stageNote}>
              If the player takes too long to load, switch to another source below.
            </p>
          </div>

          <div className={styles.iframeWrapper}>
            {isIframeLoading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.loadingPulse} aria-hidden="true" />
                <span className={styles.loadingTitle}>Loading stream</span>
                <span className={styles.loadingHint}>
                  Preparing secure stream for {movieTitle}
                </span>
              </div>
            )}

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
        </div>

        <div className={styles.serverPanel}>
          <div className={styles.serverPanelHeader}>
            <div>
              <h3 className={styles.serverPanelTitle}>Choose a source</h3>
              <p className={styles.serverPanelText}>
                Start with Server 1. Move to another option if playback freezes, buffers, or
                opens blank.
              </p>
            </div>
          </div>

          <div className={styles.serverSwitcher}>
            {serverOptions.map((server) => (
              <button
                key={server.id}
                className={`${styles.serverBtn} ${
                  currentServer === server.id ? styles.active : ''
                }`}
                onClick={() => handleServerChange(server.id)}
              >
                <span className={styles.serverLabel}>{server.label}</span>
                <span className={styles.serverProvider}>{server.provider}</span>
                <span className={styles.serverHint}>{server.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.detailsContainer}>
          <img src={moviePoster} alt={movieTitle} className={styles.detailsPoster} />

          <div className={styles.detailsText}>
            <div className={styles.detailPills}>
              <span className={styles.detailPill}>Movie</span>
              <span className={styles.detailPill}>{activeServer.label}</span>
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
              Use fullscreen after the stream starts to reduce accidental overlays.
            </p>
            <p className={styles.tipText}>
              If one server fails, switch sources instead of reloading the whole page.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
