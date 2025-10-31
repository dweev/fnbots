// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/errorManager.js ────────────────

export class MediaValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MediaValidationError';
    this.details = details;
  }
}

export class MediaProcessingError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MediaProcessingError';
    this.details = details;
  }
}

export class MediaSizeError extends Error {
  constructor(message, size, maxSize) {
    super(message);
    this.name = 'MediaSizeError';
    this.size = size;
    this.maxSize = maxSize;
  }
}
