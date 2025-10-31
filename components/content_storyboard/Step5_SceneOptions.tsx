import React, { useState, useRef } from 'react';
import { LoadingSpinner } from '../icons/LoadingSpinner';
import { ScissorsIcon } from '../icons/ScissorsIcon';

interface Props {
    script: string;
    onConfirm: (option: 'default' | 'custom' | 'manual', instructions: string, data?: number | string) => void;
    isLoading: boolean;
    onBack: () => void;
}

const Step5_SceneOptions: React.FC<Props> = ({ script, onConfirm, isLoading, onBack }) => {
    const [option, setOption] = useState<'default' | 'custom' | 'manual'>('default');
    const [count, setCount] = useState<string>('');
    const [manualScript, setManualScript] = useState(script);
    const [instructions, setInstructions] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInsertSplit = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const splitText = ' [SPLIT] ';
            const newText = manualScript.substring(0, start) + splitText + manualScript.substring(end);
            
            setManualScript(newText);
            
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + splitText.length;
            }, 0);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        if (option === 'default') {
            onConfirm('default', instructions);
        } else if (option === 'custom' && count && parseInt(count) > 0) {
            onConfirm('custom', instructions, parseInt(count));
        } else if (option === 'manual' && manualScript.trim()) {
            onConfirm('manual', instructions, manualScript);
        }
    };

    const isSubmitDisabled = isLoading ||
        (option === 'custom' && (!count || parseInt(count) <= 0)) ||
        (option === 'manual' && !manualScript.trim());

    return (
        <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-bg-color overflow-y-auto">
            <div className="w-full max-w-3xl">
                <button onClick={onBack} disabled={isLoading} className="mb-8 text-text-secondary hover:text-white disabled:opacity-50">&larr; Back to Script</button>
                <h2 className="text-3xl font-bold mb-2">Scene Generation</h2>
                <p className="text-lg text-text-secondary mb-8">How should we break your script into scenes for the storyboard?</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-left panel p-6">
                        <label htmlFor="prompt-instructions" className="block text-lg font-semibold mb-2 text-white">
                            Prompt Generation Instructions <span className="text-text-secondary">(Optional)</span>
                        </label>
                        <textarea
                            id="prompt-instructions"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="e.g., Use a cinematic, wide-angle shot for all images.&#10;e.g., Maintain character consistency with this description: A man in his 30s, with short brown hair, a rugged beard, wearing a worn leather jacket..."
                            rows={4}
                            className="input-styled"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-text-secondary mt-2">Provide the AI with guidance for all generated image prompts, such as art style, camera angles, or consistent character details.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <OptionButton
                            type="button"
                            onClick={() => setOption('default')}
                            selected={option === 'default'}
                            disabled={isLoading}
                        >
                            <h3 className="font-bold text-xl">Default</h3>
                            <p className={option === 'default' ? 'text-neutral-700' : 'text-text-secondary'}>Let AI decide the optimal number of scenes for the best flow.</p>
                        </OptionButton>
                        <OptionButton
                            type="button"
                            onClick={() => setOption('custom')}
                             selected={option === 'custom'}
                            disabled={isLoading}
                        >
                             <h3 className="font-bold text-xl">Custom</h3>
                             <p className={option === 'custom' ? 'text-neutral-700' : 'text-text-secondary'}>Specify the exact number of scenes you want.</p>
                        </OptionButton>
                        <OptionButton
                            type="button"
                            onClick={() => setOption('manual')}
                             selected={option === 'manual'}
                            disabled={isLoading}
                        >
                             <h3 className="font-bold text-xl">Manual Split</h3>
                             <p className={option === 'manual' ? 'text-neutral-700' : 'text-text-secondary'}>Edit the script and place split markers yourself.</p>
                        </OptionButton>
                    </div>

                    {option === 'custom' && (
                        <div className="animate-fadeIn pt-4 max-w-sm mx-auto">
                             <label htmlFor="scene-count" className="block text-lg font-semibold mb-2 text-center text-text-secondary">Number of Scenes</label>
                             <input
                                 id="scene-count"
                                 type="number"
                                 value={count}
                                 onChange={(e) => setCount(e.target.value)}
                                 min="1"
                                 placeholder="e.g., 12"
                                 className="input-styled text-lg text-center"
                                 disabled={isLoading}
                                 autoFocus
                             />
                        </div>
                    )}
                    
                    {option === 'manual' && (
                        <div className="animate-fadeIn pt-4 text-left">
                            <label htmlFor="manual-script" className="block text-lg font-semibold mb-2 text-left text-white">Manually Edit & Split Script</label>
                            <div className="relative">
                                <textarea
                                    id="manual-script"
                                    ref={textareaRef}
                                    value={manualScript}
                                    onChange={(e) => setManualScript(e.target.value)}
                                    rows={10}
                                    className="input-styled"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={handleInsertSplit}
                                    disabled={isLoading}
                                    className="absolute bottom-3 right-3 flex items-center gap-2 bg-bg-color text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-panel-bg disabled:bg-panel-bg disabled:text-text-secondary transition-colors border border-border-color"
                                >
                                    <ScissorsIcon className="w-4 h-4" /> Insert Split
                                </button>
                            </div>
                             <div className="mt-4 text-left panel p-4">
                                <h4 className="font-semibold text-white">How to use Manual Split:</h4>
                                <ol className="list-decimal list-inside text-text-secondary text-sm space-y-1 mt-2">
                                    <li>Edit your script directly in the text area above.</li>
                                    <li>Place your cursor where you want a scene to end.</li>
                                    <li>Click the "Insert Split" button or type <strong>[SPLIT]</strong> manually.</li>
                                    <li>Each part of the script separated by a <strong>[SPLIT]</strong> marker will become a new scene.</li>
                                    <li>When you're done, click "Create Visual Storyboard".</li>
                                </ol>
                            </div>
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="mt-6 w-full btn btn-primary text-lg py-4"
                    >
                        {isLoading ? <><LoadingSpinner className="mr-2"/> Building Storyboard...</> : 'Create Visual Storyboard'}
                    </button>
                </form>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

const OptionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {selected: boolean}> = ({ children, selected, ...props }) => (
    <button
        {...props}
        className={`p-6 h-full rounded-xl border-2 text-left transition-colors ${selected ? 'bg-white border-white text-black' : 'bg-panel-bg border-border-color hover:border-secondary-accent'}`}
    >
        {children}
    </button>
);

export default Step5_SceneOptions;
