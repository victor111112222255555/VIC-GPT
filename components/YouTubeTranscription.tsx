import React, { useState, useCallback, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { CopyIcon } from './icons/CopyIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { AnyProject, AppView, YouTubeTranscriptionProject, YouTubeTranscriptionProjectData } from '../types';
import { YoutubeIcon } from './icons/YoutubeIcon';

interface Props {
    onProjectCreated: (project: AnyProject) => void;
    projectToLoad?: YouTubeTranscriptionProject;
}

const YouTubeTranscription: React.FC<Props> = ({ onProjectCreated, projectToLoad }) => {
    const [url, setUrl] = useState('');
    const [transcript, setTranscript] = useState<string | null>(null);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (projectToLoad) {
            const { data } = projectToLoad;
            setUrl(data.youtubeUrl);
            setTranscript(data.transcript);
            setVideoTitle(data.videoTitle);
        }
    }, [projectToLoad]);

    const handleTranscribe = useCallback(async () => {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        if (!url.trim() || !youtubeRegex.test(url)) {
            setError("Please enter a valid YouTube video URL.");
            return;
        }
        if (isLoading) return;

        setIsLoading(true);
        setError(null);
        setTranscript(null);
        setVideoTitle(null);
        setIsCopied(false);

        try {
            const { title, transcript: result } = await geminiService.transcribeYouTubeVideo(url);
            setTranscript(result);
            setVideoTitle(title);

            const projectData: YouTubeTranscriptionProjectData = {
                youtubeUrl: url,
                videoTitle: title,
                transcript: result,
            };
            const newProject: YouTubeTranscriptionProject = {
                id: projectToLoad?.id || `proj_${Date.now()}`,
                type: AppView.YOUTUBE_TRANSCRIPTION,
                title: title || `Transcript: ${url}`,
                createdAt: projectToLoad?.createdAt || Date.now(),
                updatedAt: Date.now(),
                data: projectData
            };
            onProjectCreated(newProject);

        } catch (e: any) {
            console.error("Transcription Error:", e);
            setError(e.message || "Sorry, an error occurred during transcription. The video might be private, unavailable, or have no clear audio.");
        } finally {
            setIsLoading(false);
        }
    }, [url, isLoading, onProjectCreated, projectToLoad]);

    const handleCopy = () => {
        if (transcript) {
            navigator.clipboard.writeText(transcript);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (transcript && videoTitle) {
            const blob = new Blob([transcript], { type: 'text/plain' });
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            // Sanitize title for filename
            const fileName = `${videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        }
    };

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold">YouTube Video Transcriber</h2>
                <p className="text-lg text-text-secondary">Paste any YouTube link to get a full text transcription.</p>
            </header>
            
            <div className="max-w-4xl mx-auto w-full flex flex-col items-center gap-6">
                 {/* Input Panel */}
                <div className="w-full panel p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                       <input
                           type="text"
                           value={url}
                           onChange={(e) => setUrl(e.target.value)}
                           placeholder="https://www.youtube.com/watch?v=..."
                           className="input-styled flex-1 text-lg"
                           aria-label="YouTube URL"
                       />
                       <button 
                            onClick={handleTranscribe} 
                            disabled={isLoading || !url.trim()} 
                            className="w-full sm:w-auto btn btn-primary text-lg py-3 px-6"
                       >
                           {isLoading ? <><LoadingSpinner className="mr-2"/> Transcribing...</> : 'Transcribe'}
                       </button>
                    </div>
                     {error && <p className="text-center mt-4" style={{ color: 'var(--warning-accent)'}}>{error}</p>}
                </div>

                 {/* Output Panel */}
                 {(isLoading || transcript) && (
                    <div className="w-full panel p-6 flex flex-col gap-4 animate-fadeInUp">
                        {videoTitle && (
                            <div className="pb-4 border-b border-border-color">
                                <h3 className="text-xl font-bold text-white">{videoTitle}</h3>
                            </div>
                        )}
                        <div className="relative w-full min-h-[300px] flex items-center justify-center bg-bg-color rounded-lg p-4">
                            {isLoading && !transcript ? (
                                <div className="text-center">
                                    <LoadingSpinner className="h-12 w-12 mx-auto mb-4"/>
                                    <p className="text-text-secondary text-lg">Analyzing video...</p>
                                    <p className="text-text-secondary text-sm mt-1">This may take a moment.</p>
                                </div>
                            ) : transcript && (
                                <>
                                <pre className="text-text-primary whitespace-pre-wrap font-sans text-base w-full h-full max-h-[60vh] overflow-y-auto p-2">
                                    {transcript}
                                </pre>
                                </>
                            )}
                        </div>
                        {transcript && (
                             <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={handleCopy} className="flex-1 btn btn-secondary relative">
                                    <CopyIcon className="h-5 w-5 mr-2" />
                                    Copy Transcription
                                    <span className={`absolute -top-8 right-1/2 translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded shadow-lg transition-opacity ${isCopied ? 'opacity-100' : 'opacity-0'}`}>
                                        Copied!
                                    </span>
                                </button>
                                <button onClick={handleDownload} className="flex-1 btn btn-secondary">
                                    <DownloadIcon className="h-5 w-5 mr-2" />
                                    Download as .txt
                                </button>
                            </div>
                        )}
                    </div>
                 )}

                 {!isLoading && !transcript && (
                    <div className="text-center text-text-secondary opacity-50 p-10">
                        <YoutubeIcon className="h-20 w-20 mx-auto mb-4"/>
                        <p>The transcript will appear here once generated.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default YouTubeTranscription;
