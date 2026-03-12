const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PDFDocument, rgb } = require('pdf-lib');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

// Set worker src for pdfjs (required in Node environment)
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

/**
 * Highlighter Engine
 * 
 * Handles downloading cutsheets and programmatically annotating them.
 */
class HighlighterEngine {
    constructor() {
        this.projectRoot = path.join(__dirname, '../../');
        this.downloadDir = path.join(this.projectRoot, 'storage/cutsheets');
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
    }

    /**
     * Downloads a PDF from a URL.
     */
    async download(url, filename) {
        const dest = path.join(this.downloadDir, filename);
        console.log(`Downloading PDF from: ${url}`);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(dest));
            writer.on('error', reject);
        });
    }

    /**
     * Finds text coordinates on a PDF page using pdfjs-dist.
     * @returns {Array} - Array of match objects { pageIndex, x, y, width, height }
     */
    async findCoordinates(pdfPath, searchText) {
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        const matches = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            for (const item of textContent.items) {
                if (item.str.toLowerCase().includes(searchText.toLowerCase())) {
                    // pdfjs transform: [scaleX, skewY, skewX, scaleY, translateX, translateY]
                    const transform = item.transform;
                    matches.push({
                        pageIndex: i - 1,
                        x: transform[4],
                        y: transform[5],
                        width: item.width,
                        height: item.height,
                        pageHeight: viewport.height
                    });
                }
            }
        }
        return matches;
    }

    /**
     * Annotates a PDF by drawing a red box around matched coordinates.
     */
    async annotate(pdfPath, matches, outputName) {
        const existingPdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();

        for (const match of matches) {
            const page = pages[match.pageIndex];

            // Draw a red rectangle (border only)
            page.drawRectangle({
                x: match.x - 2,
                y: match.y - 2,
                width: match.width + 4,
                height: match.height + 4,
                borderColor: rgb(1, 0, 0),
                borderWidth: 2,
            });
        }

        const pdfBytes = await pdfDoc.save();
        const outputPath = path.join(this.downloadDir, outputName);
        fs.writeFileSync(outputPath, pdfBytes);
        return outputPath;
    }
}

module.exports = HighlighterEngine;
