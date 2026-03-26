const axios = require('axios');

/**
 * AI Engine — Powered by OpenRouter
 * 
 * Uses OpenRouter to access any model (Gemini, Claude, GPT-4, etc.)
 * through a single API endpoint.
 * 
 * Responsibilities:
 * 1. Read raw spec text and extract a clean, vendor-ready product search query
 * 2. Verify that a found cut sheet matches spec requirements
 */
class AIEngine {
    constructor(apiKey) {
        if (!apiKey) throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY in your .env file.');
        this.apiKey = apiKey;
        // Default model: Gemini Flash via OpenRouter (fast + cheap for this use case)
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
                temperature: 0.1, // Low temperature for consistent, factual extraction
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
     * Read a spec section and extract the exact product a purchasing team
     * would need to search for on an electrical distributor website.
     */
    async extractSearchQuery(sectionTitle, specText) {
        const system = `You are an expert electrical estimator for a commercial electrical contracting company. You read construction specification sections and identify exactly what physical products need to be purchased. You understand CSI MasterFormat, electrical codes, and supply house catalogs.`;

        const user = `Read this electrical specification section and extract the product search information.

SPEC SECTION: "${sectionTitle}"

SPEC TEXT:
"""
${specText.slice(0, 2000)}
"""

Rules:
- The searchQuery must be a short phrase an electrician would type into an electrical supply website
- ONLY use words that appear in the spec text or are standard electrical product names
- DO NOT add materials like "aluminum" or "steel" unless the spec explicitly mentions them
- For wiring devices (switches, receptacles, outlets), search by product type only (e.g. "wall switch", "duplex receptacle")
- Keep the searchQuery to 4-6 words maximum

Respond ONLY as valid JSON with these fields:
{
  "searchQuery": "short clean search term (e.g. 'EMT conduit' or 'wall switch' or 'duplex receptacle')",
  "productType": "full product name (e.g. 'Electrical Metallic Tubing (EMT)')",
  "keyRequirements": ["only specific technical requirements explicitly stated in the spec, e.g. NEMA WD 1, UL listed, 20 amp"],
  "isProductSection": true or false
}`;

        try {
            const raw = await this._call(system, user);
            const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            let parsed = JSON.parse(clean);
            
            // Gemini sometimes returns an array (one entry per product in the spec)
            // We take the first product as the primary search target for this run
            if (Array.isArray(parsed)) {
                console.log(`[AI] Got ${parsed.length} products from spec — using first: "${parsed[0]?.productType}"`);
                parsed = parsed[0];
            }
            
            console.log(`[AI] Product type: "${parsed.productType}"`);
            console.log(`[AI] Search query: "${parsed.searchQuery}"`);
            console.log(`[AI] Key requirements: ${(parsed.keyRequirements || []).join(', ')}`);
            return parsed;
        } catch (err) {
            console.error('[AI] extractSearchQuery failed:', err.message);
            // Graceful fallback: clean up the title and use it as the query
            const fallback = sectionTitle.replace(/^\d[\d\s]+[-–]\s*/, '').slice(0, 60);
            return { searchQuery: fallback, productType: sectionTitle, keyRequirements: [], isProductSection: true };
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
