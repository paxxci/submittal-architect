import React, { useState } from 'react'
import {
    LayoutDashboard, FileSearch, ClipboardCheck, 
    Settings, Bell, Search, ChevronRight, 
    MoreHorizontal, CheckCircle2, Clock, 
    ArrowUpRight, Plus, Box, ShieldCheck,
    FileText, ExternalLink, Briefcase, Building2
} from 'lucide-react'
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
const FormattedSpecText = ({ text, specId, partId, completedBlocks, onToggleBlock }) => {
    const [activeBlock, setActiveBlock] = useState(null);
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
                const blockId = `${specId}-${partId}-${blockIdx}`;
                const isCompleted = completedBlocks?.includes(blockId);
                
                return (
                    <div 
                        key={blockId} 
                        className={`spec-block prism-card cursor-pointer transition-all p-4 relative ${
                            isCompleted ? 'border-accent-secondary bg-accent-secondary/10 shadow-[0_0_15px_rgba(0,255,163,0.1)]' : ''
                        } ${
                            activeBlock === blockIdx && !isCompleted ? 'ring-2 ring-accent-primary bg-accent-primary/5' : 
                            !isCompleted ? 'hover:border-accent-primary/50 hover:translate-y-[-2px]' : ''
                        }`}
                        onClick={() => {
                            setActiveBlock(blockIdx);
                            if (onToggleBlock) onToggleBlock(blockId);
                        }}
                    >
                        {/* Completion Checkmark Widget */}
                        <div className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors">
                            {isCompleted ? (
                                <CheckCircle2 size={24} className="text-accent-secondary" />
                            ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-border-subtle hover:border-accent-primary transition-colors"></div>
                            )}
                        </div>

                        <div className="pr-8"> {/* Padding to avoid checkmark overlap */}
                            {blockLines.map((line, lineIdx) => {
                                const trimmed = line.trim();
                                let indentClass = "base-text";
                                
                                // Header: 2.02 WIRING CONNECTORS
                                if (/^[1-3]\.[0-9]{2}/.test(trimmed)) {
                                    indentClass = `indent-level-0 font-extrabold pb-2 mb-2 border-b border-border-subtle uppercase tracking-wide ${isCompleted ? 'text-accent-secondary' : 'text-accent-primary'}`;
                                }
                                // Matches A., B., C. 
                                else if (/^[A-Z]\./.test(trimmed)) {
                                    indentClass = "indent-level-1";
                                }
                                // Matches 1., 2., 3.
                                else if (/^[0-9]+\./.test(trimmed)) {
                                    indentClass = "indent-level-2";
                                }
                                // Matches a., b., c.
                                else if (/^[a-z]\./.test(trimmed)) {
                                    indentClass = "indent-level-3";
                                }
                                // Matches simple bullets
                                else if (/^-/.test(trimmed)) {
                                    indentClass = "indent-level-4";
                                }

                                return (
                                    <div key={lineIdx} className={indentClass}>
                                        {trimmed}
                                    </div>
                                );
                            })}
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
    const [projectData, setProjectData] = useState(MOCK_PROJECT)
    const [selectedSpec, setSelectedSpec] = useState(projectData?.recentItems?.[0] || null)
    const [selectedPart, setSelectedPart] = useState('part2') // part1, part2, part3
    const [completedBlocks, setCompletedBlocks] = useState([]) // Array of block IDs like "260533-part2-1"
    const [sectionResponsibility, setSectionResponsibility] = useState({}) // Mapping of specId -> 'SELF', 'VENDOR', 'NA'
    const [isShredding, setIsShredding] = useState(false)
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
    const [newProjectStep, setNewProjectStep] = useState(1)
    const [customDivisionInput, setCustomDivisionInput] = useState('')
    
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
            id: s.id,
            title: s.title,
            type: 'Spec',
            match: s.isElectrical ? 98 : 40, // Mock confidence
            part1: s.part1 || "No Part 1 content found.",
            part2: {
                // To do: AI Extraction Engine (Next Phase)
                extractedSpecs: [
                    { trait: "Data Source", value: "Raw PDF Shredder", verified: false }
                ],
                insight: "AI extraction module running... displaying raw shred output.",
                rawText: s.part2 || "No Part 2 content found."
            },
            part3: s.part3 || "No Part 3 content found."
        }))
    }

    const runAIShredder = async () => {
        setIsNewProjectModalOpen(false) // Close modal if open
        setView('workbench') // Force shift to workbench
        
        // Brief artificial delay for UI transition feel before locking thread
        setTimeout(async () => {
            setIsShredding(true)
            try {
                const res = await fetch('http://localhost:3001/api/shred')
                const data = await res.json()
                if (data.success && data.sections.length > 0) {
                    
                    // Client-side filtering based on User's Step 3 choices
                    const selectedDivisionPrefixes = [
                        ...Object.keys(newProjectData.divisions).filter(k => newProjectData.divisions[k]),
                        ...newProjectData.customDivisions
                    ];

                    const filteredSections = data.sections.filter(s => {
                        // Check if it matches a selected division explicitly
                        const matchesExplicit = selectedDivisionPrefixes.some(prefix => s.id.startsWith(prefix));
                        // Check if Semantic Discovery (auto-detect) caught it
                        const matchesSemantic = newProjectData.autoDetect && s.isElectrical;
                        return matchesExplicit || matchesSemantic;
                    });

                    const uiItems = mapShreddedDataToUI(filteredSections)
                    
                    // Update the project name if they filled it out in the wizard
                    const finalProjectName = newProjectData.name || MOCK_PROJECT.name
                    const finalClientName = newProjectData.client || MOCK_PROJECT.client
                    
                    // Dynamically map found divisions
                    const divisionMap = {};
                    uiItems.forEach(item => {
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
                    const newDivisions = Object.values(divisionMap).sort((a, b) => a.id.localeCompare(b.id));

                    const updatedProjectData = {
                        ...activeProject || MOCK_PROJECT,
                        name: finalProjectName,
                        client: finalClientName,
                        progress: 0,
                        daysLeft: 14,
                        divisions: newDivisions,
                        recentItems: uiItems
                    };

                    setProjectData(updatedProjectData)
                    setActiveProject(updatedProjectData)
                    setSelectedDivision(newDivisions[0]) // Fix: Auto-select division so loading screen goes away
                    setSelectedSpec(uiItems[0]) // Select first parsed item
                }
            } catch (err) {
                console.error("Failed to run shredder:", err)
            } finally {
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
                            
                            <div 
                                className={`upload-zone ${newProjectData.fileLoaded ? 'loaded' : ''}`}
                                onClick={() => setNewProjectData({...newProjectData, fileLoaded: true})}
                            >
                                {newProjectData.fileLoaded ? (
                                    <>
                                        <div className="upload-icon">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h4 style={{fontWeight: 700, color: 'var(--accent-secondary)'}}>0. Electrical Specifications.pdf</h4>
                                        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>412 Pages • 14.2 MB • Ready to shred</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="upload-icon">
                                            <FileSearch size={32} />
                                        </div>
                                        <h4 style={{fontWeight: 700}}>Click or Drag PDF here</h4>
                                        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>Supports CSI MasterFormat PDFs up to 500MB</p>
                                    </>
                                )}
                            </div>

                            <div className="modal-actions between">
                                <button style={{fontSize: '14px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer'}} onClick={() => setNewProjectStep(1)}>Back</button>
                                <button 
                                    className="btn-primary"
                                    style={{opacity: newProjectData.fileLoaded ? 1 : 0.5, cursor: newProjectData.fileLoaded ? 'pointer' : 'not-allowed'}}
                                    onClick={() => newProjectData.fileLoaded && setNewProjectStep(3)}
                                    disabled={!newProjectData.fileLoaded}
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

    const toggleBlockCompletion = (blockId) => {
        setCompletedBlocks(prev => {
            if (prev.includes(blockId)) {
                return prev.filter(id => id !== blockId);
            } else {
                return [...prev, blockId];
            }
        });
    };

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
                // Account for documents that start without a CSI header
                totalBlocks++; 
                isFirstLine = false;
            }
        });

        if (totalBlocks === 0) return 0;

        let completedCount = 0;
        for (let i = 0; i < totalBlocks; i++) {
            if (completedBlocks.includes(`${specId}-${partId}-${i}`)) {
                completedCount++;
            }
        }
        return Math.round((completedCount / totalBlocks) * 100);
    };

    const renderPortfolio = () => (
        <div className="portfolio-root animate-fade-in p-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">My Projects</h1>
                    <p className="text-text-muted">Manage all active submittal packages across your portfolio.</p>
                </div>
                <button className="btn-primary" onClick={() => setIsNewProjectModalOpen(true)}>
                    <Plus size={16} className="inline mr-2" /> New Project
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_PORTFOLIO.map((proj, i) => (
                    <div 
                        key={i} 
                        className="prism-card hover:border-accent-primary/50 cursor-pointer transition-all hover:translate-y-[-2px]"
                        onClick={() => {
                            setActiveProject(proj);
                            // If it's the mock Tower A, load its data, otherwise fake empty
                            setProjectData(proj.id === MOCK_PROJECT.id || !proj.id ? MOCK_PROJECT : proj);
                            setView('dashboard');
                        }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-bg-deep rounded-lg border border-border-subtle">
                                <Building2 size={24} className="text-accent-secondary" />
                            </div>
                            <span className="badge badge-orange font-bold">In Progress</span>
                        </div>
                        <h3 className="text-lg font-bold mb-1 line-clamp-1">{proj.name}</h3>
                        <p className="text-sm text-text-muted mb-6">{proj.client}</p>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                                <span>{proj.progress}% Compiled</span>
                                <span className={proj.daysLeft < 7 ? "text-accent-primary" : "text-text-muted"}>
                                    {proj.daysLeft} days left
                                </span>
                            </div>
                            <div className="h-2 w-full bg-bg-deep rounded-full overflow-hidden border border-border-subtle">
                                <div className="h-full bg-accent-secondary glow-orange transition-all duration-1000" style={{width: `${proj.progress}%`}}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    const renderDashboard = () => (
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
                <h2 className="text-lg font-bold mb-4 px-2">Project Divisions</h2>
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
    )

    const renderWorkbench = () => {
        if (!selectedDivision) return (
            <div className="workbench-root animate-fade-in flex items-center justify-center">
                <div className="text-center text-text-muted">
                    <FileSearch size={48} className="mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-bold mb-2">Generating View...</h2>
                    <p>Processing division data, please wait.</p>
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
                    {(projectData.recentItems || []).filter(item => item.id.startsWith(selectedDivision?.id)).map(item => {
                        const p1Progress = calculatePartProgress(item, 'part1');
                        const p2Progress = calculatePartProgress(item, 'part2');
                        const p3Progress = calculatePartProgress(item, 'part3');
                        
                        return (
                        <div 
                            key={item.id} 
                            className={`item-card prism-card cursor-pointer transition-all ${selectedSpec?.id === item.id ? 'active ring-2 ring-accent-primary' : 'hover:border-accent-primary/50'}`}
                            onClick={() => setSelectedSpec(item)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-text-muted font-mono bg-black/20 px-2 py-1 rounded">{item.id}</span>
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
                                        <button className="btn-primary px-8">Upload Files</button>
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
                                                    onToggleBlock={toggleBlockCompletion}
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

                        {/* PDF Preview Side */}
                        <div className="pdf-preview-prism h-full flex flex-col">
                            <div className="flex justify-between items-center p-3 border-b border-border-subtle shrink-0">
                                <span className="text-xs font-bold text-text-muted"><FileText size={12} className="inline mr-1" /> CUTSHEET_V1.PDF</span>
                                <ExternalLink size={12} className="text-text-muted" />
                            </div>
                                <div className="pdf-canvas flex-1 relative">
                                    <div className="highlight-box absolute top-1/4 left-1/4">3/4" x 8'</div>
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
                ) : (
                    <div className="workbench-main prism-card flex flex-col items-center justify-center text-text-muted h-full">
                        <FileSearch size={48} className="mb-4 opacity-50" />
                        <h3 className="text-lg font-bold">Select a specification section</h3>
                        <p className="text-sm">Run the AI Shredder to extract data from the PDF</p>
                    </div>
                )}
            </div>
        </div>
        )
    }

    return (
        <>
            <div className="app-shell bg-bg-deep">
                {/* Nav Rail */}
                <aside className="nav-rail">
                    <div className="logo-area">
                        <div className="logo-prism">SA</div>
                    </div>
                    <nav className="rail-icons">
                        <button className={`rail-btn ${view === 'portfolio' ? 'active' : ''}`} onClick={() => { 
                            setView('portfolio'); 
                            setActiveProject(null); 
                            setSelectedDivision(null);
                            setSelectedSpec(null);
                        }}>
                            <Briefcase size={20} />
                        </button>
                        <button className={`rail-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => { if(activeProject) setView('dashboard') }} disabled={!activeProject}>
                            <LayoutDashboard size={20} />
                        </button>
                        <button className={`rail-btn ${view === 'workbench' ? 'active' : ''}`} onClick={() => { if(selectedDivision) setView('workbench') }} disabled={!selectedDivision}>
                            <FileSearch size={20} />
                        </button>
                        <button className="rail-btn"><ClipboardCheck size={20} /></button>
                    </nav>
                    <div className="rail-footer">
                        <button className="rail-btn"><Settings size={20} /></button>
                        <div className="user-avatar"></div>
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
                    {view === 'workbench' && renderWorkbench()}
                </main>
            </div>
            
            {renderNewProjectModal()}
        </>
    )
}

export default App
