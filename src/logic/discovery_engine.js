const fs = require('fs');
const pdf = require('pdf-parse');
const SectionShredder = require('./shredder');
const ELECTRICAL_KEYWORDS = require('./keyword_map');


class DiscoveryEngine {
  constructor(pdfPath) {
    this.pdfPath = pdfPath;
    this.sections = [];
  }

  /**
   * Scans the PDF and returns a list of detected CSI sections with their starting pages.
   */
  async scan() {
    try {
      const dataBuffer = fs.readFileSync(this.pdfPath);
      // Using the standard function call for pdf-parse 1.1.1
      const data = await pdf(dataBuffer);

      const text = data.text;
      const pages = text.split(/\f/); // Split by form feed if available, or use page markers

      // CSI Section Regex: "SECTION 26 05 19" or similar
      const sectionRegex = /SECTION\s+(\d{2}\s+\d{2}\s+(\d{2}|(\d{2}\.\d{2})))/gi;

      let match;
      const results = new Map();

      // Simple scanning: search line by line or use the whole text
      // For accurate page mapping, we process page by page
      // Note: pdf-parse text doesn't always have form feeds (\f) clearly.
      // We can use the 'render_page' option if needed for better precision.

      const shredder = new SectionShredder();
      const lines = text.split('\n');
      let currentSection = null;

      lines.forEach((line, index) => {
        while ((match = sectionRegex.exec(line)) !== null) {
          const sectionNum = match[1].replace(/\s+/g, '');

          let title = line.substring(match.index + match[0].length).trim();
          if (title.length < 2 && lines[index + 1]) {
            title = lines[index + 1].trim();
          }
          title = title.replace(/\.+/g, '').trim();

          const titleUpper = title.toUpperCase();
          const isElectrical = ELECTRICAL_KEYWORDS.some(k => titleUpper.includes(k.toUpperCase())) ||
            sectionNum.startsWith('26') || sectionNum.startsWith('27') || sectionNum.startsWith('28');

          const newSection = {
            id: sectionNum,
            number: match[1],
            title: title || 'Untitled Section',
            isElectrical: isElectrical,
            startIndex: index,
            content: []
          };

          results.set(sectionNum, newSection);
          currentSection = newSection;
        }

        if (currentSection) {
          currentSection.content.push(line);
        }
      });

      // Post-process: Shred the collected content for each section
      this.sections = Array.from(results.values()).map(s => {
        const rawContent = s.content.join('\n');
        const shreds = shredder.shred(rawContent);
        return {
          id: s.id,
          number: s.number,
          title: s.title,
          isElectrical: s.isElectrical,
          rawContent: rawContent,
          ...shreds
        };
      });
      console.log(`Global Discovery complete. Found ${this.sections.length} sections.`);
      return this.sections;
    } catch (error) {
      console.error('Error during global discovery:', error);
      throw error;
    }
  }
}

module.exports = DiscoveryEngine;

