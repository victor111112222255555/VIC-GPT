import React from 'react';
import { XIcon } from './icons/XIcon';

interface Props {
    onClose: () => void;
}

const InstallHelpModal: React.FC<Props> = ({ onClose }) => {
    // Basic user agent sniffing to show relevant instructions.
    // This check is safe for server-side rendering as it checks for `navigator`.
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
    const isDesktop = !isIOS && !isAndroid;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-neutral-950 border border-neutral-800 rounded-lg p-8 shadow-2xl w-full max-w-lg text-left transform transition-all relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                    aria-label="Close installation help"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">How to Install This App</h2>
                <p className="text-neutral-400 mb-6">
                    This app can be installed on your device for easy access, just like a native app. 
                    Follow the instructions for your device below.
                </p>

                <div className="space-y-6">
                    { isIOS && (
                         <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Safari on iOS / iPadOS</h3>
                            <ol className="list-decimal list-inside text-neutral-300 space-y-2">
                                <li>Tap the <span className="font-bold">Share</span> button in the navigation bar.</li>
                                <li>Scroll down and tap <span className="font-bold">Add to Home Screen</span>.</li>
                                <li>Confirm by tapping <span className="font-bold">Add</span> in the top-right corner.</li>
                            </ol>
                        </div>
                    )}
                     { isAndroid && (
                         <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Chrome on Android</h3>
                            <ol className="list-decimal list-inside text-neutral-300 space-y-2">
                                <li>Tap the <span className="font-bold">three dots</span> menu icon in the top-right.</li>
                                <li>Tap <span className="font-bold">Install app</span> or <span className="font-bold">Add to Home screen</span>.</li>
                                <li>Follow the on-screen prompts to confirm.</li>
                            </ol>
                        </div>
                    )}
                    { isDesktop && (
                         <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Chrome / Edge on Desktop</h3>
                            <ol className="list-decimal list-inside text-neutral-300 space-y-2">
                                <li>Look for an <span className="font-bold">install icon</span> in the address bar (usually on the right side).</li>
                                <li>Alternatively, click the <span className="font-bold">three dots</span> menu.</li>
                                <li>Select <span className="font-bold">Install [App Name]...</span> or <span className="font-bold">Apps &gt; Install this site as an app</span>.</li>
                            </ol>
                        </div>
                    )}
                </div>
            </div>
             <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default InstallHelpModal;
