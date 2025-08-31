const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@adiwajshing/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger: P({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  // Load commands secara dinamis
  const commands = new Map();
  const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(__dirname, 'commands', file));
    commands.set(command.name, command);
  }

  // Fungsi bantu cek admin grup
  async function isGroupAdmin(jid, userId) {
    try {
      const metadata = await sock.groupMetadata(jid);
      return metadata.participants.some(p => p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch {
      return false;
    }
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.key.participant || msg.key.remoteJid;

    let text = '';
    if (msg.message.conversation) text = msg.message.conversation;
    else if (msg.message.extendedTextMessage) text = msg.message.extendedTextMessage.text;
    else return;

    const prefix = '!';
    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    if (!commands.has(cmdName)) return;

    const command = commands.get(cmdName);

    // Cek admin untuk perintah grup
    if (command.admin && isGroup) {
      const isAdmin = await isGroupAdmin(from, sender);
      if (!isAdmin) {
        await sock.sendMessage(from, { text: 'This command only for admin group.' }, { quoted: msg });
        return;
      }
    }

    try {
      await command.execute(sock, msg, args);
    } catch (err) {
      await sock.sendMessage(from, { text: `Error: ${err.message}` }, { quoted: msg });
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if ((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
        startBot();
      } else {
        console.log('connection ended. you are already logout .');
      }
    } else if (connection === 'open') {
      console.log('Bot connected to WhatsApp');
    }
  });
}

startBot();
