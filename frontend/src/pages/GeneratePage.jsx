import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const SOURCE_TYPES = [
  {
    key: 'markdown',
    label: 'Markdown',
    description: 'Write or paste structured content',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 5h16v14H4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M7 9l2.5 3L12 9m-5 5h10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'rss',
    label: 'RSS Feed',
    description: 'Turn articles into a publication',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5 5a14 14 0 0114 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5 11a8 8 0 018 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'url',
    label: 'Web Page URL',
    description: 'Capture content from a live page',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M10 13a5 5 0 007.07.07l1.42-1.42a5 5 0 00-7.07-7.07L10.6 5.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14 11a5 5 0 00-7.07-.07L5.5 12.35a5 5 0 007.07 7.07l.82-.82"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function GeneratePage() {
  const [sourceType, setSourceType] = useState('markdown');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  const [markdown, setMarkdown] = useState(
    '# My Document\n\nWrite your content here...'
  );

  const [feedUrl, setFeedUrl] = useState('');
  const [url, setUrl] = useState('');

  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [lastJobId, setLastJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);

  useEffect(() => {
    api
      .listTemplates()
      .then((r) => setTemplates(r.templates || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!lastJobId) return;

    const interval = setInterval(async () => {
      try {
        const { job } = await api.getJob(lastJobId);

        setJobStatus(job);

        if (
          job.status === 'completed' ||
          job.status === 'failed'
        ) {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [lastJobId]);

  const characterCount = useMemo(
    () => markdown.length,
    [markdown]
  );

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage(null);
    setSubmitting(true);

    try {
      const body = {
        sourceType,
        title: title || undefined,
        subtitle: subtitle || undefined,
        templateId: templateId || undefined,
      };

      if (sourceType === 'markdown') {
        body.markdown = markdown;
      }

      if (sourceType === 'rss') {
        body.feedUrl = feedUrl;
      }

      if (sourceType === 'url') {
        body.url = url;
      }

      const res = await api.generate(body);

      setLastJobId(res.jobId);
      setJobStatus({
        status: 'queued',
        id: res.jobId,
      });

      setMessage({
        type: 'success',
        text: 'Your document has been added to the rendering queue.',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSourceChange(type) {
    setSourceType(type);
    setMessage(null);
    setJobStatus(null);
    setLastJobId(null);
  }

  function resetForm() {
    setTitle('');
    setSubtitle('');
    setMarkdown('# My Document\n\nWrite your content here...');
    setFeedUrl('');
    setUrl('');
    setTemplateId('');
    setMessage(null);
    setJobStatus(null);
    setLastJobId(null);
  }

  return (
    <div className="generate-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <div className="eyebrow">DOCUMENT STUDIO</div>

          <h1>Create your document</h1>

          <p className="page-subtitle">
            Transform Markdown, RSS feeds, and webpages into polished,
            professionally branded PDFs.
          </p>
        </div>
      </div>

      {/* MESSAGE */}
      {message && (
        <div className={`alert alert-${message.type}`}>
          <span className="alert-icon">
            {message.type === 'success' ? '✓' : '!'}
          </span>

          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* SOURCE */}
        <section className="workspace-section">

          <div className="section-heading">
            <div className="section-number">01</div>

            <div>
              <h2>Choose a source</h2>
              <p>
                Select where your document content will come from.
              </p>
            </div>
          </div>

          <div className="source-cards">

            {SOURCE_TYPES.map((type) => (
              <button
                type="button"
                key={type.key}
                className={`source-card ${
                  sourceType === type.key ? 'selected' : ''
                }`}
                onClick={() => handleSourceChange(type.key)}
              >
                <span className="source-icon">
                  {type.icon}
                </span>

                <span className="source-card-content">
                  <strong>{type.label}</strong>

                  <small>{type.description}</small>
                </span>

                {sourceType === type.key && (
                  <span className="source-check">✓</span>
                )}
              </button>
            ))}

          </div>
        </section>

        {/* DOCUMENT DETAILS */}
        <section className="workspace-section">

          <div className="section-heading">
            <div className="section-number">02</div>

            <div>
              <h2>Document details</h2>
              <p>
                Give your document a clear title and subtitle.
              </p>
            </div>
          </div>

          <div className="form-grid">

            <div className="field">
              <label htmlFor="document-title">
                Document title
              </label>

              <input
                id="document-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Product Release Report"
              />

              <span className="field-hint">
                Leave blank to automatically detect the title.
              </span>
            </div>

            <div className="field">
              <label htmlFor="document-subtitle">
                Subtitle
              </label>

              <input
                id="document-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Q3 2026 Release Notes"
              />
            </div>

          </div>
        </section>

        {/* CONTENT */}
        <section className="workspace-section">

          <div className="section-heading section-heading-row">

            <div className="section-heading-left">
              <div className="section-number">03</div>

              <div>
                <h2>Content</h2>

                <p>
                  {sourceType === 'markdown'
                    ? 'Write your document using Markdown syntax.'
                    : sourceType === 'rss'
                      ? 'Provide the RSS or Atom feed to import.'
                      : 'Provide the webpage you want to convert.'}
                </p>
              </div>
            </div>

            {sourceType === 'markdown' && (
              <span className="character-count">
                {characterCount.toLocaleString()} characters
              </span>
            )}

          </div>

          {sourceType === 'markdown' && (
            <div className="editor-shell">

              <div className="editor-toolbar">
                <span className="editor-language">
                  MARKDOWN
                </span>

                <span>
                  Supports headings, lists, links and images
                </span>
              </div>

              <textarea
                className="document-editor"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                spellCheck="false"
              />

            </div>
          )}

          {sourceType === 'rss' && (
            <div className="input-panel">
              <div className="large-input-icon">◉</div>

              <div className="field">
                <label htmlFor="feed-url">
                  RSS / Atom Feed URL
                </label>

                <input
                  id="feed-url"
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  required
                />

                <span className="field-hint">
                  Articles from the feed will be converted into the PDF.
                </span>
              </div>
            </div>
          )}

          {sourceType === 'url' && (
            <div className="input-panel">
              <div className="large-input-icon">↗</div>

              <div className="field">
                <label htmlFor="web-url">
                  Web Page URL
                </label>

                <input
                  id="web-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  required
                />

                <span className="field-hint">
                  The selected webpage will be rendered as a PDF.
                </span>
              </div>
            </div>
          )}

        </section>

        {/* DESIGN */}
        <section className="workspace-section">

          <div className="section-heading">

            <div className="section-number">04</div>

            <div>
              <h2>Document design</h2>

              <p>
                Choose a reusable branding template for the PDF.
              </p>
            </div>

          </div>

          <div className="template-selector">

            <button
              type="button"
              className={`template-option ${
                templateId === '' ? 'selected' : ''
              }`}
              onClick={() => setTemplateId('')}
            >
              <div className="template-preview default-preview">
                Aa
              </div>

              <div>
                <strong>Default</strong>
                <span>Clean document styling</span>
              </div>

              {templateId === '' && (
                <span className="template-check">✓</span>
              )}
            </button>

            {templates.map((template) => (
              <button
                type="button"
                key={template.id}
                className={`template-option ${
                  templateId === template.id ? 'selected' : ''
                }`}
                onClick={() => setTemplateId(template.id)}
              >
                <div
                  className="template-preview"
                  style={{
                    background:
                      template.brand?.primaryColor ||
                      '#172554',
                  }}
                >
                  Aa
                </div>

                <div>
                  <strong>{template.name}</strong>

                  <span>
                    {template.kind || 'Custom template'}
                  </span>
                </div>

                {templateId === template.id && (
                  <span className="template-check">✓</span>
                )}
              </button>
            ))}

          </div>

        </section>

        {/* ACTION */}
        <section className="generate-action">

          <div className="generate-action-info">

            <div className="generate-action-icon">
              PDF
            </div>

            <div>
              <strong>Ready to generate?</strong>

              <span>
                Your document will be processed by the PDF rendering engine.
              </span>
            </div>

          </div>

          <button
            className="btn generate-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="button-spinner" />
                Generating…
              </>
            ) : (
              <>
                Generate PDF
                <span>→</span>
              </>
            )}
          </button>

        </section>

      </form>

      {/* JOB STATUS */}
      {jobStatus && (
        <section className={`generation-result ${jobStatus.status}`}>

          <div className="result-header">

            <div className="result-icon">
              {jobStatus.status === 'completed'
                ? '✓'
                : jobStatus.status === 'failed'
                  ? '!'
                  : '◌'}
            </div>

            <div>
              <div className="result-label">
                {jobStatus.status === 'completed'
                  ? 'DOCUMENT READY'
                  : jobStatus.status === 'failed'
                    ? 'GENERATION FAILED'
                    : 'PROCESSING DOCUMENT'}
              </div>

              <h2>
                {jobStatus.status === 'completed'
                  ? 'Your PDF is ready'
                  : jobStatus.status === 'failed'
                    ? 'Something went wrong'
                    : 'Your document is being generated'}
              </h2>

              <p>
                {jobStatus.status === 'completed'
                  ? 'The PDF has been successfully rendered and is ready to download.'
                  : jobStatus.status === 'failed'
                    ? jobStatus.error || 'The rendering process failed.'
                    : 'The rendering engine is processing your document. This usually takes a few seconds.'}
              </p>
            </div>

          </div>

          <div className="generation-steps">

            <div className="generation-step complete">
              <span>✓</span>
              <small>Queued</small>
            </div>

            <div
              className={`generation-line ${
                jobStatus.status === 'active' ||
                jobStatus.status === 'completed'
                  ? 'complete'
                  : ''
              }`}
            />

            <div
              className={`generation-step ${
                jobStatus.status === 'active' ||
                jobStatus.status === 'completed'
                  ? 'complete'
                  : 'current'
              }`}
            >
              <span>
                {jobStatus.status === 'completed' ? '✓' : '2'}
              </span>

              <small>Rendering</small>
            </div>

            <div
              className={`generation-line ${
                jobStatus.status === 'completed'
                  ? 'complete'
                  : ''
              }`}
            />

            <div
              className={`generation-step ${
                jobStatus.status === 'completed'
                  ? 'complete'
                  : ''
              }`}
            >
              <span>
                {jobStatus.status === 'completed' ? '✓' : '3'}
              </span>

              <small>Complete</small>
            </div>

          </div>

          {jobStatus.status === 'completed' && (
            <div className="result-actions">

              <button
                className="btn"
                type="button"
                onClick={async () => {
                  try {
                    await api.download(lastJobId);
                  } catch (err) {
                    alert(err.message);
                  }
                }}
              >
                Download PDF
                <span>↓</span>
              </button>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={resetForm}
              >
                Generate another
              </button>

            </div>
          )}

        </section>
      )}

    </div>
  );
}