import React, { useState, useMemo } from 'react';
import { supabase } from './supabase';
import { CheckCircle2, AlertCircle, FileText, ChevronRight, X } from 'lucide-react';

const TrackerView = ({ projectData, activeProject, onNavigateToSection, onUpdateSection, onRefreshData }) => {
    const sortedSections = useMemo(() => {
        if (!projectData || !projectData.recentItems) return [];
        return [...projectData.recentItems].sort((a, b) => {
            const cleanA = (a.id || '').replace(/\s/g, '');
            const cleanB = (b.id || '').replace(/\s/g, '');
            return cleanA.localeCompare(cleanB, undefined, { numeric: true });
        });
    }, [projectData]);

    const [editingNotes, setEditingNotes] = useState(null);
    const [tempNotes, setTempNotes] = useState("");

    const calculateSectionProgress = (section) => {
        let progress = 0;
        if (section.responsibility === 'VENDOR' && section.full_submittal_url) return 100;
        if (section.tracker_notes && section.tracker_notes.length > 10) progress += 50;
        return Math.min(progress, 100);
    };

    const handleUpdateField = async (dbId, field, value) => {
        try {
            if (field === 'responsibility' || field === 'assigned_to') {
                const section = sortedSections.find(s => s.dbId === dbId);
                const newResponsibility = field === 'responsibility' ? value : (section?.responsibility || 'SELF');
                const newVendor = field === 'assigned_to' ? value : (newResponsibility === 'VENDOR' ? (section?.assigned_to || null) : null);
                
                await onUpdateSection(dbId, newResponsibility, newVendor);
            } else {
                const { error } = await supabase
                    .from('spec_sections')
                    .update({ [field]: value })
                    .eq('id', dbId);

                if (error) {
                    console.error("Error updating tracker field:", error);
                    alert("Failed to save changes.");
                }
            }
            
            if (onRefreshData) onRefreshData();
            
        } catch (err) {
            console.error("Exception updating tracker field:", err);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0b0e] text-text-primary p-10 overflow-y-auto custom-scrollbar">
            
            {/* COMMAND CENTER HEADER */}
            <div className="px-4" style={{ marginBottom: '1rem' }}>
                <h1 
                    className="text-4xl font-black tracking-tighter italic uppercase"
                    style={{ marginBottom: '0px' }}
                >
                    SUBMITTAL <span className="text-accent-primary">TRACKER</span> <span className="text-white/20 mx-4 font-light">/</span> <span className="text-white">{activeProject?.name}</span>
                </h1>
                
                <p className="text-text-muted font-black uppercase tracking-[0.3em] text-[11px] opacity-60">
                    <span className="text-accent-primary mr-3 text-lg font-black leading-none">/</span> OPERATIONAL MASTER LOG. REAL-TIME SYNCHRONIZATION ACTIVE.
                </p>
            </div>

            {/* GLOBAL MASTER TELEMETRY */}
            {(() => {
                const totalCount = sortedSections.length;
                const completedCount = sortedSections.filter(s => s.tracker_status === 'Verified' || s.tracker_status === 'Sent').length;
                const needsHumanCount = sortedSections.filter(s => s.tracker_status === 'Needs Human').length;
                const inProgressCount = totalCount - completedCount - needsHumanCount;
                
                return (
                    <div className="px-[3.5rem] flex items-center justify-start gap-12" style={{ marginBottom: '.75rem' }}>
                        {/* COMPLETED */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
                                <CheckCircle2 size={12} className="text-accent-secondary" /> 
                                Completed
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[32px] leading-none font-black tracking-tighter bg-gradient-to-br from-[#F59E0B] to-[#EA580C] bg-clip-text text-transparent">{completedCount}</span>
                                <span className="text-[16px] font-black text-white/30 italic">/ {totalCount}</span>
                            </div>
                        </div>

                        <div className="w-[2px] h-10 bg-white/5 rounded-full"></div>

                        {/* IN PROGRESS */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
                                <div className="w-2 h-2 rounded-full bg-[#ff6b00] shadow-[0_0_10px_rgba(255,107,0,0.6)]"></div>
                                In Progress
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[32px] leading-none font-black tracking-tighter bg-gradient-to-br from-[#F59E0B] to-[#EA580C] bg-clip-text text-transparent">{inProgressCount}</span>
                                <span className="text-[16px] font-black text-white/30 italic">/ {totalCount}</span>
                            </div>
                        </div>

                        <div className="w-[2px] h-10 bg-white/5 rounded-full"></div>

                        {/* NEEDS HUMAN */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
                                <X size={14} strokeWidth={4} className="text-[#ff2a2a] drop-shadow-[0_0_8px_rgba(255,42,42,0.8)]" />
                                Needs Human
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[32px] leading-none font-black text-[#ff2a2a] tracking-tighter drop-shadow-[0_0_15px_rgba(255,42,42,0.6)] animate-pulse">{needsHumanCount}</span>
                                <span className="text-[16px] font-black text-white/30 italic">/ {totalCount}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* COMPACT COLUMN HEADERS */}
            <div className="grid grid-cols-[2.5fr_1fr_1.5fr_2.4fr_1.8fr] items-center text-[10px] uppercase tracking-[0.4em] font-black text-white/30 italic mb-4 pb-4">
                <div style={{ paddingLeft: '3.5rem', paddingRight: '2rem' }}>Identity</div>
                <div className="text-center">Source</div>
                <div className="text-center">Anatomy</div>
                <div className="text-center px-8">Pipeline</div>
                <div style={{ paddingLeft: '1rem', paddingRight: '1rem' }}>Notes</div>
            </div>

            <div className="space-y-6">
                {/* Submittal Cards */}
                {sortedSections.map(section => {
                    // Global Pipeline Router Hook
                    let nodeState = 1; // Default: Working
                    if (section.tracker_status === 'Sent') nodeState = 3;
                    else if (section.tracker_status === 'Verified') nodeState = 2;
                    else if (section.tracker_status === 'Needs Human') nodeState = -1; 

                    // Compute Progress dynamically per part
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
                            const globalId = `${section.id}___${partId}___${i}`;
                            if ((section.metadata?.completed_blocks || []).includes(globalId) || (section.metadata?.na_blocks || []).includes(globalId)) {
                                completed++;
                            }
                        }
                        return Math.round((completed / blockCount) * 100);
                    };

                    const p1Progress = computeDynamicProgress(section.part1, 'part1') || section.part1_progress || 0;
                    const p2Progress = computeDynamicProgress(section.part2?.rawText || '', 'part2') || section.part2_progress || 0;
                    const p3Progress = computeDynamicProgress(section.part3, 'part3') || section.part3_progress || 0;

                    const isFullyWorking = (p1Progress === 100 && p2Progress === 100 && p3Progress === 100) || section.responsibility === 'VENDOR';

                    return (
                        <div 
                            key={section.dbId} 
                            className={`prism-card !p-0 border border-l-[6px] ${
                                nodeState === 3 
                                ? 'border-accent-secondary/20 border-l-accent-secondary bg-accent-secondary/[0.04] shadow-[0_0_30px_rgba(0,255,163,0.1)] hover:border-accent-secondary hover:shadow-[0_0_40px_rgba(0,255,163,0.2)]' 
                                : `border-transparent bg-[#111216]/95 shadow-[0_15px_40px_rgba(0,0,0,0.5)] hover:border-accent-primary ${nodeState === -1 ? 'border-l-[#ff2a2a]' : 'border-l-accent-primary'}`
                            } backdrop-blur-xl overflow-hidden group transition-all duration-300 hover:scale-[1.002] flex flex-col`}
                        >
                            <div className="grid grid-cols-[2.5fr_1fr_1.5fr_2.4fr_1.8fr] items-stretch min-h-[120px] flex-1">
                                
                                {/* IDENTITY ZONE: ID + TITLE */}
                                <div className="py-6 border-r border-white/5 flex flex-col justify-center transition-colors hover:bg-white/[0.02] cursor-pointer" style={{ paddingLeft: '3.5rem', paddingRight: '2rem' }} onClick={() => onNavigateToSection(section)}>
                                    <div>
                                        <div className={`font-black text-[22px] transition-all duration-500 ${
                                            nodeState === 3 
                                            ? 'text-accent-secondary drop-shadow-[0_0_15px_rgba(0,255,163,0.8)]' 
                                            : (nodeState === -1 
                                               ? 'text-[#ff2a2a] drop-shadow-[0_0_15px_rgba(255,42,42,0.8)] animate-pulse' 
                                               : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                                            )} inline-block italic uppercase tracking-tighter mb-1`}>
                                            {section.id}
                                        </div>
                                        <div className="text-[11px] font-black text-white/90 uppercase leading-relaxed tracking-tight pr-4">
                                            {section.title}
                                        </div>
                                    </div>
                                </div>

                                {/* SOURCE ZONE: RESPONSIBILITY */}
                                <div className="py-6 border-r border-white/5 flex flex-col justify-center items-center text-center px-4">
                                    {(() => {
                                        const assignments = activeProject?.metadata?.vendor_assignments || {};
                                        let assignedVendor = null;
                                        for (const [vendor, specs] of Object.entries(assignments)) {
                                            if (specs.includes(section.id)) {
                                                assignedVendor = vendor;
                                                break;
                                            }
                                        }

                                        return (
                                            <div className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                                assignedVendor 
                                                ? 'text-accent-secondary drop-shadow-[0_0_8px_rgba(0,255,163,0.5)]' 
                                                : 'text-accent-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]'
                                            }`}>
                                                {assignedVendor ? assignedVendor : 'AI ENGINE'}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* ANATOMY ZONE: PART 1, 2, 3 METRICS */}
                                <div className="py-6 border-r border-white/5 flex flex-col justify-center items-center h-full w-full">
                                    <div className="flex flex-col justify-center items-stretch gap-4 w-[70%] h-full text-center">
                                        <div className="flex justify-between items-end w-full">
                                            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Part 1</span>
                                            <span className={`text-[14px] font-black leading-none italic ${p1Progress === 100 ? 'text-accent-secondary drop-shadow-[0_0_8px_rgba(0,255,163,0.6)]' : p1Progress > 0 ? 'text-accent-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.6)]' : 'text-white/20'}`}>
                                                {p1Progress}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end w-full">
                                            <span className={`text-[10px] font-black tracking-widest uppercase ${nodeState === -1 ? 'text-[#ff2a2a] drop-shadow-[0_0_5px_rgba(255,42,42,0.8)] animate-pulse' : 'text-white/40'}`}>Part 2</span>
                                            <span className={`text-[14px] font-black leading-none italic ${nodeState === -1 ? 'text-[#ff2a2a] drop-shadow-[0_0_8px_rgba(255,42,42,0.8)]' : p2Progress === 100 ? 'text-accent-secondary drop-shadow-[0_0_8px_rgba(0,255,163,0.6)]' : p2Progress > 0 ? 'text-accent-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.6)]' : 'text-white/20'}`}>
                                                {nodeState === -1 ? 'ERR' : `${p2Progress}%`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end w-full">
                                            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Part 3</span>
                                            <span className={`text-[14px] font-black leading-none italic ${p3Progress === 100 ? 'text-accent-secondary drop-shadow-[0_0_8px_rgba(0,255,163,0.6)]' : p3Progress > 0 ? 'text-accent-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.6)]' : 'text-white/20'}`}>
                                                {p3Progress}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* PIPELINE ZONE: THE 3-NODE FACTORY TRACKER */}
                                <div className="py-6 border-r border-white/5 flex flex-col justify-center items-center bg-black/20 relative h-full w-full overflow-hidden">
                                     <div className="flex items-center justify-between relative z-10 w-[70%]">
                                         {/* Horizontal Connecting Lines */}
                                         <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -z-10 translate-y-[-50%]"></div>
                                         <div className={`absolute top-1/2 left-0 h-[2px] -z-10 translate-y-[-50%] transition-all duration-1000 ${nodeState === 1 || nodeState === -1 ? 'w-[0%]' : nodeState === 2 ? 'w-[50%]' : 'w-[100%]'} ${nodeState >= 2 ? 'bg-accent-secondary shadow-[0_0_15px_rgba(0,255,163,0.6)]' : 'bg-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.6)]'}`}></div>

                                         {/* EXCEPTION X (Rendered if nodeState === -1) */}
                                         {nodeState === -1 && (
                                            <div className="absolute left-[25%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-20">
                                                <div className="relative w-4 h-4 flex items-center justify-center">
                                                    <div className="absolute w-[3px] h-4 bg-[#ff2a2a] rotate-[45deg] shadow-[0_0_10px_rgba(255,42,42,0.9)]"></div>
                                                    <div className="absolute w-[3px] h-4 bg-[#ff2a2a] rotate-[-45deg] shadow-[0_0_10px_rgba(255,42,42,0.9)]"></div>
                                                </div>
                                                <div className="absolute top-[44px] whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-[#ff2a2a] drop-shadow-[0_0_8px_rgba(255,42,42,0.9)] animate-pulse">Needs Human</div>
                                            </div>
                                         )}

                                         {/* Node 1: Working */}
                                         <div className={`flex flex-col items-center relative transition-opacity ${nodeState === -1 ? 'opacity-30' : 'opacity-100'}`}>
                                             <div className={`w-4 h-4 rounded-full flex shrink-0 items-center justify-center border-2 transition-all ${
                                                 isFullyWorking ? 'bg-[#0a0b0e] border-accent-secondary shadow-[0_0_15px_rgba(0,255,163,0.6)]' : 
                                                 (nodeState === 1 || nodeState === -1) ? 'bg-[#0a0b0e] border-accent-primary shadow-[0_0_15px_rgba(255,107,0,0.6)]' : 
                                                 'bg-[#18181A] border-white/10'
                                             }`}>
                                                 {isFullyWorking ? (
                                                     <CheckCircle2 size={10} strokeWidth={4} className="text-accent-secondary" />
                                                 ) : (nodeState === 1 || nodeState === -1 || nodeState >= 2) ? (
                                                     <div className="w-2 h-2 rounded-full bg-accent-primary" />
                                                 ) : null}
                                             </div>
                                             <span className={`text-[10px] font-black uppercase tracking-widest absolute top-6 whitespace-nowrap ${
                                                 isFullyWorking ? 'text-accent-secondary drop-shadow-[0_0_8px_rgba(0,255,163,0.8)]' : 
                                                 nodeState >= 1 ? 'text-accent-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.8)]' : 
                                                 'text-white/30'
                                             }`}>Working</span>
                                         </div>

                                         {/* Node 2: Verified */}
                                         <div className={`flex flex-col items-center relative transition-opacity ${nodeState === -1 ? 'opacity-30' : 'opacity-100'}`}>
                                             <div className={`w-4 h-4 rounded-full flex shrink-0 items-center justify-center border-2 transition-all ${nodeState >= 2 ? 'bg-[#0a0b0e] border-accent-secondary shadow-[0_0_15px_rgba(0,255,163,0.6)]' : 'bg-[#18181A] border-white/10'}`}>
                                                 {nodeState >= 2 && (
                                                     <CheckCircle2 size={10} strokeWidth={4} className="text-accent-secondary" />
                                                 )}
                                             </div>
                                             <span className={`text-[10px] font-black uppercase tracking-widest absolute top-6 whitespace-nowrap ${nodeState >= 2 ? 'text-accent-secondary drop-shadow-[0_0_8px_rgba(0,255,163,0.8)]' : 'text-white/30'}`}>Verified</span>
                                         </div>

                                         {/* Node 3: Sent */}
                                         <div className={`flex flex-col items-center relative transition-opacity ${nodeState === -1 ? 'opacity-30' : 'opacity-100'}`}>
                                             <div className={`w-4 h-4 rounded-full flex shrink-0 items-center justify-center border-2 transition-all ${nodeState === 3 ? 'bg-[#0a0b0e] border-accent-secondary shadow-[0_0_15px_rgba(0,255,163,0.6)]' : 'bg-[#18181A] border-white/10'}`}>
                                                  {nodeState === 3 && <CheckCircle2 size={10} strokeWidth={4} className="text-accent-secondary" />}
                                             </div>
                                             <span className={`text-[10px] font-black uppercase tracking-widest absolute top-6 whitespace-nowrap ${nodeState === 3 ? 'text-accent-secondary drop-shadow-[0_0_8px_rgba(0,255,163,0.8)]' : 'text-white/30'}`}>Sent</span>
                                         </div>
                                     </div>
                                </div>

                                {/* NOTES ZONE */}
                                <div className="relative flex h-full w-full">
                                    <textarea 
                                        className="w-full h-full bg-white/[0.015] hover:bg-white/[0.03] border-transparent focus:bg-white/[0.05] outline-none text-[11px] text-white/90 custom-scrollbar resize-none font-medium leading-relaxed transition-all p-6"
                                        placeholder="Add note..."
                                        value={editingNotes === section.dbId ? tempNotes : (section.tracker_notes || '')}
                                        onFocus={() => {
                                            setEditingNotes(section.dbId);
                                            setTempNotes(section.tracker_notes || '');
                                        }}
                                        onChange={(e) => setTempNotes(e.target.value)}
                                        onBlur={() => {
                                            handleUpdateField(section.dbId, 'tracker_notes', tempNotes);
                                            setEditingNotes(null);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {sortedSections.length === 0 && (
                    <div className="prism-card p-24 text-center bg-[#111216]/50 border-dashed border-2 border-white/5 rounded-[40px]">
                        <div className="text-text-muted font-black uppercase tracking-[0.8em] text-sm opacity-20">
                            No Active Submittals
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackerView;
