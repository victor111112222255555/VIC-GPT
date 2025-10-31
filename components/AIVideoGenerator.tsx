import React, { useState, useCallback, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { DownloadIcon } from './icons/DownloadIcon';
import { VideoAspectRatio, VideoResolution, AppView, VideoGenerationProject, VideoGenerationProjectData, AnyProject } from '../types';
import { VideoIcon } from './icons/VideoIcon';

const resolutionOptions: { label: string; value: VideoResolution }[] = [
    { label: '1080p (High)', value: '1080p' },
    { label: '720p (Standard)', value: '720p' },
];

const aspectRatioOptions: { label: string; value: VideoAspectRatio }[] = [
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Portrait (9:16)', value: '9:16' },
];

interface Props {
    onProjectCreated: (project: AnyProject) => void;
    projectToLoad?: VideoGenerationProject;
}

const AIVideoGenerator: React.FC<Props> = ({ onProjectCreated, projectToLoad }) => {
    const [prompt, setPrompt] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolution, setResolution] = useState<VideoResolution>('720p');
    const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
    const [progressMessage, setProgressMessage] = useState<string | null>(null);

    useEffect(() => {
        if (projectToLoad) {
            const { data } = projectToLoad;
            setPrompt(data.prompt);
            setGeneratedVideoUrl(data.videoUrl);
            setResolution(data.resolution);
            setAspectRatio(data.aspectRatio);
        }
    }, [projectToLoad]);
    
    useEffect(() => {
        // Revoke the old blob URL when component unmounts or URL changes to prevent memory leaks
        return () => {
            if (generatedVideoUrl) {
                URL.revokeObjectURL(generatedVideoUrl);
            }
        };
    }, [generatedVideoUrl]);

    const handleGenerate = useCallback(async () => {
        if (isLoading || !prompt.trim()) {
            if (!prompt.trim()) setError('Please enter a prompt to generate a video.');
            return;
        }

        setIsLoading(true);
        setError(null);
        if (generatedVideoUrl) {
            URL.revokeObjectURL(generatedVideoUrl);
        }
        setGeneratedVideoUrl(null);
        setProgressMessage('Initiating video generation...');
        
        try {
            const videoUrl = await geminiService.generateVideos(prompt, resolution, aspectRatio, (message) => {
                setProgressMessage(message);
            });
            setGeneratedVideoUrl(videoUrl);

            const projectData: VideoGenerationProjectData = {
                prompt,
                videoUrl,
                resolution,
                aspectRatio,
            };

            const newProject: VideoGenerationProject = {
                id: projectToLoad?.id || `proj_${Date.now()}`,
                type: AppView.AI_VIDEO_GENERATION,
                title: `Video: ${prompt.substring(0, 40)}...`,
                createdAt: projectToLoad?.createdAt || Date.now(),
                updatedAt: Date.now(),
                data: projectData,
            };
            onProjectCreated(newProject);

        } catch (e: any) {
            console.error("Video Generation Error:", e);
            setError(e.message || "Sorry, I couldn't generate the video. Please try a different prompt.");
        } finally {
            setIsLoading(false);
            setProgressMessage(null);
        }
    }, [prompt, isLoading, resolution, aspectRatio, generatedVideoUrl, onProjectCreated, projectToLoad]);

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold">AI Video Generator</h2>
                <p className="text-lg text-text-secondary">Transform your text prompts into high-quality videos.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
                {/* Input Panel */}
                <div className="flex flex-col gap-6 panel p-6">
                    <div>
                        <label htmlFor="prompt" className="block text-lg font-semibold mb-2 text-white">Your Prompt</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., An astronaut riding a horse on Mars, cinematic."
                            rows={8}
                            className="input-styled text-lg resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-lg font-semibold mb-3 text-white">Resolution</label>
                        <div className="grid grid-cols-2 gap-3">
                            {resolutionOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setResolution(option.value)}
                                    className={`py-3 px-2 rounded-lg text-center transition-colors border-2 ${ resolution === option.value ? 'bg-white border-white text-black font-semibold' : 'bg-panel-bg border-border-color hover:border-white' }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-lg font-semibold mb-3 text-white">Aspect Ratio</label>
                        <div className="grid grid-cols-2 gap-3">
                            {aspectRatioOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setAspectRatio(option.value)}
                                    className={`py-3 px-2 rounded-lg text-center transition-colors border-2 ${ aspectRatio === option.value ? 'bg-white border-white text-black font-semibold' : 'bg-panel-bg border-border-color hover:border-white' }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full mt-auto btn btn-primary text-lg py-4"
                    >
                        {isLoading ? <><LoadingSpinner className="mr-2"/> Generating...</> : 'Generate Video'}
                    </button>
                </div>

                {/* Output Panel */}
                <div className="panel p-6 flex flex-col items-center justify-center gap-4">
                    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-bg-color rounded-lg border-2 border-dashed border-border-color p-4">
                        {isLoading ? (
                            <div className="text-center">
                                <LoadingSpinner className="h-12 w-12 mx-auto mb-4"/>
                                <p className="text-text-secondary text-lg">Generating Video</p>
                                <p className="text-text-secondary opacity-70 text-sm mt-2">{progressMessage}</p>
                            </div>
                        ) : error && !generatedVideoUrl ? (
                            <div className="text-center" style={{ color: 'var(--warning-accent)'}}>
                                <p className="font-bold">Generation Failed</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : generatedVideoUrl ? (
                            <video src={generatedVideoUrl} controls autoPlay loop className="max-w-full max-h-full object-contain rounded-md" />
                        ) : (
                            <div className="text-center text-text-secondary opacity-50 px-4">
                                <VideoIcon className="h-20 w-20 mx-auto mb-4"/>
                                <p>Your generated video will appear here.</p>
                            </div>
                        )}
                    </div>
                     {generatedVideoUrl && !isLoading && (
                        <a
                            href={generatedVideoUrl}
                            download="vic-gpt-generated-video.mp4"
                            className="w-full btn btn-secondary text-lg"
                        >
                            <DownloadIcon className="h-5 w-5 mr-2" />
                            Download Video
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIVideoGenerator;
