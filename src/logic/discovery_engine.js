const fs = require('fs');
const pdfjsLib = require('pdfjs-dist');
const SectionShredder = require('./shredder');
const ELECTRICAL_KEYWORDS = require('./keyword_map');

class DiscoveryEngine {
  constructor(pdfPath) {
    this.pdfPath = pdfPath;
    this.sections = [];
  }

  /**
   * ALGORITHM (as designed by the PM):
   * 1. Read all pages into memory as text lines.
   * 2. Scan for section body headers: a line that IS or begins with "SECTION XXXXXX"
   *    and is NOT a ToC entry (no trailing page number / dots).
   * 3. Collect all text from that body header until "END OF SECTION" (or next body header).
   * 4. Feed the collected content into the shredder to split Part 1 / 2 / 3.
   */
  async scan(onProgress = null) {
    try {
      console.log(`[DiscoveryEngine] Loading PDF: ${this.pdfPath}`);
      const dataBuffer = new Uint8Array(fs.readFileSync(this.pdfPath));
      const pdfDocument = await pdfjsLib.getDocument({ data: dataBuffer, disableWorker: true, verbosity: 0 }).promise;
      const totalPages = pdfDocument.numPages;
      console.log(`[DiscoveryEngine] ${totalPages} pages loaded.`);

      if (onProgress) onProgress({ totalPages, currentPage: 0, status: 'reading' });

      // ─────────────────────────────────────────────────────
      // STEP 1: Read every page into a flat array of lines
      // ─────────────────────────────────────────────────────
      const allLines = []; // { page, text }

      for (let i = 1; i <= totalPages; i++) {
        if (i % 50 === 0) console.log(`[DiscoveryEngine] Reading page ${i}/${totalPages}`);
        if (onProgress) onProgress({ totalPages, currentPage: Math.round(i * 0.5), status: 'reading' });

        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();

        // Group by Y (top-to-bottom within page)
        const yMap = {};
        textContent.items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!yMap[y]) yMap[y] = [];
          yMap[y].push(item);
        });

        Object.keys(yMap)
          .sort((a, b) => b - a) // descending Y = top-to-bottom
          .forEach(y => {
            const text = yMap[y]
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map(it => it.str)
              .join(' ')
              .trim();
            if (text.length > 1) allLines.push({ page: i, text });
          });
      }

      console.log(`[DiscoveryEngine] Total lines collected: ${allLines.length}`);

      // ─────────────────────────────────────────────────────
      // STEP 2: Find BODY section headers (not ToC entries)
      //
      // A body header looks like:
      //   "SECTION 26 05 19" or "SECTION  260519" on its OWN line
      //   It is NOT followed immediately by a page number or dots.
      // ─────────────────────────────────────────────────────

      // CSI number: two digits, optional space, two digits, optional space, two digits
      const CSI_BODY_PATTERN = /^(?:SECTION\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)\s*$/i;
      // Also catches "SECTION 26 05 19  -  TITLE" format
      const CSI_BODY_WITH_TITLE = /^(?:SECTION\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)\s*[-–—]\s*(.+)$/i;

      // ToC detection: line ends with a number, or has dots
      const isTocLine = (text) => /\.{3,}/.test(text) || /\s\d{1,4}\s*$/.test(text);
      // Reference line: cross-references, not section definitions
      const isRefLine = (text) => {
        const l = text.toLowerCase();
        return l.includes('refer to') || l.includes('see section') || l.includes('per section') ||
               l.includes('specified in') || l.includes('described in');
      };

      // END OF SECTION marker
      const isEndOfSection = (text) => /end\s+of\s+section/i.test(text);
      // Body header match
      const matchBodyHeader = (text) => {
        if (isTocLine(text) || isRefLine(text)) return null;
        return text.match(CSI_BODY_PATTERN) || text.match(CSI_BODY_WITH_TITLE);
      };

      // ─────────────────────────────────────────────────────
      // STEP 3: Linear scan — collect sections with full content
      // ─────────────────────────────────────────────────────
      const shredder = new SectionShredder();
      const sectionMap = new Map(); // sectionNum -> section object

      let activeSection = null;
      let skipUntilNextHeader = false;

      if (onProgress) onProgress({ totalPages, currentPage: Math.round(totalPages * 0.5), status: 'extracting' });

      for (let li = 0; li < allLines.length; li++) {
        const { page, text } = allLines[li];

        if (onProgress && li % 5000 === 0) {
          onProgress({ totalPages, currentPage: Math.round(50 + (li / allLines.length) * 50), status: 'extracting' });
        }

        // Check for END OF SECTION
        if (isEndOfSection(text)) {
          if (activeSection) {
            activeSection.endPage = page;
            console.log(`[DiscoveryEngine] Section ${activeSection.id} ends at page ${page}`);
          }
          activeSection = null;
          continue;
        }

        // Check for a new body section header
        const headerMatch = matchBodyHeader(text);
        if (headerMatch) {
          const rawNum = headerMatch[1];
          const sectionNum = rawNum.replace(/\s/g, '');

          // Validate CSI range — allow decimal subsections like 260533.13
          if (!/^\d{4,8}(\.\d{1,2})?$/.test(sectionNum)) {
            if (activeSection) activeSection.content.push(text);
            continue;
          }
          const div = parseInt(sectionNum.substring(0, 2));
          if (div === 0 || div > 49) {
            if (activeSection) activeSection.content.push(text);
            continue;
          }

          // Title: either from this line or the next line
          let title = (headerMatch[2] || '').trim();
          if (!title && li + 1 < allLines.length) {
            const nextLine = allLines[li + 1].text.trim();
            // Next line is the title if it's not a number/section line
            if (!nextLine.match(/^\d/) && nextLine.length > 3 && nextLine.length < 120) {
              title = nextLine;
              li++; // consume the title line
            }
          }

          const isElectrical = ['26','27','28'].includes(sectionNum.substring(0,2)) ||
            ELECTRICAL_KEYWORDS.some(k => title.toUpperCase().includes(k.toUpperCase()));

          if (sectionMap.has(sectionNum)) {
            // Already have this section — two cases:
            // A) First encounter was from ToC → upgrade it to a body section
            // B) Page footer/header repeating the section number → continue collecting into same section
            const existing = sectionMap.get(sectionNum);
            if (existing.isTocOnly) {
              existing.isTocOnly = false;
              existing.pageNumber = page;
              if (title) existing.title = title;
              activeSection = existing;
            } else {
              // Re-attach to the existing section — this handles page-level repeating
              // section footers which would otherwise cut off content collection
              activeSection = existing;
            }
          } else {
            const newSection = {
              id: sectionNum,
              number: rawNum,
              title: title || 'Unnamed Section',
              isElectrical,
              pageNumber: page,
              isTocOnly: false,
              content: [text]
            };
            sectionMap.set(sectionNum, newSection);
            activeSection = newSection;
          }
          continue;
        }

        // Collect content into the active section
        if (activeSection) {
          activeSection.content.push(text);
        }
      }

      // ─────────────────────────────────────────────────────
      // STEP 4: Also capture ToC-only sections (ones that were
      //         listed in ToC but body not found — still list them)
      // ─────────────────────────────────────────────────────
      // First pass for ToC inventory (identify sections from ToC)
      const tocPattern = /(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)/g;
      for (const { page, text } of allLines) {
        if (!isTocLine(text) && !text.toLowerCase().includes('table of contents')) continue;
        if (isRefLine(text)) continue;
        
        let m;
        while ((m = tocPattern.exec(text)) !== null) {
          const sectionNum = m[1].replace(/\s/g, '');
          if (!/^\d{6,8}$/.test(sectionNum)) continue;
          const div = parseInt(sectionNum.substring(0, 2));
          if (div === 0 || div > 49) continue;

          if (!sectionMap.has(sectionNum)) {
            // Extract title from ToC line
            let title = text.substring(text.indexOf(m[1]) + m[1].length).trim();
            title = title.replace(/^[-:\s.]+/, '').replace(/\s+\d+\s*$/, '').trim();

            const isElectrical = ['26','27','28'].includes(sectionNum.substring(0,2)) ||
              ELECTRICAL_KEYWORDS.some(k => title.toUpperCase().includes(k.toUpperCase()));

            sectionMap.set(sectionNum, {
              id: sectionNum,
              number: m[1],
              title: title || 'Unnamed Section',
              isElectrical,
              pageNumber: page,
              isTocOnly: true,
              content: []
            });
          }
        }
      }

      // ─────────────────────────────────────────────────────
      // STEP 5: Shred each section's content into Part 1/2/3
      // ─────────────────────────────────────────────────────
      console.log(`[DiscoveryEngine] Shredding ${sectionMap.size} sections...`);

      this.sections = Array.from(sectionMap.values()).map(s => {
        const rawContent = s.content.join('\n');
        const shreds = shredder.shred(rawContent);

        return {
          id: s.id,
          number: s.number,
          title: s.title,
          isElectrical: s.isElectrical,
          pageNumber: s.pageNumber,
          coordinates: {},
          rawContent,
          ...shreds
        };
      });

      console.log(`[DiscoveryEngine] Done. ${this.sections.length} sections extracted.`);
      return this.sections;

    } catch (error) {
      console.error('[DiscoveryEngine] Error during scan:', error);
      throw error;
    }
  }
}

module.exports = DiscoveryEngine;
