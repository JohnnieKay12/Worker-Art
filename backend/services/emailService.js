const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send email
 * @param {object} options - Email options
 * @returns {object} Send result
 */
const sendEmail = async (options) => {
  try {
    // Check if email is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      logger.warn('Email not configured. Skipping email send.');
      return { success: false, reason: 'Email not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Artisan Marketplace" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;
    if (options.attachments) mailOptions.attachments = options.attachments;

    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent to: ${options.to}, Subject: ${options.subject}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email
 * @param {object} user - User object
 */
const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to Artisan Marketplace!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Welcome to Artisan Marketplace!</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thank you for joining Artisan Marketplace. We're excited to have you on board!</p>
      <p>With our platform, you can:</p>
      <ul>
        <li>Find skilled artisans for your home services</li>
        <li>Book appointments easily</li>
        <li>Chat with artisans in real-time</li>
        <li>Leave reviews and ratings</li>
      </ul>
      <p>Get started by browsing our <a href="${process.env.CLIENT_URL}/artisans">artisan listings</a>.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The Artisan Marketplace Team</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html,
    text: `Welcome to Artisan Marketplace, ${user.firstName}! Thank you for joining.`,
  });
};

/**
 * Send password reset email
 * @param {object} user - User object
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Password reset URL
 */
const sendPasswordResetEmail = async (user, resetToken, resetUrl) => {
  const subject = 'Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Password Reset Request</h2>
      <p>Hi ${user.firstName},</p>
      <p>You requested a password reset for your Artisan Marketplace account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
      <p>Or copy and paste this link in your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this reset, please ignore this email.</p>
      <p>Best regards,<br>The Artisan Marketplace Team</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html,
    text: `Password reset link: ${resetUrl}. This link expires in 10 minutes.`,
  });
};

/**
 * Send booking confirmation email
 * @param {object} booking - Booking object
 * @param {object} user - User object
 * @param {object} artisan - Artisan object
 */
const sendBookingConfirmationEmail = async (booking, user, artisan) => {
  const subject = 'Booking Confirmation';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Booking Confirmed!</h2>
      <p>Hi ${user.firstName},</p>
      <p>Your booking has been confirmed. Here are the details:</p>
      <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
        <p><strong>Service:</strong> ${booking.serviceDescription}</p>
        <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${booking.scheduledTime}</p>
        <p><strong>Artisan:</strong> ${artisan.userDetails?.firstName} ${artisan.userDetails?.lastName}</p>
        <p><strong>Total Amount:</strong> NGN ${(booking.price.totalAmount / 100).toFixed(2)}</p>
      </div>
      <p>You can view your booking details and chat with your artisan in your <a href="${process.env.CLIENT_URL}/dashboard">dashboard</a>.</p>
      <p>Best regards,<br>The Artisan Marketplace Team</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html,
    text: `Your booking ${booking.bookingNumber} has been confirmed.`,
  });
};

/**
 * Send booking request email to artisan
 * @param {object} booking - Booking object
 * @param {object} user - User object
 * @param {object} artisanUser - Artisan's user object
 */
const sendBookingRequestEmail = async (booking, user, artisanUser) => {
  const subject = 'New Booking Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">New Booking Request</h2>
      <p>Hi ${artisanUser.firstName},</p>
      <p>You have a new booking request from ${user.firstName} ${user.lastName}.</p>
      <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
        <p><strong>Service:</strong> ${booking.serviceDescription}</p>
        <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${booking.scheduledTime}</p>
        <p><strong>Location:</strong> ${booking.address.street}, ${booking.address.city}</p>
      </div>
      <p>Please respond to this request in your <a href="${process.env.CLIENT_URL}/artisan/dashboard">dashboard</a>.</p>
      <p>Best regards,<br>The Artisan Marketplace Team</p>
    </div>
  `;

  return await sendEmail({
    to: artisanUser.email,
    subject,
    html,
    text: `You have a new booking request from ${user.firstName} ${user.lastName}.`,
  });
};

/**
 * Send artisan approval email
 * @param {object} user - User object
 * @param {object} artisan - Artisan object
 */
const sendArtisanApprovalEmail = async (user, artisan) => {
  const subject = 'Your Artisan Account Has Been Approved!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Congratulations!</h2>
      <p>Hi ${user.firstName},</p>
      <p>Great news! Your artisan account has been approved and is now active.</p>
      <p>You can now:</p>
      <ul>
        <li>Receive booking requests from customers</li>
        <li>Chat with potential clients</li>
        <li>Build your reputation with reviews</li>
      </ul>
      <p>Visit your <a href="${process.env.CLIENT_URL}/artisan/dashboard">artisan dashboard</a> to get started.</p>
      <p>Best regards,<br>The Artisan Marketplace Team</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html,
    text: 'Your artisan account has been approved! Visit your dashboard to get started.',
  });
};

/**
 * Send artisan rejection email
 * @param {object} user - User object
 * @param {string} reason - Rejection reason
 */
const sendArtisanRejectionEmail = async (user, reason) => {
  const subject = 'Artisan Account Application Update';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #DC2626;">Application Update</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thank you for your interest in joining Artisan Marketplace as an artisan.</p>
      <p>After reviewing your application, we regret to inform you that we are unable to approve your account at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this was a mistake or would like to provide additional information, please contact our support team.</p>
      <p>Best regards,<br>The Artisan Marketplace Team</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html,
    text: 'Your artisan application was not approved. Contact support for more information.',
  });
};

/**
 * Send payment receipt email
 * @param {object} payment - Payment object
 * @param {object} user - User object
 */
const sendPaymentReceiptEmail = async (payment, user) => {
  const subject = 'Payment Receipt';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Payment Receipt</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thank you for your payment. Here are the details:</p>
      <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Reference:</strong> ${payment.reference}</p>
        <p><strong>Amount:</strong> NGN ${(payment.amount / 100).toFixed(2)}</p>
        <p><strong>Date:</strong> ${new Date(payment.paidAt).toLocaleString()}</p>
        <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
      </div>
      <p>Keep this receipt for your records.</p>
      <p>Best regards,<br>The Artisan Marketplace Team</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html,
    text: `Payment of NGN ${(payment.amount / 100).toFixed(2)} received. Reference: ${payment.reference}`,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendBookingRequestEmail,
  sendArtisanApprovalEmail,
  sendArtisanRejectionEmail,
  sendPaymentReceiptEmail,
};
