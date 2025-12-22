/**
 * Enhanced Ad Blocker Utility
 * Blocks ads, ad scripts, and ad-related content including fake install popups
 */

// Common ad domains and patterns to block
const AD_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google',
  'adsafeprotected.com',
  'advertising.com',
  'adnxs.com',
  'adsrvr.org',
  'adtechus.com',
  'amazon-adsystem.com',
  'adform.net',
  'adition.com',
  'adzerk.net',
  'openx.net',
  'pubmatic.com',
  'rubiconproject.com',
  'scorecardresearch.com',
  'outbrain.com',
  'taboola.com',
  'adsystem.com',
  'adsrvr.com',
  'adserver.com',
  'adserver.net',
  'adserver.org',
  'adtech.com',
  'criteo.com',
  'media.net',
  'bidswitch.net',
  'casalemedia.com',
  'smartadserver.com',
];

// Ad-related class names and IDs to block (more specific to avoid false positives)
const AD_SELECTORS = [
  '.adsbygoogle',
  '.ad-container',
  '.ad-wrapper',
  '.ad-unit',
  '.advertisement',
  '.ad-banner',
  '.sponsored-content',
  '.promo-banner',
  '[id*="google_ads"]',
  '[id*="advertisement"]',
  '[id*="ad-banner"]',
  '.ad-slot',
  '[data-ad]',
  '[class*="ad-"]',

  // Fake install popups & overlays
  '[class*="install"]',
  '[class*="download"]',
  '[id*="install"]',
  '[class*="opera"]',
  '[class*="chrome"]',
  '[class*="browser"]',
  '[class*="warning"]',
  '[class*="alert"]',
  '[id*="overlay"]',
  '[class*="modal"][class*="ad"]',
  '[class*="popup"][class*="ad"]',
];

// Whitelist: Domains and patterns to never block
const WHITELIST_DOMAINS = [
  'themoviedb.org',
  'image.tmdb.org',
  'localhost',
  '127.0.0.1',
  'vite',
  'react',
];

// Whitelist: Class names and IDs to never block (app-specific)
const WHITELIST_SELECTORS = [
  'details',
  'detailsContent',
  'detailsActions',
  'detailsTitle',
  'detailsMeta',
  'detailsOverview',
  'detailsPoster',
  'detailsText',
  'detailsContainer',
  'movieCard',
  'movieGrid',
  'moviePoster',
  'movieTitle',
  'section',
  'sectionHeader',
  'playerArea',
  'playerContainer',
  'playerHeader',
  'playerTitle',
  'providerList',
  'providerLogo',
  'watchButton',
  'closeButton',
];

/**
 * Initialize ad blocker
 */
export function initAdBlocker() {
  // Block ad scripts
  blockAdScripts();

  // Block ad network requests
  blockAdRequests();

  // Remove existing ad elements
  removeAdElements();

  // Monitor for new ad elements
  observeAdElements();

  console.log('Ad blocker initialized');
}

/**
 * Block ad-related scripts from loading
 */
function blockAdScripts() {
  const originalCreateElement = document.createElement;

  document.createElement = function (tagName: string, options?: any) {
    const element = originalCreateElement.call(document, tagName, options);

    if (tagName.toLowerCase() === 'script') {
      const script = element as HTMLScriptElement;

      // Intercept script src
      const originalSetAttribute = script.setAttribute.bind(script);
      script.setAttribute = function (name: string, value: string) {
        if (name === 'src' && isAdDomain(value)) {
          console.log('Blocked ad script:', value);
          return; // Don't set the src, effectively blocking it
        }
        return originalSetAttribute(name, value);
      };

      // Intercept script src property
      try {
        Object.defineProperty(script, 'src', {
          set: function (value: string) {
            if (isAdDomain(value)) {
              console.log('Blocked ad script:', value);
              (script as any)._src = '';
              return; // Block the script
            }
            (script as any)._src = value;
            originalSetAttribute.call(this, 'src', value);
          },
          get: function () {
            return (script as any)._src || '';
          },
        });
      } catch (e) {
        // Property might already be defined, ignore
      }
    }

    return element;
  };
}

/**
 * Block ad network requests using fetch and XMLHttpRequest interception
 */
function blockAdRequests() {
  // Block fetch requests to ad domains
  if (!(window.fetch as any).__adBlockerOverridden) {
    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.href
          : input.url;

      if (isAdDomain(url)) {
        console.log('Blocked ad request:', url);
        return Promise.reject(new Error('Ad blocked'));
      }

      return originalFetch.call(window, input, init);
    };
    (window.fetch as any).__adBlockerOverridden = true;
  }

  // Block XMLHttpRequest to ad domains
  if (!(XMLHttpRequest.prototype.open as any).__adBlockerOverridden) {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      const urlString = typeof url === 'string' ? url : url.href;

      if (isAdDomain(urlString)) {
        console.log('Blocked ad XHR request:', urlString);
        return;
      }

      // Provide default value for async if undefined (defaults to true)
      return originalOpen.call(
        this,
        method,
        url,
        async ?? true,
        username ?? null,
        password ?? null
      );
    };
    (XMLHttpRequest.prototype.open as any).__adBlockerOverridden = true;
  }
}

/**
 * Check if a URL is an ad domain
 */
function isAdDomain(url: string): boolean {
  if (!url) return false;

  const urlLower = url.toLowerCase();

  // Check whitelist first
  if (WHITELIST_DOMAINS.some((domain) => urlLower.includes(domain))) {
    return false;
  }

  // Then check if it's an ad domain
  return AD_DOMAINS.some((domain) => urlLower.includes(domain));
}

/**
 * Remove existing ad elements from the DOM
 */
function removeAdElements() {
  // Only run after a short delay to ensure app elements are loaded
  setTimeout(() => {
    AD_SELECTORS.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          // Check if element looks like an ad (whitelist check included)
          if (isAdElement(element)) {
            element.remove();
            console.log('Removed ad element:', selector);
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });
  }, 500); // Delay to let React render first
}

/**
 * Check if an element is likely an ad
 */
function isAdElement(element: Element): boolean {
  const className = element.className?.toString().toLowerCase() || '';
  const id = element.id?.toLowerCase() || '';

  // Check whitelist first - never block app elements
  const isWhitelisted = WHITELIST_SELECTORS.some(
    (whitelist) => className.includes(whitelist) || id.includes(whitelist)
  );

  if (isWhitelisted) {
    return false;
  }

  // More specific ad detection - only block if it's clearly an ad
  const specificAdPatterns = [
    'adsbygoogle',
    'google_ads',
    'ad-container',
    'ad-wrapper',
    'ad-unit',
    'advertisement',
    'ad-banner',
    'sponsored-content',
    'promo-banner',
  ];

  const hasAdPattern = specificAdPatterns.some(
    (pattern) => className.includes(pattern) || id.includes(pattern)
  );

  // Only block if it has clear ad patterns
  return hasAdPattern;
}

/**
 * Helper to check if element is whitelisted
 */
function isWhitelistedElement(element: Element): boolean {
  const className = element.className?.toString().toLowerCase() || '';
  const id = element.id?.toLowerCase() || '';
  return WHITELIST_SELECTORS.some(
    (whitelist) => className.includes(whitelist) || id.includes(whitelist)
  );
}

/**
 * Observe DOM for new ad elements and remove them
 */
function observeAdElements() {
  // Wait for body to be available
  if (!document.body) {
    // If body doesn't exist yet, wait for DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeAdElements);
      return;
    }
    // If still no body, try again after a short delay
    setTimeout(observeAdElements, 100);
    return;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          // Skip React root and app containers
          if (
            element.id === 'root' ||
            element.classList.contains('app') ||
            element.classList.contains('main') ||
            element.classList.contains('main-inner')
          ) {
            return;
          }

          // Check if the added element is an ad
          if (isAdElement(element)) {
            element.remove();
            console.log('Removed dynamically added ad element');
            return;
          }

          // Check children for ads (but be more careful)
          AD_SELECTORS.forEach((selector) => {
            try {
              const adElements = element.querySelectorAll?.(selector);
              adElements?.forEach((adElement) => {
                if (isAdElement(adElement) && !isWhitelistedElement(adElement)) {
                  adElement.remove();
                  console.log('Removed ad element from new content');
                }
              });
            } catch (e) {
              // Ignore errors
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Aggressively remove overlay popups every 1 second
 */
export function startAggressiveOverlayRemoval(): number {
  const intervalId = window.setInterval(() => {
    // Target high z-index overlays and popups
    const allElements = document.querySelectorAll('*');

    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const styles = window.getComputedStyle(htmlEl);
      const zIndex = parseInt(styles.zIndex || '0');
      const position = styles.position;
      const display = styles.display;

      // Target overlays with lower z-index threshold - more aggressive
      if (
        zIndex > 100 &&
        (position === 'fixed' || position === 'absolute') &&
        display !== 'none'
      ) {
        const text = htmlEl.textContent?.toLowerCase() || '';

        // Check if it mentions installing/downloading/extensions/ads
        if (
          text.includes('ad block wonder') ||
          text.includes('adblock wonder') ||
          text.includes('blocks ads, crushes pop-ups') ||
          text.includes('we silence the noise') ||
          text.includes('take out the trash') ||
          text.includes('install') ||
          text.includes('opera') ||
          text.includes('download') ||
          text.includes('continue') ||
          text.includes('browser') ||
          text.includes('extension') ||
          text.includes('chrome web store') ||
          text.includes('ad block') ||
          text.includes('adblock') ||
          text.includes('privacy policy') ||
          text.includes('advertisement') ||
          text.includes('sponsored') ||
          text.includes('click here') ||
          text.includes('watch now') ||
          text.includes('skip ad') ||
          (text.includes('blocks ads') && text.includes('pop-ups'))
        ) {
          htmlEl.remove();
          console.log('🗑️ Removed fake popup overlay:', text.substring(0, 50));
        }
      }
    });
  }, 100); // Very frequent - every 100ms for aggressive removal

  return intervalId;
}

/**
 * Block ads in iframe (limited by CORS, but we can try)
 */
export function blockIframeAds(iframe: HTMLIFrameElement) {
  try {
    // Try to access iframe content (only works if same origin)
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDoc) {
      // Remove ad elements from iframe
      AD_SELECTORS.forEach((selector) => {
        try {
          const elements = iframeDoc.querySelectorAll(selector);
          elements.forEach((element) => {
            if (isAdElement(element)) {
              element.remove();
            }
          });
        } catch (e) {
          // Ignore errors
        }
      });
    }
  } catch (e) {
    // Cross-origin iframe, can't access content
    // This is expected for most video players
  }
}

/**
 * Enable/disable ad blocker
 */
let adBlockerEnabled = true;

export function enableAdBlocker() {
  adBlockerEnabled = true;
  initAdBlocker();
}

export function disableAdBlocker() {
  adBlockerEnabled = false;
  // Note: Can't fully disable without reload, but we can stop blocking new requests
}

export function isAdBlockerEnabled(): boolean {
  return adBlockerEnabled;
}
