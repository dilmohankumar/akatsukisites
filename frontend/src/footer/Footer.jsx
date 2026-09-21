import './Footer.css';
import upiQr from './upi-qr.png';

/**
 * Fully self-contained — drop this whole `footer/` folder into any React
 * project, import and render <Footer onRaiseTicket={...} />, and it looks
 * and works exactly the same. It brings its own CSS (Footer.css, scoped
 * under the .ak-footer prefix so it can't collide with the host site's
 * classes) and its own QR image — nothing here reads a global stylesheet,
 * a CSS variable, or a shared class name from the rest of this app.
 */
export default function Footer({ onRaiseTicket }) {
  return (
    <footer className="ak-footer">
      <div className="ak-footer-wrap">
        <div className="ak-footer-columns">
          <div className="ak-footer-qr-block">
            <div className="ak-footer-qr-box">
              <img src={upiQr} alt="UPI QR code" />
            </div>
          </div>

          <div className="ak-footer-text-columns">
            <div className="ak-footer-block">
              <p className="ak-footer-label">Support the developer</p>
              <p className="ak-footer-title">Buy me a chai ☕</p>
              <p className="ak-footer-desc">
                AkatuskiSites is built and maintained independently. If it's useful to you, a small contribution
                helps keep it running.
              </p>
              <p className="ak-footer-scan-id">
                <span className="ak-footer-scan-id-label">UPI ID: </span>9218600126@axisbank
              </p>
            </div>

            <div className="ak-footer-block">
              <p className="ak-footer-title">support</p>
              <p className="ak-footer-desc">Raise a ticket and we'll email you back.</p>
              <button className="ak-footer-link-btn" onClick={onRaiseTicket}>
                support →
              </button>
            </div>
          </div>
        </div>

        <div className="ak-footer-bottom">
          <span>© 2026 AkatuskiSites — Welcome to the millionaires club.</span>
        </div>
      </div>
    </footer>
  );
}
