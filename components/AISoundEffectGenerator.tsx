import React, { useState, useCallback, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { AnyProject, AppView, SoundEffectGenerationProject, SoundEffectGenerationProjectData } from '../types';
import { SOUND_EFFECT_DURATION_OPTIONS } from '../constants';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { DownloadIcon } from './icons/DownloadIcon';
import { SoundwaveIcon } from './icons/SoundwaveIcon';

// Helper functions for audio processing
function decodeBase64(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function createWavBlob(pcmData: Uint8Array): Blob {
    const sampleRate = 24000;
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, fileSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);

    return new Blob([view, pcmData], { type: 'audio/wav' });
}

interface Props {
    onProjectCreated: (project: AnyProject) => void;
    projectToLoad?: SoundEffectGenerationProject;
}

const AISoundEffectGenerator: React.FC<Props> = ({ onProjectCreated, projectToLoad }) => {
    const [prompt, setPrompt] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(SOUND_EFFECT_DURATION_OPTIONS[1].value);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (projectToLoad) {
            const { data } = projectToLoad;
            setPrompt(data.prompt);
            setSelectedDuration(data.duration);
            setAudioUrl(data.generatedAudioUrl || null);
        }
    }, [projectToLoad]);

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim() || isLoading) {
            if (!prompt.trim()) setError("Please enter a prompt to generate a sound effect.");
            return;
        }

        setIsLoading(true);
        setError(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }

        try {
            const base64Audio = await geminiService.generateSoundEffect(prompt, selectedDuration);
            const pcmData = decodeBase64(base64Audio);
            const wavBlob = createWavBlob(pcmData);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);

            const projectData: SoundEffectGenerationProjectData = {
                prompt,
                duration: selectedDuration,
                generatedAudioUrl: url,
            };
            const newProject: SoundEffectGenerationProject = {
                id: projectToLoad?.id || `proj_${Date.now()}`,
                type: AppView.AI_SOUND_EFFECT_GENERATION,
                title: `SFX: ${prompt.substring(0, 40)}...`,
                createdAt: projectToLoad?.createdAt || Date.now(),
                updatedAt: Date.now(),
                data: projectData,
            };
            onProjectCreated(newProject);
        } catch (e: any) {
            console.error("Sound Effect Generation Error:", e);
            setError(e.message || "Sorry, an error occurred while generating the sound effect.");
        } finally {
            setIsLoading(false);
        }
    }, [prompt, selectedDuration, isLoading, audioUrl, onProjectCreated, projectToLoad]);

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold">AI Sound Effect Generator</h2>
                <p className="text-lg text-text-secondary">Describe any sound effect you can imagine.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
                {/* Input Panel */}
                <div className="flex flex-col gap-6 panel p-6">
                    <div>
                        <label htmlFor="sfx-prompt" className="block text-lg font-semibold mb-2 text-white">Sound Description</label>
                        <textarea
                            id="sfx-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A heavy wooden door creaking open in a haunted house"
                            rows={8}
                            className="input-styled text-lg resize-y"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-lg font-semibold mb-3 text-white">Approximate Duration</label>
                        <div className="grid grid-cols-3 gap-3">
                            {SOUND_EFFECT_DURATION_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setSelectedDuration(option.value)}
                                    className={`py-3 px-2 rounded-lg text-center transition-colors border-2 ${
                                        selectedDuration === option.value
                                            ? 'bg-white border-white text-black font-semibold'
                                            : 'bg-panel-bg border-border-color hover:border-white'
                                    }`}
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
                        {isLoading ? <><LoadingSpinner className="mr-2"/> Generating...</> : 'Generate Sound Effect'}
                    </button>
                </div>

                {/* Output Panel */}
                <div className="panel p-6 flex flex-col items-center justify-center gap-4">
                    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-bg-color rounded-lg border-2 border-dashed border-border-color p-4">
                        {isLoading ? (
                            <div className="text-center">
                                <LoadingSpinner className="h-12 w-12 mx-auto mb-4"/>
                                <p className="text-text-secondary text-lg">Generating audio...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center" style={{ color: 'var(--warning-accent)'}}>
                                <p className="font-bold">Generation Failed</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : audioUrl ? (
                            <div className="flex flex-col items-center justify-center w-full gap-4">
                                <SoundwaveIcon className="h-20 w-20 text-text-secondary opacity-50"/>
                                <audio src={audioUrl} controls className="w-full" />
                            </div>
                        ) : (
                            <div className="text-center text-text-secondary opacity-50 px-4">
                               <SoundwaveIcon className="h-20 w-20 mx-auto mb-4"/>
                               <p>Your generated sound effect will appear here.</p>
                            </div>
                        )}
                    </div>
                     {audioUrl && !isLoading && (
                        <a
                            href={audioUrl}
                            download="vic-gpt-sfx.wav"
                            className="w-full btn btn-secondary text-lg"
                        >
                            <DownloadIcon className="h-5 w-5 mr-2" />
                            Download Sound
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AISoundEffectGenerator;
