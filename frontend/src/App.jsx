import React, { useState } from 'react'
import {
    LayoutDashboard, FileSearch, ClipboardCheck, 
    Settings, Bell, Search, ChevronRight, 
    MoreHorizontal, CheckCircle2, Clock, 
    ArrowUpRight, Plus, Box, ShieldCheck,
    FileText, ExternalLink, Briefcase, Building2, Trash2
} from 'lucide-react'
import { supabase } from './supabase'
import { useEffect } from 'react'
import './App.css'

const MOCK_PROJECT = {
    name: "Luxury High-Rise Tower A",
    client: "Figma - Devops", // Using the image inspiration
    progress: 60,
    daysLeft: 2,
    divisions: [
        { id: '26', title: 'Electrical', status: 'In progress', tasks: 6, completed: 4 },
        { id: '27', title: 'Communications', status: 'Pending', tasks: 4, completed: 0 },
        { id: '28', title: 'Electronic Safety', status: 'In progress', tasks: 11, completed: 2 }
    ],
    recentItems: [
        { 
            id: '260533', 
            title: 'Raceways and Boxes', 
            type: 'Spec', 
            match: 95,
            part1: "A. Related Documents\n  1. Drawings and general provisions of the Contract, including General and Supplementary Conditions, apply to this Section.\nB. Summary\n  1. Section Includes:\n    a. Copper building wire.\n    b. Connectors and splices.\n  2. Related Requirements:\n    a. Section 260533 \"Raceways and Boxes for Electrical Systems\".\nC. Action Submittals\n  1. Product Data: For each type of product.",
            part2: {
                extractedSpecs: [
                    { trait: "Enclosure Type", value: "NEMA 3R", verified: true },
                    { trait: "Listing", value: "UL Listed Components", verified: true },
                    { trait: "Requirement", value: "Grounding Straps required", verified: false }
                ],
                insight: 'The Erico 3/4" rod matches these specs exactly. Coordinate Page 1 (150, 340) verified for coating thickness.',
                rawText: "2.01 PULL AND JUNCTION BOXES\nA. Small Sheet Metal Boxes: NEMA OS 1, galvanized steel.\nB. Cast-Metal Boxes: NEMA FB 1, cast aluminum with gasketed cover.\n\n2.02 WIRING CONNECTORS\nA. Manufacturers: Subject to compliance with project requirements, manufacturers offering Products which may be incorporated in the Work include the following:\n  1. Buchanan Construction Products, Hackettstown, NJ (800) 610-5201.\n  2. Thomas and Betts, Memphis, TN (800) 695-1901.\n  3. 3M, St. Paul, MN (800) 364-3577.\nB. Compression Connectors; Conductor sizes #12 through #6 AWG:\n  1. Buchanan: 2006S or 2011S.\n  2. Thomas and Betts.\n  3. 3M."
            },
            part3: "1.01 EXPERIMENTAL\nA. Installation\n  1. Install raceways and boxes as indicated, according to manufacturer's written instructions.\n  2. Coordinate installation of enclosures with architectural features and equipment.\n1.02 FIELD QUALITY CONTROL\nA. Tests and Inspections\n  1. Perform the following tests and inspections:\n    a. Inspect installed raceways for defects.\n    b. Verify grounding connections."
        },
        { 
            id: '260519', 
            title: 'Low-Voltage Power', 
            type: 'Spec', 
            match: 100,
            part1: "A. Scope\n  1. General requirements for low-voltage power conductors and cables (600V and less).",
            part2: {
                extractedSpecs: [
                    { trait: "Conductor Material", value: "Copper", verified: true },
                    { trait: "Insulation", value: "THHN/THWN-2", verified: true }
                ],
                insight: 'Southwire Copper THHN/THWN-2 selected. Matches all local jurisdiction requirements.'
            },
            part3: "A. Quality Assurance\n  1. Install conductors and cables according to NECA 1.\n  2. Neatly train and lace wiring inside boxes."
        }
    ]
}

const MOCK_PORTFOLIO = [
    MOCK_PROJECT,
    {
        id: '2',
        name: "Memorial Hospital Wing C",
        client: "Skanska USA",
        progress: 15,
        daysLeft: 45,
        divisions: []
    },
    {
        id: '3',
        name: "Central High School Renovation",
        client: "DPR Construction",
        progress: 82,
        daysLeft: 5,
        divisions: []
    }
];

// Helper Component to Format Raw Specification Text
const FormattedSpecText = ({ text, specId, partId, completedBlocks, naBlocks, onToggleBlock, onBlockSelect, selectedBlockKey }) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = [];

    // Group lines into logical blocks based on CSI headers like "2.02" or "1.01"
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        if (/^[1-3]\.[0-9]{2}/.test(trimmed)) {
            if (currentBlock.length > 0) blocks.push(currentBlock);
            currentBlock = [line];
        } else {
            currentBlock.push(line);
        }
    });
    if (currentBlock.length > 0) blocks.push(currentBlock);

    return (
        <div className="spec-formatted-container space-y-4">
            {blocks.map((blockLines, blockIdx) => {
                const blockId = `${specId}___${partId}___${blockIdx}`;
                // Extract clean block title key (e.g. "2.05 ELECTRICAL METALLIC TUBING EMT")
                const blockTitle = blockLines[0]?.trim() || 'GENERAL SECTION';
                const blockKey = blockTitle.slice(0, 80);
                const isSelected = selectedBlockKey === blockKey;
                const isCompleted = completedBlocks?.includes(blockId);
                const isNA = naBlocks?.includes(blockId);
                const isGreen = isCompleted || isNA;
                
                return (
                    <div 
                        key={blockId} 
                        className={`spec-block prism-card transition-all p-5 relative border-l-4 ${
                            isCompleted ? 'border-l-accent-secondary border-accent-secondary/30 bg-accent-secondary/5 shadow-[0_0_20px_rgba(0,255,163,0.05)]' : 
                            isNA ? 'border-l-text-muted border-border-subtle bg-white/2 opacity-80' : 
                            isSelected ? 'border-l-accent-primary bg-accent-primary/8 shadow-[0_0_20px_rgba(255,115,0,0.15)]' :
                            'border-l-transparent hover:border-l-accent-primary/50'
                        } ${
                            isSelected && !isGreen ? 'ring-1 ring-accent-primary/40' : 
                            !isGreen ? 'hover:border-accent-primary/20 hover:translate-x-1' : ''
                        }`}
                        onClick={() => onBlockSelect && onBlockSelect({ blockKey, blockTitle, blockLines, blockIdx })}
                    >
                        <div className="mb-4">
                            {/* Group Header & Actions Together */}
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10 gap-6">
                                <div className="flex-1">
                                    {blockLines.length > 0 && /^[1-3]\.[0-9]{2}/.test(blockLines[0].trim()) ? (
                                        <div className={`indent-level-0 font-extrabold text-lg uppercase tracking-wide leading-tight ${isGreen ? 'text-accent-secondary' : 'text-accent-primary'}`}>
                                            {blockLines[0].trim()}
                                        </div>
                                    ) : (
                                        <div className="text-xs font-bold text-text-muted uppercase tracking-widest">
                                            General Section
                                        </div>
                                    )}
                                </div>
                                
                                {/* Large Clickable Action Buttons */}
                                <div className="flex items-center gap-4 shrink-0">
                                    {/* Sourcing Action */}
                                    <div className="w-[170px] flex justify-end items-center">
                                        <button 
                                            type="button"
                                            onClick={(e) => { 
                                                e.preventDefault();
                                                e.stopPropagation(); 
                                                if (!isCompleted) {
                                                    // Select this block so right column knows which cut sheet to show
                                                    onBlockSelect && onBlockSelect({ blockKey, blockTitle, blockLines, blockIdx });
                                                    window.dispatchEvent(new CustomEvent('trigger-sourcing', { 
                                                        detail: { blockId, blockKey, blockTitle, blockLines: blockLines.join('\n') } 
                                                    })); 
                                                }
                                            }}
                                            disabled={isCompleted}
                                            className={`btn-secondary !py-2.5 !px-4 !h-auto flex flex-col items-center gap-1 group/btn transition-all ${isCompleted ? 'opacity-20 cursor-not-allowed saturate-0' : 'opacity-100 shadow-[0_0_15px_rgba(255,115,0,0.3)] hover:brightness-125 hover:-translate-y-0.5'}`}
                                            title={isCompleted ? "Section already marked done." : "Initiate Vendor Search"}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Box size={16} className={!isCompleted ? "group-hover/btn:rotate-12 transition-transform text-accent-primary" : "text-text-muted"} />
                                                <span className="font-bold text-white tracking-widest text-[11px] uppercase">Find Cutsheet</span>
                                            </div>
                                            <span className="text-[9px] font-mono uppercase text-white/50">Auto-Search Vendors</span>
                                        </button>
                                    </div>

                                    {/* Vertical Divider */}
                                    <div className="w-[1px] h-12 bg-white/10 mx-2 shrink-0"></div>

                                    {/* DONE BUTTON */}
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); onToggleBlock(blockId, 'DONE'); }}
                                        className="flex flex-col items-center gap-2 cursor-pointer group px-4 py-2 rounded-xl hover:bg-white/5 transition-colors w-[90px]"
                                    >
                                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isCompleted ? 'text-accent-secondary' : 'text-text-muted group-hover:text-white'}`}>DONE</span>
                                        <div className={`w-10 h-10 shrink-0 border-2 rounded-md flex items-center justify-center transition-colors ${isCompleted ? 'bg-accent-secondary/20 border-accent-secondary shadow-[0_0_15px_rgba(0,255,163,0.3)]' : 'border-border-subtle bg-bg-deep group-hover:border-accent-secondary/50 group-hover:bg-white/5'}`}>
                                            {isCompleted && <CheckCircle2 size={24} className="text-accent-secondary drop-shadow-[0_0_5px_rgba(0,255,163,0.8)]" />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Render Body Lines */}
                            <div className="pl-1">
                                {blockLines.map((line, lineIdx) => {
                                    const trimmed = line.trim();
                                    
                                    // Skip the first line if it was already rendered as the CSI Header above
                                    if (lineIdx === 0 && /^[1-3]\.[0-9]{2}/.test(trimmed)) return null;
                                    
                                    let indentClass = "base-text";
                                    
                                    if (/^[A-Z]\./.test(trimmed)) indentClass = "indent-level-1";
                                    else if (/^[0-9]+\./.test(trimmed)) indentClass = "indent-level-2 mt-1";
                                    else if (/^[a-z]\./.test(trimmed)) indentClass = "indent-level-3";
                                    else if (/^-/.test(trimmed)) indentClass = "indent-level-4";

                                    return (
                                        <div key={lineIdx} className={indentClass}>
                                            {trimmed}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

function App() {
    const [view, setView] = useState('portfolio') // portfolio, dashboard, workbench
    const [activeProject, setActiveProject] = useState(null)
    const [selectedDivision, setSelectedDivision] = useState(null)
    const [projectData, setProjectData] = useState(null)
    const [portfolio, setPortfolio] = useState([]) // Real projects from Supabase
    const [selectedSpec, setSelectedSpec] = useState(null)
    const [selectedPart, setSelectedPart] = useState('part2') // part1, part2, part3
    const [completedBlocks, setCompletedBlocks] = useState([]) // Array of block IDs like "260533-part2-1"
    const [naBlocks, setNaBlocks] = useState([]) // Array of block IDs explicitly marked as N/A
    const [sectionResponsibility, setSectionResponsibility] = useState({}) // Mapping of specId -> 'SELF', 'VENDOR', 'NA'
    const [newVendorUrl, setNewVendorUrl] = useState('')
    const [shredJobId, setShredJobId] = useState(null)
    const [shredProgress, setShredProgress] = useState(0)
    const [shredStatusMsg, setShredStatusMsg] = useState('Initializing...')
    const [isShredding, setIsShredding] = useState(false)
    const [activeSourcingBlockId, setActiveSourcingBlockId] = useState(null)
    const [sourcingProgressPct, setSourcingProgressPct] = useState(0)
    // Tracks which Part 2 block the user has clicked — drives the right column display
    const [selectedBlock, setSelectedBlock] = useState(null) // { blockKey, blockTitle, blockLines, blockIdx }
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
    const [newProjectStep, setNewProjectStep] = useState(1)
    const [customDivisionInput, setCustomDivisionInput] = useState('')
    const [vendors, setVendors] = useState(['Platt', 'Hubbell', 'North Coast'])
    const [manufacturers, setManufacturers] = useState(['Hubbell', 'Leviton', 'Eaton'])

    // Manual section add state
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
    const [addSectionData, setAddSectionData] = useState({ sectionNumber: '', title: '', rawText: '' })
    const [addSectionSaving, setAddSectionSaving] = useState(false)

    // Inline shredder — mirrors backend shredder.js Tier 1 & 2 logic
    const shredSection = (text) => {
        const lines = text.split('\n');
        const primaryHeaders = {
            p1: /^\s*PART\s*1(?=[\s\-\u2013\u2014:.[\r\n]|$)/i,
            p2: /^\s*PART\s*2(?=[\s\-\u2013\u2014:.[\r\n]|$)/i,
            p3: /^\s*PART\s*3(?=[\s\-\u2013\u2014:.[\r\n]|$)/i,
        };
        const fallbackHeaders = {
            p1: /^\s*1[.\-]\s*0[01](?:\s|$)/i,
            p2: /^\s*2[.\-]\s*0[01](?:\s|$)/i,
            p3: /^\s*3[.\-]\s*0[01](?:\s|$)/i,
        };
        const tryShred = (patterns) => {
            let cur = null;
            const b = { part1: [], part2: [], part3: [] };
            for (const line of lines) {
                let matched = null;
                if (patterns.p1.test(line)) matched = 'part1';
                else if (patterns.p2.test(line)) matched = 'part2';
                else if (patterns.p3.test(line)) matched = 'part3';
                if (matched) {
                    cur = matched;
                    const rest = line.replace(/^\s*PART\s*[123]\s*[\-\u2013\u2014:.]?\s*/i, '')
                                     .replace(/^\s*[123][.\-]\s*0[01]\s*/i, '').trim();
                    if (rest) b[cur].push(rest);
                } else if (cur) b[cur].push(line);
            }
            return { part1: b.part1.join('\n').trim(), part2: b.part2.join('\n').trim(), part3: b.part3.join('\n').trim() };
        };
        const r1 = tryShred(primaryHeaders);
        if (r1.part1 || r1.part2 || r1.part3) return r1;
        const r2 = tryShred(fallbackHeaders);
        if (r2.part1 || r2.part2 || r2.part3) return r2;
        return { part1: text.trim(), part2: '', part3: '' }; // graceful fallback
    };

    const saveManualSection = async () => {
        if (!addSectionData.sectionNumber.trim() || !addSectionData.rawText.trim()) return;
        if (!projectData?.id) return;
        setAddSectionSaving(true);
        try {
            const sectionNum = addSectionData.sectionNumber.replace(/\s/g, '');
            const { part1, part2, part3 } = shredSection(addSectionData.rawText);
            const divPrefix = sectionNum.substring(0, 2);
            const isElectrical = ['26','27','28'].includes(divPrefix);

            const record = {
                project_id: projectData.id,
                section_id: sectionNum,
                section_number: addSectionData.sectionNumber.trim().toUpperCase(),
                title: addSectionData.title.trim().toUpperCase() || 'MANUAL ENTRY',
                is_electrical: isElectrical,
                page_number: null,
                coordinates: {},
                part1_content: part1,
                part2_content: part2,
                part3_content: part3,
                raw_content: addSectionData.rawText,
                confidence_score: 1.0 // manually added = 100% confidence
            };

            const { data, error } = await supabase.from('spec_sections').insert([record]).select();
            if (error) throw error;

            // Update local state immediately, ensuring we bind the actual database UUID to dbId
            const dbRecord = data && data[0] ? data[0] : null;
            const newItem = {
                id: addSectionData.sectionNumber.trim(),
                dbId: dbRecord ? dbRecord.id : null,
                title: record.title,
                type: 'Spec',
                match: 100,
                pageNumber: null,
                part1: part1 || 'No Part 1 content.',
                part2: { extractedSpecs: [{ trait: 'Source', value: 'Manual Entry', verified: true }], insight: 'Manually added section.', rawText: part2 || 'No Part 2 content.' },
                part3: part3 || 'No Part 3 content.'
            };

            setProjectData(prev => ({
                ...prev,
                recentItems: [...(prev.recentItems || []), newItem],
                divisions: deriveDivisions([...(prev.recentItems || []), newItem])
            }));

            setAddSectionData({ sectionNumber: '', title: '', rawText: '' });
            setIsAddSectionModalOpen(false);
        } catch (err) {
            console.error('Failed to save manual section:', err);
            alert('Error saving section: ' + err.message);
        } finally {
            setAddSectionSaving(false);
        }
    };

    // Load PORTFOLIO (all projects) from Supabase on mount
    useEffect(() => {
        const fetchProjects = async () => {
            const { data: projects, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (projects) {
                setPortfolio(projects);
            }
        };
        fetchProjects();
    }, []);

    // Load sections for a specific project when user opens it
    const loadProjectData = async (project, divisionFilter, preserveState = false) => {
        const { data: sections } = await supabase
            .from('spec_sections')
            .select('*')
            .eq('project_id', project.id);

        if (!sections) return;

        // Use saved division scope from project metadata if no explicit filter passed
        const savedDivisions = project.metadata?.selected_divisions;
        const activeFilter = divisionFilter || savedDivisions || null;

        // Apply division filter — only show what was originally scoped
        const filteredSections = activeFilter 
            ? sections.filter(s => activeFilter.some(d => s.section_number?.replace(/\s/g,'').startsWith(d)))
            : sections;

        const uiItems = mapShreddedDataToUI(filteredSections);

        const updatedData = {
            ...project,
            recentItems: uiItems,
            divisions: deriveDivisions(uiItems)
        };
        setProjectData(updatedData);
        
        // Ensure we don't snap the user's view back to the top if we are just refreshing data
        if (!preserveState) {
            setSelectedDivision(updatedData.divisions[0] || null);
            setSelectedSpec(uiItems[0] || null);
        } else if (selectedSpec) {
             // Keep current spec object updated with any new database metadata
             const refreshedSpec = uiItems.find(i => i.id === selectedSpec.id);
             if (refreshedSpec) setSelectedSpec(refreshedSpec);
        }
    };

    // Dummy useEffect kept for structure - actual loading happens via loadProjectData
    useEffect(() => {
        const fetchProjects = async () => {
            const { data: projects, error } = await supabase
                .from('projects')
                .select('*')
                .limit(1);
            // NO AUTO-LOAD: user must explicitly pick a project
            
            // NO AUTO-LOAD: user must explicitly pick a project
        };
        fetchProjects();
    }, []);

    const deriveDivisions = (items) => {
        const divisionMap = {};
        items.forEach(item => {
            const divId = item.id.substring(0, 2);
            if (!divisionMap[divId]) {
                divisionMap[divId] = {
                    id: divId,
                    title: divId === '26' ? 'Electrical' : divId === '27' ? 'Communications' : divId === '28' ? 'Electronic Safety' : `Division ${divId}`,
                    status: 'In progress',
                    tasks: 0,
                    completed: 0
                };
            }
            divisionMap[divId].tasks += 1;
        });
        return Object.values(divisionMap).sort((a, b) => a.id.localeCompare(b.id));
    };
    
    // Form state for New Project
    const [newProjectData, setNewProjectData] = useState({
        name: '',
        client: '',
        manager: '',
        fileLoaded: false,
        autoDetect: true,
        customDivisions: [],
        divisions: {
            '26': true,
            '27': true,
            '28': true
        }
    })

    // Helper to map our backend models to the UI model
    const mapShreddedDataToUI = (sections) => {
        return sections.map(s => ({
            id: s.section_number, 
            dbId: s.id,
            title: s.title,
            type: 'Spec',
            match: Math.round((s.confidence_score || 0) * 100),
            pageNumber: s.page_number,
            coordinates: s.coordinates,
            metadata: s.metadata || {},   // ← includes sourcedProduct.cutsheetUrl from Supabase
            part1: s.part1_content || "No Part 1 content found.",
            part2: {
                extractedSpecs: [
                    { trait: "Data Source", value: "Surgical Shredder v2", verified: s.confidence_score > 0.9 }
                ],
                insight: s.confidence_score > 0.9 ? "High confidence electrical section detected." : "Semantic match: Review for electrical intent.",
                rawText: s.part2_content || "No Part 2 content found."
            },
            part3: s.part3_content || "No Part 3 content found."
        }))
    }


    const runAIShredder = async () => {
        setIsNewProjectModalOpen(false) 
        setView('workbench') 
        setShredProgress(0)
        setShredStatusMsg('Creating project...')
        
        setTimeout(async () => {
            setIsShredding(true)
            try {
                // 1. Create Project in Supabase
                const { data: project, error: pError } = await supabase
                    .from('projects')
                    .insert([{ 
                        name: newProjectData.name || "Untitled Submittal",
                        description: `Client: ${newProjectData.client || 'Unknown'} | PM: ${newProjectData.manager || 'Unknown'}`
                    }])
                    .select()
                    .single();

                if (pError) throw pError;

                // Save the selected division scope to project metadata so future loads respect it
                const selectedDivisionPrefixes = [
                    ...Object.keys(newProjectData.divisions).filter(k => newProjectData.divisions[k]),
                    ...newProjectData.customDivisions
                ];
                await supabase
                    .from('projects')
                    .update({ metadata: { selected_divisions: selectedDivisionPrefixes } })
                    .eq('id', project.id);

                // 2. Trigger Shredder API Job
                if (!newProjectData.pdfPath) {
                    throw new Error('No PDF uploaded. Please go back and upload your spec book.');
                }
                const res = await fetch(`http://localhost:3001/api/shred?projectId=${project.id}&pdfPath=${encodeURIComponent(newProjectData.pdfPath)}`)
                const jobData = await res.json()
                
                if (jobData.success && jobData.jobId) {
                    setShredJobId(jobData.jobId);
                    
                    // 3. Start Polling
                    const pollInterval = setInterval(async () => {
                        try {
                            const sRes = await fetch(`http://localhost:3001/api/shred/status?jobId=${jobData.jobId}`)
                            const status = await sRes.json()
                            
                            if (!status.success) {
                                clearInterval(pollInterval);
                                setIsShredding(false);
                                return;
                            }

                            setShredProgress(status.progress || 0);
                            
                            if (status.status === 'scanning') {
                                setShredStatusMsg(`Scanning PDF: Page ${status.currentPage} of ${status.totalPages}...`);
                            } else if (status.status === 'persisting') {
                                setShredStatusMsg('Surgically extracting data & saving to Supabase...');
                                setShredProgress(95);
                            } else if (status.status === 'completed') {
                                clearInterval(pollInterval);
                                setShredStatusMsg('Finalizing workbench...');
                                setShredProgress(100);
                                
                                // Fetch and update UI
                                const { data: sections } = await supabase
                                    .from('spec_sections')
                                    .select('*')
                                    .eq('project_id', project.id);
                                    
                                // STRICT DIVISION FILTER: Only show sections from explicitly selected divisions
                                // (selectedDivisionPrefixes already computed above)

                                const filteredSections = sections.filter(s => {
                                    const num = (s.section_number || '').replace(/\s/g, '');
                                    return selectedDivisionPrefixes.some(prefix => num.startsWith(prefix));
                                });

                                const uiItems = mapShreddedDataToUI(filteredSections);
                                const newDivisions = deriveDivisions(uiItems);

                                const updatedProjectData = {
                                    id: project.id,
                                    name: project.name,
                                    client: newProjectData.client,
                                    progress: 0,
                                    daysLeft: 14,
                                    divisions: newDivisions,
                                    recentItems: uiItems
                                };

                                setProjectData(updatedProjectData);
                                setActiveProject(updatedProjectData);
                                setPortfolio(prev => [updatedProjectData, ...prev.filter(p => p.id !== project.id)]);
                                setSelectedDivision(newDivisions[0]);
                                setSelectedSpec(uiItems[0]);
                                setIsShredding(false);
                            } else if (status.status === 'failed') {
                                clearInterval(pollInterval);
                                setIsShredding(false);
                                alert(`Shredding failed: ${status.error}`);
                            }
                        } catch (pollErr) {
                            console.error("Polling error:", pollErr);
                        }
                    }, 2000);
                }
            } catch (err) {
                console.error("Failed to run shredder:", err)
                setIsShredding(false)
            }
        }, 500)
    }

    const renderNewProjectModal = () => {
        if (!isNewProjectModalOpen) return null;

        return (
            <div className="modal-overlay">
                <div className="modal-content prism-card custom-scrollbar">
                    
                    {/* Modal Header */}
                    <div className="modal-header">
                        <div>
                            <h2 style={{fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px'}}>New Submittal Project</h2>
                            <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px'}}>Step {newProjectStep} of 3</p>
                        </div>
                        <button onClick={() => setIsNewProjectModalOpen(false)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'}}>
                            <Plus style={{transform: 'rotate(45deg)'}} size={24} />
                        </button>
                    </div>

                    {/* Step 1: Details */}
                    {newProjectStep === 1 && (
                        <div className="modal-step">
                            <div className="form-group">
                                <label>Project Name</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g., Luxury High-Rise Tower A"
                                    value={newProjectData.name}
                                    onChange={(e) => setNewProjectData({...newProjectData, name: e.target.value})}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Client / GC</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="e.g., Turner Construction"
                                        value={newProjectData.client}
                                        onChange={(e) => setNewProjectData({...newProjectData, client: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Project Manager</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Name of PM"
                                        value={newProjectData.manager}
                                        onChange={(e) => setNewProjectData({...newProjectData, manager: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="btn-primary" onClick={() => setNewProjectStep(2)}>Next Step <ChevronRight size={16} style={{display: 'inline', marginLeft: '4px', verticalAlign: 'middle'}} /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Upload */}
                    {newProjectStep === 2 && (
                        <div className="modal-step">
                            <div style={{textAlign: 'center', marginBottom: '16px'}}>
                                <h3 style={{fontSize: '18px', fontWeight: 700}}>Upload Specification Book</h3>
                                <p style={{fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px'}}>Upload the combined master spec PDF for this project.</p>
                            </div>
                            
                            {/* Hidden real file input */}
                            <input 
                                type="file" 
                                id="pdf-upload-input"
                                accept=".pdf"
                                style={{display: 'none'}}
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    setNewProjectData({...newProjectData, fileLoaded: 'uploading', fileName: file.name});
                                    const formData = new FormData();
                                    formData.append('pdf', file);
                                    try {
                                        const res = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: formData });
                                        const data = await res.json();
                                        if (data.success) {
                                            setNewProjectData(prev => ({...prev, fileLoaded: true, fileName: data.filename, pdfPath: data.pdfPath}));
                                        } else {
                                            alert('Upload failed: ' + data.error);
                                            setNewProjectData(prev => ({...prev, fileLoaded: false}));
                                        }
                                    } catch(err) {
                                        alert('Upload error: ' + err.message);
                                        setNewProjectData(prev => ({...prev, fileLoaded: false}));
                                    }
                                }}
                            />

                            <div 
                                className={`upload-zone ${newProjectData.fileLoaded === true ? 'loaded' : ''}`}
                                onClick={() => document.getElementById('pdf-upload-input').click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if (!file || !file.name.endsWith('.pdf')) return alert('Please drop a PDF file.');
                                    setNewProjectData({...newProjectData, fileLoaded: 'uploading', fileName: file.name});
                                    const formData = new FormData();
                                    formData.append('pdf', file);
                                    try {
                                        const res = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: formData });
                                        const data = await res.json();
                                        if (data.success) {
                                            setNewProjectData(prev => ({...prev, fileLoaded: true, fileName: data.filename, pdfPath: data.pdfPath}));
                                        } else {
                                            alert('Upload failed: ' + data.error);
                                            setNewProjectData(prev => ({...prev, fileLoaded: false}));
                                        }
                                    } catch(err) {
                                        alert('Upload error: ' + err.message);
                                        setNewProjectData(prev => ({...prev, fileLoaded: false}));
                                    }
                                }}
                                style={{cursor: 'pointer'}}
                            >
                                {newProjectData.fileLoaded === 'uploading' ? (
                                    <>
                                        <div className="upload-icon"><Clock size={32} /></div>
                                        <h4 style={{fontWeight: 700}}>Uploading{newProjectData.fileName ? ` ${newProjectData.fileName}` : ''}...</h4>
                                        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>Please wait</p>
                                    </>
                                ) : newProjectData.fileLoaded === true ? (
                                    <>
                                        <div className="upload-icon"><CheckCircle2 size={32} /></div>
                                        <h4 style={{fontWeight: 700, color: 'var(--accent-secondary)'}}>{newProjectData.fileName}</h4>
                                        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>Uploaded & ready to shred — click to replace</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="upload-icon"><FileSearch size={32} /></div>
                                        <h4 style={{fontWeight: 700}}>Click or Drag PDF here</h4>
                                        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>Supports CSI MasterFormat PDFs up to 500MB</p>
                                    </>
                                )}
                            </div>

                            <div className="modal-actions between">
                                <button style={{fontSize: '14px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer'}} onClick={() => setNewProjectStep(1)}>Back</button>
                                <button 
                                    className="btn-primary"
                                    style={{opacity: newProjectData.fileLoaded === true ? 1 : 0.5, cursor: newProjectData.fileLoaded === true ? 'pointer' : 'not-allowed'}}
                                    onClick={() => newProjectData.fileLoaded === true && setNewProjectStep(3)}
                                    disabled={newProjectData.fileLoaded !== true}
                                >
                                    Next Step <ChevronRight size={16} style={{display: 'inline', marginLeft: '4px', verticalAlign: 'middle'}} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Divisions */}
                    {newProjectStep === 3 && (
                        <div className="modal-step">
                            <div style={{marginBottom: '16px'}}>
                                <h3 style={{fontSize: '18px', fontWeight: 700}}>Select Search Target Divisions</h3>
                                <p style={{fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px'}}>Which CSI divisions should the AI Shredder focus on extracting?</p>
                            </div>
                            
                            {/* Semantic Auto-Detect Toggle */}
                            <div 
                                className={`division-item ${newProjectData.autoDetect ? 'selected' : ''}`}
                                style={{marginBottom: '24px', background: newProjectData.autoDetect ? 'rgba(0, 255, 163, 0.05)' : 'var(--bg-deep)', borderColor: newProjectData.autoDetect ? 'var(--accent-secondary)' : 'var(--border-subtle)'}}
                                onClick={() => setNewProjectData({...newProjectData, autoDetect: !newProjectData.autoDetect})}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                    <div className="checkbox-box" style={{borderColor: newProjectData.autoDetect ? 'var(--accent-secondary)' : 'var(--text-muted)', background: newProjectData.autoDetect ? 'var(--accent-secondary)' : 'transparent', color: '#111'}}>
                                        {newProjectData.autoDetect && <CheckCircle2 size={14} />}
                                    </div>
                                    <div>
                                        <h4 style={{fontSize: '14px', fontWeight: 800, color: newProjectData.autoDetect ? 'var(--accent-secondary)' : 'white'}}>Semantic Discovery (Recommended)</h4>
                                        <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>Automatically scan unselected divisions for Electrical keywords (e.g. Div 16, Div 33, Div 40)</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{borderTop: '1px solid var(--border-subtle)', paddingTop: '24px', marginBottom: '16px'}}>
                                <h4 style={{fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '12px'}}>Target Divisions</h4>
                                {[
                                    { id: '26', title: 'Electrical' },
                                    { id: '27', title: 'Communications' },
                                    { id: '28', title: 'Electronic Safety and Security' }
                                ].map(div => (
                                    <div 
                                        key={div.id}
                                        className={`division-item ${newProjectData.divisions[div.id] ? 'selected' : ''}`}
                                        onClick={() => setNewProjectData({
                                            ...newProjectData, 
                                            divisions: {...newProjectData.divisions, [div.id]: !newProjectData.divisions[div.id]}
                                        })}
                                    >
                                        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                            <div className="checkbox-box">
                                                {newProjectData.divisions[div.id] && <CheckCircle2 size={14} />}
                                            </div>
                                            <div>
                                                <h4 style={{fontSize: '14px', fontWeight: 700}}>Division {div.id}</h4>
                                                <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>{div.title}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Custom Divisions List */}
                                {newProjectData.customDivisions.map(div => (
                                     <div 
                                        key={div}
                                        className="division-item selected"
                                        onClick={() => setNewProjectData({
                                            ...newProjectData, 
                                            customDivisions: newProjectData.customDivisions.filter(d => d !== div)
                                        })}
                                    >
                                        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                            <div className="checkbox-box" style={{background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: 'white'}}>
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <div>
                                                <h4 style={{fontSize: '14px', fontWeight: 700}}>Division {div}</h4>
                                                <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>Custom Reference</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="form-group" style={{marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px'}}>
                                <label>Add Custom Division (e.g., 40, 20)</label>
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Enter division number"
                                        value={customDivisionInput}
                                        onChange={(e) => setCustomDivisionInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && customDivisionInput.trim()) {
                                                if (!newProjectData.customDivisions.includes(customDivisionInput.trim())) {
                                                    setNewProjectData({
                                                        ...newProjectData,
                                                        customDivisions: [...newProjectData.customDivisions, customDivisionInput.trim()]
                                                    })
                                                }
                                                setCustomDivisionInput('')
                                            }
                                        }}
                                    />
                                    <button 
                                        className="btn-secondary" 
                                        style={{whiteSpace: 'nowrap'}}
                                        onClick={() => {
                                            if (customDivisionInput.trim() && !newProjectData.customDivisions.includes(customDivisionInput.trim())) {
                                                setNewProjectData({
                                                    ...newProjectData,
                                                    customDivisions: [...newProjectData.customDivisions, customDivisionInput.trim()]
                                                })
                                                setCustomDivisionInput('')
                                            }
                                        }}
                                    >
                                        Add Div
                                    </button>
                                </div>
                            </div>

                            <div className="modal-actions between">
                                <button style={{fontSize: '14px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer'}} onClick={() => setNewProjectStep(2)}>Back</button>
                                <button 
                                    className="btn-primary" 
                                    onClick={runAIShredder}
                                >
                                    <Search size={16} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}} />
                                    Start AI Shredder
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        )
    }

    const toggleBlockCompletion = async (blockId, type = 'DONE') => {
        let newCompleted = [...completedBlocks];
        let newNA = [...naBlocks];

        if (type === 'NA') {
            if (newNA.includes(blockId)) {
                newNA = newNA.filter(id => id !== blockId);
            } else {
                newNA = [...newNA, blockId];
                newCompleted = newCompleted.filter(id => id !== blockId);
            }
        } else {
            if (newCompleted.includes(blockId)) {
                newCompleted = newCompleted.filter(id => id !== blockId);
            } else {
                newCompleted = [...newCompleted, blockId];
                newNA = newNA.filter(id => id !== blockId);
            }
        }

        setCompletedBlocks(newCompleted);
        setNaBlocks(newNA);

        // Persist to Supabase if we have a valid section
        const specId = blockId.split('___')[0];
        const section = projectData.recentItems.find(s => s.id === specId);
        if (section?.dbId) {
            await supabase
                .from('spec_sections')
                .update({ 
                    metadata: { 
                        completedBlocks: newCompleted.filter(id => id.startsWith(specId)),
                        naBlocks: newNA.filter(id => id.startsWith(specId))
                    } 
                })
                .eq('id', section.dbId);
        }
    };

    const handleVendorUpload = () => {
        setIsShredding(true);
        setTimeout(() => {
            setIsShredding(false);
            alert("Vendor cutsheets uploaded and processed! Coverage verified.");
            // In real app, we'd update section status to 'COMPLETE' in Supabase here
        }, 1500);
    };

    // Live Sourcing Logic
    useEffect(() => {
        const handleTriggerSourcing = async (e) => {
            const { blockId, blockKey, blockTitle, blockLines } = e.detail;
            console.log('Sourcing for block:', blockTitle || blockId);
            
            const section = selectedSpec;
            if (!section) { console.warn('No section selected!'); return; }

            // Use the specific block's text if provided, else fall back to full Part 2
            const specTextForAI = blockLines || section.part2?.rawText || blockTitle || '';
            const fallbackQuery = (blockTitle || section.title)
                .replace(/^[1-3]\.[0-9]{2}\s*/, '')  // strip "2.05 " prefix
                .replace(/\s*\([^)]*\)/g, '')          // strip parentheticals
                .trim().slice(0, 80);

            setActiveSourcingBlockId(section.id);
            setSourcingProgressPct(0);
            
            const progressTimer = setInterval(() => {
                setSourcingProgressPct(prev => Math.min(prev + Math.floor(Math.random() * 8) + 2, 96));
            }, 1000);
            
            try {
                const prefs = JSON.stringify({ vendors, brands: manufacturers });
                const params = new URLSearchParams({
                    query: fallbackQuery,
                    sectionTitle: blockTitle || section.title,  // use the specific block title
                    specText: specTextForAI.slice(0, 3000),      // the block's own text for AI
                    prefs
                });
                const res = await fetch(`http://localhost:3001/api/source?${params.toString()}`);
                const data = await res.json();
                
                clearInterval(progressTimer);
                setSourcingProgressPct(100);
                
                if (data.success && data.result?.cutsheetUrl) {
                    // IMMEDIATELY update selectedSpec so right column shows the iframe
                    // Save at block level: metadata.sourcedBlocks[blockKey]
                    const activeBlockKey = blockKey || blockTitle || blockId;
                    setSelectedSpec(prev => ({
                        ...prev,
                        metadata: {
                            ...prev?.metadata,
                            sourcedBlocks: {
                                ...(prev?.metadata?.sourcedBlocks || {}),
                                [activeBlockKey]: data.result
                            }
                        }
                    }));

                    // Persist to Supabase in the background (non-blocking)
                    const currentMeta = section.metadata || {};
                    supabase
                        .from('spec_sections')
                        .update({ 
                            metadata: {
                                ...currentMeta,
                                sourcedBlocks: {
                                    ...(currentMeta.sourcedBlocks || {}),
                                    [activeBlockKey]: data.result
                                }
                            }
                        })
                        .eq('id', section.dbId)
                        .then(() => {
                            if (projectData) loadProjectData(projectData, null, true);
                        });

                } else if (data.reason === 'no_product') {
                    // AI flagged this block as a rule/requirement, not a product
                    setSelectedBlock(prev => prev ? { ...prev, isRule: true } : prev);
                } else {
                    const reason = data.message || `No direct PDF match found for "${blockTitle || section.title}".`;
                    alert(`Architect AI: ${reason}`);
                }
            } catch (err) {
                console.error("Sourcing failed:", err);
                clearInterval(progressTimer);
                alert(`Architect AI Error: Ensure the backend server is running.\nDetails: ${err.message}`);
            } finally {
                setTimeout(() => {
                    setActiveSourcingBlockId(null);
                }, 800);
            }
        };

        window.addEventListener('trigger-sourcing', handleTriggerSourcing);
        return () => window.removeEventListener('trigger-sourcing', handleTriggerSourcing);
    }, [vendors, manufacturers, projectData, selectedSpec, selectedDivision]);




    // Helper to calculate progress percentage for a specific spec and part
    const calculatePartProgress = (item, partKey) => {
        const text = item[partKey];
        if (!text || typeof text === 'object') {
            // Handle rawText case for part2
            if (partKey === 'part2' && item.part2?.rawText) {
                return calculateTextProgress(item.id, partKey, item.part2.rawText);
            }
            return 0;
        }
        return calculateTextProgress(item.id, partKey, text);
    };

    const calculateTextProgress = (specId, partId, text) => {
        if (!text) return 0;
        const lines = text.split('\n');
        let totalBlocks = 0;
        let isFirstLine = true;
        
        lines.forEach(line => {
            if (/^[1-3]\.[0-9]{2}/.test(line.trim())) {
                totalBlocks++;
            } else if (isFirstLine) {
                totalBlocks++; 
                isFirstLine = false;
            }
        });

        if (totalBlocks === 0) return 0;

        let completedCount = 0;
        for (let i = 0; i < totalBlocks; i++) {
            // Must match FormattedSpecText blockId format: `${specId}___${partId}___${blockIdx}`
            const bId = `${specId}___${partId}___${i}`;
            if (completedBlocks.includes(bId) || naBlocks.includes(bId)) {
                completedCount++;
            }
        }
        return Math.round((completedCount / totalBlocks) * 100);
    };

    const deleteProject = async (proj, e) => {
        e.preventDefault();
        e.stopPropagation(); // Don't open the project when clicking delete
        
        console.log("Attempting to delete project:", proj);
        if (!proj.id) {
            alert("Cannot delete this project - it does not have a valid database ID.");
            return;
        }

        try {
            // Because we added ON DELETE CASCADE to the Supabase foreign keys,
            // we only need to delete the project here, and all related spec sections will follow.
            const { data: deletedProj, error: projError } = await supabase
                .from('projects')
                .delete()
                .eq('id', proj.id)
                .select(); // Ask Supabase to return the row if it was successfully deleted
            
            if (projError) throw projError;
            
            if (!deletedProj || deletedProj.length === 0) {
                // RLS or foreign key prevented deletion, but Supabase didn't throw a hard error
                throw new Error("Supabase rejected the deletion. Make sure Row Level Security allows deletes on projects.");
            }
            
            // Successfully removed from DB, now remove from UI
            console.log("Deleted project:", deletedProj);
            setPortfolio(prev => prev.filter(p => p.id !== proj.id));
        } catch (err) {
            console.error("Delete operation failed:", err);
            alert('Failed to delete project: ' + (err.message || 'Unknown error. Check console.'));
        }
    };

    const renderPortfolio = () => (
        <div className="portfolio-root animate-fade-in p-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">My Projects</h1>
                    <p className="text-text-muted">Manage all active submittal packages across your portfolio.</p>
                </div>
                <button className="btn-primary" onClick={() => { setIsNewProjectModalOpen(true); setNewProjectStep(1); setNewProjectData({ name: '', client: '', manager: '', fileLoaded: false, autoDetect: true, customDivisions: [], divisions: { '26': true, '27': false, '28': false } }); }}>
                    <Plus size={16} className="inline mr-2" /> New Project
                </button>
            </div>

            {portfolio.length === 0 ? (
                <div className="prism-card text-center py-16">
                    <Building2 size={48} className="text-text-muted mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No Projects Yet</h3>
                    <p className="text-text-muted mb-6">Create your first submittal project to get started.</p>
                    <button className="btn-primary" onClick={() => setIsNewProjectModalOpen(true)}>
                        <Plus size={16} className="inline mr-2" /> Create First Project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {portfolio.map((proj, i) => (
                        <div 
                            key={proj.id || i} 
                            className="prism-card hover:border-accent-primary/50 cursor-pointer transition-all hover:translate-y-[-2px]"
                            onClick={() => {
                                setActiveProject(proj);
                                // Don't null-out projectData first — keep old state visible while loading
                                loadProjectData(proj, null);
                                setView('dashboard');
                            }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-bg-deep rounded-lg border border-border-subtle">
                                    <Building2 size={24} className="text-accent-secondary" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="badge badge-orange font-bold">In Progress</span>
                                    <button 
                                        onClick={(e) => deleteProject(proj, e)}
                                        title="Delete project"
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-muted)', padding: '4px', borderRadius: '6px',
                                            display: 'flex', alignItems: 'center', transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold mb-1 line-clamp-1">{proj.name}</h3>
                            <p className="text-sm text-text-muted mb-2">{proj.description || 'No description'}</p>
                            <p className="text-xs text-text-muted">{new Date(proj.created_at).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    const renderDashboard = () => {
        // Guard: projectData may still be loading — show spinner instead of crashing
        if (!projectData) return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
                <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">Loading project...</p>
            </div>
        );
        return (
        <div className="dashboard-root animate-fade-in">
            {/* Breadcrumb Header Area */}
            <div className="mb-4 px-2">
                <button 
                    onClick={() => { 
                        setView('portfolio'); 
                        setActiveProject(null); 
                        setSelectedDivision(null); 
                        setSelectedSpec(null); 
                    }} 
                    className="text-sm font-bold text-text-muted hover:text-white flex items-center gap-1 transition-colors"
                >
                    <ChevronRight size={14} className="rotate-180" /> Back to Portfolio
                </button>
            </div>
            
            <div className="hero-section prism-card">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex gap-4 items-center">
                        <div className="project-icon bg-accent-primary">
                            <Box size={24} color="white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight">{projectData.name}</h1>
                            <p className="text-text-muted text-sm">{projectData.client}</p>
                        </div>
                    </div>
                    <span className="badge badge-orange font-bold">In Progress</span>
                </div>

                <div className="progress-container mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">{projectData.progress}% complete</span>
                        <span className="text-text-muted">{projectData.daysLeft} days left</span>
                    </div>
                    <div className="progress-bar-bg h-2 rounded-full overflow-hidden">
                        <div className="progress-fill h-full bg-accent-primary glow-orange" style={{ width: `${projectData.progress}%` }}></div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="avatar-circle"></div>
                    ))}
                    <div className="avatar-count">+4</div>
                    <div className="ml-auto text-text-muted text-xs flex items-center gap-4">
                        <span className="flex items-center gap-1"><Clock size={12} /> Start: Nov 12</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} /> End: Dec 12</span>
                    </div>
                </div>
            </div>

            {/* Divisions Section */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h2 className="text-lg font-bold">Project Divisions</h2>
                    <button
                        id="add-section-btn"
                        style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        className="btn-secondary"
                        onClick={() => setIsAddSectionModalOpen(true)}
                    >
                        <Plus size={13} />
                        Add Section Manually
                    </button>
                </div>
                <div className="space-y-4">
                    {projectData.divisions && projectData.divisions.length > 0 ? projectData.divisions.map(div => (
                        <div key={div.id} className="division-row prism-card" onClick={() => { setSelectedDivision(div); setView('workbench'); }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`status-node ${div.completed === div.tasks ? 'complete' : 'in-progress'}`}>
                                        {div.completed === div.tasks ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Division {div.id} - {div.title}</h3>
                                        <p className="text-xs text-text-muted">{div.tasks} Sections Found</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <span className={`badge ${div.completed === div.tasks ? 'badge-green' : 'badge-orange'}`}>
                                            {div.completed}/{div.tasks} Ready
                                        </span>
                                    </div>
                                    <ChevronRight className="text-text-muted" size={20} />
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center border border-dashed border-border-subtle rounded-xl text-text-muted">
                            <FileSearch size={32} className="mx-auto mb-4 opacity-50" />
                            <p>No divisions processed yet. Run the AI Shredder to extract specifications.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        );
    }

    const renderSourcingSettings = () => (
        <div className="sourcing-settings animate-fade-in max-w-4xl mx-auto py-12">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-accent-primary/20 rounded-xl text-accent-primary">
                    <Search size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Sourcing Logic</h1>
                    <p className="text-text-muted">Configure the hierarchy of sites used for automated cutsheet discovery.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tier 1: Preferred Vendors */}
                <div className="prism-card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <ShoppingBag size={80} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-accent-primary text-black text-xs flex items-center justify-center font-bold">1</span>
                        Preferred Vendors
                    </h3>
                    <p className="text-sm text-text-muted mb-6">Primary search targets. The AI will check these sites first in order.</p>
                    
                    <div className="space-y-3 mb-6">
                        {vendors.map((vendor, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg group hover:border-accent-primary/30 transition-all">
                                <span className="font-medium">{vendor}</span>
                                <div className="flex gap-2">
                                    <button className="text-text-muted hover:text-white"><ArrowUp size={14} /></button>
                                    <button className="text-text-muted hover:text-white"><ArrowDown size={14} /></button>
                                    <button className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setVendors(vendors.filter((_, i) => i !== idx))}><Plus className="rotate-45" size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Add vendor site (e.g. North Coast)" 
                            className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm flex-1 outline-none focus:ring-1 focus:ring-accent-primary transition-all"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value) {
                                    setVendors([...vendors, e.target.value]);
                                    e.target.value = '';
                                }
                            }}
                        />
                        <button className="btn-secondary !py-2">Add</button>
                    </div>
                </div>

                {/* Tier 2: Brand Fallback */}
                <div className="prism-card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <ShieldCheck size={80} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-accent-secondary text-black text-xs flex items-center justify-center font-bold">2</span>
                        Brand Fallback
                    </h3>
                    <p className="text-sm text-text-muted mb-6">If vendors fail, the AI pivots to these manufacturers directly.</p>
                    
                    <div className="space-y-3 mb-6">
                        {manufacturers.map((brand, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg group hover:border-accent-secondary/30 transition-all">
                                <span className="font-medium">{brand}</span>
                                <button className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setManufacturers(manufacturers.filter((_, i) => i !== idx))}><Plus className="rotate-45" size={14} /></button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Add manufacturer (e.g. Leviton)" 
                            className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm flex-1 outline-none focus:ring-1 focus:ring-accent-secondary transition-all"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value) {
                                    setManufacturers([...manufacturers, e.target.value]);
                                    e.target.value = '';
                                }
                            }}
                        />
                        <button className="btn-secondary !py-2 !border-accent-secondary/30 hover:!bg-accent-secondary/10">Add</button>
                    </div>
                </div>
            </div>

            <div className="mt-8 prism-card bg-accent-primary/5 border border-accent-primary/20">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl bg-accent-primary/20 flex items-center justify-center shrink-0">
                        <Zap size={24} className="text-accent-primary" />
                    </div>
                    <div>
                        <h4 className="font-bold">Automated Pivot Enabled</h4>
                        <p className="text-sm text-text-muted">The Sourcing Engine will automatically move from Tier 1 to Tier 2 if no 80% confident match is found on vendor sites.</p>
                    </div>
                    <div className="ml-auto">
                        <div className="w-12 h-6 bg-accent-primary rounded-full relative cursor-pointer">
                            <div className="w-4 h-4 bg-black rounded-full absolute right-1 top-1"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderWorkbench = () => {
        if (!selectedDivision) return (
            <div className="workbench-root animate-fade-in flex items-center justify-center">
                <div className="text-center text-text-muted max-w-md w-full px-6">
                    <div className="p-10 prism-card border-dashed border-accent-primary/20 bg-accent-primary/5">
                        <FileSearch size={64} className="mx-auto mb-6 text-accent-primary animate-pulse" />
                        <h2 className="text-2xl font-black mb-3">Architect is Discovering...</h2>
                        <p className="text-sm mb-8 leading-relaxed">We are scanning the PDF meta-data and mapping sections to your workbench. This takes a moment for 900+ page documents.</p>
                        
                        {isShredding && (
                            <div className="space-y-4">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-accent-primary">
                                    <span>{shredStatusMsg}</span>
                                    <span>{shredProgress}%</span>
                                </div>
                                <div className="progress-bar-bg h-3 rounded-full overflow-hidden border border-accent-primary/20">
                                    <div 
                                        className="progress-fill h-full bg-accent-primary glow-orange transition-all duration-500" 
                                        style={{ width: `${shredProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );

        return (
        <div className="workbench-root animate-fade-in">
            <div className="workbench-header flex items-center gap-4 mb-6">
                <button className="btn-icon" onClick={() => setView('dashboard')}><LayoutDashboard size={20} /></button>
                <div>
                    <h2 className="text-xl font-extrabold">{projectData?.name}</h2>
                    <p className="text-xs text-text-muted">Division {selectedDivision?.id} - {selectedDivision?.title} Workbench</p>
                </div>
            </div>

            {/* Division Tabs */}
            <div className="flex flex-row flex-nowrap gap-3 mb-10 border-b border-border-subtle pb-6 overflow-x-auto custom-scrollbar font-mono">
                {(projectData.divisions || []).map(div => (
                    <div
                        key={div.id}
                        onClick={() => {
                            setSelectedDivision(div);
                            const firstSpecInDiv = (projectData.recentItems || []).find(item => item.id.startsWith(div.id));
                            if (firstSpecInDiv) setSelectedSpec(firstSpecInDiv);
                        }}
                        className={`item-card prism-card !w-24 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !p-2 ${
                            selectedDivision?.id === div.id 
                            ? 'active ring-2 ring-accent-primary' 
                            : 'hover:border-accent-primary/50'
                        }`}
                        title={`${div.title} (${div.tasks} items)`}
                    >
                        <h4 className="font-bold text-[10px] uppercase opacity-70">DIV {div.id}</h4>
                        <span className="text-[9px] text-text-muted mt-0.5 uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis w-full">
                            {div.title.split(' ')[0]}
                        </span>
                    </div>
                ))}
            </div>

            <div className="workbench-grid">
                {/* Left side: Spec List */}
                <div className="workbench-sidebar space-y-3">
                    {/* Add Section Button */}
                    <button
                        onClick={() => {
                            setAddSectionData(p => ({ ...p, sectionNumber: selectedDivision?.id ? `${selectedDivision.id} ` : '' }));
                            setIsAddSectionModalOpen(true);
                        }}
                        style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: '1px dashed var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                        <Plus size={14} /> Add Missing Section
                    </button>
                    {(projectData.recentItems || []).filter(item => item.id.startsWith(selectedDivision?.id)).map(item => {
                        const p1Progress = calculatePartProgress(item, 'part1');
                        const p2Progress = calculatePartProgress(item, 'part2');
                        const p3Progress = calculatePartProgress(item, 'part3');
                        
                        return (
                        <div 
                            key={item.id} 
                            className={`item-card prism-card cursor-pointer transition-all ${selectedSpec?.id === item.id ? 'active ring-2 ring-accent-primary' : 'hover:border-accent-primary/50'}`}
                            onClick={() => { setSelectedSpec(item); setSelectedBlock(null); }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-text-muted font-mono bg-black/20 px-2 py-1 rounded">{item.id}</span>
                                {item.match && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.match > 90 ? 'bg-accent-secondary/20 text-accent-secondary' : 'bg-accent-primary/20 text-accent-primary'}`}>
                                        {item.match}% Match
                                    </span>
                                )}
                            </div>
                            <h4 className="font-bold text-sm leading-tight mb-3">{item.title}</h4>
                            
                            {/* Part Progress Trackers */}
                            <div className="flex flex-col gap-1 mt-auto bg-bg-deep rounded p-3 border border-border-subtle">
                                <div className="flex justify-between items-center w-full text-xs">
                                    <span className="text-text-muted">Part 1</span>
                                    <span className={`font-mono font-bold ${p1Progress === 100 ? 'text-accent-secondary' : p1Progress > 0 ? 'text-accent-primary' : 'text-text-muted'}`}>&nbsp;&nbsp;{p1Progress}%</span>
                                </div>
                                <div className="flex justify-between items-center w-full text-xs">
                                    <span className="text-text-muted">Part 2</span>
                                    <span className={`font-mono font-bold ${p2Progress === 100 ? 'text-accent-secondary' : p2Progress > 0 ? 'text-accent-primary' : 'text-text-muted'}`}>&nbsp;&nbsp;{p2Progress}%</span>
                                </div>
                                <div className="flex justify-between items-center w-full text-xs">
                                    <span className="text-text-muted">Part 3</span>
                                    <span className={`font-mono font-bold ${p3Progress === 100 ? 'text-accent-secondary' : p3Progress > 0 ? 'text-accent-primary' : 'text-text-muted'}`}>&nbsp;&nbsp;{p3Progress}%</span>
                                </div>

                                {/* Responsibility Selector - Dropdown */}
                                <div className="mt-4 pt-3 border-t border-white/5">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-1.5 px-0.5">Source / Responsibility</label>
                                    <select 
                                        className="w-full bg-bg-deep border border-border-subtle rounded-md px-2 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-accent-primary outline-none cursor-pointer transition-all hover:border-accent-primary/30 appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                                        value={sectionResponsibility[item.id] || 'SELF'}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            setSectionResponsibility({...sectionResponsibility, [item.id]: e.target.value});
                                        }}
                                    >
                                        <option value="SELF">Self-Perform</option>
                                        <option value="VENDOR">Vendor-Managed</option>
                                        <option value="NA">Not Applicable (Exclude)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>

                {/* Right side: Detail View */}
                {selectedSpec ? (
                <div className="workbench-main prism-card flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-2xl font-bold">{selectedSpec.id.slice(0,2)} {selectedSpec.id.slice(2,4)} {selectedSpec.id.slice(4)} - {selectedSpec.title}</h3>
                        </div>
                        <div className="flex gap-2">
                            <span className="badge badge-green"><ShieldCheck size={12} className="inline mr-1" /> Verified</span>
                        </div>
                    </div>                    {/* Part Tabs styled like section cards, but compact */}
                    <div className="flex flex-row flex-nowrap gap-3 mb-6 font-mono">
                        <div 
                            className={`item-card prism-card !w-24 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !p-2 ${selectedPart === 'part1' ? 'active ring-2 ring-accent-primary' : 'hover:border-accent-primary/50'}`}
                            onClick={() => setSelectedPart('part1')}
                        >
                            <h4 className="font-bold text-[10px] uppercase opacity-70">PART 1</h4>
                            <span className="text-[9px] text-text-muted mt-0.5 uppercase tracking-tighter">General</span>
                        </div>
                        <div 
                            className={`item-card prism-card !w-24 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !p-2 relative ${selectedPart === 'part2' ? 'active ring-2 ring-accent-primary' : 'hover:border-accent-primary/50'}`}
                            onClick={() => setSelectedPart('part2')}
                        >
                            <h4 className="font-bold text-[10px] uppercase opacity-70">PART 2</h4>
                            <span className="text-[9px] text-text-muted mt-0.5 uppercase tracking-tighter">Products</span>
                            {selectedPart === 'part2' && <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-accent-primary animate-pulse"></div>}
                        </div>
                        <div 
                            className={`item-card prism-card !w-24 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !p-2 ${selectedPart === 'part3' ? 'active ring-2 ring-accent-primary' : 'hover:border-accent-primary/50'}`}
                            onClick={() => setSelectedPart('part3')}
                        >
                            <h4 className="font-bold text-[10px] uppercase opacity-70">PART 3</h4>
                            <span className="text-[9px] text-text-muted mt-0.5 uppercase tracking-tighter">Execution</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden">
                        {(sectionResponsibility[selectedSpec.id] || 'SELF') === 'NA' ? (
                            <div className="col-span-2 flex flex-col items-center justify-center h-full opacity-50 grayscale animate-fade-in">
                                <div className="p-8 rounded-full border-2 border-dashed border-border-subtle mb-4 shadow-[0_0_50px_rgba(255,107,0,0.05)]">
                                    <ShieldCheck size={48} className="text-text-muted" />
                                </div>
                                <h4 className="text-xl font-bold">Section Excluded</h4>
                                <p className="text-text-muted text-sm">This specification section is marked as Not Applicable for this submittal.</p>
                                <button 
                                    className="btn-secondary mt-6 scale-90"
                                    onClick={() => setSectionResponsibility({...sectionResponsibility, [selectedSpec.id]: 'SELF'})}
                                >
                                    Include Section
                                </button>
                            </div>
                        ) : (sectionResponsibility[selectedSpec.id] || 'SELF') === 'VENDOR' ? (
                            <div className="col-span-2 flex flex-col items-center justify-center h-full animate-fade-in">
                                <div className="prism-card border-dashed border-accent-secondary/30 p-12 text-center max-w-lg w-full bg-accent-secondary/5 shadow-[0_0_50px_rgba(0,255,163,0.05)]">
                                    <div className="w-16 h-16 bg-accent-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText size={32} className="text-accent-secondary" />
                                    </div>
                                    <h4 className="text-2xl font-extrabold pb-2 tracking-tight">Vendor Cut Sheets</h4>
                                    <p className="text-text-muted text-sm leading-relaxed mb-8">
                                        Drop the manufacturer cut sheets received from the vendor here. 
                                        We will still generate high-premium cover sheets for these items once uploaded.
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <button className="btn-primary px-8" onClick={handleVendorUpload}>Upload Files</button>
                                        <button className="btn-secondary">Request from Vendor</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                        <div className="col-span-2 grid grid-cols-2 gap-8 h-full overflow-hidden">
                            <div className="flex flex-col h-full">
                                {/* Dynamic Content based on selected Part */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {selectedPart === 'part1' && (
                                    <div className="animate-fade-in text-sm text-text-muted leading-relaxed">
                                        <FormattedSpecText 
                                            text={selectedSpec.part1} 
                                            specId={selectedSpec.id} 
                                            partId="part1"
                                            completedBlocks={completedBlocks}
                                            naBlocks={naBlocks}
                                            onToggleBlock={toggleBlockCompletion}
                                        />
                                    </div>
                                )}
                                
                                {selectedPart === 'part3' && (
                                    <div className="animate-fade-in text-sm text-text-muted leading-relaxed">
                                        <FormattedSpecText 
                                            text={selectedSpec.part3} 
                                            specId={selectedSpec.id} 
                                            partId="part3"
                                            completedBlocks={completedBlocks}
                                            naBlocks={naBlocks}
                                            onToggleBlock={toggleBlockCompletion}
                                        />
                                    </div>
                                )}

                                {selectedPart === 'part2' && (
                                    <div className="animate-fade-in h-full">
                                        {selectedSpec.part2.rawText ? (
                                            <div className="text-sm text-text-muted leading-relaxed">
                                        <FormattedSpecText 
                                            text={selectedSpec.part2.rawText} 
                                            specId={selectedSpec.id} 
                                            partId="part2"
                                            completedBlocks={completedBlocks}
                                            naBlocks={naBlocks}
                                            onToggleBlock={toggleBlockCompletion}
                                            onBlockSelect={(block) => setSelectedBlock(block)}
                                            selectedBlockKey={selectedBlock?.blockKey}
                                        />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-text-muted">
                                                No Part 2 content available.
                                            </div>
                                        )}
                                    </div>
                                )}
                                </div>
                            </div>

                        {/* Dynamic PDF Preview / Sourcing Tracker Side */}
                        {/* Shows: (1) spinner when sourcing, (2) block cut sheet when selected+sourced, (3) placeholder otherwise */}
                        {(() => {
                            // Check block-level storage first (new format)
                            // Fall back to section-level sourcedProduct (old format) for backward compat
                            const blockCutsheet = selectedBlock?.blockKey 
                                ? (selectedSpec.metadata?.sourcedBlocks?.[selectedBlock.blockKey]
                                   || selectedSpec.metadata?.sourcedProduct)  // ← backward compat
                                : null;
                            const isSourced = !!blockCutsheet?.cutsheetUrl;
                            const isSourcing = activeSourcingBlockId === selectedSpec.id;
                            const isRule = selectedBlock?.isRule;
                            const candidates = blockCutsheet?.candidates || [];
                            const selectionReason = blockCutsheet?.selectionReason || null;

                            // Pre-compute complaint view (avoids IIFE-in-ternary JSX lint error)
                            const score = blockCutsheet?.complianceScore;
                            const compPct = score != null ? Math.round(score * 100) : null;
                            const matched = blockCutsheet?.matchedRequirements || [];
                            const unmatched = blockCutsheet?.unmatchedRequirements || [];
                            const scoreColor = compPct == null ? 'text-text-muted'
                                : compPct >= 80 ? 'text-accent-secondary'
                                : compPct >= 60 ? 'text-amber-400'
                                : 'text-red-400';
                            const scoreBg = compPct == null ? 'bg-white/5 border-border-subtle'
                                : compPct >= 80 ? 'bg-accent-secondary/10 border-accent-secondary/20'
                                : compPct >= 60 ? 'bg-amber-400/10 border-amber-400/20'
                                : 'bg-red-400/10 border-red-400/20';
                            const compLabel = compPct == null ? 'Unverified'
                                : compPct >= 80 ? 'Spec Compliant'
                                : compPct >= 60 ? 'Needs Review'
                                : 'Likely Wrong Product';
                            return (
                            <div className="pdf-preview-prism h-full flex flex-col border-l border-border-subtle bg-bg-deeper">
                                <div className="flex justify-between items-center p-3 border-b border-border-subtle shrink-0 bg-bg-deep">
                                    <span className="text-xs font-bold text-text-muted flex items-center">
                                        <FileText size={14} className="mr-2 text-accent-primary" /> 
                                        {isSourcing ? "SOURCING ENGINE ACTIVE"
                                            : isSourced ? "VENDOR CUT SHEET REVIEW"
                                            : selectedBlock ? selectedBlock.blockTitle.slice(0, 40)
                                            : "SELECT A BLOCK TO VIEW CUT SHEET"}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-text-muted bg-white/5 py-1 px-3 rounded-full">
                                        {isSourcing ? "PROCESSING"
                                            : isSourced ? blockCutsheet.vendor
                                            : selectedBlock ? "AWAITING SOURCE"
                                            : `PAGE ${selectedSpec.pageNumber || 1}`}
                                    </span>
                                </div>
                                
                                <div className="pdf-canvas flex-1 relative flex items-center justify-center overflow-hidden">
                                    {isSourcing ? (
                                        <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in w-full max-w-md">
                                            <div className="relative mb-8">
                                                <div className="w-24 h-24 border-[4px] border-bg-deep rounded-full"></div>
                                                <div 
                                                    className="w-24 h-24 border-[4px] border-accent-secondary rounded-full absolute top-0 left-0 transition-all duration-500 ease-out"
                                                    style={{ clipPath: `inset(0 0 ${100 - sourcingProgressPct}% 0)` }}
                                                ></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xl font-black text-accent-secondary">{sourcingProgressPct}%</span>
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-black mb-2 tracking-tight uppercase">Searching for Cut Sheets</h3>
                                            <p className="text-text-muted text-sm mb-8 line-clamp-2 leading-relaxed">Cross-referencing parameters for:<br/><strong className="text-white mt-1 block">{selectedBlock?.blockTitle || selectedSpec.title}</strong></p>
                                            <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden border border-white/5 relative">
                                                <div className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500 ease-out shine-effect rounded-full" style={{ width: `${sourcingProgressPct}%` }}></div>
                                            </div>
                                            <p className="text-[10px] text-text-muted font-mono uppercase tracking-[0.2em] mt-4">Autonomous Search &amp; Rescue Engine</p>
                                        </div>
                                    ) : isRule ? (
                                        <div className="flex flex-col items-center justify-center p-10 text-center animate-fade-in max-w-sm">
                                            <div className="w-16 h-16 rounded-full border-2 border-text-muted/30 flex items-center justify-center mb-6">
                                                <FileText size={28} className="text-text-muted" />
                                            </div>
                                            <h4 className="font-bold text-sm uppercase tracking-widest text-text-muted mb-3">Specification Rule</h4>
                                            <p className="text-text-muted text-xs leading-relaxed">This block defines requirements and sizing rules that apply to other products in this section. No cut sheet is needed — these requirements will be used when verifying other products.</p>
                                        </div>
                                    ) : isSourced ? (
                                        <div className="flex flex-col h-full animate-fade-in">
                                            {/* Compliance header bar */}
                                            <div className={`shrink-0 px-3 py-2 border-b flex items-center justify-between gap-3 ${scoreBg}`}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {compPct != null && (
                                                        <span className={`font-black text-lg leading-none ${scoreColor}`}>{compPct}%</span>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className={`text-[10px] font-bold uppercase tracking-widest ${scoreColor}`}>
                                                            {compLabel}
                                                        </div>
                                                        {blockCutsheet.complianceReason && (
                                                            <div className="text-[9px] text-text-muted truncate">{blockCutsheet.complianceReason}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {blockCutsheet.price && (
                                                        <div className="text-accent-secondary font-black text-sm">{blockCutsheet.price}</div>
                                                    )}
                                                    <div className="text-[10px] text-text-muted">{blockCutsheet.vendorShort || blockCutsheet.vendor}</div>
                                                </div>
                                            </div>

                                            {/* Matched / Unmatched requirements */}
                                            {(matched.length > 0 || unmatched.length > 0) && (
                                                <div className="shrink-0 px-3 py-2 border-b border-border-subtle bg-bg-deeper flex gap-4">
                                                    {matched.length > 0 && (
                                                        <div className="flex-1">
                                                            <p className="text-[9px] text-accent-secondary uppercase tracking-widest font-bold mb-1">✓ Matched</p>
                                                            {matched.map((r, i) => (
                                                                <div key={i} className="text-[10px] text-accent-secondary/80 flex items-start gap-1 leading-tight mb-0.5">
                                                                    <span className="shrink-0">✓</span><span>{r}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {unmatched.length > 0 && (
                                                        <div className="flex-1">
                                                            <p className="text-[9px] text-amber-400 uppercase tracking-widest font-bold mb-1">⚠ Not Confirmed</p>
                                                            {unmatched.map((r, i) => (
                                                                <div key={i} className="text-[10px] text-amber-400/80 flex items-start gap-1 leading-tight mb-0.5">
                                                                    <span className="shrink-0">?</span><span>{r}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* PDF iframe */}
                                            <div className="flex-1 p-2 bg-black/20 min-h-0">
                                                <iframe
                                                    src={blockCutsheet.cutsheetUrl}
                                                    className="w-full h-full border border-white/10 rounded-lg shadow-2xl bg-white"
                                                    title="Vendor Cut Sheet"
                                                />
                                            </div>
                                        </div>
                                    ) : selectedBlock ? (
                                        <div className="flex flex-col items-center justify-center p-10 text-center animate-fade-in max-w-sm">
                                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-accent-primary/30 flex items-center justify-center mb-6">
                                                <Search size={28} className="text-accent-primary" />
                                            </div>
                                            <h4 className="font-bold text-sm uppercase tracking-widest text-accent-primary mb-3">Ready to Source</h4>
                                            <p className="text-text-muted text-xs leading-relaxed mb-6">Click "Find Cutsheet" on the block to search vendors for this item.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Mock PDF Background */}
                                            <div className="w-full h-full opacity-10 flex flex-col gap-4 p-8">
                                                {[...Array(20)].map((_, i) => (
                                                    <div key={i} className="h-2 bg-white rounded" style={{width: `${Math.random() * 60 + 40}%`}}></div>
                                                ))}
                                            </div>
                                            
                                            {/* Real-time Highlighting Overlay */}
                                            {selectedSpec.coordinates && (
                                                <div 
                                                    className="highlight-box absolute border-2 border-accent-primary bg-accent-primary/10 animate-pulse pointer-events-none"
                                                    style={{
                                                        top: '20%', 
                                                        left: `${(selectedSpec.coordinates.x / 612) * 100}%`,
                                                        width: `${(selectedSpec.coordinates.w / 612) * 100}%`,
                                                        height: '24px'
                                                    }}
                                                >
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            );
                        })()}
                        </div>
              )}
                    </div>
                </div>
                ) : (
                    <div className="workbench-main prism-card flex flex-col items-center justify-center text-text-muted h-full">
                        <FileSearch size={48} className="mb-4" />
                        <h3 className="text-lg font-bold">Select a specification section</h3>
                        <p className="text-sm">Run the AI Shredder to extract data from the PDF</p>
                    </div>
                )}
            </div>
        </div>
        )
    }


    const renderAddSectionModal = () => {
        if (!isAddSectionModalOpen) return null;
        const charCount = addSectionData.rawText.length;
        const { part1, part2, part3 } = addSectionData.rawText.trim() ? shredSection(addSectionData.rawText) : { part1: '', part2: '', part3: '' };
        const hasAnyPart = part1 || part2 || part3;
        return (
            <div className="modal-overlay">
                <div className="modal-content prism-card custom-scrollbar" style={{ maxWidth: '680px' }}>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight">Add Section Manually</h2>
                            <p className="text-sm text-text-muted mt-1">Paste raw spec text — Parts 1, 2 &amp; 3 are parsed automatically.</p>
                        </div>
                        <button onClick={() => { setIsAddSectionModalOpen(false); setAddSectionData({ sectionNumber: '', title: '', rawText: '' }); }} className="text-text-muted hover:text-white transition-colors p-1">
                            <Plus size={20} className="rotate-45" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Section Number *</label>
                            <input type="text" placeholder="e.g. 26 05 26" value={addSectionData.sectionNumber}
                                onChange={e => setAddSectionData(p => ({ ...p, sectionNumber: e.target.value }))}
                                className="w-full bg-bg-deep border border-border-subtle rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent-primary transition-all font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Section Title</label>
                            <input type="text" placeholder="e.g. Grounding and Bonding" value={addSectionData.title}
                                onChange={e => setAddSectionData(p => ({ ...p, title: e.target.value }))}
                                className="w-full bg-bg-deep border border-border-subtle rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent-primary transition-all" />
                        </div>
                    </div>
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Paste Raw Spec Text *</label>
                            <span className="text-xs text-text-muted font-mono">{charCount.toLocaleString()} chars</span>
                        </div>
                        <textarea placeholder="Copy and paste the full spec section here — PART 1 GENERAL, PART 2 PRODUCTS, PART 3 EXECUTION..."
                            value={addSectionData.rawText}
                            onChange={e => setAddSectionData(p => ({ ...p, rawText: e.target.value }))}
                            rows={10} style={{ minHeight: '200px' }}
                            className="w-full bg-bg-deep border border-border-subtle rounded-lg px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-accent-primary transition-all resize-y" />
                    </div>
                    {addSectionData.rawText.trim() && (
                        <div className="mb-6 p-4 bg-bg-deep/60 border border-border-subtle rounded-xl">
                            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Parse Preview</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[['Part 1', part1], ['Part 2', part2], ['Part 3', part3]].map(([label, content]) => (
                                    <div key={label} className={`rounded-lg p-3 border ${content ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-border-subtle opacity-40'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-2 h-2 rounded-full ${content ? 'bg-accent-primary' : 'bg-text-muted'}`} />
                                            <span className="text-xs font-bold">{label}</span>
                                        </div>
                                        <p className="text-[10px] text-text-muted font-mono line-clamp-2">{content ? content.substring(0, 80) + '...' : 'Not detected'}</p>
                                    </div>
                                ))}
                            </div>
                            {!hasAnyPart && <p className="text-xs text-amber-400 mt-3">⚠ No PART headers detected — all text stored as Part 1. Still saveable.</p>}
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button className="btn-secondary" onClick={() => { setIsAddSectionModalOpen(false); setAddSectionData({ sectionNumber: '', title: '', rawText: '' }); }}>Cancel</button>
                        <button className="btn-primary flex items-center gap-2" onClick={saveManualSection}
                            disabled={addSectionSaving || !addSectionData.sectionNumber.trim() || !addSectionData.rawText.trim()}
                            style={{ opacity: (addSectionSaving || !addSectionData.sectionNumber.trim() || !addSectionData.rawText.trim()) ? 0.5 : 1 }}>
                            {addSectionSaving
                                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                : <><Plus size={16} /> Save Section</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="app-shell bg-bg-deep">
                {/* Nav Rail */}
                <aside className="nav-rail">
                    <div className="logo-area">
                        <div className="logo-prism">SA</div>
                    </div>
                    <nav className="rail-icons">
                        <button className={`rail-btn ${view === 'portfolio' ? 'active' : ''}`} title="Portfolio (All Projects)" onClick={() => { 
                            setView('portfolio'); 
                            setActiveProject(null); 
                            setSelectedDivision(null);
                            setSelectedSpec(null);
                        }}>
                            <Briefcase size={20} />
                        </button>
                        <button className={`rail-btn ${view === 'dashboard' ? 'active' : ''}`} title="Project Dashboard" onClick={() => { if(activeProject) setView('dashboard') }} disabled={!activeProject}>
                            <LayoutDashboard size={20} />
                        </button>
                        <button className={`rail-btn ${view === 'workbench' ? 'active' : ''}`} title="Architect Workbench" onClick={() => { if(selectedDivision) setView('workbench') }} disabled={!selectedDivision}>
                            <FileSearch size={20} />
                        </button>
                        <button className={`rail-btn ${view === 'sourcing-settings' ? 'active' : ''}`} title="Sourcing Settings" onClick={() => setView('sourcing-settings')}>
                            <Search size={20} />
                        </button>
                        <button className="rail-btn" title="Submittal Output (Coming Soon)" disabled style={{opacity: 0.3}}><ClipboardCheck size={20} /></button>
                    </nav>
                    <div className="rail-footer">
                        <button className="rail-btn" title="Settings (Coming Soon)" disabled style={{opacity: 0.3}}><Settings size={20} /></button>
                        <div className="user-avatar" title="User Profile"></div>
                    </div>
                </aside>

                {/* Top Bar */}
                <header className="top-bar">
                    <div className="search-field">
                        <Search size={16} className="text-text-muted" />
                        <input type="text" placeholder="Search specifications, vendors, or items..." />
                    </div>
                    <div className="header-actions">
                        <button className="btn-icon"><Bell size={20} /></button>
                        <button className="btn-primary flex items-center gap-2" onClick={() => setIsNewProjectModalOpen(true)}>
                            <Plus size={16} /> New Submittal
                        </button>
                    </div>
                </header>

                {/* Main Stage */}
                <main className="main-stage">
                    {view === 'portfolio' && renderPortfolio()}
                    {view === 'dashboard' && renderDashboard()}
                    {view === 'workbench' && (projectData ? renderWorkbench() : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
                            <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-medium">Loading workbench...</p>
                        </div>
                    ))}
                    {view === 'sourcing-settings' && renderSourcingSettings()}
                </main>
            </div>
            
            {renderNewProjectModal()}
            {renderAddSectionModal()}

        {/* Global Shredding Overlay */}
            {isShredding && view !== 'workbench' && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-bg-deep/90 backdrop-blur-xl animate-fade-in">
                    <div className="max-w-xl w-full p-12 prism-card border-accent-primary/30 text-center shadow-[0_0_100px_rgba(255,107,0,0.1)]">
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 border-4 border-accent-primary/20 rounded-full"></div>
                            <div 
                                className="absolute inset-0 border-4 border-accent-primary rounded-full transition-all duration-500"
                                style={{ 
                                    clipPath: `inset(0 0 0 0)`, // Simplified for demo, in real we'd use dash-array
                                    transform: `rotate(${shredProgress * 3.6}deg)`
                                }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black text-accent-primary">{shredProgress}%</span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase whitespace-pre-wrap">The Grand Shred<br/><span className="text-accent-primary">In Progress</span></h2>
                        <p className="text-text-muted text-sm px-4 mb-8">{shredStatusMsg}</p>
                        
                        <div className="progress-bar-bg h-1.5 w-full rounded-full overflow-hidden mb-2">
                             <div 
                                className="progress-fill h-full bg-accent-primary glow-orange transition-all" 
                                style={{ width: `${shredProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-text-muted font-mono uppercase tracking-[0.2em]">CSI Section Extraction Engine v2.0</p>
                    </div>
                </div>
            )}
        </>
    )
}

export default App
