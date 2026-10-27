const RSSParser = require('rss-parser');
const sanitizeHtml = require('sanitize-html');

const parser = new RSSParser({ timeout: 15000 });

/**
 * Fetches an RSS/Atom feed and renders each item into a normalized
 * HTML section (heading + metadata + body), ready for PDF compilation.
 */
async function rssToHtml(feedUrl, options = {}) {
  const { maxItems = 25 } = options;
  const feed = await parser.parseURL(feedUrl);

  const items = feed.items.slice(0, maxItems);
  const headings = [];

  const sections = items.map((item, idx) => {
    const id = `rss-item-${idx}`;
    headings.push({ level: 2, id, text: item.title || `Untitled item ${idx + 1}` });

    const rawBody = item['content:encoded'] || item.content || item.contentSnippet || item.summary || '';
    const body = sanitizeHtml(rawBody, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] },
    });

    const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleDateString() : '';

    return `
      <section class="rss-item" id="${id}">
        <h2>${escapeHtml(item.title || 'Untitled')}</h2>
        <p class="rss-meta">${escapeHtml(item.creator || item.author || '')} ${pubDate ? '&middot; ' + pubDate : ''}</p>
        <div class="rss-body">${body}</div>
        ${item.link ? `<p class="rss-link"><a href="${escapeAttr(item.link)}">${escapeHtml(item.link)}</a></p>` : ''}
      </section>`;
  });

  const html = `
    <header class="feed-header">
      <h1>${escapeHtml(feed.title || 'RSS Feed Export')}</h1>
      ${feed.description ? `<p class="feed-desc">${escapeHtml(feed.description)}</p>` : ''}
    </header>
    ${sections.join('\n')}
  `;

  return { html, headings, sourceType: 'rss', title: feed.title };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

module.exports = { rssToHtml };
