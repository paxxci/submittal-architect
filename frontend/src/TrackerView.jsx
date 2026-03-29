import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { CheckCircle2, AlertCircle, FileText, ChevronRight } from 'lucide-react';

const TrackerView = ({ projectData, activeProject, onNavigateToSection }) => {
    const [sections, setSections] = useState([]);
    const [editingNotes, setEditingNotes] = useState(null);
    const [tempNotes, setTempNotes] = useState("");

    // Initialize data from projectData (which holds the current loaded state)
    useEffect(() => {
        if (projectData && projectData.recentItems) {
            // Sort by numerical spec section
            const sortedItems = [...projectData.recentItems].sort((a, b) => {
                const aNum = a.title.match(/^[0-9.]+/)?.[0] || a.title;
                const bNum = b.title.match(/^[0-9.]+/)?.[0] || b.title;
                return aNum.localeCompare(bNum, undefined, { numeric: true });
            });
            setSections(sortedItems);
        }
    }, [projectData]);

    const calculateSectionProgress = (section) => {
        if (!section || !section.aiBlockMap) return 0;
        
        const aiBlocks = Object.keys(section.aiBlockMap);
        if (aiBlocks.length === 0) return 0;

        let completedValuesCount = 0;
        aiBlocks.forEach(blockKey => {
            const blockContent = section.aiBlockMap[blockKey];
            if (blockContent?.keyRequirements) {
                const requirements = typeof blockContent.keyRequirements === 'string'
                    ? JSON.parse(blockContent.keyRequirements)
                    : blockContent.keyRequirements;
                
                if (requirements && Array.isArray(requirements)) {
                    const hasVerified = requirements.some(req => 
                        req.verified === true || 
                        (req.value && req.value.toLowerCase().includes('verified'))
                    );
                    if (hasVerified) completedValuesCount++;
                }
            } else if (section.metadata?.sourcedBlocks && section.metadata.sourcedBlocks[blockKey]) {
                // If there are sourced blocks for this key, count it as completed
                completedValuesCount++;
            }
        });

        // Use sourcedBlocks length as an alternative metric if AI requirements are empty
        const sourcedBlocksCount = section.metadata?.sourcedBlocks ? Object.keys(section.metadata.sourcedBlocks).length : 0;
        const finalCount = Math.max(completedValuesCount, sourcedBlocksCount);

        const progressPercent = Math.min(100, Math.round((finalCount / aiBlocks.length) * 100));
        
        // Return 100% if manually marked DONE via completed_blocks (App level tracking)
        const completedBlocksTracker = section.metadata?.completed_blocks || [];
        if (completedBlocksTracker.length > 0 && progressPercent === 0) {
           return Math.min(100, Math.round((completedBlocksTracker.length / aiBlocks.length) * 100));
        }

        return progressPercent;
    };

    const handleUpdateField = async (id, field, value) => {
        // Optimistic UI update
        setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

        try {
            const { error } = await supabase
                .from('spec_sections')
                .update({ [field]: value })
                .eq('id', id);

            if (error) {
                console.error("Error updating tracker field:", error);
                alert("Failed to save changes.");
            }
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
                        {sections.map(section => {
                            const progress = section.responsibility === 'VENDOR' && section.full_submittal_url ? 100 : calculateSectionProgress(section);
                            
                            // Determine Unified Assignee
                            let assignee = section.assigned_to || '';
                            if (section.responsibility === 'VENDOR') assignee = section.vendor_name || 'Vendor';

                            const titleObj = section.title.match(/^([0-9.]+\s+[-]\s+)?(.*)$/);
                            const rawSpecNum = section.title.match(/^[0-9.]+/)?.[0] || "General";
                            const rawTitle = titleObj ? titleObj[2] : section.title;

                            return (
                                <tr key={section.id} className="hover:bg-white/[0.02] transition-colors group">
                                    
                                    {/* Spec Section & Description */}
                                    <td className="p-4 align-top">
                                        <div 
                                            className="font-bold text-accent-primary cursor-pointer hover:underline flex items-center gap-1"
                                            onClick={() => onNavigateToSection(section)}
                                        >
                                            {rawSpecNum}
                                        </div>
                                        <div className="text-xs text-text-muted mt-1 leading-relaxed pr-4">
                                            {rawTitle}
                                        </div>
                                    </td>

                                    {/* Assigned To (Unified) */}
                                    <td className="p-4 align-top">
                                        <input 
                                            type="text"
                                            className="w-full bg-transparent border-b border-white/10 focus:border-accent-primary outline-none px-1 py-1 text-sm transition-colors cursor-text"
                                            placeholder="Assignee Name"
                                            value={section.assigned_to || ''}
                                            onChange={(e) => {
                                                setSections(prev => prev.map(s => s.id === section.id ? { ...s, assigned_to: e.target.value } : s));
                                            }}
                                            onBlur={(e) => handleUpdateField(section.id, 'assigned_to', e.target.value)}
                                        />
                                        {section.responsibility === 'VENDOR' && (
                                            <div className="text-[10px] text-accent-primary mt-1 uppercase tracking-widest font-bold">Vendor: {section.vendor_name || 'Unassigned'}</div>
                                        )}
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
                                            onChange={(e) => handleUpdateField(section.id, 'tracker_status', e.target.value)}
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
                                        if (editingNotes !== section.id) {
                                            setEditingNotes(section.id);
                                            setTempNotes(section.tracker_notes || '');
                                        }
                                    }}>
                                        {editingNotes === section.id ? (
                                            <div className="relative">
                                                <textarea 
                                                    autoFocus
                                                    className="w-full min-h-[80px] bg-black/40 border border-accent-primary/50 outline-none rounded p-2 text-xs text-text-primary custom-scrollbar resize-y"
                                                    value={tempNotes}
                                                    onChange={(e) => setTempNotes(e.target.value)}
                                                    onBlur={() => {
                                                        handleUpdateField(section.id, 'tracker_notes', tempNotes);
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
