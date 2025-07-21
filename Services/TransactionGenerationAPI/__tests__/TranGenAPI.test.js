const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock Kafka producer
const mockSend = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => ({
    producer: () => ({
      connect: mockConnect,
      send: mockSend,
      disconnect: mockDisconnect
    })
  }))
}));

// Mock MongoDB
const mockFind = jest.fn();
const mockToArray = jest.fn();
const mockCollection = jest.fn();
const mockDb = jest.fn();
const mockClose = jest.fn();

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(() => ({
    connect: jest.fn(),
    db: mockDb,
    close: mockClose
  }))
}));

// Mock console.log to avoid noise in tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('TransactionGenerationAPI', () => {
  let app;

  beforeAll(() => {
    // Import app after mocks are set up
    app = require('../TranGenAPI.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue();
    mockSend.mockResolvedValue();
  });

  afterAll(async () => {
    // Clean up any open handles
    if (mockDisconnect) {
      await mockDisconnect();
    }
  });

  describe('POST /upload-file', () => {
    test('should process JSON file and send to Kafka', async () => {
      const testData = [
        { id: 1, amount: 100, currency: 'USD' },
        { id: 2, amount: 200, currency: 'EUR' }
      ];
      
      const filePath = path.join(__dirname, 'test.json');
      fs.writeFileSync(filePath, JSON.stringify(testData));

      const response = await request(app)
        .post('/upload-file')
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('✅ JSON data sent to Kafka');
      expect(mockSend).toHaveBeenCalledWith({
        topic: 'Transaction-Topic',
        messages: expect.arrayContaining([
          expect.objectContaining({
            key: expect.any(String),
            value: JSON.stringify(testData[0])
          }),
          expect.objectContaining({
            key: expect.any(String),
            value: JSON.stringify(testData[1])
          })
        ])
      });

      // Cleanup
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    test('should process CSV file and send to Kafka', (done) => {
      const csvContent = 'id,amount,currency\n1,100,USD\n2,200,EUR';
      const filePath = path.join(__dirname, 'test.csv');
      fs.writeFileSync(filePath, csvContent);

      request(app)
        .post('/upload-file')
        .attach('file', filePath)
        .end((err, response) => {
          expect(response.status).toBe(200);
          expect(response.body.message).toBe('✅ CSV data sent to Kafka');
          
          // Cleanup
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          done();
        });
    });

    test('should reject unsupported file types', async () => {
      const filePath = path.join(__dirname, 'test.txt');
      fs.writeFileSync(filePath, 'invalid content');

      const response = await request(app)
        .post('/upload-file')
        .attach('file', filePath);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('❌ Unsupported file type');
      expect(mockSend).not.toHaveBeenCalled();

      // Cleanup
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    test('should handle file processing errors', async () => {
      const filePath = path.join(__dirname, 'invalid.json');
      fs.writeFileSync(filePath, '{ invalid json');

      const response = await request(app)
        .post('/upload-file')
        .attach('file', filePath);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('❌ Failed to process file');

      // Cleanup
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  });

  describe('POST /use-mongo', () => {
    test('should connect to MongoDB and send data to Kafka', async () => {
      const mockTransactions = [
        { _id: '507f1f77bcf86cd799439011', amount: 100, currency: 'USD' },
        { _id: '507f1f77bcf86cd799439012', amount: 200, currency: 'EUR' }
      ];

      mockToArray.mockResolvedValue(mockTransactions);
      mockFind.mockReturnValue({ toArray: mockToArray });
      mockCollection.mockReturnValue({ find: mockFind });
      mockDb.mockReturnValue({ collection: mockCollection });

      const mongoConfig = {
        uri: 'mongodb://localhost:27017',
        dbName: 'testdb',
        collectionName: 'transactions'
      };

      const response = await request(app)
        .post('/use-mongo')
        .send(mongoConfig);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('✅ MongoDB data sent to Kafka');
      expect(mockSend).toHaveBeenCalledWith({
        topic: 'Transaction-Topic',
        messages: expect.arrayContaining([
          expect.objectContaining({
            key: '507f1f77bcf86cd799439011',
            value: JSON.stringify(mockTransactions[0])
          }),
          expect.objectContaining({
            key: '507f1f77bcf86cd799439012',
            value: JSON.stringify(mockTransactions[1])
          })
        ])
      });
    });

    test('should handle MongoDB connection errors', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const mongoConfig = {
        uri: 'mongodb://invalid:27017',
        dbName: 'testdb',
        collectionName: 'transactions'
      };

      const response = await request(app)
        .post('/use-mongo')
        .send(mongoConfig);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('❌ MongoDB connection or fetch failed');
    });
  });
});
