const DiscoveryEngine = require('./src/logic/discovery_engine');

(async () => {
    try {
        const engine = new DiscoveryEngine('./uploads/1774907427933_26-27-28 Specs.pdf');
        const sections = await engine.discover();
        
        let div26 = sections.filter(s => s.id.startsWith('26')).length;
        let div27 = sections.filter(s => s.id.startsWith('27')).length;
        let div28 = sections.filter(s => s.id.startsWith('28')).length;
        
        console.log(`Total Found: ${sections.length}`);
        console.log(`Div 26: ${div26}`);
        console.log(`Div 27: ${div27}`);
        console.log(`Div 28: ${div28}`);
        
        // Let's print the actual 26 sections to see what it found vs what is missing.
        console.log('\nDiv 26 Sections:');
        sections.filter(s => s.id.startsWith('26')).forEach(s => console.log(s.id, s.title));

        console.log('\nScanning for raw text of "26 05 13":');
        const buffer = require('fs').readFileSync('./uploads/1774907427933_26-27-28 Specs.pdf');
        const pdfjsLib = require('pdfjs-dist');
        const pdf = await pdfjsLib.getDocument({data: new Uint8Array(buffer), disableWorker: true}).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map(it => it.str).join(' ');
            if (text.toLowerCase().includes('panelboards')) {
                console.log(`Page ${i}: ${text.substring(Math.max(0, text.toLowerCase().indexOf('panelboards') - 30), Math.min(text.length, text.toLowerCase().indexOf('panelboards') + 100))}`);
            }
        }
    } catch(err) {
        console.error(err);
    }
})();
