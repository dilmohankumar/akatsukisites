import { useCallback, useEffect, useState } from 'react';
import { getBoard, getNextPrice } from '../api/board.js';

export function useBoard() {
  const [board, setBoard] = useState([]);
  const [nextPrice, setNextPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [boardData, priceData] = await Promise.all([getBoard(), getNextPrice()]);
      setBoard(boardData);
      setNextPrice(priceData.nextPrice);
    } catch (err) {
      setError(err.message || 'Could not load the board.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const current = board[0] || null;

  return { board, current, nextPrice, loading, error, refresh };
}
