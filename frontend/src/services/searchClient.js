/**
 * Google Custom Search API client.
 * Fetches real-time search results and formats them for LLM context injection.
 */

import { GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX } from './config';

const GOOGLE_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';

/**
 * Search Google using Custom Search API.
 * @param {string} query - The search query
 * @param {number} numResults - Number of results to fetch (1-10)
 * @returns {Promise<Array>} Array of search results
 */
export async function searchGoogle(query, numResults = 5) {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
        console.warn('Google Search API not configured');
        return [];
    }

    try {
        const params = new URLSearchParams({
            key: GOOGLE_SEARCH_API_KEY,
            cx: GOOGLE_SEARCH_CX,
            q: query,
            num: Math.min(numResults, 10).toString(),
        });

        const response = await fetch(`${GOOGLE_SEARCH_URL}?${params}`);

        if (!response.ok) {
            throw new Error(`Search API error: ${response.status}`);
        }

        const data = await response.json();
        return processSearchResults(data.items || []);
    } catch (error) {
        console.error('Google Search error:', error);
        return [];
    }
}

/**
 * Process raw Google search results.
 * Extracts only title, snippet, and source - removes ads and metadata.
 * @param {Array} rawResults - Raw API response items
 * @returns {Array} Cleaned search results
 */
export function processSearchResults(rawResults) {
    return rawResults
        .filter(item => !item.pagemap?.metatags?.[0]?.['og:type']?.includes('ad'))
        .map(item => ({
            title: item.title || '',
            snippet: item.snippet || '',
            source: item.displayLink || new URL(item.link).hostname,
            url: item.link
        }))
        .slice(0, 5); // Limit to top 5
}

/**
 * Format search results as context for LLM injection.
 * @param {Array} results - Processed search results
 * @returns {string} Formatted context string
 */
export function formatSearchContext(results) {
    if (!results || results.length === 0) {
        return '';
    }

    const formattedResults = results.map((r, i) =>
        `[${i + 1}] ${r.title}\n   ${r.snippet}\n   Source: ${r.source}`
    ).join('\n\n');

    return `## Real-Time Search Results

The following information was retrieved from the web just now. Use ONLY this information to answer questions about current events, recent news, or time-sensitive topics. If the search results don't contain sufficient information, clearly state that.

${formattedResults}

---

`;
}

/**
 * Check if search API is configured.
 * @returns {boolean} True if API keys are present
 */
export function isSearchConfigured() {
    return !!(GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX);
}
