import { formatINR, initials } from '../utils/format.js';

export default function SuccessView({ business, previousAmount, onBackToBoard }) {
  return (
    <div className="card">
      <div className="success-wrap">
        <div className="success-ring">✓</div>
        <h2>You're #1</h2>
        <p>
          Payment of <strong>{formatINR(business.amount)}</strong> confirmed
          {previousAmount != null ? ` — ${formatINR(business.amount - previousAmount)} more than the previous #1's ${formatINR(previousAmount)}` : ''}.
          Your site is now on top.
        </p>
      </div>

      <div className="throne" style={{ marginBottom: 22 }}>
        <p className="eyebrow">👑 Now holding #1</p>
        <div className="logo-ring-wrap">
          <div className="logo-ring">
            {business.logo ? <img src={business.logo} alt="" /> : initials(business.name)}
          </div>
          <div className="verified-badge">✓</div>
        </div>
        <h1>{business.name}</h1>
        <a
          className="site-url"
          href={business.url.startsWith('http') ? business.url : `https://${business.url}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {business.url}
        </a>
        <p className="desc">{business.description}</p>
        <p className="amount-line">
          <span className="al-red">Holding #1</span> <span className="al-plain">with</span>
        </p>
        <div className="amount">{formatINR(business.amount)}</div>
      </div>

      <button className="btn btn-outline" onClick={onBackToBoard}>
        Back to the #1 page
      </button>
      <p className="hint">Anyone can take this spot back by paying more than your amount — the same way you just did.</p>
    </div>
  );
}
