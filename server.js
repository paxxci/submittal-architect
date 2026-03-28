require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const DiscoveryEngine = require('./src/logic/discovery_engine');
const AIShredder = require('./src/logic/ai_shredder');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve the Vite-built frontend
const FRONTEND_DIST = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
    // Ensure the browser *never* caches the frontend files during development
    app.use(express.static(FRONTEND_DIST, {
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }));
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
                    if (div === 0 || div > 49) return false;
                    if ((s.rawContent || '').length < 50) return false;
                    return true;
                });

                console.log(`[API] After filtering: ${validSections.length} valid sections (from ${sections.length} raw)`);

                // ── AI Enrichment Pass ──
                // Run AI shredder on electrical sections to pre-compute block metadata.
                // Non-electrical sections skip this to save tokens (they're informational only).
                let enrichedSections = validSections;
                if (process.env.OPENROUTER_API_KEY) {
                    jobs[jobId].status = 'ai_enriching';
                    const electricalSections = validSections.filter(s => s.isElectrical && s.part2 && s.part2.length > 30);
                    const nonElectrical = validSections.filter(s => !s.isElectrical || !s.part2 || s.part2.length <= 30);

                    console.log(`[API] AI Shredder: enriching ${electricalSections.length} electrical sections...`);
                    const aiShredder = new AIShredder(process.env.OPENROUTER_API_KEY);
                    const enriched = await aiShredder.enrichSections(electricalSections, 3);

                    enrichedSections = [...enriched, ...nonElectrical];
                    console.log(`[API] AI Shredder complete.`);
                } else {
                    console.warn('[API] No OPENROUTER_API_KEY — skipping AI enrichment pass.');
                }

                const records = enrichedSections.map(s => ({
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
                    confidence_score: s.isElectrical ? 0.95 : 0.60,
                    ai_blocks: s.aiBlocks ? JSON.stringify(s.aiBlocks) : null
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
const AIEngine = require('./src/logic/ai_engine');
const HighlighterEngine = require('./src/logic/highlighter_engine');

app.get('/api/source', async (req, res) => {
    const { query, sectionTitle, specText, prefs, aiBlockData } = req.query;
    console.log(`\n--- [API] Sourcing Request ---`);
    console.log(`Block: "${sectionTitle || query}"`);

    const CONFIDENCE_MIN = 0.6;

    try {
        const preferences = prefs ? JSON.parse(prefs) : { vendors: ['Platt'], brands: ['Hubbell'] };

        // ── STEP 1: Get block info — use pre-computed data if available, else call AI ──
        let productTasks = [];
        const ai = process.env.OPENROUTER_API_KEY ? new AIEngine(process.env.OPENROUTER_API_KEY) : null;

        if (aiBlockData) {
            // Already parsed at shred-time
            const parsed = JSON.parse(aiBlockData);
            if (parsed.isProduct === false) {
                return res.json({ success: false, reason: 'no_product', message: 'Not a product block.' });
            }
            productTasks = [{
                searchQuery: (parsed.manufacturers?.[0] ? parsed.manufacturers[0] + ' ' : '') + (parsed.summary || query),
                productType: parsed.productType || query,
                manufacturers: parsed.manufacturers || [],
                keyRequirements: parsed.keyRequirements || []
            }];
        } else if (ai) {
            console.log('[AI] Extracting multiple product tasks from spec block...');
            productTasks = await ai.extractSearchQueries(sectionTitle || query, specText || query);
        } else {
            // No AI — generic fallback
            productTasks = [{ searchQuery: query, productType: sectionTitle || query, manufacturers: [], keyRequirements: [] }];
        }

        const engine = new SourcingEngine();
        const finalResults = [];

        // ── STEP 2: Process each identified product task ──
        for (const task of productTasks) {
            console.log(`\n[Sourcing Task] "${task.productType}" | Query: "${task.searchQuery}"`);
            let selectedResult = null;
            let complianceScore = null;

            // Tier 1: Platt
            const plattCandidates = await engine.getPlattCandidates(task.searchQuery);
            if (plattCandidates.length > 0) {
                complianceScore = await ai.selectBestProduct(plattCandidates, task.productType, task.keyRequirements, task.manufacturers);
                if (complianceScore && complianceScore.confidence >= CONFIDENCE_MIN) {
                    const winner = plattCandidates[complianceScore.selectedIndex];
                    const pdp = await engine.getPlattPDP(winner.href, task.searchQuery);
                    if (pdp?.cutsheetUrl) selectedResult = pdp;
                }
            }

            // Tier 2: North Coast
            if (!selectedResult) {
                const ncCandidates = await engine.getNorthCoastCandidates(task.searchQuery);
                if (ncCandidates.length > 0) {
                    const ncScore = await ai.selectBestProduct(ncCandidates, task.productType, task.keyRequirements, task.manufacturers);
                    if (ncScore && ncScore.confidence >= CONFIDENCE_MIN) {
                        const winner = ncCandidates[ncScore.selectedIndex];
                        const pdp = await engine.getNorthCoastPDP(winner.href);
                        if (pdp?.cutsheetUrl) {
                            selectedResult = pdp;
                            complianceScore = ncScore;
                        }
                    }
                }
            }

            // Tier 3: Manufacturer Direct
            if (!selectedResult && task.manufacturers?.length > 0) {
                for (const brand of task.manufacturers) {
                    const mfgResult = await engine.sourceFromManufacturerDirect(brand, task.searchQuery);
                    if (mfgResult?.cutsheetUrl) {
                        selectedResult = mfgResult;
                        complianceScore = complianceScore || { confidence: 0.65, reason: `Direct from ${brand}`, matchedRequirements: [] };
                        break;
                    }
                }
            }

            if (selectedResult) {
                selectedResult.productType = task.productType;
                selectedResult.complianceScore = complianceScore?.confidence;
                selectedResult.complianceReason = complianceScore?.reason;
                selectedResult.matchedRequirements = complianceScore?.matchedRequirements || [];
                selectedResult.keyRequirements = task.keyRequirements;
                
                // Highlight extraction (simplified for multi-run)
                if (selectedResult.cutsheetUrl && selectedResult.matchedRequirements.length > 0) {
                    try {
                        const hEngine = new HighlighterEngine();
                        const pdfPath = await hEngine.download(selectedResult.cutsheetUrl, `tmp_${Date.now()}.pdf`);
                        const highlights = {};
                        for (const req of selectedResult.matchedRequirements.slice(0, 3)) { // Limit to 3 for speed
                            const coords = await hEngine.findCoordinates(pdfPath, req);
                            if (coords) highlights[req] = coords;
                        }
                        selectedResult.highlights = highlights;
                        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                    } catch (e) {}
                }
                finalResults.push(selectedResult);
            }
        }

        await engine.shutdown();

        if (finalResults.length > 0) {
            console.log(`\n[Sourcing] ✅ Found ${finalResults.length} items for this block.`);
            return res.json({ success: true, results: finalResults });
        }

        return res.json({ success: false, reason: 'no_match', message: 'No compliant products found.' });

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
