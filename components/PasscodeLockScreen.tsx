import React, { useState } from 'react';

interface Props {
    onSuccess: () => void;
}

const CORRECT_PASSCODE = 'ZIP1GTE';

const PasscodeLockScreen: React.FC<Props> = ({ onSuccess }) => {
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode.toUpperCase() === CORRECT_PASSCODE) {
            setError(null);
            onSuccess();
        } else {
            setError('Incorrect code. Please try again.');
            setPasscode('');
        }
    };

    return (
        <div className="fixed inset-0 bg-bg-color/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="panel-glass p-8 shadow-2xl w-full max-w-sm text-center transform transition-all"
                 style={{ animation: 'fadeInUp 0.5s ease-out forwards' }}
            >
                <h2 className="text-2xl font-bold text-white mb-4">Enter Passcode</h2>
                <p className="text-text-secondary mb-6">Please enter the code to access the application.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full input-styled text-center text-2xl tracking-[0.3em] font-mono uppercase placeholder:text-neutral-600"
                        autoFocus
                        maxLength={7}
                    />
                    {error && (
                        <p className="mt-4 h-6" style={{ color: 'var(--warning-accent)'}}>{error}</p>
                    )}
                    <button
                        type="submit"
                        className="mt-6 w-full btn btn-primary"
                        disabled={!passcode}
                    >
                        Unlock
                    </button>
                </form>
            </div>
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default PasscodeLockScreen;
