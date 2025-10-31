import React, { useState } from 'react';
import { StoryboardSegment, AspectRatio } from '../../types';
import { LoadingSpinner } from '../icons/LoadingSpinner';
import { DownloadIcon } from '../icons/DownloadIcon';
import { RefreshIcon } from '../icons/RefreshIcon';
import { CopyIcon } from '../icons/CopyIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface Props {
    segments: StoryboardSegment[];
    onGenerateImage: (index: number) => void;
    onGenerateAllImages: () => void;
    onRestart: () => void;
    onUpdatePrompt: (index: number, newPrompt: string) => void;
    onUpdateAspectRatio: (index: number, newAspectRatio: AspectRatio) => void;
    onRegeneratePrompt: (index: number) => void;
}

const aspectRatioOptions: { label: string; value: AspectRatio }[] = [
    { label: 'Square', value: 'SQUARE' },
    { label: 'Landscape', value: 'LANDSCAPE' },
    { label: 'Portrait', value: 'PORTRAIT' },
];

const Step5_ImageStoryboard: React.FC<Props> = ({ segments, onGenerateImage, onGenerateAllImages, onRestart, onUpdatePrompt, onUpdateAspectRatio, onRegeneratePrompt }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopyPrompt = (prompt: string, index: number) => {
        if (!prompt) return;
        navigator.clipboard.writeText(prompt);
        setCopiedIndex(index);
        setTimeout(() => {
            setCopiedIndex(null);
        }, 2000);
    };

    const isAnyGenerating = segments.some(s => s.isGenerating || s.isGeneratingPrompt);
    const hasUngeneratedImages = segments.some(s => !s.imageUrl);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Visual Storyboard</h2>
                    <p className="text-text-secondary">Edit prompts, choose an aspect ratio, and generate an image for each scene.</p>
                </div>
                <div className="flex items-center gap-4">
                     {hasUngeneratedImages && (
                        <button 
                            onClick={onGenerateAllImages} 
                            disabled={isAnyGenerating}
                            className="btn btn-primary gap-2"
                        >
                            {isAnyGenerating ? <LoadingSpinner /> : <SparklesIcon className="w-5 h-5"/>}
                            {isAnyGenerating ? 'Generating...' : 'Generate All Images'}
                        </button>
                    )}
                    <button onClick={onRestart} className="btn" style={{ backgroundColor: 'rgba(255, 111, 97, 0.2)', color: 'var(--warning-accent)', border: '1px solid rgba(255, 111, 97, 0.3)'}}>
                        Start New Storyboard
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {segments.map((segment, index) => (
                    <div key={index} className="grid md:grid-cols-2 gap-6 items-start panel p-6">
                        {/* Left side: Script, Prompt Editor, Aspect Ratio */}
                        <div className="flex flex-col gap-4">
                            <div>
                                <p className="font-logo text-sm text-text-secondary mb-2 tracking-widest">SCENE {index + 1}</p>
                                <p className="text-lg text-text-primary">"{segment.script_part}"</p>
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor={`prompt-${index}`} className="block text-sm font-semibold text-text-secondary">Image Prompt</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopyPrompt(segment.image_prompt, index)}
                                            disabled={segment.isGenerating || segment.isGeneratingPrompt}
                                            className="relative p-1 rounded-full text-text-secondary hover:bg-panel-bg hover:text-white disabled:opacity-50 disabled:cursor-wait transition-colors"
                                            aria-label="Copy prompt"
                                        >
                                            <CopyIcon className="w-4 h-4" />
                                            {copiedIndex === index && (
                                                <span className="absolute -top-7 right-0 transform translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">Copied!</span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onRegeneratePrompt(index)}
                                            disabled={segment.isGenerating || segment.isGeneratingPrompt}
                                            className="p-1 rounded-full text-text-secondary hover:bg-panel-bg hover:text-white disabled:opacity-50 disabled:cursor-wait transition-colors"
                                            aria-label="Regenerate prompt"
                                        >
                                            {segment.isGeneratingPrompt ? <LoadingSpinner className="w-4 h-4 text-white" /> : <RefreshIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    id={`prompt-${index}`}
                                    value={segment.image_prompt}
                                    onChange={(e) => onUpdatePrompt(index, e.target.value)}
                                    rows={5}
                                    className="input-styled text-sm"
                                    disabled={segment.isGenerating || segment.isGeneratingPrompt}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-text-secondary mb-2">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {aspectRatioOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => onUpdateAspectRatio(index, option.value)}
                                            disabled={segment.isGenerating || segment.isGeneratingPrompt}
                                            className={`py-2 px-2 rounded-lg text-center transition-colors border-2 text-sm font-medium ${
                                                segment.aspectRatio === option.value
                                                    ? 'bg-white border-white text-black'
                                                    : 'bg-panel-bg border-border-color hover:border-secondary-accent'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right side: Image Display & Actions */}
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-full aspect-video bg-bg-color rounded-lg flex items-center justify-center border-2 border-dashed border-border-color">
                               {segment.isGenerating ? (
                                   <div className="text-center">
                                       <LoadingSpinner className="h-8 w-8 mx-auto mb-2"/>
                                       <p className="text-text-secondary">Generating...</p>
                                   </div>
                               ) : segment.imageUrl ? (
                                    <img src={segment.imageUrl} alt={`Visual for scene ${index + 1}`} className="w-full h-full object-contain rounded-md" />
                                ) : (
                                    <p className="text-text-secondary opacity-50">Image will appear here</p>
                                )}
                            </div>
                            
                            {/* Action Buttons */}
                            {segment.isGenerating ? (
                                <button
                                    disabled
                                    className="w-full btn btn-primary cursor-not-allowed"
                                >
                                    <LoadingSpinner className="h-5 w-5 mr-2" />
                                    Generating...
                                </button>
                            ) : segment.imageUrl ? (
                                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => onGenerateImage(index)}
                                        className="w-full btn btn-primary"
                                    >
                                        <RefreshIcon className="h-5 w-5 mr-2" />
                                        Regenerate
                                    </button>
                                    <a
                                        href={segment.imageUrl}
                                        download={`storyboard-scene-${index + 1}.jpeg`}
                                        className="w-full btn btn-secondary"
                                    >
                                        <DownloadIcon className="h-5 w-5 mr-2" />
                                        Download
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={() => onGenerateImage(index)}
                                    className="w-full btn btn-primary"
                                >
                                    Generate Image
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Step5_ImageStoryboard;
