const TemplateEngine = require('../src/logic/template_engine');

async function test() {
    console.log('--- Submittal Architect: Template Engine Test ---');
    const engine = new TemplateEngine();

    const mockData = {
        projectName: 'Luxury High-Rise Tower A',
        specSection: '26 05 33 - Raceways and Boxes',
        pmName: 'John Doe',
        pmEmail: 'j.doe@electrical-contractor.com',
        date: new Date().toLocaleDateString()
    };

    try {
        const outputPath = await engine.generateCoverSheet('company_template.pdf', mockData, 'submittal_cover_luxury_tower.pdf');
        console.log(`✅ Cover sheet generated successfully: ${outputPath}`);
    } catch (error) {
        console.error(`❌ Template Engine Test Failed: ${error.message}`);
    }
}

test();
