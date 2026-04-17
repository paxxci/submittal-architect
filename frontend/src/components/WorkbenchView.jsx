import React, { useState } from 'react';
import { 
    CheckCircle2, Clock, Zap, FileText, 
    ExternalLink, Search, Plus, Trash,
    Loader2, AlertCircle, ChevronRight, ShieldCheck,
    Box, FileUp, FileSearch, Maximize, X, LayoutDashboard
} from 'lucide-react';
import FormattedSpecText from './FormattedSpecText';

const WorkbenchView = ({
    projectData,
    activeProject,
    selectedDivision,
    setSelectedDivision,
    selectedSpec,
    setSelectedSpec,
    selectedPart,
    setSelectedPart,
    sectionResponsibility,
    setSectionResponsibility,
    completedBlocks,
    naBlocks,
    toggleBlockCompletion,
    selectedBlock,
    setSelectedBlock,
    activeSubProductIndex,
    setActiveSubProductIndex,
    isSourcing,
    sourcingProgressPct,
    isShredding,
    shredStatusMsg,
    shredProgress,
    onAddSection,
    setExpandedPdfUrl,
    handleVendorUpload,
    setView
}) => {
    const [pdfAlignmentOffset, setPdfAlignmentOffset] = useState(0);
    const [hoveredRequirement, setHoveredRequirement] = useState(null);

    const getCalculatedResponsibility = (specId) => {
        if (sectionResponsibility[specId]) return sectionResponsibility[specId];
        
        const assignments = activeProject?.metadata?.vendor_assignments || {};
        for (const [vendor, specs] of Object.entries(assignments)) {
            if (specs.includes(specId)) return 'VENDOR';
        }

        return 'SELF';
    };

    if (!selectedDivision) return (
        <div className="workbench-root animate-fade-in flex items-center justify-center">
            {isShredding ? (
                <div className="text-center text-text-muted max-w-md w-full px-6">
                    <FileSearch size={64} className="mx-auto mb-6 text-accent-primary animate-pulse" />
                    <h2 className="text-2xl font-black mb-3">Architect is Discovering...</h2>
                    <p className="text-sm mb-8 leading-relaxed">We are scanning the PDF meta-data and mapping sections to your workbench. This takes a moment for 900+ page documents.</p>
                    
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
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-text-muted">
                    <LayoutDashboard size={48} className="mb-4 opacity-20" />
                    <h3>Select a Division from the Dashboard</h3>
                    <button className="btn-secondary mt-4 px-8" onClick={() => setView('dashboard')}>Go to Dashboard</button>
                </div>
            )}
        </div>
    );

    return (
        <div className="workbench-root animate-fade-in flex flex-col h-full overflow-hidden">
            {/* COMMAND CENTER HEADER */}
            <div className="shrink-0" style={{ marginBottom: '1.5rem' }}>
                <h1 className="text-4xl font-black tracking-tighter italic uppercase" style={{ marginBottom: '4px' }}>
                    CUT SHEET <span className="text-accent-primary">FINDER</span> <span className="text-white/20 mx-4 font-light">/</span> <span className="text-white">{projectData?.name || 'ACTIVE PROJECT'}</span>
                </h1>
                <p className="text-text-muted font-black uppercase tracking-[0.3em] text-[11px] opacity-60">
                    <span className="text-accent-primary mr-3 text-lg font-black leading-none">/</span> DIVISION {selectedDivision?.id} - {(selectedDivision?.title || '').toUpperCase()}
                </p>
            </div>

            {/* Division Tabs & Spec Header */}
            <div className="flex justify-between items-end mb-6 border-b border-border-subtle pb-6 shrink-0 w-full overflow-hidden">
                {/* Left Side: Division Tabs */}
                <div className="flex flex-row flex-nowrap gap-3 overflow-x-auto custom-scrollbar font-mono shrink-0">
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
                                ? 'active ring-2 ring-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.15)]' 
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

                {/* Right Side: Global Spec Header */}
                {selectedSpec && (
                    <div className="flex items-center gap-4 pl-8 shrink min-w-0 pb-1">
                        <h3 className="text-xl font-extrabold tracking-tight truncate min-w-0 text-white">
                            {selectedSpec.id.slice(0,2)} {selectedSpec.id.slice(2,4)} {selectedSpec.id.slice(4)} - {selectedSpec.title}
                        </h3>
                        <span className="badge badge-green bg-green-500/10 text-green-500 border border-green-500/30 px-3 py-1 rounded-full shrink-0 uppercase tracking-widest text-[9px] font-black shadow-[0_0_10px_rgba(0,255,163,0.1)]">
                            <ShieldCheck size={12} className="inline mr-1.5 relative -top-[1px]" /> VERIFIED
                        </span>
                    </div>
                )}
            </div>

            <div className="workbench-grid flex-1 min-h-0">
                {/* Left side: Spec List */}
                <div className="workbench-sidebar custom-scrollbar h-full overflow-y-auto pr-2">
                    <button
                        onClick={() => {
                            onAddSection();
                        }}
                        className="btn-primary w-full flex items-center justify-center gap-3 mb-6 shadow-[0_0_15px_rgba(234,88,12,0.4)] transition-all hover:brightness-125"
                        style={{ marginTop: '24px', transform: 'translateY(-12px)', height: '44px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}
                    >
                        <Plus size={20} /> Add Missing Section
                    </button>
                    {(projectData?.recentItems || []).filter(item => item.id.startsWith(selectedDivision?.id)).map(item => {
                        const computeDynamicProgress = (rawText, partId) => {
                            if (!rawText) return 0;
                            const lines = rawText.split('\n');
                            let blockCount = 0;
                            let currentBlockLines = 0;
                            
                            lines.forEach(line => {
                                const trimmed = line.trim();
                                if (!trimmed) return;
                                if (/^[1-3]\.[0-9]{2}/.test(trimmed)) {
                                    if (currentBlockLines > 0) blockCount++;
                                    currentBlockLines = 1;
                                } else {
                                    currentBlockLines++;
                                }
                            });
                            if (currentBlockLines > 0) blockCount++;
                            if (blockCount === 0) return 0;
                            
                            let completed = 0;
                            for (let i = 0; i < blockCount; i++) {
                                const id = `${item.id}___${partId}___${i}`;
                                if (completedBlocks?.includes(id) || naBlocks?.includes(id)) {
                                    completed++;
                                }
                            }
                            return Math.round((completed / blockCount) * 100);
                        };

                        const p1Progress = computeDynamicProgress(item.part1, 'part1') || item.part1_progress || 0;
                        const p2Progress = computeDynamicProgress(item.part2?.rawText || '', 'part2') || item.part2_progress || 0;
                        const p3Progress = computeDynamicProgress(item.part3, 'part3') || item.part3_progress || 0;
                        
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
                            
                            <div className="flex flex-col gap-1 mt-auto pt-4">
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
                                        value={getCalculatedResponsibility(item.id)}
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

                    {(() => {
                        const handleMassComplete = (partId, rawText) => {
                            if (!rawText) return;
                        const lines = rawText.split('\n');
                        let blockCount = 0;
                        let currentBlockLines = 0;
                        
                        lines.forEach(line => {
                            const trimmed = line.trim();
                            if (!trimmed) return;
                            if (/^[1-3]\.[0-9]{2}/.test(trimmed)) {
                                if (currentBlockLines > 0) blockCount++;
                                currentBlockLines = 1;
                            } else {
                                currentBlockLines++;
                            }
                        });
                        if (currentBlockLines > 0) blockCount++;
                        if (blockCount === 0) return;
                        
                        const newIds = [];
                        for (let i = 0; i < blockCount; i++) {
                            newIds.push(`${selectedSpec?.id}___${partId}___${i}`);
                        }
                        
                        const remaining = newIds.filter(id => !completedBlocks?.includes(id));
                        if (remaining.length > 0) {
                            toggleBlockCompletion(remaining, 'DONE');
                        } else {
                            toggleBlockCompletion(newIds, 'DONE');
                        }
                    };
                        const isPartFullyComplete = (partId, rawText) => {
                            if (!rawText) return false;
                            const lines = typeof rawText === 'string' ? rawText.split('\n') : [];
                            let blockCount = 0;
                            let currentBlockLines = 0;
                            lines.forEach(line => {
                                const trimmed = line.trim();
                                if (!trimmed) return;
                                if (/^[1-3]\.[0-9]{2}/.test(trimmed)) {
                                    if (currentBlockLines > 0) blockCount++;
                                    currentBlockLines = 1;
                                } else {
                                    currentBlockLines++;
                                }
                            });
                            if (currentBlockLines > 0) blockCount++;
                            if (blockCount === 0) return false;
                            
                            for (let i = 0; i < blockCount; i++) {
                                const id = `${selectedSpec?.id}___${partId}___${i}`;
                                if (!completedBlocks?.includes(id)) return false;
                            }
                            return true;
                        };

                        const part1Complete = isPartFullyComplete('part1', selectedSpec?.part1);
                        const part2Complete = isPartFullyComplete('part2', selectedSpec?.part2?.rawText);
                        const part3Complete = isPartFullyComplete('part3', selectedSpec?.part3);

                    return (
                        <>
                    <div className="flex flex-row flex-nowrap mt-0 gap-9 mb-6 font-mono">
                        <div 
                            className={`!w-24 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !py-2 !px-1 relative group rounded-lg border ${selectedPart === 'part1' ? 'bg-transparent border-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.15)]' : 'bg-transparent border-transparent hover:border-accent-primary/40'}`}
                            onClick={() => setSelectedPart('part1')}
                        >
                            <button 
                                className={`absolute -top-2 -right-2 transition-all p-1 shadow-lg rounded-full z-10 hover:scale-110 ${part1Complete ? 'opacity-100 text-green-500 bg-green-500/10 border border-green-500/30' : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-secondary bg-bg-deep border border-border-subtle hover:border-accent-secondary/50'}`}
                                onClick={(e) => { e.stopPropagation(); handleMassComplete('part1', selectedSpec?.part1); }}
                                title="Toggle all blocks"
                            >
                                <CheckCircle2 size={16} />
                            </button>
                            <h4 className={`font-bold text-[10px] uppercase ${selectedPart === 'part1' ? 'text-accent-primary' : 'opacity-70 group-hover:text-accent-primary/80'}`}>PART 1</h4>
                            <span className={`text-[9px] mt-0.5 uppercase tracking-tighter ${selectedPart === 'part1' ? 'text-accent-primary/70' : 'text-text-muted group-hover:text-text-muted'}`}>General</span>
                        </div>
                        <div 
                            className={`!w-24 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !py-2 !px-1 relative group rounded-lg border ${selectedPart === 'part2' ? 'bg-transparent border-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.15)]' : 'bg-transparent border-transparent hover:border-accent-primary/40'}`}
                            onClick={() => setSelectedPart('part2')}
                        >
                            <button 
                                className={`absolute -top-2 -right-2 transition-all p-1 shadow-lg rounded-full z-10 hover:scale-110 ${part2Complete ? 'opacity-100 text-green-500 bg-green-500/10 border border-green-500/30' : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-secondary bg-bg-deep border border-border-subtle hover:border-accent-secondary/50'}`}
                                onClick={(e) => { e.stopPropagation(); handleMassComplete('part2', selectedSpec?.part2?.rawText); }}
                                title="Toggle all blocks"
                            >
                                <CheckCircle2 size={16} />
                            </button>
                            <h4 className={`font-bold text-[10px] uppercase ${selectedPart === 'part2' ? 'text-accent-primary' : 'opacity-70 group-hover:text-accent-primary/80'}`}>PART 2</h4>
                            <span className={`text-[9px] mt-0.5 uppercase tracking-tighter ${selectedPart === 'part2' ? 'text-accent-primary/70' : 'text-text-muted group-hover:text-text-muted'}`}>Products</span>
                        </div>


                        <div 
                            className={`!w-24 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !py-2 !px-1 relative group rounded-lg border ${selectedPart === 'part3' ? 'bg-transparent border-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.15)]' : 'bg-transparent border-transparent hover:border-accent-primary/40'}`}
                            onClick={() => setSelectedPart('part3')}
                        >
                            <button 
                                className={`absolute -top-2 -right-2 transition-all p-1 shadow-lg rounded-full z-10 hover:scale-110 ${part3Complete ? 'opacity-100 text-green-500 bg-green-500/10 border border-green-500/30' : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-secondary bg-bg-deep border border-border-subtle hover:border-accent-secondary/50'}`}
                                onClick={(e) => { e.stopPropagation(); handleMassComplete('part3', selectedSpec?.part3); }}
                                title="Toggle all blocks"
                            >
                                <CheckCircle2 size={16} />
                            </button>
                            <h4 className={`font-bold text-[10px] uppercase ${selectedPart === 'part3' ? 'text-accent-primary' : 'opacity-70 group-hover:text-accent-primary/80'}`}>PART 3</h4>
                            <span className={`text-[9px] mt-0.5 uppercase tracking-tighter ${selectedPart === 'part3' ? 'text-accent-primary/70' : 'text-text-muted group-hover:text-text-muted'}`}>Execution</span>
                        </div>
                    </div>
                        </>
                    );
                    })()}
                    <div className="grid grid-cols-2 gap-8 flex-1 w-full pb-32">
                        {getCalculatedResponsibility(selectedSpec?.id) === 'NA' ? (
                            <div className="col-span-2 flex flex-col items-center justify-center p-20 opacity-50 grayscale animate-fade-in">
                                <div className="p-8 rounded-full border-2 border-dashed border-border-subtle mb-4 shadow-[0_0_50px_rgba(255,107,0,0.05)]">
                                    <ShieldCheck size={48} className="text-text-muted" />
                                </div>
                                <h4 className="text-xl font-bold">Section Excluded</h4>
                                <p className="text-text-muted text-sm">This specification section is marked as Not Applicable for this submittal.</p>
                                <button 
                                    className="btn-secondary mt-6 scale-90"
                                    onClick={() => setSectionResponsibility({...sectionResponsibility, [selectedSpec?.id]: 'SELF'})}
                                >
                                    Include Section
                                </button>
                            </div>
                        ) : getCalculatedResponsibility(selectedSpec?.id) === 'VENDOR' ? (
                            <div className="col-span-2 flex flex-col items-center justify-center p-20 animate-fade-in">
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
                            <div className="col-span-2 grid grid-cols-2 gap-8 h-full min-h-0 overflow-hidden">
                                <div className="flex flex-col h-full overflow-hidden relative min-h-0">
                                    <div className="absolute inset-0 pb-[20vh] overflow-y-auto custom-scrollbar pr-2">
                                        {selectedPart === 'part1' && (
                                            <div className="animate-fade-in text-sm text-text-muted leading-relaxed">
                                                <FormattedSpecText
                                                    text={selectedSpec?.part1}
                                                    specId={selectedSpec?.id}
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
                                                    text={selectedSpec?.part3} 
                                                    specId={selectedSpec?.id} 
                                                    partId="part3"
                                                    completedBlocks={completedBlocks}
                                                    naBlocks={naBlocks}
                                                    onToggleBlock={toggleBlockCompletion}
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
                                                            }}
                                                            selectedBlockKey={selectedBlock?.blockKey}
                                                            aiBlocks={selectedSpec?.aiBlockMap || null}
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
                                <div className="flex flex-col h-full overflow-hidden border-l border-white/5 relative">
                                    {isSourcing ? (
                                        <div className="flex flex-col items-center justify-center p-12 text-center w-full h-full animate-fade-in">
                                            <div className="relative mb-8 flex items-center justify-center">
                                                <div className="w-24 h-24 border-[4px] border-bg-deep rounded-full"></div>
                                                <div 
                                                    className="w-24 h-24 border-[4px] border-accent-secondary border-t-transparent rounded-full absolute top-0 left-0 animate-spin"
                                                    style={{ animationDuration: '3s' }}
                                                ></div>
                                                <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-white drop-shadow-md">
                                                    {sourcingProgressPct || 0}%
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-4">Sourcing Intelligence...</h3>
                                            <div className="w-64 max-w-[80%] h-2 bg-bg-deep rounded-full overflow-hidden shadow-inner">
                                                <div 
                                                    className="h-full bg-accent-primary transition-all duration-[800ms] shadow-[0_0_15px_rgba(255,107,0,0.8)]" 
                                                    style={{ width: `${sourcingProgressPct || 0}%` }}
                                                ></div>
                                            </div>
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
                                        const compLabel = compPct >= 80 ? "Spec Compliant" : compPct >= 60 ? "Needs Review" : "Likely Wrong Product";

                                        return (
                                            <div className="flex flex-col h-full overflow-hidden">
                                                {/* Compliance Scorecard Header */}
                                                <div className="sourcing-clean-header flex flex-col gap-2">
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
                                                            <h3 className="text-base font-extrabold text-white tracking-tight uppercase leading-tight">
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
                                                    <div className="px-4 py-2 flex justify-between items-center border-b border-white/5 opacity-80">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-accent-secondary shadow-[0_0_8px_rgba(0,255,163,0.5)]"></div>
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-secondary">Extraction Proof</span>
                                                        </div>
                                                        <span className="text-[8px] font-mono text-text-muted opacity-50 uppercase tracking-tighter">Verified against master spec</span>
                                                    </div>
                                                    <div className="p-3 flex flex-wrap gap-1.5">
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

export default WorkbenchView;
