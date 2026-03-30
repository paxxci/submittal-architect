import React from 'react';
import { 
    Plus, ChevronRight, Clock, CheckCircle2, 
    FileSearch, Loader2, Search, X 
} from 'lucide-react';

const NewProjectModal = ({
    isOpen,
    onClose,
    newProjectData,
    setNewProjectData,
    newProjectStep,
    setNewProjectStep,
    isDiscovering,
    setIsDiscovering,
    discoveredSections,
    setDiscoveredSections,
    selectedSectionsForParsing,
    setSelectedSectionsForParsing,
    customDivisionInput,
    setCustomDivisionInput,
    projectManagers,
    onStartShredding
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content prism-card custom-scrollbar">
                
                {/* Modal Header */}
                <div className="modal-header">
                    <div>
                        <h2 style={{fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px'}}>New Submittal Project</h2>
                        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px'}}>Step {newProjectStep} of 4</p>
                    </div>
                    <button onClick={onClose} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'}}>
                        <Plus style={{transform: 'rotate(45deg)'}} size={24} />
                    </button>
                </div>

                {/* Step 1: Details */}
                {newProjectStep === 1 && (
                    <div className="modal-step">
                        <div className="form-group">
                            <label>Project Name</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="e.g., Luxury High-Rise Tower A"
                                value={newProjectData.name}
                                onChange={(e) => setNewProjectData({...newProjectData, name: e.target.value})}
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Client / GC</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g., Turner Construction"
                                    value={newProjectData.client}
                                    onChange={(e) => setNewProjectData({...newProjectData, client: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-accent-primary tracking-widest block mb-4">Project Manager</label>
                                    <select 
                                        className="prism-input w-full" 
                                        value={newProjectData.manager}
                                        onChange={(e) => setNewProjectData({...newProjectData, manager: e.target.value})}
                                    >
                                        <option value="">Select a Manager...</option>
                                        {projectManagers.map(pm => (
                                            <option key={pm.id} value={pm.name}>{pm.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-primary" onClick={() => setNewProjectStep(2)}>Next Step <ChevronRight size={16} style={{display: 'inline', marginLeft: '4px', verticalAlign: 'middle'}} /></button>
                        </div>
                    </div>
                )}

                {/* Step 2: Upload */}
                {newProjectStep === 2 && (
                    <div className="modal-step">
                        <div style={{textAlign: 'center', marginBottom: '16px'}}>
                            <h3 style={{fontSize: '18px', fontWeight: 700}}>Upload Specification Book</h3>
                            <p style={{fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px'}}>Upload the combined master spec PDF for this project.</p>
                        </div>
                        
                        <input 
                            type="file" 
                            id="pdf-upload-input"
                            accept=".pdf"
                            style={{display: 'none'}}
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setNewProjectData({...newProjectData, fileLoaded: 'uploading', fileName: file.name});
                                const formData = new FormData();
                                formData.append('pdf', file);
                                try {
                                    const res = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: formData });
                                    const data = await res.json();
                                    if (data.success) {
                                        setNewProjectData(prev => ({...prev, fileLoaded: true, fileName: data.filename, pdfPath: data.pdfPath}));
                                    } else {
                                        alert('Upload failed: ' + data.error);
                                        setNewProjectData(prev => ({...prev, fileLoaded: false}));
                                    }
                                } catch(err) {
                                    alert('Upload error: ' + err.message);
                                    setNewProjectData(prev => ({...prev, fileLoaded: false}));
                                }
                            }}
                        />

                        <div 
                            className={`upload-zone ${newProjectData.fileLoaded === true ? 'loaded' : ''}`}
                            onClick={() => document.getElementById('pdf-upload-input').click()}
                            style={{cursor: 'pointer'}}
                        >
                            {newProjectData.fileLoaded === 'uploading' ? (
                                <>
                                    <div className="upload-icon"><Clock size={32} /></div>
                                    <h4 style={{fontWeight: 700}}>Uploading{newProjectData.fileName ? ` ${newProjectData.fileName}` : ''}...</h4>
                                    <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>Please wait</p>
                                </>
                            ) : newProjectData.fileLoaded === true ? (
                                <>
                                    <div className="upload-icon"><CheckCircle2 size={32} /></div>
                                    <h4 style={{fontWeight: 700, color: 'var(--accent-secondary)'}}>{newProjectData.fileName}</h4>
                                    <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>Uploaded & ready to shred — click to replace</p>
                                </>
                            ) : (
                                <>
                                    <div className="upload-icon"><FileSearch size={32} /></div>
                                    <h4 style={{fontWeight: 700}}>Click or Drag PDF here</h4>
                                    <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>Supports CSI MasterFormat PDFs up to 500MB</p>
                                </>
                            )}
                        </div>

                        <div className="modal-actions between">
                            <button style={{fontSize: '14px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer'}} onClick={() => setNewProjectStep(1)}>Back</button>
                            <button 
                                className="btn-primary"
                                style={{opacity: newProjectData.fileLoaded === true ? 1 : 0.5, cursor: newProjectData.fileLoaded === true ? 'pointer' : 'not-allowed'}}
                                onClick={async () => {
                                    if (newProjectData.fileLoaded !== true) return;
                                    setNewProjectStep(3);
                                    setIsDiscovering(true);
                                    try {
                                        const res = await fetch(`http://localhost:3001/api/discover?pdfPath=${encodeURIComponent(newProjectData.pdfPath)}`);
                                        const data = await res.json();
                                        if (data.success) {
                                            setDiscoveredSections(data.sections);
                                            // [FIX] AUTO-SELECT ELECTRICAL SECTIONS
                                            const initialSelected = new Set(
                                                data.sections
                                                    .filter(s => s.isElectrical)
                                                    .map(s => s.id)
                                            );
                                            setSelectedSectionsForParsing(initialSelected);
                                        }
                                    } catch (err) {
                                        console.error('Discovery failed:', err);
                                    } finally {
                                        setIsDiscovering(false);
                                    }
                                }}
                                disabled={newProjectData.fileLoaded !== true}
                            >
                                {isDiscovering ? 'Scanning...' : 'Next Step'} <ChevronRight size={16} style={{display: 'inline', marginLeft: '4px', verticalAlign: 'middle'}} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Section Selection */}
                {newProjectStep === 3 && (
                    <div className="modal-step" style={{maxHeight: '70vh', display: 'flex', flexDirection: 'column'}}>
                        <div style={{marginBottom: '16px'}}>
                            <h3 style={{fontSize: '18px', fontWeight: 700}}>Select Specifications to Parse</h3>
                            <p style={{fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px'}}>
                                We found {discoveredSections.length} sections. Select the ones you want the AI to shred for product data.
                            </p>
                        </div>

                        {isDiscovering ? (
                            <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px'}}>
                                <Loader2 className="animate-spin" size={32} style={{color: 'var(--accent-primary)', marginBottom: '16px'}} />
                                <p style={{fontSize: '14px', color: 'var(--text-muted)'}}>Scanning PDF for CSI sections...</p>
                            </div>
                        ) : (
                            <>
                                <div style={{flex: 1, overflowY: 'auto', paddingRight: '8px', marginBottom: '16px'}} className="custom-scrollbar">
                                    {discoveredSections.length === 0 ? (
                                        <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}>No sections detected. You can still proceed or try another file.</div>
                                    ) : (
                                        <div style={{display: 'grid', gap: '8px'}}>
                                            {discoveredSections.map((s) => {
                                                const isSelected = selectedSectionsForParsing.has(s.id);
                                                return (
                                                    <div 
                                                        key={s.id}
                                                        className={`division-item ${isSelected ? 'selected' : ''}`}
                                                        style={{
                                                            padding: '12px 16px',
                                                            opacity: s.isElectrical ? 1 : 0.8,
                                                            background: isSelected ? 'rgba(255,115,0,0.08)' : 'var(--bg-deep)'
                                                        }}
                                                        onClick={() => {
                                                            const newSelected = new Set(selectedSectionsForParsing);
                                                            if (newSelected.has(s.id)) newSelected.delete(s.id);
                                                            else newSelected.add(s.id);
                                                            setSelectedSectionsForParsing(newSelected);
                                                        }}
                                                    >
                                                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                                            <div className="checkbox-box" style={{
                                                                borderColor: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                                                                background: isSelected ? 'var(--accent-primary)' : 'transparent'
                                                            }}>
                                                                {isSelected && <CheckCircle2 size={12} style={{color: 'white'}} />}
                                                            </div>
                                                            <div style={{flex: 1}}>
                                                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                                    <span style={{fontSize: '13px', fontWeight: 800, color: isSelected ? 'var(--accent-primary)' : 'white'}}>SECTION {s.number}</span>
                                                                    {s.isElectrical && (
                                                                        <span style={{fontSize: '9px', background: 'var(--accent-secondary)', color: '#111', padding: '1px 6px', borderRadius: '4px', fontWeight: 900}}>ELECTRICAL</span>
                                                                    )}
                                                                </div>
                                                                <div style={{fontSize: '12px', color: isSelected ? 'white' : 'var(--text-muted)', marginTop: '2px', fontWeight: 500}}>{s.title}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="modal-actions between" style={{borderTop: '1px solid var(--border-subtle)', paddingTop: '16px'}}>
                                    <button style={{fontSize: '14px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer'}} onClick={() => setNewProjectStep(2)}>Back</button>
                                    <div style={{display: 'flex', gap: '12px'}}>
                                         <button 
                                            style={{fontSize: '12px', color: 'var(--accent-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700}} 
                                            onClick={() => {
                                                const electricalOnly = new Set(discoveredSections.filter(s => s.isElectrical).map(s => s.id));
                                                setSelectedSectionsForParsing(electricalOnly);
                                            }}
                                        >
                                            Select Electrical Only
                                        </button>
                                        <button 
                                            className="btn-primary" 
                                            onClick={() => setNewProjectStep(4)}
                                            disabled={selectedSectionsForParsing.size === 0}
                                            style={{opacity: selectedSectionsForParsing.size > 0 ? 1 : 0.5}}
                                        >
                                            Confirm Selection ({selectedSectionsForParsing.size}) <ChevronRight size={16} style={{display: 'inline', marginLeft: '4px', verticalAlign: 'middle'}} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 4: Final Review / Divisions Filter */}
                {newProjectStep === 4 && (
                    <div className="modal-step">
                        <div style={{marginBottom: '16px'}}>
                            <h3 style={{fontSize: '18px', fontWeight: 700}}>Final Review & Search Scope</h3>
                            <p style={{fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px'}}>Confirm target divisions for automated sourcing.</p>
                        </div>
                        
                        <div 
                            className={`division-item ${newProjectData.autoDetect ? 'selected' : ''}`}
                            style={{marginBottom: '24px', background: newProjectData.autoDetect ? 'rgba(0, 255, 163, 0.05)' : 'var(--bg-deep)', borderColor: newProjectData.autoDetect ? 'var(--accent-secondary)' : 'var(--border-subtle)'}}
                            onClick={() => setNewProjectData({...newProjectData, autoDetect: !newProjectData.autoDetect})}
                        >
                            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                <div className="checkbox-box" style={{borderColor: newProjectData.autoDetect ? 'var(--accent-secondary)' : 'var(--text-muted)', background: newProjectData.autoDetect ? 'var(--accent-secondary)' : 'transparent', color: '#111'}}>
                                    {newProjectData.autoDetect && <CheckCircle2 size={14} />}
                                </div>
                                <div>
                                    <h4 style={{fontSize: '14px', fontWeight: 800, color: newProjectData.autoDetect ? 'var(--accent-secondary)' : 'white'}}>Semantic Discovery (Recommended)</h4>
                                    <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>Automatically scan unselected divisions for Electrical keywords (e.g. Div 16, Div 33, Div 40)</p>
                                </div>
                            </div>
                        </div>

                        <div style={{borderTop: '1px solid var(--border-subtle)', paddingTop: '24px', marginBottom: '16px'}}>
                            <h4 style={{fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '12px'}}>Target Divisions</h4>
                            {[
                                { id: '26', title: 'Electrical' },
                                { id: '27', title: 'Communications' },
                                { id: '28', title: 'Electronic Safety and Security' }
                            ].map(divItem => (
                                <div 
                                    key={divItem.id}
                                    className={`division-item ${newProjectData.divisions[divItem.id] ? 'selected' : ''}`}
                                    onClick={() => setNewProjectData({
                                        ...newProjectData, 
                                        divisions: {...newProjectData.divisions, [divItem.id]: !newProjectData.divisions[divItem.id]}
                                    })}
                                >
                                    <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                        <div className="checkbox-box">
                                            {newProjectData.divisions[divItem.id] && <CheckCircle2 size={14} />}
                                        </div>
                                        <div>
                                            <h4 style={{fontSize: '14px', fontWeight: 700}}>Division {divItem.id}</h4>
                                            <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>{divItem.title}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="modal-actions between">
                            <button style={{fontSize: '14px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer'}} onClick={() => setNewProjectStep(3)}>Back</button>
                            <button 
                                className="btn-primary" 
                                onClick={onStartShredding}
                            >
                                <Search size={16} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}} />
                                Initialize AI Analysis
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default NewProjectModal;
