import sys

with open('frontend/src/components/AdminMasterAdmin.jsx', 'r') as f:
    text = f.read()

start_marker = '{/* 1.5 Submittal Retrieval */}'
end_marker = '{/* 3. Preferred Search Sites */}'

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

replacement = """{/* 1.5 Submittal Retrieval */}
                <div className="prism-card px-8 pt-12 pb-8 overflow-hidden flex flex-col animate-fade-in-right delay-75">
                    <div className="flex justify-between items-start" style={{ marginBottom: '24px' }}>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                                <CheckCircle size={24} color="url(#icon-gradient)" style={{ filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.8))' }} /> Submittal Retrieval
                            </h3>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight ml-9 leading-relaxed" style={{ marginTop: '8px' }}>
                                Primary recipient(s) for the completed submittal package upon compilation.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <input 
                                placeholder="Recipient Name..."
                                className="prism-input !py-2 !px-4 !text-[11px] !w-40 !bg-bg-deep border-white/10"
                                value={tempRetrievalName}
                                onChange={(e) => setTempRetrievalName(e.target.value)}
                            />
                            <div className="relative">
                                <input 
                                    placeholder="Recipient Email..."
                                    className="prism-input !py-2 !px-4 !text-[11px] !w-72 !bg-bg-deep border-white/10 pr-24"
                                    value={tempRetrievalEmail}
                                    onChange={(e) => setTempRetrievalEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && tempRetrievalName && tempRetrievalEmail) {
                                            const currentList = activeProject.metadata?.retrieval_contacts || [];
                                            const newList = [...currentList, { name: tempRetrievalName, email: tempRetrievalEmail }];
                                            setActiveProject({ ...activeProject, metadata: { ...activeProject.metadata, retrieval_contacts: newList } });
                                            onUpdateProjectAdmin({ metadata: { ...activeProject.metadata, retrieval_contacts: newList } });
                                            setTempRetrievalName('');
                                            setTempRetrievalEmail('');
                                        }
                                    }}
                                />
                                <button 
                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-white/60 hover:text-white flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded text-[9px] font-black tracking-widest uppercase transition-all"
                                    onClick={() => {
                                        if (tempRetrievalName && tempRetrievalEmail) {
                                            const currentList = activeProject.metadata?.retrieval_contacts || [];
                                            const newList = [...currentList, { name: tempRetrievalName, email: tempRetrievalEmail }];
                                            setActiveProject({ ...activeProject, metadata: { ...activeProject.metadata, retrieval_contacts: newList } });
                                            onUpdateProjectAdmin({ metadata: { ...activeProject.metadata, retrieval_contacts: newList } });
                                            setTempRetrievalName('');
                                            setTempRetrievalEmail('');
                                        }
                                    }}
                                >
                                    <Plus size={10} /> Add User
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-bg-deep/50 shadow-inner">
                        <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-white/5">
                                {(!activeProject.metadata?.retrieval_contacts || activeProject.metadata.retrieval_contacts.length === 0) ? (
                                    <tr>
                                        <td colSpan="3" className="py-8 text-center text-[11px] font-black text-text-muted uppercase tracking-widest italic opacity-50">No users added to retrieval list.</td>
                                    </tr>
                                ) : (activeProject.metadata?.retrieval_contacts || []).map((contact, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                        <td className="pr-4 font-black text-sm text-white w-1/3 italic" style={{ paddingTop: '14px', paddingBottom: '14px', paddingLeft: '32px' }}>
                                            {contact.name || 'Unnamed Recipient'}
                                        </td>
                                        <td className="pr-8 font-black text-sm text-text-muted lowercase italic underline decoration-white/10 w-full" style={{ paddingTop: '14px', paddingBottom: '14px' }}>
                                            {contact.email || 'No email provided'}
                                        </td>
                                        <td className="pl-8 text-right p-0" style={{ paddingTop: '14px', paddingBottom: '14px', paddingRight: '32px' }}>
                                            <button 
                                                className="text-text-muted hover:text-red-400 p-2 opacity-20 group-hover:opacity-100 transition-opacity"
                                                onClick={() => {
                                                    const newList = activeProject.metadata.retrieval_contacts.filter((_, i) => i !== idx);
                                                    setActiveProject({ ...activeProject, metadata: { ...activeProject.metadata, retrieval_contacts: newList } });
                                                    onUpdateProjectAdmin({ metadata: { ...activeProject.metadata, retrieval_contacts: newList } });
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

                """

new_text = text[:start_idx] + replacement + text[end_idx:]

with open('frontend/src/components/AdminMasterAdmin.jsx', 'w') as f:
    f.write(new_text)
print("Done")
