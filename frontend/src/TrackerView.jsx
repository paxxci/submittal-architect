import React, { useState, useMemo } from 'react';
import { supabase } from './supabase';
import { CheckCircle2, AlertCircle, FileText, ChevronRight } from 'lucide-react';

const TrackerView = ({ projectData, activeProject, onNavigateToSection, onUpdateSection, onRefreshData }) => {
    const sortedSections = useMemo(() => {
        if (!projectData || !projectData.recentItems) return [];
        return [...projectData.recentItems].sort((a, b) => {
            const aNum = a.id.match(/^[0-9.]+/)?.[0] || a.id;
            const bNum = b.id.match(/^[0-9.]+/)?.[0] || b.id;
            return aNum.localeCompare(bNum, undefined, { numeric: true });
        });
    }, [projectData]);

    const [editingNotes, setEditingNotes] = useState(null);
    const [tempNotes, setTempNotes] = useState("");

    const calculateSectionProgress = (section) => {
        // In the future this will be calculated directly from part 1,2,3 cut sheet completion %
        // For now, providing a baseline logic.
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

            {/* COMPACT COLUMN HEADERS */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr_2.5fr_0.5fr] items-center text-[10px] uppercase tracking-[0.4em] font-black text-white/30 italic mb-4 pb-4">
                <div style={{ paddingLeft: '3.5rem', paddingRight: '2rem' }}>Identity</div>
                <div style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>Responsibility</div>
                <div style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>Coverage</div>
                <div style={{ paddingLeft: '1rem', paddingRight: '1rem' }}>Notes</div>
                <div className="text-center"></div>
            </div>

            <div className="space-y-6">
                {/* Submittal Cards */}
                {sortedSections.map(section => {
                    const progress = calculateSectionProgress(section);
                    
                    return (
                        <div 
                            key={section.dbId} 
                            className="prism-card !p-0 border-l-[6px] border-l-accent-primary bg-[#111216]/95 backdrop-blur-xl overflow-hidden group hover:border-accent-primary shadow-[0_15px_40px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-[1.002]"
                        >
                            <div className="grid grid-cols-[2fr_1.5fr_1fr_2.5fr_0.5fr] items-stretch min-h-[120px]">
                                
                                {/* IDENTITY ZONE: ID + TITLE */}
                                <div className="py-6 border-r border-white/5 flex flex-col justify-center" style={{ paddingLeft: '3.5rem', paddingRight: '2rem' }}>
                                    <div>
                                        <div 
                                            className="font-black text-lg text-accent-primary cursor-pointer hover:underline inline-block italic uppercase tracking-tighter mb-1"
                                            onClick={() => onNavigateToSection(section)}
                                        >
                                            {section.id}
                                        </div>
                                        <div className="text-[11px] font-black text-white/90 uppercase leading-relaxed tracking-tight pr-4">
                                            {section.title}
                                        </div>
                                    </div>
                                </div>

                                {/* RESPONSIBILITY ZONE */}
                                <div className="py-6 border-r border-white/5 flex flex-col justify-center space-y-6" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
                                    <div className="flex flex-col gap-3">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted opacity-40">Owner</span>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                { id: 'SELF', label: 'Self-Perform' },
                                                { id: 'VENDOR', label: 'Vendor-Managed' },
                                                { id: 'NA', label: 'Not Applicable' }
                                            ].map(opt => {
                                                const isSelected = (section.responsibility || 'SELF') === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => {
                                                            if (!isSelected) {
                                                                handleUpdateField(section.dbId, 'responsibility', opt.id);
                                                                if (opt.id === 'SELF' || opt.id === 'NA') {
                                                                    handleUpdateField(section.dbId, 'assigned_to', null);
                                                                }
                                                            }
                                                        }}
                                                        className={`text-left w-full text-[10px] font-black uppercase tracking-[0.1em] px-3 py-2 rounded-lg transition-all border ${isSelected ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(var(--accent-primary-rgb,0,229,255),0.1)]' : 'border-transparent text-text-muted opacity-50 hover:opacity-100 hover:bg-white/5'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {section.responsibility === 'VENDOR' && (
                                        <div className="flex flex-col gap-2 animate-fade-in border-t border-white/5 pt-4">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-primary opacity-60">Vendor Assignment</span>
                                            <select 
                                                className="bg-[#0a0b0e] border border-white/10 rounded-lg px-2 py-2 text-[10px] font-black text-accent-primary uppercase tracking-[0.1em] focus:outline-none focus:border-accent-primary cursor-pointer w-full transition-colors"
                                                value={section.assigned_to || ''}
                                                onChange={(e) => handleUpdateField(section.dbId, 'assigned_to', e.target.value)}
                                            >
                                                <option value="">Awaiting Vendor...</option>
                                                {(activeProject?.metadata?.sourcing_prefs?.authorizedVendors || []).map(vendor => (
                                                    <option key={vendor} value={vendor}>{vendor}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* PERFORMANCE ZONE: COVERAGE METRICS */}
                                <div className="py-6 border-r border-white/5 flex flex-col justify-center" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
                                    <div className="w-full max-w-[120px] space-y-3">
                                        <div className="flex items-end justify-start gap-2">
                                            <span className={`text-2xl font-black italic lnr ${progress === 100 ? 'text-accent-secondary' : progress > 0 ? 'text-white' : 'text-white/20'}`}>
                                                {progress}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden w-full">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-accent-secondary shadow-[0_0_15px_rgba(0,255,163,0.5)]' : 'bg-accent-primary'}`} 
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-text-muted opacity-40 text-left">
                                            {progress === 0 ? 'Not Started' : progress === 100 ? 'Complete' : 'In Progress'}
                                        </div>
                                    </div>
                                </div>

                                {/* INTELLIGENCE ZONE: NOTES */}
                                <div className="relative flex border-r border-white/5 h-full w-full">
                                    <textarea 
                                        className="w-full h-full bg-white/[0.015] hover:bg-white/[0.03] border-transparent focus:bg-white/[0.05] outline-none text-[12px] text-white/90 custom-scrollbar resize-none font-medium leading-relaxed transition-all"
                                        style={{ padding: '1rem' }}
                                        placeholder="Notes"
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

                                {/* ACTION ZONE: NAVIGATION */}
                                <div className="px-8 flex items-center justify-center">
                                    <button 
                                        onClick={() => onNavigateToSection(section)}
                                        className="inline-flex items-center justify-center text-white/20 hover:text-accent-primary transition-all duration-500 group/btn"
                                        title="Navigate to Blueprint"
                                    >
                                        <ChevronRight size={32} className="group-hover/btn:translate-x-2 transition-transform" />
                                    </button>
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
