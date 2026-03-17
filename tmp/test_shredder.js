const SectionShredder = require('../src/logic/shredder');

const testCases = [
    {
        name: "Standard",
        text: "PART 1 - GENERAL\nSome general info\nPART 2 - PRODUCTS\nProduct A\nProduct B\nPART 3 - EXECUTION\nInstall it"
    },
    {
        name: "Colon & No Dash",
        text: "PART 1: GENERAL\nGeneral content\nPART 2: PRODUCTS\nProduct content\nPART 3: EXECUTION\nExecution content"
    },
    {
        name: "Numbered style",
        text: "1.01 GENERAL\nInfo here\n2.01 PRODUCTS\nMaterials here\n3.01 EXECUTION\nSteps here"
    },
    {
        name: "Materials keyword",
        text: "PART 1 - GENERAL\n...\nPART 2 - MATERIALS\n...\nPART 3 - INSTALLATION\n..."
    }
];

const shredder = new SectionShredder();

testCases.forEach(tc => {
    console.log(`--- Testing: ${tc.name} ---`);
    const results = shredder.shred(tc.text);
    console.log(`Part 1 Length: ${results.part1.length}`);
    console.log(`Part 2 Length: ${results.part2.length}`);
    console.log(`Part 3 Length: ${results.part3.length}`);
    if (results.part1.length && results.part2.length && results.part3.length) {
        console.log("PASS");
    } else {
        console.log("FAIL");
    }
});
