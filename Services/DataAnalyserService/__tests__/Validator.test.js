const { validateTransaction } = require('../Validator');

describe('Transaction Validator', () => {
  describe('Bank Card Transactions', () => {
    test('should validate correct bank_card transaction', () => {
      const transaction = {
        amount: 100.50,
        currency: 'USD',
        timestamp: '2025-01-08T10:00:00Z',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        ipAddress: '192.168.1.1',
        type: 'bank_card',
        details: {
          cardNumber: '4111111111111111',
          cvv: '123',
          bin: '411111',
          expiryDate: '12/25',
          bank: 'Test Bank'
        }
      };

      const result = validateTransaction(transaction);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.enrichedTransaction.validationStatus).toBe('valid');
      expect(result.enrichedTransaction.processedAt).toBeDefined();
    });

    test('should reject invalid card number', () => {
      const transaction = {
        amount: 100,
        currency: 'USD',
        timestamp: '2025-01-08T10:00:00Z',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        ipAddress: '192.168.1.1',
        type: 'bank_card',
        details: {
          cardNumber: '1234567890123456', // Invalid card number
          cvv: '123',
          bin: '411111',
          expiryDate: '12/25',
          bank: 'Test Bank'
        }
      };

      const result = validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Card number must be valid (Luhn algorithm).');
      expect(result.recommendations).toContain('Verify the card number format.');
    });
  });

  describe('Cryptocurrency Transactions', () => {
    test('should validate correct cryptocurrency transaction', () => {
      const transaction = {
        amount: 0.5,
        currency: 'USD', // Use USD as the fiat equivalent
        timestamp: '2025-01-08T10:00:00Z',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        ipAddress: '192.168.1.1',
        type: 'cryptocurrency',
        details: {
          walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          exchangeRate: 45000.50,
          txHash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678'
        }
      };

      const result = validateTransaction(transaction);
      
      expect(result.isValid).toBe(true);
      expect(result.enrichedTransaction.validationStatus).toBe('valid');
    });

    test('should reject invalid hash format', () => {
      const transaction = {
        amount: 0.5,
        currency: 'USD',
        timestamp: '2025-01-08T10:00:00Z',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        ipAddress: '192.168.1.1',
        type: 'cryptocurrency',
        details: {
          walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          exchangeRate: 45000.50,
          txHash: 'abc123' // Too short, not 64 characters
        }
      };

      const result = validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hash must be 64-character hexadecimal string.');
    });
  });

  describe('General Validation', () => {
    test('should reject negative amount', () => {
      const transaction = {
        amount: -50,
        currency: 'USD',
        timestamp: '2025-01-08T10:00:00Z',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        ipAddress: '192.168.1.1',
        type: 'bank_card',
        details: {}
      };

      const result = validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than zero.');
    });

    test('should reject invalid currency', () => {
      const transaction = {
        amount: 100,
        currency: 'INVALID',
        timestamp: '2025-01-08T10:00:00Z',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        ipAddress: '192.168.1.1',
        type: 'bank_card',
        details: {}
      };

      const result = validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Currency must be a valid ISO 4217 code.');
    });

    test('should reject future timestamp', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const transaction = {
        amount: 100,
        currency: 'USD',
        timestamp: futureDate.toISOString(),
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        ipAddress: '192.168.1.1',
        type: 'bank_card',
        details: {}
      };

      const result = validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp must not be in the future.');
    });
  });
});







