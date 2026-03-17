const SourcingEngine = require('../src/logic/sourcing_engine');

async function testTieredSourcing() {
    const engine = new SourcingEngine();
    console.log("--- Refined Tiered Sourcing Verification ---\n");
    
    // Scenario 2: Pivot to Brand
    // This is the most important one: Vendor fails (North Coast is placeholder), pivots to Brand (Hubbell)
    const prefs = { 
        vendors: ['North Coast'], 
        brands: ['Hubbell'] 
    };
    
    console.log("[SCENARIO: Vendor Pivot]");
    console.log("Setting: Preferred = North Coast | Fallback = Hubbell");
    console.log("Action: Searching for Hubbell Switch which won't be indexed on North Coast placeholder...");
    
    const result = await engine.tieredSource("HBL1221", prefs);
    
    console.log("\n--- FINAL RESULT ---");
    if (result) {
        console.log(`Successfully Sourced from: ${result.vendor}`);
        console.log(`Document URL: ${result.cutsheetUrl}`);
        console.log(`Pivot Successful: ${result.vendor === 'Hubbell Wiring Device' ? 'YES' : 'NO'}`);
    } else {
        console.log("Failed to source item.");
    }

    await engine.shutdown();
}

testTieredSourcing().catch(console.error);
