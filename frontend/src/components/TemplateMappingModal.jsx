import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Save, MousePointer2, Move, FileText } from 'lucide-react';
import { supabase } from '../supabase';

const AVAILABLE_TAGS = [
    { id: 'projectName', label: '[Project Name]' },
    { id: 'sectionNumber', label: '[Section Number]' },
    { id: 'sectionTitle', label: '[Section Title]' },
    { id: 'date', label: '[Date]' },
    { id: 'pmName', label: '[PM Name]' },
    { id: 'companyName', label: '[Company Name]' },
    { id: 'companyAddress', label: '[Company Address]' },
    { id: 'companyPhone', label: '[Company Phone]' }
];

const TemplateMappingModal = ({ isOpen, onClose, template, onSaveSuccess }) => {
    // mappings state: { [tagId]: { x: 0.5, y: 0.5 } } (percentages)
    const [mappings, setMappings] = useState({});
    const [selectedTag, setSelectedTag] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const overlayRef = useRef(null);

    useEffect(() => {
        if (isOpen && template) {
            // Load existing mappings if any
            if (template.metadata?.mapping) {
                setMappings(template.metadata.mapping);
            } else {
                setMappings({});
            }
            setSelectedTag(null);
        }
    }, [isOpen, template]);

    if (!isOpen || !template) return null;

    const handleOverlayClick = (e) => {
        if (!selectedTag || !overlayRef.current) return;

        const rect = overlayRef.current.getBoundingClientRect();
        // Calculate click position as a percentage of the width/height (0.0 to 1.0)
        const xPercent = (e.clientX - rect.left) / rect.width;
        const yPercent = (e.clientY - rect.top) / rect.height;

        setMappings(prev => ({
            ...prev,
            [selectedTag]: { x: xPercent, y: yPercent }
        }));
        
        // Auto-deselect after placing
        setSelectedTag(null);
    };

    const removeTag = (e, tagId) => {
        e.stopPropagation();
        setMappings(prev => {
            const next = { ...prev };
            delete next[tagId];
            return next;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedMetadata = { ...template.metadata, mapping: mappings };
            const { data, error } = await supabase
                .from('templates')
                .update({ metadata: updatedMetadata })
                .eq('id', template.id)
                .select();
                
            if (error) throw error;
            
            if (onSaveSuccess) {
                onSaveSuccess(data[0]);
            }
            onClose();
        } catch (err) {
            console.error("Error saving template mapping:", err);
            alert("Failed to save mapping: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <div className="w-full max-w-7xl h-full max-h-[90vh] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden animate-fade-in">
                
                {/* LEFT SIDEBAR: Tools */}
                <div className="w-full lg:w-80 bg-white/5 border-r border-white/10 flex flex-col shrink-0">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-widest text-white">Mapping Studio</h2>
                            <p className="text-xs text-text-muted mt-1 uppercase tracking-widest font-bold">Configure Template Fields</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        <p className="text-sm text-text-muted mb-6 leading-relaxed">
                            Click a tag below to select it, then click anywhere on the PDF canvas to place it. The Engine will stamp the data exactly at that spot.
                        </p>

                        <div className="flex flex-col gap-3">
                            {AVAILABLE_TAGS.map(tag => {
                                const isMapped = !!mappings[tag.id];
                                const isSelected = selectedTag === tag.id;
                                
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => setSelectedTag(isSelected ? null : tag.id)}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left ${
                                            isSelected 
                                                ? 'bg-accent-primary/20 border-accent-primary text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                                                : isMapped
                                                    ? 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                                    : 'bg-transparent border-white/10 text-white/80 hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{tag.label}</span>
                                            <span className="text-[10px] uppercase tracking-widest font-black opacity-50 mt-1">
                                                {isMapped ? 'Mapped' : 'Unmapped'}
                                            </span>
                                        </div>
                                        {isMapped ? (
                                            <Check size={18} className="text-accent-secondary" />
                                        ) : isSelected ? (
                                            <MousePointer2 size={18} className="text-accent-primary animate-pulse" />
                                        ) : (
                                            <Move size={18} className="opacity-30" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/10">
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                        >
                            <Save size={18} /> {isSaving ? 'SAVING...' : 'SAVE MAPPING'}
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDE: Canvas */}
                <div className="flex-1 bg-black/40 flex items-center justify-center p-8 overflow-y-auto relative">
                    {/* The PDF Container - strictly 8.5x11 aspect ratio */}
                    <div className="relative w-full max-w-3xl aspect-[8.5/11] bg-white shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <iframe 
                            src={`${template.file_url}#toolbar=0&navpanes=0&view=FitH`} 
                            className="w-full h-full opacity-90 pointer-events-none"
                            title="Mapping Preview"
                        />
                        
                        {/* Interactive Overlay */}
                        <div 
                            ref={overlayRef}
                            onClick={handleOverlayClick}
                            className={`absolute inset-0 z-10 ${selectedTag ? 'cursor-crosshair bg-accent-primary/5' : 'cursor-default'}`}
                        >
                            {/* Render placed tags */}
                            {Object.entries(mappings).map(([tagId, coords]) => {
                                const tagInfo = AVAILABLE_TAGS.find(t => t.id === tagId);
                                if (!tagInfo) return null;
                                
                                return (
                                    <div 
                                        key={tagId}
                                        className="absolute group transform -translate-x-1/2 -translate-y-1/2"
                                        style={{ left: `${coords.x * 100}%`, top: `${coords.y * 100}%` }}
                                    >
                                        <div className="bg-accent-primary text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded shadow-lg border border-white/20 whitespace-nowrap flex items-center gap-2">
                                            {tagInfo.label}
                                            <button 
                                                onClick={(e) => removeTag(e, tagId)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-black bg-black/20 hover:bg-white/80 rounded-full p-0.5 ml-1"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                        {/* Crosshair indicator */}
                                        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_rgba(0,0,0,0.5)]"></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TemplateMappingModal;
