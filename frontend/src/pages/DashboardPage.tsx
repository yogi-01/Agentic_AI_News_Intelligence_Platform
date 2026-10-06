import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getLatestDigest } from '../services/api';

interface Article {
    id: number;
    title: string;
    summary: string;
    source: string;
    url: string;
    topic: string;
    sentiment: string;
}

interface Digest {
    id: number;
    full_briefing: string;
    created_at: string;
    articles: Article[];
}

interface Props {
    userId: number | null;
    darkMode: boolean;
}

const sentimentConfig: Record<string, { color: string; bg: string; icon: string }> = {
    positive: { color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-900/30', icon: '📈' },
    negative: { color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30', icon: '📉' },
    neutral: { color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', icon: '➖' },
};

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-5 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
);

const DashboardPage: React.FC<Props> = ({ userId }) => {
    const [digest, setDigest] = useState<Digest | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [progress, setProgress] = useState<{ message: string; step: string }[]>([]);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState<string>('All');
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (userId) fetchLatestDigest();
    }, [userId]);

    const fetchLatestDigest = async () => {
        if (!userId) return;
        setFetching(true);
        try {
            const res = await getLatestDigest(userId);
            setDigest(res.data);
        } catch {
            setError('No digest yet. Click Generate Digest to create your first one.');
        } finally {
            setFetching(false);
        }
    };

    const handleGenerateDigest = () => {
        if (!userId) return;
        setLoading(true);
        setProgress([]);
        setError('');
        const WS_URL =
            process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

        const ws = new WebSocket(
            `${WS_URL}/ws/digest/${userId}`
        );
        wsRef.current = ws;
        ws.onopen = () => ws.send(JSON.stringify({ action: 'start_digest' }));
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'progress') {
                setProgress(prev => [...prev, { message: data.message, step: data.step }]);
            }
            if (data.status === 'complete') {
                setProgress(prev => [...prev, { message: 'Your digest is ready!', step: 'done' }]);
                setLoading(false);
                ws.close();
                fetchLatestDigest();
            }
            if (data.status === 'error') {
                setError(data.message);
                setLoading(false);
                ws.close();
            }
        };
        ws.onerror = () => { setError('WebSocket connection failed.'); setLoading(false); };
    };

    const topics = digest ? ['All', ...Array.from(new Set(digest.articles.map(a => a.topic)))] : ['All'];

    const filteredArticles = digest?.articles.filter(article => {
        const matchesTopic = selectedTopic === 'All' || article.topic === selectedTopic;
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.summary.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTopic && matchesSearch;
    }) || [];

    const articlesByTopic = filteredArticles.reduce((acc: Record<string, Article[]>, article) => {
        if (!acc[article.topic]) acc[article.topic] = [];
        acc[article.topic].push(article);
        return acc;
    }, {});

    const chartData = digest
        ? Object.entries(
            digest.articles.reduce((acc: Record<string, number>, a) => {
                acc[a.topic] = (acc[a.topic] || 0) + 1;
                return acc;
            }, {})
        ).map(([topic, count]) => ({ topic: topic.split(' ')[0], count }))
        : [];

    const stepIcons: Record<string, string> = {
        fetch: '📡', filter: '🔍', summarize: '🤖',
        briefing: '✍️', delivery: '📬', done: '✅'
    };

    if (!userId) {
        return (
            <div className="text-center mt-20">
                <p className="text-5xl mb-4">📰</p>
                <p className="text-gray-500 dark:text-gray-400">
                    Please set up your account in Settings first.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Your Daily Briefing
                    </h2>
                    {digest && (
                        <p className="text-xs text-gray-400 mt-1">
                            Last updated: {new Date(digest.created_at).toLocaleString()}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleGenerateDigest}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl
                     font-semibold transition-all duration-200 hover:shadow-lg
                     hover:shadow-blue-200 dark:hover:shadow-blue-900
                     disabled:opacity-50 active:scale-95 text-sm"
                >
                    {loading ? '⏳ Generating...' : '⚡ Generate Digest'}
                </button>
            </div>

            {/* Progress */}
            {progress.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 
                        rounded-xl p-5 mb-6 shadow-sm">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Agent Progress
                    </p>
                    <div className="space-y-2">
                        {progress.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span>{stepIcons[p.step] || '⏳'}</span>
                                <span>{p.message}</span>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                    <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: `${(progress.length / 5) * 100}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                        text-red-700 dark:text-red-400 rounded-xl p-4 mb-6 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Skeleton */}
            {fetching && (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
            )}

            {digest && !fetching && (
                <>
                    {/* Daily Briefing */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm mb-8 overflow-hidden">

                        {/* Briefing Header */}
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">
                                    ✨
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                        Today's AI Briefing
                                    </p>

                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                                        Your daily intelligence digest
                                    </h3>
                                </div>

                            </div>
                        </div>

                        {/* Markdown Content */}
                        <div className="px-6 py-6 text-gray-700 dark:text-gray-300">

                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{

                                    h1: ({ children }) => (
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-2">
                                            {children}
                                        </h1>
                                    ),

                                    h2: ({ children }) => (
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                            {children}
                                        </h2>
                                    ),

                                    h3: ({ children }) => (
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                            {children}
                                        </h3>
                                    ),

                                    p: ({ children }) => (
                                        <p className="text-sm leading-7 mb-4 text-gray-600 dark:text-gray-300">
                                            {children}
                                        </p>
                                    ),

                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-gray-900 dark:text-white">
                                            {children}
                                        </strong>
                                    ),

                                    ul: ({ children }) => (
                                        <ul className="space-y-2 mb-5 ml-5 list-disc">
                                            {children}
                                        </ul>
                                    ),

                                    ol: ({ children }) => (
                                        <ol className="space-y-2 mb-5 ml-5 list-decimal">
                                            {children}
                                        </ol>
                                    ),

                                    li: ({ children }) => (
                                        <li className="text-sm leading-6 text-gray-600 dark:text-gray-300 pl-1">
                                            {children}
                                        </li>
                                    ),

                                    hr: () => (
                                        <hr className="my-7 border-gray-200 dark:border-gray-700" />
                                    ),

                                    table: ({ children }) => (
                                        <div className="overflow-x-auto mb-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <table className="w-full text-sm text-left">
                                                {children}
                                            </table>
                                        </div>
                                    ),

                                    thead: ({ children }) => (
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                            {children}
                                        </thead>
                                    ),

                                    tbody: ({ children }) => (
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {children}
                                        </tbody>
                                    ),

                                    th: ({ children }) => (
                                        <th className="px-4 py-3 font-semibold">
                                            {children}
                                        </th>
                                    ),

                                    td: ({ children }) => (
                                        <td className="px-4 py-3 align-top leading-6 text-gray-600 dark:text-gray-300">
                                            {children}
                                        </td>
                                    ),

                                    a: ({ children, href }) => (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                        >
                                            {children}
                                        </a>
                                    ),
                                }}
                            >
                                {digest.full_briefing}
                            </ReactMarkdown>

                        </div>

                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-800">
                            <p className="text-2xl font-bold text-blue-600">{digest.articles.length}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Articles</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-800">
                            <p className="text-2xl font-bold text-purple-600">
                                {new Set(digest.articles.map(a => a.topic)).size}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Topics Covered</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-800">
                            <p className="text-2xl font-bold text-green-600">
                                {digest.articles.filter(a => a.sentiment === 'positive').length}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Positive Stories</p>
                        </div>
                    </div>

                    {/* Chart */}
                    {chartData.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 mb-6 border border-gray-100 dark:border-gray-800">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 text-sm">
                                📊 Articles by Topic
                            </h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData}>
                                    <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                        {chartData.map((_, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Search and Filter */}
                    <div className="flex gap-3 mb-6">
                        <input
                            type="text"
                            placeholder="🔍 Search articles..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm
                         bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                        />
                        <select
                            value={selectedTopic}
                            onChange={e => setSelectedTopic(e.target.value)}
                            className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm
                         bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                        >
                            {topics.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Articles */}
                    {Object.entries(articlesByTopic).map(([topic, articles]) => (
                        <div key={topic} className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-base font-bold text-gray-800 dark:text-white">{topic}</h3>
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 
                                 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {articles.length}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {articles.map(article => {
                                    const sentiment = sentimentConfig[article.sentiment] || sentimentConfig.neutral;
                                    return (
                                        <div
                                            key={article.id}
                                            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-5 
                                 border border-gray-100 dark:border-gray-800
                                 hover:shadow-md transition-shadow duration-200"
                                        >

                                            <a href={article.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-gray-800 dark:text-white hover:text-blue-600 
                                   dark:hover:text-blue-400 text-sm leading-snug"
                                            >
                                                {article.title}
                                            </a>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed">
                                                {article.summary}
                                            </p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sentiment.bg} ${sentiment.color}`}>
                                                    {sentiment.icon} {article.sentiment}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    {article.source}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {filteredArticles.length === 0 && (
                        <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                            <p className="text-3xl mb-2">🔍</p>
                            <p className="text-sm">No articles match your search.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DashboardPage;