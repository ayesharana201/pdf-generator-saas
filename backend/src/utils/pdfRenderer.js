const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const config = require('../config');

const TEMPLATE_PATH = path.join(
  __dirname,
  '..',
  'templates',
  'document-shell.ejs'
);

/*
 * Reserve real space for Chromium's native
 * header and footer.
 *
 * 90px top  + 70px bottom = 160px
 */
const PDF_MARGIN = {
  top: 90,
  bottom: 70,
  left: 40,
  right: 40,
};

/*
 * Chromium A4 at 96 DPI.
 */
const A4_HEIGHT_PX = 1122.52;

/*
 * Actual printable/content height after
 * reserving native header/footer space.
 */
const PRINTABLE_HEIGHT_PX =
  A4_HEIGHT_PX -
  PDF_MARGIN.top -
  PDF_MARGIN.bottom;

/*
 * CSS override injected into the document shell.
 *
 * The shell must NOT occupy the full 297mm when
 * Puppeteer is reserving header/footer space.
 */
const PAGINATION_CSS = `
<style id="pdf-renderer-pagination">
  @page {
    size: A4;
    margin: 0;
  }

  html,
  body {
    width: 210mm;
    margin: 0;
    padding: 0;
  }

  /*
   * COVER
   * Exactly one printable page.
   */
  .cover {
    box-sizing: border-box !important;
    width: 210mm !important;
    height: ${PRINTABLE_HEIGHT_PX}px !important;
    min-height: ${PRINTABLE_HEIGHT_PX}px !important;
    max-height: ${PRINTABLE_HEIGHT_PX}px !important;
    overflow: hidden !important;

    page-break-after: always !important;
    break-after: page !important;
  }

  /*
   * TABLE OF CONTENTS
   * Exactly one printable page.
   */
  .toc-page {
    box-sizing: border-box !important;
    width: 210mm !important;
    height: ${PRINTABLE_HEIGHT_PX}px !important;
    min-height: ${PRINTABLE_HEIGHT_PX}px !important;
    max-height: ${PRINTABLE_HEIGHT_PX}px !important;
    overflow: hidden !important;

    page-break-after: always !important;
    break-after: page !important;
  }

  /*
   * DOCUMENT CONTENT
   *
   * IMPORTANT:
   * Do NOT give this section a fixed height.
   * Do NOT use overflow:hidden.
   *
   * Chromium must be allowed to fragment the content
   * naturally across Page 3, Page 4, Page 5, etc.
   */
  .content-page {
    box-sizing: border-box !important;
    width: 210mm !important;
    min-height: ${PRINTABLE_HEIGHT_PX}px !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;

    page-break-after: auto !important;
    break-after: auto !important;
  }

  .document-content {
    box-sizing: border-box !important;
    width: 100% !important;
  }
</style>
`;

/**
 * Render a normalized document into:
 *
 *   Page 1     Cover
 *   Page 2     Table of Contents
 *   Page 3+    Document
 *
 * The renderer performs two passes:
 *
 *   Pass 1 -> measure heading positions
 *   Pass 2 -> insert TOC page numbers
 */
async function renderPdf({
  browser,
  jobId,
  title,
  subtitle,
  bodyHtml,
  headings,
  brand = {},
  footer = {},
}) {
  const template = fs.readFileSync(
    TEMPLATE_PATH,
    'utf-8'
  );

  const baseData = {
    title: title || 'Untitled Document',
    subtitle: subtitle || '',
    bodyHtml: bodyHtml || '',
    brand,
    footerLeft: footer.left || '',
    footerRight: footer.right || '',
    generatedDate: new Date().toLocaleDateString(),
  };

  /*
   * Keep the original heading objects untouched.
   */
  const normalizedHeadings = Array.isArray(headings)
    ? headings.map((heading) => ({
        ...heading,
        page: '',
      }))
    : [];

  const page = await browser.newPage();

  try {
    /*
     * =========================================================
     * PASS 1
     * =========================================================
     */

    const firstPassHtml =
      PAGINATION_CSS +
      ejs.render(template, {
        ...baseData,
        headings: normalizedHeadings,
      });

    await loadPage(page, firstPassHtml);

    const measurements = await page.evaluate(() => {
      const body = document.body;

      const bodyRect = body
        ? body.getBoundingClientRect()
        : { top: 0 };

      const tocPage =
        document.querySelector('.toc-page');

      const contentPage =
        document.querySelector('.content-page');

      const documentContent =
        document.querySelector('.document-content');

      const headingElements =
        Array.from(
          document.querySelectorAll(
            '.document-content h1[id], ' +
            '.document-content h2[id], ' +
            '.document-content h3[id]'
          )
        );

      return {
        tocHeight: tocPage
          ? tocPage.getBoundingClientRect().height
          : 0,

        contentPageTop: contentPage
          ? contentPage.getBoundingClientRect().top -
            bodyRect.top
          : 0,

        contentTop: documentContent
          ? documentContent.getBoundingClientRect().top -
            bodyRect.top
          : 0,

        headings: headingElements.map((element) => {
          const rect =
            element.getBoundingClientRect();

          return {
            id: element.id,
            top:
              rect.top -
              bodyRect.top,
          };
        }),
      };
    });

    /*
     * =========================================================
     * PAGE STRUCTURE
     * =========================================================
     *
     * Page 1 = Cover
     * Page 2 = TOC
     * Page 3 = First content page
     */

    const coverPages = 1;
    const tocPages = 1;

    const contentStartPage =
      coverPages +
      tocPages +
      1;

    /*
     * `.content-page` is itself one printable page.
     * Measure headings relative to its top.
     */
    const contentPageTop =
      measurements.contentPageTop;

    const measuredHeadingPages =
      new Map();

    for (
      const heading
      of measurements.headings
    ) {
      const relativeTop =
        Math.max(
          0,
          heading.top -
            contentPageTop
        );

      const contentPageOffset =
        Math.floor(
          relativeTop /
            PRINTABLE_HEIGHT_PX
        );

      const pageNumber =
        contentStartPage +
        contentPageOffset;

      measuredHeadingPages.set(
        heading.id,
        pageNumber
      );
    }

    /*
     * Insert calculated page numbers.
     */
    const finalHeadings =
      normalizedHeadings.map(
        (heading) => ({
          ...heading,
          page:
            measuredHeadingPages.get(
              heading.id
            ) || '',
        })
      );

    console.log(
      `[pdfRenderer] ` +
      `A4=${A4_HEIGHT_PX}px ` +
      `printable=${PRINTABLE_HEIGHT_PX}px`
    );

    console.log(
      `[pdfRenderer] ` +
      `contentStartPage=${contentStartPage} ` +
      `headings=${finalHeadings.length}`
    );

    finalHeadings.forEach(
      (heading) => {
        console.log(
          `[pdfRenderer] TOC: ` +
          `${heading.number || ''} ` +
          `${heading.text || ''} -> ` +
          `page ${heading.page || ''}`
        );
      }
    );

    /*
     * =========================================================
     * PASS 2
     * =========================================================
     */

    const finalHtml =
      PAGINATION_CSS +
      ejs.render(template, {
        ...baseData,
        headings: finalHeadings,
      });

    await loadPage(
      page,
      finalHtml
    );

    /*
     * =========================================================
     * OUTPUT
     * =========================================================
     */

    const outputDir =
      config.outputDir;

    fs.mkdirSync(
      outputDir,
      {
        recursive: true,
      }
    );

    const outputPath =
      path.join(
        outputDir,
        `${jobId}.pdf`
      );

    /*
     * Header values.
     */
    const companyName =
      escapeHtml(
        brand.companyName ||
        'Generated Document'
      );

    const docTitle =
      escapeHtml(
        title || ''
      );

    /*
     * Footer values.
     */
    const footerLeft =
      escapeHtml(
        footer.left ||
        `© ${new Date().getFullYear()} ${
          brand.companyName || ''
        }`
      );

    /*
     * Native Chromium header.
     */
    const headerTemplate = `
      <div style="
        width:100%;
        box-sizing:border-box;
        padding:0 20mm;
        font-family:Arial,Helvetica,sans-serif;
        font-size:8px;
        color:#777;
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <span>${companyName}</span>
        <span>${docTitle}</span>
      </div>
    `;

    /*
     * Native Chromium footer.
     */
    const footerTemplate = `
      <div style="
        width:100%;
        box-sizing:border-box;
        padding:0 20mm;
        font-family:Arial,Helvetica,sans-serif;
        font-size:8px;
        color:#777;
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <span>${footerLeft}</span>

        <span>
          Page
          <span class="pageNumber"></span>
          of
          <span class="totalPages"></span>
        </span>
      </div>
    `;

    /*
     * =========================================================
     * FINAL PDF
     * =========================================================
     *
     * IMPORTANT:
     *
     * - Non-zero margins reserve header/footer space.
     * - CSS page size is NOT allowed to override Puppeteer's
     *   A4 page calculation.
     */
    await page.pdf({
      path: outputPath,

      format: 'A4',

      printBackground: true,

      displayHeaderFooter: true,

      headerTemplate,

      footerTemplate,

      margin: {
        top: `${PDF_MARGIN.top}px`,
        bottom: `${PDF_MARGIN.bottom}px`,
        left: `${PDF_MARGIN.left}px`,
        right: `${PDF_MARGIN.right}px`,
      },
    });

    console.log(
      `[pdfRenderer] PDF created: ${outputPath}`
    );

    return outputPath;
  } finally {
    await page.close();
  }
}

/**
 * Load HTML and wait for all images to finish loading.
 */
async function loadPage(
  page,
  html
) {
  await page.setContent(
    html,
    {
      waitUntil: 'networkidle0',
      timeout: 60000,
    }
  );

  await page.evaluate(
    async () => {
      const images =
        Array.from(
          document.images
        );

      await Promise.all(
        images.map(
          (img) => {
            if (img.complete) {
              return img.naturalWidth > 0
                ? Promise.resolve()
                : Promise.reject(
                    new Error(
                      `Failed to load image: ${img.src}`
                    )
                  );
            }

            return new Promise(
              (resolve, reject) => {
                img.addEventListener(
                  'load',
                  resolve,
                  { once: true }
                );

                img.addEventListener(
                  'error',
                  () =>
                    reject(
                      new Error(
                        `Failed to load image: ${img.src}`
                      )
                    ),
                  { once: true }
                );
              }
            );
          }
        )
      );
    }
  );
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(str) {
  return String(str || '').replace(
    /[&<>"']/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character])
  );
}

module.exports = {
  renderPdf,
};