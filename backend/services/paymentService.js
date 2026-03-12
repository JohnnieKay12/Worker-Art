const axios = require('axios');
const { Payment, Booking, Artisan, User } = require('../models');
const logger = require('../utils/logger');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Get Paystack secret key from environment
const getSecretKey = () => process.env.PAYSTACK_SECRET_KEY;

// Axios instance for Paystack API
const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${getSecretKey()}`,
    'Content-Type': 'application/json',
  },
});

// Update authorization header when making requests
paystackAPI.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getSecretKey()}`;
  return config;
});

/**
 * Initialize a payment transaction
 * @param {object} paymentData - Payment data
 * @returns {object} Paystack initialization response
 */
const initializeTransaction = async (paymentData) => {
  try {
    const { email, amount, reference, callback_url, metadata = {} } = paymentData;

    const response = await paystackAPI.post('/transaction/initialize', {
      email,
      amount, // Amount in kobo
      reference,
      callback_url,
      metadata,
    });

    logger.info(`Payment initialized: ${reference}`);
    return response.data;
  } catch (error) {
    logger.error('Paystack initialize error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initialize payment');
  }
};

/**
 * Verify a payment transaction
 * @param {string} reference - Transaction reference
 * @returns {object} Paystack verification response
 */
const verifyTransaction = async (reference) => {
  try {
    const response = await paystackAPI.get(`/transaction/verify/${reference}`);
    
    logger.info(`Payment verified: ${reference}, Status: ${response.data.data.status}`);
    return response.data;
  } catch (error) {
    logger.error('Paystack verify error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to verify payment');
  }
};

/**
 * Process refund
 * @param {string} transactionReference - Original transaction reference
 * @param {number} amount - Amount to refund (in kobo)
 * @returns {object} Refund response
 */
const processRefund = async (transactionReference, amount = null) => {
  try {
    const payload = { transaction: transactionReference };
    if (amount) {
      payload.amount = amount;
    }

    const response = await paystackAPI.post('/refund', payload);
    
    logger.info(`Refund processed for: ${transactionReference}`);
    return response.data;
  } catch (error) {
    logger.error('Paystack refund error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to process refund');
  }
};

/**
 * Get transaction timeline
 * @param {string} reference - Transaction reference
 * @returns {object} Transaction timeline
 */
const getTransactionTimeline = async (reference) => {
  try {
    const response = await paystackAPI.get(`/transaction/timeline/${reference}`);
    return response.data;
  } catch (error) {
    logger.error('Paystack timeline error:', error.response?.data || error.message);
    throw new Error('Failed to get transaction timeline');
  }
};

/**
 * List all transactions
 * @param {object} params - Query parameters
 * @returns {object} List of transactions
 */
const listTransactions = async (params = {}) => {
  try {
    const response = await paystackAPI.get('/transaction', { params });
    return response.data;
  } catch (error) {
    logger.error('Paystack list transactions error:', error.response?.data || error.message);
    throw new Error('Failed to list transactions');
  }
};

/**
 * Fetch transaction by ID
 * @param {number} transactionId - Transaction ID
 * @returns {object} Transaction details
 */
const fetchTransaction = async (transactionId) => {
  try {
    const response = await paystackAPI.get(`/transaction/${transactionId}`);
    return response.data;
  } catch (error) {
    logger.error('Paystack fetch transaction error:', error.response?.data || error.message);
    throw new Error('Failed to fetch transaction');
  }
};

/**
 * Create a payment recipient (for transfers)
 * @param {object} recipientData - Recipient data
 * @returns {object} Recipient creation response
 */
const createTransferRecipient = async (recipientData) => {
  try {
    const { type, name, account_number, bank_code, currency = 'NGN' } = recipientData;

    const response = await paystackAPI.post('/transferrecipient', {
      type,
      name,
      account_number,
      bank_code,
      currency,
    });

    logger.info(`Transfer recipient created: ${response.data.data.recipient_code}`);
    return response.data;
  } catch (error) {
    logger.error('Paystack create recipient error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create transfer recipient');
  }
};

/**
 * Initiate a transfer
 * @param {object} transferData - Transfer data
 * @returns {object} Transfer initiation response
 */
const initiateTransfer = async (transferData) => {
  try {
    const { source, amount, recipient, reason } = transferData;

    const response = await paystackAPI.post('/transfer', {
      source: source || 'balance',
      amount,
      recipient,
      reason,
    });

    logger.info(`Transfer initiated: ${response.data.data.transfer_code}`);
    return response.data;
  } catch (error) {
    logger.error('Paystack transfer error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initiate transfer');
  }
};

/**
 * Finalize a transfer (OTP required)
 * @param {string} transferCode - Transfer code
 * @param {string} otp - OTP
 * @returns {object} Transfer finalization response
 */
const finalizeTransfer = async (transferCode, otp) => {
  try {
    const response = await paystackAPI.post('/transfer/finalize_transfer', {
      transfer_code: transferCode,
      otp,
    });

    logger.info(`Transfer finalized: ${transferCode}`);
    return response.data;
  } catch (error) {
    logger.error('Paystack finalize transfer error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to finalize transfer');
  }
};

/**
 * Verify webhook signature
 * @param {string} signature - Paystack signature header
 * @param {string} payload - Request body as string
 * @returns {boolean} Is valid signature
 */
const verifyWebhookSignature = (signature, payload) => {
  const crypto = require('crypto');
  const secret = process.env.PAYSTACK_SECRET_KEY;
  
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  
  return hash === signature;
};

/**
 * Handle webhook event
 * @param {object} event - Webhook event data
 * @returns {object} Processing result
 */
const handleWebhookEvent = async (event) => {
  const { event: eventType, data } = event;

  logger.info(`Processing webhook event: ${eventType}`);

  switch (eventType) {
    case 'charge.success':
      return await handleChargeSuccess(data);
    
    case 'charge.failed':
      return await handleChargeFailed(data);
    
    case 'refund.processed':
      return await handleRefundProcessed(data);
    
    case 'transfer.success':
      return await handleTransferSuccess(data);
    
    case 'transfer.failed':
      return await handleTransferFailed(data);
    
    default:
      logger.info(`Unhandled webhook event type: ${eventType}`);
      return { processed: false, reason: 'Unhandled event type' };
  }
};

/**
 * Handle successful charge webhook
 * @param {object} data - Webhook data
 */
const handleChargeSuccess = async (data) => {
  try {
    const { reference, status, paid_at } = data;

    // Find payment by Paystack reference
    const payment = await Payment.findOne({ paystackReference: reference });

    if (!payment) {
      logger.error(`Payment not found for reference: ${reference}`);
      return { processed: false, reason: 'Payment not found' };
    }

    // Update payment status
    await payment.markAsSuccessful(data);

    // Handle based on payment type
    if (payment.paymentType === 'booking' && payment.booking) {
      // Update booking payment status
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'paid';
        await booking.save();
      }
    } else if (payment.paymentType === 'artisan_registration' && payment.artisan) {
      // Update artisan registration fee status
      const artisan = await Artisan.findById(payment.artisan);
      if (artisan) {
        artisan.registrationFeePaid = true;
        await artisan.save();
      }
    }

    logger.info(`Charge success processed for: ${reference}`);
    return { processed: true };
  } catch (error) {
    logger.error('Error handling charge success:', error.message);
    return { processed: false, reason: error.message };
  }
};

/**
 * Handle failed charge webhook
 * @param {object} data - Webhook data
 */
const handleChargeFailed = async (data) => {
  try {
    const { reference, status, message } = data;

    const payment = await Payment.findOne({ paystackReference: reference });

    if (!payment) {
      logger.error(`Payment not found for reference: ${reference}`);
      return { processed: false, reason: 'Payment not found' };
    }

    await payment.markAsFailed(message || 'Payment failed', data);

    logger.info(`Charge failed processed for: ${reference}`);
    return { processed: true };
  } catch (error) {
    logger.error('Error handling charge failed:', error.message);
    return { processed: false, reason: error.message };
  }
};

/**
 * Handle refund processed webhook
 * @param {object} data - Webhook data
 */
const handleRefundProcessed = async (data) => {
  try {
    const { transaction_reference, amount, status } = data;

    const payment = await Payment.findOne({ paystackReference: transaction_reference });

    if (!payment) {
      logger.error(`Payment not found for refund: ${transaction_reference}`);
      return { processed: false, reason: 'Payment not found' };
    }

    await payment.processRefund(amount, 'Refund processed via webhook');

    logger.info(`Refund processed for: ${transaction_reference}`);
    return { processed: true };
  } catch (error) {
    logger.error('Error handling refund:', error.message);
    return { processed: false, reason: error.message };
  }
};

/**
 * Handle successful transfer webhook
 * @param {object} data - Webhook data
 */
const handleTransferSuccess = async (data) => {
  logger.info(`Transfer success: ${data.transfer_code}`);
  return { processed: true };
};

/**
 * Handle failed transfer webhook
 * @param {object} data - Webhook data
 */
const handleTransferFailed = async (data) => {
  logger.info(`Transfer failed: ${data.transfer_code}`);
  return { processed: true };
};

/**
 * Calculate Paystack fees
 * @param {number} amount - Amount in kobo
 * @returns {number} Fee amount in kobo
 */
const calculatePaystackFee = (amount) => {
  // Paystack charges 1.5% + NGN 100 for transactions above NGN 2,500
  // Capped at NGN 2,000
  const feePercentage = 0.015;
  const baseFee = 10000; // NGN 100 in kobo
  const maxFee = 200000; // NGN 2,000 in kobo

  let fee = Math.round(amount * feePercentage);
  
  if (amount > 250000) { // NGN 2,500 in kobo
    fee += baseFee;
  }
  
  return Math.min(fee, maxFee);
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
  processRefund,
  getTransactionTimeline,
  listTransactions,
  fetchTransaction,
  createTransferRecipient,
  initiateTransfer,
  finalizeTransfer,
  verifyWebhookSignature,
  handleWebhookEvent,
  calculatePaystackFee,
};
