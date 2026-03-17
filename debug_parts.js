const fs = require('fs');
const pdfjsLib = require('pdfjs-dist');

const PDF_PATH = process.argv[2];
if (!PDF_PATH) { console.error('Usage: node debug_parts.js <pdfPath>'); process.exit(1); }

async function inspect() {
    const data = new Uint8Array(fs.readFileSync(PDF_PATH));
    const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
    
    // Find a page with "PART 1" and dump 30 lines of context
    for (let p = 100; p <= 200; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const lines = {};
        content.items.forEach(item => {
            const y = Math.round(item.transform[5]);
            if (!lines[y]) lines[y] = [];
            lines[y].push(item);
        });
        const sortedY = Object.keys(lines).sort((a,b) => b-a);
        for (const y of sortedY) {
            const line = lines[y].sort((a,b) => a.transform[4]-b.transform[4]).map(it => it.str).join(' ').trim();
            if (/PART\s*[123]/i.test(line)) {
                console.log(`\n=== PAGE ${p} PART HEADER FOUND ===`);
                // Print 20 lines of context from this page
                sortedY.forEach(y2 => {
                    const l = lines[y2].sort((a,b)=>a.transform[4]-b.transform[4]).map(it=>it.str).join(' ').trim();
                    if (l) console.log(`[y=${y2}] "${l}"`);
                });
                break;
            }
        }
    }
}
inspect();
