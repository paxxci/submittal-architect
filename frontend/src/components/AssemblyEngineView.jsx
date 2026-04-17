import React, { useState } from 'react';
import { Layers, CheckCircle, Circle, ChevronRight, FileText, Printer, Send } from 'lucide-react';

const AssemblyEngineView = ({ projectData, activeProject }) => {
    const [selectedSections, setSelectedSections] = useState([]);

    const toggleSection = (id) => {
        if (selectedSections.includes(id)) {
            setSelectedSections(selectedSections.filter(s => s !== id));
        } else {
            setSelectedSections([...selectedSections, id]);
        }
    };

    // Mock sections for UI demonstration (Eventually these will be sections marked 100% complete)
    const mockReadySections = [
        { id: '26 05 19', title: 'Low-Voltage Electrical Power Conductors', pages: 14 },
        { id: '26 05 33', title: 'Raceways and Boxes for Electrical Systems', pages: 8 },
        { id: '26 05 53', title: 'Identification for Electrical Systems', pages: 3 },
        { id: '26 27 26', title: 'Wiring Devices', pages: 22 },
    ];

    return (
        <div className="tracker-container animate-fade-in py-8 px-6 lg:px-12 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col">
            <svg width="0" height="0" className="absolute">
                <defs>
                    <linearGradient id="assembly-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                </defs>
            </svg>
            {/* COMMAND CENTER HEADER */}
            <div className="px-4 shrink-0" style={{ marginBottom: '1.5rem' }}>
                <h1 className="text-4xl font-black tracking-tighter italic uppercase" style={{ marginBottom: '4px' }}>
                    ASSEMBLE <span className="text-accent-primary">SUBMITTAL</span> <span className="text-white/20 mx-4 font-light">/</span> <span className="text-white">{activeProject?.name || 'ACTIVE PROJECT'}</span>
                </h1>
                
                <p className="text-text-muted font-black uppercase tracking-[0.3em] text-[11px] opacity-60">
                    <span className="text-accent-primary mr-3 text-lg font-black leading-none">/</span> PUBLISHING HUB
                </p>
            </div>

            {/* Split Screen Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
                
                {/* Left Column: Sections Ready */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-full prism-card overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl relative">
                    <div className="p-6 shrink-0 flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em]">Ready to Assemble</h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                        {mockReadySections.map(section => (
                            <div 
                                key={section.id}
                                onClick={() => toggleSection(section.id)}
                                className="group flex flex-row items-center justify-start rounded-lg cursor-pointer transition-all duration-200 bg-transparent border border-transparent hover:bg-white/5"
                                style={{ paddingTop: '16px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}
                            >
                                <div className="flex-shrink-0" style={{ marginRight: '40px' }}>
                                    {selectedSections.includes(section.id) ? (
                                        <CheckCircle size={26} color="url(#assembly-icon-gradient)" className="transition-all duration-300 scale-110" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} />
                                    ) : (
                                        <Circle size={26} className="text-white/20 transition-all duration-300 group-hover:scale-110 group-hover:text-white/40" />
                                    )}
                                </div>
                                
                                <div className="flex flex-col justify-center gap-1.5 truncate">
                                    <div className={`text-[15px] font-black uppercase tracking-widest ${selectedSections.includes(section.id) ? 'text-white' : 'text-white/60 group-hover:text-white/90 transition-colors'}`}>{section.id}</div>
                                    <div className={`text-[12px] uppercase font-bold tracking-widest truncate ${selectedSections.includes(section.id) ? 'text-accent-primary' : 'text-text-muted'}`}>{section.title}</div>
                                    <div className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                                        <FileText size={10} className={selectedSections.includes(section.id) ? 'text-accent-primary/70' : 'text-text-muted'} /> {section.pages} Pages Locked
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: PDF Preview Canvas */}
                <div className="col-span-12 lg:col-span-8 flex flex-col h-full relative">
                    {selectedSections.length > 0 ? (
                        <>
                            {/* Toolbar */}
                            <div className="h-16 flex items-center justify-between px-6 shrink-0">
                                <div className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                                    <Printer size={16} className="text-accent-primary" /> Preview Canvas
                                </div>
                                <div className="flex gap-4">
                                    <button className="btn-primary !px-6 flex items-center gap-2">
                                        <Send size={16} /> Compile & Send ({selectedSections.length})
                                    </button>
                                </div>
                            </div>
                            
                            {/* Canvas Zone */}
                            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8">
                                {/* Fake Cover Page */}
                                <div className="w-full max-w-2xl aspect-[8.5/11] bg-white text-black p-12 shadow-xl relative flex flex-col justify-center items-center text-center">
                                    <h1 className="text-4xl font-black uppercase mb-4 tracking-widest">Submittal Package</h1>
                                    <h2 className="text-xl font-bold uppercase text-gray-500 tracking-widest">{activeProject?.name || 'Project Name'}</h2>
                                    <div className="w-24 h-1 bg-black my-8"></div>
                                    <h3 className="text-2xl font-black uppercase text-red-600 mb-2">
                                        {selectedSections.length === 1 ? selectedSections[0] : `${selectedSections.length} Divisions Selected`}
                                    </h3>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                                        {selectedSections.length === 1 
                                            ? mockReadySections.find(s => s.id === selectedSections[0])?.title 
                                            : 'Multi-Batch Package Compilation'}
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
