export function showEmergency(overlay, messageElement, message) {
  messageElement.textContent = message || "Please follow club staff instructions.";
  overlay.hidden = false;
}

export function hideEmergency(overlay) {
  overlay.hidden = true;
}
