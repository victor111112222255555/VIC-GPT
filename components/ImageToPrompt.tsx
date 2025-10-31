import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { ImageUpIcon } from './icons/ImageUpIcon';
import { CopyIcon } from './icons/CopyIcon';
import { AnyProject, AppView, ImageToPromptProject, ImageToPromptProjectData } from '../types';

interface Props {
    onProjectCreated: (project: AnyProject) => void;
    projectToLoad?: ImageToPromptProject;
}

const ImageToPrompt: React.FC<Props> = ({ onProjectCreated, projectToLoad }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [promptLengthOption, setPromptLengthOption] = useState<'default' | 'custom'>('default');
    const [customLength, setCustomLength] = useState<string>('');
    const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const dragCounter = useRef(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (projectToLoad) {
            const { data } = projectToLoad;
            setImageUrl(data.sourceImageUrl);
            setGeneratedPrompt(data.generatedPrompt);
        }
    }, [projectToLoad]);

    const handleImageChange = (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file (PNG, JPG, WEBP, etc.).');
                return;
            }
            setError(null);
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragIn = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };
    const handleDragOut = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleImageChange(e.dataTransfer.files);
            e.dataTransfer.clearData();
            dragCounter.current = 0;
        }
    };


    const handleGenerate = useCallback(async () => {
        if (!imageFile || isLoading) {
            if (!imageFile) setError("Please upload an image first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedPrompt(null);
        setIsCopied(false);

        try {
            const prompt = await geminiService.generatePromptFromImage(imageFile, promptLengthOption, customLength);
            setGeneratedPrompt(prompt);

            const projectData: ImageToPromptProjectData = {
                sourceImageUrl: imageUrl,
                generatedPrompt: prompt,
            };
            const newProject: ImageToPromptProject = {
                id: projectToLoad?.id || `proj_${Date.now()}`,
                type: AppView.IMAGE_TO_PROMPT,
                title: `Prompt for ${imageFile.name}`,
                createdAt: projectToLoad?.createdAt || Date.now(),
                updatedAt: Date.now(),
                data: projectData,
            };
            onProjectCreated(newProject);

        } catch (e) {
            console.error("Prompt Generation Error:", e);
            setError("Sorry, I couldn't analyze the image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, isLoading, promptLengthOption, customLength, imageUrl, onProjectCreated, projectToLoad]);
    
    const handleCopy = () => {
        if (generatedPrompt) {
            navigator.clipboard.writeText(generatedPrompt);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold">Image to Prompt</h2>
                <p className="text-lg text-text-secondary">Upload an image and let AI describe it for you.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
                {/* Input Panel */}
                <div className="flex flex-col gap-6 panel p-6">
                    <div 
                        onDragEnter={handleDragIn}
                        onDragLeave={handleDragOut}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`relative w-full aspect-video flex flex-col items-center justify-center bg-bg-color rounded-lg border-2 border-dashed border-border-color p-4 transition-colors ${isDragging ? 'border-white bg-panel-bg' : ''}`}
                    >
                        {imageUrl ? (
                            <img src={imageUrl} alt="Upload preview" className="max-w-full max-h-full object-contain rounded-md" />
                        ) : (
                            <div className="text-center text-text-secondary pointer-events-none">
                                <ImageUpIcon className="h-12 w-12 mx-auto mb-4" />
                                <p className="font-semibold">Drag & drop an image here</p>
                                <p>or</p>
                                <p className="font-semibold text-white">Click to upload</p>
                            </div>
                        )}
                         <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e.target.files)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            aria-label="Upload image"
                        />
                    </div>
                    {error && <p className="text-sm text-center" style={{ color: 'var(--warning-accent)'}}>{error}</p>}
                    
                    <div>
                        <label className="block text-lg font-semibold mb-3 text-white">Prompt Length</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPromptLengthOption('default')}
                                className={`py-3 px-2 rounded-lg text-center transition-colors border-2 ${promptLengthOption === 'default' ? 'bg-white border-white text-black font-semibold' : 'bg-panel-bg border-border-color hover:border-white'}`}
                            >
                                Default
                            </button>
                             <button
                                onClick={() => setPromptLengthOption('custom')}
                                className={`py-3 px-2 rounded-lg text-center transition-colors border-2 ${promptLengthOption === 'custom' ? 'bg-white border-white text-black font-semibold' : 'bg-panel-bg border-border-color hover:border-white'}`}
                            >
                                Custom
                            </button>
                        </div>
                    </div>
                    
                    {promptLengthOption === 'custom' && (
                         <div>
                            <label htmlFor="custom-length" className="block text-lg font-semibold mb-2 text-white">Custom Length</label>
                            <input
                                id="custom-length"
                                type="text"
                                value={customLength}
                                onChange={(e) => setCustomLength(e.target.value)}
                                placeholder="e.g., 50 words, around 100 characters"
                                className="input-styled text-lg"
                            />
                        </div>
                    )}
                    
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !imageUrl}
                        className="w-full mt-auto btn btn-primary text-lg py-4"
                    >
                        {isLoading ? <><LoadingSpinner className="mr-2"/> Analyzing...</> : projectToLoad ? 'Regenerate Prompt' : 'Generate Prompt'}
                    </button>
                    {projectToLoad && !imageFile && <p className="text-amber-400 text-xs text-center mt-2">To generate a new prompt, please re-upload the original image.</p>}
                </div>

                {/* Output Panel */}
                <div className="panel p-6 flex flex-col items-center justify-center gap-4">
                     <div className="relative w-full h-full min-h-[400px] flex items-center justify-center bg-bg-color rounded-lg p-4">
                        {isLoading ? (
                            <div className="text-center">
                                <LoadingSpinner className="h-12 w-12 mx-auto mb-4"/>
                                <p className="text-text-secondary text-lg">Generating prompt...</p>
                            </div>
                        ) : generatedPrompt ? (
                           <>
                            <pre className="text-text-primary whitespace-pre-wrap font-sans text-base w-full h-full overflow-y-auto">{generatedPrompt}</pre>
                            <button onClick={handleCopy} className="absolute top-2 right-2 p-2 rounded-lg bg-panel-bg hover:bg-opacity-80 transition-colors" aria-label="Copy prompt">
                                <CopyIcon className="h-5 w-5 text-white" />
                                <span className="absolute -top-8 right-0 bg-black text-white text-xs px-2 py-1 rounded shadow-lg" style={{ display: isCopied ? 'block' : 'none' }}>Copied!</span>
                            </button>
                           </>
                        ) : (
                            <p className="text-text-secondary opacity-50 text-center px-4">The generated prompt will appear here.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageToPrompt;
