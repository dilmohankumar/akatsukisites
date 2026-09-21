import { useState } from 'react';
import { createTicket } from '../api/support.js';

const MAX_DETAILS = 2000;
const EMPTY_FORM = { name: '', email: '', topic: '', details: '', company: '' };

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const topic = form.topic.trim();
  const details = form.details.trim();

  if (!name) errors.name = 'Your name is required.';
  else if (name.length > 80) errors.name = 'Name must be 80 characters or fewer.';

  if (!email) errors.email = 'Email is required.';
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.';

  if (!topic) errors.topic = "Tell us what this is about.";
  else if (topic.length < 3) errors.topic = 'Give us a bit more detail in the subject.';
  else if (topic.length > 140) errors.topic = 'Subject must be 140 characters or fewer.';

  if (details.length > MAX_DETAILS) errors.details = `Details must be ${MAX_DETAILS} characters or fewer.`;

  return errors;
}

export default function SupportModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [refCode, setRefCode] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    // Clear that field's error as soon as the person starts fixing it.
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }

  function reset() {
    setForm(EMPTY_FORM);
    setRefCode(null);
    setErrors({});
    setServerError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setServerError(null);
    setSubmitting(true);
    try {
      const data = await createTicket({
        name: form.name.trim(),
        email: form.email.trim(),
        topic: form.topic.trim(),
        details: form.details.trim(),
        company: form.company, // honeypot — left empty by real visitors
      });
      setRefCode(data.refCode);
    } catch (err) {
      if (err.errors?.length) {
        setErrors(Object.fromEntries(err.errors.map((e) => [e.field, e.message])));
      }
      setServerError(err.message || 'Could not submit the ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay show">
      <div className="modal-sheet">
        {!refCode ? (
          <div>
            <div className="modal-head">
              <h2>support</h2>
              <button className="modal-close" onClick={handleClose} aria-label="Close">
                ×
              </button>
            </div>
            <p className="sub">Tell us. We reply by email.</p>

            {/* Honeypot — hidden from real visitors via CSS + tabIndex/aria, but bots that
                blindly fill every field in a scraped form will fill this one too. */}
            <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
              <label htmlFor="tk-company">Company</label>
              <input
                id="tk-company"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={form.company}
                onChange={(e) => update('company', e.target.value)}
              />
            </div>

            <div className={`field ${errors.name ? 'invalid' : ''}`}>
              <label htmlFor="tk-name">Your name</label>
              <input
                id="tk-name"
                placeholder="Full name"
                maxLength={80}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'tk-name-err' : undefined}
              />
              {errors.name && <p className="err" id="tk-name-err">{errors.name}</p>}
            </div>
            <div className={`field ${errors.email ? 'invalid' : ''}`}>
              <label htmlFor="tk-email">Email</label>
              <input
                id="tk-email"
                type="email"
                placeholder="you@business.com"
                maxLength={120}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'tk-email-err' : undefined}
              />
              {errors.email && <p className="err" id="tk-email-err">{errors.email}</p>}
            </div>
            <div className={`field ${errors.topic ? 'invalid' : ''}`}>
              <label htmlFor="tk-topic">What's this about</label>
              <input
                id="tk-topic"
                placeholder="?"
                maxLength={140}
                value={form.topic}
                onChange={(e) => update('topic', e.target.value)}
                aria-invalid={!!errors.topic}
                aria-describedby={errors.topic ? 'tk-topic-err' : undefined}
              />
              {errors.topic && <p className="err" id="tk-topic-err">{errors.topic}</p>}
            </div>
            <div className={`field ${errors.details ? 'invalid' : ''}`}>
              <label htmlFor="tk-msg">Details</label>
              <textarea
                id="tk-msg"
                placeholder="?"
                maxLength={MAX_DETAILS}
                value={form.details}
                onChange={(e) => update('details', e.target.value)}
                aria-invalid={!!errors.details}
                aria-describedby={errors.details ? 'tk-msg-err' : undefined}
              />
              <p className="char-count">
                {form.details.length}/{MAX_DETAILS}
              </p>
              {errors.details && <p className="err" id="tk-msg-err">{errors.details}</p>}
            </div>

            {serverError && <p className="err" style={{ display: 'block' }} role="alert">{serverError}</p>}

            <button className="btn btn-navy" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </div>
        ) : (
          <div className="ticket-success show">
            <div className="ring">✓</div>
            <h2 style={{ fontFamily: 'var(--serif)', margin: '0 0 8px' }}>Ticket raised</h2>
            <p style={{ marginBottom: 22 }}>
              Reference <b style={{ fontFamily: 'var(--mono)' }}>{refCode}</b> — we'll email you within 24 hours.
            </p>
            <button className="btn btn-outline" onClick={handleClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
