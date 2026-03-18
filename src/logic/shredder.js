/**
 * Section Shredder — v2
 *
 * Splits a CSI section's raw text into Part 1, 2, and 3 using
 * a three-tier detection strategy:
 *
 *  Tier 1 — Primary:   "PART 1 - GENERAL", "PART 1 – GENERAL", "PART 2", etc.
 *  Tier 2 — Fallback:  "1.01 GENERAL", "2.01 PRODUCTS", etc. (first subsection)
 *  Tier 3 — Heuristic: Keyword density scoring on ALL-CAPS header lines
 *  Tier 4 — Graceful:  Entire content → part1 (never lose data)
 */

class SectionShredder {
  constructor() {
    // ─── Tier 1: Explicit PART X headers ───────────────────────────────────
    // Handles all common separators after the part number:
    //   hyphen (-), en dash (–), em dash (—), colon (:), period (.), space, or end of line
    // Uses positive lookahead so "PART 1" fires but "PART 10" does not.
    this.primaryHeaders = {
      p1: /^\s*PART\s*1(?=[\s\-\u2013\u2014:.\r\n]|$)/i,
      p2: /^\s*PART\s*2(?=[\s\-\u2013\u2014:.\r\n]|$)/i,
      p3: /^\s*PART\s*3(?=[\s\-\u2013\u2014:.\r\n]|$)/i,
    };

    // ─── Tier 2: First-subsection number patterns ───────────────────────────
    // "1.01 GENERAL", "1-01 GENERAL", "1.00 GENERAL"
    // Only fires for X.0X patterns — avoids false triggers on "1.5 Submittals"
    this.sectionNumHeaders = {
      p1: /^\s*1[\.\-]\s*0[01](?:\s|$)/i,
      p2: /^\s*2[\.\-]\s*0[01](?:\s|$)/i,
      p3: /^\s*3[\.\-]\s*0[01](?:\s|$)/i,
    };

    // ─── Tier 3: Keyword heuristics for orphaned content ───────────────────
    this.keywords = {
      part1: [
        'summary', 'references', 'definitions', 'submittals', 'quality assurance',
        'warranty', 'delivery', 'storage', 'coordination', 'general requirements',
        'related documents', 'scope', 'codes and standards',
      ],
      part2: [
        'manufacturers', 'products', 'materials', 'equipment', 'conductors',
        'conduit', 'fittings', 'raceways', 'wire', 'cable', 'enclosure',
        'panelboard', 'switchgear', 'circuit breaker', 'luminaires', 'fixtures',
      ],
      part3: [
        'installation', 'field quality control', 'adjusting', 'cleaning',
        'commissioning', 'testing', 'examination', 'preparation', 'execution',
        'application', 'startup', 'closeout',
      ],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: shred(text) → { part1, part2, part3 }
  // ─────────────────────────────────────────────────────────────────────────
  shred(text) {
    if (!text || text.trim().length === 0) {
      return { part1: '', part2: '', part3: '' };
    }

    const lines = text.split('\n');

    // Tier 1 — Explicit PART X headers
    let result = this._shredByPatterns(lines, this.primaryHeaders);
    if (result.part1 || result.part2 || result.part3) {
      console.log('[Shredder] Parts resolved via Tier 1 (PART X headers).');
      return result;
    }

    // Tier 2 — First-subsection number patterns
    result = this._shredByPatterns(lines, this.sectionNumHeaders);
    if (result.part1 || result.part2 || result.part3) {
      console.log('[Shredder] Parts resolved via Tier 2 (subsection numbers).');
      return result;
    }

    // Tier 3 — Keyword heuristics
    result = this._shredByKeywords(lines);
    if (result.part1 || result.part2 || result.part3) {
      console.log('[Shredder] Parts resolved via Tier 3 (keyword heuristics).');
      return result;
    }

    // Tier 4 — Graceful degradation: dump everything into part1, never lose data
    console.warn('[Shredder] No part structure detected — content placed in part1 as fallback.');
    return { part1: text.trim(), part2: '', part3: '' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Pattern-based split (Tiers 1 & 2)
  // ─────────────────────────────────────────────────────────────────────────
  _shredByPatterns(lines, patterns) {
    let currentPart = null;
    const buckets = { part1: [], part2: [], part3: [] };

    for (const line of lines) {
      let matched = null;
      if (patterns.p1.test(line)) matched = 'part1';
      else if (patterns.p2.test(line)) matched = 'part2';
      else if (patterns.p3.test(line)) matched = 'part3';

      if (matched) {
        currentPart = matched;
        // Strip the header token itself; keep any inline content after it
        const stripped = line
          .replace(/^\s*PART\s*[123]\s*[\-\u2013\u2014:.]?\s*/i, '')
          .replace(/^\s*[123][\.\-]\s*0[01]\s*/i, '')
          .trim();
        if (stripped) buckets[currentPart].push(stripped);
      } else if (currentPart) {
        buckets[currentPart].push(line);
      }
    }

    return {
      part1: buckets.part1.join('\n').trim(),
      part2: buckets.part2.join('\n').trim(),
      part3: buckets.part3.join('\n').trim(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Keyword heuristic split (Tier 3)
  // Only fires on short ALL-CAPS lines (likely section headers)
  // ─────────────────────────────────────────────────────────────────────────
  _shredByKeywords(lines) {
    let currentPart = null;
    const buckets = { part1: [], part2: [], part3: [] };

    for (const line of lines) {
      const trimmed = line.trim();
      const isShortUpperCase = trimmed.length > 2 && trimmed.length < 80 &&
                               trimmed === trimmed.toUpperCase();

      if (isShortUpperCase) {
        const lower = trimmed.toLowerCase();
        let scores = { part1: 0, part2: 0, part3: 0 };

        for (const kw of this.keywords.part1) if (lower.includes(kw)) scores.part1++;
        for (const kw of this.keywords.part2) if (lower.includes(kw)) scores.part2++;
        for (const kw of this.keywords.part3) if (lower.includes(kw)) scores.part3++;

        const max = Math.max(scores.part1, scores.part2, scores.part3);
        if (max > 0) {
          if (scores.part1 === max) currentPart = 'part1';
          else if (scores.part2 === max) currentPart = 'part2';
          else currentPart = 'part3';
        }
      }

      if (currentPart) buckets[currentPart].push(line);
    }

    return {
      part1: buckets.part1.join('\n').trim(),
      part2: buckets.part2.join('\n').trim(),
      part3: buckets.part3.join('\n').trim(),
    };
  }
}

module.exports = SectionShredder;
