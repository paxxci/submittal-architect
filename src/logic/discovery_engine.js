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
   * TIER 1: Outline Extraction
   * Extracts the embedded PDF outline (bookmarks) to map CSI sections to exact start pages.
   */
  async _extractOutline(pdfDocument) {
    const outline = await pdfDocument.getOutline();
    if (!outline) return null;

    const sections = [];
    async function processItems(items) {
      for (const item of items) {
        const m = item.title.match(/^(?:SECTION\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)/i);
        if (m) {
          let destArray = item.dest;
          if (typeof item.dest === 'string') {
            destArray = await pdfDocument.getDestination(item.dest);
          }
          
          let pageNumber = -1;
          if (destArray && destArray[0]) {
            try {
              const pageIndex = await pdfDocument.getPageIndex(destArray[0]);
              pageNumber = pageIndex + 1;
            } catch(e) {}
          }
          
          if (pageNumber > 0) {
            sections.push({
              id: m[1].replace(/\s/g, ''),
              number: m[1],
              title: item.title.replace(/^(?:SECTION\s+)?\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?\s*[-–—:\.]*\s*/i, '').trim(),
              pageNumber
            });
          }
        }
        if (item.items && item.items.length > 0) {
          await processItems(item.items);
        }
      }
    }
    await processItems(outline);
    
    // Sort sections by page number
    sections.sort((a, b) => a.pageNumber - b.pageNumber);
    return sections.length > 0 ? sections : null;
  }

  /**
   * DISCOVERY ONLY:
   * Performs Steps 1, 2, and 4 to find ALL sections in the PDF.
   * Returns metadata only (no shredded parts).
   */
  async discover(onProgress = null) {
    try {
      console.log(`[DiscoveryEngine] Discovery Start: ${this.pdfPath}`);
      const dataBuffer = new Uint8Array(fs.readFileSync(this.pdfPath));
      console.log(`[DiscoveryEngine] Buffer size: ${dataBuffer.length} bytes`);
      const pdfDocument = await pdfjsLib.getDocument({ data: dataBuffer, disableWorker: true, verbosity: 0 }).promise;
      const totalPages = pdfDocument.numPages;
      console.log(`[DiscoveryEngine] PDF loaded: ${totalPages} pages`);

      if (onProgress) onProgress({ totalPages, currentPage: 0, status: 'reading' });

      // --- TIER 1: Outline extraction ---
      const outlineSections = await this._extractOutline(pdfDocument);
      if (outlineSections) {
        console.log(`[DiscoveryEngine] TIER 1: Successfully mapped ${outlineSections.length} sections from PDF outline!`);
        return outlineSections.map(s => ({
          ...s,
          title: s.title || 'Unnamed Section',
          isElectrical: ['26','27','28'].includes(s.id.substring(0,2)),
          isTocOnly: true // Indicates it came from outline/toc, not body scan
        }));
      }

      console.log(`[DiscoveryEngine] No outline found. Falling back to Tier 3 Text Scan...`);

      // --- TIER 3: Text extraction fallback ---
      const allLines = [];
      for (let i = 1; i <= totalPages; i++) {
        if (onProgress) onProgress({ totalPages, currentPage: Math.round(i * 0.9), status: 'reading' });
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageHeight = page.view[3] || 792;
        const topMargin = pageHeight - 85;
        const bottomMargin = 55;
        
        const yMap = {};
        textContent.items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (y > topMargin || y < bottomMargin) return; // Skip headers/footers
          if (!yMap[y]) yMap[y] = [];
          yMap[y].push(item);
        });

        Object.keys(yMap)
          .sort((a, b) => b - a)
          .forEach(y => {
            const text = yMap[y]
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map(it => it.str)
              .join(' ')
              .trim();
            if (text.length > 1) allLines.push({ page: i, text });
          });
      }
      console.log(`[DiscoveryEngine] Extraction complete: ${allLines.length} lines`);

      const CSI_BODY_PATTERN = /^(?:SECTION\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)\s*$/i;
      const CSI_BODY_WITH_TITLE = /^(?:SECTION\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)\s*[-–—]\s*(.+)$/i;
      const isTocLine = (text) => /\.{3,}/.test(text) || /\s\d{1,4}\s*$/.test(text);
      const isRefLine = (text) => {
        const l = text.toLowerCase();
        return l.includes('refer to') || l.includes('see section') || l.includes('per section') ||
               l.includes('specified in') || l.includes('described in');
      };
      const matchBodyHeader = (text) => {
        if (isTocLine(text) || isRefLine(text)) return null;
        return text.match(CSI_BODY_PATTERN) || text.match(CSI_BODY_WITH_TITLE);
      };

      const sectionMap = new Map();
      for (let li = 0; li < allLines.length; li++) {
        const { page, text } = allLines[li];
        const headerMatch = matchBodyHeader(text);
        if (headerMatch) {
          const rawNum = headerMatch[1];
          const sectionNum = rawNum.replace(/\s/g, '');
          if (!/^\d{4,8}(\.\d{1,2})?$/.test(sectionNum)) continue;
          
          let title = (headerMatch[2] || '').trim();
          if (li + 1 < allLines.length) {
            const nextLine = allLines[li + 1].text.trim();
            if (!title && !nextLine.match(/^\d/) && nextLine.length > 3 && nextLine.length < 120) {
              title = nextLine;
              li++;
            } else if (title && !nextLine.match(/^\d/) && !nextLine.toUpperCase().startsWith('PART ') && !nextLine.toUpperCase().startsWith('SECTION ') && nextLine.length > 2 && nextLine.length < 100) {
              if (nextLine === nextLine.toUpperCase() || nextLine.startsWith('(')) {
                title += ' ' + nextLine;
                li++;
              }
            }
          }

          if (!sectionMap.has(sectionNum)) {
            sectionMap.set(sectionNum, {
              id: sectionNum,
              number: rawNum,
              title: title || 'Unnamed Section',
              isElectrical: ['26','27','28'].includes(sectionNum.substring(0,2)),
              pageNumber: page,
              isTocOnly: false
            });
          }
        }
      }

      // ToC Pass for missing sections
      const tocPattern = /(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)/g;
      for (const { page, text } of allLines) {
        if (!isTocLine(text) && !text.toLowerCase().includes('table of contents')) continue;
        let m;
        while ((m = tocPattern.exec(text)) !== null) {
          const sectionNum = m[1].replace(/\s/g, '');
          if (!/^\d{6,8}$/.test(sectionNum)) continue;
          if (!sectionMap.has(sectionNum)) {
            let title = text.substring(text.indexOf(m[1]) + m[1].length).trim();
            title = title.replace(/^[-:\s.]+/, '').replace(/\s+\d+\s*$/, '').trim();
            sectionMap.set(sectionNum, {
              id: sectionNum,
              number: m[1],
              title: title || 'Unnamed Section',
              isElectrical: ['26','27','28'].includes(sectionNum.substring(0,2)),
              pageNumber: page,
              isTocOnly: true
            });
          }
        }
      }

      return Array.from(sectionMap.values()).sort((a, b) => a.id.localeCompare(b.id));

    } catch (error) {
      console.error('[DiscoveryEngine] Discovery Error:', error);
      throw error;
    }
  }

  /**
   * FULL SCAN & SHRED:
   * can be limited to specific section IDs.
   */
  async scan(onProgress = null, limitToIds = null) {
    try {
      console.log(`[DiscoveryEngine] Scanning PDF: ${this.pdfPath}${limitToIds ? ' (Filtered)' : ''}`);
      const dataBuffer = new Uint8Array(fs.readFileSync(this.pdfPath));
      const pdfDocument = await pdfjsLib.getDocument({ data: dataBuffer, disableWorker: true, verbosity: 0 }).promise;
      const totalPages = pdfDocument.numPages;

      if (onProgress) onProgress({ totalPages, currentPage: 0, status: 'reading' });

      const allLines = [];
      for (let i = 1; i <= totalPages; i++) {
        if (onProgress) onProgress({ totalPages, currentPage: Math.round(i * 0.45), status: 'reading' });
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageHeight = page.view[3] || 792;
        const topMargin = pageHeight - 85;
        const bottomMargin = 55;
        
        const yMap = {};
        textContent.items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (y > topMargin || y < bottomMargin) return; // Skip headers/footers
          if (!yMap[y]) yMap[y] = [];
          yMap[y].push(item);
        });

        Object.keys(yMap)
          .sort((a, b) => b - a)
          .forEach(y => {
            const text = yMap[y]
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map(it => it.str)
              .join(' ')
              .trim();
            if (text.length > 1) allLines.push({ page: i, text });
          });
      }

      const CSI_BODY_PATTERN = /^(?:SECTION\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)\s*$/i;
      const CSI_BODY_WITH_TITLE = /^(?:SECTION\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)\s*[-–—]\s*(.+)$/i;
      const isTocLine = (text) => {
        if (CSI_BODY_PATTERN.test(text)) return false;
        return /\.{3,}/.test(text) || /\s\d{1,4}\s*$/.test(text);
      };
      const isRefLine = (text) => {
        const l = text.toLowerCase();
        return l.includes('refer to') || l.includes('see section') || l.includes('per section') ||
               l.includes('specified in') || l.includes('described in');
      };
      const isEndOfSection = (text) => /end\s+of\s+section/i.test(text);
      const matchBodyHeader = (text) => {
        if (isTocLine(text) || isRefLine(text)) return null;
        return text.match(CSI_BODY_PATTERN) || text.match(CSI_BODY_WITH_TITLE);
      };

      const outlineSections = await this._extractOutline(pdfDocument);
      const useOutline = outlineSections && outlineSections.length > 0;

      const shredder = new SectionShredder();
      const sectionMap = new Map();

      if (useOutline) {
        console.log(`[DiscoveryEngine] TIER 1: Using Outline Map for 100% accurate page boundaries.`);
        for (let li = 0; li < allLines.length; li++) {
          const { page, text } = allLines[li];

          let activeSectionObj = null;
          for (let i = 0; i < outlineSections.length; i++) {
            const s = outlineSections[i];
            const nextS = outlineSections[i + 1];
            if (page >= s.pageNumber && (!nextS || page < nextS.pageNumber)) {
              activeSectionObj = s;
              break;
            }
          }

          if (activeSectionObj) {
            const sectionNum = activeSectionObj.id;
            if (limitToIds && !limitToIds.includes(sectionNum)) continue;

            if (!sectionMap.has(sectionNum)) {
              sectionMap.set(sectionNum, {
                id: sectionNum,
                number: activeSectionObj.number,
                title: activeSectionObj.title,
                isElectrical: ['26', '27', '28'].includes(sectionNum.substring(0, 2)),
                pageNumber: activeSectionObj.pageNumber,
                content: []
              });
            }
            sectionMap.get(sectionNum).content.push(text);
          }
        }
      } else {
        console.log(`[DiscoveryEngine] No outline found. Falling back to Tier 3 Text Scan boundaries.`);
        let activeSection = null;
        for (let li = 0; li < allLines.length; li++) {
          const { page, text } = allLines[li];
        
        if (isEndOfSection(text)) {
          activeSection = null;
          continue;
        }

        const headerMatch = matchBodyHeader(text);
        if (headerMatch) {
          const rawNum = headerMatch[1];
          const sectionNum = rawNum.replace(/\s/g, '');

          // FILTER: If we have a selection list, skip everything else
          if (limitToIds && !limitToIds.includes(sectionNum)) {
            activeSection = null;
            continue;
          }

          if (!/^\d{4,8}(\.\d{1,2})?$/.test(sectionNum)) {
            if (activeSection) activeSection.content.push(text);
            continue;
          }

          let title = (headerMatch[2] || '').trim();
          if (li + 1 < allLines.length) {
            const nextLine = allLines[li + 1].text.trim();
            if (!title && !nextLine.match(/^\d/) && nextLine.length > 3 && nextLine.length < 120) {
              title = nextLine;
              li++;
            } else if (title && !nextLine.match(/^\d/) && !nextLine.toUpperCase().startsWith('PART ') && !nextLine.toUpperCase().startsWith('SECTION ') && nextLine.length > 2 && nextLine.length < 100) {
              if (nextLine === nextLine.toUpperCase() || nextLine.startsWith('(')) {
                title += ' ' + nextLine;
                li++;
              }
            }
          }

          if (sectionMap.has(sectionNum)) {
            activeSection = sectionMap.get(sectionNum);
          } else {
            const newSection = {
              id: sectionNum,
              number: rawNum,
              title: title || 'Unnamed Section',
              isElectrical: ['26','27','28'].includes(sectionNum.substring(0,2)),
              pageNumber: page,
              content: [text]
            };
            sectionMap.set(sectionNum, newSection);
            activeSection = newSection;
          }
          continue;
        }

          if (activeSection) {
            activeSection.content.push(text);
          }
        }
      }

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

      return this.sections;

    } catch (error) {
      console.error('[DiscoveryEngine] Scan Error:', error);
      throw error;
    }
  }
}

module.exports = DiscoveryEngine;
