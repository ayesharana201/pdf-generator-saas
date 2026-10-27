const MarkdownIt = require('markdown-it');
const anchor = require('markdown-it-anchor');
const sanitizeHtml = require('sanitize-html');

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
  .use(anchor, { permalink: false });

/**
 * Converts a raw markdown string into sanitized HTML plus a heading
 * outline that the TOC builder can turn into a dynamic index.
 */
function markdownToHtml(markdownSource) {
  const rawHtml = md.render(markdownSource || '');
  const html = sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title'],
      '*': ['id'],
    },
  });

  const headings = [];
  const headingRegex = /<h([1-3])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/g;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      level: Number(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]+>/g, ''),
    });
  }

  return { html, headings, sourceType: 'markdown' };
}

module.exports = { markdownToHtml };
