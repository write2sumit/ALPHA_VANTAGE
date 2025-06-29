// Filename: /api/getAiAnalysis.js (for a Vercel/Next.js style serverless function)

export default async function handler(req, res) {
  // --- NEW: Add CORS Headers to give the extension permission ---
  // This allows your Chrome extension to make requests to this server
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allows all origins
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle pre-flight requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // --- END of new CORS section ---

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { ticker } = req.body;

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${ticker}&apikey=${apiKey}`;

  try {
    const alphaVantageResponse = await fetch(url);
    if (!alphaVantageResponse.ok) {
      throw new Error('Failed to fetch from Alpha Vantage API');
    }

    const data = await alphaVantageResponse.json();

    if (data['Note'] || data['Information']) {
        console.warn('Alpha Vantage API rate limit likely hit:', data);
        return res.status(429).json({ error: 'API call limit reached. Please try again later.' });
    }
    
    const feed = data.feed || [];
    const tickerData = feed.find(item => item.ticker_sentiment.some(t => t.ticker === ticker));

    if (!tickerData) {
      return res.status(404).json({ sentiment: 'N/A', relevance: 'No data found' });
    }
    
    const relevantTickerInfo = tickerData.ticker_sentiment.find(t => t.ticker === ticker);

    const analysisResult = {
      sentiment: relevantTickerInfo.sentiment_label,
      relevance: relevantTickerInfo.relevance_score
    };

    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error('Error in proxy server:', error);
    return res.status(500).json({ error: 'Failed to get AI analysis' });
  }
}
