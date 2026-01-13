/**
 * 3-stage LLM Council orchestration.
 * Ported from Python backend to browser JavaScript.
 */

import { queryModel, queryModelsParallel } from './llmClient';

/**
 * Stage 1: Collect individual responses from all council models.
 * @param {string} userQuery - The user's question
 * @param {Array} models - List of model configurations
 * @returns {Promise<Array>} List of {model, response} objects
 */
export async function stage1CollectResponses(userQuery, models) {
    const messages = [{ role: 'user', content: userQuery }];

    // Query all models in parallel
    const responses = await queryModelsParallel(models, messages);

    // Create a mapping of ID to Name for display
    const idToName = {};
    models.forEach(m => { idToName[m.id] = m.name; });

    // Format results
    const stage1Results = [];
    for (const [modelId, response] of Object.entries(responses)) {
        if (response !== null) {
            let content = response.content || '';
            if (typeof content !== 'string') {
                content = String(content);
            }
            stage1Results.push({
                model: idToName[modelId] || modelId,
                response: content
            });
        } else {
            stage1Results.push({
                model: idToName[modelId] || modelId,
                response: 'Error: Model failed to respond. It may be overloaded or unavailable.'
            });
        }
    }

    return stage1Results;
}

/**
 * Stage 2: Each model ranks the anonymized responses.
 * @param {string} userQuery - The original user query
 * @param {Array} stage1Results - Results from Stage 1
 * @param {Array} models - List of model configurations
 * @returns {Promise<[Array, Object]>} Tuple of (rankings, labelToModel mapping)
 */
export async function stage2CollectRankings(userQuery, stage1Results, models) {
    // Create anonymized labels for responses (Response A, Response B, etc.)
    const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i)); // A, B, C, ...

    // Create mapping from label to model name
    const labelToModel = {};
    labels.forEach((label, i) => {
        labelToModel[`Response ${label}`] = stage1Results[i].model;
    });

    // Build the ranking prompt
    const responsesText = labels.map((label, i) =>
        `Response ${label}:\n${stage1Results[i].response}`
    ).join('\n\n');

    const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${userQuery}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

    const messages = [{ role: 'user', content: rankingPrompt }];

    // Get rankings from all council models in parallel
    const responses = await queryModelsParallel(models, messages);

    // Create a mapping of ID to Name for display
    const idToName = {};
    models.forEach(m => { idToName[m.id] = m.name; });

    // Format results
    const stage2Results = [];
    for (const [modelId, response] of Object.entries(responses)) {
        if (response !== null) {
            const fullText = response.content || '';
            const parsed = parseRankingFromText(fullText);
            stage2Results.push({
                model: idToName[modelId] || modelId,
                ranking: fullText,
                parsed_ranking: parsed
            });
        }
    }

    return [stage2Results, labelToModel];
}

/**
 * Stage 3: Chairman synthesizes final response.
 * @param {string} userQuery - The original user query
 * @param {Array} stage1Results - Individual model responses
 * @param {Array} stage2Results - Rankings from Stage 2
 * @param {Object} chairman - Chairman model configuration
 * @returns {Promise<Object>} {model, response}
 */
export async function stage3SynthesizeFinal(userQuery, stage1Results, stage2Results, chairman) {
    // Truncate helper - limit each response to ~1000 chars to avoid context overflow
    const truncate = (text, maxLen = 1000) => {
        if (!text || text.length <= maxLen) return text;
        return text.slice(0, maxLen) + '... [truncated]';
    };

    // Build truncated context for chairman
    const stage1Text = stage1Results.map(r =>
        `Model: ${r.model}\nResponse: ${truncate(r.response, 800)}`
    ).join('\n\n');

    // Only include parsed rankings, not full ranking text (which is very long)
    const stage2Text = stage2Results.map(r =>
        `Model: ${r.model}\nParsed Ranking: ${(r.parsed_ranking || []).join(', ')}`
    ).join('\n\n');

    const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: ${userQuery}

STAGE 1 - Individual Responses (summarized):
${stage1Text}

STAGE 2 - Peer Rankings:
${stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`;

    const messages = [{ role: 'user', content: chairmanPrompt }];

    // Query the chairman model
    const response = await queryModel(chairman, messages);

    if (response === null) {
        // Fallback if chairman fails
        return {
            model: chairman.name,
            response: "🤔 Oops! The council's responses were so comprehensive that our chairman got a bit overwhelmed! This usually happens with complex questions that generate long answers.\n\n**What you can try:**\n• Check the individual perspectives above - they're still full of great insights!\n• Try asking a more focused question\n• Break your question into smaller parts\n\nThe council members did their best to help you above! 💡"
        };
    }

    return {
        model: chairman.name,
        response: response.content || ''
    };
}

/**
 * Parse the FINAL RANKING section from the model's response.
 * @param {string} rankingText - The full text response
 * @returns {Array<string>} List of response labels in ranked order
 */
export function parseRankingFromText(rankingText) {
    // Look for "FINAL RANKING:" section
    if (rankingText.includes('FINAL RANKING:')) {
        const parts = rankingText.split('FINAL RANKING:');
        if (parts.length >= 2) {
            const rankingSection = parts[1];
            // Try to extract numbered list format (e.g., "1. Response A")
            const numberedMatches = rankingSection.match(/\d+\.\s*Response [A-Z]/g);
            if (numberedMatches) {
                return numberedMatches.map(m => m.match(/Response [A-Z]/)[0]);
            }

            // Fallback: Extract all "Response X" patterns in order
            const matches = rankingSection.match(/Response [A-Z]/g);
            return matches || [];
        }
    }

    // Fallback: try to find any "Response X" patterns in order
    const matches = rankingText.match(/Response [A-Z]/g);
    return matches || [];
}

/**
 * Calculate aggregate rankings across all models.
 * @param {Array} stage2Results - Rankings from each model
 * @param {Object} labelToModel - Mapping from labels to model names
 * @returns {Array} Sorted list of {model, average_rank, rankings_count}
 */
export function calculateAggregateRankings(stage2Results, labelToModel) {
    // Track positions for each model
    const modelPositions = {};

    for (const ranking of stage2Results) {
        const parsedRanking = parseRankingFromText(ranking.ranking);

        parsedRanking.forEach((label, position) => {
            if (labelToModel[label]) {
                const modelName = labelToModel[label];
                if (!modelPositions[modelName]) {
                    modelPositions[modelName] = [];
                }
                modelPositions[modelName].push(position + 1);
            }
        });
    }

    // Calculate average position for each model
    const aggregate = [];
    for (const [model, positions] of Object.entries(modelPositions)) {
        if (positions.length > 0) {
            const avgRank = positions.reduce((a, b) => a + b, 0) / positions.length;
            aggregate.push({
                model,
                average_rank: Math.round(avgRank * 100) / 100,
                rankings_count: positions.length
            });
        }
    }

    // Sort by average rank (lower is better)
    aggregate.sort((a, b) => a.average_rank - b.average_rank);

    return aggregate;
}

/**
 * Generate a short title for a conversation.
 * @param {Array<string>} userQueries - List of user messages
 * @returns {Promise<string>} A short title (3-5 words)
 */
export async function generateConversationTitle(userQueries) {
    const queriesToUse = userQueries.slice(0, 5);
    const combinedQuery = queriesToUse.map(q => `- ${q}`).join('\n');

    const titlePrompt = `Generate a very short title (3-5 words maximum) that summarizes the following conversation topics.
The title should be concise, descriptive, and capture the main theme. Do not use quotes or punctuation.

User Queries:
${combinedQuery}

Title:`;

    const messages = [{ role: 'user', content: titlePrompt }];

    // Use Qwen 2.5 72B for title generation
    const modelConfig = {
        id: 'qwen/qwen-2.5-72b-instruct',
        provider: 'openrouter',
        name: 'Qwen 2.5'
    };

    const response = await queryModel(modelConfig, messages, 30000);

    if (response === null) {
        return 'New Conversation';
    }

    let title = (response.content || 'New Conversation').trim();

    // Clean up the title - remove quotes, limit length
    title = title.replace(/^["']|["']$/g, '');

    // Truncate if too long
    if (title.length > 50) {
        title = title.substring(0, 47) + '...';
    }

    return title;
}

/**
 * Run the complete 3-stage council process.
 * @param {string} userQuery - The user's question
 * @param {Array} models - List of model configurations
 * @param {Object} chairman - Chairman model configuration
 * @param {Function} onStageComplete - Callback for stage updates
 * @returns {Promise<Object>} {stage1, stage2, stage3, metadata}
 */
export async function runFullCouncil(userQuery, models, chairman, onStageComplete) {
    // Stage 1: Collect individual responses
    if (onStageComplete) onStageComplete('stage1_start', {});
    const stage1Results = await stage1CollectResponses(userQuery, models);
    if (onStageComplete) onStageComplete('stage1_complete', { data: stage1Results });

    // If no models responded successfully, return error
    if (stage1Results.length === 0) {
        const errorResult = {
            model: 'error',
            response: 'All models failed to respond. Please try again.'
        };
        return {
            stage1: [],
            stage2: [],
            stage3: errorResult,
            metadata: {}
        };
    }

    // Stage 2: Collect rankings
    if (onStageComplete) onStageComplete('stage2_start', {});
    const [stage2Results, labelToModel] = await stage2CollectRankings(userQuery, stage1Results, models);

    // Calculate aggregate rankings
    const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);
    if (onStageComplete) {
        onStageComplete('stage2_complete', {
            data: stage2Results,
            metadata: { label_to_model: labelToModel, aggregate_rankings: aggregateRankings }
        });
    }

    // Stage 3: Synthesize final answer
    if (onStageComplete) onStageComplete('stage3_start', {});
    const stage3Result = await stage3SynthesizeFinal(userQuery, stage1Results, stage2Results, chairman);
    if (onStageComplete) onStageComplete('stage3_complete', { data: stage3Result });

    return {
        stage1: stage1Results,
        stage2: stage2Results,
        stage3: stage3Result,
        metadata: {
            label_to_model: labelToModel,
            aggregate_rankings: aggregateRankings
        }
    };
}
