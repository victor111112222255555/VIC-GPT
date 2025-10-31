import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { DownloadIcon } from './icons/DownloadIcon';
import { AspectRatio, ImageStyle, AppView, ImageGenerationProject, ImageGenerationProjectData, AnyProject } from '../types';
import { IMAGE_STYLE_OPTIONS } from '../constants';
import { ImageUpIcon } from './icons/ImageUpIcon';
import { XIcon } from './icons/XIcon';
import { ImageIcon } from './icons/ImageIcon';

const aspectRatioOptions: { label: string; value: AspectRatio }[] = [
    { label: 'Square (1:1)', value: 'SQUARE' },
    { label: 'Landscape (16:9)', value: 'LANDSCAPE' },
    { label: 'Portrait (9:16)', value: 'PORTRAIT' },
];

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            active 
                ? 'nav-item-active' 
                : 'text-text-secondary hover:bg-panel-bg hover:text-text-primary'
        }`}
    >
        {children}
    </button>
);

interface Props {
    onProjectCreated: (project: AnyProject) => void;
    projectToLoad?: ImageGenerationProject;
}

const ImageGenerator: React.FC<Props> = ({ onProjectCreated, projectToLoad }) => {
    const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
    const [prompt, setPrompt] = useState('');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('SQUARE');
    const [style, setStyle] = useState<ImageStyle | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    
    // State for image upload
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const dragCounter = useRef(0);
    const [isDragging, setIsDragging] = useState(false);
    
    useEffect(() => {
        if (projectToLoad) {
            const { data } = projectToLoad;
            setPrompt(data.prompt);
            setGeneratedImageUrl(data.generatedImageUrl);
            setAspectRatio(data.aspectRatio);
            setStyle(data.style);
            if (data.referenceImageUrl) {
                setActiveTab('image');
                setImageUrl(data.referenceImageUrl);
            } else {
                setActiveTab('text');
            }
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
        e.preventDefault(); e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
    };
    const handleDragOut = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleImageChange(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };
    
    const handleRemoveImage = useCallback(() => {
        setImageFile(null);
        setImageUrl(null);
    }, []);

    const handleTabChange = (tab: 'text' | 'image') => {
        setActiveTab(tab);
        setError(null);
        setPrompt('');
        if (tab === 'text') {
            handleRemoveImage();
        } else { // on switch to image tab
            setStyle(null);
            setAspectRatio('SQUARE');
        }
    };

    const handleGenerate = useCallback(async () => {
        if (isLoading) return;

        const currentPrompt = prompt;
        if (activeTab === 'text' && !currentPrompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        if (activeTab === 'image' && !imageFile && !imageUrl) { // Also check imageUrl for loaded projects
            setError('Please upload a reference image for Image to Image generation.');
            return;
        }
        if (activeTab === 'image' && !imageFile && imageUrl) {
            // This is a loaded project, can't re-generate without file
            setError('Please re-upload the reference image to generate new variations.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setGeneratedImageUrl(null);

        try {
            let newImageUrl: string;
            let projectTitle: string;
            let referenceImageForProject: string | undefined = undefined;

            if (activeTab === 'image' && imageFile) {
                setLoadingMessage("Applying your edits...");
                newImageUrl = await geminiService.editImage(imageFile, currentPrompt);
                referenceImageForProject = imageUrl!;
                projectTitle = currentPrompt.substring(0, 40) || `Edited Image`;

            } else { // text-to-image
                setLoadingMessage("Generating your masterpiece...");
                newImageUrl = await geminiService.generateImage(currentPrompt, aspectRatio, style);
                projectTitle = currentPrompt.substring(0, 40) || 'Generated Image';
            }
            
            setGeneratedImageUrl(newImageUrl);

            const projectData: ImageGenerationProjectData = {
                prompt: currentPrompt,
                generatedImageUrl: newImageUrl,
                aspectRatio,
                style,
                referenceImageUrl: referenceImageForProject,
            };

            const newProject: ImageGenerationProject = {
                id: projectToLoad?.id || `proj_${Date.now()}`,
                type: AppView.IMAGE_GENERATION,
                title: projectTitle,
                createdAt: projectToLoad?.createdAt || Date.now(),
                updatedAt: Date.now(),
                data: projectData,
            };
            onProjectCreated(newProject);

        } catch (e) {
            console.error("Image Generation Error:", e);
            setError("Sorry, I couldn't generate the image. Please try a different prompt or reference image.");
        } finally {
            setIsLoading(false);
            setLoadingMessage(null);
        }
    }, [prompt, isLoading, aspectRatio, style, imageFile, activeTab, imageUrl, onProjectCreated, projectToLoad]);


    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold">AI Image Generator</h2>
                <p className="text-lg text-text-secondary">Turn your ideas into visuals. Describe anything you can imagine.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
                {/* Input Panel */}
                <div className="flex flex-col gap-6 panel p-6">
                     <div className="flex bg-bg-color p-1 rounded-xl">
                        <TabButton active={activeTab === 'text'} onClick={() => handleTabChange('text')}>
                            <ImageIcon className="w-5 h-5"/> Text to Image
                        </TabButton>
                        <TabButton active={activeTab === 'image'} onClick={() => handleTabChange('image')}>
                            <ImageUpIcon className="w-5 h-5"/> Image to Image
                        </TabButton>
                    </div>

                    {activeTab === 'image' && (
                        <div className="animate-fadeIn">
                            <label htmlFor="image-upload" className="block text-lg font-semibold mb-2 text-white">Reference Image</label>
                            {imageUrl ? (
                                <div className="relative group">
                                    <img src={imageUrl} alt="Upload preview" className="w-full h-auto object-contain rounded-md max-h-60" />
                                    <button
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                                        aria-label="Remove image"
                                    >
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div 
                                    onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} onDrop={handleDrop}
                                    className={`relative w-full aspect-[16/9] flex flex-col items-center justify-center bg-bg-color rounded-lg border-2 border-dashed border-border-color p-4 transition-colors ${isDragging ? 'border-white bg-panel-bg' : ''}`}
                                >
                                    <div className="text-center text-text-secondary pointer-events-none flex flex-col items-center">
                                        <ImageUpIcon className="h-8 w-8" />
                                        <p className="font-semibold mt-2">Add reference image</p>
                                        <p>Drag & drop or click to upload</p>
                                    </div>
                                    <input id="image-upload" type="file" accept="image/*" onChange={(e) => handleImageChange(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Upload image" />
                                </div>
                            )}
                            {error && !imageUrl && <p className="text-sm -mt-4" style={{ color: 'var(--warning-accent)'}}>{error}</p>}
                        </div>
                    )}

                    <div>
                        <label htmlFor="prompt" className="block text-lg font-semibold mb-2 text-white">{activeTab === 'text' ? 'Your Prompt' : 'Modification Prompt (Optional)'}</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={activeTab === 'image' ? "e.g., Change the background to a beach scene" : "e.g., A majestic lion wearing a crown on a throne"}
                            rows={activeTab === 'image' ? 3 : 6}
                            className="input-styled text-lg resize-none transition-all"
                        />
                    </div>
                    
                    {activeTab === 'text' && (
                        <>
                             <div>
                                <label className="block text-lg font-semibold mb-3 text-white">Style (Optional)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {IMAGE_STYLE_OPTIONS.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setStyle(prev => prev === option.value ? null : option.value)}
                                            className={`py-2 px-2 rounded-lg text-center transition-colors border-2 text-sm flex items-center justify-center gap-1.5 ${
                                                style === option.value
                                                    ? 'bg-white border-white text-black font-semibold'
                                                    : 'bg-panel-bg border-border-color hover:border-white'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-lg font-semibold mb-3 text-white">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {aspectRatioOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setAspectRatio(option.value)}
                                            className={`py-3 px-2 rounded-lg text-center transition-colors border-2 ${
                                                aspectRatio === option.value
                                                    ? 'bg-white border-white text-black font-semibold'
                                                    : 'bg-panel-bg border-border-color hover:border-white'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || (activeTab === 'text' && !prompt.trim()) || (activeTab === 'image' && !imageUrl)}
                        className="w-full mt-auto btn btn-primary text-lg py-4"
                    >
                        {isLoading ? <><LoadingSpinner className="mr-2"/> {loadingMessage || 'Generating...'}</> : 'Generate Image'}
                    </button>
                </div>

                {/* Output Panel */}
                <div className="panel p-6 flex flex-col items-center justify-center gap-4">
                    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-bg-color rounded-lg border-2 border-dashed border-border-color p-4">
                        {isLoading ? (
                            <div className="text-center">
                                <LoadingSpinner className="h-12 w-12 mx-auto mb-4"/>
                                <p className="text-text-secondary text-lg">{loadingMessage || 'Generating...'}</p>
                            </div>
                        ) : error && !generatedImageUrl ? (
                            <div className="text-center" style={{ color: 'var(--warning-accent)'}}>
                                <p className="font-bold">Generation Failed</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : generatedImageUrl ? (
                            <img src={generatedImageUrl} alt="Generated visual" className="max-w-full max-h-full object-contain rounded-md" />
                        ) : (
                            <p className="text-text-secondary opacity-50 text-center px-4">Your generated image will appear here.</p>
                        )}
                    </div>
                     {generatedImageUrl && !isLoading && (
                        <a
                            href={generatedImageUrl}
                            download="vic-gpt-generated-image.jpeg"
                            className="w-full btn btn-secondary text-lg"
                        >
                            <DownloadIcon className="h-5 w-5 mr-2" />
                            Download Image
                        </a>
                    )}
                </div>
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

export default ImageGenerator;