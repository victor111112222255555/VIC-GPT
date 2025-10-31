import React, { useState } from 'react';
import { SCRIPT_LENGTH_OPTIONS } from '../../constants';

interface Props {
    onSelect: (length: string) => void;
    onBack: () => void;
}

const Step3_ScriptLength: React.FC<Props> = ({ onSelect, onBack }) => {
    const [customLength, setCustomLength] = useState('');
    
    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customLength.trim()) {
            onSelect(customLength);
        }
    };

    return (
        <div className="p-8 flex flex-col items-center justify-center h-full">
            <div className="w-full max-w-2xl">
                <button onClick={onBack} className="mb-8 text-text-secondary hover:text-white">&larr; Back to Ideas</button>
                <h2 className="text-3xl font-bold mb-2 text-center">Select Script Length</h2>
                <p className="text-lg text-text-secondary mb-8 text-center">How long should the script be?</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {SCRIPT_LENGTH_OPTIONS.map(option => (
                        option.id !== 'custom' && (
                            <button
                                key={option.id}
                                onClick={() => onSelect(option.label)}
                                className="p-4 bg-panel-bg rounded-xl border border-border-color hover:border-secondary-accent transition-colors"
                            >
                                {option.label}
                            </button>
                        )
                    ))}
                </div>
                <form onSubmit={handleCustomSubmit} className="mt-6 border-t border-border-color pt-6">
                    <label htmlFor="custom-length" className="block text-lg font-semibold mb-2 text-center text-text-secondary">Or specify a custom length:</label>
                    <div className="flex gap-4">
                        <input
                            id="custom-length"
                            type="text"
                            value={customLength}
                            onChange={(e) => setCustomLength(e.target.value)}
                            placeholder="e.g., 45 seconds, 3 minutes"
                            className="flex-1 input-styled text-lg"
                        />
                         <button
                            type="submit"
                            disabled={!customLength.trim()}
                            className="btn btn-primary text-lg"
                        >
                            Set
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Step3_ScriptLength;
