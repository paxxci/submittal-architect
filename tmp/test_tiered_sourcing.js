const SourcingEngine = require('../src/logic/sourcing_engine');

async function testTieredSourcing() {
    const engine = new SourcingEngine();
    console.log("--- Starting Tiered Sourcing Verification ---");
    
    // Case 1: Vendor succeeds (Platt)
    const prefs1 = { 
        vendors: ['Platt Electric Supply'], 
        brands: ['Hubbell'] 
    };
    console.log("\n[Scenario 1: Vendor Success]");
    const res1 = await engine.tieredSource("3/4 x 8 copper ground rod", prefs1);
    console.log("Result Vendor:", res1?.vendor);
    
    // Case 2: Vendor fails (North Coast - placeholder), Pivots to Brand (Hubbell)
    const prefs2 = { 
        vendors: ['North Coast'], 
        brands: ['Hubbell'] 
    };
    console.log("\n[Scenario 2: Pivot to Brand]");
    const res2 = await engine.tieredSource("Hubbell HBL1221", prefs2);
    console.log("Result Vendor:", res2?.vendor);

    // Case 3: Both fail
    const prefs3 = {
        vendors: ['Unknown Vendor'],
        brands: ['Unknown Brand']
    };
    console.log("\n[Scenario 3: Total Failure]");
    const res3 = await engine.tieredSource("Non-existent item 99999", prefs3);
    console.log("Result found:", !!res3);

    await engine.shutdown();
}

testTieredSourcing().catch(console.error);
