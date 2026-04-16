import React from 'react';
import { Trash, AlertTriangle, X } from 'lucide-react';

const DeleteProjectPlusModal = ({ 
    isOpen, 
    onClose, 
    onDelete, 
    activeProject 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-6 overflow-y-auto">
            <div className="bg-[#14161b] w-full max-w-[500px] rounded-[24px] border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.8)] relative animate-scale-in my-auto">
                
                {/* Visual Accent - Subtle Glow */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent-danger/50 to-transparent"></div>

                {/* Header Actions - Moved further down and left */}
                <div className="flex justify-end pt-10 pr-10">
                    <button 
                        onClick={onClose}
                        className="text-text-muted hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Recalibrated Vertical Rhythm */}
                <div className="w-full px-12 pt-4 pb-16 flex flex-col items-center text-center min-h-[640px] justify-center">
                    
                    {/* ICON SPACE */}
                    <div 
                        className="w-20 h-20 flex-shrink-0 bg-accent-danger/10 rounded-2xl flex items-center justify-center border border-accent-danger/20 shadow-[0_0_40px_rgba(255,59,48,0.15)]"
                        style={{ marginBottom: '48px' }}
                    >
                        <Trash size={32} className="text-accent-danger" />
                    </div>

                    {/* HEADING SPACE */}
                    <h2 
                        className="text-[28px] font-black text-white tracking-tight uppercase italic leading-tight"
                        style={{ marginBottom: '32px' }}
                    >
                        CONFIRM DELETION V4.2
                    </h2>
                    
                    {/* DESCRIPTION SPACE */}
                    <p 
                        className="text-[15px] text-text-muted leading-relaxed max-w-[380px]"
                        style={{ marginBottom: '64px' }}
                    >
                        You are about to permanently remove <span className="text-white font-bold">"{activeProject?.name || "this project"}"</span>. This action cannot be reversed.
                    </p>

                    {/* ACTION BUTTONS SPACE */}
                    <div className="flex flex-col gap-5 w-full max-w-[320px] items-center">
                        <button 
                            onClick={async () => {
                                await onDelete(activeProject);
                                onClose();
                            }}
                            className="btn-danger w-full flex items-center justify-center gap-3 !py-4 font-black text-[12px] uppercase tracking-[0.2em] italic transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Trash size={16} /> DELETE PROJECT
                        </button>
                        
                        <button 
                            onClick={onClose}
                            className="w-full bg-white/5 border border-white/10 text-white flex items-center justify-center !py-4 rounded-[10px] font-black text-[12px] uppercase tracking-[0.2em] italic hover:bg-white/10 transition-all active:scale-[0.98]"
                        >
                            KEEP PROJECT
                        </button>
                    </div>

                    {/* FOOTER SPACE */}
                    <div 
                        className="flex items-center justify-center gap-3 text-[11px] font-bold text-accent-danger/60 uppercase tracking-[0.3em]"
                        style={{ marginTop: '90px' }}
                    >
                        <AlertTriangle size={14} />
                        Final Confirmation Required
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteProjectPlusModal;
