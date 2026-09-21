import { formatINR, initials } from '../utils/format.js';

export default function PayStep({ draft, nextPrice, previousAmount, onCancel, onPay, submitting, serverError }) {
  return (
    <div className="card">
      <button className="card-close" onClick={onCancel} aria-label="Close">
        ×
      </button>
      <h2>Pay to become #1</h2>
      <p className="sub">This is a one-time payment. You're #1 the second it's confirmed.</p>

      <div className="pay-preview">
        <div className="thumb">{draft.logo ? <img src={draft.logo} alt="" /> : initials(draft.name)}</div>
        <div>
          <div className="name">{draft.name}</div>
          <div className="url">{draft.url}</div>
        </div>
      </div>

      <div className="price-box">
        <div className="k">Amount to claim #1</div>
        <div className="v">{formatINR(nextPrice)}</div>
        <div className="why">
          {previousAmount != null
            ? `${formatINR(nextPrice - previousAmount)} more than the current #1 paid (${formatINR(previousAmount)})`
            : 'Minimum entry amount for the very first business on the board'}
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', margin: '4px 0 18px' }}>
        You'll be taken to Razorpay's secure checkout to pay by UPI, card, or netbanking. We never see or store your
        payment details.
      </p>

      {serverError && <p className="err" style={{ display: 'block' }}>{serverError}</p>}

      <button className="btn btn-gold" onClick={onPay} disabled={submitting}>
        {submitting ? 'Processing…' : `Pay ${formatINR(nextPrice)}`}
      </button>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 14 }}>
        Payments are processed securely by Razorpay. Your position updates immediately after confirmation.
      </p>
    </div>
  );
}
