const path = require('path');
const HighlighterEngine = require('../src/logic/highlighter_engine');

async function test() {
    console.log('--- Submittal Architect: Highlighter Engine Test ---');
    const engine = new HighlighterEngine();

    const pdfUrl = 'https://rexel-cdn.com/products/588cgr.pdf?i=05A548B8-BBC5-4978-8F13-B4541AA2B712';
    const originalFile = 'ground_rod_original.pdf';
    const annotatedFile = 'ground_rod_annotated.pdf';

    try {
        // 1. Download
        const localPath = await engine.download(pdfUrl, originalFile);
        console.log(`✅ Downloaded to: ${localPath}`);

        // 2. Find Coordinates for "5/8" (since that's the rod we found in the last test)
        // We'll also try "3/4" to see if it's in the family table
        console.log('Searching for "5/8" and "3/4" in PDF...');
        const matches58 = await engine.findCoordinates(localPath, '5/8');
        const matches34 = await engine.findCoordinates(localPath, '3/4');

        const allMatches = [...matches58, ...matches34];
        console.log(`✅ Found ${allMatches.length} matches in the PDF.`);

        if (allMatches.length === 0) {
            console.log('❌ No matches found for highlighting.');
            return;
        }

        // 3. Annotate
        console.log('Applying Red Box annotations...');
        const outputPath = await engine.annotate(localPath, allMatches, annotatedFile);
        console.log(`✅ Annotated PDF saved to: ${outputPath}`);

        console.log('\n--- Test Successful! ---');
        console.log(`Review the result at: ${outputPath}`);

    } catch (error) {
        console.error(`❌ Highlighter Test Failed: ${error.message}`);
    }
}

test();
