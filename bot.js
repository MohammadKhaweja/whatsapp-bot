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

    // Search in CARMDI table for all matching records
    db.all(
      `SELECT * FROM CARMDI WHERE ActualNB = ? ORDER BY CodeDesc`,
      [plateNumber],
      (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          message.reply('Error searching the vehicle database.');
          return;
        }

        if (rows && rows.length > 0) {
          let response = `🚗 *Vehicle Registration Details* 🚗\n`;
          response += `📌 *Plate Number:* ${plateNumber}\n\n`;

          // Group by CodeDesc if there are multiple records
          if (rows.length > 1) {
            response += `ℹ️ *Note:* This plate has ${rows.length} records with different codes:\n\n`;
          }

          rows.forEach((row, index) => {
            if (rows.length > 1) {
              response += `📋 *Record ${index + 1} (Code: ${
                row.CodeDesc || 'N/A'
              })*\n`;
            }

            response += `
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

            // Add separator if there are more records
            if (index < rows.length - 1) {
              response += '\n────────────────────\n';
            }
          });

          message.reply(response);
        } else {
          message.reply(`No vehicle found with plate number: ${plateNumber}`);
        }
      }
    );
  }
});

client.initialize();
