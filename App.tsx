
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppView, StoryboardStep, StoryIdea, StoryboardSegment, AspectRatio, ScriptStyle, AnyProject, StoryboardProject, StoryboardProjectData, ImageGenerationProject, ImageGenerationProjectData, ImageToPromptProject, ImageToPromptProjectData, TranscriptionProject, TranscriptionProjectData, TextToSpeechProject, VideoGenerationProject, YouTubeTranscriptionProject, AISplitPausesProject } from './types';
import VicGptChat from './components/VicGptChat';
import Step1_ContentContext from './components/content_storyboard/Step1_ContentContext';
import Step2_StoryIdeas from './components/content_storyboard/Step2_StoryIdeas';
import Step3_ScriptLength from './components/content_storyboard/Step3_ScriptLength';
import Step4_ScriptStyle from './components/content_storyboard/Step4_ScriptStyle';
import Step4_ScriptDisplay from './components/content_storyboard/Step4_ScriptDisplay';
import Step5_SceneOptions from './components/content_storyboard/Step5_SceneOptions';
import Step5_ImageStoryboard from './components/content_storyboard/Step5_ImageStoryboard';
import ImageGenerator from './components/ImageGenerator';
import ImageToPrompt from './components/ImageToPrompt';
import AITranscription from './components/AITranscription';
import AITextToSpeech from './components/AITextToSpeech';
import AIVideoGenerator from './components/AIVideoGenerator';
import YouTubeTranscription from './components/YouTubeTranscription';
import AISplitPauses from './components/AISplitPauses';
import YourProjects from './components/YourProjects';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { ImageUpIcon } from './components/icons/ImageUpIcon';
import { WaveformIcon } from './components/icons/WaveformIcon';
import { SpeakerIcon } from './components/icons/SpeakerIcon';
import { FolderIcon } from './components/icons/FolderIcon';
import { VideoIcon } from './components/icons/VideoIcon';
import { YoutubeIcon } from './components/icons/YoutubeIcon';
import { ScissorsIcon } from './components/icons/ScissorsIcon';
import * as geminiService from './services/geminiService';
import GoogleLoginScreen from './components/GoogleLoginScreen';
import PasscodeLockScreen from './components/PasscodeLockScreen';
import { InstallIcon } from './components/icons/InstallIcon';
import InstallHelpModal from './components/InstallHelpModal';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { LogOutIcon } from './components/icons/LogOutIcon';
import WelcomeScreen from './components/WelcomeScreen';
import { ChatIcon } from './components/icons/ChatIcon';


const PROJECTS_KEY = 'vic-gpt-projects';
const useGoogleLogin = !!process.env.GOOGLE_CLIENT_ID;

const initialStoryboardData: StoryboardProjectData = {
    step: StoryboardStep.CONTEXT,
    context: '',
    ideas: [],
    selectedIdea: null,
    scriptLength: '',
    scriptStyle: null,
    generatedScript: '',
    segments: [],
    creationMode: 'idea',
    transcriptReferences: [],
    transcriptScriptStyle: 'exact',
};

interface UserProfile {
    name: string;
    picture: string;
}

const Logo: React.FC = () => (
    <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[--primary-accent] to-[--secondary-accent]" style={{ boxShadow: 'var(--shadow-glow-sm)' }}>
             <span className="font-logo font-bold text-xl text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>V</span>
        </div>
        <h1 className="text-2xl font-logo font-bold text-text-primary tracking-widest uppercase">VIC-GPT</h1>
    </div>
);


const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [currentView, setCurrentView] = useState<AppView>(AppView.CHAT);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Project state
    const [projects, setProjects] = useState<AnyProject[]>([]);
    const [activeStoryboard, setActiveStoryboard] = useState<StoryboardProject | null>(null);
    const [loadedProject, setLoadedProject] = useState<AnyProject | null>(null);
    const debounceTimeout = useRef<number | null>(null);
    
    // PWA install prompt state
    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
    const [showInstallHelp, setShowInstallHelp] = useState(false);
    const [showWelcome, setShowWelcome] = useState<boolean>(false);

    useEffect(() => {
        const welcomeSeen = localStorage.getItem('vic-gpt-welcome-seen');
        if (!welcomeSeen) {
            setShowWelcome(true);
        }

        // Check for persisted login
        if (useGoogleLogin) {
            const storedUser = localStorage.getItem('vic-gpt-user');
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                } catch (e) {
                    console.error("Failed to parse user from localStorage", e);
                    localStorage.removeItem('vic-gpt-user');
                }
            }
        } else {
            // If not using Google Login, check for passcode auth persistence
            if (localStorage.getItem('vic-gpt-passcode-auth') === 'true') {
                setIsAuthenticated(true);
            }
        }

        const savedProjectsRaw = localStorage.getItem(PROJECTS_KEY);
        if (savedProjectsRaw) {
            try {
                const savedProjects = JSON.parse(savedProjectsRaw);
                if (Array.isArray(savedProjects)) {
                    setProjects(savedProjects);
                }
            } catch (e) {
                console.error("Failed to parse projects from localStorage", e);
                setProjects([]);
            }
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPromptEvent(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const upsertProject = useCallback((project: AnyProject) => {
        setProjects(prevProjects => {
            const existingIndex = prevProjects.findIndex(p => p.id === project.id);
            let newProjects;
            if (existingIndex > -1) {
                newProjects = [...prevProjects];
                newProjects[existingIndex] = project;
            } else {
                newProjects = [project, ...prevProjects];
            }
            // Sort by most recently updated
            newProjects.sort((a, b) => b.updatedAt - a.updatedAt);
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(newProjects));
            return newProjects;
        });
    }, []);
    
    // Debounced saving for active storyboard
    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        if (activeStoryboard && (activeStoryboard.data.context || activeStoryboard.data.generatedScript)) { // Only save if not pristine
            debounceTimeout.current = window.setTimeout(() => {
                upsertProject(activeStoryboard);
            }, 1500);
        }
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [activeStoryboard, upsertProject]);

    const handleLoadProject = useCallback((project: AnyProject) => {
        setLoadedProject(project);
        if (project.type === AppView.STORYBOARD) {
            setActiveStoryboard(project as StoryboardProject);
        }
        setCurrentView(project.type);
    }, []);

    const handleDeleteProject = useCallback((projectId: string) => {
        setProjects(prev => {
            const newProjects = prev.filter(p => p.id !== projectId);
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(newProjects));
            return newProjects;
        });
        // If the deleted project was being viewed, clear it
        if (loadedProject?.id === projectId) setLoadedProject(null);
        if (activeStoryboard?.id === projectId) setActiveStoryboard(null);

    }, [loadedProject, activeStoryboard]);

    const handleInstallClick = async () => {
        if (installPromptEvent) {
            installPromptEvent.prompt();
            await installPromptEvent.userChoice;
            setInstallPromptEvent(null);
        } else {
            setShowInstallHelp(true);
        }
    };

    const handleAuthenticationSuccess = (credentialResponse: any) => {
        if (credentialResponse.credential) {
            const decoded = jwtDecode<JwtPayload & { name: string, picture: string }>(credentialResponse.credential);
            const userProfile = {
                name: decoded.name,
                picture: decoded.picture,
            };
            localStorage.setItem('vic-gpt-user', JSON.stringify(userProfile));
            setUser(userProfile);
            setIsAuthenticated(true);
        }
    };

    const handlePasscodeSuccess = () => {
        localStorage.setItem('vic-gpt-passcode-auth', 'true');
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('vic-gpt-user');
        localStorage.removeItem('vic-gpt-passcode-auth');
        setUser(null);
        setIsAuthenticated(false);
    };

    const handleWelcomeComplete = () => {
        localStorage.setItem('vic-gpt-welcome-seen', 'true');
        setShowWelcome(false);
    };

    const handleResetStoryboard = () => {
        const newProject: StoryboardProject = {
            id: `proj_${Date.now()}`,
            type: AppView.STORYBOARD,
            title: 'New Storyboard',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: { ...initialStoryboardData, transcriptReferences: [] }, // Ensure initial data is clean
        };
        setActiveStoryboard(newProject);
        setLoadedProject(newProject);
        setCurrentView(AppView.STORYBOARD);
    };

    const updateActiveStoryboard = (updater: (prev: StoryboardProject) => StoryboardProject) => {
        setActiveStoryboard(prev => prev ? updater(prev) : null);
    };
    
    const handleContextReady = useCallback(async (context: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const ideas = await geminiService.generateStoryIdeas(context);
            updateActiveStoryboard(p => ({
                ...p,
                title: context.substring(0, 40) || 'New Storyboard',
                updatedAt: Date.now(),
                data: { ...p.data, context, ideas, step: StoryboardStep.IDEAS, creationMode: 'idea', transcriptReferences: [] }
            }));
        } catch (e) {
            setError('Failed to generate story ideas. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleTranscriptsReady = useCallback(async (transcripts: string[], scriptStyle: 'exact' | 'reimagine') => {
        setIsLoading(true);
        setError(null);
        try {
            const ideas = await geminiService.generateStoryIdeasFromTranscripts(transcripts);
            updateActiveStoryboard(p => ({
                ...p,
                title: 'Ideas from Transcript References',
                updatedAt: Date.now(),
                data: { 
                    ...p.data, 
                    context: 'Style ideas based on reference transcripts.', 
                    ideas, 
                    transcriptReferences: transcripts, 
                    step: StoryboardStep.IDEAS, 
                    creationMode: 'transcript',
                    transcriptScriptStyle: scriptStyle
                }
            }));
        } catch (e) {
            setError('Failed to generate story ideas from transcripts. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleScriptReady = useCallback((script: string) => {
        updateActiveStoryboard(p => ({
            ...p,
            title: script.substring(0, 40) || 'Custom Script Storyboard',
            updatedAt: Date.now(),
            data: {
                ...initialStoryboardData, // Reset other fields
                context: "User provided a custom script.",
                generatedScript: script,
                step: StoryboardStep.SCENE_OPTIONS,
                creationMode: 'script',
            }
        }));
    }, []);


    const handleRegenerateIdeas = useCallback(async () => {
        if (!activeStoryboard) return;

        const { context, creationMode, transcriptReferences, ideas } = activeStoryboard.data;

        const canRegenerateFromTranscript = creationMode === 'transcript' && transcriptReferences && transcriptReferences.length > 0;
        const canRegenerateFromIdea = creationMode !== 'transcript' && context;

        if (!canRegenerateFromTranscript && !canRegenerateFromIdea) {
            console.error("Cannot regenerate: Not enough information.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            let newIdeas;
            if (canRegenerateFromTranscript) {
                 newIdeas = await geminiService.generateStoryIdeasFromTranscripts(transcriptReferences!, ideas);
            } else { // This implies canRegenerateFromIdea is true
                 newIdeas = await geminiService.generateStoryIdeas(context, ideas);
            }
            updateActiveStoryboard(p => ({ ...p, updatedAt: Date.now(), data: { ...p.data, ideas: newIdeas } }));
        } catch (e) {
            setError('Failed to regenerate story ideas. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [activeStoryboard]);

    const handleIdeaSelected = useCallback((idea: StoryIdea) => {
        updateActiveStoryboard(p => ({ ...p, updatedAt: Date.now(), title: idea.title, data: { ...p.data, selectedIdea: idea, step: StoryboardStep.LENGTH } }));
    }, []);

    const handleLengthSelected = useCallback((length: string) => {
        updateActiveStoryboard(p => ({ ...p, updatedAt: Date.now(), data: { ...p.data, scriptLength: length, step: StoryboardStep.SCRIPT_STYLE } }));
    }, []);

    const handleScriptStyleSelected = useCallback(async (style: ScriptStyle) => {
        if (!activeStoryboard?.data.selectedIdea || !activeStoryboard.data.context || !activeStoryboard.data.scriptLength) return;
        setIsLoading(true);
        setError(null);
        try {
            const script = await geminiService.generateScript(
                activeStoryboard.data.selectedIdea,
                activeStoryboard.data.scriptLength,
                activeStoryboard.data.context,
                style,
                activeStoryboard.data.creationMode === 'transcript' ? activeStoryboard.data.transcriptReferences : undefined,
                activeStoryboard.data.creationMode === 'transcript' ? activeStoryboard.data.transcriptScriptStyle : undefined
            );
            updateActiveStoryboard(p => ({ ...p, updatedAt: Date.now(), data: { ...p.data, scriptStyle: style, generatedScript: script, step: StoryboardStep.SCRIPT } }));
        } catch (e) {
            setError('Failed to generate the script. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [activeStoryboard]);
    
    const handleRegenerateScript = useCallback(async () => {
        if (!activeStoryboard?.data.selectedIdea || !activeStoryboard.data.context || !activeStoryboard.data.scriptLength || !activeStoryboard.data.scriptStyle) return;
        setIsLoading(true);
        setError(null);
        try {
            const script = await geminiService.generateScript(
                activeStoryboard.data.selectedIdea,
                activeStoryboard.data.scriptLength,
                activeStoryboard.data.context,
                activeStoryboard.data.scriptStyle,
                activeStoryboard.data.creationMode === 'transcript' ? activeStoryboard.data.transcriptReferences : undefined,
                activeStoryboard.data.creationMode === 'transcript' ? activeStoryboard.data.transcriptScriptStyle : undefined
            );
            updateActiveStoryboard(p => ({ ...p, updatedAt: Date.now(), data: { ...p.data, generatedScript: script } }));
        } catch (e) {
            setError('Failed to regenerate the script. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [activeStoryboard]);

    const handleScriptConfirmed = useCallback(() => {
        updateActiveStoryboard(p => ({ ...p, updatedAt: Date.now(), data: { ...p.data, step: StoryboardStep.SCENE_OPTIONS } }));
    }, []);
    
    const handleSceneOptionsConfirmed = useCallback(async (option: 'default' | 'custom' | 'manual', instructions: string, data?: number | string) => {
        if ((option === 'default' || option === 'custom') && !activeStoryboard?.data.generatedScript) return;
        if (option === 'manual' && (typeof data !== 'string' || !data.trim())) return;
    
        setIsLoading(true);
        setError(null);
        try {
            let segments: Pick<StoryboardSegment, 'script_part' | 'image_prompt'>[];
            if (option === 'manual') {
                const manualScript = data as string;
                const scriptParts = manualScript.split('[SPLIT]').map(s => s.trim()).filter(s => s);
                 if (scriptParts.length === 0) {
                    throw new Error("Manual split resulted in no scenes. Please add text and use the [SPLIT] marker.");
                }
                segments = await geminiService.generateImagePromptsForSegments(scriptParts, instructions);
            } else {
                segments = await geminiService.breakdownScriptForStoryboard(activeStoryboard.data.generatedScript, option as 'default' | 'custom', instructions, data as number | undefined);
            }
            const storyboardSegments: StoryboardSegment[] = segments.map(s => ({ ...s, imageUrl: '', isGenerating: false, isGeneratingPrompt: false, aspectRatio: 'SQUARE' as AspectRatio }));
            updateActiveStoryboard(p => ({ ...p, updatedAt: Date.now(), data: { ...p.data, segments: storyboardSegments, step: StoryboardStep.STORYBOARD } }));
        } catch (e) {
            setError('Failed to create storyboard. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [activeStoryboard]);
    
    const handleGenerateImage = useCallback(async (segmentIndex: number) => {
        if (!activeStoryboard) return;
        const segment = activeStoryboard.data.segments[segmentIndex];
        if (!segment) return;
        
        const updateSegment = (update: Partial<StoryboardSegment>) => {
            updateActiveStoryboard(p => {
                const newSegments = [...p.data.segments];
                newSegments[segmentIndex] = { ...newSegments[segmentIndex], ...update };
                return { ...p, updatedAt: Date.now(), data: { ...p.data, segments: newSegments } };
            });
        };

        updateSegment({ isGenerating: true });
        setError(null);

        try {
            const imageUrl = await geminiService.generateImage(segment.image_prompt, segment.aspectRatio);
            updateSegment({ imageUrl, isGenerating: false });
        } catch(e) {
            setError(`Failed to generate image for segment ${segmentIndex + 1}.`);
            console.error(e);
            updateSegment({ isGenerating: false });
        }
    }, [activeStoryboard]);

     const handleGenerateAllImages = useCallback(async () => {
        if (!activeStoryboard) return;

        const segmentsToGenerate = activeStoryboard.data.segments
            .map((segment, index) => ({ ...segment, originalIndex: index }))
            .filter(segment => !segment.imageUrl && !segment.isGenerating);

        if (segmentsToGenerate.length === 0) return;

        setError(null);

        // 1. Set all to loading state
        updateActiveStoryboard(p => {
            const newSegments = [...p.data.segments];
            segmentsToGenerate.forEach(segment => {
                newSegments[segment.originalIndex].isGenerating = true;
            });
            return { ...p, updatedAt: Date.now(), data: { ...p.data, segments: newSegments } };
        });

        // 2. Generate images
        const promises = segmentsToGenerate.map(segment => 
            geminiService.generateImage(segment.image_prompt, segment.aspectRatio)
                .then(imageUrl => ({ status: 'fulfilled' as const, value: imageUrl, index: segment.originalIndex }))
                .catch(error => ({ status: 'rejected' as const, reason: error, index: segment.originalIndex }))
        );
        
        const results = await Promise.all(promises);

        // 3. Update state with results
        let firstError: string | null = null;
        updateActiveStoryboard(p => {
            const newSegments = [...p.data.segments];
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    newSegments[result.index].imageUrl = result.value;
                    newSegments[result.index].isGenerating = false;
                } else {
                    console.error(`Failed to generate image for segment ${result.index + 1}:`, result.reason);
                    if (!firstError) {
                        firstError = `Failed to generate image for scene ${result.index + 1}. Some images may have failed.`;
                    }
                    newSegments[result.index].isGenerating = false;
                }
            });
            return { ...p, updatedAt: Date.now(), data: { ...p.data, segments: newSegments } };
        });
        if (firstError) {
            setError(firstError);
        }
    }, [activeStoryboard]);


    const handleRegenerateSegmentPrompt = useCallback(async (segmentIndex: number) => {
        if (!activeStoryboard) return;
        const segment = activeStoryboard.data.segments[segmentIndex];
        if (!segment) return;
        
        const updateSegment = (update: Partial<StoryboardSegment>) => {
            updateActiveStoryboard(p => {
                if (!p) return p;
                const newSegments = [...p.data.segments];
                newSegments[segmentIndex] = { ...newSegments[segmentIndex], ...update };
                return { ...p, updatedAt: Date.now(), data: { ...p.data, segments: newSegments } };
            });
        };
    
        updateSegment({ isGeneratingPrompt: true });
        setError(null);
    
        try {
            const newPrompt = await geminiService.regenerateImagePrompt(segment.script_part, segment.image_prompt);
            updateSegment({ image_prompt: newPrompt });
        } catch(e) {
            setError(`Failed to regenerate prompt for segment ${segmentIndex + 1}.`);
            console.error(e);
        } finally {
            updateSegment({ isGeneratingPrompt: false });
        }
    }, [activeStoryboard]);
    
    const handleUpdateSegmentPrompt = useCallback((index: number, newPrompt: string) => {
        updateActiveStoryboard(p => {
            const newSegments = [...p.data.segments];
            if (newSegments[index]) newSegments[index].image_prompt = newPrompt;
            return { ...p, data: { ...p.data, segments: newSegments } };
        });
    }, []);

    const handleUpdateSegmentAspectRatio = useCallback((index: number, newAspectRatio: AspectRatio) => {
        updateActiveStoryboard(p => {
            const newSegments = [...p.data.segments];
            if (newSegments[index]) newSegments[index].aspectRatio = newAspectRatio;
            return { ...p, data: { ...p.data, segments: newSegments } };
        });
    }, []);
    
    const changeView = (view: AppView) => {
        setCurrentView(view);
        setLoadedProject(null);
        if (view !== AppView.STORYBOARD) {
            setActiveStoryboard(null);
        }
    };

    const renderStoryboardStep = () => {
        if (!activeStoryboard) {
             return <div className="p-8 text-center">Please start a new storyboard or load one from your projects.</div>;
        }
        const { data } = activeStoryboard;

        switch (data.step) {
            case StoryboardStep.CONTEXT:
                return <Step1_ContentContext 
                            onContextReady={handleContextReady} 
                            onScriptReady={handleScriptReady}
                            onTranscriptsReady={handleTranscriptsReady}
                            isLoading={isLoading} 
                            initialContext={data.context}
                            initialScript={data.generatedScript}
                            initialTranscripts={data.transcriptReferences}
                        />;
            case StoryboardStep.IDEAS:
                return <Step2_StoryIdeas 
                            ideas={data.ideas} 
                            onSelect={handleIdeaSelected} 
                            onBack={() => updateActiveStoryboard(p => ({...p, data: {...p.data, step: StoryboardStep.CONTEXT}}))}
                            onRegenerate={handleRegenerateIdeas}
                            isLoading={isLoading}
                        />;
            case StoryboardStep.LENGTH:
                return <Step3_ScriptLength onSelect={handleLengthSelected} onBack={() => updateActiveStoryboard(p => ({...p, data: {...p.data, step: StoryboardStep.IDEAS}}))} />;
            case StoryboardStep.SCRIPT_STYLE:
                return <Step4_ScriptStyle onSelect={handleScriptStyleSelected} isLoading={isLoading} onBack={() => updateActiveStoryboard(p => ({...p, data: {...p.data, step: StoryboardStep.LENGTH}}))} />;
            case StoryboardStep.SCRIPT:
                const handleBackFromScriptDisplay = () => {
                    const prevStep = activeStoryboard.data.selectedIdea ? StoryboardStep.SCRIPT_STYLE : StoryboardStep.CONTEXT;
                    updateActiveStoryboard(p => ({ ...p, data: { ...p.data, step: prevStep }}));
                };
                return <Step4_ScriptDisplay 
                            script={data.generatedScript} 
                            onConfirm={handleScriptConfirmed} 
                            isLoading={isLoading} 
                            onBack={handleBackFromScriptDisplay}
                            onRegenerate={handleRegenerateScript}
                            showRegenerate={!!data.selectedIdea}
                        />;
            case StoryboardStep.SCENE_OPTIONS:
                return <Step5_SceneOptions 
                            script={data.generatedScript}
                            onConfirm={handleSceneOptionsConfirmed} 
                            isLoading={isLoading} 
                            onBack={() => updateActiveStoryboard(p => ({...p, data: {...p.data, step: StoryboardStep.SCRIPT}}))} 
                        />;
            case StoryboardStep.STORYBOARD:
                return <Step5_ImageStoryboard
                    segments={data.segments}
                    onGenerateImage={handleGenerateImage}
                    onGenerateAllImages={handleGenerateAllImages}
                    onRestart={handleResetStoryboard}
                    onUpdatePrompt={handleUpdateSegmentPrompt}
                    onUpdateAspectRatio={handleUpdateSegmentAspectRatio}
                    onRegeneratePrompt={handleRegenerateSegmentPrompt}
                    />;
            default:
                return <div>Invalid Step</div>;
        }
    };

    const renderCurrentView = () => {
        switch (currentView) {
            case AppView.CHAT:
                return <VicGptChat />;
            case AppView.IMAGE_GENERATION:
                return <ImageGenerator onProjectCreated={upsertProject} projectToLoad={loadedProject?.type === AppView.IMAGE_GENERATION ? loadedProject as ImageGenerationProject : undefined} />;
            case AppView.IMAGE_TO_PROMPT:
                return <ImageToPrompt onProjectCreated={upsertProject} projectToLoad={loadedProject?.type === AppView.IMAGE_TO_PROMPT ? loadedProject as ImageToPromptProject : undefined} />;
            case AppView.AI_TRANSCRIPTION:
                return <AITranscription onProjectCreated={upsertProject} projectToLoad={loadedProject?.type === AppView.AI_TRANSCRIPTION ? loadedProject as TranscriptionProject : undefined} />;
            case AppView.AI_TTS:
                return <AITextToSpeech onProjectCreated={upsertProject} projectToLoad={loadedProject?.type === AppView.AI_TTS ? (loadedProject as TextToSpeechProject) : undefined} />;
            case AppView.AI_VIDEO_GENERATION:
                return <AIVideoGenerator onProjectCreated={upsertProject} projectToLoad={loadedProject?.type === AppView.AI_VIDEO_GENERATION ? loadedProject as VideoGenerationProject : undefined} />;
            case AppView.YOUTUBE_TRANSCRIPTION:
                return <YouTubeTranscription onProjectCreated={upsertProject} projectToLoad={loadedProject?.type === AppView.YOUTUBE_TRANSCRIPTION ? loadedProject as YouTubeTranscriptionProject : undefined} />;
            case AppView.AI_SPLIT_PAUSES:
                return <AISplitPauses onProjectCreated={upsertProject} projectToLoad={loadedProject?.type === AppView.AI_SPLIT_PAUSES ? loadedProject as AISplitPausesProject : undefined} />;
            case AppView.PROJECTS:
                return <YourProjects projects={projects} onLoadProject={handleLoadProject} onDeleteProject={handleDeleteProject} />;
            case AppView.STORYBOARD:
                return (
                    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-color">
                        {renderStoryboardStep()}
                    </div>
                );
            default:
                return <VicGptChat />;
        }
    }

    return (
        <div className="relative h-screen w-screen overflow-hidden">
             {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}
             <div className={`flex h-screen font-body bg-bg-color text-text-primary transition-all duration-300 ${!isAuthenticated || showWelcome ? 'blur-sm brightness-50' : ''}`}>
                <nav className="w-72 bg-bg-color border-r border-border-color p-4 flex flex-col">
                    <div className="p-2 mb-8">
                        <Logo />
                    </div>
                    <ul className="space-y-2">
                        <li>
                            <button onClick={() => changeView(AppView.CHAT)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.CHAT ? 'nav-item-active' : ''}`}>
                                <ChatIcon className="w-5 h-5" /> Chat Assistant
                            </button>
                        </li>
                        <li>
                            <button onClick={() => changeView(AppView.PROJECTS)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.PROJECTS ? 'nav-item-active' : ''}`}>
                                <FolderIcon className="w-5 h-5" /> Your Projects
                            </button>
                        </li>
                        <li className="my-4 border-t border-border-color"></li>
                        <li className="px-4 py-2 text-xs uppercase tracking-widest text-text-secondary">AI Tools</li>
                        <li>
                            <button onClick={() => changeView(AppView.STORYBOARD)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.STORYBOARD ? 'nav-item-active' : ''}`}>
                                <SparklesIcon className="w-5 h-5"/> Content Storyboard
                            </button>
                        </li>
                        <li>
                            <button onClick={() => changeView(AppView.IMAGE_GENERATION)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.IMAGE_GENERATION ? 'nav-item-active' : ''}`}>
                                <ImageIcon className="w-5 h-5" /> Image Generator
                            </button>
                        </li>
                         <li>
                            <button onClick={() => changeView(AppView.AI_VIDEO_GENERATION)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.AI_VIDEO_GENERATION ? 'nav-item-active' : ''}`}>
                                <VideoIcon className="w-5 h-5" /> Video Generator
                            </button>
                        </li>
                        <li>
                            <button onClick={() => changeView(AppView.IMAGE_TO_PROMPT)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.IMAGE_TO_PROMPT ? 'nav-item-active' : ''}`}>
                                <ImageUpIcon className="w-5 h-5" /> Image to Prompt
                            </button>
                        </li>
                        <li>
                            <button onClick={() => changeView(AppView.AI_SPLIT_PAUSES)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.AI_SPLIT_PAUSES ? 'nav-item-active' : ''}`}>
                                <ScissorsIcon className="w-5 h-5" /> AI Split Pauses
                            </button>
                        </li>
                        <li>
                            <button onClick={() => changeView(AppView.YOUTUBE_TRANSCRIPTION)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.YOUTUBE_TRANSCRIPTION ? 'nav-item-active' : ''}`}>
                                <YoutubeIcon className="w-5 h-5" /> YouTube Transcriber
                            </button>
                        </li>
                         <li>
                            <button onClick={() => changeView(AppView.AI_TRANSCRIPTION)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.AI_TRANSCRIPTION ? 'nav-item-active' : ''}`}>
                                <WaveformIcon className="w-5 h-5" /> AI Transcription
                            </button>
                        </li>
                         <li>
                            <button onClick={() => changeView(AppView.AI_TTS)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 nav-item ${currentView === AppView.AI_TTS ? 'nav-item-active' : ''}`}>
                                <SpeakerIcon className="w-5 h-5" /> AI Text to Speech
                            </button>
                        </li>
                    </ul>
                    <div className="mt-auto space-y-4">
                         {isAuthenticated && (
                            <div className="flex items-center justify-between p-2 panel">
                                {user ? (
                                    <>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <img src={user.picture} alt="user avatar" className="w-8 h-8 rounded-full" />
                                            <span className="text-sm font-medium truncate text-text-primary">{user.name}</span>
                                        </div>
                                        <button onClick={handleLogout} className="p-1.5 text-text-secondary hover:text-white flex-shrink-0" aria-label="Log Out">
                                            <LogOutIcon className="w-5 h-5"/>
                                        </button>
                                    </>
                                ) : (
                                     <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-1 text-text-secondary hover:text-white" aria-label="Log Out">
                                        <LogOutIcon className="w-5 h-5"/>
                                        <span>Log Out</span>
                                    </button>
                                )}
                            </div>
                        )}
                         <button onClick={handleResetStoryboard} className="btn btn-secondary w-full py-3">
                            New Storyboard
                        </button>
                        <button 
                            onClick={handleInstallClick} 
                            className="w-full btn btn-primary py-3 gap-3"
                            aria-label="Install App"
                        >
                            <InstallIcon className="w-5 h-5"/> Install App
                        </button>
                    </div>
                </nav>
                <main className="flex-1 flex flex-col h-screen">
                    {error && <div className="p-3 text-center border-b flex justify-between items-center" style={{ backgroundColor: 'rgba(255, 111, 97, 0.2)', color: 'var(--warning-accent)', borderBottomColor: 'rgba(255, 111, 97, 0.3)'}}>{error} <button onClick={() => setError(null)} className="font-bold text-lg">×</button></div>}
                    {renderCurrentView()}
                </main>
            </div>
            {!isAuthenticated && (
                useGoogleLogin
                    ? <GoogleLoginScreen onSuccess={handleAuthenticationSuccess} />
                    : <PasscodeLockScreen onSuccess={handlePasscodeSuccess} />
            )}
            {showInstallHelp && (
                <InstallHelpModal onClose={() => setShowInstallHelp(false)} />
            )}
        </div>
    );
};

export default App;
