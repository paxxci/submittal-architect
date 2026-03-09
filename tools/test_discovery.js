const DiscoveryEngine = require('../src/logic/discovery_engine');
const path = require('path');

async function test() {
    // Path to the specific PDF on the user's desktop
    const pdfPath = 'C:\\Users\\baseb\\OneDrive\\Desktop\\n8n agent builder\\0. Electrical Specifications.pdf';

    const engine = new DiscoveryEngine(pdfPath);

    console.log('--- Submittal Architect: Discovery Test ---');
    const sections = await engine.scan();

    console.log('\n--- Detected CSI Sections ---');
    sections.forEach(s => {
        console.log(`[${s.number}] - ${s.title} (Page ~${s.pageEstimate})`);
    });

    if (sections.length === 0) {
        console.log('No sections detected. Check regex pattern or PDF text quality.');
    } else {
        console.log(`\nSuccessfully mapped ${sections.length} sections.`);
    }
}

test().catch(err => console.error(err));
