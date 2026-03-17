/**
 * Section Shredder
 * 
 * Splits a CSI section's text into Part 1, 2, and 3.
 * Preserves all content for persistence in Supabase.
 */

class SectionShredder {
    constructor() {
        // CSI spec books use many formats for part headers:
        // "PART 1 - GENERAL", "PART 1", "PART1", "1.1 GENERAL", "1.01  General Requirements"
        this.parts = {
            p1: /^\s*PART\s*1\b|^\s*1\s*[\.\-]\s*0[01]\s|^\s*1\.01\b/i,
            p2: /^\s*PART\s*2\b|^\s*2\s*[\.\-]\s*0[01]\s|^\s*2\.01\b/i,
            p3: /^\s*PART\s*3\b|^\s*3\s*[\.\-]\s*0[01]\s|^\s*3\.01\b/i,
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
            let partMatched = false;
            let headerText = '';

            if (this.parts.p1.test(line)) {
                currentPart = 'part1';
                partMatched = true;
                headerText = line.match(this.parts.p1)[0];
            } else if (this.parts.p2.test(line)) {
                currentPart = 'part2';
                partMatched = true;
                headerText = line.match(this.parts.p2)[0];
            } else if (this.parts.p3.test(line)) {
                currentPart = 'part3';
                partMatched = true;
                headerText = line.match(this.parts.p3)[0];
            }

            if (partMatched) {
                // If there's content after the header on the same line, keep it
                const restOfLine = line.substring(line.indexOf(headerText) + headerText.length).trim();
                if (restOfLine) result[currentPart].push(restOfLine);
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
