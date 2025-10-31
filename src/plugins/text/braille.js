// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { letterTrans } from 'custom-translate';

const braille = { 'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚', 'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞', 'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵', 'A': '⠠⠁', 'B': '⠠⠃', 'C': '⠠⠉', 'D': '⠠⠙', 'E': '⠠⠑', 'F': '⠠⠋', 'G': '⠠⠛', 'H': '⠠⠓', 'I': '⠠⠊', 'J': '⠠⠚', 'K': '⠠⠅', 'L': '⠠⠇', 'M': '⠠⠍', 'N': '⠠⠝', 'O': '⠠⠕', 'P': '⠠⠏', 'Q': '⠠⠟', 'R': '⠠⠗', 'S': '⠠⠎', 'T': '⠠⠞', 'U': '⠠⠥', 'V': '⠠⠧', 'W': '⠠⠺', 'X': '⠠⠭', 'Y': '⠠⠽', 'Z': '⠠⠵', '0': '⠼⠚', '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑', '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '.': '⠲', ',': '⠂', '!': '⠖', '?': '⠦', "'": '⠄', '"': '⠄⠶', ':': '⠒', ';': '⠆', '-': '⠤', '(': '⠐⠣', ')': '⠐⠜' };

export const command = {
  name: 'braille',
  category: 'text',
  description: 'Mengubah teks menjadi braille',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sReply, arg }) => {
    let b;
    if ((quotedMsg && quotedMsg?.type === 'extendedTextMessage') || (quotedMsg && quotedMsg?.type === 'conversation')) {
      b = quotedMsg?.body;
    } else if (arg.length > 0) {
      b = arg;
    } else {
      return await sReply(`Mohon berikan teks yang ingin diubah ke Braille.`);
    }
    await sReply(letterTrans(b, braille));
  }
};
