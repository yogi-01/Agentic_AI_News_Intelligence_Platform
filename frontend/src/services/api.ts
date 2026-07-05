import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// User endpoints
export const createUser = (data: {
    email: string;
    topics: string[];
    schedule_time: string;
}) => api.post('/api/users/', data);

export const getUser = (userId: number) =>
    api.get(`/api/users/${userId}`);

export const updateUser = (userId: number, data: {
    topics?: string[];
    schedule_time?: string;
}) => api.put(`/api/users/${userId}`, data);

// Digest endpoints
export const triggerDigest = (userId: number) =>
    api.post(`/api/digest/trigger/${userId}`);

export const getLatestDigest = (userId: number) =>
    api.get(`/api/digest/latest/${userId}`);

export const getDigestHistory = (userId: number) =>
    api.get(`/api/digest/history/${userId}`);

// Chat endpoints
export const sendChatMessage = (userId: number, message: string) =>
    api.post('/api/chat/', { user_id: userId, message });

export const getChatHistory = (userId: number) =>
    api.get(`/api/chat/history/${userId}`);

export const loginUser = (email: string) =>
    api.post(`/api/users/login?email=${encodeURIComponent(email)}`);