import React, { useRef, useEffect } from 'react';
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
    aiBlocks,
    activeSubProductItem
}) => {
    const fileInputRef = useRef(null);
    
    useEffect(() => {
        if (activeSubProductItem) {
            // Give it a tiny delay to ensure render is complete
            setTimeout(() => {
                const el = document.getElementById('active-highlight');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [activeSubProductItem]);

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

                                    let isPrimaryMatch = false;
                                    let isSecondaryMatch = false;
                                    
                                    const stopwords = ['the', 'and', 'for', 'with', 'use', 'are', 'not', 'but', 'all', 'any', 'unless', 'otherwise', 'indicated', 'required', 'provide', 'products', 'listed', 'labeled', 'complying'];
                                    
                                    const getCleanWords = (str) => {
                                        return str.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(t => t.length > 1 && !stopwords.includes(t));
                                    };

                                    if (isSelected && activeSubProductItem) {
                                        // 1. Primary Highlight (Yellow)
                                        const productWords = getCleanWords(activeSubProductItem.productType || '');
                                        const lineWords = getCleanWords(trimmed);
                                        
                                        // Helper to check if a word matches another (handles simple plurals like s/es)
                                        const wordMatches = (w, arr) => arr.some(aw => aw === w || aw === w + 's' || aw + 's' === w || aw === w + 'es' || aw + 'es' === w);

                                        // If the line is short (like a header "D. Ground Bars") and ALL its meaningful words are in the product name
                                        if (productWords.length > 0 && lineWords.length > 0 && lineWords.length <= 5) {
                                            const matchCount = lineWords.filter(w => wordMatches(w, productWords)).length;
                                            if (matchCount > 0 && matchCount >= lineWords.length * 0.8) {
                                                isPrimaryMatch = true;
                                            }
                                        }
                                        
                                        // Or if the line contains almost all of the product words
                                        if (!isPrimaryMatch && productWords.length > 0) {
                                            const matchCount = productWords.filter(w => wordMatches(w, lineWords)).length;
                                            if (matchCount >= Math.max(1, Math.ceil(productWords.length * 0.8))) {
                                                isPrimaryMatch = true;
                                            }
                                        }

                                        // 2. Secondary Highlight (Green) - Verified Requirements
                                        const matchedReqs = activeSubProductItem.matchedRequirements || [];
                                        if (!isPrimaryMatch && matchedReqs.length > 0) {
                                            for (const req of matchedReqs) {
                                                const reqWords = getCleanWords(req);
                                                if (reqWords.length > 0) {
                                                    // Calculate intersection using substring match
                                                    const matchCount = lineWords.filter(w => wordMatches(w, reqWords)).length;
                                                    // Require 80% overlap
                                                    if (matchCount >= Math.max(1, Math.ceil(lineWords.length * 0.8)) || matchCount >= Math.max(1, Math.ceil(reqWords.length * 0.8))) {
                                                        isSecondaryMatch = true;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    let highlightClasses = '';
                                    if (isPrimaryMatch) {
                                        highlightClasses = 'bg-yellow-500/20 text-yellow-200 border-l-2 border-yellow-500 pl-2 rounded-r-sm shadow-[inset_2px_0_0_0_#eab308]';
                                    } else if (isSecondaryMatch) {
                                        highlightClasses = 'bg-emerald-500/20 text-emerald-200 border-l-2 border-emerald-500 pl-2 rounded-r-sm shadow-[inset_2px_0_0_0_#10b981]';
                                    }

                                    return (
                                        <div 
                                            key={lineIdx} 
                                            id={isPrimaryMatch || isSecondaryMatch ? 'active-highlight' : undefined}
                                            className={`${indentClass} transition-colors duration-700 ${highlightClasses}`}
                                        >
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
