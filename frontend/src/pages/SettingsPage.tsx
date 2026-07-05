import React, { useState, useEffect } from 'react';
import { createUser, getUser, updateUser, loginUser } from '../services/api';


const AVAILABLE_TOPICS = [
    { label: '🤖 Artificial Intelligence', value: 'Artificial Intelligence' },
    { label: '💻 Technology', value: 'Technology' },
    { label: '💼 Business', value: 'Business' },
    { label: '📈 Finance', value: 'Finance' },
    { label: '🔬 Science', value: 'Science' },
    { label: '🏥 Health', value: 'Health' },
    { label: '🏛️ Politics', value: 'Politics' },
    { label: '⚽ Sports', value: 'Sports' },
    { label: '🎬 Entertainment', value: 'Entertainment' },
    { label: '🌍 Climate', value: 'Climate' },
];

interface Props {
    userId: number | null;
    setUserId: (id: number) => void;
    darkMode: boolean;
}

const SettingsPage: React.FC<Props> = ({ userId, setUserId }) => {
    const [email, setEmail] = useState('');
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [scheduleTime, setScheduleTime] = useState('07:00');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (userId) {
            getUser(userId).then(res => {
                setEmail(res.data.email);
                setSelectedTopics(res.data.topics);
                setScheduleTime(res.data.schedule_time);
            });
        }
    }, [userId]);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const toggleTopic = (topic: string) => {
        setSelectedTopics(prev =>
            prev.includes(topic)
                ? prev.filter(t => t !== topic)
                : [...prev, topic]
        );
    };

    const handleSubmit = async () => {
        if (!email) { showToast('Please enter your email.', 'error'); return; }
        if (!userId && selectedTopics.length === 0) {
            showToast('Please select at least one topic.', 'error');
            return;
        }

        setLoading(true);
        try {
            if (userId) {
                // Update existing user
                await updateUser(userId, { topics: selectedTopics, schedule_time: scheduleTime });
                showToast('Settings updated successfully!', 'success');
            } else {
                // Try to create new account
                try {
                    const res = await createUser({ email, topics: selectedTopics, schedule_time: scheduleTime });
                    const newUserId = res.data.id;
                    localStorage.setItem('userId', newUserId.toString());
                    setUserId(newUserId);
                    showToast('Account created! Go to Dashboard to generate your first digest.', 'success');
                } catch (err: any) {
                    // If email already exists, log them in instead
                    if (err.response?.data?.detail === 'Email already registered') {
                        const loginRes = await loginUser(email);
                        const existingUserId = loginRes.data.id;
                        localStorage.setItem('userId', existingUserId.toString());
                        setUserId(existingUserId);
                        setSelectedTopics(loginRes.data.topics);
                        setScheduleTime(loginRes.data.schedule_time);
                        showToast('Welcome back! Logged in successfully.', 'success');
                    } else {
                        throw err;
                    }
                }
            }
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Something went wrong.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                </div>
            )}

            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Settings</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Configure your personalized news digest preferences.
            </p>

            {/* Profile card if logged in */}
            {userId && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 
                  rounded-xl p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-blue-800 dark:text-blue-300">{email}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                {selectedTopics.length} topics selected · Digest at {scheduleTime}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('userId');
                            window.location.reload();
                        }}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 
                 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        🚪 Logout
                    </button>
                </div>
            )}

            {/* Email */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 mb-4 
                      border border-gray-100 dark:border-gray-800">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📧 Email Address
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={!!userId}
                    placeholder="your@email.com"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                     disabled:bg-gray-50 dark:disabled:bg-gray-800 text-sm"
                />
            </div>

            {/* Topics */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 mb-4
                      border border-gray-100 dark:border-gray-800">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    🗂️ Select Topics
                </label>
                <p className="text-xs text-gray-400 mb-3">{selectedTopics.length} selected</p>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TOPICS.map(topic => (
                        <button
                            key={topic.value}
                            onClick={() => toggleTopic(topic.value)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                hover:scale-105 active:scale-95 ${selectedTopics.includes(topic.value)
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {topic.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Schedule */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 mb-6
                      border border-gray-100 dark:border-gray-800">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    ⏰ Daily Digest Time
                </label>
                <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
                />
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl
                   font-semibold transition-all duration-200 hover:shadow-lg
                   hover:shadow-blue-200 dark:hover:shadow-blue-900
                   disabled:opacity-50 active:scale-95"
            >
                {loading ? '⏳ Saving...' : userId ? '💾 Update Settings' : '🚀 Create Account'}
            </button>
        </div>
    );
};

export default SettingsPage;