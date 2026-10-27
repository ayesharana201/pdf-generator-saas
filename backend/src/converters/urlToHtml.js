const puppeteer = require('puppeteer');
const sanitizeHtml = require('sanitize-html');

function normalizeWhitespace(value = '') {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value = '') {
  return normalizeWhitespace(value)
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

function looksLikeUi(element) {
  const text = cleanText(element.textContent || '').toLowerCase();

  const className =
    typeof element.className === 'string'
      ? element.className.toLowerCase()
      : '';

  const id =
    typeof element.id === 'string'
      ? element.id.toLowerCase()
      : '';

  const combined = `${className} ${id}`;

  const uiWords = [
    'navigation',
    'navbar',
    'nav-menu',
    'menu',
    'breadcrumb',
    'sidebar',
    'widget',
    'cookie',
    'consent',
    'popup',
    'modal',
    'overlay',
    'advert',
    'advertisement',
    'social',
    'share',
    'comments',
    'comment',
    'newsletter',
    'subscribe',
    'signup',
    'sign-up',
    'related',
    'recommend',
    'recommended',
    'footer',
    'header',
    'promo',
    'promotion',
  ];

  if (uiWords.some((word) => combined.includes(word))) {
    return true;
  }

  const exactUiTexts = [
    'join the newsletter',
    'join our newsletter',
    'subscribe to the newsletter',
    'subscribe',
    'sign up',
    'sign up for the newsletter',
    'share this article',
    'related articles',
    'recommended articles',
    'recent articles',
    'popular articles',
    'categories',
    'search',
    'menu',
  ];

  if (exactUiTexts.includes(text)) {
    return true;
  }

  return false;
}

function looksLikeCard(element) {
  const text = cleanText(element.textContent || '');
  const links = Array.from(element.querySelectorAll('a'));
  const paragraphs = Array.from(element.querySelectorAll('p'));
  const headings = Array.from(
    element.querySelectorAll('h1,h2,h3,h4,h5,h6')
  );
  const images = Array.from(element.querySelectorAll('img'));

  if (!text) {
    return false;
  }

  /*
   * A typical article/category card contains:
   * - one or more links
   * - little body text
   * - sometimes an image
   * - one heading
   *
   * These are useful on a website but should not become
   * document sections in the generated PDF.
   */

  if (
    headings.length >= 1 &&
    links.length >= 1 &&
    paragraphs.length <= 1 &&
    text.length < 900
  ) {
    return true;
  }

  if (
    images.length >= 1 &&
    links.length >= 2 &&
    paragraphs.length <= 1 &&
    text.length < 900
  ) {
    return true;
  }

  return false;
}

async function urlToHtml(url) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1440,
      height: 1200,
      deviceScaleFactor: 1,
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    /*
     * Give JavaScript-driven websites a little extra time
     * to finish rendering.
     */
    await new Promise((resolve) => setTimeout(resolve, 3000));

    /*
     * Scroll through the page so lazy-loaded content/images
     * have a chance to load.
     */
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;

        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;

          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 150);
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    /*
     * ---------------------------------------------------------
     * Extract the useful document area inside the browser.
     * ---------------------------------------------------------
     */

    const result = await page.evaluate(() => {
      function normalizeWhitespace(value = '') {
        return value
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function cleanText(value = '') {
        return normalizeWhitespace(value)
          .replace(/\s+([,.!?;:])/g, '$1')
          .trim();
      }

      function looksLikeUi(element) {
        const text = cleanText(element.textContent || '').toLowerCase();

        const className =
          typeof element.className === 'string'
            ? element.className.toLowerCase()
            : '';

        const id =
          typeof element.id === 'string'
            ? element.id.toLowerCase()
            : '';

        const combined = `${className} ${id}`;

        const uiWords = [
          'navigation',
          'navbar',
          'nav-menu',
          'menu',
          'breadcrumb',
          'sidebar',
          'widget',
          'cookie',
          'consent',
          'popup',
          'modal',
          'overlay',
          'advert',
          'advertisement',
          'social',
          'share',
          'comments',
          'comment',
          'newsletter',
          'subscribe',
          'signup',
          'sign-up',
          'related',
          'recommend',
          'recommended',
          'promo',
          'promotion',
        ];

        if (uiWords.some((word) => combined.includes(word))) {
          return true;
        }

        const exactUiTexts = [
          'join the newsletter',
          'join our newsletter',
          'subscribe to the newsletter',
          'subscribe',
          'sign up',
          'sign up for the newsletter',
          'share this article',
          'related articles',
          'recommended articles',
          'recent articles',
          'popular articles',
          'categories',
          'search',
          'menu',
        ];

        return exactUiTexts.includes(text);
      }

      function looksLikeCard(element) {
        const text = cleanText(element.textContent || '');

        const links = Array.from(element.querySelectorAll('a'));
        const paragraphs = Array.from(element.querySelectorAll('p'));
        const headings = Array.from(
          element.querySelectorAll('h1,h2,h3,h4,h5,h6')
        );
        const images = Array.from(element.querySelectorAll('img'));

        if (!text) {
          return false;
        }

        if (
          headings.length >= 1 &&
          links.length >= 1 &&
          paragraphs.length <= 1 &&
          text.length < 900
        ) {
          return true;
        }

        if (
          images.length >= 1 &&
          links.length >= 2 &&
          paragraphs.length <= 1 &&
          text.length < 900
        ) {
          return true;
        }

        return false;
      }

      /*
       * Remove elements that are normally website UI rather
       * than document content.
       */
      const removeSelectors = [
        'script',
        'style',
        'noscript',
        'iframe',
        'svg',
        'canvas',

        'nav',
        'header',
        'footer',
        'aside',

        '[role="navigation"]',
        '[role="banner"]',
        '[role="contentinfo"]',
        '[role="complementary"]',
        '[role="dialog"]',
        '[role="menu"]',
        '[role="menubar"]',

        '.navigation',
        '.navbar',
        '.nav',
        '.menu',
        '.breadcrumb',
        '.breadcrumbs',
        '.sidebar',
        '.widget',

        '.cookie',
        '.cookies',
        '.cookie-banner',
        '.consent',

        '.popup',
        '.modal',
        '.overlay',

        '.advert',
        '.advertisement',
        '.ads',
        '.ad',

        '.social',
        '.share',
        '.sharing',

        '.comments',
        '.comment-section',

        '.newsletter',
        '.subscribe',
        '.signup',
        '.sign-up',

        '.related',
        '.recommendations',
        '.recommended',

        '.promo',
        '.promotion',

        '[data-testid*="cookie"]',
        '[data-testid*="newsletter"]',
        '[data-testid*="subscribe"]',
        '[data-testid*="navigation"]',
        '[data-testid*="sidebar"]',

        '[aria-label*="navigation" i]',
        '[aria-label*="newsletter" i]',
        '[aria-label*="subscribe" i]',
        '[aria-label*="share" i]',
      ];

      document.querySelectorAll(removeSelectors.join(',')).forEach((el) => {
        el.remove();
      });

      /*
       * Remove elements that clearly look like UI blocks.
       */
      Array.from(document.body.querySelectorAll('*')).forEach((element) => {
        if (element === document.body) {
          return;
        }

        if (looksLikeUi(element)) {
          const text = cleanText(element.textContent || '');

          /*
           * Avoid deleting large genuine content blocks merely
           * because a class contains a generic word.
           */
          if (text.length < 1500) {
            element.remove();
          }
        }
      });

      /*
       * ---------------------------------------------------------
       * Find the best content container.
       * ---------------------------------------------------------
       */

      const candidates = [
        'article',
        'main',
        '[role="main"]',
        '#main-content',
        '#content',
        '.main-content',
        '.content',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.article-body',
        '.post-body',
        '.page-content',
        '.single-content',
        'body',
      ];

      const candidateElements = [];

      for (const selector of candidates) {
        document.querySelectorAll(selector).forEach((element) => {
          candidateElements.push(element);
        });
      }

      let selected = document.body;
      let bestScore = -Infinity;

      for (const element of candidateElements) {
        const text = cleanText(element.innerText || element.textContent || '');

        if (!text) {
          continue;
        }

        const paragraphs = element.querySelectorAll('p').length;
        const headings = element.querySelectorAll(
          'h1,h2,h3,h4,h5,h6'
        ).length;

        const links = element.querySelectorAll('a').length;
        const images = element.querySelectorAll('img').length;

        const textLength = text.length;

        /*
         * Link density helps reject pages/containers that are
         * mostly navigation or article-card listings.
         */
        let linkTextLength = 0;

        element.querySelectorAll('a').forEach((link) => {
          linkTextLength += cleanText(link.textContent || '').length;
        });

        const linkDensity =
          textLength > 0 ? linkTextLength / textLength : 1;

        let score = 0;

        score += Math.min(textLength / 100, 100);
        score += Math.min(paragraphs * 5, 100);
        score += Math.min(headings * 8, 80);
        score += Math.min(images * 2, 30);

        if (element.tagName.toLowerCase() === 'article') {
          score += 50;
        }

        if (element.tagName.toLowerCase() === 'main') {
          score += 40;
        }

        if (linkDensity > 0.75) {
          score -= 100;
        } else if (linkDensity > 0.55) {
          score -= 50;
        }

        if (looksLikeCard(element)) {
          score -= 80;
        }

        if (score > bestScore) {
          bestScore = score;
          selected = element;
        }
      }

      /*
       * ---------------------------------------------------------
       * Remove nested UI/card blocks from selected content.
       * ---------------------------------------------------------
       */

      Array.from(selected.querySelectorAll('*')).forEach((element) => {
        if (element === selected) {
          return;
        }

        if (looksLikeUi(element)) {
          const text = cleanText(element.textContent || '');

          if (text.length < 1500) {
            element.remove();
            return;
          }
        }

        /*
         * Remove obvious article/category cards.
         *
         * Important for pages such as:
         * https://jamesclear.com/articles
         */
        if (looksLikeCard(element)) {
          const parent = element.parentElement;

          if (parent && parent !== selected) {
            const parentText = cleanText(
              parent.textContent || ''
            );

            /*
             * Only remove relatively small blocks. This prevents
             * accidentally deleting a large genuine article body.
             */
            if (parentText.length < 2500) {
              element.remove();
            }
          }
        }
      });

      /*
       * Remove standalone headings that are clearly website UI.
       */
      Array.from(
        selected.querySelectorAll('h1,h2,h3,h4,h5,h6')
      ).forEach((heading) => {
        const text = cleanText(heading.textContent || '').toLowerCase();

        const blocked = [
          'join the newsletter',
          'join our newsletter',
          'newsletter',
          'subscribe',
          'sign up',
          'categories',
          'category',
          'related articles',
          'recommended articles',
          'recent articles',
          'popular articles',
          'share this article',
          'follow us',
          'search',
          'menu',
          'navigation',
        ];

        if (blocked.includes(text)) {
          heading.remove();
        }
      });

      /*
       * ---------------------------------------------------------
       * Normalize links.
       * ---------------------------------------------------------
       */

      selected.querySelectorAll('a').forEach((link) => {
        const text = cleanText(link.textContent || '');

        if (!text) {
          link.remove();
          return;
        }

        /*
         * Keep the link text, but don't allow website navigation
         * to dominate the generated PDF.
         */
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });

      /*
       * Normalize images.
       */
      selected.querySelectorAll('img').forEach((img) => {
        const src =
          img.getAttribute('src') ||
          img.getAttribute('data-src') ||
          img.getAttribute('data-lazy-src');

        if (src) {
          try {
            img.setAttribute(
              'src',
              new URL(src, window.location.href).href
            );
          } catch (error) {
            // Ignore invalid image URLs.
          }
        }

        img.removeAttribute('srcset');
        img.removeAttribute('sizes');

        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      });

      /*
       * ---------------------------------------------------------
       * Get page title.
       * ---------------------------------------------------------
       */

      const title =
        cleanText(
          document.querySelector('title')?.textContent || ''
        ) ||
        cleanText(
          selected.querySelector('h1')?.textContent || ''
        ) ||
        'Generated Document';

      /*
       * ---------------------------------------------------------
       * Return the cleaned HTML.
       * ---------------------------------------------------------
       */

      const html = selected.innerHTML || '';

      const text = cleanText(selected.innerText || '');

      return {
        html,
        text,
        title,
      };
    });

    /*
     * ---------------------------------------------------------
     * Sanitize HTML.
     * ---------------------------------------------------------
     */

    let html = sanitizeHtml(result.html, {
      allowedTags: [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',

        'p',
        'br',

        'strong',
        'b',
        'em',
        'i',
        'u',

        'ul',
        'ol',
        'li',

        'blockquote',
        'pre',
        'code',

        'a',
        'img',

        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'th',
        'td',

        'hr',

        'figure',
        'figcaption',
      ],

      allowedAttributes: {
        a: [
          'href',
          'target',
          'rel',
        ],

        img: [
          'src',
          'alt',
          'title',
          'width',
          'height',
        ],

        '*': [
          'id',
          'class',
          'style',
        ],
      },

      allowedSchemes: [
        'http',
        'https',
        'mailto',
      ],

      allowProtocolRelative: false,
    });

    /*
     * ---------------------------------------------------------
     * Build clean heading hierarchy.
     *
     * This is the important part for the James Clear page.
     *
     * Website category headings such as:
     * Creativity
     * Decision Making
     * Focus
     * Habits
     * Life Lessons
     *
     * should NOT become document sections.
     * ---------------------------------------------------------
     */

    const headings = [];

    let previousLevel = 0;
    let headingIndex = 0;

    const blockedExactHeadings = new Set([
      'join the newsletter',
      'join our newsletter',
      'newsletter',
      'subscribe',
      'subscribe to the newsletter',
      'sign up',
      'sign up for the newsletter',

      'categories',
      'category',

      'related articles',
      'recommended articles',
      'recent articles',
      'popular articles',

      'share this article',
      'follow us',

      'search',
      'menu',
      'navigation',
    ]);

    const promotionalPatterns = [
      /newsletter/i,
      /subscribe/i,
      /sign\s*up/i,
      /email\s+course/i,
      /free\s+email/i,
      /get\s+your\s+first\s+lesson/i,
    ];

    function isPromotionalHeading(text) {
      return promotionalPatterns.some((pattern) =>
        pattern.test(text)
      );
    }

    function isLinkOnlyHeading(heading) {
      const links = Array.from(
        heading.querySelectorAll('a')
      );

      const headingText = cleanText(
        heading.textContent || ''
      );

      if (links.length !== 1) {
        return false;
      }

      const linkText = cleanText(
        links[0].textContent || ''
      );

      return (
        headingText.length > 0 &&
        linkText === headingText
      );
    }

    function isArticleCardHeading(heading) {
      const level = Number(
        heading.tagName.substring(1)
      );

      const headingText = cleanText(
        heading.textContent || ''
      );

      /*
       * H4-H6 headings that consist entirely of a link are
       * almost always category/card headings on index pages.
       */
      if (
        level >= 4 &&
        isLinkOnlyHeading(heading)
      ) {
        return true;
      }

      const parent = heading.parentElement;

      if (!parent) {
        return false;
      }

      const parentText = cleanText(
        parent.textContent || ''
      );

      const paragraphs =
        parent.querySelectorAll('p').length;

      const links =
        parent.querySelectorAll('a').length;

      const images =
        parent.querySelectorAll('img').length;

      /*
       * Small link-heavy blocks are normally article cards.
       */
      if (
        isLinkOnlyHeading(heading) &&
        paragraphs === 0 &&
        parentText.length < 700
      ) {
        return true;
      }

      if (
        images >= 1 &&
        links >= 2 &&
        paragraphs <= 1 &&
        parentText.length < 900
      ) {
        return true;
      }

      return false;
    }

    /*
     * Parse headings from the sanitized HTML using a temporary
     * DOM-like HTML document through JSDOM.
     *
     * sanitize-html returns HTML only, so we use a lightweight
     * browser parser through JSDOM if available.
     */

    let finalHtml = html;

    try {
      const { JSDOM } = require('jsdom');

      const dom = new JSDOM(
        `<body>${html}</body>`
      );

      const document = dom.window.document;

      /*
       * First remove obvious unwanted H4-H6 card headings.
       */
      Array.from(
        document.querySelectorAll(
          'h1,h2,h3,h4,h5,h6'
        )
      ).forEach((heading) => {
        const text = cleanText(
          heading.textContent || ''
        );

        const lowerText = text.toLowerCase();

        if (
          blockedExactHeadings.has(lowerText) ||
          isPromotionalHeading(text)
        ) {
          heading.remove();
          return;
        }

        if (isArticleCardHeading(heading)) {
          heading.remove();
        }
      });

      /*
       * Now process only H1-H3 as actual document headings.
       */
      Array.from(
        document.querySelectorAll('h1,h2,h3')
      ).forEach((heading) => {
        const text = cleanText(
          heading.textContent || ''
        );

        if (!text) {
          heading.remove();
          return;
        }

        const lowerText = text.toLowerCase();

        if (
          blockedExactHeadings.has(lowerText) ||
          isPromotionalHeading(text)
        ) {
          heading.remove();
          return;
        }

        if (isArticleCardHeading(heading)) {
          heading.remove();
          return;
        }

        let level = Number(
          heading.tagName.substring(1)
        );

        /*
         * The first genuine heading is always H1.
         */
        if (headings.length === 0) {
          level = 1;
        } else {
          /*
           * Prevent hierarchy jumps such as:
           *
           * H1
           * H4
           *
           * by limiting the next level to one deeper.
           */
          level = Math.min(
            level,
            previousLevel + 1
          );

          level = Math.max(level, 1);
        }

        previousLevel = level;

        headingIndex += 1;

        const id =
          `section-${headingIndex}`;

        const numberParts = [];

        /*
         * Numbering counters are maintained dynamically.
         */
        if (!headings.counters) {
          headings.counters = [0, 0, 0];
        }

        headings.counters[level - 1] += 1;

        for (
          let i = level;
          i < headings.counters.length;
          i += 1
        ) {
          headings.counters[i] = 0;
        }

        for (let i = 0; i < level; i += 1) {
          if (
            headings.counters[i] > 0
          ) {
            numberParts.push(
              headings.counters[i]
            );
          }
        }

        const number =
          numberParts.join('.');

        /*
         * Create a clean heading element.
         */
        const newHeading =
          document.createElement(
            `h${level}`
          );

        newHeading.id = id;

        /*
         * Preserve the heading text only.
         * This prevents website links/buttons from
         * appearing inside document headings.
         */
        newHeading.textContent = text;

        heading.replaceWith(newHeading);

        headings.push({
          id,
          level,
          text,
          number,
        });
      });

      /*
       * Remove any remaining H4-H6 that are:
       * - link-only
       * - promotional
       * - blocked UI headings
       *
       * Genuine H4-H6 are left in the document body,
       * but they do not enter the TOC.
       */
      Array.from(
        document.querySelectorAll(
          'h4,h5,h6'
        )
      ).forEach((heading) => {
        const text = cleanText(
          heading.textContent || ''
        );

        const lowerText =
          text.toLowerCase();

        if (
          blockedExactHeadings.has(lowerText) ||
          isPromotionalHeading(text) ||
          isLinkOnlyHeading(heading)
        ) {
          heading.remove();
        }
      });

      finalHtml =
        document.body.innerHTML || '';
    } catch (error) {
      /*
       * Fallback if JSDOM is unavailable.
       *
       * This should normally not execute once jsdom is installed.
       */
      console.warn(
        '[urlToHtml] JSDOM heading processing unavailable:',
        error.message
      );

      /*
       * Basic fallback heading extraction.
       */
      finalHtml = html.replace(
        /<h([1-3])([^>]*)>([\s\S]*?)<\/h\1>/gi,
        (match, originalLevel, attributes, inner) => {
          const text = cleanText(
            inner.replace(/<[^>]+>/g, ' ')
          );

          if (!text) {
            return '';
          }

          const lowerText =
            text.toLowerCase();

          if (
            blockedExactHeadings.has(
              lowerText
            ) ||
            isPromotionalHeading(text)
          ) {
            return '';
          }

          let level =
            Number(originalLevel);

          if (headings.length === 0) {
            level = 1;
          } else {
            level = Math.min(
              level,
              previousLevel + 1
            );
          }

          previousLevel = level;

          headingIndex += 1;

          const id =
            `section-${headingIndex}`;

          const number =
            String(headingIndex);

          headings.push({
            id,
            level,
            text,
            number,
          });

          return `<h${level} id="${id}">${text}</h${level}>`;
        }
      );
    }

    /*
     * Remove the temporary counters property before returning.
     */
    delete headings.counters;

    /*
     * ---------------------------------------------------------
     * Final cleanup.
     * ---------------------------------------------------------
     */

    finalHtml = finalHtml
      .replace(
        /<p>\s*<\/p>/gi,
        ''
      )
      .replace(
        /<div>\s*<\/div>/gi,
        ''
      )
      .trim();

    /*
     * Log extraction information so we can diagnose future
     * websites without changing the application behavior.
     */
    console.log(
      `[urlToHtml] title="${result.title}" htmlLength=${finalHtml.length} textLength=${result.text.length}`
    );

    console.log(
      `[urlToHtml] final text length=${result.text.length}`
    );

    console.log(
      `[urlToHtml] headings=${headings.length}`
    );

    if (headings.length > 0) {
      console.log(
        '[urlToHtml] TOC',
        headings.map((heading) => ({
          level: heading.level,
          number: heading.number,
          text: heading.text,
        }))
      );
    }

    return {
      html: finalHtml,
      text: result.text,
      headings,
      sourceType: 'url',
      title: result.title,
    };
  } catch (error) {
    console.error(
      '[urlToHtml] Failed to extract URL:',
      error
    );

    throw new Error(
      `Failed to extract URL content: ${error.message}`
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = urlToHtml;