import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ChatSession } from '../types';
import * as geminiService from '../services/geminiService';
import { SendIcon } from './icons/SendIcon';
import { ThreeDotsIcon } from './icons/ThreeDotsIcon';
import { RobotIcon } from './icons/RobotIcon';
import { UserIcon } from './icons/UserIcon';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { PlusIcon } from './icons/PlusIcon';

const CHAT_SESSIONS_KEY = 'vic-gpt-chat-sessions';

const VicGptChat: React.FC = () => {
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const pressHoldTimer = useRef<number | null>(null);
    const longPressTriggered = useRef(false);

    const activeSession = chatSessions.find(s => s.id === activeSessionId);
    const messages = activeSession?.messages || [];

    useEffect(() => {
        try {
            const savedSessionsRaw = localStorage.getItem(CHAT_SESSIONS_KEY);
            if (savedSessionsRaw) {
                const savedSessions = JSON.parse(savedSessionsRaw);
                if (Array.isArray(savedSessions) && savedSessions.length > 0) {
                    setChatSessions(savedSessions);
                    const lastActiveId = localStorage.getItem(`${CHAT_SESSIONS_KEY}_active`);
                    if (lastActiveId && savedSessions.some((s: ChatSession) => s.id === lastActiveId)) {
                        setActiveSessionId(lastActiveId);
                    } else {
                        setActiveSessionId(savedSessions[0].id);
                    }
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to load chat sessions:", error);
        }
        
        // If no sessions loaded, create a new one with no initial message
        const newSession: ChatSession = {
            id: `session_${Date.now()}`,
            title: 'New Chat',
            messages: [],
        };
        setChatSessions([newSession]);
        setActiveSessionId(newSession.id);
    }, []);

    useEffect(() => {
        if (chatSessions.length > 0) {
            localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
        } else {
            localStorage.removeItem(CHAT_SESSIONS_KEY);
        }
        if (activeSessionId) {
            localStorage.setItem(`${CHAT_SESSIONS_KEY}_active`, activeSessionId);
        }
    }, [chatSessions, activeSessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleNewChat = useCallback(() => {
        const newSession: ChatSession = {
            id: `session_${Date.now()}`,
            title: 'New Chat',
            messages: [],
        };
        setChatSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setHistoryOpen(false);
        setInput('');
    }, []);
    
    const handleSelectSession = useCallback((sessionId: string) => {
        setActiveSessionId(sessionId);
        setHistoryOpen(false);
    }, []);

    const handlePressStart = useCallback((sessionId: string) => {
        longPressTriggered.current = false;
        pressHoldTimer.current = window.setTimeout(() => {
            setSessionToDelete(sessionId);
            longPressTriggered.current = true;
        }, 700);
    }, []);

    const handlePressEnd = useCallback(() => {
        if (pressHoldTimer.current) {
            clearTimeout(pressHoldTimer.current);
        }
    }, []);

    const handleClick = useCallback((sessionId: string) => {
        if (longPressTriggered.current) {
            return;
        }
        handleSelectSession(sessionId);
    }, [handleSelectSession]);

    const handleDelete = useCallback((sessionId: string) => {
        const newSessions = chatSessions.filter(s => s.id !== sessionId);

        if (activeSessionId === sessionId) {
            if (newSessions.length > 0) {
                setActiveSessionId(newSessions[0].id);
                setChatSessions(newSessions);
            } else {
                const newSession: ChatSession = {
                    id: `session_${Date.now()}`,
                    title: 'New Chat',
                    messages: [],
                };
                setChatSessions([newSession]);
                setActiveSessionId(newSession.id);
            }
        } else {
            setChatSessions(newSessions);
        }
        
        setSessionToDelete(null);
    }, [chatSessions, activeSessionId]);


    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading || !activeSessionId || !activeSession) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), text: input, sender: 'user' };
        const historyForApi = activeSession.messages;

        const updatedSession = {
            ...activeSession,
            messages: [...activeSession.messages, userMessage],
            title: activeSession.title === 'New Chat' ? input.substring(0, 40) + (input.length > 40 ? '...' : '') : activeSession.title,
        };

        setChatSessions(prev => prev.map(s => s.id === activeSessionId ? updatedSession : s));
        
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const stream = await geminiService.streamChatResponse(currentInput, historyForApi);
            const aiMessageId = (Date.now() + 1).toString();
            let aiResponseText = '';

            setChatSessions(prev => prev.map(s => {
                if (s.id !== activeSessionId) return s;
                return { ...s, messages: [...s.messages, { id: aiMessageId, text: '', sender: 'ai' }] };
            }));

            for await (const chunk of stream) {
                aiResponseText += chunk.text;
                setChatSessions(prev => prev.map(s => {
                    if (s.id !== activeSessionId) return s;
                    return {
                        ...s,
                        messages: s.messages.map(msg => msg.id === aiMessageId ? { ...msg, text: aiResponseText } : msg)
                    };
                }));
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: 'Sorry, I encountered an error. Please try again.',
                sender: 'ai',
            };
            setChatSessions(prev => prev.map(s => {
                if (s.id !== activeSessionId) return s;
                return { ...s, messages: [...s.messages, errorMessage] };
            }));
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, activeSessionId, activeSession, chatSessions]);

    return (
        <div className="flex flex-col h-full bg-bg-color text-text-primary">
            <header className="flex items-center justify-between p-4 border-b border-border-color">
                <h2 className="text-xl font-bold">{activeSession?.title || 'Chat Assistant'}</h2>
                <div className="relative">
                    <button onClick={() => { setHistoryOpen(!historyOpen); setSessionToDelete(null); }} className="p-2 rounded-full hover:bg-panel-bg">
                        <ThreeDotsIcon className="text-text-secondary"/>
                    </button>
                    {historyOpen && (
                        <div className="absolute right-0 mt-2 w-72 panel z-10 max-h-96 overflow-y-auto">
                           <div className="p-2">
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg transition-colors text-text-primary hover:bg-primary-accent hover:text-white"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    New Chat
                                </button>
                            </div>
                            <div className="border-t border-border-color my-1" />
                             <div className="p-2 space-y-1">
                                {chatSessions.length > 0 ? (
                                    chatSessions.map(session => (
                                        session.id === sessionToDelete ? (
                                            <div key={session.id} className="p-2 rounded-lg text-sm text-white" style={{ backgroundColor: 'rgba(255, 111, 97, 0.2)'}}>
                                                <p className="text-center mb-2 font-semibold">Delete this chat?</p>
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleDelete(session.id)}
                                                        className="px-4 py-1 rounded-lg hover:opacity-80 transition-opacity font-medium" style={{ backgroundColor: 'var(--warning-accent)'}}>
                                                        Delete
                                                    </button>
                                                    <button 
                                                        onClick={() => setSessionToDelete(null)}
                                                        className="px-4 py-1 bg-panel-bg rounded-lg hover:opacity-80 transition-opacity font-medium">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                        <button
                                            key={session.id}
                                            onMouseDown={() => handlePressStart(session.id)}
                                            onMouseUp={() => handlePressEnd()}
                                            onMouseLeave={() => handlePressEnd()}
                                            onTouchStart={() => handlePressStart(session.id)}
                                            onTouchEnd={() => handlePressEnd()}
                                            onClick={() => handleClick(session.id)}
                                            onContextMenu={(e) => { e.preventDefault(); handlePressEnd(); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors truncate nav-item ${
                                                activeSessionId === session.id ? 'nav-item-active' : ''
                                            }`}
                                            title={session.title}
                                        >
                                            {session.title}
                                        </button>
                                        )
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-sm text-text-secondary">
                                        No past chats yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                {messages.length === 0 ? (
                     <div className="flex-1 flex items-center justify-center pointer-events-none">
                        <h1 
                            className="text-5xl lg:text-6xl font-logo font-bold text-text-primary/20" 
                            style={{ textShadow: '0 0 25px rgba(var(--rgb-secondary-accent), 0.3)' }}
                        >
                            ASK ME ANYTHING
                        </h1>
                    </div>
                ) : (
                    <div className="space-y-6 mt-auto">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'ai' && <div className="p-2 bg-panel-bg rounded-full flex-shrink-0"><RobotIcon className="h-6 w-6 text-secondary-accent"/></div>}
                                <div className={`max-w-xl p-4 text-white ${msg.sender === 'user' ? 'bg-gradient-to-br from-[--primary-accent] to-[--secondary-accent] rounded-2xl rounded-br-none' : 'bg-panel-bg rounded-2xl rounded-bl-none'}`}>
                                <p className="whitespace-pre-wrap">{msg.text || <LoadingSpinner className="h-4 w-4"/>}</p>
                                </div>
                                {msg.sender === 'user' && <div className="p-2 bg-panel-bg rounded-full flex-shrink-0"><UserIcon className="h-6 w-6 text-primary-accent"/></div>}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-border-color">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-4">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Type your message..."
                        rows={1}
                        className="flex-1 input-styled resize-none"
                        style={{ borderRadius: '9999px' }}
                        disabled={isLoading}
                    />
                    <button type="submit" className="btn btn-primary p-3 rounded-full flex-shrink-0" disabled={isLoading || !input.trim()} style={{ borderRadius: '9999px' }}>
                        {isLoading ? <LoadingSpinner className="w-6 h-6" /> : <SendIcon className="w-6 h-6" />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VicGptChat;