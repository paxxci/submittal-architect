import React, { useState, useEffect, useRef, useMemo } from 'react'
// UI_SYNC_REFRESH: v2.0.8 - Master Header Isolation & Cache Break
import {
    LayoutDashboard, FileSearch, ClipboardCheck, 
    Settings, Bell, Search, ChevronRight, 
    MoreHorizontal, CheckCircle2, Clock, 
    ArrowUpRight, Plus, Box, ShieldCheck,
    FileText, ExternalLink, Briefcase, Building2, Trash, Maximize, X, Globe,
    Bot, Loader2, FileUp, Users, ShoppingBag, ArrowUp, ArrowDown, Zap, Mail, Phone
} from 'lucide-react'
import { supabase } from './supabase'
import ReactDOM from 'react-dom'
import NewProjectModal from './components/NewProjectModal';
import WorkbenchView from './components/WorkbenchView';
import FormattedSpecText from './components/FormattedSpecText';
import TrackerView from './TrackerView';
import ErrorBoundary from './ErrorBoundary';
import AdminMasterAdmin from './components/AdminMasterAdmin';
import DeleteProjectPlusModal from './components/DeleteProjectPlusModal';
import './App.css';

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

function App() {
    const [view, setView] = useState('portfolio') // portfolio, dashboard, workbench, settings
    const [projectManagers, setProjectManagers] = useState([]);
    const [companyTemplates, setCompanyTemplates] = useState([])
    const [activeProject, setActiveProject] = useState(null)
    const [selectedDivision, setSelectedDivision] = useState(null)
    const [projectData, setProjectData] = useState(null)
    const [portfolio, setPortfolio] = useState([]) // Real projects from Supabase
    const [isPortfolioLoading, setIsPortfolioLoading] = useState(true) // Tracks initial fetch state
    const [selectedSpec, setSelectedSpec] = useState(null)
    const [selectedPart, setSelectedPart] = useState('part2') // part1, part2, part3
    const [completedBlocks, setCompletedBlocks] = useState([]) // Array of block IDs like "260533-part2-1"
    const [naBlocks, setNaBlocks] = useState([]) // Array of block IDs explicitly marked as N/A
    const [sectionResponsibility, setSectionResponsibility] = useState({}) // Mapping of specId -> 'SELF', 'VENDOR', 'NA'
    const [shredJobId, setShredJobId] = useState(null)
    const [shredProgress, setShredProgress] = useState(0)
    const [shredStatusMsg, setShredStatusMsg] = useState('Initializing...')
    const [isShredding, setIsShredding] = useState(false)
    const [activeSourcingBlockId, setActiveSourcingBlockId] = useState(null)
    const [sourcingProgressPct, setSourcingProgressPct] = useState(0)
    const [selectedBlock, setSelectedBlock] = useState(null) // { blockKey, blockTitle, blockLines, blockIdx }
    const [pdfAlignmentOffset, setPdfAlignmentOffset] = useState(0) // Tracks vertical offset for PDF viewer side-by-side alignment
    const [hoveredRequirement, setHoveredRequirement] = useState(null) // Tracks hovered matched requirement for UI X-Ray
    const [expandedPdfUrl, setExpandedPdfUrl] = useState(null) // Allows fullscreen PDF viewing
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
    const [newProjectStep, setNewProjectStep] = useState(1)
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveredSections, setDiscoveredSections] = useState([]);
    const [customDivisionInput, setCustomDivisionInput] = useState('');
    const [selectedSectionsForParsing, setSelectedSectionsForParsing] = useState(new Set())
    const [vendors, setVendors] = useState(['Platt', 'Hubbell', 'North Coast'])
    const [authorizedVendors, setAuthorizedVendors] = useState(['Platt Electric', 'CED', 'Graybar'])
    const [manufacturers, setManufacturers] = useState(['Hubbell', 'Leviton', 'Eaton'])
    const [preferredWebsites, setPreferredWebsites] = useState(['hubbell.com', 'platt.com', 'graybar.com'])
    const [activeSubProductIndex, setActiveSubProductIndex] = useState(0) // Tracks which item in a multi-product stack is visible

    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
    const [addSectionData, setAddSectionData] = useState({ sectionNumber: '', title: '', rawText: '' })
    const [addSectionSaving, setAddSectionSaving] = useState(false)

    const [companyInfo, setCompanyInfo] = useState({
        name: 'Submittal Architect Corp',
        address: '123 Skyway Ave, Suite 500',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103',
        phone: '(555) 0199-2342',
        email: 'admin@submittalarch.com',
        website: 'www.submittalarchitect.com'
    });
    const [isAddingPM, setIsAddingPM] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleUpdateProjectAdmin = async (updates) => {
        if (!activeProject) return;
        
        const mergedMetadata = {
            ...(activeProject.metadata || {}),
            ...(updates.metadata || {}),
        };

        if (!mergedMetadata.sourcing_prefs) {
            mergedMetadata.sourcing_prefs = {
                vendors,
                authorizedVendors,
                manufacturers,
                preferred_websites: preferredWebsites
            };
        }

        const { error } = await supabase
            .from('projects')
            .update({ ...updates, metadata: mergedMetadata })
            .eq('id', activeProject.id);
        
        if (error) {
            console.error('Error updating project admin:', error);
        } else {
            const { data } = await supabase.from('projects').select('*').eq('id', activeProject.id).single();
            if (data) {
                setActiveProject(data);
                setPortfolio(prev => prev.map(p => p.id === data.id ? data : p));
            }
        }
    };

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
        return { part1: text.trim(), part2: '', part3: '' };
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
                confidence_score: 1.0
            };

            const { data, error } = await supabase.from('spec_sections').insert([record]).select();
            if (error) throw error;

            const dbRecord = data && data[0] ? data[0] : null;
            const newItem = {
                id: addSectionData.sectionNumber,
                dbId: dbRecord ? dbRecord.id : null,
                title: addSectionData.title,
                type: 'Spec',
                match: 100,
                part1: part1,
                part2: part2,
                part3: part3,
                metadata: {
                    part1: part1,
                    part2: part2,
                    part3: part3,
                    responsibility: 'SELF'
                }
            };

            setProjectData(prev => {
                const currentItems = prev?.recentItems || [];
                const updatedItems = [...currentItems, newItem];
                return {
                    ...(prev || {}),
                    recentItems: updatedItems,
                    divisions: deriveDivisions(updatedItems)
                };
            });

            setAddSectionData({ sectionNumber: '', title: '', rawText: '' });
            setIsAddSectionModalOpen(false);
        } catch (err) {
            console.error('Failed to save manual section:', err);
            alert('Error saving section: ' + err.message);
        } finally {
            setAddSectionSaving(false);
        }
    };

    useEffect(() => {
        const fetchGlobalAndPortfolio = async () => {
            const { data: projects, error: pError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (projects) setPortfolio(projects);
            if (pError) console.error('Error fetching projects:', pError);

            const { data: pms, error: pmError } = await supabase
                .from('project_managers')
                .select('*')
                .order('name', { ascending: true });
            
            if (pms) setProjectManagers(pms);
            if (pmError) console.error('Error fetching PMs:', pmError);

            const { data: templates, error: tError } = await supabase
                .from('templates')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (templates) setCompanyTemplates(templates);
            if (tError) console.error('Error fetching templates:', tError);

            const { data: info, error: iError } = await supabase
                .from('company_info')
                .select('*')
                .eq('id', '00000000-0000-0000-0000-000000000000')
                .single();
            
            if (info) setCompanyInfo(info);
            if (iError && iError.code !== 'PGRST116') console.error('Error fetching company info:', iError);
            setIsPortfolioLoading(false);
        }
        fetchGlobalAndPortfolio();
    }, []);

    const loadProjectData = async (project, divisionFilter, preserveState = false) => {
        const { data: sections } = await supabase
            .from('spec_sections')
            .select('*')
            .eq('project_id', project.id);

        if (!sections) return;

        const prefs = project.metadata?.sourcing_prefs;
        if (prefs) {
            if (prefs.vendors) setVendors(prefs.vendors);
            if (prefs.authorizedVendors) setAuthorizedVendors(prefs.authorizedVendors);
            if (prefs.manufacturers) setManufacturers(prefs.manufacturers);
        }

        const allCompleted = [];
        const allNA = [];
        const responsibilityMap = {};

        sections.forEach(s => {
            if (s.metadata?.completed_blocks) allCompleted.push(...s.metadata.completed_blocks);
            if (s.metadata?.na_blocks) allNA.push(...s.metadata.na_blocks);
            responsibilityMap[s.section_id || s.id] = s.responsibility || 'SELF';
        });

        setCompletedBlocks(allCompleted);
        setNaBlocks(allNA);
        setSectionResponsibility(responsibilityMap);

        const savedDivisions = project.metadata?.selected_divisions;
        const activeFilter = divisionFilter || savedDivisions || null;

        const filteredSections = (sections && activeFilter && Array.isArray(activeFilter))
            ? sections.filter(s => activeFilter.some(d => s.section_number?.replace(/\s/g,'').startsWith(d)))
            : (sections || []);

        const uiItems = mapShreddedDataToUI(filteredSections);

        const updatedData = {
            ...project,
            recentItems: uiItems,
            divisions: deriveDivisions(uiItems)
        };
        setProjectData(updatedData);
        
        if (!preserveState) {
            setSelectedDivision(updatedData.divisions[0] || null);
            setSelectedSpec(uiItems[0] || null);
        } else if (selectedSpec) {
             const refreshedSpec = uiItems.find(i => i.id === selectedSpec?.id);
             if (refreshedSpec) setSelectedSpec(refreshedSpec);
        }
    };

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
    
    const handleUpdateSectionResponsibility = async (sectionDbId, responsibility, vendorName = null) => {
        // 1. Optimistic Local State Update for Workbench Sync
        setSectionResponsibility(prev => ({
            ...prev,
            [sectionDbId]: responsibility
        }));

        setProjectData(prev => {
            if (!prev) return prev;
            const updatedItems = (prev.recentItems || []).map(item => 
                item.dbId === sectionDbId ? { ...item, responsibility, assigned_to: vendorName } : item
            );
            return { ...prev, recentItems: updatedItems };
        });

        // 2. Database Update
        try {
            await supabase
                .from('spec_sections')
                .update({ 
                    responsibility, 
                    vendor_name: vendorName 
                })
                .eq('id', sectionDbId);
        } catch (err) {
            console.error('Fatal Exception during responsibility update:', err);
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
            
            const section = selectedSpec;
            if (!section) { console.warn('No section selected!'); return; }

            const specTextForAI = blockLines || (typeof section.part2 === 'object' ? section.part2?.rawText : section.part2) || blockTitle || '';
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
                // Include user-defined search preferences from project metadata
                const preferredWebsites = activeProject?.metadata?.preferred_websites || [];
                const prefs = JSON.stringify({ vendors, brands: manufacturers, preferredWebsites });
                const params = new URLSearchParams({
                    query: fallbackQuery,
                    sectionTitle: blockTitle || section.title,
                    specText: specTextForAI.slice(0, 3000),
                    prefs
                });
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
                        })
                        .eq('id', section.dbId);

                } else if (data.reason === 'no_product') {
                    setSelectedBlock(prev => prev ? { ...prev, isRule: true } : prev);
                } else {
                    const reason = data.error || data.message || `No direct PDF match found for "${blockTitle || section.title}".`;
                    const failedStub = {
                        complianceScore: 0,
                        productType: "Not Found",
                        vendor: "Search Engine",
                        complianceReason: reason,
                        cutsheetUrl: null,
                        matchedRequirements: []
                    };
                    
                    const activeBlockKey = blockKey || blockTitle || blockId;
                    setSelectedSpec(prev => ({
                        ...prev,
                        metadata: {
                            ...prev?.metadata,
                            sourcedBlocks: {
                                ...(prev?.metadata?.sourcedBlocks || {}),
                                [activeBlockKey]: failedStub
                            }
                        }
                    }));
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
    }, [vendors, manufacturers, projectData, selectedSpec, selectedDivision, activeProject]);

    const isSourcing = activeSourcingBlockId === selectedSpec?.id;

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

    const mapShreddedDataToUI = (sections) => {
        if (!sections || !Array.isArray(sections)) return [];
        return sections.map(s => {
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
                aiBlockMap,
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

    const deleteProject = async (proj, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!proj.id) {
            alert("Cannot delete this project - it does not have a valid database ID.");
            return;
        }

        // Inline confirmation handled by the caller (Two-Step Pattern)

        try {
            console.log(`[Lifecycle] Attempting to delete project: ${proj.id} (${proj.name})`);
            const { data: deletedProj, error: projError } = await supabase
                .from('projects')
                .delete()
                .eq('id', proj.id)
                .select();
            
            if (projError) {
                console.error("Supabase Deletion Error:", projError);
                throw new Error(projError.message || "Database rejected the request. Ensure cascading deletes are enabled in Supabase.");
            }
            
            if (!deletedProj || deletedProj.length === 0) {
                console.warn("Supabase returned empty result for deletion. This often means RLS is blocking the DELETE or the ID was not found.");
                throw new Error("Supabase rejected the deletion. Check Row Level Security (RLS) policies.");
            }
            
            console.log(`[Lifecycle] Project ${proj.id} deleted successfully.`);
            
            // Clear UI state
            setPortfolio(prev => prev.filter(p => p.id !== proj.id));
            if (activeProject?.id === proj.id) {
                setActiveProject(null);
                setProjectData(null);
                setView('portfolio');
            }
            
            alert("Project and all associated data deleted successfully.");
        } catch (err) {
            console.error("Delete operation failed:", err);
            alert('Failed to delete project: ' + (err.message || 'Unknown error. Check console and ensure you ran the SQL cascade script.'));
        }
    };

    const handleUpdateCompanyInfo = async (updates) => {
        const newInfo = { ...companyInfo, ...updates, id: '00000000-0000-0000-0000-000000000000' };
        setCompanyInfo(newInfo);
        
        const { error } = await supabase
            .from('company_info')
            .upsert(newInfo);
            
        if (error) console.error("Error saving company info:", error);
    };

    const handleUploadTemplate = async (file) => {
        const mockUrl = URL.createObjectURL(file);
        const { data, error } = await supabase
            .from('templates')
            .insert([{ name: file.name, file_url: mockUrl, metadata: { type: 'cover_page' } }])
            .select();
        if (data) setCompanyTemplates(prev => [data[0], ...prev]);
        if (error) console.error('Error uploading template:', error);
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

            {isPortfolioLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => (
                        <div key={i} className="prism-card animate-pulse h-48 border-white/5 bg-white/[0.02]"></div>
                    ))}
                </div>
            ) : portfolio.length === 0 ? (
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
    );

    const renderCompanyAdmin = () => {
        return (
            <div className="admin-container animate-fade-in p-12 max-w-7xl mx-auto pb-32">
                <div className="px-4" style={{ marginBottom: '1rem' }}>
                    <div>
                        <h1 
                            className="text-4xl font-black tracking-tighter italic uppercase"
                            style={{ marginBottom: '0px' }}
                        >
                            COMPANY <span className="text-accent-primary">INFO</span>
                        </h1>
                        <p className="text-text-muted font-black uppercase tracking-[0.3em] text-[11px] opacity-60">
                            <span className="text-accent-primary mr-3 text-lg font-black leading-none">/</span> CENTRALIZE YOUR ORGANIZATION'S GLOBAL IDENTITY AND TEAM STANDARDS.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-7 space-y-8">
                        <div className="prism-card p-8 border-white/5 bg-bg-surface/30 shadow-2xl">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-primary mb-8 flex items-center gap-3">
                                <Building2 size={14} /> Corporate Identity
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-2">Company Name</label>
                                    <input type="text" className="prism-input w-full" value={companyInfo.name} onChange={(e) => handleUpdateCompanyInfo({ name: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-2">Office Address</label>
                                    <input type="text" className="prism-input w-full" value={companyInfo.address} onChange={(e) => handleUpdateCompanyInfo({ address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-2">Contact Email</label>
                                    <input type="text" className="prism-input w-full" value={companyInfo.email} onChange={(e) => handleUpdateCompanyInfo({ email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-2">Phone</label>
                                    <input type="text" className="prism-input w-full" value={companyInfo.phone} onChange={(e) => handleUpdateCompanyInfo({ phone: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="prism-card p-1 overflow-hidden group border-accent-secondary/10 shadow-2xl">
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-black flex items-center gap-4 uppercase italic">
                                        Team Directory
                                    </h3>
                                    <button onClick={() => setIsAddingPM(true)} className="btn-primary !text-[10px] !py-2.5 !px-5 uppercase tracking-widest font-black">
                                        <Plus size={14} className="mr-2" /> Add Manager
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {projectManagers.map(pm => (
                                        <div key={pm.id} className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-accent-primary/40 transition-all group">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent-primary/20 flex items-center justify-center font-black text-accent-primary text-lg">
                                                    {pm.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-black text-sm italic uppercase">{pm.name}</div>
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-text-muted">Project Manager</div>
                                                </div>
                                            </div>
                                            <div className="text-[11px] font-bold text-text-muted flex flex-col gap-1">
                                                <div className="flex items-center gap-2"><Mail size={12} className="opacity-40" /> {pm.email}</div>
                                                <div className="flex items-center gap-2"><Phone size={12} className="opacity-40" /> {pm.phone}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-5 space-y-8">
                        <div className="prism-card p-8 border-accent-secondary/20 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                                <FileText size={120} />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-secondary mb-8 flex items-center gap-3">
                                <FileText size={14} /> Output Standard
                            </h3>
                            <div className="prism-card bg-bg-deep border-dashed border-white/10 p-10 text-center mb-6 hover:border-accent-secondary/40 transition-colors cursor-pointer" onClick={() => document.getElementById('template-upload').click()}>
                                <input id="template-upload" type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files[0] && handleUploadTemplate(e.target.files[0])} />
                                <FileUp size={28} className="mx-auto text-accent-secondary mb-4" />
                                <h4 className="font-black text-sm uppercase italic">Upload Cover Template</h4>
                            </div>
                            {companyTemplates.map(tpl => (
                                <div key={tpl.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                    <div className="font-bold text-xs uppercase italic">{tpl.name}</div>
                                    <button className="text-text-muted hover:text-red-400" onClick={() => handleDeleteTemplate(tpl.id)}><Trash size={14} /></button>
                                </div>
                            ))}
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
                const sectionsParam = selectedSectionsForParsing.size > 0 ? `&selectedSections=${Array.from(selectedSectionsForParsing).join(',')}` : '';
                const res = await fetch(`http://localhost:3001/api/shred?projectId=${project.id}&pdfPath=${encodeURIComponent(newProjectData.pdfPath)}${sectionsParam}`)
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
                        <button className={`rail-btn ${view === 'portfolio' ? 'active' : ''}`} onClick={() => { 
                            setView('portfolio'); 
                            setActiveProject(null); 
                            setSelectedDivision(null);
                            setSelectedSpec(null);
                        }}>
                            <Briefcase size={20} />
                            <span className="rail-label">All Projects</span>
                        </button>

                        {/* ACTIVE PROJECT WORKFLOW */}
                        <div className="mb-4 mt-6">
                            <h4 className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] px-3 mb-4 opacity-50">Workflow</h4>
                            <button className={`rail-btn mb-2 ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
                                <LayoutDashboard size={20} />
                                <span className="rail-label">Dashboard</span>
                            </button>
                            <button className={`rail-btn mb-2 ${view === 'workbench' ? 'active' : ''}`} onClick={() => setView('workbench')}>
                                <FileSearch size={20} />
                                <span className="rail-label">AI Workbench</span>
                            </button>
                            <button className={`rail-btn mb-2 ${view === 'tracker' ? 'active' : ''}`} onClick={() => setView('tracker')}>
                                <Zap size={20} />
                                <span className="rail-label">Master Tracker</span>
                            </button>
                        </div>

                        {/* ADMINISTRATION & SETTINGS */}
                        <div className="mt-auto pt-8 border-t border-white/5">
                            <h4 className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] px-3 mb-4 opacity-50">Admin</h4>
                            <button className={`rail-btn mb-2 ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
                                <ShieldCheck size={20} />
                                <span className="rail-label">Project Admin</span>
                            </button>
                            <button className={`rail-btn mb-2 ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
                                <Building2 size={20} />
                                <span className="rail-label">Company Info</span>
                            </button>
                        </div>
                    </nav>
                    <div className="rail-footer">
                        <button className="rail-btn" onClick={() => window.open('https://docs.submittalarchitect.com')}>
                            <Settings size={20} />
                            <span className="rail-label">Help & Docs</span>
                        </button>
                        <div className="flex items-center gap-4 px-4 py-4 mt-2 border-t border-white/5">
                            <div className="user-avatar" title="User Profile"></div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-white">Guest User</span>
                                <span className="text-[9px] text-text-muted uppercase tracking-widest">Enterprise</span>
                            </div>
                        </div>
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
                    {view === 'settings' && renderCompanyAdmin()}
                    {view === 'dashboard' && renderMainContent()}
                    {view === 'workbench' && (
                        <WorkbenchView 
                            projectData={projectData}
                            activeProject={activeProject}
                            selectedDivision={selectedDivision}
                            setSelectedDivision={setSelectedDivision}
                            selectedSpec={selectedSpec}
                            setSelectedSpec={setSelectedSpec}
                            selectedPart={selectedPart}
                            setSelectedPart={setSelectedPart}
                            sectionResponsibility={sectionResponsibility}
                            setSectionResponsibility={setSectionResponsibility}
                            completedBlocks={completedBlocks}
                            naBlocks={naBlocks}
                            toggleBlockCompletion={toggleBlockCompletion}
                            selectedBlock={selectedBlock}
                            setSelectedBlock={setSelectedBlock}
                            activeSubProductIndex={activeSubProductIndex}
                            setActiveSubProductIndex={setActiveSubProductIndex}
                            isSourcing={isSourcing}
                            sourcingProgressPct={sourcingProgressPct}
                            isShredding={isShredding}
                            shredStatusMsg={shredStatusMsg}
                            shredProgress={shredProgress}
                            onAddSection={() => {
                                setAddSectionData(p => ({ ...p, sectionNumber: selectedDivision?.id ? `${selectedDivision.id} ` : '' }));
                                setIsAddSectionModalOpen(true);
                            }}
                            setExpandedPdfUrl={setExpandedPdfUrl}
                            handleVendorUpload={handleVendorUpload}
                            setView={setView}
                        />
                    )}

                    {view === 'admin' && (
                        <AdminMasterAdmin 
                            setActiveProject={setActiveProject}
                            activeProject={activeProject}
                            authorizedVendors={authorizedVendors}
                            authorizedBrands={manufacturers}
                            preferredWebsites={preferredWebsites}
                            projectManagers={projectManagers}
                            onUpdateProjectAdmin={handleUpdateProjectAdmin}
                            setAuthorizedVendors={setAuthorizedVendors}
                            setPreferredWebsites={setPreferredWebsites}
                            setView={setView}
                            setIsDeleteModalOpen={setIsDeleteModalOpen}
                        />
                    )}
                    {view === 'tracker' && <TrackerView 
                        projectData={projectData} 
                        activeProject={activeProject} 
                        onUpdateSection={handleUpdateSectionResponsibility}
                        onRefreshData={() => loadProjectData(activeProject, null, true)}
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
            
            <NewProjectModal 
                isOpen={isNewProjectModalOpen}
                onClose={() => setIsNewProjectModalOpen(false)}
                newProjectData={newProjectData}
                setNewProjectData={setNewProjectData}
                newProjectStep={newProjectStep}
                setNewProjectStep={setNewProjectStep}
                isDiscovering={isDiscovering}
                setIsDiscovering={setIsDiscovering}
                discoveredSections={discoveredSections}
                setDiscoveredSections={setDiscoveredSections}
                selectedSectionsForParsing={selectedSectionsForParsing}
                setSelectedSectionsForParsing={setSelectedSectionsForParsing}
                customDivisionInput={customDivisionInput}
                setCustomDivisionInput={setCustomDivisionInput}
                projectManagers={projectManagers}
                onStartShredding={runAIShredder}
            />
            {renderAddSectionModal()}
            <DeleteProjectPlusModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onDelete={deleteProject}
                activeProject={activeProject}
            />

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
      </ErrorBoundary>
    );
}

export default App;
