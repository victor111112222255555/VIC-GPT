




export enum AppView {
    CHAT = 'chat',
    STORYBOARD = 'storyboard',
    IMAGE_GENERATION = 'image_generation',
    IMAGE_TO_PROMPT = 'image_to_prompt',
    AI_TRANSCRIPTION = 'ai_transcription',
    AI_TTS = 'ai_tts',
    AI_SOUND_EFFECT_GENERATION = 'ai_sound_effect_generation',
    PROJECTS = 'projects',
    AI_VIDEO_GENERATION = 'ai_video_generation',
    YOUTUBE_TRANSCRIPTION = 'youtube_transcription',
    AI_SPLIT_PAUSES = 'ai_split_pauses',
}

export enum StoryboardStep {
    CONTEXT = 1,
    IDEAS = 2,
    LENGTH = 3,
    SCRIPT_STYLE = 4,
    SCRIPT = 5,
    SCENE_OPTIONS = 6,
    STORYBOARD = 7,
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

export interface ChatSession {
    id:string;
    title: string;
    messages: ChatMessage[];
}

export interface StoryIdea {
    title: string;
    description: string;
}

export interface StoryboardSegment {
    script_part: string;
    image_prompt: string;
    imageUrl?: string;
    isGenerating?: boolean;
    isGeneratingPrompt?: boolean;
    aspectRatio?: AspectRatio;
}

export interface ScriptStyle {
    mode: 'narrator' | 'dialogue' | 'mixed';
    narratorPercentage: number;
}

export type AspectRatio = 'SQUARE' | 'PORTRAIT' | 'LANDSCAPE';

export type VideoResolution = '1080p' | '720p';
export type VideoAspectRatio = '16:9' | '9:16';

export type ImageStyle =
  | 'Photorealistic'
  | 'Anime'
  | 'Cinematic'
  | '3D Render'
  | 'Pixel Art'
  | 'Fantasy Art'
  | 'Cyberpunk'
  | 'Minimalist'
  | 'Watercolor'
  | 'Comic Book'
  | 'Abstract'
  | 'Impressionism'
  | 'Line Art'
  | 'Low Poly'
  | 'Steampunk'
  | 'Vaporwave';


// --- Project Types ---

export interface ProjectBase {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export interface StoryboardProjectData {
    step: StoryboardStep;
    context: string;
    ideas: StoryIdea[];
    selectedIdea: StoryIdea | null;
    scriptLength: string;
    scriptStyle: ScriptStyle | null;
    generatedScript: string;
    segments: StoryboardSegment[];
    creationMode: 'idea' | 'script' | 'transcript';
    transcriptReferences: string[];
    transcriptScriptStyle: 'exact' | 'reimagine';
}

export interface StoryboardProject extends ProjectBase {
    type: AppView.STORYBOARD;
    data: StoryboardProjectData;
}

export interface ImageGenerationProjectData {
    prompt: string;
    generatedImageUrl: string | null;
    aspectRatio: AspectRatio;
    style: ImageStyle | null;
    referenceImageUrl?: string;
}

export interface ImageGenerationProject extends ProjectBase {
    type: AppView.IMAGE_GENERATION;
    data: ImageGenerationProjectData;
}

export interface ImageToPromptProjectData {
    sourceImageUrl: string | null;
    generatedPrompt: string | null;
}

export interface ImageToPromptProject extends ProjectBase {
    type: AppView.IMAGE_TO_PROMPT;
    data: ImageToPromptProjectData;
}

export interface TranscriptionProjectData {
    mediaFileName: string;
    mediaType: string;
    transcript: string | null;
    mediaPreviewUrl?: string;
}

export interface TranscriptionProject extends ProjectBase {
    type: AppView.AI_TRANSCRIPTION;
    data: TranscriptionProjectData;
}

export interface Speaker {
    id: string;
    name: string;
    voice: string;
}

export interface TextToSpeechProjectData {
    mode: 'single' | 'podcast';
    text: string;
    voice?: string;
    speakers?: Speaker[];
    generatedAudioUrl: string | null;
}

export interface TextToSpeechProject extends ProjectBase {
    type: AppView.AI_TTS;
    data: TextToSpeechProjectData;
}

export interface SoundEffectGenerationProjectData {
    prompt: string;
    duration: number;
    generatedAudioUrl: string | null;
}

export interface SoundEffectGenerationProject extends ProjectBase {
    type: AppView.AI_SOUND_EFFECT_GENERATION;
    data: SoundEffectGenerationProjectData;
}

export interface VideoGenerationProjectData {
    prompt: string;
    videoUrl: string | null;
    resolution: VideoResolution;
    aspectRatio: VideoAspectRatio;
}

export interface VideoGenerationProject extends ProjectBase {
    type: AppView.AI_VIDEO_GENERATION;
    data: VideoGenerationProjectData;
}

export interface YouTubeTranscriptionProjectData {
    youtubeUrl: string;
    videoTitle: string;
    transcript: string | null;
}

export interface YouTubeTranscriptionProject extends ProjectBase {
    type: AppView.YOUTUBE_TRANSCRIPTION;
    data: YouTubeTranscriptionProjectData;
}

export interface PauseTimestamp {
    start: number;
    end: number;
}

export interface PauseSegment extends PauseTimestamp {
    id: string;
    toBeRemoved: boolean;
}

export interface AISplitPausesProjectData {
    mediaFileName: string;
    mediaType: string;
    mediaUrl: string | null;
    pauses: PauseSegment[];
    minPauseDuration: number;
}

export interface AISplitPausesProject extends ProjectBase {
    type: AppView.AI_SPLIT_PAUSES;
    data: AISplitPausesProjectData;
}


export type AnyProject =
    | StoryboardProject
    | ImageGenerationProject
    | ImageToPromptProject
    | TranscriptionProject
    | TextToSpeechProject
    | SoundEffectGenerationProject
    | VideoGenerationProject
    | YouTubeTranscriptionProject
    | AISplitPausesProject;
