import client from './client.js';

export const getBoard = () => client.get('/board').then((res) => res.data.board);

export const getNextPrice = () => client.get('/board/next-price').then((res) => res.data);
