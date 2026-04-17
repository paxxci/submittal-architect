import React, { useState } from 'react';
import { BookOpen, FileText, ChevronRight, Settings, Command, CheckCircle, Circle } from 'lucide-react';

const HelpAndDocsView = ({ setView }) => {
    const [activeSection, setActiveSection] = useState('project-setup');

    return (
        <div className="tracker-container animate-fade-in py-8 px-6 lg:px-12 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col">
            <svg width="0" height="0" className="absolute">
                <defs>
                    <linearGradient id="help-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                </defs>
            </svg>

            {/* COMMAND CENTER HEADER */}
            <div className="px-4 shrink-0" style={{ marginBottom: '1.5rem' }}>
                <h1 className="text-4xl font-black tracking-tighter italic uppercase" style={{ marginBottom: '4px' }}>
                    OPERATIONS <span className="text-accent-primary">MANUAL</span>
                </h1>
                
                <p className="text-text-muted font-black uppercase tracking-[0.3em] text-[11px] opacity-60">
                    <span className="text-accent-primary mr-3 text-lg font-black leading-none">/</span> HELP & DOCUMENTATION
                </p>
            </div>

            {/* Split Screen Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
                
                {/* Left Column: Index Rail */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-full prism-card overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl relative">
                    <div className="p-6 shrink-0 flex items-center justify-between border-b border-white/5">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <BookOpen size={16} color="url(#help-icon-gradient)" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} /> Table of Contents
                        </h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 mt-4">
                        {/* Section 1 */}
                        <div 
                            onClick={() => setActiveSection('project-setup')}
                            className="group flex flex-row items-center justify-start rounded-lg cursor-pointer transition-all duration-200 bg-transparent border border-transparent hover:bg-white/5"
                            style={{ paddingTop: '16px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}
                        >
                            <div className="flex-shrink-0" style={{ marginRight: '40px' }}>
                                {activeSection === 'project-setup' ? (
                                    <CheckCircle size={26} color="url(#help-icon-gradient)" className="transition-all duration-300 scale-110" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} />
                                ) : (
                                    <Circle size={26} className="text-white/20 transition-all duration-300 group-hover:scale-110 group-hover:text-white/40" />
                                )}
                            </div>
                            
                            <div className="flex flex-col justify-center gap-1.5 truncate">
                                <div className={`text-[15px] font-black uppercase tracking-widest ${activeSection === 'project-setup' ? 'text-white' : 'text-white/60 group-hover:text-white/90 transition-colors'}`}>Division 01</div>
                                <div className={`text-[12px] uppercase font-bold tracking-widest truncate ${activeSection === 'project-setup' ? 'text-accent-primary' : 'text-text-muted'}`}>Project Setup</div>
                                <div className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                                    <FileText size={10} className={activeSection === 'project-setup' ? 'text-accent-primary/70' : 'text-text-muted'} /> 2 Pages Locked
                                </div>
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div 
                            onClick={() => setActiveSection('company-hub')}
                            className="group flex flex-row items-center justify-start rounded-lg cursor-pointer transition-all duration-200 bg-transparent border border-transparent hover:bg-white/5"
                            style={{ paddingTop: '16px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}
                        >
                            <div className="flex-shrink-0" style={{ marginRight: '40px' }}>
                                {activeSection === 'company-hub' ? (
                                    <CheckCircle size={26} color="url(#help-icon-gradient)" className="transition-all duration-300 scale-110" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} />
                                ) : (
                                    <Circle size={26} className="text-white/20 transition-all duration-300 group-hover:scale-110 group-hover:text-white/40" />
                                )}
                            </div>
                            
                            <div className="flex flex-col justify-center gap-1.5 truncate">
                                <div className={`text-[15px] font-black uppercase tracking-widest ${activeSection === 'company-hub' ? 'text-white' : 'text-white/60 group-hover:text-white/90 transition-colors'}`}>Division 02</div>
                                <div className={`text-[12px] uppercase font-bold tracking-widest truncate ${activeSection === 'company-hub' ? 'text-accent-primary' : 'text-text-muted'}`}>Company Hub</div>
                                <div className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                                    <FileText size={10} className={activeSection === 'company-hub' ? 'text-accent-primary/70' : 'text-text-muted'} /> 1 Page Locked
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: PDF Blueprint Canvas */}
                <div className="col-span-12 lg:col-span-8 flex flex-col h-full relative">
                    {/* Simulated Paper Background */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-8 custom-scrollbar bg-[#0d0e12] border border-white/10 rounded-xl relative">
                        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)]" style={{ backgroundSize: '20px 20px' }}></div>
                        
                        {/* The Actual "Paper" Page */}
                        <div className="w-full max-w-3xl bg-white text-black shadow-2xl relative z-10 min-h-[1056px]" style={{ padding: '5rem 6rem' }}>
                            {/* Page Header */}
                            <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-12">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Submittal Architect Operations Manual</h4>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter mt-1">
                                        {activeSection === 'project-setup' ? 'Division 01 / Project Setup' : 'Division 02 / Company Hub'}
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg">REV 1.0</div>
                                    <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Page {activeSection === 'project-setup' ? '1' : '2'}</div>
                                </div>
                            </div>

                            {/* Page Content Rendering */}
                            <div className="space-y-8 font-serif leading-relaxed text-[15px]">
                                {activeSection === 'project-setup' && (
                                    <>
                                        <div className="mb-8">
                                            <h3 className="text-lg font-black uppercase mb-2 tracking-widest">1.1 Project Manager Assignment</h3>
                                            <p className="mb-4">
                                                The <strong className="font-bold">Project Manager</strong> field dictates the internal chain-of-command for Submittal verification on this specific project node. Setting the Project Manager ensures that automated alerts and finalized submittal packages are routed correctly upon compilation.
                                            </p>
                                            
                                            {/* IMPORTANT: Interactive Cross-Link */}
                                            <div className="bg-gray-100 border-l-4 border-[#ff6b00] my-6 text-sm italic relative" style={{ padding: '2rem 2.5rem' }}>
                                                <div className="absolute top-0 right-0 p-3 opacity-10"><Settings size={40} /></div>
                                                <strong className="font-black uppercase tracking-widest text-[11px] block text-[#ff6b00] mb-2 not-italic">Note on Authority Overrides</strong>
                                                Authority overrides or the addition of new project managerial profiles can only be granted at the organizational tier. 
                                                <br /><br />
                                                See <button onClick={() => setView('settings')} className="text-[#ff6b00] font-bold hover:underline not-italic cursor-pointer transition-all">Division 02: Company Info &gt; Team Directory</button> to authorize or onboard a new Manager into the system.
                                            </div>
                                        </div>

                                        <div className="mb-8">
                                            <h3 className="text-lg font-black uppercase mb-2 tracking-widest">1.2 Vendor Assignment Architecture</h3>
                                            <p className="mb-4">
                                                Vendors on the Job serve as the primary external data sources for the Architect engine. By inputting vendor aliases, the system automatically expands its semantic search boundaries to include those specified external distributors before falling back to manufacturer direct domains.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {activeSection === 'company-hub' && (
                                    <>
                                        <div className="mb-8">
                                            <h3 className="text-lg font-black uppercase mb-2 tracking-widest">2.1 Corporate Identity</h3>
                                            <p className="mb-4">
                                                The Corporate Identity block centralizes your organization's global identity. These parameters automatically dictate the letterhead structures and metadata stampings applied to outgoing compilation packages.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpAndDocsView;
