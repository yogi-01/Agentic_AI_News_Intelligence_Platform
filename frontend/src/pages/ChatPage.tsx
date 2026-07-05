import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, getChatHistory } from '../services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface Props {
    userId: number | null;
    darkMode: boolean;
}

const SUGGESTED_QUESTIONS = [
    'What are the biggest AI stories today?',
    'Summarize the top business news',
    'What technology trends are emerging?',
    'Any positive news stories today?',
];

const ChatPage: React.FC<Props> = ({ userId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<number | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (userId) loadHistory();
    }, [userId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadHistory = async () => {
        if (!userId) return;
        try {
            const res = await getChatHistory(userId);
            const history: Message[] = [];
            res.data.reverse().forEach((item: any) => {
                history.push({ role: 'user', content: item.message, timestamp: new Date(item.created_at) });
                history.push({ role: 'assistant', content: item.response, timestamp: new Date(item.created_at) });
            });
            setMessages(history);
        } catch { }
    };

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || !userId || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: messageText, timestamp: new Date() }]);
        setLoading(true);

        try {
            const res = await sendChatMessage(userId, messageText);
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response, timestamp: new Date() }]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: err.response?.data?.detail || 'Something went wrong. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (content: string, index: number) => {
        navigator.clipboard.writeText(content);
        setCopied(index);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleClearChat = () => setMessages([]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!userId) {
        return (
            <div className="text-center mt-20">
                <p className="text-5xl mb-4">💬</p>
                <p className="text-gray-500 dark:text-gray-400">
                    Please set up your account in Settings first.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto flex flex-col h-[78vh]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Chat with your Digest</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Ask anything about today's news stories</p>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={handleClearChat}
                        className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 
                       transition-colors px-3 py-1.5 rounded-lg border border-gray-200 
                       dark:border-gray-700 hover:border-red-300"
                    >
                        🗑️ Clear Chat
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm 
                      p-4 mb-4 space-y-4 border border-gray-100 dark:border-gray-800">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center">
                        <p className="text-4xl mb-3">🤖</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                            Ask me anything about today's news digest
                        </p>
                        <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q)}
                                    className="text-left text-xs p-3 rounded-xl border border-gray-200 
                             dark:border-gray-700 text-gray-600 dark:text-gray-400
                             hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400
                             hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            {msg.role === 'assistant' && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">🤖 AI Assistant</span>
                            )}
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed relative group ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                                }`}>
                                {msg.content}
                                {msg.role === 'assistant' && (
                                    <button
                                        onClick={() => handleCopy(msg.content, i)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 
                               transition-opacity text-xs text-gray-400 hover:text-gray-600
                               dark:hover:text-gray-300 bg-white dark:bg-gray-700 
                               rounded px-1.5 py-0.5"
                                    >
                                        {copied === i ? '✅' : '📋'}
                                    </button>
                                )}
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-600 mx-1">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                            <div className="flex gap-1 items-center">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about today's news... (Enter to send)"
                    className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm
                     bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                />
                <button
                    onClick={() => handleSend()}
                    disabled={loading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl
                     font-semibold transition-all duration-200 disabled:opacity-50
                     active:scale-95 hover:shadow-lg hover:shadow-blue-200"
                >
                    Send ➤
                </button>
            </div>
        </div>
    );
};

export default ChatPage;