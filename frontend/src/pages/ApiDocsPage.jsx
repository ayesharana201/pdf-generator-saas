export default function ApiDocsPage() {
  return (
    <div>
      <h1>API Documentation</h1>

      <p className="page-subtitle">
        Integrate the PDF / eBook Generator into your application
        using the REST API.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Base URL</h3>

        <p>
          For local development:
        </p>

        <pre>{`http://localhost:4000/api`}</pre>

        <p>
          For the Docker production deployment:
        </p>

        <pre>{`http://localhost:8080/api`}</pre>

        <p>
          For a public deployment, replace the local URL with
          your production API domain.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Authentication</h3>

        <p>
          Integration requests require an API key in the
          <code> x-api-key </code>
          request header.
        </p>

        <pre>{`x-api-key: YOUR_API_KEY`}</pre>

        <p>
          API keys are issued after an API access request has been
          approved by an administrator.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Generate from Markdown</h3>

        <p>
          Creates a PDF generation job from Markdown content.
        </p>

        <pre>{`POST /api/generate
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "sourceType": "markdown",
  "title": "My Document",
  "markdown": "# Hello World\\n\\nThis is my PDF."
}`}</pre>

        <p>
          A successful request returns HTTP <code>202</code> and
          a queued job ID.
        </p>

        <pre>{`{
  "jobId": "JOB_ID",
  "status": "queued",
  "statusUrl": "/api/jobs/JOB_ID"
}`}</pre>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Generate from a URL</h3>

        <pre>{`POST /api/generate
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "sourceType": "url",
  "title": "Example Website",
  "url": "https://example.com"
}`}</pre>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Generate from RSS</h3>

        <pre>{`POST /api/generate
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "sourceType": "rss",
  "title": "My RSS Feed",
  "feedUrl": "https://example.com/feed.xml",
  "maxItems": 25
}`}</pre>

        <p>
          <code>feedUrl</code> is required for RSS generation.
          <code> maxItems </code>
          is optional and defaults to 25.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Batch Generation</h3>

        <p>
          Multiple documents can be submitted in a single request.
        </p>

        <pre>{`POST /api/generate/batch
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "items": [
    {
      "sourceType": "markdown",
      "title": "Document One",
      "markdown": "# Document One"
    },
    {
      "sourceType": "url",
      "title": "Document Two",
      "url": "https://example.com"
    }
  ]
}`}</pre>

        <p>
          The maximum batch size is controlled by the server
          configuration.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Check Job Status</h3>

        <pre>{`GET /api/jobs/:jobId
x-api-key: YOUR_API_KEY`}</pre>

        <p>
          The response contains the complete job record, including
          its current status.
        </p>

        <pre>{`{
  "job": {
    "id": "JOB_ID",
    "sourceType": "markdown",
    "title": "My Document",
    "status": "completed"
  }
}`}</pre>

        <p>
          A newly created job starts with <code>queued</code>.
          Once rendering finishes successfully, its status becomes
          <code> completed </code>.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Download PDF</h3>

        <pre>{`GET /api/jobs/:jobId/download
x-api-key: YOUR_API_KEY`}</pre>

        <p>
          The PDF can be downloaded after the job reaches
          <code> completed </code>.
        </p>

        <p>
          If the PDF is not ready yet, the API returns HTTP
          <code> 409 </code>.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Regenerate a Job</h3>

        <pre>{`POST /api/jobs/:jobId/regenerate
x-api-key: YOUR_API_KEY`}</pre>

        <p>
          Regenerates a previous job using its original queued
          render data.
        </p>

        <p>
          A successful request returns HTTP <code>202</code> with a
          new job ID.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>PowerShell Example</h3>

        <pre>{`$body = @{
  sourceType = "markdown"
  title = "My Document"
  markdown = "# Hello World\\n\\nThis is my PDF."
} | ConvertTo-Json

$response = Invoke-RestMethod \`
  -Uri "http://localhost:4000/api/generate" \`
  -Method POST \`
  -Headers @{ "x-api-key" = "YOUR_API_KEY" } \`
  -ContentType "application/json" \`
  -Body $body

$response`}</pre>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Error Responses</h3>

        <pre>{`400
{
  "error": "..."
}

401
{
  "error": "Invalid or revoked API key."
}

403
{
  "error": "You do not have access to this job."
}

404
{
  "error": "Job not found"
}

409
{
  "error": "Job is not ready..."
}

410
{
  "error": "Output file no longer exists..."
}

429
{
  "error": "Rate limit exceeded. Please slow down."
}`}</pre>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Integration Flow</h3>

        <ol>
          <li>Request API access.</li>
          <li>Wait for administrator approval.</li>
          <li>Receive your API key.</li>
          <li>
            Send the API key using the <code>x-api-key</code> header.
          </li>
          <li>Create a PDF generation job.</li>
          <li>Save the returned job ID.</li>
          <li>Poll the job status.</li>
          <li>Download the PDF when the job is completed.</li>
        </ol>
      </div>
    </div>
  );
}
