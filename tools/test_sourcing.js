const SourcingEngine = require('../src/logic/sourcing_engine');

async function test() {
    const engine = new SourcingEngine();

    console.log('--- Submittal Architect: Sourcing Engine Test ---');
    try {
        await engine.init();

        // Test query: 3/4" x 8' copper ground rod
        // This is a standard electrical item we analyzed earlier.
        const query = '3/4 x 8 copper ground rod';
        const result = await engine.sourceFromPlatt(query);

        if (result) {
            console.log('\n✅ Sourcing Successful!');
            console.log(`Vendor: ${result.vendor}`);
            console.log(`Product: ${result.title}`);
            console.log(`SKU: ${result.sku}`);
            console.log(`Price: ${result.price}`);
            console.log(`Cutsheet URL: ${result.cutsheetUrl}`);
            console.log(`PDP URL: ${result.pdpUrl}`);
        } else {
            console.log('\n❌ Sourcing Failed: No results or error encountered.');
        }
    } catch (err) {
        console.error('\n❌ Test Error:', err.message);
    } finally {
        await engine.shutdown();
        console.log('\n--- Test Complete ---');
    }
}

test();
