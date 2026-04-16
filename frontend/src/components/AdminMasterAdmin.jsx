import React, { useState } from 'react';
import { 
    ShieldCheck, LayoutDashboard, Users, Zap, 
    Plus, Trash, Shield, ChevronDown, ChevronRight
} from 'lucide-react';

const AdminMasterAdmin = ({ 
    activeProject, 
    projectData,
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

    const [expandedVendor, setExpandedVendor] = useState(null);

    const getVendorAssignments = () => activeProject?.metadata?.vendor_assignments || {};

    const handleToggleVendorSpec = (vendor, specId) => {
        const assignments = getVendorAssignments();
        const vendorList = assignments[vendor] || [];
        const newList = vendorList.includes(specId) 
            ? vendorList.filter(id => id !== specId)
            : [...vendorList, specId];
        
        onUpdateProjectAdmin({
            metadata: {
                ...activeProject.metadata,
                vendor_assignments: {
                    ...assignments,
                    [vendor]: newList
                }
            }
        });
    };

    return (
        <div className="admin-container animate-fade-in p-12 max-w-7xl mx-auto pb-32">
            <div className="flex justify-between items-end px-4" style={{ marginBottom: '1rem' }}>
                <div>
                    {/* TITLE - HARD CODED MARGIN */}
                    <h1 
                        className="text-4xl font-black tracking-tighter italic uppercase"
                        style={{ marginBottom: '0px' }}
                    >
                        PROJECT <span className="text-accent-primary">SETUP</span> <span className="text-white/20 mx-4 font-light">/</span> <span className="text-white">{activeProject.name}</span>
                    </h1>

                    {/* SUBHEADER - HARD CODED SEPARATION */}
                    <p 
                        className="text-text-muted font-black uppercase tracking-[0.3em] text-[11px] opacity-60"
                    >
                        <span className="text-accent-primary mr-3 text-lg font-black leading-none">/</span> MANAGE PROJECT-SPECIFIC ORGANIZATION AND SOURCING PREFERENCES.
                    </p>
                </div>

            </div>

            <div className="max-w-4xl mx-auto space-y-12">
                
                {/* 1. Project Leadership */}
                <div className="prism-card px-8 pt-12 pb-8" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: '20px' }}>
                        <h3 className="text-xl font-black uppercase tracking-widest text-accent-primary flex items-center gap-3">
                            <Users size={24} /> Project Manager
                        </h3>
                    </div>
                    <div>
                        <select 
                            className="prism-input !bg-bg-deep/50 text-white font-bold italic w-full" 
                            style={{ paddingLeft: '32px' }}
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

                {/* 2. Vendors on the Job */}
                <div className="prism-card px-8 pt-12 pb-8 overflow-hidden flex flex-col animate-fade-in-right">
                    <div className="flex justify-between items-start" style={{ marginBottom: '24px' }}>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-widest text-accent-primary flex items-center gap-3">
                                <Shield size={24} /> Vendors on the Job
                            </h3>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight ml-9" style={{ marginTop: '8px' }}>Add a vendor and assign spec section to them</p>
                        </div>
                        <div className="relative mt-2">
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
                    <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-bg-deep/50 shadow-inner">
                        <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-white/5">
                                {authorizedVendors.length === 0 ? (
                                    <tr>
                                        <td colSpan="2" className="py-16 text-center text-xs font-black text-text-muted uppercase tracking-widest italic opacity-50">No Vendors Registered</td>
                                    </tr>
                                ) : authorizedVendors.map((vendor, idx) => {
                                    const vendorSpecs = getVendorAssignments()[vendor] || [];
                                    const isExpanded = expandedVendor === vendor;

                                    return (
                                        <React.Fragment key={idx}>
                                            <tr className="hover:bg-accent-primary/5 transition-colors group">
                                                <td className="pr-8 w-full" style={{ paddingTop: '14px', paddingBottom: '14px', paddingLeft: '32px' }}>
                                                    <div className="font-black text-base text-white uppercase italic tracking-tight">{vendor}</div>
                                                    {vendorSpecs.length > 0 && (
                                                        <div className="flex flex-col gap-2" style={{ marginTop: '12px' }}>
                                                            {vendorSpecs.map(specId => {
                                                                const specRef = (projectData?.recentItems || []).find(s => s.id === specId);
                                                                const displayTitle = specRef?.title ? `${specId} - ${specRef.title}` : specId;
                                                                return (
                                                                    <span key={specId} className="text-[10px] font-bold tracking-widest uppercase !text-white/40">
                                                                        {displayTitle}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="pl-8 text-right p-0" style={{ paddingTop: '14px', paddingBottom: '14px', paddingRight: '32px' }}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            className={`!text-[10px] !py-2 !px-4 whitespace-nowrap flex-shrink-0 rounded border flex items-center gap-2 transition-all ${
                                                                vendorSpecs.length > 0 
                                                                ? 'bg-accent-primary/20 text-accent-primary border-accent-primary opacity-100' 
                                                                : 'bg-white/5 border-white/10 text-white/50 opacity-40 hover:opacity-100 hover:bg-white/10'
                                                            }`}
                                                            onClick={() => setExpandedVendor(isExpanded ? null : vendor)}
                                                        >
                                                            {isExpanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} Assign Specs ({vendorSpecs.length})
                                                        </button>
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
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-black/60 shadow-inner">
                                                    <td colSpan="2" className="p-0 border-t border-white/5">
                                                        <div className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Select spec sections for {vendor}</h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                                                                {(projectData?.recentItems || []).map(spec => (
                                                                    <label key={spec.id} className={`flex items-start gap-4 p-3 rounded-lg border cursor-pointer transition-all ${vendorSpecs.includes(spec.id) ? 'bg-accent-primary/10 border-accent-primary shadow-[0_0_15px_rgba(255,51,102,0.15)]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                                                        <div className="pt-0.5">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="w-4 h-4 rounded border-white/20 bg-black/50 text-accent-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                                                checked={vendorSpecs.includes(spec.id)}
                                                                                onChange={() => handleToggleVendorSpec(vendor, spec.id)}
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className={`text-[11px] font-black uppercase tracking-widest ${vendorSpecs.includes(spec.id) ? 'text-accent-primary' : 'text-white/70'}`}>{spec.id}</div>
                                                                            <div className="text-xs text-text-muted truncate mt-0.5 font-bold" title={spec.title}>{spec.title}</div>
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                                {(!projectData?.recentItems || projectData.recentItems.length === 0) && (
                                                                    <div className="col-span-full py-6 text-center text-[10px] font-black text-white/30 uppercase tracking-widest italic rounded-lg border border-white/5 bg-black/20">No sections found in project.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Preferred Search Sites */}
                <div className="prism-card px-8 pt-12 pb-8 overflow-hidden flex flex-col animate-fade-in-right delay-100">
                    <div className="flex justify-between items-start" style={{ marginBottom: '24px' }}>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-widest text-accent-primary flex items-center gap-3">
                                <ShieldCheck size={24} /> Priority Sourcing Domains
                            </h3>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight ml-9 leading-relaxed" style={{ marginTop: '8px' }}>
                                AI will search these preferred search sites before searching manufacturer websites.<br/>
                                <span className="text-accent-secondary/80 normal-case italic tracking-normal font-medium mt-1 inline-block">Ensure full domain format is used (e.g., https://www.website.com)</span>
                            </p>
                        </div>
                        <div className="relative mt-2">
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
                    <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-bg-deep/50 shadow-inner">
                        <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-white/5">
                                {preferredWebsites.length === 0 ? (
                                    <tr>
                                        <td colSpan="2" className="py-16 text-center text-xs font-black text-text-muted uppercase tracking-widest italic opacity-50">No Priority Sites Defined</td>
                                    </tr>
                                ) : preferredWebsites.map((site, idx) => (
                                    <tr key={idx} className="hover:bg-accent-secondary/5 transition-colors group">
                                        <td className="pr-8 font-black text-sm text-white lowercase italic underline decoration-accent-secondary/40 w-full" style={{ paddingTop: '14px', paddingBottom: '14px', paddingLeft: '32px' }}>{site}</td>
                                        <td className="pl-8 text-right" style={{ paddingTop: '14px', paddingBottom: '14px', paddingRight: '32px' }}>
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
    );
};

export default AdminMasterAdmin;
