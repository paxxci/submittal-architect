import React, { useState } from 'react';
import { Layers, CheckCircle2, ChevronRight, FileText, Printer, Send } from 'lucide-react';

const AssemblyEngineView = ({ projectData, activeProject }) => {
    const [selectedSection, setSelectedSection] = useState(null);

    // Mock sections for UI demonstration (Eventually these will be sections marked 100% complete)
    const mockReadySections = [
        { id: '26 05 19', title: 'Low-Voltage Electrical Power Conductors', pages: 14 },
        { id: '26 05 33', title: 'Raceways and Boxes for Electrical Systems', pages: 8 },
        { id: '26 05 53', title: 'Identification for Electrical Systems', pages: 3 },
        { id: '26 27 26', title: 'Wiring Devices', pages: 22 },
    ];

    return (
        <div className="tracker-container animate-fade-in py-8 px-6 lg:px-12 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-4">
                        <Layers className="text-accent-primary" size={32} />
                        ASSEMBLE SUBMITTAL
                    </h1>
                    <p className="text-text-muted mt-2 tracking-widest text-xs uppercase font-bold">
                        {activeProject?.name || 'Active Project'} • Publishing Hub
                    </p>
                </div>
            </div>

            {/* Split Screen Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
                
                {/* Left Column: Sections Ready */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-full prism-card overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl relative">
                    <div className="p-6 border-b border-white/5 bg-black/20 shrink-0">
                        <h2 className="text-sm font-black uppercase tracking-widest text-accent-primary flex items-center gap-2">
                            <CheckCircle2 size={16} /> Ready to Assemble
                        </h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {mockReadySections.map(section => (
                            <button 
                                key={section.id}
                                onClick={() => setSelectedSection(section.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${
                                    selectedSection === section.id 
                                    ? 'bg-accent-primary/10 border-accent-primary shadow-lg shadow-accent-primary/20' 
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }`}
                            >
                                <div className="text-xs font-black uppercase text-accent-primary tracking-widest mb-1">{section.id}</div>
                                <div className="text-sm font-bold text-white truncate mb-2">{section.title}</div>
                                <div className="text-[10px] text-text-muted uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={12} /> {section.pages} Pages Locked
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Column: PDF Preview Canvas */}
                <div className="col-span-12 lg:col-span-8 flex flex-col h-full prism-card overflow-hidden border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl relative">
                    {selectedSection ? (
                        <>
                            {/* Toolbar */}
                            <div className="h-16 border-b border-white/10 bg-white/5 flex items-center justify-between px-6 shrink-0">
                                <div className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                                    <Printer size={16} className="text-accent-primary" /> Preview Canvas
                                </div>
                                <div className="flex gap-4">
                                    <button className="btn-primary !px-6 flex items-center gap-2">
                                        <Send size={16} /> Send Submittal
                                    </button>
                                </div>
                            </div>
                            
                            {/* Canvas Zone */}
                            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 bg-black/20">
                                {/* Fake Cover Page */}
                                <div className="w-full max-w-2xl aspect-[8.5/11] bg-white text-black p-12 shadow-xl relative flex flex-col justify-center items-center text-center">
                                    <h1 className="text-4xl font-black uppercase mb-4 tracking-widest">Submittal Package</h1>
                                    <h2 className="text-xl font-bold uppercase text-gray-500 tracking-widest">{activeProject?.name || 'Project Name'}</h2>
                                    <div className="w-24 h-1 bg-black my-8"></div>
                                    <h3 className="text-2xl font-black uppercase text-red-600 mb-2">{selectedSection}</h3>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                                        {mockReadySections.find(s => s.id === selectedSection)?.title}
                                    </p>
                                </div>
                                
                                {/* Fake Cut Sheet Page 1 */}
                                <div className="w-full max-w-2xl aspect-[8.5/11] bg-white p-12 shadow-xl opacity-80 flex flex-col items-center justify-center border-t-8 border-red-600">
                                    <FileText size={48} className="text-gray-300 mb-4" />
                                    <div className="text-gray-400 font-bold uppercase tracking-widest">Cut Sheet Payload</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <Layers size={64} className="text-white/10 mb-6" />
                            <h3 className="text-xl font-black text-white/50 uppercase tracking-widest mb-2">Awaiting Selection</h3>
                            <p className="text-sm text-text-muted">Select a completed spec section from the left to compile the canvas.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AssemblyEngineView;
