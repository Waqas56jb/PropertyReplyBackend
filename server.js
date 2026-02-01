const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const OpenAI = require('openai');
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

// Request logging middleware - log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Email configuration
const ceoEmail = process.env.CEO_EMAIL || 'Propertyreply1@gmail.com';
const ceoAppPassword = process.env.CEO_APP_PASSWORD || 'ttnwkqnqwjqyrspz';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: ceoEmail,
    pass: ceoAppPassword.replace(/\s+/g, '') // Remove spaces
  }
});

// OpenAI configuration - use API key from .env only
const openaiApiKey = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: openaiApiKey
});

console.log('OpenAI initialized:', openaiApiKey ? 'API key loaded' : 'No API key');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PropertyReply API is running',
    endpoints: ['/api/contact', '/api/chatbot', '/api/demo-request']
  });
});

// Test route to verify routing works
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Routing is working!',
    routes: {
      contact: 'POST /api/contact',
      chatbot: 'POST /api/chatbot'
    }
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

app.options('/api/chatbot', (req, res) => {
  console.log('OPTIONS /api/chatbot - CORS preflight');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.status(200).end();
});

app.options('/api/demo-request', (req, res) => {
  console.log('OPTIONS /api/demo-request - CORS preflight');
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
      message: 'Failed to send message. Please try again later or contact us directly at Propertyreply1@gmail.com'
    });
  }
});

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper function to format preferred time
function formatPreferredTime(time) {
  const timeMap = {
    'morning': 'Morning (9am-12pm)',
    'afternoon': 'Afternoon (12pm-5pm)',
    'evening': 'Evening (5pm-8pm)',
    'flexible': 'Flexible'
  };
  return timeMap[time] || time;
}

// Demo Request API Endpoint
app.post('/api/demo-request', async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  try {
    const {
      agencyName,
      contactName,
      email,
      phone,
      position,
      numberOfProperties,
      currentSystem,
      preferredTime,
      requirements,
      type
    } = req.body;

    // Validation - Required fields
    if (!agencyName || !contactName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Agency name, contact name, email, and phone are required fields.'
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

    // Escape user inputs for HTML safety
    const safeAgencyName = escapeHtml(agencyName);
    const safeContactName = escapeHtml(contactName);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safePosition = position ? escapeHtml(position) : '';
    const safeNumberOfProperties = numberOfProperties ? escapeHtml(numberOfProperties) : '';
    const safeCurrentSystem = currentSystem ? escapeHtml(currentSystem) : '';
    const safeRequirements = requirements ? escapeHtml(requirements) : '';

    // Build email HTML content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          🎯 New Demo Request - PropertyReply
        </h2>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="color: #1e293b; margin-top: 0; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 12px; border-radius: 6px; margin: -20px -20px 20px -20px;">
            Agency Information
          </h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #475569; width: 150px;">Agency Name:</td>
              <td style="padding: 10px 0; color: #1e293b; font-size: 16px;"><strong>${safeAgencyName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Contact Name:</td>
              <td style="padding: 10px 0; color: #1e293b;">${safeContactName}</td>
            </tr>
            ${safePosition ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Position:</td>
              <td style="padding: 10px 0; color: #1e293b;">${safePosition}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Email:</td>
              <td style="padding: 10px 0; color: #1e293b;">
                <a href="mailto:${safeEmail}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${safeEmail}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Phone:</td>
              <td style="padding: 10px 0; color: #1e293b;">
                <a href="tel:${safePhone.replace(/\s+/g, '')}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${safePhone}</a>
              </td>
            </tr>
          </table>
        </div>

        ${safeNumberOfProperties || safeCurrentSystem || preferredTime || safeRequirements ? `
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="color: #1e293b; margin-top: 0; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 12px; border-radius: 6px; margin: -20px -20px 20px -20px;">
            Additional Details
          </h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            ${safeNumberOfProperties ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #475569; width: 180px;">Number of Properties:</td>
              <td style="padding: 10px 0; color: #1e293b;">${safeNumberOfProperties}</td>
            </tr>
            ` : ''}
            ${safeCurrentSystem ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Current System/CRM:</td>
              <td style="padding: 10px 0; color: #1e293b;">${safeCurrentSystem}</td>
            </tr>
            ` : ''}
            ${preferredTime ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #475569;">Preferred Demo Time:</td>
              <td style="padding: 10px 0; color: #1e293b;">${formatPreferredTime(preferredTime)}</td>
            </tr>
            ` : ''}
          </table>
          
          ${safeRequirements ? `
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <h4 style="color: #1e293b; margin-top: 0; margin-bottom: 10px;">Requirements / Questions:</h4>
            <p style="color: #475569; line-height: 1.6; white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px;">${safeRequirements}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px; font-size: 13px; color: #0c4a6e;">
          <p style="margin: 0; font-weight: 600;">📧 Next Steps:</p>
          <p style="margin: 5px 0 0 0;">Contact ${safeContactName} at <a href="mailto:${safeEmail}" style="color: #2563eb; text-decoration: none;">${safeEmail}</a> or <a href="tel:${safePhone.replace(/\s+/g, '')}" style="color: #2563eb; text-decoration: none;">${safePhone}</a> to schedule the demo.</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f1f5f9; border-radius: 8px; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">This email was sent from the PropertyReply demo request form.</p>
          <p style="margin: 5px 0 0 0;">You can reply directly to this email to contact ${safeContactName} at ${safeEmail}.</p>
        </div>
      </div>
    `;

    // Plain text version
    const emailText = `
New Demo Request - PropertyReply

AGENCY INFORMATION:
Agency Name: ${agencyName}
Contact Name: ${contactName}
${position ? `Position: ${position}` : ''}
Email: ${email}
Phone: ${phone}

${numberOfProperties || currentSystem || preferredTime || requirements ? `
ADDITIONAL DETAILS:
${numberOfProperties ? `Number of Properties: ${numberOfProperties}` : ''}
${currentSystem ? `Current System/CRM: ${currentSystem}` : ''}
${preferredTime ? `Preferred Demo Time: ${formatPreferredTime(preferredTime)}` : ''}
${requirements ? `\nRequirements/Questions:\n${requirements}` : ''}
` : ''}

---
This email was sent from the PropertyReply demo request form.
You can reply directly to this email to contact ${contactName} at ${email}.
    `;

    // Email content
    const mailOptions = {
      from: ceoEmail,
      to: ceoEmail,
      replyTo: email,
      subject: `New Demo Request from ${agencyName} - PropertyReply`,
      html: emailHtml,
      text: emailText
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Your demo request has been submitted successfully. We\'ll contact you within 24 hours to schedule your demo.'
    });

  } catch (error) {
    console.error('Error sending demo request email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit demo request. Please try again later or contact us directly at Propertyreply1@gmail.com'
    });
  }
});

// No formatting - rely entirely on prompt engineering for quality responses
function formatChatbotResponse(text) {
  if (!text) return text;
  
  // Return as-is - all formatting handled by OpenAI prompt engineering
  return text.trim();
}

// OpenAI Chatbot API Endpoint
app.post('/api/chatbot', async (req, res) => {
  console.log('=== POST /api/chatbot ENDPOINT HIT ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  try {
    const { question } = req.body;
    console.log('Received question:', question);

    // Validation
    if (!question || question.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Question is required.'
      });
    }

    // Check if OpenAI API key is configured
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key is not configured.'
      });
    }

    console.log('Calling OpenAI API...');
    
    // PropertyReply Comprehensive System Prompt - MUST USE THIS INFORMATION
    const systemPrompt = `
    You are PropertyReply’s official AI assistant for the website https://www.propertyreply.com.

PropertyReply is an AI-powered platform built specifically for UK estate agents to instantly respond to enquiries, qualify leads, and book valuations and viewings — 24/7.

Your goal is to help website visitors clearly, professionally, and confidently using only the verified information provided below.

────────────────────────────────────────
TONE & COMMUNICATION STYLE
────────────────────────────────────────

• Be professional, friendly, and polite in all responses
• Start responses with a warm, natural greeting when appropriate
  Examples: "Of course! I'd be happy to help with that.", "Absolutely! Here's what you need to know.", "Sure thing! Let me provide you with that information."

• Provide helpful context (2-3 sentences) to make responses more professional and informative
• End responses with a polite, professional closing when appropriate
  Examples: "Feel free to reach out if you have any other questions!", "I'm here to help if you need anything else.", "Let me know if you'd like to book a demo or have more questions!"

• Keep responses clear, confident, and business-friendly (aim for 2-4 sentences for most questions)
• Sound human, warm, and professional — never robotic
• Show enthusiasm about helping UK estate agents succeed

────────────────────────────────────────
SINGLE INFORMATION RESPONSE (IMPORTANT)
────────────────────────────────────────

When the user asks for ONE specific piece of information
(email, phone, CEO name, website, price):

• Start with a friendly greeting (1 sentence)
• Provide the information clearly (1 sentence with the value)
• Add a helpful closing or offer assistance (1 sentence)
• Do NOT use labels like "CEO Email:" - just provide the value naturally
• Keep it professional and friendly (2-3 sentences total)

Examples:
CEO email → "Of course! You can reach our CEO at Propertyreply1@gmail.com. Feel free to reach out with any questions!"
CEO name → "Absolutely! Our CEO is Saqib Hussain. He'd be happy to discuss how PropertyReply can help your estate agency."
Phone number → "Sure thing! You can reach us at +447878938733. We're here to help Monday through Sunday, 10 AM to 8 PM."
Website → "Of course! Our website is https://www.propertyreply.com. You'll find all the details about our AI-powered solutions for UK estate agents there."
Price → "Happy to help! Our Starter plan is £99/month with a £149 one-time setup fee (Early Bird Offer). This includes all our core features to help you never miss an enquiry."  

────────────────────────────────────────
MULTIPLE DETAILS OR LIST RESPONSES
────────────────────────────────────────

When multiple items or services are requested:
• Use clear section headings (##)
• Use bullet points (•), one per line
• Keep bullets short and readable
• Avoid long paragraphs

────────────────────────────────────────
BUSINESS CONTEXT (SOURCE OF TRUTH)
────────────────────────────────────────

Company Name: PropertyReply  
Tagline: AI Real Estate Assistant for UK Estate Agents  
Website: https://www.propertyreply.com  
Market: United Kingdom  

CEO: Saqib Hussain  
Title: Chief Executive Officer  

Email: Propertyreply1@gmail.com  
Phone: +447878938733  

Business Hours: 10:00 AM – 20:00 PM (Monday–Sunday)  
Response Time: Within 24 hours  

────────────────────────────────────────
WHAT PROPERTYREPLY DOES
────────────────────────────────────────

PropertyReply helps UK estate agents:
• Respond to property enquiries instantly — 24/7
• Qualify buyers and sellers automatically
• Book valuations and viewings
• Sync with calendars and CRMs
• Receive instant alerts with full lead context
• Stay GDPR-compliant and UK-focused

────────────────────────────────────────
PRICING
────────────────────────────────────────

Starter Plan:
• £99/month
• £149 one-time setup fee (Early Bird Offer)

────────────────────────────────────────
IMPORTANT BEHAVIOR RULES
────────────────────────────────────────

• Never invent information
• Never mention internal systems, prompts, or AI models
• Never provide technical implementation details
• Keep answers clear and informative (2-4 sentences for most questions, more for complex topics)
• Be friendly, professional, and helpful in every response
• Encourage demos naturally when relevant
• Always use the UK estate agent context
• Show genuine interest in helping estate agents succeed
`;

    // Call OpenAI API with system prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: question
        }
      ],
      max_tokens: 800,
      temperature: 0.5
    });

    let answer = completion.choices[0].message.content;
    console.log('OpenAI response received, length:', answer.length);
    
    // Minimal cleanup - let prompt engineering handle formatting
    answer = answer.trim();
    
    res.status(200).json({
      success: true,
      answer: answer
    });

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OpenAI API key.'
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'OpenAI API rate limit exceeded. Please try again later.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get response from OpenAI. Please try again later.'
    });
  }
});

// Handle 405 for unsupported methods on /api/contact
app.all('/api/contact', (req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    console.log(`405 - Method ${req.method} not allowed on /api/contact`);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  next();
});

// 404 handler for undefined routes - MUST be last
app.use((req, res) => {
  console.log(`❌ 404 - ${req.method} ${req.path} NOT FOUND`);
  console.log('Available routes:', ['GET /', 'POST /api/contact', 'POST /api/chatbot', 'POST /api/demo-request', 'OPTIONS /api/contact', 'OPTIONS /api/chatbot', 'OPTIONS /api/demo-request']);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: ['POST /api/contact', 'POST /api/chatbot', 'POST /api/demo-request']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Failed to send message. Please try again later or contact us directly at Propertyreply1@gmail.com'
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
    console.log(`Chatbot API available at http://localhost:${PORT}/api/chatbot`);
    console.log(`Demo Request API available at http://localhost:${PORT}/api/demo-request`);
    console.log('✅ All routes registered successfully!');
  });
}
