// Mock kafkajs - declare mocks first
const mockConnect = jest.fn();
const mockSend = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => ({
    producer: () => ({
      connect: mockConnect,
      send: mockSend,
      disconnect: mockDisconnect
    })
  })),
  Partitioners: {
    LegacyPartitioner: jest.fn()
  }
}));

// Mock console methods to reduce test noise
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const { connectProducer, sendEnrichedTransaction, disconnectProducer } = require('../Producer');

describe('Kafka Producer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should connect to Kafka producer', async () => {
    mockConnect.mockResolvedValue();

    await connectProducer();

    expect(mockConnect).toHaveBeenCalled();
  });

  test('should send enriched transaction', async () => {
    const enrichedTx = {
      transactionId: '123e4567-e89b-12d3-a456-426614174000',
      validationStatus: 'valid',
      processedAt: '2025-01-08T10:00:00Z',
      amount: 100,
      currency: 'USD'
    };

    mockSend.mockResolvedValue();

    await sendEnrichedTransaction(enrichedTx);

    expect(mockSend).toHaveBeenCalledWith({
      topic: 'data-enriched-transactions',
      messages: [{
        key: '123e4567-e89b-12d3-a456-426614174000',
        value: JSON.stringify(enrichedTx)
      }]
    });
  });

  test('should handle send errors gracefully', async () => {
    const enrichedTx = { transactionId: '123' };
    mockSend.mockRejectedValue(new Error('Kafka error'));

    // Should not throw
    await expect(sendEnrichedTransaction(enrichedTx)).resolves.toBeUndefined();
  });

  test('should disconnect producer', async () => {
    mockDisconnect.mockResolvedValue();

    await disconnectProducer();

    expect(mockDisconnect).toHaveBeenCalled();
  });
});

