/**
 * Knowledge Bridge
 * 
 * The "IQ" layer of Submittal Architect.
 * Translates technical sentences into structured requirement objects.
 * Uses Part 1/3 for application context.
 */

class KnowledgeBridge {
    constructor() {
        this.requirements = [];
    }

    /**
     * Translates a Part 2 text block into a list of required products.
     * @param {object} section - The shredded section object (id, title, part1, part2, part3).
     * @returns {Array} - List of extracted requirement objects.
     */
    async bridge(section) {
        const { part1, part2, part3 } = section;
        const extracted = [];

        // 1. Context Extraction (Part 1/3)
        const isCorrosive = /corrosive|salt|acid|chemical/i.test(part1 + part3);
        const isOutdoor = /outdoor|exterior|weatherproof|nema 3r/i.test(part1 + part3);

        // 2. Product Extraction (Part 2)
        // Simple line-by-line parsing for Phase 1
        // Future: LLM-based extraction for 100% precision
        const lines = part2.split('\n');
        let currentItem = null;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Look for Category Headers (2.01, 2.02, etc)
            const subTitleMatch = /^(\d+\.\d+)\s+(.*)/.exec(trimmed);
            // Look for Requirements (A., B., C.)
            const itemMatch = /^[A-Z]\.\s+(.*)/i.exec(trimmed);

            if (subTitleMatch) {
                currentItem = {
                    category: subTitleMatch[2],
                    description: subTitleMatch[2],
                    requirements: [],
                    traits: [],
                    context: { isCorrosive, isOutdoor }
                };
                extracted.push(currentItem);
            } else if (itemMatch && currentItem) {
                currentItem.requirements.push(itemMatch[1]);
                currentItem.description += " " + itemMatch[1];
            } else if (currentItem) {
                // Append to the last requirement or main description
                currentItem.description += " " + trimmed;
                if (currentItem.requirements.length > 0) {
                    currentItem.requirements[currentItem.requirements.length - 1] += " " + trimmed;
                }
            }
        });

        // 3. Technical Trait Extraction
        extracted.forEach(item => {
            const desc = item.description.toUpperCase();

            // Amperage (e.g., 20A, 100 Amp)
            const ampMatch = /(\d+)\s*(AMP|A)\b/.exec(desc);
            if (ampMatch) item.traits.push({ type: 'amperage', value: ampMatch[1] });

            // Voltage (e.g., 120/208V, 480 Volt)
            const voltMatch = /(\d+(\/\d+)?)\s*(VOLT|V)\b/.exec(desc);
            if (voltMatch) item.traits.push({ type: 'voltage', value: voltMatch[0] });

            // Size/Dimension (e.g., 3/4", 8', #4) - Improved regex
            const sizes = [];
            const sizeRegex = /(\d+([\/-]\d+)?\s*("|inch|'|foot|diameter|long|#\d+))\b/gi;
            let sMatch;
            while ((sMatch = sizeRegex.exec(desc)) !== null) {
                sizes.push(sMatch[0]);
            }
            if (sizes.length > 0) item.traits.push({ type: 'dimension', value: sizes.join(', ') });

            // NEC References
            const necMatch = /NEC\s+(\d+(\.\d+)?(\([A-Z]\))?)/gi.exec(desc);
            if (necMatch) item.traits.push({ type: 'code_ref', value: necMatch[0] });
        });

        return extracted;
    }
}

module.exports = KnowledgeBridge;
