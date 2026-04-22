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
        if (!section.part2 || section.part2.length < 30) return section;

        try {
            const MAX_CHARS = 6000;
            if (section.part2.length <= MAX_CHARS) {
                // Short enough — send in one shot
                const result = await this._analyzeSection(section);
                return { ...section, ...result };
            }

            // Long section — chunk at natural block boundaries (lines starting with 2.XX)
            console.log(`[AIShredder] Section ${section.id} Part 2 is ${section.part2.length} chars — chunking...`);
            const lines = section.part2.split('\n');
            const chunks = [];
            let currentChunk = [];
            let currentLen = 0;

            for (const line of lines) {
                const isBlockHeader = /^\s*2\.\d{2}/.test(line);
                if (isBlockHeader && currentLen > 3000) {
                    // Start a new chunk at this block boundary
                    chunks.push(currentChunk.join('\n'));
                    currentChunk = [line];
                    currentLen = line.length;
                } else {
                    currentChunk.push(line);
                    currentLen += line.length;
                }
            }
            if (currentChunk.length > 0) chunks.push(currentChunk.join('\n'));

            console.log(`[AIShredder] Section ${section.id} split into ${chunks.length} chunks`);

            // Analyze each chunk and merge results
            const allBlocks = [];
            for (const chunk of chunks) {
                const chunkSection = { ...section, part2: chunk };
                const result = await this._analyzeSection(chunkSection);
                if (result.aiBlocks) allBlocks.push(...result.aiBlocks);
            }

            const merged = { ...section };
            merged.aiBlocks = allBlocks;
            merged.aiBlockMap = {};
            for (const block of allBlocks) {
                const key = (block.blockTitle || '').trim().slice(0, 80);
                merged.aiBlockMap[key] = {
                    isProduct: block.isProduct !== false,
                    manufacturers: block.manufacturers || [],
                    keyRequirements: block.keyRequirements || [],
                    summary: block.summary || ''
                };
            }
            return merged;

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

RAW TEXT OF ENTIRE SECTION:
---
${section.rawContent || '(empty)'}
---

INSTRUCTIONS:
1. Locate the exact, literal string in the RAW TEXT where Part 1 (General), Part 2 (Products), and Part 3 (Execution) begin. 
   - These are usually headers like "PART 1 - GENERAL", "PART 2 - PRODUCTS", "PART 3 - EXECUTION". Sometimes they are missing the word PART and just say "1.01 SUMMARY", "2.01 MATERIALS", etc.
   - You MUST return the EXACT literal string from the text (case-sensitive) so we can use string.indexOf() to split the text. If a part doesn't exist, return null.
2. Identify every logical product block in Part 2 (e.g., "2.01 WALL SWITCHES", "2.02 RECEPTACLES")
3. For each product block, determine:
   - isProduct: true if it describes a physical product that needs a cut sheet, false if it's a general rule/requirement/method
   - manufacturers: array of brand names explicitly listed (e.g., ["Hubbell", "Leviton", "Pass & Seymour"]) or [] if none listed
   - keyRequirements: array of specific technical specs (voltage, amperage, NEMA rating, UL listing, mounting type, etc.) — NOT installation methods
   - summary: one sentence describing what this block is about

Respond ONLY as valid JSON in this exact format:
{
  "boundaries": {
    "part1StartLine": "PART 1 - GENERAL",
    "part2StartLine": "PART 2 - PRODUCTS",
    "part3StartLine": "PART 3 - EXECUTION"
  },
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

        // Process Boundaries (Phase 2 Bulletproof Body Reader)
        if (aiResult.boundaries) {
            const raw = enriched.rawContent || '';
            let p1Idx = aiResult.boundaries.part1StartLine ? raw.indexOf(aiResult.boundaries.part1StartLine) : -1;
            let p2Idx = aiResult.boundaries.part2StartLine ? raw.indexOf(aiResult.boundaries.part2StartLine) : -1;
            let p3Idx = aiResult.boundaries.part3StartLine ? raw.indexOf(aiResult.boundaries.part3StartLine) : -1;

            // If indexOf fails, try to find a close match using lowercase/trim
            if (p1Idx === -1 && aiResult.boundaries.part1StartLine) p1Idx = raw.toLowerCase().indexOf(aiResult.boundaries.part1StartLine.toLowerCase().trim());
            if (p2Idx === -1 && aiResult.boundaries.part2StartLine) p2Idx = raw.toLowerCase().indexOf(aiResult.boundaries.part2StartLine.toLowerCase().trim());
            if (p3Idx === -1 && aiResult.boundaries.part3StartLine) p3Idx = raw.toLowerCase().indexOf(aiResult.boundaries.part3StartLine.toLowerCase().trim());

            // If we found valid boundaries, override the Regex SectionShredder!
            if (p1Idx !== -1 || p2Idx !== -1 || p3Idx !== -1) {
                console.log(`[AIShredder] Section ${section.id}: AI found exact boundaries. Overriding Regex.`);
                
                // Ensure indices are in order. If missing, default to end of file or previous index
                if (p1Idx === -1) p1Idx = 0;
                if (p2Idx === -1) p2Idx = p3Idx !== -1 ? p3Idx : raw.length;
                if (p3Idx === -1) p3Idx = raw.length;

                // Enforce sequential ordering to prevent negative slices
                if (p2Idx < p1Idx) p2Idx = p1Idx;
                if (p3Idx < p2Idx) p3Idx = p2Idx;

                enriched.part1 = raw.slice(p1Idx, p2Idx).trim();
                enriched.part2 = raw.slice(p2Idx, p3Idx).trim();
                enriched.part3 = raw.slice(p3Idx).trim();
            } else {
                console.warn(`[AIShredder] Section ${section.id}: AI boundaries not found in text. Falling back to Regex.`);
            }
        }

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
