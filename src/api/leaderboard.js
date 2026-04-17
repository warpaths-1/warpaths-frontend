import client from './client';

export const getLeaderboard = () => client.get('/v1/leaderboard').then(r => r.data);
export const getRecentGames = () => client.get('/v1/games', { params: { status: 'complete', limit: 10 } }).then(r => r.data);
