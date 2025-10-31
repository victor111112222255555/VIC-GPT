import React from 'react';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface Props {
    onComplete: () => void;
}

const WelcomeScreen: React.FC<Props> = ({ onComplete }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-center text-text-primary bg-bg-color overflow-hidden">
            {/* Animated Gradient Background */}
            <div 
                className="absolute inset-0 w-full h-full"
                style={{
                    backgroundImage: 'linear-gradient(125deg, #0f1115, #6c63ff, #00e0ff, #0f1115)',
                    backgroundSize: '400% 400%',
                    animation: 'gradient-animation 15s ease infinite',
                    filter: 'blur(100px) opacity(0.3)'
                }}
            />
            
            {/* Glassmorphism Panel */}
            <div className="relative panel-glass p-8 md:p-12 w-full max-w-3xl animate-fadeInUp">
                <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-logo font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[--primary-accent] to-[--secondary-accent]" style={{ textShadow: '0 0 25px rgba(108,99,255,0.4)' }}>
                        WELCOME TO VIC-GPT
                    </h1>
                </div>
                
                <div className="animate-fadeInUp" style={{ animationDelay: '400ms' }}>
                    <p className="text-lg md:text-xl text-text-secondary mt-4 font-heading tracking-wider uppercase">
                        THE CREATOR’S ULTIMATE AI STUDIO
                    </p>
                </div>
                
                <div className="mt-12 animate-fadeInUp" style={{ animationDelay: '600ms' }}>
                    <button
                        onClick={onComplete}
                        className="btn btn-primary inline-flex items-center justify-center gap-3 text-lg px-10 py-4"
                    >
                        Get Started <ArrowRightIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes gradient-animation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </div>
    );
};

export default WelcomeScreen;
