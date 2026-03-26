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

    /**
     * Step 1 of Sourcing Pipeline:
     * Read a spec section and extract what products need to be sourced,
     * which manufacturers are listed, and what the key requirements are.
     * 
     * Returns: { searchQuery, productType, manufacturers, keyRequirements, isProductSection }
     */
    async extractSearchQuery(sectionTitle, specText) {
        const system = `You are an expert electrical estimator for a commercial electrical contracting company. You read construction specification sections and identify exactly what physical products need to be purchased and which manufacturers are acceptable per the spec. You understand CSI MasterFormat, electrical codes, and supply house catalogs.`;

        const user = `Read this electrical specification section and extract the product sourcing information.

SPEC SECTION: "${sectionTitle}"

SPEC TEXT:
"""
${specText.slice(0, 2500)}
"""

Rules:
- The searchQuery must be a short phrase an electrician would type into an electrical supply website
- ONLY use words that appear in the spec text or are standard electrical product names
- DO NOT add materials like "aluminum" or "steel" unless the spec explicitly mentions them
- For wiring devices (switches, receptacles, outlets), search by product type only (e.g. "wall switch", "duplex receptacle")
- Keep the searchQuery to 4-6 words maximum
- Extract ONLY manufacturers explicitly listed in the spec (from lines starting with "Manufacturers:", "Acceptable Manufacturers:", a numbered list after "manufacturers include the following", etc.)
- If no manufacturers are listed, return an empty array for manufacturers
- isProductSection is false if this block contains ONLY sizing rules, general requirements, installation methods, or code references — with NO specific physical product to purchase

Respond ONLY as valid JSON with these exact fields:
{
  "searchQuery": "short clean search term (e.g. 'EMT conduit' or 'wall switch' or 'duplex receptacle')",
  "productType": "full product name (e.g. 'Electrical Metallic Tubing (EMT)')",
  "manufacturers": ["Brand A", "Brand B"],
  "keyRequirements": ["only specific technical requirements explicitly stated in the spec, e.g. NEMA WD 1, UL listed, 20 amp"],
  "isProductSection": true
}`;

        try {
            const raw = await this._call(system, user);
            const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            let parsed = JSON.parse(clean);
            
            // Gemini sometimes returns an array — take first item
            if (Array.isArray(parsed)) {
                console.log(`[AI] Got ${parsed.length} products from spec — using first: "${parsed[0]?.productType}"`);
                parsed = parsed[0];
            }
            
            // Normalize manufacturers — clean up any empty entries
            parsed.manufacturers = (parsed.manufacturers || [])
                .map(m => m.trim())
                .filter(m => m.length > 0 && m.length < 50); // sanity check
            
            console.log(`[AI] Product type: "${parsed.productType}"`);
            console.log(`[AI] Search query: "${parsed.searchQuery}"`);
            console.log(`[AI] Manufacturers: ${parsed.manufacturers.length > 0 ? parsed.manufacturers.join(', ') : '(none listed)'}`);
            console.log(`[AI] Key requirements: ${(parsed.keyRequirements || []).join(', ')}`);
            console.log(`[AI] Is product section: ${parsed.isProductSection}`);
            return parsed;
        } catch (err) {
            console.error('[AI] extractSearchQuery failed:', err.message);
            const fallback = sectionTitle.replace(/^\d[\d\s]+[-–]\s*/, '').slice(0, 60);
            return { searchQuery: fallback, productType: sectionTitle, manufacturers: [], keyRequirements: [], isProductSection: true };
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

        const system = `You are an expert electrical estimator verifying that products from a vendor catalog meet construction specification requirements. You are precise, conservative, and only confirm a match when the product clearly satisfies a requirement based on its title or description.`;

        const candidateList = candidates
            .map((c, i) => `[${i}] Title: "${c.title}"${c.description ? `\n    Description: "${c.description}"` : ''}`)
            .join('\n');

        const user = `I need to find the best product for this specification block.

SPEC BLOCK: "${blockTitle}"

KEY REQUIREMENTS FROM SPEC:
${keyRequirements.length > 0 ? keyRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n') : '(none specified)'}

APPROVED MANUFACTURERS (from spec):
${approvedManufacturers.length > 0 ? approvedManufacturers.join(', ') : '(any brand acceptable)'}

VENDOR SEARCH RESULTS:
${candidateList}

Instructions:
- Score each candidate against the key requirements
- A requirement is "matched" only if the product title or description clearly satisfies it
- Prefer products from approved manufacturers if listed (but don't auto-reject if no approved list)
- If multiple candidates are similar quality, prefer the one from an approved manufacturer
- confidence is a 0.0–1.0 score: 1.0 = all requirements satisfied, 0.0 = nothing matches
- If the best confidence is below 0.5, selectedIndex should still be the best available but flag it

Respond ONLY as valid JSON:
{
  "selectedIndex": 0,
  "confidence": 0.85,
  "matchedRequirements": ["requirement that was satisfied"],
  "unmatchedRequirements": ["requirement not found in product info"],
  "reason": "brief explanation of why this product was selected"
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
