const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'OPTIONS', 'PATCH', 'DELETE', 'POST', 'PUT'],
  allowedHeaders: ['X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'X-Api-Version']
}));
app.use(express.json());

// Email configuration
const ceoEmail = process.env.CEO_EMAIL || 'info@propertyreply.com';
const ceoAppPassword = process.env.CEO_APP_PASSWORD || 'ttnwkqnqwjqyrspz';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: ceoEmail,
    pass: ceoAppPassword.replace(/\s+/g, '') // Remove spaces
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PropertyReply API is running',
    endpoint: '/api/contact'
  });
});

// Handle OPTIONS requests for CORS preflight
app.options('/api/contact', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.status(200).end();
});

// API Endpoint
app.post('/api/contact', async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  try {
    const { name, email, phone, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required fields.'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Email content
    const mailOptions = {
      from: ceoEmail,
      to: ceoEmail,
      replyTo: email,
      subject: `New Contact Form Submission from ${name} - PropertyReply`,
      text: `New Contact Form Submission - PropertyReply

Contact Details:
Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}

Message:
${message}

---
This email was sent from the PropertyReply contact form.
You can reply directly to this email to contact ${name} at ${email}.`
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you within 24 hours.'
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later or contact us directly at info@propertyreply.com'
    });
  }
});

// Handle 405 for unsupported methods
app.all('/api/contact', (req, res) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Failed to send message. Please try again later or contact us directly at info@propertyreply.com'
  });
});

const PORT = process.env.PORT || 5000;

// For Vercel serverless, export the app
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // For local development
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Contact API available at http://localhost:${PORT}/api/contact`);
  });
}
