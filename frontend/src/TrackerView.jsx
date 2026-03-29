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
        let progress = 0;
        if (section.tracker_status === 'Done') return 100;
        if (section.tracker_status === 'Working') progress += 50;
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
                    .update({ [field === 'tracker_status' ? 'tracker_status' : 'tracker_notes']: value })
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'Done': return 'bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/50';
            case 'Working': return 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50';
            case 'Revise & Resubmit': return 'bg-red-500/20 text-red-500 border border-red-500/50';
            default: return 'bg-white/5 text-text-muted border border-white/10';
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0b0e] text-text-primary p-8 overflow-y-auto custom-scrollbar">
            
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight mb-2">Submittal Tracker</h1>
                <p className="text-text-muted">Master log for {activeProject?.name || 'Unknown Project'}. Changes here save instantly.</p>
            </div>

            <div className="bg-[#111216] rounded-xl border border-white/5 overflow-hidden shadow-2xl relative">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-widest font-bold text-text-muted">
                            <th className="p-4 py-5 w-[20%]">Spec & Description</th>
                            <th className="p-4 py-5 w-[15%]">Assigned To</th>
                            <th className="p-4 py-5 w-[15%]">Progress</th>
                            <th className="p-4 py-5 w-[15%]">Status</th>
                            <th className="p-4 py-5 w-[25%]">Notes</th>
                            <th className="p-4 py-5 w-[10%] text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedSections.map(section => {
                            const progress = section.responsibility === 'VENDOR' && section.full_submittal_url ? 100 : calculateSectionProgress(section);
                            
                            return (
                                <tr key={section.dbId} className="hover:bg-white/[0.02] transition-colors group">
                                    
                                    <td className="p-4 align-top">
                                        <div 
                                            className="font-bold text-accent-primary cursor-pointer hover:underline flex items-center gap-1"
                                            onClick={() => onNavigateToSection(section)}
                                        >
                                            {section.id}
                                        </div>
                                        <div className="text-xs text-text-muted mt-1 leading-relaxed pr-4">
                                            {section.title}
                                        </div>
                                    </td>

                                    <td className="p-4 align-top min-w-[160px]">
                                        <div className="flex flex-col gap-2">
                                            <select 
                                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-white focus:outline-none focus:border-accent-primary"
                                                value={section.responsibility || 'SELF'}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    handleUpdateField(section.dbId, 'responsibility', val);
                                                    if (val === 'SELF' || val === 'NA') {
                                                        handleUpdateField(section.dbId, 'assigned_to', null);
                                                    }
                                                }}
                                            >
                                                <option value="SELF" className="bg-[#111216]">Self-Perform</option>
                                                <option value="VENDOR" className="bg-[#111216]">Vendor-Managed</option>
                                                <option value="NA" className="bg-[#111216]">Not Applicable</option>
                                            </select>

                                            {/* Secondary Vendor Selection (Only if VENDOR is selected) */}
                                            {section.responsibility === 'VENDOR' && (
                                                <select 
                                                    className="w-full bg-accent-primary/10 border border-accent-primary/20 rounded px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent-primary focus:outline-none"
                                                    value={section.assigned_to || ''}
                                                    onChange={(e) => handleUpdateField(section.dbId, 'assigned_to', e.target.value)}
                                                >
                                                    <option value="" className="bg-[#111216]">Choose Vendor...</option>
                                                    {(activeProject?.metadata?.sourcing_prefs?.authorizedVendors || []).map(vendor => (
                                                        <option key={vendor} value={vendor} className="bg-[#111216]">{vendor}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </td>

                                    {/* Progress Bar */}
                                    <td className="p-4 align-top pt-6">
                                        <div className="flex items-center gap-3 w-full max-w-[120px]">
                                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-accent-secondary' : 'bg-accent-primary'}`} 
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            <span className={`text-xs font-bold w-8 text-right ${progress === 100 ? 'text-accent-secondary' : 'text-text-muted'}`}>
                                                {progress}%
                                            </span>
                                        </div>
                                    </td>

                                    {/* Status Indicator */}
                                    <td className="p-4 align-top">
                                        <select 
                                            value={section.tracker_status || 'Not Started'}
                                            onChange={(e) => handleUpdateField(section.dbId, 'tracker_status', e.target.value)}
                                            className={`appearance-none text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full outline-none cursor-pointer transition-colors ${getStatusColor(section.tracker_status || 'Not Started')}`}
                                            autoFocus={false}
                                        >
                                            <option value="Not Started" className="bg-[#111216] text-white">Not Started</option>
                                            <option value="Working" className="bg-[#111216] text-white">Working</option>
                                            <option value="Done" className="bg-[#111216] text-white">Done</option>
                                            <option value="Revise & Resubmit" className="bg-[#111216] text-white">Revise & Resubmit</option>
                                        </select>
                                    </td>

                                    {/* Inline Notes */}
                                    <td className="p-4 align-top group/notes relative cursor-text" onClick={() => {
                                        if (editingNotes !== section.dbId) {
                                            setEditingNotes(section.dbId);
                                            setTempNotes(section.tracker_notes || '');
                                        }
                                    }}>
                                        {editingNotes === section.dbId ? (
                                            <div className="relative">
                                                <textarea 
                                                    autoFocus
                                                    className="w-full min-h-[80px] bg-black/40 border border-accent-primary/50 outline-none rounded p-2 text-xs text-text-primary custom-scrollbar resize-y"
                                                    value={tempNotes}
                                                    onChange={(e) => setTempNotes(e.target.value)}
                                                    onBlur={() => {
                                                        handleUpdateField(section.dbId, 'tracker_notes', tempNotes);
                                                        setEditingNotes(null);
                                                    }}
                                                />
                                                <div className="absolute right-2 bottom-2 text-[10px] text-accent-primary font-bold bg-black/60 px-2 py-0.5 rounded pointer-events-none">
                                                    Enter to save
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`text-xs leading-relaxed min-h-[40px] p-2 rounded transition-colors ${section.tracker_notes ? 'text-text-primary' : 'text-text-muted/50 italic'} group-hover/notes:bg-white/5`}>
                                                {section.tracker_notes || "Click to add notes..."}
                                            </div>
                                        )}
                                    </td>

                                    {/* Action Column */}
                                    <td className="p-4 align-top text-center pt-5">
                                        <button 
                                            onClick={() => onNavigateToSection(section)}
                                            className="inline-flex items-center justify-center p-2 rounded-full hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                                            title="Open in Workbench"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}

                        {sections.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-text-muted">
                                    No specification sections found for this project.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TrackerView;
