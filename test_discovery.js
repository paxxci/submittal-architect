const DiscoveryEngine = require('./src/logic/discovery_engine');
const path = require('path');

const testPdf = '/Users/michaelpaxton/.gemini/antigravity/scratch/submittal-architect/uploads/1774891212589_26-27-28 Specs.pdf';

async function test() {
  console.log('Testing Discovery on:', testPdf);
  try {
    const engine = new DiscoveryEngine(testPdf);
    console.time('discover');
    const sections = await engine.discover(p => console.log(`Progress: ${p.status} - ${p.currentPage}/${p.totalPages}`));
    console.timeEnd('discover');
    console.log('Found Sections:', sections.length);
    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
}

test();
