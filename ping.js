module.exports = {
  name: 'ping',
  description: 'Check responsivity bot',
  admin: false,
  execute: async (sock, msg) => {
    await sock.sendMessage(msg.key.remoteJid, { text: 'pong' }, { quoted: msg });
  }
};
