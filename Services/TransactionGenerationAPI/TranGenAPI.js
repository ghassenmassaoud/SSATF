require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const { Kafka } = require('kafkajs');
const cors = require('cors');
const fs = require('fs');
const csvParser = require('csv-parser');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 7000;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({ clientId: 'transaction-generator', brokers: [KAFKA_BROKER] });
const producer = kafka.producer();

let currentDbClient = null;

async function connectKafkaProducer() {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (err) {
    console.error('❌ Kafka connection failed:', err.message);
    process.exit(1);
  }
}

async function sendToKafka(transactions) {
  const messages = transactions.map(tx => ({
    key: tx._id?.toString() || Math.random().toString(),
    value: JSON.stringify(tx),
  }));

  return producer.send({ topic: 'Transaction-Topic', messages });
}

// 📁 Upload file endpoint
app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const ext = file.originalname.split('.').pop();
    let transactions = [];

    if (ext === 'json') {
      const raw = fs.readFileSync(file.path);
      transactions = JSON.parse(raw);
    } else if (ext === 'csv') {
      const rows = [];
      fs.createReadStream(file.path)
        .pipe(csvParser())
        .on('data', data => rows.push(data))
        .on('end', async () => {
          await sendToKafka(rows);
          res.json({ message: "✅ CSV data sent to Kafka" });
        });
      return; // Exit early for async CSV stream
    } else {
      return res.status(400).json({ error: "❌ Unsupported file type" });
    }

    await sendToKafka(transactions);
    res.json({ message: "✅ JSON data sent to Kafka" });
  } catch (err) {
    console.error('❌ File upload failed:', err.message);
    res.status(500).json({ error: '❌ Failed to process file' });
  }
});

// 🌐 MongoDB ingestion endpoint
app.post('/use-mongo', async (req, res) => {
  const { uri, dbName, collectionName } = req.body;

  try {
    if (currentDbClient) await currentDbClient.close();
    currentDbClient = new MongoClient(uri);
    await currentDbClient.connect();

    const db = currentDbClient.db(dbName);
    const transactions = await db.collection(collectionName).find({}).toArray();

    await sendToKafka(transactions);
    res.json({ message: "✅ MongoDB data sent to Kafka" });
  } catch (err) {
    console.error('❌ Mongo error:', err.message);
    res.status(500).json({ error: "❌ MongoDB connection or fetch failed" });
  }
});

// Export the app for testing
module.exports = app;

// Only start server if this file is run directly (not imported)
if (require.main === module) {
  connectKafkaProducer().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 TransactionGenerationAPI running on port ${PORT}`);
    });
  });
}
