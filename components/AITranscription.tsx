import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { ImageUpIcon } from './icons/ImageUpIcon';
import { CopyIcon } from './icons/CopyIcon';
import { WaveformIcon } from './icons/WaveformIcon';
import { AnyProject, AppView, TranscriptionProject, TranscriptionProjectData } from '../types';

interface Props {
    onProjectCreated: (project: AnyProject) => void;
    projectToLoad?: TranscriptionProject;
}

const AITranscription: React.FC<Props> = ({ onProjectCreated, projectToLoad }) => {
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [fileName, setFileName] = useState<string>('');
    const [fileType, setFileType] = useState<string>('');
    
    const dragCounter = useRef(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (projectToLoad) {
            const { data } = projectToLoad;
            setTranscript(data.transcript);
            setFileName(data.mediaFileName);
            setFileType(data.mediaType);
            setMediaPreviewUrl(data.mediaPreviewUrl || null); // Blob URL won't persist, but good for navigation within session
        }
    }, [projectToLoad]);

    const resetState = () => {
        setTranscript(null);
        setError(null);
        setIsLoading(false);
        setIsCopied(false);
    };

    const handleFileChange = (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
                setError('Please upload a valid audio or video file.');
                setMediaFile(null);
                setMediaPreviewUrl(null);
                setFileName('');
                setFileType('');
                return;
            }
            resetState();
            setMediaFile(file);
            setFileName(file.name);
            setFileType(file.type);
            setMediaPreviewUrl(URL.createObjectURL(file));
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
            handleFileChange(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    const handleTranscribe = useCallback(async () => {
        if (!mediaFile) {
            setError("Please upload a file to transcribe.");
            return;
        }

        resetState();
        setIsLoading(true);

        try {
            const result = await geminiService.transcribeMediaFile(mediaFile);
            setTranscript(result);

            const projectData: TranscriptionProjectData = {
                mediaFileName: mediaFile.name,
                mediaType: mediaFile.type,
                transcript: result,
                mediaPreviewUrl, // This will be a blob URL, won't work across sessions but is fine for immediate save
            };
            const newProject: TranscriptionProject = {
                id: projectToLoad?.id || `proj_${Date.now()}`,
                type: AppView.AI_TRANSCRIPTION,
                title: `Transcript: ${mediaFile.name}`,
                createdAt: projectToLoad?.createdAt || Date.now(),
                updatedAt: Date.now(),
                data: projectData
            };
            onProjectCreated(newProject);

        } catch (e: any) {
            console.error("Transcription Error:", e);
            setError(e.message || "Sorry, an error occurred during transcription. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [mediaFile, mediaPreviewUrl, onProjectCreated, projectToLoad]);

    const handleCopy = () => {
        if (transcript) {
            navigator.clipboard.writeText(transcript);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const isTranscribeDisabled = isLoading || (!mediaFile && !projectToLoad);

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold">AI Audio &amp; Video Transcription</h2>
                <p className="text-lg text-text-secondary">Upload an audio or video file to convert its spoken words into text.</p>
            </header>
            
            <div className="max-w-4xl mx-auto w-full flex flex-col items-center gap-6">
                 {/* Input Panel */}
                <div className="w-full panel p-6">
                    <div className="flex flex-col gap-4 items-center">
                        <div 
                            onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} onDrop={handleDrop}
                            className={`relative w-full aspect-video flex flex-col items-center justify-center bg-bg-color rounded-lg border-2 border-dashed border-border-color p-4 transition-colors ${isDragging ? 'border-white bg-panel-bg' : ''}`}
                        >
                            {mediaPreviewUrl && fileType ? (
                                fileType.startsWith('video/') ? (
                                    <video src={mediaPreviewUrl} controls className="max-w-full max-h-full object-contain rounded-md" />
                                ) : fileType.startsWith('audio/') ? (
                                    <div className="flex flex-col items-center justify-center text-center text-text-primary w-full">
                                        <WaveformIcon className="h-16 w-16 mb-4 text-text-secondary" />
                                        <p className="font-semibold">{fileName}</p>
                                        <audio src={mediaPreviewUrl} controls className="mt-4 w-full" />
                                    </div>
                                ) : null
                            ) : (
                                <div className="text-center text-text-secondary pointer-events-none">
                                    <ImageUpIcon className="h-12 w-12 mx-auto mb-4" />
                                    <p className="font-semibold">Drag &amp; drop an audio or video file here</p>
                                    <p>or</p>
                                    <p className="font-semibold text-white">Click to upload</p>
                                    <p className="text-xs mt-2">(Max file size: 20MB)</p>
                                </div>
                            )}
                            <input type="file" accept="video/*,audio/*" onChange={(e) => handleFileChange(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Upload media file"/>
                        </div>
                        {fileName && <p className="text-text-secondary text-sm">Selected: {fileName}</p>}
                    </div>
                </div>

                <button onClick={handleTranscribe} disabled={isTranscribeDisabled} className="w-full max-w-sm btn btn-primary text-lg py-4">
                    {isLoading ? <><LoadingSpinner className="mr-2"/> Transcribing...</> : 'Transcribe'}
                </button>
                {projectToLoad && !mediaFile && <p className="text-amber-400 text-xs text-center mt-2">To re-transcribe this file, please upload it again.</p>}

                 {/* Output Panel */}
                 {(isLoading || error || transcript) && (
                    <div className="w-full panel p-6 flex flex-col gap-4">
                        <div className="relative w-full min-h-[200px] flex items-center justify-center bg-bg-color rounded-lg p-4">
                            {isLoading ? (
                                <div className="text-center">
                                    <LoadingSpinner className="h-12 w-12 mx-auto mb-4"/>
                                    <p className="text-text-secondary text-lg">Analyzing file...</p>
                                </div>
                            ) : error ? (
                                 <div className="text-center" style={{ color: 'var(--warning-accent)'}}><p>{error}</p></div>
                            ) : transcript && (
                                <>
                                <pre className="text-text-primary whitespace-pre-wrap font-sans text-base w-full h-full max-h-96 overflow-y-auto">{transcript}</pre>
                                <button onClick={handleCopy} className="absolute top-2 right-2 p-2 rounded-lg bg-panel-bg hover:bg-opacity-80 transition-colors" aria-label="Copy transcript">
                                    <CopyIcon className="h-5 w-5 text-white" />
                                    <span className={`absolute -top-8 right-0 bg-black text-white text-xs px-2 py-1 rounded shadow-lg transition-opacity ${isCopied ? 'opacity-100' : 'opacity-0'}`}>Copied!</span>
                                </button>
                                </>
                            )}
                        </div>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default AITranscription;
