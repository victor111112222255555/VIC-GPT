import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { AnyProject, AppView, AISplitPausesProject, AISplitPausesProjectData, PauseSegment } from '../types';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { ImageUpIcon } from './icons/ImageUpIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ScissorsIcon } from './icons/ScissorsIcon';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';

// Helper function to convert AudioBuffer to a WAV Blob
function bufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;

    let result: Int16Array;
    if (numChannels === 2) {
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);
        result = new Int16Array(left.length + right.length);
        for (let i = 0, j = 0; i < left.length; i++) {
            result[j++] = Math.max(-1, Math.min(1, left[i])) * 32767;
            result[j++] = Math.max(-1, Math.min(1, right[i])) * 32767;
        }
    } else {
        const channelData = buffer.getChannelData(0);
        result = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
            result[i] = Math.max(-1, Math.min(1, channelData[i])) * 32767;
        }
    }

    const dataLength = result.length * (bitDepth / 8);
    const bufferLength = 44 + dataLength;
    const wavBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(wavBuffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    new Int16Array(wavBuffer, 44).set(result);
    return new Blob([view], { type: 'audio/wav' });
}


interface Props {
    onProjectCreated: (project: AnyProject) => void;
    projectToLoad?: AISplitPausesProject;
}

const AISplitPauses: React.FC<Props> = ({ onProjectCreated, projectToLoad }) => {
    const [view, setView] = useState<'upload' | 'editor'>('upload');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [pauses, setPauses] = useState<PauseSegment[]>([]);
    const [minPauseDuration, setMinPauseDuration] = useState(0.5);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');
    
    const [zoom, setZoom] = useState(1);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const dragCounter = useRef(0);
    const [isDragging, setIsDragging] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => { audioContextRef.current?.close(); };
    }, []);

    useEffect(() => {
        if (projectToLoad) {
            const { data } = projectToLoad;
            // Blob URLs don't persist, so we can't restore the audio player/waveform
            // but we can restore the data.
            setPauses(data.pauses || []);
            setMediaFile(null); // Can't restore file object
            setMinPauseDuration(data.minPauseDuration || 0.5);
            if (data.pauses.length > 0) {
                 setProgressMessage(`Loaded project "${projectToLoad.title}". Please re-upload the audio file to edit.`);
                 setView('upload');
            }
        }
    }, [projectToLoad]);
    
    useEffect(() => {
        if (view === 'editor' && audioBuffer && canvasRef.current) {
            drawWaveform();
        }
    }, [view, audioBuffer, pauses, zoom, canvasRef.current]);


    const handleFileChange = (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            if (!file.type.startsWith('audio/')) {
                setError('Please upload a valid audio file.');
                return;
            }
            setError(null);
            setMediaFile(file);
            if (mediaUrl) URL.revokeObjectURL(mediaUrl);
            setMediaUrl(URL.createObjectURL(file));
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
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFileChange(e.dataTransfer.files);
    };

    const handleAnalyze = useCallback(async () => {
        if (!mediaFile || isLoading) return;
        setIsLoading(true);
        setError(null);
        setProgressMessage('Decoding audio file...');
        try {
            const arrayBuffer = await mediaFile.arrayBuffer();
            const decodedBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
            setAudioBuffer(decodedBuffer);

            setProgressMessage('Detecting pauses with AI...');
            const detectedPauses = await geminiService.detectPausesInAudio(mediaFile, minPauseDuration);

            setPauses(detectedPauses.map((p, i) => ({ ...p, id: `pause-${i}`, toBeRemoved: true })));
            setView('editor');
        } catch (e: any) {
            setError(e.message || 'Failed to analyze audio.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [mediaFile, isLoading, minPauseDuration]);

    const drawWaveform = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !audioBuffer || !container) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const centerY = height / 2;
        
        ctx.clearRect(0, 0, width, height);

        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / (width * zoom));
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'var(--secondary-accent)';
        ctx.beginPath();
        
        for (let i = 0; i < width * zoom; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.moveTo(i / zoom, (1 + min) * centerY);
            ctx.lineTo(i / zoom, (1 + max) * centerY);
        }
        ctx.stroke();

        // Draw pauses
        pauses.forEach(p => {
            if (p.toBeRemoved) {
                const startX = (p.start / audioBuffer.duration) * width;
                const endX = (p.end / audioBuffer.duration) * width;
                ctx.fillStyle = 'rgba(255, 69, 58, 0.4)';
                ctx.shadowColor = 'rgba(255, 69, 58, 0.8)';
                ctx.shadowBlur = 15;
                ctx.fillRect(startX, 0, endX - startX, height);
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }
        });
    };
    
    const handleTogglePause = (id: string) => {
        setPauses(pauses.map(p => p.id === id ? { ...p, toBeRemoved: !p.toBeRemoved } : p));
    };

    const handleExport = useCallback(async () => {
        if (!audioBuffer) return;
        setIsLoading(true);
        setProgressMessage('Processing audio...');
        try {
            const segmentsToKeep: { start: number; end: number }[] = [];
            let lastEnd = 0;
            
            pauses.filter(p => p.toBeRemoved).sort((a,b) => a.start - b.start).forEach(p => {
                if (p.start > lastEnd) {
                    segmentsToKeep.push({ start: lastEnd, end: p.start });
                }
                lastEnd = p.end;
            });
            
            if (lastEnd < audioBuffer.duration) {
                segmentsToKeep.push({ start: lastEnd, end: audioBuffer.duration });
            }

            const totalLength = segmentsToKeep.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
            const newBuffer = audioContextRef.current!.createBuffer(
                audioBuffer.numberOfChannels,
                Math.round(totalLength * audioBuffer.sampleRate),
                audioBuffer.sampleRate
            );

            let offset = 0;
            for (const channel of Array.from({ length: audioBuffer.numberOfChannels }, (_, i) => i)) {
                const oldChannelData = audioBuffer.getChannelData(channel);
                const newChannelData = newBuffer.getChannelData(channel);
                let currentPosition = 0;
                
                segmentsToKeep.forEach(seg => {
                    const startSample = Math.round(seg.start * audioBuffer.sampleRate);
                    const endSample = Math.round(seg.end * audioBuffer.sampleRate);
                    const segmentData = oldChannelData.subarray(startSample, endSample);
                    newChannelData.set(segmentData, currentPosition);
                    currentPosition += segmentData.length;
                });
            }

            const wavBlob = bufferToWav(newBuffer);
            const downloadUrl = URL.createObjectURL(wavBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${mediaFile?.name.replace(/\.[^/.]+$/, "") || 'edited'}_no_pauses.wav`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            // Save project
            const projectData: AISplitPausesProjectData = {
                mediaFileName: mediaFile!.name,
                mediaType: mediaFile!.type,
                mediaUrl,
                pauses,
                minPauseDuration,
            };
            onProjectCreated({
                id: projectToLoad?.id || `proj_${Date.now()}`,
                type: AppView.AI_SPLIT_PAUSES,
                title: `Pauses split for ${mediaFile!.name}`,
                createdAt: projectToLoad?.createdAt || Date.now(),
                updatedAt: Date.now(),
                data: projectData
            });

        } catch (e: any) {
            setError(e.message || "Failed to export audio.");
        } finally {
            setIsLoading(false);
        }
    }, [audioBuffer, pauses, mediaFile, minPauseDuration, onProjectCreated, projectToLoad, mediaUrl]);
    
    const startOver = () => {
        setView('upload');
        setMediaFile(null);
        if (mediaUrl) URL.revokeObjectURL(mediaUrl);
        setMediaUrl(null);
        setAudioBuffer(null);
        setPauses([]);
        setError(null);
        setProgressMessage('');
    };
    
    if (view === 'editor') {
        return (
            <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-bold">Silence Remover</h2>
                        <p className="text-lg text-text-secondary">Review detected pauses. Click to keep a pause.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={startOver} className="btn btn-secondary">Start Over</button>
                        <button onClick={handleExport} disabled={isLoading} className="btn btn-primary gap-2">
                            {isLoading ? <LoadingSpinner /> : <DownloadIcon className="w-5 h-5"/>}
                            {isLoading ? progressMessage : 'Export Audio'}
                        </button>
                    </div>
                </header>
                <div className="flex-1 flex flex-col gap-4">
                    <div ref={containerRef} className="relative w-full h-48 overflow-x-auto border border-border-color rounded-lg bg-black/20">
                        <canvas ref={canvasRef} className="h-full" style={{ width: `${100 * zoom}%` }}/>
                        {audioBuffer && pauses.map(p => {
                            const startPercent = (p.start / audioBuffer.duration) * 100;
                            const endPercent = (p.end / audioBuffer.duration) * 100;
                            return (
                                <button key={p.id} onClick={() => handleTogglePause(p.id)}
                                 className={`absolute bottom-2 transform -translate-x-1/2 p-1 rounded-full transition-all duration-200 ${p.toBeRemoved ? 'bg-red-500 hover:bg-red-400' : 'bg-green-500 hover:bg-green-400'}`}
                                 style={{ left: `${(startPercent + endPercent) / 2 * zoom}%`, width: '24px', height: '24px'}}
                                 title={p.toBeRemoved ? 'Click to KEEP this pause' : 'Click to REMOVE this pause'}
                                >
                                    {p.toBeRemoved ? <XIcon className="w-4 h-4 text-white"/> : <PlusIcon className="w-4 h-4 text-white rotate-45"/>}
                                </button>
                            )
                        })}
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setZoom(z => Math.max(1, z / 1.5))} className="btn btn-secondary text-lg font-mono">-</button>
                        <span className="text-text-secondary">Zoom</span>
                        <button onClick={() => setZoom(z => Math.min(20, z * 1.5))} className="btn btn-secondary text-lg font-mono">+</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold">AI Split Pauses</h2>
                <p className="text-lg text-text-secondary">Automatically detect and remove silence from your audio.</p>
            </header>
            <div className="max-w-2xl mx-auto w-full flex flex-col items-center gap-6">
                <div className="w-full panel p-6">
                    <div onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} onDrop={handleDrop}
                        className={`relative w-full aspect-video flex flex-col items-center justify-center bg-bg-color rounded-lg border-2 border-dashed border-border-color p-4 transition-colors ${isDragging ? 'border-white bg-panel-bg' : ''}`}
                    >
                        {mediaUrl ? (
                            <div className="text-center">
                                <audio src={mediaUrl} controls className="w-full max-w-md"/>
                                <p className="mt-4 text-text-secondary">{mediaFile?.name}</p>
                            </div>
                        ) : (
                             <div className="text-center text-text-secondary pointer-events-none">
                                <ImageUpIcon className="h-12 w-12 mx-auto mb-4" />
                                <p className="font-semibold">Drag & drop an audio file</p>
                                <p>or click to upload</p>
                                <p className="text-xs mt-2">(Max file size: 20MB)</p>
                             </div>
                        )}
                        <input type="file" accept="audio/*" onChange={(e) => handleFileChange(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                    </div>
                </div>
                
                <div className="w-full panel p-6">
                    <label htmlFor="pause-duration" className="block text-lg font-semibold mb-3 text-white">Minimum Pause Duration</label>
                    <div className="flex items-center gap-4">
                        <input
                            id="pause-duration"
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={minPauseDuration}
                            onChange={e => setMinPauseDuration(parseFloat(e.target.value))}
                            className="w-full h-2 bg-panel-bg rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-mono text-lg text-secondary-accent w-20 text-center">{minPauseDuration.toFixed(1)}s</span>
                    </div>
                </div>

                <button onClick={handleAnalyze} disabled={isLoading || !mediaFile} className="w-full max-w-sm btn btn-primary text-lg py-4">
                    {isLoading ? <><LoadingSpinner className="mr-2"/> {progressMessage}...</> : <> <ScissorsIcon className="mr-2 w-5 h-5"/> Find & Split Pauses</>}
                </button>
                 {error && <p className="text-center" style={{ color: 'var(--warning-accent)'}}>{error}</p>}
                 {progressMessage && !isLoading && <p className="text-center text-text-secondary">{progressMessage}</p>}
            </div>
        </div>
    );
};

export default AISplitPauses;
