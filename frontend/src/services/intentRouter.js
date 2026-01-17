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
export function isRealtimeQuery(query) {
    if (!query || typeof query !== 'string') {
        return false;
    }

    const lowerQuery = query.toLowerCase().trim();

    // First, check if it matches static patterns - these don't need search
    for (const pattern of STATIC_PATTERNS) {
        if (pattern.test(lowerQuery)) {
            // But still check for realtime keywords that might override
            const hasRealtimeKeyword = REALTIME_KEYWORDS.some(kw =>
                lowerQuery.includes(kw.toLowerCase())
            );
            if (!hasRealtimeKeyword) {
                return false;
            }
        }
    }

    // Check for realtime keywords
    for (const keyword of REALTIME_KEYWORDS) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
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

    // Check static patterns first
    for (const pattern of STATIC_PATTERNS) {
        if (pattern.test(lowerQuery)) {
            const hasOverride = REALTIME_KEYWORDS.some(kw =>
                lowerQuery.includes(kw.toLowerCase())
            );
            if (!hasOverride) {
                return {
                    isRealtime: false,
                    reason: 'Matches static knowledge pattern'
                };
            }
        }
    }

    // Check realtime keywords
    for (const keyword of REALTIME_KEYWORDS) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
            return {
                isRealtime: true,
                reason: `Contains realtime keyword: "${keyword}"`
            };
        }
    }

    return { isRealtime: false, reason: 'No realtime indicators found' };
}
