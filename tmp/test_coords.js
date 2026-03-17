const fs = require('fs');
const pdfjsLib = require('pdfjs-dist');

async function testCoordinates(pdfPath) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    
    console.log(`PDF Loaded: ${pdfDocument.numPages} pages.`);
    
    // Test page 1
    const page = await pdfDocument.getPage(1);
    const textContent = await page.getTextContent();
    
    console.log("Found text items:", textContent.items.length);
    
    // Log the first few items with coordinates
    textContent.items.slice(0, 10).forEach(item => {
        console.log(`Text: "${item.str}" | Transform: [${item.transform}]`);
    });
}

testCoordinates("G:\\My Drive\\Submittal Architect\\Specs\\JCMUPRC BID SET SPEC 10.11.24.pdf")
    .catch(console.error);
