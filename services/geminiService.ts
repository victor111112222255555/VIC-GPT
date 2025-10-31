
import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { StoryIdea, StoryboardSegment, ChatMessage, AspectRatio, ImageStyle, ScriptStyle, VideoResolution, VideoAspectRatio, Speaker, PauseTimestamp } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000; // Start with a 2-second backoff

/**
 * A wrapper function to add retry logic with exponential backoff for API calls.
 * This will handle transient errors like rate limiting and server issues.
 * @param apiCall The async function that makes the API call.
 * @returns The result of the API call.
 * @throws Throws a user-friendly error if all retries fail.
 */
const withRetry = async <T>(apiCall: () => Promise<T>): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await apiCall();
        } catch (error: any) {
            lastError = error;
            const errorMessage = (error?.toString() || '').toLowerCase();

            // Check for retryable errors (rate limiting, server errors)
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');
            const isServerError = errorMessage.includes('500') || errorMessage.includes('unknown') || errorMessage.includes('unavailable');

            if (isRateLimitError || isServerError) {
                if (i === MAX_RETRIES - 1) { // Last retry failed
                    console.error("API call failed after multiple retries:", lastError);
                    if (isRateLimitError) {
                        throw new Error("The AI is currently busy due to high demand. Please wait a moment and try again.");
                    }
                    throw new Error("An unexpected server error occurred. Please try again later.");
                }

                // Calculate backoff time with jitter
                const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, i) + Math.random() * 1000;
                console.log(`API call failed (Attempt ${i + 1}/${MAX_RETRIES}). Retrying in ${Math.round(backoffTime / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            } else {
                // Not a retryable error, throw it immediately.
                console.error("Non-retryable API error:", error);
                throw new Error("An unexpected error occurred. Please check the console for details.");
            }
        }
    }
    // This part should be unreachable if the loop completes, but is here for type safety.
    throw lastError;
};


const mapMessagesToGeminiHistory = (messages: ChatMessage[]) => {
    // Filter out empty placeholder messages and the initial AI prompt before sending to the API
    return messages
        .filter(msg => msg.text.trim() !== '' && msg.id !== 'initial_ai_message')
        .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));
};

export const streamChatResponse = async (prompt: string, history: ChatMessage[]) => {
    return withRetry(async () => {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are VIC-GPT, a helpful and friendly AI assistant. Keep your responses concise and informative.",
            },
            history: mapMessagesToGeminiHistory(history)
        });
        const result = await chat.sendMessageStream({ message: prompt });
        return result;
    });
};


// Helper to parse JSON from AI response
const parseJsonFromResponse = <T>(text: string): T => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
        jsonStr = match[1].trim();
    }
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", e);
        console.error("Original text:", text);
        // Throwing an error here allows withRetry to catch it and potentially retry the call
        throw new Error("Invalid JSON response from the AI. The format was not as expected.");
    }
};

export const generateStoryIdeas = async (context: string, existingIdeas: StoryIdea[] = []): Promise<StoryIdea[]> => {
    let exclusionPrompt = '';
    if (existingIdeas.length > 0) {
        const ideasToExclude = existingIdeas.map(idea => `- Title: "${idea.title}", Description: "${idea.description}"`).join('\n');
        exclusionPrompt = `
**IMPORTANT**: You MUST generate completely new and distinct ideas. Do NOT repeat or create variations of the following ideas that have already been shown:
${ideasToExclude}
`;
    }
    
    const prompt = `Based on the following context for a content creator: "${context}".
Generate 10 unique and compelling story ideas. Each idea must have a "title" and a "description".
${exclusionPrompt}
**IMPORTANT**: Your response MUST be a valid JSON array of objects. Do not include any text, markdown, or explanations outside of the JSON array. Each object in the array must contain only the keys "title" and "description".

Example format:
[
  {
    "title": "Example Title 1",
    "description": "Example description 1."
  },
  {
    "title": "Example Title 2",
    "description": "Example description 2."
  }
]`;
    
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        return parseJsonFromResponse<StoryIdea[]>(response.text);
    });
};

export const generateStoryIdeasFromTranscripts = async (transcripts: string[], existingIdeas: StoryIdea[] = []): Promise<StoryIdea[]> => {
    let exclusionPrompt = '';
    if (existingIdeas.length > 0) {
        const ideasToExclude = existingIdeas.map(idea => `- Title: "${idea.title}", Description: "${idea.description}"`).join('\n');
        exclusionPrompt = `
**IMPORTANT**: You MUST generate completely new and distinct ideas. Do NOT repeat or create variations of the following ideas that have already been shown:
${ideasToExclude}
`;
    }

    const referenceTranscripts = transcripts.filter(t => t.trim() !== '').map((t, i) => `--- TRANSCRIPT REFERENCE ${i + 1} ---\n${t}`).join('\n\n');

    const prompt = `You are a viral content strategist and expert in thematic analysis. Your task is to analyze reference video transcripts to understand their core components and then generate new, related video ideas that would appeal to the same audience.

**Step 1: Deep Analysis**
First, deeply analyze the following reference transcript(s). Identify the key elements that make it successful. Pay close attention to:
- **Genre & Niche:** (e.g., Historical Documentary, Tech Review, True Crime, Bible Story, Health & Wellness).
- **Thematic Tags:** (e.g., Ancient History, Leadership, Betrayal, Scientific Breakthrough, Moral Dilemma, Spiritual Growth).
- **Content Style:** (e.g., Fast-paced narration, suspenseful storytelling, conversational dialogue, educational and formal).
- **Structure:** (e.g., Strong hook, problem-solution format, chronological narrative, listicle).

Here are the reference transcript(s):
${referenceTranscripts}

**Step 2: Idea Generation**
Now, using your analysis, generate 10 unique and compelling story ideas.

**CRITICAL RULES:**
1.  **New Subject, Same Vibe:** The new ideas MUST be about a **different specific subject** than the reference(s). For example, if the reference is about Cleopatra, do NOT suggest another video about Cleopatra.
2.  **Match the Essence:** The new ideas MUST align with the **same Genre, Niche, and Thematic Tags** you identified. If the reference was a historical documentary about a powerful leader, your new ideas should be for other historical documentaries about powerful leaders or significant historical events (e.g., Alexander the Great, The Fall of the Roman Empire).
3.  **Emulate the Style:** The new ideas should be suitable for the same **Content Style** and **Structure** as the reference.

Each idea must have a "title" and a "description".
${exclusionPrompt}
**IMPORTANT**: Your response MUST be a valid JSON array of objects. Do not include any text, markdown, or explanations outside of the JSON array. Each object in the array must contain only the keys "title" and "description".

Example format:
[
  {
    "title": "Example Title 1",
    "description": "Example description 1."
  },
  {
    "title": "Example Title 2",
    "description": "Example description 2."
  }
]`;

    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        return parseJsonFromResponse<StoryIdea[]>(response.text);
    });
};


export const generateScript = async (idea: StoryIdea, length: string, context: string, style: ScriptStyle, transcriptReferences?: string[], transcriptStyle: 'exact' | 'reimagine' = 'exact'): Promise<string> => {
    let styleInstruction = '';
    let finalOutputInstruction = ''; // Will be set inside the switch

    switch (style.mode) {
        case 'narrator':
            styleInstruction = "The script should consist entirely of narration. Do not include any character dialogue.";
            finalOutputInstruction = "The final output must be only the pure script text. Do not include any labels like 'NARRATOR:'. Just provide the narration text directly.";
            break;
        case 'dialogue':
            styleInstruction = "The script should consist entirely of dialogue between two or more characters. Do not include any narration.";
            finalOutputInstruction = "The final output must be only the pure script text. Do not include any speaker labels (e.g., 'ANNA:', 'MARK:'). Simply write out the dialogue, with each character's lines on a new line to naturally separate speakers.";
            break;
        case 'mixed':
            const narratorPercent = style.narratorPercentage;
            const dialoguePercent = 100 - narratorPercent;
            styleInstruction = `The script should be a mix of narration and dialogue. Please ensure the script is approximately ${narratorPercent}% narration and ${dialoguePercent}% dialogue.`;
            finalOutputInstruction = "The final output should be only the script text, properly formatted with speaker labels (e.g., 'NARRATOR:', 'CHARACTER NAME:').";
            break;
    }
    
    let referenceInstruction = '';
    if (transcriptReferences && transcriptReferences.length > 0 && transcriptReferences.some(t => t.trim() !== '')) {
        const references = transcriptReferences.filter(t => t.trim() !== '').map((t, i) => `--- REFERENCE SCRIPT ${i + 1} ---\n${t}`).join('\n\n');
        
        if (transcriptStyle === 'reimagine') {
            referenceInstruction = `
**CRITICAL REIMAGINATION GUIDE**: You MUST analyze the following reference script(s) to understand their core theme, audience appeal, and viral triggers. HOWEVER, you must then COMPLETELY REIMAGINE the script's structure. Do not follow the reference script's flow. Your goal is to create a new, more engaging structure. Start with a powerful, intriguing hook (a question, a moment of suspense, a shocking statement). Reconstruct the narrative to build drama and curiosity. Be creative and innovative with the storytelling approach. The final script must be original in its structure and content, but capture the viral essence of the topic. DO NOT COPY from the references.

${references}
`;
        } else { // 'exact' or default
             referenceInstruction = `
**CRITICAL STYLE GUIDE**: You MUST emulate the writing style of the following reference script(s). Analyze their hook, pacing, sentence structure, tone, and overall flow. Your final script must capture this same viral essence but be entirely original in its content and applied to the new idea. DO NOT COPY from the references.

${references}
`;
        }
    }


    const prompt = `You are a world-class viral content strategist and professional scriptwriter, an expert in creating scripts that captivate audiences and are optimized for social media algorithms. Your task is to write a script that is not just good, but has a high potential to go viral.

**Core Principles for a Viral Script:**
1.  **The Hook (First 3-5 Seconds):** Start with an incredibly powerful hook. It must immediately grab the viewer's attention and stop them from scrolling. It could be a shocking statement, a deep question, an unexpected visual cue, or the beginning of a high-drama situation.
2.  **Sustained Engagement:** Maintain momentum throughout. Use storytelling techniques to build suspense and drama. Create a clear narrative arc, even for short videos. The pacing should be dynamic - a mix of short, punchy lines and more descriptive, immersive ones.
3.  **Emotional Resonance:** The script must evoke strong emotions. Depending on the niche (derived from the context), this could be curiosity, awe, humor, inspiration, empathy, or even controlled outrage. The goal is to make the viewer *feel* something.
4.  **Niche-Specific Viral Triggers:** Analyze the provided context to understand the niche. Tailor the viral elements accordingly.
    - For educational/tech content: Use myth-busting, surprising facts, or a "you're doing it wrong" approach.
    - For storytelling/drama: Use suspense, cliffhangers, and relatable conflicts.
    - For comedy: Use pattern-interrupts, unexpected punchlines, and observational humor.
5.  **Satisfying Conclusion:** End with a strong payoff that resolves the hook and leaves a lasting impression. It could be a mind-blowing reveal, a powerful takeaway, or a question that encourages comments and discussion.
6.  **Human-Like Quality:** Write in a natural, authentic voice. Avoid robotic or overly formal language. Use varied sentence structures and a conversational tone appropriate for the niche. The script should read as if it were written by a skilled human writer, with natural flow and pacing.
${referenceInstruction}
Now, write a script for a video based on the following idea:
Title: ${idea.title}
Description: ${idea.description}
The script should be approximately ${length} long.
Base the tone, style, and niche on this context: "${context}".

**Script Style Instructions:**
${styleInstruction}

**Final Output Instructions:**
${finalOutputInstruction}`;
    
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text;
    });
};

export const breakdownScriptForStoryboard = async (
    script: string, 
    option: 'default' | 'custom',
    instructions: string,
    sceneCount?: number
): Promise<Omit<StoryboardSegment, 'imageUrl' | 'isGenerating' | 'isGeneratingPrompt' | 'aspectRatio'>[]> => {
    
    let customInstruction = '';
    if (option === 'custom' && sceneCount && sceneCount > 0) {
        customInstruction = `\n**Crucial Instruction**: You MUST generate exactly ${sceneCount} segments. Adjust how you group sentences or clauses to meet this specific number of scenes precisely. Each segment still requires a 'script_part' and an 'image_prompt'.`;
    }

    const masterInstructions = instructions.trim()
        ? `
**Master Instructions for Image Prompts:**
You MUST adhere to the following user-provided instructions for every single 'image_prompt' you generate. This is a top priority.
---
${instructions}
---
` : '';

    const prompt = `You are a storyboard assistant. Your task is to break down the provided script into very granular, small segments for visual storytelling. Each segment should ideally be a single sentence or a very short clause. If a sentence describes a distinct action or a change in focus, it should be its own scene.

Here are the rules for breaking down the script:
1.  **Granularity is Key:** Aim for many small scenes rather than a few large ones. A single sentence from the script is often a perfect length for one scene's "script_part".
2.  **One Action, One Scene:** If a sentence contains a distinct visual action, it should be its own scene.
3.  **Subject Change:** If the focus of the script shifts to a new subject or character, start a new scene.
4.  **Speaker Lines:** Treat each line of dialogue or narration from a speaker (e.g., NARRATOR:) as a separate scene.
${customInstruction}
For each segment, you must provide the original script text and then write a detailed, descriptive prompt for an AI image generator. The image prompts should be vivid and describe the scene, characters, lighting, and mood for that specific, small part of the script.
${masterInstructions}
Script:
---
${script}
---

**IMPORTANT**: Your response MUST be a valid JSON array of objects. Do not include any text, markdown, or explanations outside of the JSON array. Each object in the array must contain only the keys "script_part" and "image_prompt".

Example format for a script "The cat sat on the mat. It looked up.":
[
  {
    "script_part": "The cat sat on the mat.",
    "image_prompt": "A fluffy ginger cat is comfortably sitting on a woven welcome mat in a sunlit doorway. The perspective is eye-level with the cat."
  },
  {
    "script_part": "It looked up.",
    "image_prompt": "Close-up shot of the ginger cat's face as it looks upward, its green eyes wide with curiosity. A sunbeam highlights its whiskers."
  }
]`;
    
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        return parseJsonFromResponse<Omit<StoryboardSegment, 'imageUrl' | 'isGenerating' | 'isGeneratingPrompt' | 'aspectRatio'>[]>(response.text);
    });
};

export const generateImagePromptsForSegments = async (scriptParts: string[], instructions: string): Promise<Omit<StoryboardSegment, 'imageUrl' | 'isGenerating' | 'isGeneratingPrompt' | 'aspectRatio'>[]> => {
    const scriptPartsJson = JSON.stringify(scriptParts);

    const masterInstructions = instructions.trim()
    ? `
**Master Instructions for Image Prompts:**
You MUST adhere to the following user-provided instructions for every single 'image_prompt' you generate. This is a top priority.
---
${instructions}
---
` : '';

    const prompt = `You are a storyboard assistant. I have manually segmented a script into parts. For each part, you must write a detailed, descriptive prompt for an AI image generator. The image prompts should be vivid and describe the scene, characters, lighting, and mood for that specific part of the script.
${masterInstructions}
Here are the script parts as a JSON array:
${scriptPartsJson}

**IMPORTANT**: Your response MUST be a valid JSON array of object. Do not include any text, markdown, or explanations outside of the JSON array. The response array MUST have the exact same number of elements as the input array. Each object in the array must contain only the keys "script_part" (with the original text from the input) and "image_prompt".

Example input: ["The cat sat on the mat.", "It looked up."]
Example output format:
[
  {
    "script_part": "The cat sat on the mat.",
    "image_prompt": "A fluffy ginger cat is comfortably sitting on a woven welcome mat in a sunlit doorway. The perspective is eye-level with the cat."
  },
  {
    "script_part": "It looked up.",
    "image_prompt": "Close-up shot of the ginger cat's face as it looks upward, its green eyes wide with curiosity. A sunbeam highlights its whiskers."
  }
]`;

    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        return parseJsonFromResponse<Omit<StoryboardSegment, 'imageUrl' | 'isGenerating' | 'isGeneratingPrompt' | 'aspectRatio'>[]>(response.text);
    });
};

export const regenerateImagePrompt = async (scriptPart: string, existingPrompt: string): Promise<string> => {
    const prompt = `You are a visual artist assistant specializing in creating prompts for AI image generators.
Based on the following script line, generate a new, creative, and visually rich prompt.

**Script Line:**
"${scriptPart}"

**CRITICAL INSTRUCTION:** The previously generated prompt was: "${existingPrompt}". You MUST create a significantly different and more imaginative prompt. Do not simply rephrase the old one. Brainstorm a completely new visual concept, angle, or style that still captures the essence of the script line.

For example, if the script is "He looked at the stars." and the old prompt was "A man looking up at a starry night.", a good new prompt could be "Low-angle shot from behind a man's shoulder, the star-filled galaxy reflected in his wide, awe-struck eyes. A single shooting star streaks across the sky."

Your output MUST be only the new image prompt text. Do not include headers, explanations, or any other text.`;
    
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    });
};

export const editImage = async (imageFile: File, prompt: string): Promise<string> => {
    return withRetry(async () => {
        const imagePart = await fileToGenerativePart(imageFile);
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }
        
        throw new Error('Image editing failed or returned no image.');
    });
};

export const generateImage = async (prompt: string, aspectRatio?: AspectRatio, style?: ImageStyle | null): Promise<string> => {
    const aspectRatioMap: Record<AspectRatio, string> = {
        SQUARE: '1:1',
        LANDSCAPE: '16:9',
        PORTRAIT: '9:16',
    };

    // Base configuration for image generation
    const config: {
        numberOfImages: number;
        outputMimeType: 'image/jpeg';
        aspectRatio?: string;
    } = {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg'
    };
    
    if (aspectRatio && aspectRatioMap[aspectRatio]) {
        config.aspectRatio = aspectRatioMap[aspectRatio];
    }

    let finalPrompt = prompt;
    if (style) {
        const stylePromptMap: Record<ImageStyle, string> = {
            'Photorealistic': 'ultra photorealistic, 4k, sharp focus, high detail',
            'Anime': 'vibrant anime style, detailed digital illustration, by Makoto Shinkai',
            'Cinematic': 'cinematic film still, dramatic lighting, wide-angle, epic composition, film grain',
            '3D Render': '3D render, Disney Pixar style, smooth textures, vibrant colors, high quality CGI',
            'Pixel Art': 'retro 16-bit pixel art, detailed sprite, vibrant palette',
            'Fantasy Art': 'epic fantasy digital painting, high-fantasy, Dungeons and Dragons concept art, detailed, magical atmosphere',
            'Cyberpunk': 'cyberpunk aesthetic, neon-drenched city, futuristic, dystopian, high-tech visuals',
            'Minimalist': 'minimalist vector art, clean lines, simple shapes, limited color palette, flat design',
            'Watercolor': 'beautiful watercolor painting, soft edges, vibrant washes of color',
            'Comic Book': 'bold comic book style, heavy inks, vibrant colors, halftone dots, graphic novel art',
            'Abstract': 'abstract art, non-representational, focus on shapes, colors, and textures, emotionally expressive',
            'Impressionism': 'impressionistic painting, visible brush strokes, focus on light and its changing qualities, style of Monet or Renoir',
            'Line Art': 'elegant black and white line art, clean lines, high contrast',
            'Low Poly': 'low poly digital art, geometric shapes, faceted surfaces, modern and stylized 3D',
            'Steampunk': 'steampunk aesthetic, intricate gears and cogs, Victorian-era technology, brass and copper details, retrofuturistic',
            'Vaporwave': 'vaporwave aesthetic, pastel pinks and blues, neon grids, retro 80s and 90s vibes, classical statues, glitch art',
        };
        finalPrompt = `${prompt}, ${stylePromptMap[style]}`;
    }

    return withRetry(async () => {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: finalPrompt,
            config: config,
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        
        throw new Error('Image generation failed or returned no images.');
    });
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read file as base64 string."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

export const generatePromptFromImage = async (
    imageFile: File,
    lengthOption: 'default' | 'custom',
    customLength?: string
): Promise<string> => {
    
    let textPrompt = `Analyze this image in extreme detail. Describe everything you see:
- The main subject(s): their appearance, posture, expression.
- The background and environment: setting, time of day, details.
- Lighting: source, quality (hard/soft), mood it creates.
- Colors: dominant colors, palette, contrast.
- Style: is it a photograph, painting, 3D render? What is the artistic style (e.g., photorealistic, anime, abstract)?
- Composition and Angle: camera angle, framing, depth of field.
- Mood and Story: what emotions does the image evoke? What story might it be telling?

Based on this comprehensive analysis, generate a single, cohesive, and vivid prompt that an AI image generator could use to recreate a similar image. Do not add any extra text, titles or explanations, just the prompt itself.`;

    if (lengthOption === 'custom' && customLength && customLength.trim() !== '') {
        textPrompt += `\n\nIMPORTANT: The final generated prompt must be approximately ${customLength} long.`;
    }

    const textPart = {
        text: textPrompt
    };
    
    return withRetry(async () => {
        const imagePart = await fileToGenerativePart(imageFile);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text;
    });
};

export const transcribeMediaFile = async (mediaFile: File): Promise<string> => {
    if (mediaFile.size > 20 * 1024 * 1024) { // ~20MB limit for inline data
        throw new Error("File is too large. Please upload files under 20MB.");
    }
    
    const textPart = {
        text: "Transcribe the audio from this file. Provide only the spoken words as a single block of text. Do not include timestamps or speaker labels.",
    };

    return withRetry(async () => {
        const mediaPart = await fileToGenerativePart(mediaFile); 
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [mediaPart, textPart] },
        });

        return response.text;
    });
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
    if (!text.trim()) {
        throw new Error("Text cannot be empty.");
    }

    const fullPrompt = `You are a professional voice actor. Your delivery must be natural and engaging, avoiding any robotic tones or awkward pauses.
When you encounter text in parentheses, you must interpret it as a stage direction. Do not read the text inside the parentheses aloud. Instead:
- If it describes an emotion (e.g., (happy), (sadly), (excitedly)), adopt that emotional tone for the following sentence.
- If it describes a non-speech sound (e.g., (laughs), (sighs), (chuckles)), you must perform that sound naturally.

Now, read the following script:
---
${text}
`;
    
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: fullPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        
        throw new Error('Speech generation failed or returned no audio data.');
    });
};

export const generateSoundEffect = async (prompt: string, duration: number): Promise<string> => {
    if (!prompt.trim()) {
        throw new Error("Prompt cannot be empty.");
    }
    
    // This prompt format is designed to be interpreted as a command for a sound effect,
    // rather than text to be read aloud. Using double parentheses and "SFX:" is a common
    // convention for non-speech sounds in text-to-speech systems.
    const fullPrompt = `((SFX: ${prompt}, duration: ${duration} seconds))`;

    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: fullPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      // Using a standard voice; the prompt will guide it to make a sound effect.
                      prebuiltVoiceConfig: { voiceName: 'zephyr' },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        
        throw new Error('Sound effect generation failed or returned no audio data.');
    });
};

export const generateVideos = async (
    prompt: string,
    resolution: VideoResolution,
    aspectRatio: VideoAspectRatio,
    onProgress: (message: string) => void
): Promise<string> => {
    return withRetry(async () => {
        onProgress('Sending request to video generation model...');
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: resolution,
                aspectRatio: aspectRatio,
            }
        });

        onProgress('Request received. Generation in progress. This may take a few minutes...');
        let pollCount = 0;
        while (!operation.done) {
            pollCount++;
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            onProgress(`Checking status (attempt ${pollCount})...`);
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            throw new Error(operation.error.message || 'Video generation failed during processing.');
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error('Video generation completed but no download link was found.');
        }

        onProgress('Generation complete. Downloading video...');
        
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`Failed to download video. Status: ${response.statusText}`);
        }

        const videoBlob = await response.blob();
        
        onProgress('Download complete.');
        return URL.createObjectURL(videoBlob);
    });
};

export const transcribeYouTubeVideo = async (url: string): Promise<{ title: string; transcript: string }> => {
    const prompt = `I will provide a YouTube URL. I need you to act as an expert video analyst. Based on your knowledge of this video, provide its title and a full transcript of its spoken content.

YouTube URL: ${url}

IMPORTANT: Your response MUST be a single, valid JSON object with two keys: "title" and "transcript". Do not include any extra text, markdown, or explanations outside of the JSON object. If you do not have knowledge of this specific video, return a JSON object with a "title" of "" and a "transcript" of "".`;

    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        const result = parseJsonFromResponse<{ title: string; transcript: string }>(response.text);
        if (!result.transcript || !result.title) {
            throw new Error("Could not retrieve transcript for this video. It may be unavailable or not in the model's knowledge base.");
        }
        return result;
    });
};

export const detectPausesInAudio = async (mediaFile: File, pauseLength: number): Promise<PauseTimestamp[]> => {
    if (mediaFile.size > 20 * 1024 * 1024) { // ~20MB limit
        throw new Error("File is too large. Please upload files under 20MB.");
    }
    
    const textPart = {
        text: `Analyze the audio from this file. Identify all periods of silence or near-silence that are longer than ${pauseLength} seconds.
Your response MUST be a valid JSON array of objects. Each object must represent a silent pause and contain "start" and "end" keys with the timestamps in seconds, up to 2 decimal places.

Example format:
[
  { "start": 1.25, "end": 2.80 },
  { "start": 5.50, "end": 6.15 }
]`
    };

    return withRetry(async () => {
        const mediaPart = await fileToGenerativePart(mediaFile);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [mediaPart, textPart] },
            config: {
                responseMimeType: "application/json",
            }
        });

        const responseText = response.text.trim();
        if (responseText === "") {
            return [];
        }

        return parseJsonFromResponse<PauseTimestamp[]>(responseText);
    });
};
