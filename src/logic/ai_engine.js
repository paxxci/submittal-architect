const axios = require('axios');

/**
 * AI Engine — Powered by OpenRouter (Gemini Flash)
 * 
 * Responsibilities:
 * 1. Read raw spec text and extract: product type, search query, manufacturers, key requirements
 * 2. Verify that a found cut sheet matches spec requirements
 */
class AIEngine {
    constructor(apiKey) {
        if (!apiKey) throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY in your .env file.');
        this.apiKey = apiKey;
        this.model = process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    async _call(systemPrompt, userContent) {
        const response = await axios.post(
            this.baseUrl,
            {
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.1,
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://submittal-architect.app',
                    'X-Title': 'Submittal Architect'
                }
            }
        );
        return response.data.choices[0].message.content.trim();
    }

    async extractSearchQueries(sectionTitle, specText) {
        const NECHandbook = require('./nec_handbook');
        const system = `You are a Master Electrical Estimator. You understand the National Electrical Code (NEC) and the physical differences between 'Raceway' (the pipe) and 'Fittings' (the connectors).
        
Industry Standards Reference:
- NEC Category 'Fittings': ${NECHandbook.standard_mappings.Fittings.join(', ')}
- NEC Category 'Raceway': ${NECHandbook.standard_mappings.Raceway.join(', ')}
- Common Manufacturers: ${Object.keys(NECHandbook.common_manufacturers).join(', ')}

Your goal is to extract a LIST of ALL distinct products to be purchased from a specification block. Often, a single block like 'FITTINGS' requires multiple items (e.g. fittings for Rigid, EMT, and IMC).`;

        const user = `Read this electrical specification block and extract a list of all distinct product sourcing tasks.
        
BLOCK TITLE: "${sectionTitle}"

SPEC TEXT:
"""
${specText.slice(0, 4000)}
"""

CRITICAL RULES:
1. IDENTIFY MULTIPLE PRODUCTS: If the block mentions fittings for different types of conduit (Rigid, EMT, Liquidtight), return a separate entry for each conduit fitting type.
2. STRICT PART NUMBERS: If you see specific numbers from manufacturers like Raco, Hubbell, or Steel City, YOU MUST include them in the 'searchQuery'. This is a MANDATORY requirement for accuracy.
3. CATEGORY ENFORCEMENT: If the block title says 'FITTINGS', do NOT return search queries for 'Conduit', 'Pipe', or 'Raceway'.
4. CONDUIT TYPE SPECIFICITY: Every productType MUST include the conduit type (e.g. 'Rigid Connector' NOT just 'Connector').
5. MINIMIZE OVERLAP: Do not return 10 items for the same conduit type. Group by major category (e.g. 'EMT Fittings', 'Rigid Fittings').

Respond ONLY as valid JSON:
{
  "products": [
    {
      "searchQuery": "manufacturer + part number + product (e.g. 'Raco 1222 fitting')",
      "productType": "Specific product name (e.g. 'Rigid Conduit Connector')",
      "manufacturers": ["Raco", "Steel City"],
      "keyRequirements": ["technical requirements for THIS specific item"],
      "isProduct": true
    }
  ]
}`;

        try {
            const raw = await this._call(system, user);
            const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(clean);
            
            const results = Array.isArray(parsed.products) ? parsed.products : [parsed];
            
            console.log(`[AI] Identified ${results.length} distinct products in this block.`);
            return results;
        } catch (err) {
            console.error('[AI] extractSearchQueries failed:', err.message);
            return [{ searchQuery: sectionTitle, productType: sectionTitle, manufacturers: [], keyRequirements: [], isProduct: true }];
        }
    }

    /**
     * Step 2 of Sourcing Pipeline (NEW):
     * Given a list of product candidates from a vendor search page,
     * score each one against the spec block's requirements and pick the best match.
     *
     * @param {Array} candidates - [{ title, description, href }] from search results
     * @param {string} blockTitle - The spec block title (e.g. "2.01 WALL SWITCHES")
     * @param {string[]} keyRequirements - Requirements extracted from the spec block
     * @param {string[]} approvedManufacturers - Brand names from the spec (may be empty)
     * @returns {{ selectedIndex, confidence, matchedRequirements, unmatchedRequirements, reason }}
     */
    async selectBestProduct(candidates, blockTitle, keyRequirements = [], approvedManufacturers = []) {
        if (!candidates || candidates.length === 0) {
            return null;
        }

        // If no specific requirements, just pick the first result (generic spec)
        if (keyRequirements.length === 0 && approvedManufacturers.length === 0) {
            console.log('[AI] No specific requirements — selecting first candidate by default.');
            return {
                selectedIndex: 0,
                confidence: 0.7,
                matchedRequirements: [],
                unmatchedRequirements: [],
                reason: 'No specific requirements listed in spec — first available product selected.'
            };
        }

        const NECHandbook = require('./nec_handbook');
        const system = `You are a Master Electrical Estimator. You are precise and conservative.
        
NEC Category Guardrails:
- A 'Fitting' (Connector, Coupling) is NOT a 'Raceway' (Pipe, Conduit).
- If the Spec Block is for 'Fittings', you MUST REJECT any product that is just raw conduit/pipe (e.g. Allied Rigid Conduit) with a confidence of 0.0.
- Exception: If the product is a fitting *for* the specified conduit, it is a valid match.

Role: Verify that products meet specific technical standards (NEMA, UL, NEC). Matched requirements MUST be explicitly found in the vendor text.`;

        const candidateList = candidates
            .map((c, i) => `[${i}] Title: "${c.title}"${c.description ? `\n    Description: "${c.description}"` : ''}`)
            .join('\n');

        const user = `Find the best product for this specification block.

SPEC BLOCK: "${blockTitle}"

KEY REQUIREMENTS:
${keyRequirements.length > 0 ? keyRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n') : '(none specified)'}

APPROVED MANUFACTURERS:
${approvedManufacturers.length > 0 ? approvedManufacturers.join(', ') : '(any brand acceptable)'}

VENDOR SEARCH RESULTS:
${candidateList}

Instructions:
1. HARD CATEGORY CHECK: Is the candidate a 'Fitting' or a 'Pipe'? If the spec is for Fittings and the product is a Pipe, score it 0.0.
2. CONDUIT TYPE MATCH: If the spec specifies "Rigid" and the candidate is "Flex" or "EMT", score it 0.0. This is a NON-NEGOTIABLE engineering requirement.
3. SIZE MATCH: If the spec specifies a size (e.g. 1/2 inch) and the candidate is a different size (e.g. 3/4 inch), score it 0.0.
4. PART NUMBER MATCH: If the Spec Block mentions a part number (e.g. 1222) and the product title contains that number, it is a high-confidence match.
5. OUTPUT: List the specific technical traits that match (e.g. 'Malleable Iron', 'Steel').

Respond ONLY as valid JSON:
{
  "selectedIndex": 0,
  "confidence": 0.85,
  "matchedRequirements": ["technical proof found in text"],
  "unmatchedRequirements": ["spec reqs missing from vendor text"],
  "reason": "Clear explanation of why this was selected (or why it was rejected)."
}`;

        try {
            const raw = await this._call(system, user);
            const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(clean);

            // Clamp index to valid range
            result.selectedIndex = Math.max(0, Math.min(result.selectedIndex, candidates.length - 1));

            console.log(`[AI] Best product: [${result.selectedIndex}] "${candidates[result.selectedIndex]?.title}"`);
            console.log(`[AI] Confidence: ${(result.confidence * 100).toFixed(0)}%`);
            console.log(`[AI] Matched: ${result.matchedRequirements?.join(', ') || 'none'}`);
            console.log(`[AI] Unmatched: ${result.unmatchedRequirements?.join(', ') || 'none'}`);

            return result;
        } catch (err) {
            console.error('[AI] selectBestProduct failed:', err.message);
            // Graceful fallback: use first candidate
            return {
                selectedIndex: 0,
                confidence: 0.5,
                matchedRequirements: [],
                unmatchedRequirements: keyRequirements,
                reason: 'AI scoring failed — first result used as fallback.'
            };
        }
    }

    /**
     * Step 3 (Optional): Verify found cut sheet matches spec requirements.
     */
    async verifyCutsheetMatch(foundProductTitle, cutsheetUrl, keyRequirements) {
        if (!keyRequirements || keyRequirements.length === 0) {
            return { isMatch: true, confidence: 0.7, notes: 'No specific requirements to verify.' };
        }

        const system = `You are an electrical estimator verifying product compliance against project specifications.`;
        const user = `Product found: "${foundProductTitle}"
Cut sheet URL: "${cutsheetUrl}"

Spec requirements to check:
${keyRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Based on the product name alone, estimate whether this product matches.
Respond ONLY as JSON: { "isMatch": true/false, "confidence": 0.0-1.0, "notes": "brief reason" }`;

        try {
            const raw = await this._call(system, user);
            const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(clean);
        } catch (err) {
            return { isMatch: true, confidence: 0.6, notes: 'Could not verify.' };
        }
    }
}

module.exports = AIEngine;
