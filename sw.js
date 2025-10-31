const CACHE_NAME = 'vic-gpt-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/vite.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/App.tsx',
  '/types.ts',
  '/constants.ts',
  '/services/geminiService.ts',
  '/components/VicGptChat.tsx',
  '/components/ImageGenerator.tsx',
  '/components/ImageToPrompt.tsx',
  '/components/AITranscription.tsx',
  '/components/AITextToSpeech.tsx',
  '/components/AISoundEffectGenerator.tsx',
  '/components/AIVideoGenerator.tsx',
  '/components/YouTubeTranscription.tsx',
  '/components/AISplitPauses.tsx',
  '/components/YourProjects.tsx',
  '/components/GoogleLoginScreen.tsx',
  '/components/PasscodeLockScreen.tsx',
  '/components/InstallHelpModal.tsx',
  '/components/WelcomeScreen.tsx',
  '/components/content_storyboard/Step1_ContentContext.tsx',
  '/components/content_storyboard/Step2_StoryIdeas.tsx',
  '/components/content_storyboard/Step3_ScriptLength.tsx',
  '/components/content_storyboard/Step4_ScriptStyle.tsx',
  '/components/content_storyboard/Step4_ScriptDisplay.tsx',
  '/components/content_storyboard/Step5_SceneOptions.tsx',
  '/components/content_storyboard/Step5_ImageStoryboard.tsx',
  '/components/icons/ArrowRightIcon.tsx',
  '/components/icons/ClipboardListIcon.tsx',
  '/components/icons/CopyIcon.tsx',
  '/components/icons/DownloadIcon.tsx',
  '/components/icons/FolderIcon.tsx',
  '/components/icons/ImageIcon.tsx',
  '/components/icons/ImageUpIcon.tsx',
  '/components/icons/InstallIcon.tsx',
  '/components/icons/LoadingSpinner.tsx',
  '/components/icons/LogOutIcon.tsx',
  '/components/icons/PlusIcon.tsx',
  '/components/icons/RefreshIcon.tsx',
  '/components/icons/RobotIcon.tsx',
  '/components/icons/SendIcon.tsx',
  '/components/icons/ScissorsIcon.tsx',
  '/components/icons/SparklesIcon.tsx',
  '/components/icons/SpeakerIcon.tsx',
  '/components/icons/SoundwaveIcon.tsx',
  '/components/icons/ThreeDotsIcon.tsx',
  '/components/icons/TrashIcon.tsx',
  '/components/icons/UserIcon.tsx',
  '/components/icons/WaveformIcon.tsx',
  '/components/icons/XIcon.tsx',
  '/components/icons/VideoIcon.tsx',
  '/components/icons/YoutubeIcon.tsx',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@^19.1.0/',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/@google/genai@^1.8.0',
  'https://esm.sh/react-dom@^19.1.0/',
  'https://esm.sh/@react-oauth/google@^0.12.1',
  'https://esm.sh/jwt-decode@^4.0.0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all URLs, but don't fail the install if one fails
        const cachePromises = urlsToCache.map(urlToCache => {
            return cache.add(urlToCache).catch(err => {
                console.warn(`Failed to cache ${urlToCache}:`, err);
            });
        });
        return Promise.all(cachePromises);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }
            
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // We don't cache POST requests to the Gemini API
                if(event.request.method !== 'POST') {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});