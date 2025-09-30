// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

const zalgo = {
  "up": ["̍", "̎", "̄", "̅", "̿", "̑", "̆", "̐", "͒", "͗", "͑", "̇", "̈", "̊", "͂", "̓", "̈", "͊", "͋", "͌", "̃", "̂", "̌", "͐", "̀", "́", "̋", "̏", "̒", "̓", "̔", "̽", "̉", "ͣ", "ͤ", "ͥ", "ͦ", "ͧ", "ͨ", "ͩ", "ͪ", "ͫ", "ͬ", "ͭ", "ͮ", "ͯ", "̾", "͛", "͆", "̚"],
  "middle": ["̕", "̛", "̀", "́", "͘", "̡", "̢", "̧", "̨", "̴", "̵", "̶", "͜", "͝", "͞", "͟", "͠", "͢", "̸", "̷", "͡", "҉"],
  "down": ["̖", "̗", "̘", "̙", "̜", "̝", "̞", "̟", "̠", "̤", "̥", "̦", "̩", "̪", "̫", "̬", "̭", "̮", "̯", "̰", "̱", "̲", "̳", "̹", "̺", "̻", "̼", "ͅ", "͇", "͈", "͉", "͍", "͎", "͓", "͔", "͕", "͖", "͙", "͚", "̣"]
};

export const command = {
  name: 'zalgo',
  category: 'text',
  description: 'Mengubah teks menjadi zalgo',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sReply, arg }) => {
    let text
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      text = quotedMsg?.body
    } else if (arg.length > 0) {
      text = arg
    } else {
      return await sReply(`Mohon berikan teks yang ingin di-zalgo.`);
    }
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += text[i];
      for (const chars of Object.values(zalgo)) {
        let count = Math.floor(Math.random() * 5)
        while (count--) result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    await sReply(result);
  }
};