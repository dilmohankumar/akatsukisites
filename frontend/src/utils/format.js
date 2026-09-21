export function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

export function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}
