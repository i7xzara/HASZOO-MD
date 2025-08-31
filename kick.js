module.exports = {
  name: 'kick',
  description: 'Kick the user from the group!! (admin only)',
  admin: true,
  execute: async (sock, msg) => {
    const from = msg.key.remoteJid;
    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, { text: 'This command just can be usein group.' }, { quoted: msg });
    }
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned || mentioned.length === 0) {
      return await sock.sendMessage(from, { text: 'Please mention the user u want to kick.' }, { quoted: msg });
    }
    try {
      await sock.groupParticipantsUpdate(from, mentioned, 'remove');
      await sock.sendMessage(from, { text: 'User  successfully kicked from the group.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `Failed kick the user: ${e.message}` }, { quoted: msg });
    }
  }
};
