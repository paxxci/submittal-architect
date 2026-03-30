import React from 'react';
import { 
    CheckCircle2, Clock, Zap, FileText, 
    ExternalLink, Search, Plus, Trash2,
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
    isShredding,
    shredStatusMsg,
    shredProgress,
    onAddSection,
    setExpandedPdfUrl,
    handleVendorUpload,
    setView
}) => {
    if (!projectData && isShredding) {
        return (
            <div className="workbench-root animate-fade-in flex items-center justify-center">
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
            </div>
        );
    }

    if (!selectedDivision) return (
        <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <LayoutDashboard size={48} className="mb-4 opacity-20" />
            <h3>Select a Division from the Dashboard</h3>
            <button className="btn-secondary mt-4" onClick={() => setView('dashboard')}>Go to Dashboard</button>
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
                {/* Left Side: Spec List */}
                <div className="workbench-sidebar space-y-3">
                    <button
                        onClick={onAddSection}
                        className="w-full p-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold border border-dashed border-border-subtle bg-transparent text-text-muted hover:border-accent-primary hover:text-accent-primary transition-all"
                    >
                        <Plus size={14} /> Add Section
                    </button>
                    
                    <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                        {(projectData?.recentItems || [])
                            .filter(item => item.id.startsWith(selectedDivision.id))
                            .map(item => {
                                const p1 = item.part1_progress || 0;
                                const p2 = item.part2_progress || 0;
                                const p3 = item.part3_progress || 0;
                                const isSelected = selectedSpec?.id === item.id;

                                return (
                                    <div 
                                        key={item.id} 
                                        className={`item-card prism-card group cursor-pointer transition-all !p-4 ${isSelected ? 'active ring-2 ring-accent-primary' : 'hover:border-accent-primary/30'}`}
                                        onClick={() => setSelectedSpec(item)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-accent-primary tracking-widest">{item.id}</span>
                                            {item.match && <span className="text-[9px] font-bold text-accent-secondary opacity-80">{item.match}% Match</span>}
                                        </div>
                                        <h4 className="font-bold text-sm leading-tight mb-3">{item.title}</h4>
                                        <div className="flex flex-col gap-1 mt-auto bg-bg-deep rounded p-3 border border-border-subtle">
                                            <div className="flex justify-between items-center w-full text-xs">
                                                <span className="text-text-muted">Part 1</span>
                                                <span className={`font-mono font-bold ${p1 === 100 ? 'text-accent-secondary' : p1 > 0 ? 'text-accent-primary' : 'text-text-muted'}`}>{p1}%</span>
                                            </div>
                                            <div className="flex justify-between items-center w-full text-xs">
                                                <span className="text-text-muted">Part 2</span>
                                                <span className={`font-mono font-bold ${p2 === 100 ? 'text-accent-secondary' : p2 > 0 ? 'text-accent-primary' : 'text-text-muted'}`}>{p2}%</span>
                                            </div>
                                            <div className="flex justify-between items-center w-full text-xs">
                                                <span className="text-text-muted">Part 3</span>
                                                <span className={`font-mono font-bold ${p3 === 100 ? 'text-accent-secondary' : p3 > 0 ? 'text-accent-primary' : 'text-text-muted'}`}>{p3}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>

                {/* Right Side: Detail View */}
                {selectedSpec ? (
                    <div className="workbench-main prism-card flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-bold">{selectedSpec.id} - {selectedSpec.title}</h3>
                            <span className="badge badge-green"><ShieldCheck size={12} className="mr-1" /> Verified</span>
                        </div>

                        {/* Part Tabs */}
                        <div className="flex flex-row gap-3 mb-6 font-mono">
                            {['part1', 'part2', 'part3'].map((p, idx) => (
                                <div 
                                    key={p}
                                    className={`item-card prism-card !w-24 !flex-none cursor-pointer transition-all text-center flex flex-col items-center justify-center !p-2 ${selectedPart === p ? 'active ring-2 ring-accent-primary' : 'hover:border-accent-primary/50'}`}
                                    onClick={() => setSelectedPart(p)}
                                >
                                    <h4 className="font-bold text-[10px] uppercase opacity-70">PART {idx + 1}</h4>
                                    <span className="text-[9px] text-text-muted mt-0.5 uppercase tracking-tighter">
                                        {p === 'part1' ? 'General' : p === 'part2' ? 'Products' : 'Execution'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
                            {(sectionResponsibility[selectedSpec.id] || 'SELF') === 'NA' ? (
                                <div className="col-span-2 flex flex-col items-center justify-center opacity-50">
                                    <ShieldCheck size={48} className="text-text-muted mb-4" />
                                    <h4 className="text-xl font-bold">Section Excluded</h4>
                                    <button className="btn-secondary mt-6" onClick={() => setSectionResponsibility({...sectionResponsibility, [selectedSpec.id]: 'SELF'})}>Include Section</button>
                                </div>
                            ) : (sectionResponsibility[selectedSpec.id] || 'SELF') === 'VENDOR' ? (
                                <div className="col-span-2 flex flex-col items-center justify-center">
                                    <div className="prism-card border-dashed border-accent-secondary/30 p-12 text-center max-w-lg bg-accent-secondary/5">
                                        <FileText size={32} className="text-accent-secondary mx-auto mb-6" />
                                        <h4 className="text-2xl font-extrabold pb-2">Vendor Cut Sheets</h4>
                                        <p className="text-text-muted text-sm mb-8">Drop manufacturer cut sheets here. We will still generate premium cover sheets.</p>
                                        <button className="btn-primary" onClick={handleVendorUpload}>Upload Files</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="col-span-2 grid grid-cols-2 gap-8 h-full">
                                    <div className="flex flex-col h-full overflow-hidden">
                                        <div className="flex-1 pb-20 overflow-y-auto custom-scrollbar">
                                            <FormattedSpecText 
                                                text={selectedPart === 'part2' ? selectedSpec.part2?.rawText : selectedSpec[selectedPart]}
                                                specId={selectedSpec.id}
                                                partId={selectedPart}
                                                completedBlocks={completedBlocks}
                                                naBlocks={naBlocks}
                                                onToggleBlock={toggleBlockCompletion}
                                                onBlockSelect={(block) => {
                                                    setSelectedBlock(block);
                                                    setActiveSubProductIndex(0);
                                                }}
                                                selectedBlockKey={selectedBlock?.blockKey}
                                                aiBlocks={selectedSpec.aiBlockMap}
                                            />
                                        </div>
                                    </div>

                                    {/* Sourcing Preview */}
                                    <div className="flex flex-col h-full overflow-hidden border-l border-white/5">
                                        {isSourcing ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center">
                                                <div className="w-16 h-16 border-4 border-accent-secondary border-t-transparent rounded-full animate-spin mb-6" />
                                                <h3 className="text-xl font-black uppercase tracking-tight">Sourcing Intelligence...</h3>
                                            </div>
                                        ) : selectedBlock ? (() => {
                                            const blockData = selectedSpec.metadata?.sourcedBlocks?.[selectedBlock.blockKey];
                                            if (!blockData) return (
                                                <div className="flex flex-col items-center justify-center h-full opacity-50">
                                                    <Search size={32} className="mb-4" />
                                                    <p className="text-sm uppercase font-bold">No sourcing data for this block</p>
                                                </div>
                                            );
                                            const items = Array.isArray(blockData) ? blockData : [blockData];
                                            const currentItem = items[activeSubProductIndex] || items[0];
                                            const compPct = Math.round((currentItem.complianceScore || 0) * 100);

                                            return (
                                                <div className="flex flex-col h-full">
                                                    <div className="p-6 border-b border-white/10">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <span className={`badge ${compPct >= 80 ? 'badge-green' : 'badge-orange'} mb-2`}>{compPct}% Match</span>
                                                                <h4 className="text-lg font-extrabold uppercase leading-tight">{selectedBlock.blockTitle}</h4>
                                                            </div>
                                                            <button className="btn-icon" onClick={() => setExpandedPdfUrl(currentItem.cutsheetUrl)}><Maximize size={16} /></button>
                                                        </div>
                                                        <div className="bg-white/5 p-3 rounded-lg">
                                                            <p className="text-[11px] text-text-muted italic">"{currentItem.complianceReason}"</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 bg-black/20">
                                                        {currentItem.cutsheetUrl ? (
                                                            <iframe 
                                                                src={`${currentItem.cutsheetUrl}#navpanes=0&toolbar=0&view=Fit`} 
                                                                className="w-full h-full border-none"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-text-muted">No PDF available</div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })() : (
                                            <div className="flex flex-col items-center justify-center h-full opacity-30">
                                                <Search size={48} className="mb-4" />
                                                <h4 className="font-bold uppercase tracking-widest">Select a block to review</h4>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="workbench-main prism-card flex flex-col items-center justify-center text-text-muted">
                        <FileSearch size={48} className="mb-4" />
                        <h3 className="text-lg font-bold">Select a section to begin review</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkbenchView;
