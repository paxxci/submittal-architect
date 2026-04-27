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
        let currentModel = this.model;
        let retries = 2;
        
        while (retries >= 0) {
            try {
                const response = await axios.post(
                    this.baseUrl,
                    {
                        model: currentModel,
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
            } catch (err) {
                console.error(`[AI] Call failed for model ${currentModel}. Status: ${err.response?.status}`);
                if (retries === 0) throw err;
                
                if (err.response?.status === 429 || err.response?.status === 504 || err.response?.status === 502) {
                    console.log(`[AI] Upstream issue detected (Status ${err.response?.status}). Switching fallback model...`);
                    currentModel = 'openai/gpt-4o-mini';
                }
                
                retries--;
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }

    async extractSearchQueries(sectionTitle, specText) {
        const NECHandbook = require('./nec_handbook');
        const system = `You are a Master Electrical Estimator acting as a Submittal extraction engine. 
Your primary job is to extract a LIST of ALL distinct, physical, procurable items to be purchased from a specification block.

CRITICAL ONTOLOGY RULES:
1. WHAT IS A PRODUCT: A product is a tangible physical good that must be ordered from a distributor (e.g., 'Ground Rod', 'Mechanical Lug', 'Bare Copper Wire', 'Transformer').
2. WHAT IS NOT A PRODUCT: Do NOT extract administrative text ('Submit shop drawings', 'Provide products listed...'), execution instructions ('Torque to 50 ft-lbs', 'Excavate trench'), or generic headers ('A. General', 'B. Requirements').
3. SEMANTIC GROUPING (IGNORE FORMATTING): Do not blindly rely on 'A., B., C.' or '1., 2., 3.' numbering. Instead, read the text for meaning. 
   - Identify the physical item.
   - Gather all technical details describing that item (material, size, compliance, shape, mounting) and group them into its 'keyRequirements' array, regardless of how they are numbered or lettered.
4. DISTINCT LINE ITEMS: If physical properties dictate that you must buy two different SKUs, they must be separate items. (e.g., 'Bare Copper Wire' and 'Insulated Copper Wire' are TWO distinct products, even if they share the same paragraph).`;

        const user = `Read this electrical specification block and extract a list of all distinct physical products to be sourced.
        
BLOCK TITLE: "${sectionTitle}"

SPEC TEXT:
"""
${specText.slice(0, 4000)}
"""

CRITICAL RULES:
1. FOCUS ON TANGIBLE GOODS: Extract the physical items needed.
2. COMPILE KEY REQUIREMENTS: For each physical item, gather all of its technical properties from the text into the 'keyRequirements' array.
3. STRICT PART NUMBERS: If you see specific manufacturer part numbers (e.g. 'Raco 1222'), YOU MUST include them in the 'searchQuery'.
4. MINIMIZE NOISE: Completely ignore general instructions, installation notes, and non-physical descriptions.

Respond ONLY as valid JSON:
{
  "products": [
    {
      "searchQuery": "manufacturer + part number + product (e.g. 'Hubbell Copper Rectangular Ground Bar')",
      "productType": "Specific physical product name (e.g. 'Copper Ground Bar')",
      "manufacturers": ["Hubbell", "Leviton"],
      "keyRequirements": ["Copper rectangular", "Includes mounting brackets and insulators", "UL 467 compliance"],
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
        const system = `You are a Master Electrical Estimator. You are precise but practical.
        
NEC Category Guardrails:
- A 'Fitting' (Connector, Coupling) is NOT a 'Raceway' (Pipe, Conduit).
- If the Spec Block is for 'Fittings', you MUST REJECT any product that is just raw conduit/pipe (e.g. Allied Rigid Conduit) with a confidence of 0.0.
- Exception: If the product is a fitting *for* the specified conduit, it is a valid match.

Role: Verify that products meet specific technical standards (NEMA, UL, NEC). 
CRITICAL CONTEXT: Manufacturer cut sheets are generic and will almost NEVER contain every single granular detail or installation note written by the engineer. Do NOT penalize a product heavily just because a minor spec detail (e.g., 'install with stainless bolts') is missing from the marketing text. Focus on verifying the core physical identity and primary ratings (e.g., is it Copper? Is it a Ground Bar? Is it UL 467?).`;

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

        const system = `You are an electrical estimator verifying product compliance against project specifications.
CRITICAL CONTEXT: Manufacturer cut sheets are generic marketing documents. They almost NEVER contain every single granular detail (e.g., installation notes, specific bolt sizes, or redundant standards) listed by the engineer. 
Do NOT penalize a product heavily for missing minor details. Focus on verifying the core physical identity: Is this the right class of product? Does it meet the primary ratings (e.g., UL 467)?`;
        const user = `Product found: "${foundProductTitle}"
Cut sheet URL: "${cutsheetUrl}"

Spec requirements to check:
${keyRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Based on the product name and URL, estimate whether this product is the correct physical match.
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
