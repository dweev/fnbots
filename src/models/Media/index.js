/**
 * @file src/models/Media/index.js
 * Mengelola model media dan skema.
 * Created with ❤️ and 💦 By FN
 */

import mongoose from 'mongoose';
import mediaSchema from './schema.js';

const Media = mongoose.model('Media', mediaSchema);

export default Media;
