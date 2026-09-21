export default function Header({ crumb, onCrumbClick, onLogoClick }) {
  return (
    <header>
      <div className="wrap header-row">
        <div className="logo" onClick={onLogoClick} style={{ cursor: 'pointer' }} role="button" tabIndex={0}>
          <span className="mark">A</span>
          AkatuskiSites
        </div>
        {crumb && (
          <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>
            {/* <button className="crumb" onClick={onCrumbClick}>
              ← Cancel
            </button> */}
          </span>
        )}
      </div>
    </header>
  );
}
