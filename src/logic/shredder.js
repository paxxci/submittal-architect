/**
 * Section Shredder
 * 
 * Splits a CSI section's text into Part 1, 2, and 3.
 * Preserves all content for persistence in Supabase.
 */

class SectionShredder {
    constructor() {
        // Patterns for CSI standard sub-heads
        this.parts = {
            p1: /PART\s+1\s+-\s+GENERAL/i,
            p2: /PART\s+2\s+-\s+PRODUCTS/i,
            p3: /PART\s+3\s+-\s+EXECUTION/i
        };
    }

    /**
     * Shreds a block of section text into its constituent parts.
     * @param {string} text - The raw text of a single CSI section.
     * @returns {object} - Object containing text for part1, part2, part3.
     */
    shred(text) {
        const lines = text.split('\n');
        let currentPart = null;
        const result = {
            part1: [],
            part2: [],
            part3: []
        };

        lines.forEach(line => {
            if (this.parts.p1.test(line)) {
                currentPart = 'part1';
            } else if (this.parts.p2.test(line)) {
                currentPart = 'part2';
            } else if (this.parts.p3.test(line)) {
                currentPart = 'part3';
            } else if (currentPart) {
                result[currentPart].push(line);
            }
        });

        return {
            part1: result.part1.join('\n').trim(),
            part2: result.part2.join('\n').trim(),
            part3: result.part3.join('\n').trim()
        };
    }
}

module.exports = SectionShredder;
