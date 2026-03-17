const axios = require('axios');

async function triggerGrandShred() {
    console.log("🚀 Initiating Grand Shred Stress Test...");
    console.log("PDF: JCMUPRC BID SET SPEC 10.11.24.pdf (878 Pages)");
    
    const startTime = Date.now();
    try {
        const response = await axios.get('http://localhost:3001/api/shred', {
            params: { projectId: '00000000-0000-0000-0000-000000000000' }, // Use a valid UUID format for testing (it will fail the foreign key if not real, but I'll see the error)
            timeout: 600000 // 10 minutes
        });
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Success! Processed ${response.data.count} sections in ${duration}s.`);
    } catch (error) {
        console.error("❌ Shred Failed:", error.response ? error.response.data : error.message);
    }
}

// I need to create a dummy project first to satisfy the FK
const supabase = require('../src/supabase_client');
async function run() {
    const { data: project } = await supabase.from('projects').insert([{ name: 'Stress Test Project' }]).select().single();
    if (project) {
        console.log(`Created dummy project: ${project.id}`);
        const response = await axios.get('http://localhost:3001/api/shred', {
            params: { projectId: project.id },
            timeout: 600000
        });
        console.log(`✅ Success! Processed ${response.data.count} sections.`);
    }
}

run().catch(console.error);
