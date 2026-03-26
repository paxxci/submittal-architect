const DiscoveryEngine = require('./src/logic/discovery_engine');
const path = require('path');
const fs = require('fs');

// Use one of the existing PDFs for testing
const pdfPath = '/Users/michaelpaxton/.gemini/antigravity/scratch/submittal-architect/uploads/1773718991875_26-27-28 Specs.pdf';

async function runTest() {
    console.log(`--- Starting Test Shred: ${pdfPath} ---`);
    if (!fs.existsSync(pdfPath)) {
        console.error('PDF file does not exist.');
        return;
    }

    try {
        const engine = new DiscoveryEngine(pdfPath);
        const sections = await engine.scan((prog) => {
            console.log(`[Progress] ${prog.status}: ${prog.currentPage}/${prog.totalPages}`);
        });

        console.log(`\n✅ EXTRACTED ${sections.length} SECTIONS`);
        
        // Filter and display some valid ones
        const valid = sections.filter(s => s.isElectrical);
        console.log(`⚡ FOUND ${valid.length} ELECTRICAL SECTIONS`);
        
        valid.slice(0, 5).forEach(s => {
            console.log(`\n[${s.id}] ${s.title}`);
            console.log(`   Page: ${s.pageNumber}`);
            console.log(`   Part 1: ${s.part1 ? 'YES' : 'NO'} (${s.part1.length} chars)`);
            console.log(`   Part 2: ${s.part2 ? 'YES' : 'NO'} (${s.part2.length} chars)`);
            console.log(`   Part 3: ${s.part3 ? 'YES' : 'NO'} (${s.part3.length} chars)`);
        });

    } catch (error) {
        console.error('Error during test shred:', error);
    }
}

runTest();
