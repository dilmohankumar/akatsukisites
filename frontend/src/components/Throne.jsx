import { formatINR, initials } from '../utils/format.js';

function WaveLayers() {
  return (
    <>
      <div className="wave-layer wave-back">
        <svg viewBox="0 0 200 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,20 C15,30 35,10 50,20 C65,30 85,10 100,20 C115,30 135,10 150,20 C165,30 185,10 200,20 L200,40 L0,40 Z"
            fill="#0057FF"
          />
        </svg>
      </div>
      <div className="wave-layer wave-front">
        <svg viewBox="0 0 200 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,24 C12,14 28,34 45,24 C62,14 78,34 95,24 C112,14 128,34 145,24 C162,14 178,34 200,24 L200,40 L0,40 Z"
            fill="#0057FF"
          />
        </svg>
      </div>
    </>
  );
}

export default function Throne({ business, nextPrice, onClaimClick }) {
  if (!business) {
    return (
      <div className="throne">
        <p className="eyebrow">👑 Elite Site #1</p>
        <p className="desc">Nobody has claimed the top spot yet — be the first.</p>
      </div>
    );
  }

  return (
    <div className="throne">
      <WaveLayers />
      <p className="eyebrow">👑 Elite Site #1</p>
      <div className="logo-ring-wrap">
        <div className="logo-ring">
          {business.logo ? <img src={business.logo} alt={`${business.name} logo`} /> : initials(business.name)}
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

      <hr className="throne-divider" />

      <div className="throne-cta">
        {nextPrice != null && <span className="price-corner-badge">{formatINR(nextPrice)}</span>}
        <button className="btn btn-gold" onClick={onClaimClick}>
          Claim #1
        </button>
        <p className="throne-note">
          Beat the current amount to take the top spot. It's yours the moment payment clears.
        </p>
      </div>
    </div>
  );
}
