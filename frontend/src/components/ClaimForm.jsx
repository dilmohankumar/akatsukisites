import { useState } from 'react';

const MAX_DESC = 140;

export default function ClaimForm({ onCancel, onContinue }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [errors, setErrors] = useState({});

  function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogo(ev.target.result);
      setLogoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  function validate() {
    const next = {};
    if (!name.trim()) next.name = "Enter a name so people know who's #1.";
    if (!url.trim()) next.url = 'Enter a valid website address.';
    if (!description.trim()) next.description = 'Add a short description — this is what people will read.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onContinue({ name: name.trim(), url: url.trim(), description: description.trim(), logo });
  }

  return (
    <div className="card">
      <button className="card-close" onClick={onCancel} aria-label="Close">
        ×
      </button>
      <h2>Claim #1</h2>
      <p className="sub">Fill this in once. It's exactly what visitors will see when your site is on top.</p>

      <div className={`field ${errors.name ? 'invalid' : ''}`}>
        <label htmlFor="in-site-name">Website / business name</label>
        <input
          id="in-site-name"
          placeholder="e.g. Meera's Bakery"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <p className="err">{errors.name}</p>}
      </div>

      <div className={`field ${errors.url ? 'invalid' : ''}`}>
        <label htmlFor="in-site-url">Website URL</label>
        <input
          id="in-site-url"
          placeholder="e.g. meerasbakery.in"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {errors.url && <p className="err">{errors.url}</p>}
      </div>

      <div className="field">
        <label>
          Logo <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>(optional)</span>
        </label>
        <div className="logo-upload">
          <div className="logo-preview">
            {logoPreview ? <img src={logoPreview} alt="Logo preview" /> : 'No logo'}
          </div>
          <button className="btn btn-outline btn-sm file-btn" style={{ width: 'auto' }} type="button">
            Upload logo
            <input type="file" accept="image/*" onChange={handleLogo} />
          </button>
        </div>
      </div>

      <div className={`field ${errors.description ? 'invalid' : ''}`}>
        <label htmlFor="in-desc">Description</label>
        <textarea
          id="in-desc"
          maxLength={MAX_DESC}
          placeholder="One or two lines about what you do."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="char-count">
          {description.length}/{MAX_DESC}
        </p>
        {errors.description && <p className="err">{errors.description}</p>}
      </div>

      <button className="btn btn-navy" onClick={handleSubmit}>
        Continue to payment
      </button>
    </div>
  );
}
