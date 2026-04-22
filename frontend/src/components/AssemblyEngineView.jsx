import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle, Circle, ChevronRight, FileText, Printer, Send, Loader2 } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const AssemblyEngineView = ({ projectData, activeProject, onUpdateTrackerState, companyTemplates, companyInfo, projectManagers }) => {
    const [selectedSections, setSelectedSections] = useState([]);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const toggleSection = (id) => {
        if (selectedSections.includes(id)) {
            setSelectedSections([]);
        } else {
            setSelectedSections([id]);
        }
    };

    // Force a local sort that strips spaces out of CSI Codes to ensure deterministic numerical sequencing (e.g. 26 05 33 -> 260533)
    const readySections = projectData?.recentItems 
        ? [...projectData.recentItems].sort((a, b) => (a.id || '').replace(/\s/g, '').localeCompare((b.id || '').replace(/\s/g, ''), undefined, { numeric: true })) 
        : [];

    const handleConfirmSection = async () => {
        if (selectedSections.length === 0) return;
        const activeItem = readySections.find(s => s.id === selectedSections[0]);
        if (activeItem && onUpdateTrackerState) {
             const newStatus = activeItem.tracker_status === 'Verified' ? 'Working' : 'Verified';
             await onUpdateTrackerState(activeItem.dbId, newStatus);
        }
    };

    const handleCompileAndSend = async () => {
        if (selectedSections.length === 0) return;
        const activeItem = readySections.find(s => s.id === selectedSections[0]);
        if (activeItem && onUpdateTrackerState) {
             await onUpdateTrackerState(activeItem.dbId, 'Sent');
             alert(`Submittal Package for ${activeItem.id} compiled and queued for distribution!`);
        }
    };

    useEffect(() => {
        let active = true;
        let url = null;
        
        const generatePdf = async () => {
            if (selectedSections.length === 0 || !companyTemplates || companyTemplates.length === 0) {
                if (active) setPreviewPdfUrl(null);
                return;
            }

            if (active) setIsGenerating(true);
            try {
                const template = companyTemplates[0]; 
                const existingPdfBytes = await fetch(template.file_url).then(res => res.arrayBuffer());
                const pdfDoc = await PDFDocument.load(existingPdfBytes);
                const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
                
                const pages = pdfDoc.getPages();
                const firstPage = pages[0];
                const { width, height } = firstPage.getSize();
                
                let pmName = 'TBD';
                if (activeProject?.metadata?.manager_name) {
                    pmName = activeProject.metadata.manager_name;
                } else if (projectManagers && projectManagers.length > 0) {
                    pmName = projectManagers[0].name;
                }
                
                const activeItem = readySections.find(s => s.id === selectedSections[0]);

                const drawCenteredText = (text, y, size, font) => {
                    if (!text) return;
                    const textWidth = font.widthOfTextAtSize(text, size);
                    firstPage.drawText(text, {
                        x: (width / 2) - (textWidth / 2),
                        y,
                        size,
                        font,
                        color: rgb(0, 0, 0),
                    });
                };

                const drawMappedText = (text, tagId, size, font) => {
                    if (!text) return;
                    const mappings = template.metadata?.mapping;
                    if (mappings && mappings[tagId]) {
                        const coords = mappings[tagId];
                        // pdf-lib origin is bottom-left. Mapping UI origin is top-left.
                        const x = width * coords.x;
                        const y = height - (height * coords.y);
                        
                        // Center text horizontally on the clicked point
                        const textWidth = font.widthOfTextAtSize(text, size);
                        const adjustedX = Math.max(0, x - (textWidth / 2));
                        
                        firstPage.drawText(text, {
                            x: adjustedX,
                            y: y - (size / 2), // Adjust baseline slightly
                            size,
                            font,
                            color: rgb(0, 0, 0),
                        });
                    } else {
                        // Fallback logic if unmapped
                        let yOffset = height / 2;
                        if (tagId === 'projectName') yOffset += 60;
                        if (tagId === 'sectionNumber') yOffset += 20;
                        if (tagId === 'sectionTitle') yOffset -= 5;
                        if (tagId === 'date') yOffset -= 40;
                        if (tagId === 'pmName') yOffset -= 60;
                        if (tagId === 'companyName') yOffset -= 80;
                        
                        drawCenteredText(text, yOffset, size, font);
                    }
                };

                // Stamp data using mappings or fallbacks
                drawMappedText(activeProject?.name || 'ACTIVE PROJECT', 'projectName', 24, helveticaBold);
                
                if (activeItem) {
                    drawMappedText(`Section: ${activeItem.id}`, 'sectionNumber', 16, helveticaBold);
                    drawMappedText(activeItem.title || 'Untitled', 'sectionTitle', 14, helvetica);
                }
                
                drawMappedText(`Date: ${new Date().toLocaleDateString()}`, 'date', 12, helvetica);
                drawMappedText(`Project Manager: ${pmName}`, 'pmName', 12, helvetica);
                
                if (companyInfo) {
                    drawMappedText(companyInfo.name, 'companyName', 16, helveticaBold);
                    drawMappedText(companyInfo.address, 'companyAddress', 12, helvetica);
                    drawMappedText(companyInfo.phone, 'companyPhone', 12, helvetica);
                }

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                url = URL.createObjectURL(blob);
                
                if (active) setPreviewPdfUrl(url);
                
            } catch (err) {
                console.error("Error generating PDF preview:", err);
            } finally {
                if (active) setIsGenerating(false);
            }
        };
        
        generatePdf();
        
        return () => {
            active = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [selectedSections, companyTemplates, activeProject, projectManagers, companyInfo]);

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
                        {readySections.map(section => (
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
                                        <FileText size={10} className={selectedSections.includes(section.id) ? 'text-accent-primary/70' : 'text-text-muted'} /> {section.pages || 'Payload'} Pages Locked
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
                                    <div 
                                        onClick={handleConfirmSection}
                                        className={`flex items-center gap-2 cursor-pointer transition-all duration-300 ${
                                            (readySections.find(s => s.id === selectedSections[0])?.tracker_status === 'Verified' || readySections.find(s => s.id === selectedSections[0])?.tracker_status === 'Sent')
                                             ? 'text-white' 
                                             : 'text-white/50 hover:text-white/80'
                                        }`}
                                    >
                                        {(readySections.find(s => s.id === selectedSections[0])?.tracker_status === 'Verified' || readySections.find(s => s.id === selectedSections[0])?.tracker_status === 'Sent') ? (
                                            <CheckCircle size={18} className="text-accent-secondary drop-shadow-[0_0_8px_rgba(0,255,163,0.8)]" />
                                        ) : (
                                            <Circle size={18} className="text-white/20" />
                                        )}
                                        <span className="text-xs font-black tracking-widest uppercase">Verified</span>
                                    </div>

                                    <button onClick={handleCompileAndSend} className="btn-primary !px-6 flex items-center gap-2">
                                        <Send size={16} /> Compile & Send ({selectedSections.length})
                                    </button>
                                </div>
                            </div>
                            
                            {/* Canvas Zone */}
                            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 bg-black/20">
                                {isGenerating ? (
                                    <div className="flex flex-col items-center justify-center text-text-muted p-12">
                                        <Loader2 size={32} className="animate-spin text-accent-primary mb-4" />
                                        <div className="text-xs font-black uppercase tracking-widest">Stamping Template...</div>
                                    </div>
                                ) : previewPdfUrl ? (
                                    <div className="w-full max-w-4xl aspect-[8.5/11] bg-white rounded-lg overflow-hidden shadow-2xl relative border border-white/10 group">
                                        <iframe 
                                            src={`${previewPdfUrl}#toolbar=0&navpanes=0`} 
                                            className="w-full h-full" 
                                            title="Generated Cover Page"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full max-w-2xl aspect-[8.5/11] bg-white/5 text-text-muted p-12 shadow-xl relative flex flex-col justify-center items-center text-center border border-dashed border-white/10 rounded-xl">
                                        <FileText size={48} className="text-white/10 mb-4" />
                                        <h3 className="text-xl font-black uppercase tracking-widest mb-2">No Template Found</h3>
                                        <p className="text-sm font-bold opacity-60 uppercase tracking-widest">
                                            Upload a cover template in Settings to generate standard PDFs.
                                        </p>
                                    </div>
                                )}
                                
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
