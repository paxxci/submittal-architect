const SourcingEngine = require('../src/logic/sourcing_engine');

async function testSourcing() {
    const engine = new SourcingEngine();
    console.log("--- Starting Sourcing Verification ---");
    
    // Test Case: Ground Rod (Standard Platt search)
    const plattResult = await engine.sourceFromPlatt("3/4 x 8 copper ground rod");
    console.log("\n[Platt Search Results]");
    console.log(plattResult);

    if (plattResult && plattResult.cutsheetUrl) {
        console.log("SUCCESS: Found Platt Cutsheet");
    } else {
        console.log("NOTICE: Platt check failed or no PDF found (expected for some items)");
    }

    // Test Case: Hubbell Switch (Hubbell Fallback)
    const hubbellResult = await engine.sourceFromHubbell("Hubbell HBL1221");
    console.log("\n[Hubbell Fallback Results]");
    console.log(hubbellResult);

    if (hubbellResult && hubbellResult.cutsheetUrl) {
        console.log("SUCCESS: Found Hubbell Cutsheet");
    } else {
        console.log("NOTICE: Hubbell check failed or no PDF found");
    }

    await engine.shutdown();
}

testSourcing().catch(console.error);
