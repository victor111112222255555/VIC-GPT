
import { ImageStyle } from './types';

export const SCRIPT_LENGTH_OPTIONS = [
    { id: 'ref', label: 'Match Reference' },
    { id: '30s', label: '30 Seconds' },
    { id: '1m', label: '1 Minute' },
    { id: '2m', label: '2 Minutes' },
    { id: '5m', label: '5 Minutes' },
    { id: '10m', label: '10 Minutes' },
    { id: '20m', label: '20 Minutes' },
    { id: 'custom', label: 'Custom' },
];

export const IMAGE_STYLE_OPTIONS: { label: string; value: ImageStyle }[] = [
    { label: '📷 Photorealistic', value: 'Photorealistic' },
    { label: '🎨 Anime', value: 'Anime' },
    { label: '🎬 Cinematic', value: 'Cinematic' },
    { label: '🤖 3D Render', value: '3D Render' },
    { label: '🕹️ Pixel Art', value: 'Pixel Art' },
    { label: '✨ Fantasy Art', value: 'Fantasy Art' },
    { label: '🌃 Cyberpunk', value: 'Cyberpunk' },
    { label: '✒️ Minimalist', value: 'Minimalist' },
    { label: '🖌️ Watercolor', value: 'Watercolor' },
    { label: '💥 Comic Book', value: 'Comic Book' },
    { label: '🌀 Abstract', value: 'Abstract' },
    { label: '🖼️ Impressionism', value: 'Impressionism' },
    { label: '✍️ Line Art', value: 'Line Art' },
    { label: '🧊 Low Poly', value: 'Low Poly' },
    { label: '⚙️ Steampunk', value: 'Steampunk' },
    { label: '🌴 Vaporwave', value: 'Vaporwave' },
];

export const TTS_VOICE_OPTIONS: { name: string, label: string }[] = [
    { name: 'Achernar', label: 'Achernar' },
    { name: 'Achird', label: 'Achird' },
    { name: 'Algenib', label: 'Algenib' },
    { name: 'Algieba', label: 'Algieba' },
    { name: 'Alnilam', label: 'Alnilam' },
    { name: 'Aoede', label: 'Aoede' },
    { name: 'Autonoe', label: 'Autonoe' },
    { name: 'Callirrhoe', label: 'Callirrhoe' },
    { name: 'Charon', label: 'Charon' },
    { name: 'Despina', label: 'Despina' },
    { name: 'Enceladus', label: 'Enceladus' },
    { name: 'Erinome', label: 'Erinome' },
    { name: 'Fenrir', label: 'Fenrir' },
    { name: 'Gacrux', label: 'Gacrux' },
    { name: 'Iapetus', label: 'Iapetus' },
    { name: 'Kore', label: 'Kore' },
    { name: 'Laomedeia', label: 'Laomedeia' },
    { name: 'Leda', label: 'Leda' },
    { name: 'Orus', label: 'Orus' },
    { name: 'Puck', label: 'Puck' },
    { name: 'Pulcherrima', label: 'Pulcherrima' },
    { name: 'Rasalgethi', label: 'Rasalgethi' },
    { name: 'Sadachbia', label: 'Sadachbia' },
    { name: 'Sadaltager', label: 'Sadaltager' },
    { name: 'Schedar', label: 'Schedar' },
    { name: 'Sulafat', label: 'Sulafat' },
    { name: 'Umbriel', label: 'Umbriel' },
    { name: 'Vindemiatrix', label: 'Vindemiatrix' },
    { name: 'Zephyr', label: 'Zephyr' },
    { name: 'Zubenelgenubi', label: 'Zubenelgenubi' },
];

export const SOUND_EFFECT_DURATION_OPTIONS: { label: string; value: number }[] = [
    { label: 'Short (~3s)', value: 3 },
    { label: 'Medium (~5s)', value: 5 },
    { label: 'Long (~10s)', value: 10 },
];
