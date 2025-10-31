import React from 'react';
import { LoadingSpinner } from '../icons/LoadingSpinner';
import { RefreshIcon } from '../icons/RefreshIcon';

interface Props {
    script: string;
    onConfirm: () => void;
    isLoading: boolean;
    onBack: () => void;
    onRegenerate: () => void;
    showRegenerate?: boolean;
}

const Step4_ScriptDisplay: React.FC<Props> = ({ script, onConfirm, isLoading, onBack, onRegenerate, showRegenerate = true }) => {
    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                 <button onClick={onBack} className="text-text-secondary hover:text-white disabled:opacity-50" disabled={isLoading}>&larr; Back</button>
                 
                 <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-center">Your Script</h2>
                     {showRegenerate && (
                        <button
                            onClick={onRegenerate}
                            disabled={isLoading}
                            className="p-2 rounded-full bg-panel-bg text-text-secondary hover:bg-opacity-80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Regenerate script"
                        >
                            {isLoading ? <LoadingSpinner className="h-5 w-5" /> : <RefreshIcon className="h-5 w-5" />}
                        </button>
                    )}
                 </div>

                 <div className="invisible">
                    <button className="text-text-secondary">&larr; Back</button>
                 </div>
            </div>
           
            <div className="flex-1 panel p-6 overflow-y-auto mb-6">
                <pre className="text-text-primary whitespace-pre-wrap font-sans text-base">{script}</pre>
            </div>
            <button
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full btn btn-primary text-lg py-4"
            >
                {isLoading ? <><LoadingSpinner className="mr-2"/> Processing...</> : 'Next: Set Scene Options'}
            </button>
        </div>
    );
};

export default Step4_ScriptDisplay;
