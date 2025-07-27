const { validate: isUUID } = require('uuid');
const isValidCurrency = require('currency-codes').code;
const moment = require('moment-timezone');
const validator = require('validator');

// Helper function to add validation error
function addError(errors, recommendations, errorMsg, recommendationMsg) {
  errors.push(errorMsg);
  recommendations.push(recommendationMsg);
}

// Basic transaction field validators
function validateBasicFields(transaction, errors, recommendations) {
  if (transaction.amount <= 0) {
    addError(errors, recommendations, 
      "Amount must be greater than zero.", 
      "Ensure the transaction amount is a positive number.");
  }

  if (!isValidCurrency(transaction.currency)) {
    addError(errors, recommendations,
      "Currency must be a valid ISO 4217 code.",
      "Use accepted currency codes like USD, EUR, TND.");
  }

  validateTimestamp(transaction.timestamp, errors, recommendations);
  
  if (!isUUID(transaction.transactionId)) {
    addError(errors, recommendations,
      "Transaction ID must be a valid UUID.",
      "Use a UUID v4 string for transaction ID.");
  }

  if (!validator.isIP(transaction.ipAddress || '')) {
    addError(errors, recommendations,
      "IP Address must be a valid IPv4 or IPv6 address.",
      "Verify the client's IP address format.");
  }
}

function validateTimestamp(timestamp, errors, recommendations) {
  if (!moment(timestamp, moment.ISO_8601, true).isValid()) {
    addError(errors, recommendations,
      "Timestamp must be in valid ISO 8601 format.",
      "Use a standard timestamp like '2025-07-08T14:30:00Z'.");
  } else if (new Date(timestamp) > new Date()) {
    addError(errors, recommendations,
      "Timestamp must not be in the future.",
      "Use a valid timestamp not ahead of current time.");
  }
}

// Transaction type validators
function validateBankCard(details, errors, recommendations) {
  if (!validator.isCreditCard(details.cardNumber || '')) {
    addError(errors, recommendations,
      "Card number must be valid (Luhn algorithm).",
      "Verify the card number format.");
  }
  
  if (!/^\d{3}$/.test(details.cvv || '')) {
    addError(errors, recommendations,
      "CVV must be a 3-digit number.",
      "Ensure CVV is exactly 3 digits.");
  }
  
  if (!/^\d{6}$/.test(details.bin || '')) {
    addError(errors, recommendations,
      "BIN must be 6 digits.",
      "Ensure the BIN is a 6-digit number.");
  }
  
  if (!moment(details.expiryDate, "MM/YY", true).isValid() ||
      moment(details.expiryDate, "MM/YY").isBefore(moment())) {
    addError(errors, recommendations,
      "Expiry date must be in the future.",
      "Use a valid MM/YY date that's not expired.");
  }
  
  if (!details.bank) {
    addError(errors, recommendations,
      "Bank name must not be empty.",
      "Provide the issuing bank's name.");
  }
}

function validateBankTransfer(details, errors, recommendations) {
  if (!/^([A-Z]{2})(\d{2})([A-Z0-9]{1,30})$/.test(details.iban || '')) {
    addError(errors, recommendations,
      "IBAN must follow country format.",
      "Ensure the IBAN is well-formed (e.g., FR76...).");
  }
  
  if (!/^[A-Z]{8,11}$/.test(details.bic || '')) {
    addError(errors, recommendations,
      "BIC must be 8 or 11 uppercase characters.",
      "Use a valid SWIFT/BIC code.");
  }
  
  if (!details.timezone || !moment.tz.zone(details.timezone)) {
    addError(errors, recommendations,
      "Timezone must be a valid tz database name.",
      "Use formats like 'Europe/Paris'.");
  }
}

function validateMobilePayment(details, errors, recommendations) {
  if (!/^\+\d{6,15}$/.test(details.phoneNumber || '')) {
    addError(errors, recommendations,
      "Phone number must follow international format.",
      "Use format like '+21650123456'.");
  }
  
  if (!['Ooredoo', 'Orange', 'Tunisie Telecom'].includes(details.operator)) {
    addError(errors, recommendations,
      "Operator must be in known operator list.",
      "Use a known operator like Ooredoo.");
  }
  
  if (!['3G', '4G', '5G', 'WiFi'].includes(details.networkType)) {
    addError(errors, recommendations,
      "Network type must be 3G, 4G, 5G, or WiFi.",
      "Ensure correct network type is used.");
  }
}

function validateEWallet(details, errors, recommendations, transaction) {
  if (!['PayPal', 'Apple Pay', 'Google Pay'].includes(details.provider)) {
    addError(errors, recommendations,
      "Provider must be PayPal, Apple Pay, or Google Pay.",
      "Use one of the supported wallet providers.");
  }
  
  if (!['debit', 'credit'].includes((details.linkedCardType || '').toLowerCase())) {
    addError(errors, recommendations,
      "Linked card type must be debit or credit.",
      "Use 'debit' or 'credit' as card type.");
  }
  
  if (details.lastActivity && new Date(details.lastActivity) > new Date(transaction.timestamp)) {
    addError(errors, recommendations,
      "Last activity must be before the transaction timestamp.",
      "Verify last usage timestamp.");
  }
}

function validateElectronicCheck(details, errors, recommendations) {
  if (details.signature !== 'Valid') {
    addError(errors, recommendations,
      "Signature must be 'Valid'.",
      "Ensure the check signature is valid.");
  }
  
  if (!['accepted', 'rejected', 'pending'].includes(details.status)) {
    addError(errors, recommendations,
      "Status must be accepted, rejected, or pending.",
      "Provide correct check status.");
  }
  
  if (!/^([A-Z]{2})(\d{2})([A-Z0-9]{1,30})$/.test(details.iban || '')) {
    addError(errors, recommendations,
      "IBAN format must be respected.",
      "Provide a valid IBAN.");
  }
}

function validateCryptocurrency(details, errors, recommendations) {
  if (!/^[a-zA-Z0-9]{25,42}$/.test(details.walletAddress || '')) {
    addError(errors, recommendations,
      "Wallet address format is invalid.",
      "Ensure wallet address matches crypto format.");
  }
  
  if (!(details.exchangeRate > 0)) {
    addError(errors, recommendations,
      "Exchange rate must be greater than zero.",
      "Provide a positive exchange rate.");
  }
  
  if (!/^[a-fA-F0-9]{64}$/.test(details.txHash || '')) {
    addError(errors, recommendations,
      "Hash must be 64-character hexadecimal string.",
      "Use proper hash format (SHA256).");
  }
}

// Transaction type validator mapping
const typeValidators = {
  'bank_card': validateBankCard,
  'bank_transfer': validateBankTransfer,
  'mobile_payment': validateMobilePayment,
  'e_wallet': validateEWallet,
  'electronic_check': validateElectronicCheck,
  'cryptocurrency': validateCryptocurrency
};

function validateTransaction(transaction) {
  const errors = [];
  const recommendations = [];

  // Validate basic fields
  validateBasicFields(transaction, errors, recommendations);

  // Validate transaction type specific fields
  const details = transaction.details || {};
  const validator = typeValidators[transaction.type];
  
  if (validator) {
    validator(details, errors, recommendations, transaction);
  } else {
    addError(errors, recommendations,
      "Unknown transaction type.",
      "Use a supported transaction type.");
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    recommendations,
    enrichedTransaction: {
      ...transaction,
      validationStatus: isValid ? 'valid' : 'invalid',
      failureReasons: isValid ? [] : errors,
      recommendations: isValid ? [] : recommendations,
      processedAt: new Date().toISOString()
    }
  };
}

module.exports = { validateTransaction };
