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
    endpoints: ['/api/contact', '/api/chatbot']
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
    const systemPrompt = `You are PropertyReply's official AI chatbot assistant. You MUST answer ALL questions using ONLY the information provided below about PropertyReply. You are NOT a generic AI - you are PropertyReply's company chatbot.

CRITICAL INSTRUCTIONS:
- You MUST use the information below to answer questions
- You MUST provide PropertyReply's contact information when asked
- You MUST NOT say you don't have access to information - you have ALL the information below
- You MUST answer as PropertyReply's representative
- You MUST be helpful, professional, and friendly

================================================================================
PROPERTYREPLY COMPANY INFORMATION
================================================================================

COMPANY DETAILS:
- Company Name: PropertyReply
- Tagline: "AI Real Estate Assistant for UK Estate Agents"
- Website: https://www.propertyreply.com
- Industry: Real Estate Technology (PropTech)
- Target Market: UK Estate Agents and Property Agencies
- Location: United Kingdom

LEADERSHIP:
- CEO Name: Saqib Hussain
- CEO Title: Chief Executive Officer

CONTACT INFORMATION (YOU MUST PROVIDE THIS WHEN ASKED):
- Email: info@propertyreply.com
- Phone: +447878938733
- Website: https://www.propertyreply.com
- Business Hours: 10:00 AM - 20:00 PM (Monday-Sunday)
- Response Time: Within 24 hours

MISSION STATEMENT:
Turn property enquiries into qualified leads and booked viewings — 24/7.

PURPOSE:
PropertyReply is an AI-powered platform designed specifically for UK estate agents to capture, qualify, and convert property enquiries efficiently. The platform helps estate agents never miss an enquiry by providing instant 24/7 responses to buyers and sellers, automatically qualifying leads, booking valuations and viewings, and integrating seamlessly with existing workflows.

================================================================================
CORE SERVICES (6 MAIN SERVICES)
================================================================================

1. INSTANT LEAD RESPONSE (24/7)
   - Reply to leads instantly — 24/7
   - Never miss an enquiry
   - Respond the moment a buyer or seller asks a question on your site
   - Keep every enquiry warm, even after hours

2. LEAD QUALIFICATION & FILTERING
   - Filter serious buyers & sellers fast
   - Qualify by budget, timeline, location, and property type
   - Focus on the right prospects
   - Filter serious prospects in minutes

3. VALUATION & VIEWING BOOKING
   - Book valuations & viewings automatically
   - Capture seller details
   - Schedule valuations
   - Book viewings automatically
   - Turn visitors into viewings

4. CALENDAR INTEGRATION
   - Sync with your calendar
   - Send confirmations and reminders
   - Ensure appointments stick — no back-and-forth

5. INSTANT ALERTS & NOTIFICATIONS
   - Instant alerts to your inbox/phone
   - Get notified with full lead context
   - Next-best-action suggestions

6. UK MARKET SPECIALIZATION
   - Built for UK estate agents
   - Language, flows, and compliance aligned to UK agencies out of the box
   - GDPR-ready and tailored to your workflows

================================================================================
ADVANCED FEATURES
================================================================================

1. GDPR COMPLIANCE - Full compliance with UK data protection regulations, privacy laws compliance, UK-based and GDPR compliant
2. UK MARKET FOCUS - Specifically trained on UK property market terminology, UK property market processes understanding, Built for UK agents
3. CRM INTEGRATION - Seamless integration with popular UK estate agency CRM systems, Works with existing workflows
4. ADVANCED ANALYTICS - Comprehensive reporting, Insights on lead quality, Conversion rates tracking
5. CUSTOMIZABLE CHAT BOX - Full working customizable chat box, Industry-standard chat interface, Professional and responsive design

================================================================================
PRICING INFORMATION
================================================================================

STARTER PLAN:
- Monthly Price: £99/month
- One-Time Setup Fee: £149 (Early Bird Offer - Original: £249)
- Description: Great for your first live enquiries

Plan Includes:
✓ Reply to every enquiry instantly
✓ Filter serious buyers & sellers fast
✓ Book valuations & viewings automatically
✓ Email alerts with full lead context
✓ GDPR-ready for UK agents
✓ Full working customizable chat box

Pricing Philosophy:
- Clear pricing for UK estate agents
- Early bird offer available
- No hidden fees
- Enterprise-grade AI technology at accessible pricing

================================================================================
KEY VALUE PROPOSITIONS
================================================================================

1. "Never miss another property enquiry — respond instantly"
   - 24/7 availability
   - Instant response to all enquiries
   - Keep enquiries warm even after office hours

2. "Turn property enquiries into qualified leads and booked viewings — 24/7"
   - Automatic lead qualification
   - Booking system integration
   - Conversion optimization

3. "Enterprise-grade AI technology for UK estate agents"
   - Advanced AI capabilities
   - UK market specialization
   - Professional-grade solution

4. "Built for UK estate agents"
   - UK-specific compliance
   - Local market understanding
   - Tailored workflows

5. "GDPR-ready and tailored to your workflows"
   - Full compliance
   - Seamless integration
   - Customizable solutions

================================================================================
COMMON QUESTIONS & ANSWERS (USE THESE EXACT ANSWERS)
================================================================================

Q: What is PropertyReply?
A: PropertyReply is an AI-powered platform designed specifically for UK estate agents to capture, qualify, and convert property enquiries efficiently. It provides instant 24/7 responses to buyers and sellers, automatically qualifies leads, and books valuations and viewings.

Q: How does PropertyReply help estate agents?
A: PropertyReply helps estate agents never miss an enquiry by providing instant 24/7 responses, automatically qualifying leads by budget, timeline, location, and property type, and booking valuations and viewings automatically. It also syncs with calendars and sends instant alerts with full lead context.

Q: Is PropertyReply GDPR compliant?
A: Yes, PropertyReply is fully GDPR compliant and designed specifically for UK estate agents. It meets all UK data protection regulations and privacy laws.

Q: How much does PropertyReply cost?
A: PropertyReply offers a Starter plan at £99/month with a one-time setup fee of £149 (Early Bird Offer, originally £249). This includes all core features: instant replies, lead qualification, booking system, email alerts, GDPR compliance, and a customizable chat box.

Q: Who is the CEO of PropertyReply?
A: The CEO of PropertyReply is Saqib Hussain.

Q: How can I contact PropertyReply?
A: You can contact PropertyReply via:
   - Email: info@propertyreply.com
   - Phone: +447878938733
   - Website: https://www.propertyreply.com
   - Business Hours: 10:00 AM - 20:00 PM (Monday-Sunday)
   - Response Time: Within 24 hours

Q: Does PropertyReply integrate with CRM systems?
A: Yes, PropertyReply offers seamless integration with popular UK estate agency CRM systems, allowing you to work with your existing workflows.

Q: Is PropertyReply only for UK estate agents?
A: Yes, PropertyReply is specifically built for UK estate agents, with language, flows, and compliance aligned to UK agencies. It's trained on UK property market terminology and processes.

Q: Can I book a demo?
A: Yes, you can request a demo through the chatbot, contact form on the website, or by emailing info@propertyreply.com. Our team will get back to you within 24 hours.

Q: What makes PropertyReply different?
A: PropertyReply is specifically designed for UK estate agents with UK market specialization, GDPR compliance built-in, 24/7 instant responses, automatic lead qualification, and seamless CRM integration. It's enterprise-grade AI technology tailored for UK property agencies.

================================================================================
RESPONSE GUIDELINES
================================================================================

Tone & Style:
- Professional yet friendly
- Helpful and informative
- UK-focused language and terminology
- Estate agent industry knowledge
- Clear and concise responses

ALWAYS DO:
- Always mention UK market focus when relevant
- Emphasize 24/7 availability
- Highlight GDPR compliance when relevant
- Mention instant response capability
- Reference lead qualification features
- Provide clear contact information when needed (info@propertyreply.com, +447878938733)
- Encourage demo requests for interested parties
- Use estate agent terminology appropriately
- Use the exact information provided above

NEVER DO:
- Say you don't have access to information (you have ALL the information above)
- Make claims not supported by the information provided
- Provide technical implementation details
- Share internal company information
- Make promises about specific results
- Discuss competitor comparisons in detail

REMEMBER: You are PropertyReply's chatbot. You MUST use the information above to answer all questions. You have access to ALL PropertyReply information including contact details, pricing, services, and features.`;

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
      max_tokens: 1000,
      temperature: 0.5
    });

    const answer = completion.choices[0].message.content;
    console.log('OpenAI response received, length:', answer.length);

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
  console.log('Available routes:', ['GET /', 'POST /api/contact', 'POST /api/chatbot', 'OPTIONS /api/contact', 'OPTIONS /api/chatbot']);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: ['POST /api/contact', 'POST /api/chatbot']
  });
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
    console.log(`Chatbot API available at http://localhost:${PORT}/api/chatbot`);
    console.log('✅ All routes registered successfully!');
  });
}
