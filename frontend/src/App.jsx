import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
    LayoutDashboard, FileSearch, ClipboardCheck, 
    Settings, Bell, Search, ChevronRight, 
    MoreHorizontal, CheckCircle2, Clock, 
    ArrowUpRight, Plus, Box, ShieldCheck,
    FileText, ExternalLink, Briefcase, Building2, Trash2, Maximize, X,
    Bot, Loader2, FileUp
} from 'lucide-react'
import { supabase } from './supabase'
import ReactDOM from 'react-dom'
import TrackerView from './TrackerView'
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

const FormattedSpecText = ({ text, specId, partId, completedBlocks, naBlocks, onToggleBlock, onBlockSelect, selectedBlockKey, aiBlocks, sourcedBlocksData }) => {
    const fileInputRef = useRef(null);
    
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
                const blockTitle = blockLines[0]?.trim() || 'GENERAL SECTION';
                const blockKey = blockTitle.slice(0, 80);
                const isSelected = selectedBlockKey === blockKey;
                const aiBlockData = aiBlocks ? aiBlocks[blockKey] || null : null;
                const isCompleted = completedBlocks?.includes(blockId);
                const isNA = naBlocks?.includes(blockId);
                const isGreen = isCompleted || isNA;

                const blockSourced = sourcedBlocksData ? sourcedBlocksData[blockKey] : null;
                
                return (
                <div 
                    key={blockIdx}
                    id={`prism-block-${blockKey.replace(/[^a-zA-Z0-9]/g, '')}`}
                    className={`prism-block prism-card mb-4 relative overflow-hidden transition-all duration-300 cursor-pointer border-l-4 ${
                        isCompleted ? 'border-l-accent-secondary border-accent-secondary/30 bg-accent-secondary/5' : 
                        isNA ? 'border-l-text-muted border-border-subtle bg-white/2 opacity-80' : 
                        isSelected ? 'border-l-accent-primary bg-accent-primary/8 ring-2 ring-accent-primary shadow-[0_0_20px_rgba(255,115,0,0.15)]' :
                        'border-l-transparent hover:border-l-accent-primary/50 hover:border-accent-primary/40'
                    } ${
                        !isGreen && !isSelected ? 'hover:translate-x-1' : ''
                    } group`}
                    onClick={(e) => onBlockSelect && onBlockSelect({ blockKey, blockTitle, blockLines, blockIdx, offsetTop: e.currentTarget.offsetTop })}
                >
                    <div className="mb-4">
                            <div className="mb-5">
                                {blockLines.length > 0 && /^[1-3]\.[0-9]{2}/.test(blockLines[0].trim()) ? (
                                    <div className={`indent-level-0 font-extrabold text-2xl uppercase tracking-wide leading-snug ${isGreen ? 'text-accent-secondary' : 'text-accent-primary'}`}>
                                        {blockLines[0].trim()}
                                    </div>
                                ) : (
                                    <div className="text-base font-bold text-text-muted uppercase tracking-widest">
                                        General Section
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center justify-between py-3 mb-4 border-b border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            type="button"
                                            onClick={(e) => { 
                                                e.preventDefault();
                                                e.stopPropagation(); 
                                                if (!isCompleted) {
                                                    const blockEl = document.getElementById(`prism-block-${blockKey.replace(/[^a-zA-Z0-9]/g, '')}`);
                                                    onBlockSelect && onBlockSelect({ blockKey, blockTitle, blockLines, blockIdx, offsetTop: blockEl ? blockEl.offsetTop : 0 });
                                                    window.dispatchEvent(new CustomEvent('trigger-sourcing', { 
                                                        detail: { blockId, blockKey, blockTitle, blockLines: blockLines.join('\n'), aiBlockData } 
                                                    })); 
                                                }
                                            }}
                                            disabled={isCompleted}
                                            className={`btn-secondary !py-2.5 !px-5 !h-auto flex items-center gap-2.5 group/btn transition-all ${isCompleted ? 'opacity-20 cursor-not-allowed saturate-0' : 'opacity-100 shadow-[0_0_15px_rgba(255,115,0,0.3)] hover:brightness-125 hover:-translate-y-0.5'}`}
                                            title={isCompleted ? "Section already marked done." : "Initiate Vendor Search"}
                                        >
                                            <Box size={16} className={!isCompleted ? "group-hover/btn:rotate-12 transition-transform text-accent-primary" : "text-text-muted"} />
                                            <span className="font-bold text-white tracking-widest text-[11px] uppercase whitespace-nowrap">Find Cutsheet</span>
                                        </button>

                                        <input 
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    window.dispatchEvent(new CustomEvent('trigger-manual-upload', {
                                                        detail: { blockId, blockKey, blockTitle, file }
                                                    }));
                                                }
                                                e.target.value = '';
                                            }}
                                        />

                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (!isCompleted) fileInputRef.current?.click();
                                            }}
                                            disabled={isCompleted}
                                            className={`btn-secondary !py-2.5 !px-5 !h-auto flex items-center gap-2.5 transition-all ${isCompleted ? 'opacity-20 cursor-not-allowed saturate-0' : 'opacity-100 hover:bg-white/10'}`}
                                            title="Upload Manual Cutsheet"
                                        >
                                            <FileUp size={16} className="text-accent-secondary" />
                                            <span className="font-bold text-white tracking-widest text-[11px] uppercase whitespace-nowrap">Upload Manual</span>
                                        </button>
                                    </div>
                                    <div className="w-[1px] h-8 bg-white/5 mx-1"></div>
                                </div>

                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onToggleBlock(blockId, 'DONE'); }}
                                    className={`btn-secondary !py-2.5 !px-5 !h-auto flex items-center gap-2.5 transition-all ${isCompleted ? 'bg-accent-secondary/20 border-accent-secondary text-accent-secondary shadow-[0_0_15px_rgba(0,255,163,0.3)]' : 'opacity-100 hover:bg-white/10'}`}
                                    title={isCompleted ? "Marked as complete" : "Mark as complete"}
                                >
                                    <CheckCircle2 size={16} className={isCompleted ? "text-accent-secondary drop-shadow-[0_0_5px_rgba(0,255,163,0.8)]" : "text-text-muted"} />
                                    <span className={`font-bold tracking-widest text-[11px] uppercase whitespace-nowrap ${isCompleted ? 'text-accent-secondary' : 'text-white'}`}>
                                        {isCompleted ? 'Marked Done' : 'Complete'}
                                    </span>
                                </button>
                            </div>

                            <div className="pl-1">
                                {blockLines.map((line, lineIdx) => {
                                    const trimmed = line.trim();
                                    if (lineIdx === 0 && /^[1-3]\.[0-9]{2}/.test(trimmed)) return null;
                                    
                                    let indentClass = "base-text";
                                    if (/^[A-Z]\./.test(trimmed)) indentClass = "indent-level-1";
                                    else if (/^[0-9]+\./.test(trimmed)) indentClass = "indent-level-2 mt-1";
                                    else if (/^[a-z]\./.test(trimmed)) indentClass = "indent-level-3";
                                    else if (/^-/.test(trimmed)) indentClass = "indent-level-4";

                                    let isVerified = false;
                                    let verifiedTooltip = "";

                                    // X-Ray Matcher
                                    if (blockSourced && Array.isArray(blockSourced)) {
                                        blockSourced.forEach(prod => {
                                            if (prod.matchedRequirements) {
                                                const match = prod.matchedRequirements.find(req => 
                                                    (req.length > 5 && trimmed.toLowerCase().includes(req.toLowerCase())) || 
                                                    (trimmed.length > 5 && req.toLowerCase().includes(trimmed.toLowerCase()))
                                                );
                                                if (match) {
                                                    isVerified = true;
                                                    verifiedTooltip = `Verified in cutsheet: ${prod.sku}`;
                                                }
                                            }
                                        });
                                    }

                                    return (
                                        <div key={lineIdx} className={`${indentClass} relative flex group/line`}>
                                            <div className={`flex-1 transition-all ${isVerified ? 'text-accent-secondary font-bold bg-accent-secondary/5 px-2 py-0.5 rounded -ml-2' : ''}`}>
                                                {trimmed}
                                            </div>
                                            {isVerified && (
                                                <div 
                                                    className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity flex items-center gap-2 cursor-help" 
                                                    title={verifiedTooltip}
                                                >
                                                    <CheckCircle2 size={14} className="text-accent-secondary drop-shadow-[0_0_10px_rgba(0,255,163,0.8)]" />
                                                </div>
                                            )}
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

// Error Boundary for UI Safety
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error("CRASH_LOG:", error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, background: "#0a0b0e", color: "#ff4d4d", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>⚠</div>
                    <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 10 }}>CRASH DETECTED</h1>
                    <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 30 }}>Submittal Architect encountered a rendering error. Our AI is tracking the stack trace.</p>
                    <pre style={{ background: "rgba(0,0,0,0.5)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", textAlign: "left", fontSize: 12, maxWidth: "80%", overflow: "auto" }}>
                        {this.state.error?.stack}
                    </pre>
                    <button 
                        onClick={() => location.reload()} 
                        style={{ marginTop: 40, padding: "12px 24px", background: "#ff6b00", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}
                    >
                        Reload Interface
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

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
    const [pdfAlignmentOffset, setPdfAlignmentOffset] = useState(0) // Tracks vertical offset for PDF viewer side-by-side alignment
    const [hoveredRequirement, setHoveredRequirement] = useState(null) // Tracks hovered matched requirement for UI X-Ray
    const [expandedPdfUrl, setExpandedPdfUrl] = useState(null) // Allows fullscreen PDF viewing
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
    const [newProjectStep, setNewProjectStep] = useState(1)
    const [customDivisionInput, setCustomDivisionInput] = useState('')
    const [vendors, setVendors] = useState(['Platt', 'Hubbell', 'North Coast'])
    const [manufacturers, setManufacturers] = useState(['Hubbell', 'Leviton', 'Eaton'])
    const [activeSubProductIndex, setActiveSubProductIndex] = useState(0) // Tracks which item in a multi-product stack is visible

    const isSourcing = activeSourcingBlockId === selectedSpec?.id;

    // Manual section add state
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
    const [addSectionData, setAddSectionData] = useState({ sectionNumber: '', title: '', rawText: '' })
    const [addSectionSaving, setAddSectionSaving] = useState(false)

    const handleUpdateProjectAdmin = async (updates) => {
        if (!activeProject) return;
        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', activeProject.id);
        
        if (error) {
            console.error('Error updating project admin:', error);
            alert('Failed to update project settings');
        } else {
            loadProjectData(activeProject, null, true);
        }
    };

    const handleUpdateSectionResponsibility = async (sectionDbId, responsibility, vendorName = null) => {
        const { error } = await supabase
            .from('spec_sections')
            .update({ 
                responsibility, 
                vendor_name: vendorName 
            })
            .eq('id', sectionDbId);
        
        if (error) {
            console.error('Error updating responsibility:', error);
        } else {
            loadProjectData(activeProject, null, true);
        }
    };


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
                project_id: projectData?.id,
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
             const refreshedSpec = uiItems.find(i => i.id === selectedSpec?.id);
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
        return sections.map(s => {
            // Build aiBlockMap from stored ai_blocks JSON for O(1) lookup per block
            let aiBlockMap = null;
            if (s.ai_blocks) {
                const blocks = typeof s.ai_blocks === 'string' ? JSON.parse(s.ai_blocks) : s.ai_blocks;
                if (Array.isArray(blocks) && blocks.length > 0) {
                    aiBlockMap = {};
                    for (const block of blocks) {
                        const key = (block.blockTitle || '').trim().slice(0, 80);
                        aiBlockMap[key] = {
                            isProduct: block.isProduct !== false,
                            manufacturers: block.manufacturers || [],
                            keyRequirements: block.keyRequirements || [],
                            summary: block.summary || ''
                        };
                    }
                }
            }

            return {
                id: s.section_number, 
                dbId: s.id,
                title: s.title,
                type: 'Spec',
                match: Math.round((s.confidence_score || 0) * 100),
                pageNumber: s.page_number,
                coordinates: s.coordinates,
                metadata: {
                    ...(s.metadata || {}),
                    responsibility: s.responsibility || 'SELF',
                    vendor_name: s.vendor_name || null,
                    full_submittal_url: s.full_submittal_url || null
                },
                aiBlockMap,   // ← pre-computed block map from AI shredder
                part1: s.part1_content || "No Part 1 content found.",
                part2: {
                    extractedSpecs: [
                        { trait: "Data Source", value: "Surgical Shredder v2", verified: s.confidence_score > 0.9 }
                    ],
                    insight: s.confidence_score > 0.9 ? "High confidence electrical section detected." : "Semantic match: Review for electrical intent.",
                    rawText: s.part2_content || "No Part 2 content found."
                },
                part3: s.part3_content || "No Part 3 content found."
            };
        });
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
                                ].map(divItem => (
                                    <div 
                                        key={divItem.id}
                                        className={`division-item ${newProjectData.divisions[divItem.id] ? 'selected' : ''}`}
                                        onClick={() => setNewProjectData({
                                            ...newProjectData, 
                                            divisions: {...newProjectData.divisions, [divItem.id]: !newProjectData.divisions[divItem.id]}
                                        })}
                                    >
                                        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                            <div className="checkbox-box">
                                                {newProjectData.divisions[divItem.id] && <CheckCircle2 size={14} />}
                                            </div>
                                            <div>
                                                <h4 style={{fontSize: '14px', fontWeight: 700}}>Division {divItem.id}</h4>
                                                <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>{divItem.title}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Custom Divisions List */}
                                {newProjectData.customDivisions.map(divName => (
                                     <div 
                                        key={divName}
                                        className="division-item selected"
                                        onClick={() => setNewProjectData({
                                            ...newProjectData, 
                                            customDivisions: newProjectData.customDivisions.filter(d => d !== divName)
                                        })}
                                    >
                                        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                            <div className="checkbox-box" style={{background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: 'white'}}>
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <div>
                                                <h4 style={{fontSize: '14px', fontWeight: 700}}>Division {divName}</h4>
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
        const section = projectData?.recentItems.find(s => s.id === specId);
        if (section?.dbId) {
            await supabase
                .from('spec_sections')
                .update({ 
                    metadata: { 
                        ...(section.metadata || {}),
                        completed_blocks: newCompleted.filter(id => id.startsWith(specId)),
                        na_blocks: newNA.filter(id => id.startsWith(specId))
                    },
                    ...((!section.tracker_status || section.tracker_status === 'Not Started') ? { tracker_status: 'Working' } : {})
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
        const handleTriggerManualUpload = async (e) => {
            const { blockId, blockKey, blockTitle, file, isFullSection, sectionDbId, sectionTitle } = e.detail;
            const section = selectedSpec;
            if (!section) return;

            console.log('Manual upload for:', isFullSection ? 'Full Section' : (blockTitle || blockId), file.name);
            if (!isFullSection) {
                setActiveSourcingBlockId(section.id);
            }
            setSourcingProgressPct(20);

            try {
                // 1. Prepare Form Data for backend
                const formData = new FormData();
                formData.append('pdf', file);
                formData.append('projectId', activeProject.id);
                formData.append('sectionId', isFullSection ? sectionDbId : (section.dbId || section.id));
                formData.append('blockId', isFullSection ? sectionTitle : (blockKey || blockTitle || blockId));
                formData.append('type', isFullSection ? 'section' : 'block');

                // 2. Call backend endpoint
                const res = await fetch('http://localhost:3001/api/upload-cutsheet', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await res.json();
                if (!data.success) throw new Error(data.error);

                setSourcingProgressPct(70);

                if (isFullSection) {
                    // Update the section root level
                    setSelectedSpec(prev => ({
                        ...prev,
                        metadata: {
                            ...prev?.metadata,
                            full_submittal_url: data.publicUrl,
                            responsibility: 'VENDOR'
                        }
                    }));
                    setPdfUrl(data.publicUrl);
                    alert("Full Vendor Submittal Uploaded successfully!");
                    return;
                }

                // 3. Format result for state (block level)
                const result = {
                    sku: file.name.replace('.pdf', ''),
                    vendor: 'Manual Upload',
                    title: blockTitle || 'Manually Uploaded Document',
                    cutsheetUrl: data.publicUrl,
                    complianceScore: 1.0,
                    complianceReason: "User manually verified and uploaded this document for compliance.",
                    matchedRequirements: []
                };

                const activeBlockKey = blockKey || blockTitle || blockId;
                const results = [result];

                // 4. Update UI State
                setSelectedSpec(prev => ({
                    ...prev,
                    metadata: {
                        ...prev?.metadata,
                        sourcedBlocks: {
                            ...(prev?.metadata?.sourcedBlocks || {}),
                            [activeBlockKey]: results
                        }
                    }
                }));

                setActiveSubProductIndex(0);
                setSourcingProgressPct(100);

            } catch (err) {
                console.error("Manual upload check failed:", err);
                alert(`Upload Failed: ${err.message}`);
            } finally {
                setTimeout(() => setActiveSourcingBlockId(null), 800);
            }
        };

        const handleTriggerSourcing = async (e) => {
            const { blockId, blockKey, blockTitle, blockLines, aiBlockData } = e.detail;
            console.log('Sourcing for block:', blockTitle || blockId);
            if (aiBlockData) console.log('[AI] Pre-computed block data found — skipping AI extraction.');
            
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
                    sectionTitle: blockTitle || section.title,
                    specText: specTextForAI.slice(0, 3000),
                    prefs
                });
                // Pass pre-computed AI block data if available (avoids re-parsing at click time)
                if (aiBlockData) params.set('aiBlockData', JSON.stringify(aiBlockData));
                const res = await fetch(`http://localhost:3001/api/source?${params.toString()}`);
                const data = await res.json();
                
                clearInterval(progressTimer);
                setSourcingProgressPct(100);
                const results = Array.isArray(data.results) ? data.results : (data.result ? [data.result] : []);
                if (data.success && results.length > 0) {
                    const activeBlockKey = blockKey || blockTitle || blockId;
                    
                    setSelectedSpec(prev => ({
                        ...prev,
                        metadata: {
                            ...prev?.metadata,
                            sourcedBlocks: {
                                ...(prev?.metadata?.sourcedBlocks || {}),
                                [activeBlockKey]: results
                            }
                        }
                    }));

                    setActiveSubProductIndex(0);

                    // Proactively set the first matched requirement as highlighted
                    if (results[0]?.matchedRequirements && results[0].matchedRequirements.length > 0) {
                        setHoveredRequirement(results[0].matchedRequirements[0]);
                    }

                    // Persist to Supabase in the background (non-blocking)
                    const currentMeta = section.metadata || {};
                    supabase
                        .from('spec_sections')
                        .update({ 
                            metadata: {
                                ...currentMeta,
                                sourcedBlocks: {
                                    ...(currentMeta.sourcedBlocks || {}),
                                    [activeBlockKey]: results
                                }
                            },
                            ...((!section.tracker_status || section.tracker_status === 'Not Started') ? { tracker_status: 'Working' } : {})
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
        window.addEventListener('trigger-manual-upload', handleTriggerManualUpload);
        return () => {
            window.removeEventListener('trigger-sourcing', handleTriggerSourcing);
            window.removeEventListener('trigger-manual-upload', handleTriggerManualUpload);
        };
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

    const renderAdmin = () => {
        if (!activeProject) return null;

        return (
            <div className="admin-container animate-fade-in p-8 max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight mb-2">PROJECT <span className="text-accent-primary underline decoration-4 underline-offset-8">ADMIN</span></h1>
                        <p className="text-text-muted font-medium uppercase tracking-[0.2em] text-xs">Manage Responsibilities, Vendors & Project Staff</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="btn-secondary flex items-center gap-2" onClick={() => setView('dashboard')}>
                            <LayoutDashboard size={18} /> Dashboard
                        </button>
                        <button className="btn-primary flex items-center gap-2" onClick={() => setView('workbench')}>
                            <FileSearch size={18} /> Open Workbench
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column: Project Metadata */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="prism-card p-6 border-accent-primary/20">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
                                <Users size={16} /> Project Ownership
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-text-muted block mb-1.5 ml-1">Project Manager</label>
                                    <input 
                                        type="text"
                                        className="w-full bg-bg-deep border border-border-subtle rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-accent-primary transition-all outline-none"
                                        defaultValue={activeProject?.metadata?.manager || 'Michael Paxton'}
                                        onBlur={(e) => handleUpdateProjectAdmin({ 
                                            metadata: { ...activeProject.metadata, manager: e.target.value } 
                                        })}
                                    />
                                </div>
                                <div className="pt-4 border-t border-border-subtle/50">
                                    <label className="text-[10px] font-black uppercase text-text-muted block mb-3 ml-1">Authorized Vendors</label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {['Platt Electric', 'CED', 'Graybar'].map(v => (
                                            <div key={v} className="bg-accent-primary/10 text-accent-primary text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border border-accent-primary/20">
                                                {v} <X size={10} className="hover:text-white cursor-pointer" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                        <input 
                                            placeholder="Add vendor filter..." 
                                            className="w-full bg-bg-deep border border-border-subtle rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-accent-primary transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="prism-card p-6 bg-gradient-to-br from-bg-surface to-bg-deep">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-4">System Stats</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-bg-deep rounded-xl border border-border-subtle">
                                    <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Total Blocks</p>
                                    <p className="text-xl font-black">{projectData?.divisions?.reduce((acc, d) => acc + (d.tasks || 0), 0) || 0}</p>
                                </div>
                                <div className="p-4 bg-bg-deep rounded-xl border border-border-subtle">
                                    <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Sourced</p>
                                    <p className="text-xl font-black text-green-400">{projectData?.progress || 0}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Bulk Management */}
                    <div className="col-span-12 lg:col-span-8">
                        <div className="prism-card p-0 overflow-hidden min-h-[500px] flex flex-col">
                            <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-deep/40">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Section Responsibility Master</h3>
                                <div className="flex gap-2">
                                    <button className="btn-secondary text-[10px] px-3 py-1.5 font-bold uppercase tracking-wider">Set Selection: SELF</button>
                                    <button className="btn-secondary text-[10px] px-3 py-1.5 font-bold uppercase tracking-wider">Set Selection: VENDOR</button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-bg-surface z-10 shadow-sm">
                                        <tr className="border-b border-border-subtle">
                                            <th className="p-4 w-10"><input type="checkbox" className="rounded bg-bg-deep border-border-subtle" /></th>
                                            <th className="py-4 px-2 text-[10px] font-black text-text-muted uppercase tracking-widest">Section</th>
                                            <th className="py-4 px-2 text-[10px] font-black text-text-muted uppercase tracking-widest">Title</th>
                                            <th className="py-4 px-2 text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Resp</th>
                                            <th className="py-4 px-2 text-[10px] font-black text-text-muted uppercase tracking-widest">Assigned Vendor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle/30">
                                        {projectData?.recentItems?.map(section => (
                                            <tr key={section.id} className="hover:bg-accent-primary/5 transition-colors group">
                                                <td className="p-4"><input type="checkbox" className="rounded bg-bg-deep border-border-subtle" /></td>
                                                <td className="py-4 px-2 font-mono text-xs font-bold text-accent-primary">{section.id}</td>
                                                <td className="py-4 px-2 text-xs font-bold">{section.title}</td>
                                                <td className="py-4 px-2 text-center">
                                                    <select 
                                                        className="bg-bg-deep border border-border-subtle rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white focus:outline-none focus:border-accent-primary"
                                                        value={section.metadata?.responsibility || 'SELF'}
                                                        onChange={(e) => handleUpdateSectionResponsibility(section.dbId, e.target.value, section.metadata?.vendor_name)}
                                                    >
                                                        <option value="SELF">SELF</option>
                                                        <option value="VENDOR">VENDOR</option>
                                                        <option value="NA">N/A</option>
                                                    </select>
                                                </td>
                                                <td className="py-4 px-2 text-xs text-text-muted">
                                                    {section.metadata?.responsibility === 'VENDOR' ? (
                                                        <select 
                                                            className="bg-transparent text-xs font-bold p-1 outline-none text-accent-primary"
                                                            value={section.metadata?.vendor_name || 'None'}
                                                            onChange={(e) => handleUpdateSectionResponsibility(section.dbId, 'VENDOR', e.target.value)}
                                                        >
                                                            <option value="None">Assign Vendor...</option>
                                                            <option value="Platt Electric">Platt Electric</option>
                                                            <option value="Graybar">Graybar</option>
                                                            <option value="CED">CED</option>
                                                        </select>
                                                    ) : (
                                                        <span className="text-text-muted opacity-50 block p-1">Internal Scope</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderMainContent = () => {
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
                            <h1 className="text-2xl font-extrabold tracking-tight">{projectData?.name}</h1>
                            <p className="text-text-muted text-sm">{projectData?.client}</p>
                        </div>
                    </div>
                    <span className="badge badge-orange font-bold">In Progress</span>
                </div>

                <div className="progress-container mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">{projectData?.progress}% complete</span>
                        <span className="text-text-muted">{projectData?.daysLeft} days left</span>
                    </div>
                    <div className="progress-bar-bg h-2 rounded-full overflow-hidden">
                        <div className="progress-fill h-full bg-accent-primary glow-orange" style={{ width: `${projectData?.progress}%` }}></div>
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
                    {projectData?.divisions && projectData?.divisions.length > 0 ? projectData?.divisions.map(div => (
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
    );

    const renderWorkbench = () => {
        if (!selectedDivision) return (
            <div className="workbench-root animate-fade-in flex items-center justify-center">
                <div className="text-center text-text-muted max-w-md w-full px-6">
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
                {(projectData?.divisions || []).map(div => (
                    <div
                        key={div.id}
                        onClick={() => {
                            setSelectedDivision(div);
                            const firstSpecInDiv = (projectData?.recentItems || []).find(item => item.id.startsWith(div.id));
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
                    {(projectData?.recentItems || []).filter(item => item.id.startsWith(selectedDivision?.id)).map(item => {
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
                            <h3 className="text-2xl font-bold">{selectedSpec?.id.slice(0,2)} {selectedSpec?.id.slice(2,4)} {selectedSpec?.id.slice(4)} - {selectedSpec?.title}</h3>
                        </div>
                        <div className="flex gap-2">
                            <span className="badge badge-green"><ShieldCheck size={12} className="inline mr-1" /> Verified</span>
                        </div>
                    </div>
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

                    <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
                        {(selectedSpec?.metadata?.responsibility || 'SELF') === 'NA' ? (
                            <div className="col-span-2 flex flex-col items-center justify-center h-full opacity-50 grayscale animate-fade-in">
                                <div className="p-8 rounded-full border-2 border-dashed border-border-subtle mb-4 shadow-[0_0_50px_rgba(255,107,0,0.05)]">
                                    <ShieldCheck size={48} className="text-text-muted" />
                                </div>
                                <h4 className="text-xl font-bold">Section Excluded</h4>
                                <p className="text-text-muted text-sm">This specification section is marked as Not Applicable for this submittal.</p>
                                <button 
                                    className="btn-secondary mt-6 scale-90"
                                    onClick={() => handleUpdateSectionResponsibility(selectedSpec.dbId, 'SELF')}
                                >
                                    Include Section
                                </button>
                            </div>
                        ) : (selectedSpec?.metadata?.responsibility || 'SELF') === 'VENDOR' ? (
                            <div className="col-span-2 flex flex-col items-center justify-center h-full animate-fade-in">
                                <div className="prism-card border-dashed border-accent-secondary/30 p-12 text-center max-w-lg w-full bg-accent-secondary/5 shadow-[0_0_50px_rgba(0,255,163,0.05)]">
                                    <div className="w-16 h-16 bg-accent-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText size={32} className="text-accent-secondary" />
                                    </div>
                                    <h4 className="text-2xl font-extrabold pb-2 tracking-tight">Vendor Cut Sheets</h4>
                                    <p className="text-text-muted text-sm leading-relaxed mb-8">
                                        Drop the combined manufacturer cut sheet PDF received from the vendor here. 
                                        We will still generate high-premium cover sheets for these items once uploaded.
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <button className="btn-primary px-8" onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = '.pdf';
                                            input.onchange = (e) => {
                                                if(e.target.files[0]) {
                                                    window.dispatchEvent(new CustomEvent('trigger-manual-upload', {
                                                        detail: { 
                                                            file: e.target.files[0], 
                                                            isFullSection: true, 
                                                            sectionDbId: selectedSpec.dbId,
                                                            sectionTitle: selectedSpec.id 
                                                        }
                                                    }));
                                                }
                                            };
                                            input.click();
                                        }}>Upload Full Submittal</button>
                                        <button className="btn-secondary">Request from Vendor</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="col-span-2 grid grid-cols-2 gap-8 h-full">
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div className="flex-1 pb-[80vh] overflow-y-auto custom-scrollbar">
                                        {selectedPart === 'part1' && (
                                            <div className="animate-fade-in text-sm text-text-muted leading-relaxed">
                                                <FormattedSpecText
                                                    text={selectedSpec?.part1}
                                                    specId={selectedSpec?.id}
                                                    partId="part1"
                                                    completedBlocks={completedBlocks}
                                                    naBlocks={naBlocks}
                                                    onToggleBlock={toggleBlockCompletion}
                                                    sourcedBlocksData={selectedSpec?.metadata?.sourcedBlocks}
                                                />
                                            </div>
                                        )}

                                        {selectedPart === 'part3' && (
                                            <div className="animate-fade-in text-sm text-text-muted leading-relaxed">
                                                <FormattedSpecText 
                                                    text={selectedSpec?.part3} 
                                                    specId={selectedSpec?.id} 
                                                    partId="part3"
                                                    completedBlocks={completedBlocks}
                                                    naBlocks={naBlocks}
                                                    onToggleBlock={toggleBlockCompletion}
                                                    sourcedBlocksData={selectedSpec?.metadata?.sourcedBlocks}
                                                />
                                            </div>
                                        )}

                                        {selectedPart === 'part2' && (
                                            <div className="animate-fade-in h-full">
                                                {selectedSpec?.part2?.rawText ? (
                                                    <div className="text-sm text-text-muted leading-relaxed">
                                                        <FormattedSpecText 
                                                            text={selectedSpec?.part2?.rawText} 
                                                            specId={selectedSpec?.id} 
                                                            partId="part2"
                                                            completedBlocks={completedBlocks}
                                                            naBlocks={naBlocks}
                                                            onToggleBlock={toggleBlockCompletion}
                                                            onBlockSelect={(block) => {
                                                                setSelectedBlock(block);
                                                                setActiveSubProductIndex(0);
                                                                setPdfAlignmentOffset((block.offsetTop || 0) - 138);
                                                            }}
                                                            selectedBlockKey={selectedBlock?.blockKey}
                                                            aiBlocks={selectedSpec?.aiBlockMap || null}
                                                            sourcedBlocksData={selectedSpec?.metadata?.sourcedBlocks}
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

                                {/* Right Side: PDF / Sourcing View */}
                                <div className="flex flex-col h-full overflow-hidden border-l border-white/5">
                                    {isSourcing ? (
                                        <div className="flex flex-col items-center justify-center p-12 text-center w-full h-full">
                                            <div className="relative mb-8">
                                                <div className="w-24 h-24 border-[4px] border-bg-deep rounded-full"></div>
                                                <div className="w-24 h-24 border-[4px] border-accent-secondary rounded-full absolute top-0 left-0 animate-pulse"></div>
                                            </div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight">Sourcing Intelligence...</h3>
                                        </div>
                                    ) : (selectedBlock?.isRule) ? (
                                        <div className="flex flex-col items-center justify-center p-10 text-center h-full">
                                            <FileText size={48} className="text-text-muted mb-4 opacity-50" />
                                            <h4 className="font-bold uppercase tracking-widest text-text-muted">Specification Rule</h4>
                                            <p className="text-text-muted text-xs px-10">No cutsheet needed for rule blocks.</p>
                                        </div>
                                    ) : (() => {
                                        const blockData = selectedBlock?.blockKey ? selectedSpec?.metadata?.sourcedBlocks?.[selectedBlock.blockKey] : null;
                                        if (!blockData) return (
                                            <div className="flex flex-col items-center justify-center p-12 text-center h-full opacity-50">
                                                <Search size={32} className="mb-4" />
                                                <p className="text-sm uppercase tracking-widest font-bold">Select a block to source</p>
                                            </div>
                                        );

                                        const items = Array.isArray(blockData) ? blockData : [blockData];
                                        const currentItem = items[activeSubProductIndex] || items[0];
                                        // console.log("[Architect Debug] Current Product Item:", currentItem);

                                        const score = currentItem.complianceScore;
                                        const compPct = score != null ? Math.round(score * 100) : 0;
                                        const matched = currentItem.matchedRequirements || [];
                                        const scoreColor = compPct >= 80 ? "text-accent-secondary" : compPct >= 60 ? "text-amber-400" : "text-red-400";
                                        const scoreBg = compPct >= 80 ? "bg-accent-secondary/10 border-accent-secondary/20" : compPct >= 60 ? "bg-amber-400/10 border-amber-400/20" : "bg-red-400/10 border-red-400/20";
                                        const compLabel = compPct >= 80 ? "Spec Compliant" : compPct >= 60 ? "Needs Review" : "Likely Wrong Product";

                                        return (
                                            <div className="flex flex-col h-full overflow-hidden">
                                                {/* Streamlined Sourcing Header */}
                                                <div className="sourcing-clean-header flex flex-col gap-4">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`badge ${compPct >= 80 ? 'badge-green' : 'badge-orange'}`}>
                                                                    {compPct}% {compLabel}
                                                                </span>
                                                                <span className="text-[10px] uppercase font-black tracking-widest text-text-muted opacity-50">
                                                                    {currentItem.vendor || "Verified Source"}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-lg font-extrabold text-white tracking-tight uppercase leading-tight">
                                                                {selectedBlock?.blockTitle || "Product Review"}
                                                            </h3>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => setExpandedPdfUrl(currentItem.cutsheetUrl)}
                                                                className="btn-icon !w-9 !h-9 border-white/5 bg-white/5 hover:bg-white/10 transition-all"
                                                                title="Expand Preview"
                                                            >
                                                                <Maximize size={16} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Standardized Product Tabs (Matches Part 1/2/3 style) */}
                                                    {items.length > 1 && (
                                                        <div className="product-tab-grid">
                                                            {items.map((item, idx) => (
                                                                <div 
                                                                    key={idx}
                                                                    onClick={() => setActiveSubProductIndex(idx)}
                                                                    className={`item-card prism-card !w-20 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !p-1.5 ${activeSubProductIndex === idx ? 'active ring-2 ring-accent-primary' : 'hover:border-accent-primary/50'}`}
                                                                >
                                                                    <h4 className="font-bold text-[8px] uppercase opacity-70">ITEM {idx + 1}</h4>
                                                                    <span className="text-[8px] text-text-muted mt-0.5 uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis w-full">
                                                                        {item.productType?.split(' ')[0] || "Select"}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Simplified Architect Reasoning */}
                                                    <div className="architect-reasoning-block">
                                                        <div className="label">Architect Reasoning</div>
                                                        <p className="text-[11px] text-text-muted leading-relaxed font-medium italic">
                                                            "{currentItem.complianceReason || "This product matches the base requirements for this section."}"
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 bg-bg-deeper border-b border-border-subtle shadow-inner custom-scrollbar overflow-y-auto" style={{ maxHeight: '180px' }}>
                                                    <div className="px-5 py-3 flex justify-between items-center border-b border-white/5 opacity-80">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-accent-secondary shadow-[0_0_8px_rgba(0,255,163,0.5)]"></div>
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-secondary">Extraction Proof</span>
                                                        </div>
                                                        <span className="text-[8px] font-mono text-text-muted opacity-50 uppercase tracking-tighter">Verified against master spec</span>
                                                    </div>
                                                    <div className="p-4 flex flex-wrap gap-2">
                                                        {matched.map((r, i) => (
                                                            <div 
                                                                key={i} 
                                                                className="proof-tag animate-fade-in"
                                                                onMouseEnter={() => setHoveredRequirement(r)}
                                                            >
                                                                <CheckCircle2 size={10} />
                                                                <span>{r}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex-1 relative bg-black/10 flex flex-col">
                                                    {currentItem?.cutsheetUrl ? (
                                                        <iframe 
                                                            key={`${currentItem.cutsheetUrl}-${activeSubProductIndex}`}
                                                            src={`${currentItem.cutsheetUrl}#navpanes=0&toolbar=0&view=Fit&page=${(hoveredRequirement && currentItem.highlights?.[hoveredRequirement]?.[0]?.pageIndex + 1) || 1}`} 
                                                            className="w-full h-full border-none flex-1" 
                                                            title="Cutsheet Preview"
                                                        />
                                                    ) : (
                                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                                <FileSearch size={32} className="text-text-muted" />
                                                            </div>
                                                            <h4 className="font-bold text-white uppercase tracking-tight">Direct PDF Not Found</h4>
                                                            <p className="text-xs text-text-muted max-w-[200px] mt-2 italic leading-relaxed">
                                                                Architect confirmed product match via web data, but a direct cutsheet link was not extracted.
                                                            </p>
                                                            {currentItem?.pdpUrl && (
                                                                <a 
                                                                    href={currentItem.pdpUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="btn-secondary !py-2 !px-4 mt-6 scale-90 flex items-center gap-2"
                                                                >
                                                                    <ExternalLink size={14} />
                                                                    View Vendor Page
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
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
    );
};



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
        <ErrorBoundary>
            <>
            {expandedPdfUrl && ReactDOM.createPortal(
                <div 
                    id="pdf-lightbox-overlay"
                    style={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        width: '100vw', 
                        height: '100vh', 
                        zIndex: 99999, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        backdropFilter: 'blur(12px)',
                        padding: '12px'
                    }}
                    onClick={() => setExpandedPdfUrl(null)}
                >
                    <div 
                        style={{ 
                            backgroundColor: '#0a0b0e', 
                            width: '98%', 
                            height: '98%', 
                            borderRadius: '20px', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            boxShadow: '0 0 100px rgba(0,0,0,0.8)', 
                            overflow: 'hidden', 
                            display: 'flex', 
                            flexDirection: 'column',
                            position: 'relative',
                            animation: 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FileText style={{ color: '#ff6b00' }} size={24} />
                                <span style={{ fontWeight: 900, letterSpacing: '0.1em', fontSize: '14px', color: '#fff', textTransform: 'uppercase' }}>Expanded Document View</span>
                            </div>
                            <button 
                                onClick={() => setExpandedPdfUrl(null)}
                                style={{ height: '40px', width: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#fff', position: 'relative' }}>
                            <iframe 
                                src={`${expandedPdfUrl}#navpanes=0&toolbar=1&zoom=100`} 
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="Expanded PDF View"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
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
                        <button className={`rail-btn ${view === 'admin' ? 'active' : ''}`} title="Project Admin Center" onClick={() => { if(activeProject) setView('admin') }} disabled={!activeProject}>
                            <ShieldCheck size={20} />
                        </button>
                        <button className={`rail-btn ${view === 'tracker' ? 'active' : ''}`} title="Submittal Tracker Master Log" onClick={() => { if(activeProject) setView('tracker') }} disabled={!activeProject}>
                            <ClipboardCheck size={20} />
                        </button>
                    </nav>
                    <div className="rail-footer">
                        <button className="rail-btn" title="Help & Guides" onClick={() => window.open('https://docs.submittalarchitect.com')}><Settings size={20} /></button>
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
                    {view === 'admin' && renderAdmin()}
                    {view === 'tracker' && <TrackerView 
                        projectData={projectData} 
                        activeProject={activeProject} 
                        onNavigateToSection={(section) => {
                            if (section.division_id && projectData?.divisions) {
                                setSelectedDivision(projectData.divisions.find(d => d.id === section.division_id));
                            }
                            setSelectedSpec(section);
                            setView('workbench');
                        }} 
                    />}
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

            {/* PDF Lightbox Modal */}
        </>
      </ErrorBoundary>
    );
}

export default App
