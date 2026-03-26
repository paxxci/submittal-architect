/**
 * AI Shredder — Post-Processing Pass
 *
 * Runs AFTER the regex-based SectionShredder to validate and enrich the parse.
 * 
 * For each section, asks Gemini to:
 *   1. Confirm Part 1/2/3 boundaries are correct (fix if needed)
 *   2. Identify all product blocks within Part 2
 *   3. Tag each block as "product" or "rule" 
 *   4. Extract manufacturers listed in each block
 *   5. Extract key requirements for each product block
 *
 * This means sourcing has pre-computed data at click time — no re-parsing needed.
 */

class AIShredder {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Validate and enrich a parsed section.
     * @param {object} section - { id, title, part1, part2, part3, rawContent }
     * @returns enriched section with blocks[] added to part2
     */
    async enrichSection(section) {
        if (!this.apiKey) return section;
        if (!section.part2 || section.part2.length < 30) return section; // Nothing in Part 2 to analyze

        try {
            const result = await this._analyzeSection(section);
            return { ...section, ...result };
        } catch (err) {
            console.error(`[AIShredder] Failed to enrich section ${section.id}: ${err.message}`);
            return section; // Graceful degradation — keep original regex parse
        }
    }

    /**
     * Send the section to Gemini and get back structured block data.
     */
    async _analyzeSection(section) {
        const prompt = this._buildPrompt(section);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://submittal-architect.app',
                'X-Title': 'Submittal Architect'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert construction specification analyst. You analyze CSI MasterFormat spec sections and identify product blocks, requirements, and manufacturers with precision. You ALWAYS return valid JSON.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000
            })
        });

        if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || '';
        const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsed = JSON.parse(clean);
        return this._applyAIResult(section, parsed);
    }

    _buildPrompt(section) {
        return `Analyze this construction specification section and return structured JSON.

SECTION: ${section.id} — ${section.title}

PART 2 CONTENT (Products):
---
${section.part2 || '(empty)'}
---

PART 1 CONTENT (General):
---
${(section.part1 || '').slice(0, 800)}
---

INSTRUCTIONS:
1. Identify every logical product block in Part 2 (e.g., "2.01 WALL SWITCHES", "2.02 RECEPTACLES")
2. For each block, determine:
   - isProduct: true if it describes a physical product that needs a cut sheet, false if it's a general rule/requirement/method
   - manufacturers: array of brand names explicitly listed (e.g., ["Hubbell", "Leviton", "Pass & Seymour"]) or [] if none listed
   - keyRequirements: array of specific technical specs (voltage, amperage, NEMA rating, UL listing, mounting type, etc.) — NOT installation methods
   - summary: one sentence describing what this block is about
3. If Part 1/2/3 boundaries seem wrong (e.g., installation instructions ended up in part2), note it in partBoundariesCorrect

Respond ONLY as valid JSON in this exact format:
{
  "partBoundariesCorrect": true,
  "blocks": [
    {
      "blockTitle": "2.01 WALL SWITCHES",
      "isProduct": true,
      "manufacturers": ["Hubbell", "Leviton", "Pass & Seymour"],
      "keyRequirements": ["120V", "15 Amp", "Single Pole", "UL Listed", "NEMA WD 1"],
      "summary": "Single pole wall switches, 15A 120V, from approved manufacturers"
    }
  ]
}`;
    }

    /**
     * Apply the AI result to the section — merge blocks into metadata.
     */
    _applyAIResult(section, aiResult) {
        const enriched = { ...section };

        if (aiResult.blocks && Array.isArray(aiResult.blocks)) {
            // Attach block metadata — indexed by block title for fast lookup
            enriched.aiBlocks = aiResult.blocks;
            enriched.aiBlockMap = {};
            for (const block of aiResult.blocks) {
                // Normalize key: trim, first 80 chars (matches blockKey in FormattedSpecText)
                const key = (block.blockTitle || '').trim().slice(0, 80);
                enriched.aiBlockMap[key] = {
                    isProduct: block.isProduct !== false,
                    manufacturers: block.manufacturers || [],
                    keyRequirements: block.keyRequirements || [],
                    summary: block.summary || ''
                };
            }
        }

        if (aiResult.partBoundariesCorrect === false) {
            console.warn(`[AIShredder] Section ${section.id}: AI flagged possible part boundary issue.`);
        }

        return enriched;
    }

    /**
     * Enrich multiple sections in parallel (with concurrency limit to avoid rate limits).
     * @param {object[]} sections
     * @param {number} concurrency - max parallel AI calls
     */
    async enrichSections(sections, concurrency = 3) {
        const results = [];
        
        for (let i = 0; i < sections.length; i += concurrency) {
            const chunk = sections.slice(i, i + concurrency);
            const enriched = await Promise.all(chunk.map(s => this.enrichSection(s)));
            results.push(...enriched);
            console.log(`[AIShredder] Enriched ${Math.min(i + concurrency, sections.length)}/${sections.length} sections`);
        }

        return results;
    }
}

module.exports = AIShredder;
