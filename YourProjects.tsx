// FIX: Import VideoGenerationProject type
import React, { useState } from 'react';
import { AnyProject, AppView, StoryboardProject, ImageGenerationProject, ImageToPromptProject, TranscriptionProject, TextToSpeechProject, StoryboardStep, SoundEffectGenerationProject, VideoGenerationProject, YouTubeTranscriptionProject, AISplitPausesProject } from '../types';
import { FolderIcon } from './icons/FolderIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';
import { ImageUpIcon } from './icons/ImageUpIcon';
import { WaveformIcon } from './icons/WaveformIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { SoundwaveIcon } from './icons/SoundwaveIcon';
import { VideoIcon } from './icons/VideoIcon';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { ScissorsIcon } from './icons/ScissorsIcon';

interface Props {
    projects: AnyProject[];
    onLoadProject: (project: AnyProject) => void;
    onDeleteProject: (projectId: string) => void;
}

const ProjectTypeDisplay: React.FC<{ type: AppView }> = ({ type }) => {
    switch (type) {
        case AppView.STORYBOARD:
            return <><SparklesIcon className="w-4 h-4" /> Storyboard</>;
        case AppView.IMAGE_GENERATION:
            return <><ImageIcon className="w-4 h-4" /> Image Gen</>;
        case AppView.IMAGE_TO_PROMPT:
            return <><ImageUpIcon className="w-4 h-4" /> Image to Prompt</>;
        case AppView.AI_TRANSCRIPTION:
            return <><WaveformIcon className="w-4 h-4" /> Transcription</>;
        case AppView.AI_TTS:
            return <><SpeakerIcon className="w-4 h-4" /> Text to Speech</>;
        case AppView.AI_SOUND_EFFECT_GENERATION:
            return <><SoundwaveIcon className="w-4 h-4" /> Sound Effect</>;
        case AppView.AI_VIDEO_GENERATION:
            return <><VideoIcon className="w-4 h-4" /> Video Gen</>;
        case AppView.YOUTUBE_TRANSCRIPTION:
            return <><YoutubeIcon className="w-4 h-4" /> YouTube Transcript</>;
        case AppView.AI_SPLIT_PAUSES:
            return <><ScissorsIcon className="w-4 h-4" /> Split Pauses</>;
        default:
            return null;
    }
};

interface ProjectCardProps {
    project: AnyProject;
    onLoad: () => void;
    onDelete: () => void;
    isConfirmingDelete: boolean;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
}


const ProjectCard: React.FC<ProjectCardProps> = ({ project, onLoad, onDelete, isConfirmingDelete, onConfirmDelete, onCancelDelete }) => {
    
    const renderPreview = () => {
        switch (project.type) {
            case AppView.IMAGE_GENERATION:
                const imgData = project.data as ImageGenerationProject['data'];
                return imgData.generatedImageUrl ? (
                    <img src={imgData.generatedImageUrl} alt={project.title} className="w-full h-full object-cover" />
                ) : <div className="flex items-center justify-center h-full bg-bg-color"><ImageIcon className="w-10 h-10 text-text-secondary opacity-30" /></div>;
            case AppView.IMAGE_TO_PROMPT:
                const i2pData = project.data as ImageToPromptProject['data'];
                return i2pData.sourceImageUrl ? (
                     <img src={i2pData.sourceImageUrl} alt={project.title} className="w-full h-full object-cover" />
                ) : <div className="flex items-center justify-center h-full bg-bg-color"><ImageUpIcon className="w-10 h-10 text-text-secondary opacity-30" /></div>;
            case AppView.AI_SOUND_EFFECT_GENERATION:
                 return <div className="flex items-center justify-center h-full bg-bg-color"><SoundwaveIcon className="w-10 h-10 text-text-secondary opacity-30" /></div>;
            case AppView.AI_VIDEO_GENERATION:
                 return <div className="flex items-center justify-center h-full bg-bg-color"><VideoIcon className="w-10 h-10 text-text-secondary opacity-30" /></div>;
             case AppView.YOUTUBE_TRANSCRIPTION:
                 return <div className="flex items-center justify-center h-full bg-bg-color"><YoutubeIcon className="w-10 h-10 text-text-secondary opacity-30" /></div>;
            case AppView.AI_SPLIT_PAUSES:
                return <div className="flex items-center justify-center h-full bg-bg-color"><ScissorsIcon className="w-10 h-10 text-text-secondary opacity-30" /></div>;
            default:
                 return <div className="flex items-center justify-center h-full bg-bg-color"><FolderIcon className="w-10 h-10 text-text-secondary opacity-30" /></div>;
        }
    };

    const renderDetails = () => {
         switch (project.type) {
            case AppView.STORYBOARD:
                const sbData = project.data as StoryboardProject['data'];
                const stepName = StoryboardStep[sbData.step] || 'Unknown';
                return <p className="text-sm text-text-secondary">Current step: <span className="font-semibold text-text-primary">{stepName}</span></p>
            case AppView.IMAGE_TO_PROMPT:
                 const i2pData = project.data as ImageToPromptProject['data'];
                 return <p className="text-sm text-text-secondary truncate italic">"{i2pData.generatedPrompt?.substring(0, 50)}..."</p>
            case AppView.AI_TRANSCRIPTION:
                 const transData = project.data as TranscriptionProject['data'];
                 return <p className="text-sm text-text-secondary truncate italic">"{transData.transcript?.substring(0, 50)}..."</p>
             case AppView.AI_TTS:
                 const ttsData = project.data as TextToSpeechProject['data'];
                 return <p className="text-sm text-text-secondary truncate italic">"{ttsData.text?.substring(0, 50)}..."</p>
             case AppView.AI_SOUND_EFFECT_GENERATION:
                const sfxData = project.data as SoundEffectGenerationProject['data'];
                return <p className="text-sm text-text-secondary">Duration: {sfxData.duration}s</p>;
            case AppView.AI_VIDEO_GENERATION:
                const vidData = project.data as VideoGenerationProject['data'];
                return <p className="text-sm text-text-secondary">{vidData.resolution} | {vidData.aspectRatio}</p>;
             case AppView.YOUTUBE_TRANSCRIPTION:
                const ytData = project.data as YouTubeTranscriptionProject['data'];
                return <p className="text-sm text-text-secondary truncate italic">"{ytData.transcript?.substring(0, 50)}..."</p>;
            case AppView.AI_SPLIT_PAUSES:
                const pauseData = project.data as AISplitPausesProject['data'];
                return <p className="text-sm text-text-secondary">{pauseData.pauses.length} pauses detected</p>;
            default:
                return <p className="text-sm text-text-secondary italic">Last updated: {new Date(project.updatedAt).toLocaleDateString()}</p>;
        }
    };

    return (
        <div className="panel panel-hover flex flex-col overflow-hidden group" onClick={onLoad}>
            <div className="aspect-video relative overflow-hidden bg-bg-color">
                {renderPreview()}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-white mb-1 leading-tight flex-1">{project.title}</h3>
                    <div className="text-xs font-mono uppercase bg-bg-color text-text-secondary px-2 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap">
                       <ProjectTypeDisplay type={project.type} />
                    </div>
                </div>
                <div className="text-text-secondary text-xs mb-3">
                    {new Date(project.updatedAt).toLocaleString()}
                </div>
                <div className="flex-grow">
                    {renderDetails()}
                </div>
                <div className="mt-4 pt-4 border-t border-border-color flex items-center justify-center gap-2 min-h-[56px]">
                     {isConfirmingDelete ? (
                        <div className="w-full text-center animate-fadeIn">
                            <p className="text-sm font-semibold text-white mb-2">Delete this project?</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onConfirmDelete(); }}
                                    className="flex-1 btn text-sm text-white" style={{ backgroundColor: 'var(--warning-accent)'}}>
                                    Delete
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCancelDelete(); }}
                                    className="flex-1 btn btn-secondary text-sm">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onLoad(); }}
                                className="flex-1 btn btn-primary text-sm">
                                Continue
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 111, 97, 0.2)'}}>
                                <TrashIcon className="w-5 h-5" style={{ color: 'var(--warning-accent)'}}/>
                            </button>
                        </>
                    )}
                </div>
            </div>
             {isConfirmingDelete && <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>}
        </div>
    );
};


const YourProjects: React.FC<Props> = ({ projects, onLoadProject, onDeleteProject }) => {
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary p-8 overflow-y-auto">
            <header className="mb-8">
                <h2 className="text-3xl font-bold">Your Projects</h2>
                <p className="text-lg text-text-secondary">Continue your work or review your past creations.</p>
            </header>

            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.map(project => (
                        <ProjectCard 
                            key={project.id}
                            project={project}
                            onLoad={() => {
                                if (confirmDeleteId) return; // Prevent loading if another confirmation is active
                                onLoadProject(project);
                            }}
                            onDelete={() => setConfirmDeleteId(project.id)}
                            isConfirmingDelete={confirmDeleteId === project.id}
                            onConfirmDelete={() => {
                                onDeleteProject(project.id);
                                setConfirmDeleteId(null);
                            }}
                            onCancelDelete={() => setConfirmDeleteId(null)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center panel border-2 border-dashed">
                    <FolderIcon className="w-16 h-16 text-text-secondary opacity-30 mb-4" />
                    <h3 className="text-2xl font-bold">No Projects Yet</h3>
                    <p className="text-text-secondary mt-2 max-w-sm">
                        Start creating a storyboard, generating an image, or transcribing a file, and your work will automatically be saved here.
                    </p>
                </div>
            )}
        </div>
    );
};

export default YourProjects;