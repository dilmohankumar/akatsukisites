import { ApiError } from './apiResponse.js';

// Anything that isn't already a plain string (an object/array — e.g. a
// NoSQL-injection-shaped payload like {"$gt": ""}) is treated as absent
// rather than crashing on `.trim()` further down.
function asString(value) {
  return typeof value === 'string' ? value : '';
}

// Small image data-URI or an https image URL only — nothing else is a valid "logo".
const LOGO_LIKE = /^(data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=]+|https:\/\/\S+)$/i;
const MAX_LOGO_LENGTH = 700_000; // ~512KB decoded — enough for a small logo, bounded for document size/memory.

export function validateClaimPayload(body) {
  const errors = [];
  const name = asString(body.name).trim();
  const url = asString(body.url).trim();
  const description = asString(body.description).trim();
  const logo = typeof body.logo === 'string' ? body.logo : null;

  if (!name) errors.push({ field: 'name', message: 'Business name is required' });
  if (name.length > 60) errors.push({ field: 'name', message: 'Name must be 60 characters or fewer' });

  if (!url) errors.push({ field: 'url', message: 'Website URL is required' });
  else if (url.length > 200) errors.push({ field: 'url', message: 'URL is too long' });

  if (!description) errors.push({ field: 'description', message: 'Description is required' });
  if (description.length > 140) errors.push({ field: 'description', message: 'Description must be 140 characters or fewer' });

  if (logo && typeof logo === 'string') {
    if (logo.length > MAX_LOGO_LENGTH) {
      errors.push({ field: 'logo', message: 'Logo image is too large' });
    } else if (!LOGO_LIKE.test(logo)) {
      errors.push({ field: 'logo', message: 'Logo must be an uploaded image or a valid https image URL' });
    }
  }

  if (errors.length) throw new ApiError(422, 'Validation failed', errors);

  return { name, url, description, logo };
}

// Removes markup rather than rejecting the submission outright — a support
// message legitimately typed by a human is never supposed to contain tags,
// so this is pure defense-in-depth against stored XSS if a message is ever
// rendered somewhere that isn't React (e.g. a plain-text email, a log viewer).
function stripHtml(value) {
  return value.replace(/<[^>]*>/g, '');
}

export function validateSupportPayload(body) {
  const errors = [];
  const name = stripHtml(asString(body.name).trim());
  const email = asString(body.email).trim().toLowerCase();
  const topic = stripHtml(asString(body.topic).trim());
  const details = stripHtml(asString(body.details).trim());

  if (!name) errors.push({ field: 'name', message: 'Your name is required' });
  else if (name.length < 2) errors.push({ field: 'name', message: 'Name is too short' });
  else if (name.length > 80) errors.push({ field: 'name', message: 'Name must be 80 characters or fewer' });

  if (!email) errors.push({ field: 'email', message: 'Email is required' });
  else if (email.length > 120) errors.push({ field: 'email', message: 'Email is too long' });
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.push({ field: 'email', message: 'Enter a valid email address' });

  if (!topic) errors.push({ field: 'topic', message: "Tell us what this is about" });
  else if (topic.length < 3) errors.push({ field: 'topic', message: 'Give us a bit more detail in the subject' });
  else if (topic.length > 140) errors.push({ field: 'topic', message: 'Subject must be 140 characters or fewer' });

  if (details.length > 2000) errors.push({ field: 'details', message: 'Details must be 2000 characters or fewer' });

  if (errors.length) throw new ApiError(422, 'Validation failed', errors);

  return { name, email, topic, details };
}
