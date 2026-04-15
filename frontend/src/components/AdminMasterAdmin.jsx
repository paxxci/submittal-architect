import React from 'react';
import { 
    ShieldCheck, LayoutDashboard, Users, Zap, 
    Plus, Trash, Shield
} from 'lucide-react';

const AdminMasterAdmin = ({ 
    activeProject, 
    authorizedVendors, 
    authorizedBrands, 
    preferredWebsites,
    projectManagers,
    onUpdateProjectAdmin,
    setAuthorizedVendors,
    setPreferredWebsites,
    setActiveProject,
    setView,
    setIsDeleteModalOpen
}) => {
    if (!activeProject) return null;

    return (
        <div className="admin-container animate-fade-in p-12 max-w-7xl mx-auto pb-32">
            <div className="flex justify-between items-end px-4" style={{ marginBottom: '1rem' }}>
                <div>
                    {/* TITLE - HARD CODED MARGIN */}
                    <h1 
                        className="text-4xl font-black tracking-tighter italic uppercase"
                        style={{ marginBottom: '0px' }}
                    >
                        PROJECT <span className="text-accent-primary">ADMIN</span> <span className="text-white/20 mx-4 font-light">/</span> <span className="text-white">{activeProject.name}</span>
                    </h1>

                    {/* SUBHEADER - HARD CODED SEPARATION */}
                    <p 
                        className="text-text-muted font-black uppercase tracking-[0.3em] text-[11px] opacity-60"
                    >
                        <span className="text-accent-primary mr-3 text-lg font-black leading-none">/</span> MANAGE PROJECT-SPECIFIC ORGANIZATION AND SOURCING PREFERENCES.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="btn-secondary !py-3 !px-6 flex items-center gap-2 border border-white/10" onClick={() => setView('dashboard')}>
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-12">
                {/* Left Column: Stats & Setup */}
                <div className="col-span-12 lg:col-span-4 space-y-12">
                    <div className="prism-card p-8 border-accent-primary/20 bg-bg-surface/50 shadow-2xl">
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-accent-primary mb-10 flex items-center gap-3">
                            <Users size={14} /> Project Leadership
                        </h3>
                        <div>
                            <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-3 ml-1">Assigned Manager</label>
                            <select 
                                className="prism-input !bg-bg-deep/50 text-white font-bold italic w-full" 
                                value={activeProject.manager_name || ''}
                                onChange={(e) => {
                                    const newName = e.target.value;
                                    setActiveProject({ ...activeProject, manager_name: newName });
                                    onUpdateProjectAdmin({ manager_name: newName });
                                }}
                            >
                                <option value="">Unassigned</option>
                                {projectManagers.map(pm => (
                                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="prism-card p-8 bg-gradient-to-br from-bg-surface to-bg-deep border-white/5">
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted mb-10 flex items-center gap-3">
                            <Zap size={14} className="text-accent-primary" /> Progress Metrics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-black/40 rounded-2xl border border-white/5 text-center">
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Items</p>
                                <p className="text-2xl font-black italic">{(activeProject.recentItems || []).length}</p>
                            </div>
                            <div className="p-5 bg-black/40 rounded-2xl border border-white/5 text-center">
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Ready</p>
                                <p className="text-2xl font-black text-accent-secondary italic">{activeProject.progress || 0}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone: High-Visibility Sidebar Pivot */}
                    <div className="prism-card p-8 border-accent-danger/20 bg-accent-danger/5 flex flex-col items-center gap-5">
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-accent-danger mb-4 flex items-center gap-3 w-full">
                            <Trash size={14} /> Danger Zone
                        </h3>
                        <button 
                            className="btn-danger w-full flex items-center justify-center gap-2 !py-4 font-black text-[12px] uppercase tracking-[0.2em] italic transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            <Trash size={18} /> DELETE PROJECT
                        </button>
                        <p className="text-[9px] text-accent-danger/60 font-black uppercase tracking-[0.2em] text-center">
                            Purging is irreversible.
                        </p>
                    </div>
                </div>

                {/* Right Column: High-Visibility Management Tables */}
                <div className="col-span-12 lg:col-span-8 space-y-20">
                    {/* Section 1: Vendors on the Job */}
                    <div className="prism-card p-0 overflow-hidden border-white/5 shadow-2xl flex flex-col animate-fade-in-right">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-bg-surface/50">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-[0.2em] text-white italic mb-3">Vendors on the Job</h3>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight">Active project supply chain entities</p>
                            </div>
                            <div className="relative">
                                <input 
                                    placeholder="Add Vendor..."
                                    className="prism-input !py-2 !px-4 !text-[11px] !w-48 !bg-bg-deep border-accent-primary/20"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value) {
                                            const newList = [...authorizedVendors, e.target.value];
                                            setAuthorizedVendors(newList);
                                            onUpdateProjectAdmin({ metadata: { ...activeProject.metadata, authorized_vendors: newList } });
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-primary" />
                            </div>
                        </div>
                        <div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-black/20">
                                        <th className="py-5 px-8 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Vendor Entity</th>
                                        <th className="py-5 px-8 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Sourcing Logic</th>
                                        <th className="py-5 px-8 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {authorizedVendors.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="py-12 text-center text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-50">No Vendors Registered</td>
                                        </tr>
                                    ) : authorizedVendors.map((vendor, idx) => (
                                        <tr key={idx} className="hover:bg-accent-primary/5 transition-colors group">
                                            <td className="py-5 px-8 font-black text-xs text-white uppercase italic tracking-tight">{vendor}</td>
                                            <td className="py-5 px-8"><span className="badge badge-green !text-[8px] !font-black !px-2 !py-0.5 tracking-widest uppercase">Contract Valid</span></td>
                                            <td className="py-5 px-8 text-right">
                                                <button 
                                                    className="text-text-muted hover:text-red-400 p-2 opacity-20 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        const newList = authorizedVendors.filter((_, i) => i !== idx);
                                                        setAuthorizedVendors(newList);
                                                        onUpdateProjectAdmin({ metadata: { ...activeProject.metadata, authorized_vendors: newList } });
                                                    }}
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 2: Preferred Search Sites (Vendor Preferences) */}
                    <div className="prism-card p-0 overflow-hidden border-white/5 shadow-2xl flex flex-col animate-fade-in-right delay-100">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-bg-surface/50">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-[0.2em] text-white italic mb-3">Preferred Search Sites</h3>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight">Tier 0 Discovery Protocol</p>
                            </div>
                            <div className="relative">
                                <input 
                                    placeholder="Add Domain..."
                                    className="prism-input !py-2 !px-4 !text-[11px] !w-48 !bg-bg-deep border-accent-secondary/20"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value) {
                                            const newList = [...preferredWebsites, e.target.value];
                                            setPreferredWebsites(newList);
                                            onUpdateProjectAdmin({ 
                                                metadata: { 
                                                    ...activeProject.metadata, 
                                                    sourcing_prefs: { 
                                                        ...activeProject.metadata?.sourcing_prefs,
                                                        preferred_websites: newList 
                                                    } 
                                                } 
                                            });
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-secondary" />
                            </div>
                        </div>
                        <div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-black/20">
                                        <th className="py-5 px-8 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Priority Domain</th>
                                        <th className="py-5 px-8 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Discovery Level</th>
                                        <th className="py-5 px-8 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {preferredWebsites.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="py-12 text-center text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-50">No Priority Sites Defined</td>
                                        </tr>
                                    ) : preferredWebsites.map((site, idx) => (
                                        <tr key={idx} className="hover:bg-accent-secondary/5 transition-colors group">
                                            <td className="py-5 px-8 font-black text-xs text-white lowercase italic underline decoration-accent-secondary/30">{site}</td>
                                            <td className="py-5 px-8"><span className="badge badge-blue !text-[8px] !font-black !px-2 !py-0.5 tracking-widest uppercase">Tier 0 Override</span></td>
                                            <td className="py-5 px-8 text-right">
                                                <button 
                                                    className="text-text-muted hover:text-red-400 p-2 opacity-20 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        const newList = preferredWebsites.filter((_, i) => i !== idx);
                                                        setPreferredWebsites(newList);
                                                        onUpdateProjectAdmin({ 
                                                            metadata: { 
                                                                 ...activeProject.metadata, 
                                                                sourcing_prefs: { 
                                                                    ...activeProject.metadata?.sourcing_prefs,
                                                                    preferred_websites: newList 
                                                                } 
                                                            } 
                                                        });
                                                    }}
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminMasterAdmin;
