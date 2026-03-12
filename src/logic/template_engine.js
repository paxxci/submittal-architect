const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * Template Engine
 * 
 * Handles overlaying dynamic project data onto existing company cover sheet templates.
 */
class TemplateEngine {
    constructor() {
        this.projectRoot = path.join(__dirname, '../../');
        this.templateDir = path.join(this.projectRoot, 'storage/templates');
        this.outputDir = path.join(this.projectRoot, 'storage/generated_packages');

        if (!fs.existsSync(this.templateDir)) fs.mkdirSync(this.templateDir, { recursive: true });
        if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    }

    /**
     * Generates a branded cover sheet for a specific submittal.
     * @param {string} templateName - The filename of the base template.
     * @param {Object} data - The project/PM data to overlay.
     */
    async generateCoverSheet(templateName, data, outputName) {
        const templatePath = path.join(this.templateDir, templateName);
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templateName}`);
        }

        const existingPdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { height } = firstPage.getSize();

        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // This is a simplified overlay logic. 
        // In the real UI, we would let the user "map" these fields.
        const drawText = (text, x, y, size = 12) => {
            firstPage.drawText(text, {
                x,
                y: height - y, // Invert Y because pdf-lib starts from bottom
                size,
                font,
                color: rgb(0, 0, 0),
            });
        };

        // Example field mapping
        console.log(`Generating cover sheet for: ${data.projectName}`);
        if (data.projectName) drawText(`${data.projectName}`, 150, 150);
        if (data.specSection) drawText(`${data.specSection}`, 150, 170);
        if (data.pmName) drawText(`${data.pmName}`, 200, 190);
        if (data.pmEmail) drawText(`${data.pmEmail}`, 170, 210);
        if (data.date) drawText(`DATE: ${data.date}`, 450, 50, 10);

        const pdfBytes = await pdfDoc.save();
        const outputPath = path.join(this.outputDir, outputName);
        fs.writeFileSync(outputPath, pdfBytes);

        return outputPath;
    }
}

module.exports = TemplateEngine;
