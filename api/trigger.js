// Serverless API Endpoint: /api/trigger
// Handles incoming webhooks and REST API requests for FlowForge pipelines

export default async function handler(req, res) {
  // 1. Enable CORS for cross-origin webhook ingestion
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'FlowForge Webhook API only accepts POST requests with JSON payload.'
    });
  }

  const startTime = Date.now();

  try {
    const rawBody = req.body;
    let records = [];

    // Normalize incoming payload into an array of records
    if (Array.isArray(rawBody)) {
      records = rawBody;
    } else if (rawBody && typeof rawBody === 'object') {
      if (Array.isArray(rawBody.data)) {
        records = rawBody.data;
      } else if (Array.isArray(rawBody.records)) {
        records = rawBody.records;
      } else if (rawBody.order || rawBody.charge || rawBody.event) {
        records = [rawBody.order || rawBody.charge || rawBody];
      } else {
        records = [rawBody];
      }
    }

    if (records.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid records found in payload. Provide a JSON object or array.'
      });
    }

    const recordsIn = records.length;

    // Apply FlowForge In-Flight Normalization & Self-Healing Shims
    const transformed = records.map((record) => {
      const healed = { ...record };

      // Re-alias common renamed fields
      if (healed.contact_email && !healed.email) {
        healed.email = healed.contact_email;
      }
      if (healed.customer_email && !healed.email) {
        healed.email = healed.customer_email;
      }

      // Clean currency symbols and parse numeric amounts
      if (typeof healed.amount === 'string') {
        const cleaned = parseFloat(healed.amount.replace(/[^0-9.-]/g, ''));
        if (!isNaN(cleaned)) healed.amount = cleaned;
      }

      // Add auto-tiering if amount is present
      if (typeof healed.amount === 'number') {
        if (healed.amount >= 500) healed.customer_tier = 'VIP';
        else if (healed.amount >= 100) healed.customer_tier = 'Regular';
        else healed.customer_tier = 'Standard';
      }

      // Add pipeline ingestion metadata
      healed._flowforge_processed_at = new Date().toISOString();

      return healed;
    });

    const elapsedMs = Date.now() - startTime;
    const executionId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return res.status(200).json({
      success: true,
      message: 'Pipeline executed successfully via API',
      executionId,
      pipelineId: req.query ? req.query.pipeline || 'live-api-pipeline' : 'live-api-pipeline',
      recordsIn,
      recordsOut: transformed.length,
      latencyMs: elapsedMs,
      data: transformed
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Execution Failed',
      message: error.message || 'An error occurred during pipeline execution.'
    });
  }
}
