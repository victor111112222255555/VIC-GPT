import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as geminiService from '../services/geminiService';
import { AnyProject, AppView, TextToSpeechProject, TextToSpeechProjectData, Speaker } from '../types';
import { TTS_VOICE_OPTIONS } from '../constants';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { XIcon } from './icons/XIcon';
import { PlayIcon } from './icons/PlayIcon';

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
    projectToLoad?: TextToSpeechProject;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; }> = ({ active, onClick, children }) => (
    <button
        type="button"
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


const AITextToSpeech: React.FC<Props> = ({ onProjectCreated, projectToLoad }) => {
    const [mode, setMode] = useState<'single' | 'podcast'>('single');
    const [text, setText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState(TTS_VOICE_OPTIONS[0].name);
    const [speakers, setSpeakers] = useState<Speaker[]>([
        { id: `spk_${Date.now()}`, name: 'Speaker 1', voice: TTS_VOICE_OPTIONS[0].name },
        { id: `spk_${Date.now() + 1}`, name: 'Speaker 2', voice: TTS_VOICE_OPTIONS[1].name },
    ]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string | null>(null);
    const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (projectToLoad) {
            const { data } = projectToLoad;
            setMode(data.mode || 'single');
            setText(data.text);
            if (data.mode === 'podcast' && data.speakers) {
                setSpeakers(data.speakers);
            } else {
                setSelectedVoice(data.voice || TTS_VOICE_OPTIONS[0].name);
            }
            setAudioUrl(data.generatedAudioUrl || null); // Blob URL won't persist across sessions
        }
    }, [projectToLoad]);

    useEffect(() => {
        // Revoke the old blob URL when the component unmounts or the URL changes
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

     const handleAddSpeaker = () => {
        setSpeakers(prev => [
            ...prev,
            {
                id: `spk_${Date.now()}`,
                name: `Speaker ${prev.length + 1}`,
                voice: TTS_VOICE_OPTIONS[prev.length % TTS_VOICE_OPTIONS.length].name,
            },
        ]);
    };

    const handleRemoveSpeaker = (id: string) => {
        if (speakers.length > 2) {
            setSpeakers(prev => prev.filter(s => s.id !== id));
        } else {
            setError("A podcast requires at least two speakers.");
        }
    };

    const handleSpeakerChange = (id: string, field: 'name' | 'voice', value: string) => {
        setSpeakers(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
    };
    
    const handlePreviewVoice = async (voiceName: string) => {
        if (previewingVoice) return; // Prevent multiple previews at once
        setPreviewingVoice(voiceName);
        setError(null);
        try {
            const base64Audio = await geminiService.generateSpeech(
                "Hello, this is a preview of my voice.",
                voiceName
            );
            const pcmData = decodeBase64(base64Audio);
            const wavBlob = createWavBlob(pcmData);
            const url = URL.createObjectURL(wavBlob);
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => {
                URL.revokeObjectURL(url);
            };
        } catch (e) {
            setError("Could not preview voice.");
            console.error(e);
        } finally {
            setPreviewingVoice(null);
        }
    };


    const handleGenerate = useCallback(async () => {
        if (!text.trim() || isLoading) {
            if (!text.trim()) setError("Please enter some text to generate speech.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setProgressMessage("Initiating...");
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }

        try {
            let finalAudioUrl: string;
            let projectTitle: string;

            if (mode === 'podcast') {
                if (speakers.length < 2) {
                    throw new Error("You need at least two speakers for a podcast.");
                }

                // 1. Parse Script
                setProgressMessage("Parsing script...");
                const lines = text.trim().split('\n').filter(line => line.trim() !== '');
                const parsedLines = [];
                for (const line of lines) {
                    const match = line.match(/^([^:]+):\s*(.*)$/);
                    if (!match) continue; // Skip non-dialogue lines

                    const speakerName = match[1].trim();
                    const dialogue = match[2].trim();
                    const speaker = speakers.find(s => s.name.trim().toLowerCase() === speakerName.toLowerCase());

                    if (!speaker) {
                        throw new Error(`Unknown speaker name in script: "${speakerName}". Please ensure names in the script match the setup.`);
                    }
                    if (dialogue) {
                        parsedLines.push({ speaker, dialogue });
                    }
                }
                
                // NEW: Chunking logic for long dialogue lines
                const CHUNK_SIZE_LIMIT = 3000; // A safe character limit for the TTS API
                
                const splitTextIntoChunks = (text: string, limit: number): string[] => {
                    if (text.length <= limit) return [text];
                    
                    const chunks: string[] = [];
                    // Split by sentences, keeping the delimiters. This is a robust way to find natural break points.
                    const sentences = text.match(/([^\.!\?]+[\.!\?]*)/g) || [];
                    
                    let currentChunk = "";
                    for (const sentence of sentences) {
                        const trimmedSentence = sentence.trim();
                        if (trimmedSentence.length === 0) continue;
                        
                        // If adding the next sentence exceeds the limit, push the current chunk and start a new one.
                        if (currentChunk.length + trimmedSentence.length + 1 > limit) {
                            if (currentChunk) chunks.push(currentChunk);
                            
                            // If a single sentence is longer than the limit, we must split it forcefully.
                            if (trimmedSentence.length > limit) {
                                for (let i = 0; i < trimmedSentence.length; i += limit) {
                                    chunks.push(trimmedSentence.substring(i, i + limit));
                                }
                                currentChunk = ""; // Reset chunk as the long sentence has been fully processed.
                            } else {
                                currentChunk = trimmedSentence; // This sentence starts the new chunk.
                            }
                        } else {
                            currentChunk += (currentChunk ? " " : "") + trimmedSentence;
                        }
                    }
                    
                    if (currentChunk) chunks.push(currentChunk);

                    // Fallback for text with no sentence delimiters (e.g., a long list)
                    if (chunks.length === 0 && text.length > 0) {
                        for (let i = 0; i < text.length; i += limit) {
                            chunks.push(text.substring(i, i + limit));
                        }
                    }
                    return chunks;
                };

                const generationTasks: { speaker: Speaker, dialogue: string }[] = [];
                setProgressMessage("Preparing generation tasks...");
                for (const line of parsedLines) {
                    const chunks = splitTextIntoChunks(line.dialogue, CHUNK_SIZE_LIMIT);
                    for (const chunk of chunks) {
                        generationTasks.push({ speaker: line.speaker, dialogue: chunk });
                    }
                }

                if (generationTasks.length === 0) {
                    throw new Error("Could not find any valid dialogue lines to process. Please follow the 'Speaker Name: text' format.");
                }

                // 2. Generate audio for each chunk sequentially
                const audioSegments: Uint8Array[] = [];
                for (let i = 0; i < generationTasks.length; i++) {
                    const task = generationTasks[i];
                    setProgressMessage(`Generating segment ${i + 1}/${generationTasks.length} for ${task.speaker.name}...`);
                    
                    // Generate speech for the chunk. The inner try/catch was removed to prevent skipping.
                    // If a chunk fails after retries, the entire process will stop and show an error.
                    const base64Audio = await geminiService.generateSpeech(task.dialogue, task.speaker.voice);
                    audioSegments.push(decodeBase64(base64Audio));
                }

                if (audioSegments.length === 0) {
                    throw new Error("All audio segments failed to generate. Please check your script and try again.");
                }

                // 3. Merge audio segments
                setProgressMessage("Finalizing podcast audio...");
                const totalLength = audioSegments.reduce((sum, s) => sum + s.length, 0);
                const mergedPcm = new Uint8Array(totalLength);
                let offset = 0;
                for (const segment of audioSegments) {
                    mergedPcm.set(segment, offset);
                    offset += segment.length;
                }

                const wavBlob = createWavBlob(mergedPcm);
                finalAudioUrl = URL.createObjectURL(wavBlob);
                projectTitle = `Podcast: ${text.substring(0, 40)}...`;

            } else { // Single voice mode
                setProgressMessage("Generating speech...");
                const base64Audio = await geminiService.generateSpeech(text, selectedVoice);
                const pcmData = decodeBase64(base64Audio);
                const wavBlob = createWavBlob(pcmData);
                finalAudioUrl = URL.createObjectURL(wavBlob);
                projectTitle = `Speech: ${text.substring(0, 40)}...`;
            }
            
            setAudioUrl(finalAudioUrl);

            const projectData: TextToSpeechProjectData = {
                mode,
                text,
                voice: mode === 'single' ? selectedVoice : undefined,
                speakers: mode === 'podcast' ? speakers : undefined,
                generatedAudioUrl: finalAudioUrl,
            };
            const newProject: TextToSpeechProject = {
                id: projectToLoad?.id || `proj_${Date.now()}`,
                type: AppView.AI_TTS,
                title: projectTitle,
                createdAt: projectToLoad?.createdAt || Date.now(),
                updatedAt: Date.now(),
                data: projectData,
            };
            onProjectCreated(newProject);
        } catch (e: any) {
            console.error("Speech Generation Error:", e);
            setError(e.message || "Sorry, an error occurred while generating speech.");
        } finally {
            setIsLoading(false);
            setProgressMessage(null);
        }
    }, [text, selectedVoice, isLoading, audioUrl, onProjectCreated, projectToLoad, mode, speakers]);

    const buttonText = mode === 'podcast' ? 'Generate Podcast' : 'Generate Speech';
    const isGenerateDisabled = isLoading || !text.trim() || (mode === 'podcast' && speakers.length < 2);

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold">AI Text to Speech</h2>
                <p className="text-lg text-text-secondary">Bring your text to life with single or multiple AI voices.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
                {/* Input Panel */}
                <div className="flex flex-col gap-6 panel p-6">
                    <div className="flex bg-bg-color p-1 rounded-xl">
                        <TabButton active={mode === 'single'} onClick={() => setMode('single')}>
                            Single Voice
                        </TabButton>
                        <TabButton active={mode === 'podcast'} onClick={() => setMode('podcast')}>
                            Create Podcast
                        </TabButton>
                    </div>

                    {mode === 'single' ? (
                        <div className="animate-fadeInUp space-y-6">
                            <div>
                                <label htmlFor="tts-text-single" className="block text-lg font-semibold mb-2 text-white">Your Text</label>
                                <textarea
                                    id="tts-text-single"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Type or paste the text you want to convert to speech here..."
                                    rows={8}
                                    className="input-styled text-lg resize-y"
                                />
                            </div>
                            <div>
                                <label className="block text-lg font-semibold mb-3 text-white">Choose a Voice</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2">
                                    {TTS_VOICE_OPTIONS.map(voice => (
                                        <button
                                            key={voice.name}
                                            onClick={() => setSelectedVoice(voice.name)}
                                            className={`py-3 px-2 rounded-lg text-center transition-colors border-2 ${
                                                selectedVoice === voice.name
                                                    ? 'bg-white border-white text-black font-semibold'
                                                    : 'bg-panel-bg border-border-color hover:border-white'
                                            }`}
                                        >
                                            {voice.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fadeInUp space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Podcast Speakers</h3>
                                <p className="text-sm text-text-secondary mb-3">Define your speakers. Their names must match the names used in your script.</p>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                    {speakers.map((speaker, index) => (
                                        <div key={speaker.id} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={speaker.name}
                                                onChange={(e) => handleSpeakerChange(speaker.id, 'name', e.target.value)}
                                                placeholder={`Speaker ${index + 1}`}
                                                className="input-styled w-1/3"
                                                aria-label={`Speaker ${index + 1} name`}
                                            />
                                            <select
                                                value={speaker.voice}
                                                onChange={(e) => handleSpeakerChange(speaker.id, 'voice', e.target.value)}
                                                className="input-styled flex-1"
                                                aria-label={`Speaker ${index + 1} voice`}
                                            >
                                                {TTS_VOICE_OPTIONS.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                                            </select>
                                            <button onClick={() => handlePreviewVoice(speaker.voice)} disabled={!!previewingVoice} className="p-2 text-text-secondary hover:text-white" aria-label={`Preview ${speaker.voice}`}>
                                                {previewingVoice === speaker.voice ? <LoadingSpinner className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                                            </button>
                                            <button onClick={() => handleRemoveSpeaker(speaker.id)} className="p-2 text-text-secondary hover:text-white" aria-label={`Remove ${speaker.name}`}>
                                                <XIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleAddSpeaker} className="btn btn-secondary text-sm mt-3">+ Add Speaker</button>
                            </div>
                            <div>
                                <label htmlFor="tts-text-podcast" className="block text-lg font-semibold mb-2 text-white">Podcast Script</label>
                                <textarea
                                    id="tts-text-podcast"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Write your script here..."
                                    rows={8}
                                    className="input-styled text-lg resize-y"
                                />
                                <div className="text-xs text-text-secondary mt-2 p-3 bg-bg-color rounded-lg">
                                    <p className="font-bold">💡 How to write your podcast script:</p>
                                    <p>Start each line with the speaker's name followed by a colon. Ensure the names exactly match the speakers you defined above.</p>
                                    <p className="font-mono mt-1 text-text-primary">{speakers[0]?.name || 'Speaker 1'}: Hello everyone, I’m happy to be here today.
                                    <br/>{speakers[1]?.name || 'Speaker 2'}: Great to have you! Let’s dive into today’s topic.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerateDisabled}
                        className="w-full mt-auto btn btn-primary text-lg py-4"
                    >
                        {isLoading ? <><LoadingSpinner className="mr-2"/> {progressMessage || 'Generating...'}</> : buttonText}
                    </button>
                </div>

                {/* Output Panel */}
                <div className="panel p-6 flex flex-col items-center justify-center gap-4">
                    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-bg-color rounded-lg border-2 border-dashed border-border-color p-4">
                        {isLoading ? (
                            <div className="text-center">
                                <LoadingSpinner className="h-12 w-12 mx-auto mb-4"/>
                                <p className="text-text-secondary text-lg">{progressMessage || 'Generating audio...'}</p>
                            </div>
                        ) : error ? (
                            <div className="text-center" style={{ color: 'var(--warning-accent)'}}>
                                <p className="font-bold">Generation Failed</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : audioUrl ? (
                            <div className="flex flex-col items-center justify-center w-full gap-4">
                                <SpeakerIcon className="h-20 w-20 text-text-secondary opacity-50"/>
                                <audio ref={audioRef} src={audioUrl} controls className="w-full" />
                            </div>
                        ) : (
                            <div className="text-center text-text-secondary opacity-50 px-4">
                               <SpeakerIcon className="h-20 w-20 mx-auto mb-4"/>
                               <p>Your generated audio will appear here.</p>
                            </div>
                        )}
                    </div>
                     {audioUrl && !isLoading && (
                        <a
                            href={audioUrl}
                            download="vic-gpt-speech.wav"
                            className="w-full btn btn-secondary text-lg"
                        >
                            <DownloadIcon className="h-5 w-5 mr-2" />
                            Download Audio
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AITextToSpeech;