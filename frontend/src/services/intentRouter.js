/**
 * Intent Router for detecting real-time vs static queries.
 * Determines whether a user query requires web search or can be answered directly.
 */

// Keywords that indicate a need for real-time/current information
const REALTIME_KEYWORDS = [
    // Time-sensitive keywords
    'today', 'tonight', 'now', 'current', 'currently',
    'latest', 'recent', 'recently', 'new', 'newest',
    'breaking', 'live', 'ongoing', 'happening',

    // News-related
    'news', 'headline', 'headlines', 'update', 'updates',
    'announced', 'announcement', 'released', 'launched',

    // Time references
    'this week', 'this month', 'this year', '2024', '2025', '2026',
    'yesterday', 'last night', 'last week',

    // Real-world events
    'weather', 'forecast', 'temperature',
    'stock', 'stocks', 'market', 'price', 'prices',
    'score', 'match', 'game', 'won', 'winner',
    'election', 'vote', 'poll',

    // Questions about current state
    "what's happening", "what is happening",
    "who is the", "who are the",
    "how much is", "how much does",
];

// Patterns that suggest the query is about static/factual knowledge
const STATIC_PATTERNS = [
    // Explanations and definitions
    /^(what is|what are|explain|describe|define|definition of)/i,
    /^(how does|how do|how to|why does|why do)/i,

    // Code and technical
    /^(write|code|implement|create|build|make) (a|an|the)? ?(function|class|script|program|code)/i,
    /^(fix|debug|solve|help with)/i,

    // Learning
    /^(teach me|tell me about|learn|understand)/i,

    // Math and science (unless about current data)
    /^(calculate|compute|solve|prove)/i,

    // History and facts
    /^(when was|where is|who invented|history of)/i,
];

/**
 * Determine if a query requires real-time web search.
 * @param {string} query - The user's query
 * @returns {boolean} True if search is needed
 */
// Broad keywords that often benefit from search but aren't strictly "realtime"
const BROAD_SEARCH_KEYWORDS = [
    'vs', 'versus', 'compare', 'difference',
    'review', 'reviews', 'best', 'top', 'rating',
    'price', 'cost', 'buy', 'cheap', 'expensive',
    'tutorial', 'guide', 'how to',
    'example', 'examples',
    'meaning', 'mean',
    'release date', 'when is',
];

/**
 * Determine if a query requires real-time web search.
 * @param {string} query - The user's query
 * @returns {boolean} True if search is needed
 */
export function isRealtimeQuery(query) {
    if (!query || typeof query !== 'string') {
        return false;
    }

    const lowerQuery = query.toLowerCase().trim();

    // Check for explicit realtime keywords first (highest priority)
    for (const keyword of REALTIME_KEYWORDS) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
            return true;
        }
    }

    // Check for broad search keywords
    for (const keyword of BROAD_SEARCH_KEYWORDS) {
        // Simple distinct word matching to avoid false positives (e.g. "top" in "stop")
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerQuery)) {
            return true;
        }
    }

    // Check for question patterns about current events
    if (/who (is|are) (the )?(current|new|latest)/i.test(query)) {
        return true;
    }

    if (/what (is|are) (the )?(current|latest|new)/i.test(query)) {
        return true;
    }

    // Check for "What is X" or "Who is X" which often benefit from fresh info
    // but exclude definitions that look like homework/basic facts if possible
    if (/^(what|who) (is|are|was|were)/i.test(lowerQuery) && lowerQuery.length > 15) {
        // If it's a specific question, default to search to be safe
        // heavily dependent on whether we want to risk over-searching
        // For "Broad" option, we should lean towards true.
        return true;
    }

    // Default: no search needed
    return false;
}

/**
 * Get the reason why a query was classified as realtime or not.
 * Useful for debugging and transparency.
 * @param {string} query - The user's query
 * @returns {Object} {isRealtime: boolean, reason: string}
 */
export function classifyQuery(query) {
    if (!query || typeof query !== 'string') {
        return { isRealtime: false, reason: 'Invalid query' };
    }

    const lowerQuery = query.toLowerCase().trim();

    // Check realtime keywords
    for (const keyword of REALTIME_KEYWORDS) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
            return {
                isRealtime: true,
                reason: `Contains realtime keyword: "${keyword}"`
            };
        }
    }

    // Check broad search keywords
    for (const keyword of BROAD_SEARCH_KEYWORDS) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerQuery)) {
            return {
                isRealtime: true,
                reason: `Contains broad search keyword: "${keyword}"`
            };
        }
    }

    if (/^(what|who) (is|are|was|were)/i.test(lowerQuery) && lowerQuery.length > 15) {
        return {
            isRealtime: true,
            reason: 'Matches general entity question pattern'
        };
    }

    return { isRealtime: false, reason: 'No search indicators found' };
}
