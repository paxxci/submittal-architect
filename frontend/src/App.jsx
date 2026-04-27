import React, { useState, useEffect, useRef, useMemo } from 'react'
// UI_SYNC_REFRESH: v2.0.8 - Master Header Isolation & Cache Break
import {
    LayoutDashboard, FileSearch, ClipboardCheck, 
    Settings, Bell, Search, ChevronRight, 
    MoreHorizontal, CheckCircle2, Clock, 
    ArrowUpRight, Plus, Box, ShieldCheck,
    FileText, ExternalLink, Briefcase, Building2, Trash, Maximize, X, Globe,
    Bot, Loader2, FileUp, Users, ShoppingBag, ArrowUp, ArrowDown, Zap, Mail, Phone, Edit2, Layers, LayoutGrid, List, Send, BookOpen, MousePointer2
} from 'lucide-react'
import { supabase } from './supabase'
import NewProjectModal from './components/NewProjectModal';
import WorkbenchView from './components/WorkbenchView';
import AssemblyEngineView from './components/AssemblyEngineView';
import TemplateMappingModal from './components/TemplateMappingModal';
import FormattedSpecText from './components/FormattedSpecText';
import TrackerView from './TrackerView';
import ErrorBoundary from './ErrorBoundary';
import AdminMasterAdmin from './components/AdminMasterAdmin';
import HelpAndDocsView from './components/HelpAndDocsView';
import DeleteProjectPlusModal from './components/DeleteProjectPlusModal';
import './App.css';

const MOCK_PROJECT = {
    name: "Luxury High-Rise Tower A",
    projectNumber: "2024-001", // Using the image inspiration
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
        projectNumber: "2024-002",
        progress: 15,
        daysLeft: 45,
        divisions: []
    },
    {
        id: '3',
        name: "Central High School Renovation",
        projectNumber: "2024-003",
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
    const [projectLayout, setProjectLayout] = useState('grid') // 'grid' | 'list'
    const [projectSort, setProjectSort] = useState('recent') // 'recent' | 'alphaAsc' | 'alphaDesc'
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
    const [selectedSectionsForParsing, setSelectedSectionsForParsing] = useState(new Set())
    const [vendors, setVendors] = useState([])
    const [authorizedVendors, setAuthorizedVendors] = useState([])
    const [manufacturers, setManufacturers] = useState(['Hubbell', 'Leviton', 'Eaton'])
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
        website: 'www.submittalarchitect.com',
        priority_domains: ['hubbell.com', 'platt.com', 'graybar.com']
    });
    const [isEditingCompanyInfo, setIsEditingCompanyInfo] = useState(false);
    const [editingPMId, setEditingPMId] = useState(null);
    const [isAddingPM, setIsAddingPM] = useState(false);
    const [newPM, setNewPM] = useState({ name: '', email: '', phone: '' });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
    const [uploadErrorMsg, setUploadErrorMsg] = useState(null);
    const templateInputRef = useRef(null);

    const [mappingTemplate, setMappingTemplate] = useState(null);
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

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
                const updatedItems = [...currentItems, newItem].sort((a, b) => (a.id || '').replace(/\s/g, '').localeCompare((b.id || '').replace(/\s/g, ''), undefined, { numeric: true, sensitivity: 'base' }));
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
        } else {
            setVendors([]);
            setAuthorizedVendors([]);
            setManufacturers(['Hubbell', 'Leviton', 'Eaton']);
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

        const uiItems = mapShreddedDataToUI(filteredSections).sort((a, b) => (a.id || '').replace(/\s/g, '').localeCompare((b.id || '').replace(/\s/g, ''), undefined, { numeric: true, sensitivity: 'base' }));

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
        // ... existing code
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

        try {
            await supabase
                .from('spec_sections')
                .update({ 
                    responsibility, 
                    vendor_name: vendorName 
                })
                .eq('id', sectionDbId);
        } catch (err) {}
    };

    const handleUpdateSectionTrackerState = async (sectionDbId, trackerStatus) => {
        setProjectData(prev => {
            if (!prev) return prev;
            const updatedItems = (prev.recentItems || []).map(item => 
                item.dbId === sectionDbId ? { ...item, tracker_status: trackerStatus } : item
            );
            return { ...prev, recentItems: updatedItems };
        });

        try {
            await supabase
                .from('spec_sections')
                .update({ tracker_status: trackerStatus })
                .eq('id', sectionDbId);
        } catch (err) {
            console.error('Failed to update tracker state:', err);
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
                // Include global search preferences from company info
                const preferredWebsites = companyInfo?.priority_domains || [];
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
                        .eq('id', section.dbId)
                        .then(({ error }) => {
                            if (error) console.error("Error saving to Supabase:", error);
                        });

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
        projectNumber: '',
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

    const toggleBlockCompletion = async (blockIds, type = 'DONE') => {
        const idsArray = Array.isArray(blockIds) ? blockIds : [blockIds];
        let newCompleted = [...completedBlocks];
        let newNA = [...naBlocks];

        idsArray.forEach(blockId => {
            if (type === 'NA') {
                if (newNA.includes(blockId)) {
                    // if mass completing but it's already in the target array, we don't necessarily want to toggle it off if we are enforcing a mass action, but standard toggle behavior is fine for now. Actually, if mass clicking, users generally expect it to FORCE complete, not toggle if already there.
                    // Wait, standard toggle behavior is fine. If they want to toggle all off, they click it again.
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
        });

        setCompletedBlocks(newCompleted);
        setNaBlocks(newNA);

        if (idsArray.length === 0) return;
        const specId = idsArray[0].split('___')[0];
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

    const handleUpdatePM = async (id, field, value) => {
        setProjectManagers(prev => prev.map(pm => pm.id === id ? { ...pm, [field]: value } : pm));
        const { error } = await supabase
            .from('project_managers')
            .update({ [field]: value })
            .eq('id', id);
        if (error) console.error("Error updating PM:", error);
    };

    const handleDeletePM = async (id) => {
        setProjectManagers(prev => prev.filter(pm => pm.id !== id));
        const { error } = await supabase
            .from('project_managers')
            .delete()
            .eq('id', id);
        if (error) console.error("Error deleting PM:", error);
    };

    const handleAddPM = async () => {
        if (!newPM.name) return;
        const { data, error } = await supabase
            .from('project_managers')
            .insert([newPM])
            .select();
        
        if (data && data.length > 0) {
            setProjectManagers(prev => [...prev, data[0]]);
            setNewPM({ name: '', email: '', phone: '' });
            setIsAddingPM(false);
        }
        if (error) console.error("Error adding PM:", error);
    };

    const handleUploadTemplate = async (file) => {
        setIsUploadingTemplate(true);
        setUploadErrorMsg(null);
        try {
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('templates')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Storage error:', uploadError);
                throw new Error(`Storage upload failed. Ensure a public bucket named 'templates' exists. (${uploadError.message})`);
            }

            const { data: publicUrlData } = supabase.storage
                .from('templates')
                .getPublicUrl(fileName);

            const { data, error } = await supabase
                .from('templates')
                .insert([{ name: file.name, file_url: publicUrlData.publicUrl, metadata: { type: 'cover_page', storage_path: fileName } }])
                .select();
                
            if (error) throw error;
            if (data) setCompanyTemplates(prev => [data[0], ...prev]);
            
        } catch (err) {
            console.error('Error uploading template:', err);
            setUploadErrorMsg(err.message);
        } finally {
            setIsUploadingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        try {
            const template = companyTemplates.find(t => t.id === id);
            if (template?.metadata?.storage_path) {
                await supabase.storage.from('templates').remove([template.metadata.storage_path]);
            }
            const { error } = await supabase.from('templates').delete().eq('id', id);
            if (error) throw error;
            setCompanyTemplates(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            console.error('Error deleting template:', err);
            alert('Failed to delete template: ' + err.message);
        }
    };
    const renderPortfolio = () => {
        const sortedPortfolio = [...portfolio].sort((a, b) => {
            if (projectSort === 'alphaAsc') {
                return (a.name || '').localeCompare(b.name || '');
            } else if (projectSort === 'alphaDesc') {
                return (b.name || '').localeCompare(a.name || '');
            }
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        const gridClass = projectLayout === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "flex flex-col gap-4";

        return (
            <div className="portfolio-root animate-fade-in p-6">
                <svg width="0" height="0" className="absolute">
                    <defs>
                        <linearGradient id="portfolio-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#EA580C" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-2">My Projects</h1>
                        <p className="text-text-muted">Manage all active submittal packages across your portfolio.</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1 items-center">
                                <button 
                                    onClick={() => setProjectSort(projectSort === 'alphaAsc' ? 'recent' : 'alphaAsc')} 
                                    className={`p-2 rounded-lg transition-all ${projectSort !== 'recent' ? 'bg-accent-primary/20 text-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.15)]' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                                    title="Toggle A-Z Sort"
                                >
                                    <span className="font-extrabold text-[12px] leading-none px-0.5 mt-0.5 block">A-Z</span>
                                </button>
                                <button 
                                    onClick={() => setProjectLayout('grid')} 
                                    className={`p-2 rounded-lg transition-all ${projectLayout==='grid'?'bg-accent-primary/20 text-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.15)]':'text-text-muted hover:text-white hover:bg-white/5'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={17} />
                                </button>
                                <button 
                                    onClick={() => setProjectLayout('list')} 
                                    className={`p-2 rounded-lg transition-all ${projectLayout==='list'?'bg-accent-primary/20 text-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.15)]':'text-text-muted hover:text-white hover:bg-white/5'}`}
                                    title="List View"
                                >
                                    <List size={17} />
                                </button>
                            </div>
                        </div>
                        <button className="btn-primary flex items-center h-11 px-5 text-sm" onClick={() => { setIsNewProjectModalOpen(true); setNewProjectStep(1); setNewProjectData({ name: '', projectNumber: '', manager: '', fileLoaded: false, autoDetect: true, customDivisions: [], divisions: { '26': true, '27': false, '28': false } }); }}>
                            <Plus size={18} className="mr-2" /> New Project
                        </button>
                    </div>
                </div>

                {isPortfolioLoading ? (
                    <div className={gridClass}>
                        {[1,2,3].map(i => (
                            <div key={i} className={`prism-card animate-pulse border-white/5 bg-white/[0.02] ${projectLayout === 'list' ? 'h-24' : 'h-48'}`}></div>
                        ))}
                    </div>
                ) : portfolio.length === 0 ? (
                    <div className="prism-card text-center py-16 mt-8">
                        <Building2 size={48} className="text-text-muted mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Projects Yet</h3>
                        <p className="text-text-muted mb-6">Create your first submittal project to get started.</p>
                        <button className="btn-primary" onClick={() => setIsNewProjectModalOpen(true)}>
                            <Plus size={16} className="inline mr-2" /> Create First Project
                        </button>
                    </div>
                ) : (
                    <div className={gridClass}>
                        {sortedPortfolio.map((proj, i) => (
                            <div 
                                key={proj.id || i} 
                                className={`prism-card hover:border-accent-primary/50 cursor-pointer transition-all hover:translate-y-[-2px] ${projectLayout === 'list' ? 'flex flex-row items-center justify-between !p-4 !py-3' : ''}`}
                                onClick={() => {
                                    setActiveProject(proj);
                                    loadProjectData(proj, null);
                                    setView('dashboard');
                                }}
                            >
                                {projectLayout === 'grid' ? (
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-bg-deep rounded-lg border border-accent-primary/20 shadow-[0_0_15px_rgba(255,107,0,0.05)]">
                                                <Building2 size={24} color="url(#portfolio-icon-gradient)" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="badge font-black uppercase tracking-widest bg-accent-primary/10 border border-accent-primary/40 shadow-[0_0_15px_rgba(255,107,0,0.15)]">
                                                    <span style={{ backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>In Progress</span>
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold mb-1 line-clamp-1">{proj.name}</h3>
                                        <p className="text-sm text-text-muted mb-3">{proj.description || 'Various Divisions'}</p>
                                        <p className="text-xs text-text-muted opacity-60 uppercase tracking-widest">{new Date(proj.created_at).toLocaleDateString()}</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="p-2.5 bg-bg-deep rounded-lg border border-accent-primary/20 shadow-[0_0_15px_rgba(255,107,0,0.05)] shrink-0">
                                                <Building2 size={20} color="url(#portfolio-icon-gradient)" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold mb-0.5 line-clamp-1">{proj.name}</h3>
                                                <p className="text-xs text-text-muted line-clamp-1">{proj.description || 'Various Divisions'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 shrink-0">
                                            <p className="text-xs text-text-muted uppercase tracking-widest w-24 text-right opacity-60">{new Date(proj.created_at).toLocaleDateString()}</p>
                                            <span className="badge font-black uppercase tracking-widest bg-accent-primary/10 border border-accent-primary/40 shadow-[0_0_15px_rgba(255,107,0,0.15)] w-28 text-center text-[10px]">
                                                <span style={{ backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>In Progress</span>
                                            </span>
                                            <ChevronRight size={18} className="text-text-muted opacity-30 group-hover:opacity-100 group-hover:text-accent-primary transition-colors" />
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderCompanyAdmin = () => {
        return (
            <div className="admin-container animate-fade-in p-12 max-w-7xl mx-auto pb-32">
                <svg width="0" height="0" className="absolute">
                    <defs>
                        <linearGradient id="company-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#EA580C" />
                        </linearGradient>
                    </defs>
                </svg>
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

                <div className="space-y-12">
                        <div className="prism-card px-8 pt-12 pb-8 border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl">
                            <div className="flex justify-between items-start" style={{ marginBottom: '20px' }}>
                                <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3" style={{ marginTop: '16px' }}>
                                    <Building2 size={24} color="url(#company-icon-gradient)" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} /> Corporate Identity
                                </h3>
                                <button 
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-white transition-colors flex items-center gap-2"
                                    onClick={() => setIsEditingCompanyInfo(!isEditingCompanyInfo)}
                                >
                                    {isEditingCompanyInfo ? 'Save' : <><Edit2 size={12} /> Edit</>}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase text-accent-primary tracking-widest block mb-2">Company Name</label>
                                    {isEditingCompanyInfo ? (
                                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={companyInfo.name} onChange={(e) => handleUpdateCompanyInfo({ name: e.target.value })} />
                                    ) : (
                                        <div className="text-xl font-bold text-white">{companyInfo.name || "—"}</div>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase text-accent-primary tracking-widest block mb-2">Office Address</label>
                                    {isEditingCompanyInfo ? (
                                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={companyInfo.address} onChange={(e) => handleUpdateCompanyInfo({ address: e.target.value })} />
                                    ) : (
                                        <div className="text-sm font-medium text-white/80">{companyInfo.address || "—"}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-accent-primary tracking-widest block mb-2">Contact Email</label>
                                    {isEditingCompanyInfo ? (
                                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={companyInfo.email} onChange={(e) => handleUpdateCompanyInfo({ email: e.target.value })} />
                                    ) : (
                                        <div className="text-sm font-medium text-white/80">{companyInfo.email || "—"}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-accent-primary tracking-widest block mb-2">Phone</label>
                                    {isEditingCompanyInfo ? (
                                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={companyInfo.phone} onChange={(e) => handleUpdateCompanyInfo({ phone: e.target.value })} />
                                    ) : (
                                        <div className="text-sm font-medium text-white/80">{companyInfo.phone || "—"}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="prism-card px-8 pt-12 pb-8 border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl mb-12">
                            <div className="flex justify-between items-start" style={{ marginBottom: '24px' }}>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                                        <ShieldCheck size={24} color="url(#company-icon-gradient)" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} /> Priority Sourcing Domains
                                    </h3>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight ml-9 leading-relaxed" style={{ marginTop: '8px' }}>
                                        AI will globally search these preferred sites for all projects before manufacturer websites.<br/>
                                    </p>
                                </div>
                                <div className="relative mt-2">
                                    <input 
                                        placeholder="Add Domain..."
                                        className="prism-input !py-2 !px-4 !text-[11px] !w-48 !bg-bg-deep border-accent-primary/20"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value) {
                                                const newList = [...(companyInfo.priority_domains || []), e.target.value];
                                                handleUpdateCompanyInfo({ priority_domains: newList });
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-primary" />
                                </div>
                            </div>
                            <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-bg-deep/50 shadow-inner">
                                <table className="w-full text-left border-collapse">
                                    <tbody className="divide-y divide-white/5">
                                        {(!companyInfo.priority_domains || companyInfo.priority_domains.length === 0) ? (
                                            <tr>
                                                <td colSpan="2" className="py-16 text-center text-xs font-black text-text-muted uppercase tracking-widest italic opacity-50">No Priority Sites Defined</td>
                                            </tr>
                                        ) : companyInfo.priority_domains.map((site, idx) => (
                                            <tr key={idx} className="hover:bg-accent-primary/5 transition-colors group">
                                                <td className="pr-8 font-black text-sm text-white lowercase italic underline decoration-accent-primary/40 w-full" style={{ paddingTop: '14px', paddingBottom: '14px', paddingLeft: '32px' }}>{site}</td>
                                                <td className="pl-8 text-right" style={{ paddingTop: '14px', paddingBottom: '14px', paddingRight: '32px' }}>
                                                    <button 
                                                        className="text-text-muted hover:text-red-400 p-2 opacity-20 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => {
                                                            const newList = companyInfo.priority_domains.filter((_, i) => i !== idx);
                                                            handleUpdateCompanyInfo({ priority_domains: newList });
                                                        }}
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="prism-card px-8 pt-12 pb-8 border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl">
                            <div className="flex justify-between items-start" style={{ marginBottom: '20px' }}>
                                <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3" style={{ marginTop: '16px' }}>
                                    <Users size={24} color="url(#company-icon-gradient)" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} /> Team Directory
                                </h3>
                                
                                <button 
                                    onClick={() => setIsAddingPM(true)} 
                                    className="btn-primary !text-[9px] !py-2 !px-4 uppercase tracking-[0.2em] font-black flex items-center gap-2"
                                >
                                    <Plus size={12} /> Add Manager
                                </button>
                            </div>

                            <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-bg-deep/50">
                                {isAddingPM && (
                                    <div className="group relative border-b border-accent-primary/20 bg-accent-primary/5 transition-colors flex items-center justify-between gap-6" style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '32px', paddingRight: '32px' }}>
                                        <div className="flex items-center gap-5 sm:min-w-[200px]">
                                             <div className="w-12 h-12 rounded-xl bg-accent-primary/20 border border-accent-primary/50 flex items-center justify-center font-black text-xl text-accent-primary shadow-inner shrink-0">
                                                 +
                                             </div>
                                             <div className="flex-1">
                                                 <div className="text-[9px] font-black uppercase text-accent-primary tracking-widest mb-1.5">New Project Manager</div>
                                                 <input type="text" placeholder="Name..." className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={newPM.name} onChange={(e) => setNewPM({...newPM, name: e.target.value})} />
                                             </div>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6">
                                             <div>
                                                 <div className="text-[9px] font-black uppercase text-text-muted tracking-widest mb-1.5 flex items-center gap-2"><Mail size={10} className="text-accent-primary"/> Email</div>
                                                 <input type="text" placeholder="Email..." className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={newPM.email} onChange={(e) => setNewPM({...newPM, email: e.target.value})} />
                                             </div>
                                             <div>
                                                 <div className="text-[9px] font-black uppercase text-text-muted tracking-widest mb-1.5 flex items-center gap-2"><Phone size={10} className="text-accent-primary"/> Phone</div>
                                                 <input type="text" placeholder="Phone..." className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={newPM.phone} onChange={(e) => setNewPM({...newPM, phone: e.target.value})} />
                                             </div>
                                        </div>
                                        <div className="pl-4 border-l border-white/5 flex flex-col gap-2 shrink-0 text-center items-start">
                                            <button 
                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-primary hover:text-white transition-colors flex items-center gap-2 py-1"
                                                onClick={handleAddPM}
                                            >
                                                Save
                                            </button>
                                            <button 
                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-red-400 transition-colors flex items-center gap-2 py-1"
                                                onClick={() => { setIsAddingPM(false); setNewPM({ name: '', email: '', phone: '' }); }}
                                            >
                                                <X size={12} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {projectManagers.length === 0 && !isAddingPM && (
                                    <div className="p-8 text-center text-text-muted text-sm italic">No managers assigned.</div>
                                )}
                                {projectManagers.map(pm => (
                                    <div key={pm.id} className="group relative border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-6" style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '32px', paddingRight: '32px' }}>
                                        
                                        {/* Avatar & Identity */}
                                        <div className="flex items-center gap-5 sm:min-w-[200px]">
                                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl text-white shadow-inner shrink-0 group-hover:border-accent-primary/50 group-hover:text-accent-primary transition-colors">
                                                {pm.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-accent-primary tracking-widest mb-1.5">Project Manager</div>
                                                {editingPMId === pm.id ? (
                                                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={pm.name} onChange={(e) => handleUpdatePM(pm.id, 'name', e.target.value)} />
                                                ) : (
                                                    <div className="text-lg font-bold text-white tracking-tight leading-none">{pm.name}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Grid */}
                                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-text-muted tracking-widest mb-1.5 flex items-center gap-2"><Mail size={10} className="text-accent-primary"/> Email</div>
                                                {editingPMId === pm.id ? (
                                                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={pm.email} onChange={(e) => handleUpdatePM(pm.id, 'email', e.target.value)} />
                                                ) : (
                                                    <div className="text-sm font-medium text-white/80">{pm.email || '—'}</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-text-muted tracking-widest mb-1.5 flex items-center gap-2"><Phone size={10} className="text-accent-primary"/> Phone</div>
                                                {editingPMId === pm.id ? (
                                                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all" value={pm.phone} onChange={(e) => handleUpdatePM(pm.id, 'phone', e.target.value)} />
                                                ) : (
                                                    <div className="text-sm font-medium text-white/80">{pm.phone || '—'}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="pl-4 border-l border-white/5 flex flex-col gap-2 shrink-0">
                                            <button 
                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-white transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                onClick={() => setEditingPMId(editingPMId === pm.id ? null : pm.id)}
                                                style={{ opacity: editingPMId === pm.id ? 1 : undefined }}
                                            >
                                                {editingPMId === pm.id ? 'Save' : <><Edit2 size={12} /> Edit</>}
                                            </button>
                                            <button 
                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-red-400 transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                onClick={() => handleDeletePM(pm.id)}
                                            >
                                                <Trash size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="prism-card p-8 border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                                <FileText size={120} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3" style={{ marginBottom: '30px' }}>
                                <FileText size={24} color="url(#company-icon-gradient)" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} /> Output Standard
                            </h3>
                            <div className="prism-card bg-bg-deep border-dashed border-white/10 p-10 flex flex-col items-center justify-center gap-3 mb-6 hover:border-accent-secondary/40 transition-colors cursor-pointer" onClick={() => templateInputRef.current?.click()}>
                                <input ref={templateInputRef} type="file" className="hidden" accept=".pdf" onChange={(e) => {
                                    if (e.target.files[0]) {
                                        handleUploadTemplate(e.target.files[0]);
                                        e.target.value = null;
                                    }
                                }} />
                                <FileUp size={32} className="text-accent-secondary" />
                                <h4 className="font-black text-sm uppercase italic">
                                    {isUploadingTemplate ? 'Uploading...' : 'Upload Cover Template'}
                                </h4>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-60 mt-2">PDF ONLY</span>
                            </div>
                            {uploadErrorMsg && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6 text-red-400 text-xs font-bold">
                                    {uploadErrorMsg}
                                </div>
                            )}
                            {companyTemplates.map(tpl => (
                                <div key={tpl.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-xs uppercase italic">{tpl.name}</div>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                className="text-text-muted hover:text-accent-primary transition-colors flex items-center gap-1" 
                                                onClick={() => {
                                                    setMappingTemplate(tpl);
                                                    setIsMappingModalOpen(true);
                                                }}
                                                title="Map PDF Fields"
                                            >
                                                <MousePointer2 size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Map Fields</span>
                                            </button>
                                            <button 
                                                className="text-text-muted hover:text-white transition-colors" 
                                                onClick={() => window.open(tpl.file_url, '_blank')}
                                                title="Open Fullscreen"
                                            >
                                                <Maximize size={14} />
                                            </button>
                                            <button className="text-text-muted hover:text-red-400 transition-colors" onClick={() => handleDeleteTemplate(tpl.id)}>
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-full h-48 bg-black/50 rounded-lg overflow-hidden border border-white/10 relative group hover:border-accent-primary/30 transition-colors">
                                        <iframe 
                                            src={`${tpl.file_url}#toolbar=0&navpanes=0`} 
                                            className="w-full h-full" 
                                            title={tpl.name}
                                        />
                                    </div>
                                </div>
                            ))}
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
        // Derive some stats for the KPI deck
        const totalDivisions = projectData?.divisions?.length || 0;
        const totalSections = projectData?.divisions?.reduce((acc, div) => acc + (div.tasks || 0), 0) || 0;
        const totalReady = projectData?.divisions?.reduce((acc, div) => acc + (div.completed || 0), 0) || 0;
        const projectProgress = projectData?.progress || 0;

        return (
        <div className="flex flex-col h-full w-full bg-[#0a0b0e] text-text-primary p-10 overflow-y-auto custom-scrollbar">
            
            {/* COMMAND CENTER HEADER */}
            <div className="px-4" style={{ marginBottom: '1.5rem' }}>
                <div className="flex items-center justify-between mb-4">
                    <button 
                        onClick={() => { 
                            setView('portfolio'); 
                            setActiveProject(null); 
                            setSelectedDivision(null); 
                            setSelectedSpec(null); 
                        }} 
                        className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-white flex items-center gap-2 transition-colors"
                    >
                        <ChevronRight size={12} className="rotate-180" /> Back to Portfolio
                    </button>
                </div>
                <h1 className="text-4xl font-black tracking-tighter italic uppercase" style={{ marginBottom: '4px' }}>
                    PROJECT <span className="text-accent-primary">DASHBOARD</span> <span className="text-white/20 mx-4 font-light">/</span> <span className="text-white">{projectData?.name}</span>
                </h1>
                
                <p className="text-text-muted font-black uppercase tracking-[0.3em] text-[11px] opacity-60">
                    <span className="text-accent-primary mr-3 text-lg font-black leading-none">/</span> PROJECT #: {projectData?.metadata?.projectNumber || projectData?.projectNumber || 'UNKNOWN'} | PM: {projectData?.metadata?.manager || projectData?.manager || 'UNKNOWN'}
                </p>
            </div>

            <div className="flex flex-col gap-6 px-4 pb-12">
                <svg width="0" height="0" className="absolute">
                    <defs>
                        <linearGradient id="dashboard-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#EA580C" />
                        </linearGradient>
                    </defs>
                </svg>
                {/* KPI DECK (TOP ROW) */}
                <div className="grid grid-cols-4 gap-6">
                <div className="prism-card !p-6 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-accent-primary/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Total Progress</span>
                        <Zap size={14} color="url(#dashboard-icon-gradient)" style={{ filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.8))' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-black italic tracking-tighter">{projectProgress}%</div>
                        <div className="w-full bg-white/5 h-1.5 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-accent-primary shadow-[0_0_10px_rgba(255,107,0,0.8)] transition-all duration-1000" style={{ width: `${projectProgress}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="prism-card !p-6 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-accent-primary/30 transition-colors">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Active Divisions</span>
                        <Layers size={14} color="url(#dashboard-icon-gradient)" className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.8))' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-black italic tracking-tighter">{totalDivisions}</div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Found in Spec</div>
                    </div>
                </div>

                <div className="prism-card !p-6 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-accent-primary/30 transition-colors">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Sections Ready</span>
                        <CheckCircle2 size={14} color="url(#dashboard-icon-gradient)" style={{ filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.8))' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-black italic tracking-tighter">{totalReady} <span className="text-text-muted text-xl">/ {totalSections}</span></div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Verified & Complete</div>
                    </div>
                </div>

                <div className="prism-card !p-6 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-accent-primary/30 transition-colors">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Submittals Sent</span>
                        <Send size={14} color="url(#dashboard-icon-gradient)" className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.8))' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-black italic tracking-tighter">0</div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Pending Transmission</div>
                    </div>
                </div>
            </div>

                {/* ASYMMETRIC BODY GRID (65% / 35%) */}
                <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-stretch">
                
                {/* LEFT COLUMN: Project Divisions */}
                <div className="prism-card !p-8 border-white/10 h-full flex flex-col">
                    <div className="flex justify-between items-center shrink-0" style={{ marginBottom: '1.0rem' }}>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em]">Project Divisions</h2>
                        <button
                            id="add-section-btn"
                            className="bg-white/5 hover:bg-accent-primary/20 hover:text-accent-primary text-white transition-all px-3 py-1.5 rounded text-[10px] uppercase font-black tracking-widest flex items-center gap-2"
                            onClick={() => setIsAddSectionModalOpen(true)}
                        >
                            <Plus size={12} />
                            Add Section Manually
                        </button>
                    </div>

                    <div className="space-y-4 flex-1">
                        {projectData?.divisions && projectData?.divisions.length > 0 ? projectData?.divisions.map(div => (
                            <div key={div.id} className="group relative overflow-hidden bg-white/[0.02] border border-white/5 hover:border-accent-primary/40 rounded-2xl p-8 cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-[0_0_15px_rgba(255,107,0,0.1)]" onClick={() => { setSelectedDivision(div); setView('workbench'); }}>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center justify-between pl-2">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center border ${div.completed === div.tasks ? 'bg-accent-primary/10 border-accent-primary/20 text-accent-primary' : 'bg-white/5 border-white/10 text-text-muted'}`}>
                                            {div.completed === div.tasks ? <CheckCircle2 size={20} color="url(#dashboard-icon-gradient)" style={{ filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.8))' }} /> : <Layers size={20} color="url(#dashboard-icon-gradient)" className="opacity-50" style={{ filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.5))' }} />}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg tracking-wide">Division {div.id} - {div.title}</h3>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted mt-1">{div.tasks} Sections Found</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="text-right">
                                            <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${div.completed === div.tasks ? 'bg-accent-primary/20 text-accent-primary shadow-[0_0_10px_rgba(255,107,0,0.2)]' : 'bg-[#18181A] border border-white/5 text-text-muted group-hover:text-white transition-colors'}`}>
                                                {div.completed}/{div.tasks} Ready
                                            </span>
                                        </div>
                                        <ChevronRight className="text-text-muted group-hover:text-accent-primary transition-colors" size={16} />
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center border border-dashed border-border-subtle rounded-xl text-text-muted">
                                <FileSearch size={32} className="mx-auto mb-4 opacity-50" />
                                <p className="text-sm font-medium">No divisions processed yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Sidebar Content */}
                <div className="flex flex-col gap-6">
                    {/* Mini Timeline / Status Widget Skeleton */}
                    <div className="prism-card !p-6 flex flex-col items-center justify-center min-h-[320px] border border-white/10 relative overflow-hidden bg-[#0A0B0E]">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,107,0,0.15)_0%,transparent_60%)] opacity-80 pointer-events-none"></div>
                        <div className="w-36 h-36 rounded-full border-[10px] border-white/5 border-r-accent-primary border-t-accent-primary shadow-[0_0_30px_rgba(255,107,0,0.3)] animate-[spin_8s_linear_infinite] mb-6 relative">
                            <div className="absolute inset-0 m-auto w-[110px] h-[110px] bg-[#0A0B0E] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] rounded-full flex items-center justify-center flex-col animate-[spin_8s_linear_infinite_reverse]">
                                <div className="text-3xl font-black italic tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{projectProgress}%</div>
                            </div>
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-1 z-10">Project Status</h3>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider text-center z-10">Data visualized from division tracking.</p>
                    </div>

                    {/* Team/Activity Log Skeleton */}
                    <div className="prism-card !p-6 border-white/10 bg-[#0A0B0E]">
                         <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-6">Recent Activity</h2>
                         <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="group flex gap-4 items-start cursor-pointer hover:bg-white/[0.02] p-2 -mx-2 rounded transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 shrink-0 flex items-center justify-center mt-0.5 group-hover:border-accent-primary/40 group-hover:bg-accent-primary/10 transition-colors"><Box size={10} color="url(#dashboard-icon-gradient)" className="opacity-70 group-hover:opacity-100 transition-all" style={{ filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.6))' }}/></div>
                                    <div>
                                        <div className="text-[11px] font-bold group-hover:text-accent-primary transition-colors">System Automation</div>
                                        <div className="text-[9px] text-text-muted uppercase tracking-wide leading-tight mt-1">Generated {i} new sections for review</div>
                                    </div>
                                    <div className="ml-auto text-[9px] text-text-muted font-black tracking-wider pt-1">{i}h ago</div>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            </div>

                {/* FULL WIDTH: DANGER ZONE */}
                <div>
                    <div className="prism-card !p-6 flex items-center justify-between border border-red-500/20" style={{ background: 'rgba(239, 68, 68, 0.03)' }}>
                        <div className="flex flex-col gap-1.5 pl-2">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-accent-danger flex items-center gap-3">
                                <Trash size={16} /> Danger Zone
                            </h3>
                            <p className="text-[9px] text-accent-danger/60 font-black uppercase tracking-[0.2em]">
                                Purging is irreversible and immediately wipes all extracted data.
                            </p>
                        </div>
                        <button 
                            className="text-red-500 hover:text-red-400 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] italic transition-all active:scale-[0.98]"
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            <Trash size={14} /> DELETE PROJECT
                        </button>
                    </div>
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
                        description: `Project #: ${newProjectData.projectNumber || 'Unknown'} | PM: ${newProjectData.manager || 'Unknown'}`,
                        metadata: {
                            projectNumber: newProjectData.projectNumber || '',
                            manager: newProjectData.manager || ''
                        }
                    }])
                    .select()
                    .single();

                if (pError) throw pError;

                // Save the selected division scope to project metadata so future loads respect it
                const selectedDivisionPrefixes = selectedSectionsForParsing.size > 0 
                    ? Array.from(new Set(Array.from(selectedSectionsForParsing).map(sec => sec.replace(/\s/g, '').substring(0, 2))))
                    : null;
                
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

                                const filteredSections = selectedDivisionPrefixes 
                                    ? sections.filter(s => {
                                        const num = (s.section_number || '').replace(/\s/g, '');
                                        return selectedDivisionPrefixes.some(prefix => num.startsWith(prefix));
                                    })
                                    : sections;

                                const uiItems = mapShreddedDataToUI(filteredSections);
                                const newDivisions = deriveDivisions(uiItems);

                                const updatedProjectData = {
                                    id: project.id,
                                    name: project.name,
                                    projectNumber: newProjectData.projectNumber,
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
                alert(`The Grand Shred failed to initialize. Please ensure the backend server is running on port 3001.\nError: ${err.message}`)
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
            <div className="app-shell bg-bg-deep relative overflow-hidden" style={view !== 'portfolio' ? { gridTemplateRows: '0px 1fr' } : {}}>
                {/* Glassmorphism Refraction Orbs */}
                <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-primary/20 rounded-full blur-[140px] pointer-events-none" />
                <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

                {/* Nav Rail */}
                <aside className="nav-rail relative z-20">
                    <div className="logo-area">
                        <div className="logo-prism">SA</div>
                    </div>

                    <nav className="rail-icons" style={{ flex: 1, justifyContent: 'flex-start' }}>
                        <button 
                            className={`rail-btn ${(!activeProject && view === 'portfolio') ? 'active' : ''}`}
                            onClick={() => { 
                                setView('portfolio'); 
                                setActiveProject(null); 
                                setSelectedDivision(null);
                                setSelectedSpec(null);
                            }}
                            style={{ marginBottom: '24px' }}
                        >
                            <Briefcase size={20} />
                            <span className="rail-label">All Projects</span>
                        </button>
                        {activeProject && (
                            <div className="animate-fade-in w-full">
                                {/* ACTIVE PROJECT WORKFLOW */}
                                <div className="mb-8">
                                    <h4 className="text-[11px] font-black uppercase text-text-muted tracking-[0.15em] px-4 mb-4 truncate w-full pr-2">
                                        {activeProject.name || 'WORKFLOW'}
                                    </h4>
                                    <button className={`rail-btn mb-1 ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
                                        <LayoutDashboard size={20} />
                                        <span className="rail-label">Dashboard</span>
                                    </button>
                                    <button className={`rail-btn mb-1 ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
                                        <ShieldCheck size={20} />
                                        <span className="rail-label">Project Setup</span>
                                    </button>
                                    <button className={`rail-btn mb-1 ${view === 'workbench' ? 'active' : ''}`} onClick={() => setView('workbench')}>
                                        <FileSearch size={20} />
                                        <span className="rail-label">Cut Sheet Finder</span>
                                    </button>
                                    <button className={`rail-btn mb-1 ${view === 'assemble' ? 'active' : ''}`} onClick={() => setView('assemble')}>
                                        <Layers size={20} />
                                        <span className="rail-label">Assemble Submittal</span>
                                    </button>
                                    <button className={`rail-btn mb-1 ${view === 'tracker' ? 'active' : ''}`} onClick={() => setView('tracker')}>
                                        <Zap size={20} />
                                        <span className="rail-label">Submittal Tracker</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </nav>

                    <div className="rail-footer">
                        <button className={`rail-btn mb-1 ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
                            <Building2 size={20} />
                            <span className="rail-label">Company Info</span>
                        </button>
                        <button className={`rail-btn ${view === 'help' ? 'active' : ''}`} onClick={() => setView('help')}>
                            <BookOpen size={20} />
                            <span className="rail-label">Help & Docs</span>
                        </button>
                        <div className="flex items-center gap-4 px-4 py-4 mt-2 border-t border-white/5">
                            <div className="user-avatar" title="User Profile"></div>
                            <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-white tracking-wide">Guest User</span>
                                <span className="text-[10px] text-text-muted uppercase tracking-[0.15em] mt-0.5">Enterprise</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Top Bar */}
                {view === 'portfolio' && (
                    <header className="top-bar">
                        <div className="search-field">
                            <Search size={16} className="text-text-muted" />
                            <input type="text" placeholder="Search specifications, vendors, or items..." />
                        </div>
                        <div className="header-actions">
                            <button className="btn-icon"><Bell size={20} /></button>
                        </div>
                    </header>
                )}

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
                            projectData={projectData}
                            authorizedVendors={authorizedVendors}
                            authorizedBrands={manufacturers}
                            projectManagers={projectManagers}
                            onUpdateProjectAdmin={handleUpdateProjectAdmin}
                            setAuthorizedVendors={setAuthorizedVendors}
                            setView={setView}
                            setIsDeleteModalOpen={setIsDeleteModalOpen}
                        />
                    )}
                    {view === 'help' && <HelpAndDocsView setView={setView} />}
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
                    {view === 'assemble' && <AssemblyEngineView 
                        projectData={projectData} 
                        activeProject={activeProject} 
                        onUpdateTrackerState={handleUpdateSectionTrackerState}
                        companyTemplates={companyTemplates}
                        companyInfo={companyInfo}
                        projectManagers={projectManagers}
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

            <TemplateMappingModal 
                isOpen={isMappingModalOpen}
                onClose={() => setIsMappingModalOpen(false)}
                template={mappingTemplate}
                onSaveSuccess={(updatedTemplate) => {
                    setCompanyTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
                }}
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
