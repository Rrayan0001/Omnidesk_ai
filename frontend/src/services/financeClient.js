/**
 * Finance Client for Alpha Vantage API.
 * Provides stock data for financial queries.
 */

import { ALPHA_VANTAGE_API_KEY } from './config';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Check if Alpha Vantage API is configured.
 */
export function isFinanceConfigured() {
    return !!ALPHA_VANTAGE_API_KEY;
}

/**
 * Get stock quote (current price) for a symbol.
 * @param {string} symbol - Stock ticker symbol (e.g., 'AAPL', 'GOOGL')
 * @returns {Promise<Object>} Quote data
 */
export async function getStockQuote(symbol) {
    if (!isFinanceConfigured()) {
        throw new Error('Alpha Vantage API key not configured');
    }

    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }

        if (data['Note']) {
            // API rate limit hit
            console.warn('Alpha Vantage rate limit:', data['Note']);
            return null;
        }

        const quote = data['Global Quote'];
        if (!quote || Object.keys(quote).length === 0) {
            return null;
        }

        return {
            symbol: quote['01. symbol'],
            open: parseFloat(quote['02. open']),
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            price: parseFloat(quote['05. price']),
            volume: parseInt(quote['06. volume']),
            latestTradingDay: quote['07. latest trading day'],
            previousClose: parseFloat(quote['08. previous close']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent']
        };
    } catch (error) {
        console.error('Error fetching stock quote:', error);
        throw error;
    }
}

/**
 * Get daily time series (historical data) for a symbol.
 * @param {string} symbol - Stock ticker symbol
 * @param {string} outputSize - 'compact' (100 days) or 'full' (20+ years)
 * @returns {Promise<Array>} Array of daily price data
 */
export async function getDailyTimeSeries(symbol, outputSize = 'compact') {
    if (!isFinanceConfigured()) {
        throw new Error('Alpha Vantage API key not configured');
    }

    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }

        if (data['Note']) {
            console.warn('Alpha Vantage rate limit:', data['Note']);
            return null;
        }

        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) {
            return null;
        }

        // Convert to array format
        const result = Object.entries(timeSeries).map(([date, values]) => ({
            date,
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
            volume: parseInt(values['5. volume'])
        }));

        // Sort by date descending (most recent first)
        return result.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error fetching daily time series:', error);
        throw error;
    }
}

/**
 * Search for stock symbols by keywords.
 * @param {string} keywords - Search keywords
 * @returns {Promise<Array>} Array of matching symbols
 */
export async function searchSymbol(keywords) {
    if (!isFinanceConfigured()) {
        throw new Error('Alpha Vantage API key not configured');
    }

    const url = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }

        const matches = data['bestMatches'] || [];
        return matches.map(match => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'],
            region: match['4. region'],
            currency: match['8. currency']
        }));
    } catch (error) {
        console.error('Error searching symbols:', error);
        throw error;
    }
}

/**
 * Detect if a query is a financial query.
 * @param {string} query - User query
 * @returns {boolean} True if financial query
 */
export function isFinancialQuery(query) {
    if (!query || typeof query !== 'string') return false;

    const lowerQuery = query.toLowerCase();

    const financialKeywords = [
        'stock', 'stocks', 'share', 'shares', 'price',
        'ticker', 'market', 'nasdaq', 'nyse', 'dow', 's&p',
        'trading', 'invest', 'investment',
        'aapl', 'googl', 'goog', 'msft', 'amzn', 'meta', 'tsla', 'nvda',
        'apple stock', 'google stock', 'microsoft stock', 'amazon stock',
        'tesla stock', 'nvidia stock',
        'stock price', 'share price', 'stock history', 'stock performance',
        'earnings', 'dividend', 'market cap'
    ];

    return financialKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Extract stock symbol from a query.
 * @param {string} query - User query
 * @returns {string|null} Stock symbol or null
 */
export function extractStockSymbol(query) {
    if (!query) return null;

    const upperQuery = query.toUpperCase();

    // Common company name to symbol mapping
    const companyToSymbol = {
        'APPLE': 'AAPL',
        'GOOGLE': 'GOOGL',
        'ALPHABET': 'GOOGL',
        'MICROSOFT': 'MSFT',
        'AMAZON': 'AMZN',
        'META': 'META',
        'FACEBOOK': 'META',
        'TESLA': 'TSLA',
        'NVIDIA': 'NVDA',
        'NETFLIX': 'NFLX',
        'AMD': 'AMD',
        'INTEL': 'INTC',
        'SPOTIFY': 'SPOT',
        'DISNEY': 'DIS',
        'COCA-COLA': 'KO',
        'PEPSI': 'PEP',
        'WALMART': 'WMT',
        'TARGET': 'TGT',
        'COSTCO': 'COST',
        'NIKE': 'NKE',
        'ADOBE': 'ADBE',
        'SALESFORCE': 'CRM',
        'PAYPAL': 'PYPL',
        'UBER': 'UBER',
        'AIRBNB': 'ABNB',
        'SNAP': 'SNAP',
        'TWITTER': 'X',
        'X': 'X',
        'ORACLE': 'ORCL',
        'IBM': 'IBM',
        'CISCO': 'CSCO',
        'QUALCOMM': 'QCOM',
        'BOEING': 'BA',
        'LOCKHEED': 'LMT',
        'GENERAL MOTORS': 'GM',
        'FORD': 'F',
        'CHEVRON': 'CVX',
        'EXXON': 'XOM'
    };

    // Check for company names
    for (const [company, symbol] of Object.entries(companyToSymbol)) {
        if (upperQuery.includes(company)) {
            return symbol;
        }
    }

    // Look for explicit ticker symbols (1-5 uppercase letters)
    const tickerMatch = upperQuery.match(/\b([A-Z]{1,5})\b/);
    if (tickerMatch) {
        const potentialTicker = tickerMatch[1];
        // Exclude common words that look like tickers
        const excludeWords = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'LET', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'BOY', 'DID', 'OWN', 'SAY', 'SHE', 'TOO', 'USE'];
        if (!excludeWords.includes(potentialTicker) && potentialTicker.length >= 2) {
            return potentialTicker;
        }
    }

    return null;
}

/**
 * Format stock data for LLM context.
 * @param {Object} quote - Quote data from getStockQuote
 * @param {Array} history - Historical data from getDailyTimeSeries
 * @returns {string} Formatted context string
 */
export function formatFinanceContext(quote, history = null) {
    let context = '=== REAL-TIME STOCK DATA ===\n\n';

    if (quote) {
        context += `**${quote.symbol} - Current Quote**\n`;
        context += `- Current Price: $${quote.price.toFixed(2)}\n`;
        context += `- Change: ${quote.change >= 0 ? '+' : ''}$${quote.change.toFixed(2)} (${quote.changePercent})\n`;
        context += `- Open: $${quote.open.toFixed(2)}\n`;
        context += `- High: $${quote.high.toFixed(2)}\n`;
        context += `- Low: $${quote.low.toFixed(2)}\n`;
        context += `- Previous Close: $${quote.previousClose.toFixed(2)}\n`;
        context += `- Volume: ${quote.volume.toLocaleString()}\n`;
        context += `- Latest Trading Day: ${quote.latestTradingDay}\n\n`;
    }

    if (history && history.length > 0) {
        context += `**Historical Data (Last ${Math.min(history.length, 30)} Trading Days)**\n`;
        context += '| Date | Open | High | Low | Close | Volume |\n';
        context += '|------|------|------|-----|-------|--------|\n';

        // Show up to 30 days
        const recentHistory = history.slice(0, 30);
        for (const day of recentHistory) {
            context += `| ${day.date} | $${day.open.toFixed(2)} | $${day.high.toFixed(2)} | $${day.low.toFixed(2)} | $${day.close.toFixed(2)} | ${day.volume.toLocaleString()} |\n`;
        }
        context += '\n';

        // Calculate some basic stats
        if (history.length >= 2) {
            const latestClose = history[0].close;
            const oldestClose = history[history.length - 1].close;
            const periodChange = ((latestClose - oldestClose) / oldestClose * 100).toFixed(2);
            const highestPrice = Math.max(...history.map(d => d.high));
            const lowestPrice = Math.min(...history.map(d => d.low));

            context += `**Period Statistics (${history.length} days)**\n`;
            context += `- Period Change: ${periodChange >= 0 ? '+' : ''}${periodChange}%\n`;
            context += `- Period High: $${highestPrice.toFixed(2)}\n`;
            context += `- Period Low: $${lowestPrice.toFixed(2)}\n`;
        }
    }

    context += '\n=== END STOCK DATA ===\n';
    return context;
}
