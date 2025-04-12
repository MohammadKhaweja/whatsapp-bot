require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const sqlite3 = require('sqlite3').verbose();

// Initialize SQLite database with your CARMDI table
const db = new sqlite3.Database('./your_database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the vehicle database');
    // Verify table exists (optional)
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='CARMDI'",
      (err, row) => {
        if (err) {
          console.error('Error checking table:', err);
        } else if (!row) {
          console.error('CARMDI table not found in the database');
        }
      }
    );
  }
});

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('QR Code generated, scan it with WhatsApp.');
});

client.on('ready', () => {
  console.log('WhatsApp bot is ready!');
});

client.on('message', async (message) => {
  console.log(`Message received: ${message.body}`);

  if (message.body.toLowerCase().startsWith('/plate')) {
    const plateNumber = message.body.substring(6).trim().toUpperCase();

    if (!plateNumber) {
      message.reply(
        'Please provide a plate number after /plate command. Example: /plate ABC123'
      );
      return;
    }

    // Search in CARMDI table
    db.get(
      `SELECT * FROM CARMDI WHERE ActualNB = ?`,
      [plateNumber],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          message.reply('Error searching the vehicle database.');
          return;
        }

        if (row) {
          // Format the response with all relevant fields
          const response = `
🚗 *Vehicle Registration Details* 🚗
📌 *Plate Number:* ${row.ActualNB || 'N/A'}
📅 *Production Date:* ${row.PRODDATE || 'N/A'}
🛠️ *Chassis:* ${row.Chassis || 'N/A'}
🔧 *Engine:* ${row.Moteur || 'N/A'}
🎨 *Color:* ${row.CouleurDesc || 'N/A'}
🏷️ *Brand:* ${row.MarqueDesc || 'N/A'}
🚘 *Type:* ${row.TypeDesc || 'N/A'}
👥 *Usage:* ${row.UtilisDesc || 'N/A'}

👤 *Owner Information*
🧑 *Name:* ${row.Prenom || 'N/A'} ${row.Nom || 'N/A'}
🏠 *Address:* ${row.Addresse || 'N/A'}
📞 *Phone:* ${row.TelProp || 'N/A'}
🆔 *Reg Number:* ${row.NoRegProp || 'N/A'}
🎂 *Age:* ${row.AgeProp || 'N/A'}
📍 *Birth Place:* ${row.BirthPlace || 'N/A'}

📅 *Acquisition Date:* ${row.dateaquisition || 'N/A'}
🚦 *First Circulation:* ${row.PreMiseCirc || 'N/A'}
⚠️ *Out of Service:* ${row.HorsService ? 'Yes' : 'No'}
          `;
          message.reply(response);
        } else {
          message.reply(`No vehicle found with plate number: ${plateNumber}`);
        }
      }
    );
  }
});

client.initialize();
