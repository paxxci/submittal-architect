const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function createPlaceholderTemplate() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Business Branding
    page.drawText('ELECTRICAL CONTRACTOR CO.', { x: 50, y: height - 50, size: 24, font, color: rgb(0.1, 0.2, 0.5) });
    page.drawRectangle({ x: 50, y: height - 60, width: 500, height: 2, color: rgb(0.1, 0.2, 0.5) });

    // Labels for the AI to fill
    page.drawText('SUBMITTAL COVER SHEET', { x: 200, y: height - 100, size: 18, font });

    const labelFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('PROJECT:', { x: 50, y: height - 150, size: 12, font: labelFont });
    page.drawText('SPEC SECTION:', { x: 50, y: height - 170, size: 12, font: labelFont });
    page.drawText('PROJECT MANAGER:', { x: 50, y: height - 190, size: 12, font: labelFont });
    page.drawText('CONTACT EMAIL:', { x: 50, y: height - 210, size: 12, font: labelFont });

    const pdfBytes = await pdfDoc.save();
    const dir = path.join(__dirname, '../storage/templates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'company_template.pdf'), pdfBytes);
    console.log('✅ Created placeholder template: storage/templates/company_template.pdf');
}

createPlaceholderTemplate();
