const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const DiscoveryEngine = require('./src/logic/discovery_engine');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve the Vite-built frontend
const FRONTEND_DIST = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
} else {
    console.warn('[Server] frontend/dist not found — run: cd frontend && npm run build');
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Multer: save uploaded PDFs to ./uploads/ with original filename
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
}});

const supabase = require('./src/supabase_client');

// Simple in-memory job tracker
const jobs = {};

// PDF Upload endpoint
app.post('/api/upload', upload.single('pdf'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No PDF file uploaded.' });
    console.log(`[API] PDF Uploaded: ${req.file.filename} (${Math.round(req.file.size / 1024)}KB)`);
    res.json({ success: true, pdfPath: req.file.path, filename: req.file.originalname });
});

app.get('/api/shred', async (req, res) => {
    const { projectId, pdfPath } = req.query;
    const jobId = `job_${Date.now()}`;
    
    console.log(`--- [API] Shredding Start | Project: ${projectId} | PDF: ${pdfPath} | Job: ${jobId} ---`);
    
    try {
        if (!projectId) throw new Error("Missing projectId in request.");
        if (!pdfPath) throw new Error("Missing pdfPath. Upload a PDF first.");
        if (!fs.existsSync(pdfPath)) throw new Error(`PDF not found at: ${pdfPath}`);

        // Clear existing sections for this project to ensure a clean start
        console.log(`[API] Cleaning previous shred data for project: ${projectId}`);
        await supabase.from('spec_sections').delete().eq('project_id', projectId);

        // Initialize job
        jobs[jobId] = { 
            status: 'processing', 
            progress: 0, 
            currentPage: 0, 
            totalPages: 0,
            startTime: Date.now() 
        };

        // Start background process
        const runShred = async () => {
            try {
                const engine = new DiscoveryEngine(pdfPath);
                const sections = await engine.scan((prog) => {
                    jobs[jobId].totalPages = prog.totalPages;
                    jobs[jobId].currentPage = prog.currentPage;
                    jobs[jobId].progress = Math.round((prog.currentPage / prog.totalPages) * 100);
                });
                
                jobs[jobId].status = 'persisting';
                console.log(`[API] Job ${jobId}: Scanned ${sections.length} sections. Saving to Supabase...`);

                // Filter false positives
                const validSections = sections.filter(s => {
                    const num = (s.id || '').replace(/\s/g,'');
                    if (num.length < 4 || num.length > 10) return false;
                    const div = parseInt(num.substring(0, 2));
                    // Reject Division 00 (procurement), reject anything > 49
                    if (div === 0 || div > 49) return false;
                    // Must have at least some content (not just a header line)
                    if ((s.rawContent || '').length < 50) return false;
                    return true;
                });

                console.log(`[API] After filtering: ${validSections.length} valid sections (from ${sections.length} raw)`);

                const records = validSections.map(s => ({
                    project_id: projectId,
                    section_id: s.id,
                    section_number: s.number,
                    title: s.title,
                    is_electrical: s.isElectrical,
                    page_number: s.pageNumber,
                    coordinates: s.coordinates,
                    part1_content: s.part1 || '',
                    part2_content: s.part2 || '',
                    part3_content: s.part3 || '',
                    raw_content: s.rawContent || '',
                    confidence_score: s.isElectrical ? 0.95 : 0.60
                }));

                const { error } = await supabase
                    .from('spec_sections')
                    .insert(records);

                if (error) throw error;

                jobs[jobId].status = 'completed';
                jobs[jobId].progress = 100;
                console.log(`[API] Job ${jobId}: Successfully persisted to Supabase.`);
            } catch (err) {
                console.error(`[API] Job ${jobId} Failed:`, err);
                jobs[jobId].status = 'failed';
                jobs[jobId].error = err.message;
            }
        };

        runShred(); // Detach and run in background

        // Return the Job ID immediately
        res.json({ success: true, jobId });

    } catch (error) {
        console.error('[API] Error starting shredding process:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/shred/status', (req, res) => {
    const { jobId } = req.query;
    const job = jobs[jobId];
    
    if (!job) {
        return res.status(404).json({ success: false, error: "Job not found" });
    }
    
    res.json({ success: true, ...job });
});

const SourcingEngine = require('./src/logic/sourcing_engine');
app.get('/api/source', async (req, res) => {
    const { query, prefs } = req.query;
    console.log(`--- [API] Sourcing Request: "${query}" ---`);
    
    try {
        const preferences = prefs ? JSON.parse(prefs) : { vendors: ['Platt'], brands: ['Hubbell'] };
        const engine = new SourcingEngine();
        const result = await engine.tieredSource(query, preferences);
        
        await engine.shutdown();
        res.json({ success: true, result });
    } catch (error) {
        console.error('[API] Sourcing Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// SPA fallback — return index.html for any non-API route (Express 5 syntax)
if (fs.existsSync(FRONTEND_DIST)) {
    app.get('/{*path}', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
        }
    });
}

app.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`🚀 Submittal Architect API Online`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`======================================\n`);
});
