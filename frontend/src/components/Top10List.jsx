import { formatINR, initials } from '../utils/format.js';

export default function Top10List({ board, loading, error }) {
  return (
    <div className="top10">
      <h3 className="top10-head">
        <span className="trophy-icon">🏆</span>Top 10
      </h3>
      <p className="top10-sub">Same board, in order — the size of each row shrinks as the amount does.</p>

      {loading && <p className="hint">Loading the board…</p>}
      {error && <p className="hint">Couldn't load the board: {error}</p>}
      {!loading && !error && board.length === 0 && (
        <p className="hint">No businesses on the board yet. Be the first to claim #1.</p>
      )}

      <div>
        {board.map((b, i) => {
          const rank = i + 1;
          return (
            <div className="t10-row" data-rank={rank} key={b._id}>
              <div className="t10-rank">#{rank}</div>
              <div className="t10-logo">
                {b.logo ? <img src={b.logo} alt="" /> : initials(b.name)}
              </div>
              <div className="t10-body">
                <div className="t10-name">{b.name}</div>
                <a
                  className="t10-url"
                  href={b.url.startsWith('http') ? b.url : `https://${b.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {b.url}
                </a>
              </div>
              <div className="t10-amt">{formatINR(b.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
