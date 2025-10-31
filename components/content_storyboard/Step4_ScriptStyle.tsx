import React, { useState } from 'react';
import { ScriptStyle } from '../../types';
import { LoadingSpinner } from '../icons/LoadingSpinner';

interface Props {
    onSelect: (style: ScriptStyle) => void;
    isLoading: boolean;
    onBack: () => void;
}

const Step4_ScriptStyle: React.FC<Props> = ({ onSelect, isLoading, onBack }) => {
    const [mode, setMode] = useState<'narrator' | 'dialogue' | 'mixed'>('mixed');
    const [narratorPercentage, setNarratorPercentage] = useState(50);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        let finalStyle: ScriptStyle;
        if (mode === 'narrator') {
            finalStyle = { mode: 'narrator', narratorPercentage: 100 };
        } else if (mode === 'dialogue') {
            finalStyle = { mode: 'dialogue', narratorPercentage: 0 };
        } else {
            finalStyle = { mode: 'mixed', narratorPercentage };
        }
        onSelect(finalStyle);
    };

    return (
        <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-bg-color">
            <div className="w-full max-w-2xl">
                <button onClick={onBack} disabled={isLoading} className="mb-8 text-text-secondary hover:text-white disabled:opacity-50">&larr; Back to Length</button>
                <h2 className="text-3xl font-bold mb-2">Select Script Style</h2>
                <p className="text-lg text-text-secondary mb-8">How should the story be told?</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <OptionButton selected={mode === 'narrator'} onClick={() => setMode('narrator')} title="Narrator" description="A single voice tells the story." disabled={isLoading} />
                        <OptionButton selected={mode === 'dialogue'} onClick={() => setMode('dialogue')} title="Dialogue" description="Characters speak to each other." disabled={isLoading} />
                        <OptionButton selected={mode === 'mixed'} onClick={() => setMode('mixed')} title="Narrator + Dialogue" description="A mix of narration and conversation." disabled={isLoading} />
                    </div>

                    {mode === 'mixed' && (
                        <div className="pt-4 space-y-4" style={{ animation: 'fadeIn 0.5s' }}>
                             <label htmlFor="narrator-percentage" className="block text-lg font-semibold text-text-secondary">Adjust the mix:</label>
                             <div className="relative p-2">
                                <input
                                     id="narrator-percentage"
                                     type="range"
                                     min="0"
                                     max="100"
                                     step="5"
                                     value={narratorPercentage}
                                     onChange={(e) => setNarratorPercentage(parseInt(e.target.value))}
                                     className="w-full h-2 bg-panel-bg rounded-lg appearance-none cursor-pointer"
                                     disabled={isLoading}
                                 />
                                <div className="flex justify-between text-sm text-text-secondary mt-2 px-1">
                                    <span>Dialogue</span>
                                    <span>50/50</span>
                                    <span>Narrator</span>
                                </div>
                             </div>
                             <div className="flex justify-around bg-panel-bg p-4 rounded-xl">
                                 <div className="text-center">
                                     <p className="text-2xl font-bold" style={{ color: 'var(--primary-accent)'}}>{100 - narratorPercentage}%</p>
                                     <p className="text-sm text-text-secondary">Dialogue</p>
                                 </div>
                                  <div className="text-center">
                                      <p className="text-2xl font-bold" style={{ color: 'var(--secondary-accent)'}}>{narratorPercentage}%</p>
                                     <p className="text-sm text-text-secondary">Narrator</p>
                                 </div>
                             </div>
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-6 w-full btn btn-primary text-lg py-4"
                    >
                        {isLoading ? <><LoadingSpinner className="mr-2"/> Writing your script...</> : 'Generate Script'}
                    </button>
                </form>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                input[type=range] {
                    --thumb-size: 24px;
                    --thumb-border: 4px;
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: var(--thumb-size);
                    height: var(--thumb-size);
                    border-radius: 50%;
                    background: var(--primary-accent);
                    cursor: pointer;
                    border: var(--thumb-border) solid var(--panel-bg);
                    transition: background 0.2s ease;
                }
                input[type=range]:hover::-webkit-slider-thumb {
                    background: var(--secondary-accent);
                }
                input[type=range]::-moz-range-thumb {
                    width: var(--thumb-size);
                    height: var(--thumb-size);
                    border-radius: 50%;
                    background: var(--primary-accent);
                    cursor: pointer;
                    border: var(--thumb-border) solid var(--panel-bg);
                     transition: background 0.2s ease;
                }
                input[type=range]:hover::-moz-range-thumb {
                     background: var(--secondary-accent);
                }
            `}</style>
        </div>
    );
};

const OptionButton: React.FC<{selected: boolean, onClick: () => void, title: string, description: string, disabled: boolean}> = ({selected, onClick, title, description, disabled}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`p-6 rounded-xl border-2 text-left transition-colors ${selected ? 'bg-white border-white text-black' : 'bg-panel-bg border-border-color hover:border-secondary-accent'}`}
    >
        <h3 className="font-bold text-xl">{title}</h3>
        <p className={`text-sm ${selected ? 'text-neutral-700' : 'text-text-secondary'}`}>{description}</p>
    </button>
);


export default Step4_ScriptStyle;
