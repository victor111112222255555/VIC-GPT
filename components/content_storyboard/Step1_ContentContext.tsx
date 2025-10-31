import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../icons/LoadingSpinner';
import { SparklesIcon } from '../icons/SparklesIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { XIcon } from '../icons/XIcon';

interface Props {
    onContextReady: (context: string) => void;
    onScriptReady: (script: string) => void;
    onTranscriptsReady: (transcripts: string[], style: 'exact' | 'reimagine') => void;
    isLoading: boolean;
    initialContext?: string;
    initialScript?: string;
    initialTranscripts?: string[];
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; }> = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-1/3 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            active 
                ? 'nav-item-active' 
                : 'text-text-secondary hover:bg-panel-bg hover:text-text-primary'
        }`}
    >
        {children}
    </button>
);

const Step1_ContentContext: React.FC<Props> = ({ onContextReady, onScriptReady, onTranscriptsReady, isLoading, initialContext = '', initialScript = '', initialTranscripts = [] }) => {
    const [mode, setMode] = useState<'idea' | 'script' | 'transcript'>('idea');
    const [context, setContext] = useState(initialContext);
    const [script, setScript] = useState(initialScript);
    const [transcripts, setTranscripts] = useState<string[]>(initialTranscripts.length > 0 ? initialTranscripts : ['']);
    const [transcriptStyle, setTranscriptStyle] = useState<'exact' | 'reimagine'>('exact');

    useEffect(() => {
        setContext(initialContext);
    }, [initialContext]);
    
    useEffect(() => {
        setScript(initialScript);
    }, [initialScript]);

    useEffect(() => {
        if (initialTranscripts && initialTranscripts.length > 0) {
            setTranscripts(initialTranscripts);
        } else if (initialTranscripts) {
            setTranscripts(['']);
        }
    }, [initialTranscripts]);

    const handleTranscriptChange = (index: number, value: string) => {
        const newTranscripts = [...transcripts];
        newTranscripts[index] = value;
        setTranscripts(newTranscripts);
    };

    const addTranscript = () => {
        setTranscripts([...transcripts, '']);
    };

    const removeTranscript = (index: number) => {
        if (transcripts.length > 1) {
            const newTranscripts = transcripts.filter((_, i) => i !== index);
            setTranscripts(newTranscripts);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        if (mode === 'idea' && context.trim()) {
            onContextReady(context);
        } else if (mode === 'script' && script.trim()) {
            onScriptReady(script);
        } else if (mode === 'transcript' && transcripts.some(t => t.trim())) {
            onTranscriptsReady(transcripts.filter(t => t.trim()), transcriptStyle);
        }
    };

    return (
        <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-bg-color overflow-y-auto">
            <div className="max-w-3xl w-full">
                <h2 className="text-3xl font-bold mb-2">Content Storyboard Creator</h2>
                <p className="text-lg text-text-secondary mb-8">Start with an idea, bring a script, or use transcripts for style inspiration.</p>
                
                <div className="flex bg-panel-bg p-1 rounded-xl mb-6 max-w-xl mx-auto">
                    <TabButton active={mode === 'idea'} onClick={() => setMode('idea')}>
                        <SparklesIcon className="w-5 h-5"/> Generate Ideas
                    </TabButton>
                    <TabButton active={mode === 'transcript'} onClick={() => setMode('transcript')}>
                        <ClipboardListIcon className="w-5 h-5"/> Transcript Reference
                    </TabButton>
                    <TabButton active={mode === 'script'} onClick={() => setMode('script')}>
                        <FileTextIcon className="w-5 h-5"/> Use My Script
                    </TabButton>
                </div>

                <form onSubmit={handleSubmit} className="w-full">
                    {mode === 'idea' ? (
                        <div className="animate-fadeIn">
                            <textarea
                                key="context-textarea"
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="Describe your content idea. What's the topic? What's the tone? Feel free to paste YouTube links for reference."
                                className="w-full h-48 p-4 input-styled text-lg"
                                aria-label="Content Context"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !context.trim()}
                                className="mt-6 w-full btn btn-primary text-lg py-4"
                            >
                                {isLoading ? <><LoadingSpinner className="mr-2"/> Generating Ideas...</> : 'Generate Story Ideas'}
                            </button>
                        </div>
                    ) : mode === 'transcript' ? (
                        <div className="animate-fadeIn space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Reference Transcripts</h3>
                                <p className="text-text-secondary mb-4">Paste one or more full video transcripts below. The AI will analyze the style and generate completely new ideas on different topics.</p>
                                <div className="space-y-4">
                                    {transcripts.map((transcript, index) => (
                                        <div key={index} className="relative">
                                            <textarea
                                                value={transcript}
                                                onChange={(e) => handleTranscriptChange(index, e.target.value)}
                                                placeholder={`Paste reference transcript #${index + 1} here...`}
                                                className="w-full h-32 p-4 pr-10 input-styled"
                                                aria-label={`Reference Transcript ${index + 1}`}
                                            />
                                            {transcripts.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeTranscript(index)}
                                                    className="absolute top-3 right-3 text-text-secondary hover:text-white"
                                                    aria-label={`Remove transcript ${index + 1}`}
                                                >
                                                    <XIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addTranscript}
                                    className="mt-4 btn btn-secondary text-sm"
                                >
                                    + Add Another Transcript
                                </button>
                            </div>

                             <div className="text-left">
                                <h3 className="text-lg font-semibold text-white mb-3">Script Generation Approach</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setTranscriptStyle('exact')}
                                        className={`p-4 h-full flex flex-col text-left rounded-xl border-2 transition-colors ${transcriptStyle === 'exact' ? 'bg-white border-white text-black' : 'bg-panel-bg border-border-color hover:border-secondary-accent'}`}
                                    >
                                        <div className="font-bold">Use Exact Script Structure</div>
                                        <p className={`text-sm mt-1 ${transcriptStyle === 'exact' ? 'text-neutral-700' : 'text-text-secondary'}`}>Closely follows the pacing and flow of the references.</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTranscriptStyle('reimagine')}
                                        className={`p-4 h-full flex flex-col text-left rounded-xl border-2 transition-colors ${transcriptStyle === 'reimagine' ? 'bg-white border-white text-black' : 'bg-panel-bg border-border-color hover:border-secondary-accent'}`}
                                    >
                                        <div className="font-bold">Reimagine Structure</div>
                                        <p className={`text-sm mt-1 ${transcriptStyle === 'reimagine' ? 'text-neutral-700' : 'text-text-secondary'}`}>Creates a new, more engaging structure with a strong hook.</p>
                                    </button>
                                </div>
                            </div>

                             <button
                                type="submit"
                                disabled={isLoading || !transcripts.some(t => t.trim())}
                                className="w-full btn btn-primary text-lg py-4"
                            >
                                {isLoading ? <><LoadingSpinner className="mr-2"/> Generating Ideas...</> : 'Get New Ideas'}
                            </button>
                        </div>
                    ) : (
                         <div className="animate-fadeIn">
                            <textarea
                                key="script-textarea"
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                placeholder="Paste your complete script here. We'll break it down into scenes for you."
                                className="w-full h-64 p-4 input-styled text-lg"
                                aria-label="Your Script"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !script.trim()}
                                className="mt-6 w-full btn btn-primary text-lg py-4"
                            >
                                {isLoading ? <><LoadingSpinner className="mr-2"/> Processing...</> : 'Next: Create Storyboard from Script'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default Step1_ContentContext;
