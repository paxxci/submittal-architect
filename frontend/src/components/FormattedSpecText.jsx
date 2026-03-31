import React, { useRef } from 'react';
import { Box, FileUp, CheckCircle2 } from 'lucide-react';

const FormattedSpecText = ({ 
    text, 
    specId, 
    partId, 
    completedBlocks, 
    naBlocks, 
    onToggleBlock, 
    onBlockSelect, 
    selectedBlockKey, 
    aiBlocks 
}) => {
    const fileInputRef = useRef(null);
    
    if (!text) return null;
    
    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = [];

    // Group lines into logical blocks based on CSI headers like "2.02" or "1.01"
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        if (/^[1-3]\.[0-9]{2}/.test(trimmed)) {
            if (currentBlock.length > 0) blocks.push(currentBlock);
            currentBlock = [line];
        } else {
            currentBlock.push(line);
        }
    });
    if (currentBlock.length > 0) blocks.push(currentBlock);

    return (
        <div className="spec-formatted-container space-y-4">
            {blocks.map((blockLines, blockIdx) => {
                const blockId = `${specId}___${partId}___${blockIdx}`;
                const blockTitle = blockLines[0]?.trim() || 'GENERAL SECTION';
                const blockKey = blockTitle.slice(0, 80);
                const isSelected = selectedBlockKey === blockKey;
                const aiBlockData = aiBlocks ? aiBlocks[blockKey] || null : null;
                const isCompleted = completedBlocks?.includes(blockId);
                const isNA = naBlocks?.includes(blockId);
                const isGreen = isCompleted || isNA;
                
                return (
                    <div 
                        key={blockIdx}
                        id={`prism-block-${blockKey.replace(/[^a-zA-Z0-9]/g, '')}`}
                        className={`prism-block prism-card mb-4 relative overflow-hidden transition-all duration-300 cursor-pointer border-l-4 ${
                            isCompleted ? 'border-l-accent-secondary border-accent-secondary/30 bg-accent-secondary/5' : 
                            isNA ? 'border-l-text-muted border-border-subtle bg-white/2 opacity-80' : 
                            isSelected ? 'border-l-accent-primary bg-accent-primary/8 ring-2 ring-accent-primary shadow-[0_0_20px_rgba(255,115,0,0.15)]' :
                            'border-l-transparent hover:border-l-accent-primary/50 hover:border-accent-primary/40'
                        } ${
                            !isGreen && !isSelected ? 'hover:translate-x-1' : ''
                        } group`}
                        onClick={(e) => onBlockSelect && onBlockSelect({ blockKey, blockTitle, blockLines, blockIdx, offsetTop: e.currentTarget.offsetTop })}
                    >
                        <div className="mb-4">
                            {/* Block Header */}
                            <div className="mb-4">
                                {blockLines.length > 0 && /^[1-3]\.[0-9]{2}/.test(blockLines[0].trim()) ? (
                                    <div className={`indent-level-0 font-extrabold text-[14px] uppercase tracking-wide leading-snug ${isGreen ? 'text-accent-secondary' : 'text-accent-primary'}`}>
                                        {blockLines[0].trim()}
                                    </div>
                                ) : (
                                    <div className="text-base font-bold text-text-muted uppercase tracking-widest">
                                        General Section
                                    </div>
                                )}
                            </div>
                            
                            {/* Action Row */}
                            <div className="grid grid-cols-3 gap-2 py-2 mb-4 border-b border-white/10 w-full items-center">
                                <button 
                                    type="button"
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation(); 
                                        if (!isCompleted) {
                                            const blockEl = document.getElementById(`prism-block-${blockKey.replace(/[^a-zA-Z0-9]/g, '')}`);
                                            onBlockSelect && onBlockSelect({ blockKey, blockTitle, blockLines, blockIdx, offsetTop: blockEl ? blockEl.offsetTop : 0 });
                                            window.dispatchEvent(new CustomEvent('trigger-sourcing', { 
                                                detail: { blockId, blockKey, blockTitle, blockLines: blockLines.join('\n'), aiBlockData } 
                                            })); 
                                        }
                                    }}
                                    disabled={isCompleted}
                                    className={`btn-secondary !py-2 !px-1 lg:!px-2 !h-auto flex items-center justify-center gap-1.5 lg:gap-2 group/btn transition-all flex-shrink w-full ${isCompleted ? 'opacity-20 cursor-not-allowed saturate-0' : 'opacity-100 shadow-[0_0_15px_rgba(255,115,0,0.3)] hover:brightness-125 hover:-translate-y-0.5'}`}
                                >
                                    <Box size={14} className={!isCompleted ? "group-hover/btn:rotate-12 transition-transform text-accent-primary flex-shrink-0" : "text-text-muted flex-shrink-0"} />
                                    <span className="font-bold text-white tracking-widest sm:tracking-normal text-[8px] md:text-[9px] lg:text-[10px] uppercase whitespace-nowrap truncate text-center">Find Cutsheet</span>
                                </button>
                                
                                <input 
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".pdf"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            window.dispatchEvent(new CustomEvent('trigger-manual-upload', {
                                                detail: { blockId, blockKey, blockTitle, file }
                                            }));
                                        }
                                        e.target.value = '';
                                    }}
                                />
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isCompleted) fileInputRef.current?.click();
                                    }}
                                    disabled={isCompleted}
                                    className={`btn-secondary !py-2 !px-1 lg:!px-2 !h-auto flex items-center justify-center gap-1.5 lg:gap-2 transition-all flex-shrink w-full ${isCompleted ? 'opacity-20 cursor-not-allowed saturate-0' : 'opacity-100 hover:bg-white/10'}`}
                                >
                                    <FileUp size={14} className="text-accent-secondary flex-shrink-0" />
                                    <span className="font-bold text-white tracking-widest sm:tracking-normal text-[8px] md:text-[9px] lg:text-[10px] uppercase whitespace-nowrap truncate text-center">Upload Manual</span>
                                </button>

                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onToggleBlock(blockId, 'DONE'); }}
                                    className={`btn-secondary !py-2 !px-1 lg:!px-2 !h-auto flex items-center justify-center gap-1.5 lg:gap-2 transition-all flex-shrink w-full ${isCompleted ? 'bg-accent-secondary/20 border-accent-secondary text-accent-secondary shadow-[0_0_15px_rgba(0,255,163,0.3)]' : 'opacity-100 hover:bg-white/10'}`}
                                >
                                    <CheckCircle2 size={14} className={isCompleted ? "text-accent-secondary drop-shadow-[0_0_5px_rgba(0,255,163,0.8)] flex-shrink-0" : "text-text-muted flex-shrink-0"} />
                                    <span className={`font-bold tracking-widest sm:tracking-normal text-[8px] md:text-[9px] lg:text-[10px] uppercase whitespace-nowrap truncate text-center ${isCompleted ? 'text-accent-secondary' : 'text-white'}`}>
                                        {isCompleted ? 'Done' : 'Complete'}
                                    </span>
                                </button>
                            </div>

                            {/* Body Lines */}
                            <div className="pl-1">
                                {blockLines.map((line, lineIdx) => {
                                    const trimmed = line.trim();
                                    if (lineIdx === 0 && /^[1-3]\.[0-9]{2}/.test(trimmed)) return null;
                                    
                                    let indentClass = "base-text";
                                    if (/^[A-Z]\./.test(trimmed)) indentClass = "indent-level-1";
                                    else if (/^[0-9]+\./.test(trimmed)) indentClass = "indent-level-2 mt-1";
                                    else if (/^[a-z]\./.test(trimmed)) indentClass = "indent-level-3";
                                    else if (/^-/.test(trimmed)) indentClass = "indent-level-4";

                                    return (
                                        <div key={lineIdx} className={indentClass}>
                                            {trimmed}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FormattedSpecText;
