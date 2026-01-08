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

// Function to format chatbot response with proper line breaks and structure
function formatChatbotResponse(text) {
  if (!text) return text;
  
  let formatted = text;
  
  // Step 1: Fix broken headings FIRST - Critical fix for "## C\nEO" -> "## CEO"
  // Fix single letter followed by newline and more text (like "C\nEO")
  formatted = formatted.replace(/##\s+([A-Z])\n([A-Z][a-z]+)/g, '## $1$2');
  formatted = formatted.replace(/##\s+([A-Z])\n([A-Z]+)/g, '## $1$2');
  formatted = formatted.replace(/##\s+([A-Z][a-z])\n([A-Z][a-z]+)/g, '## $1$2');
  
  // Fix broken words in headings (any letter followed by newline and more letters)
  formatted = formatted.replace(/##\s+([A-Za-z]+)\n([A-Z][a-z]+)/g, '## $1 $2');
  formatted = formatted.replace(/##\s+([A-Z])\n([a-z]+)/g, '## $1$2');
  
  // Step 2: Fix headings broken across lines (like "## C\nEO Email")
  formatted = formatted.replace(/##\s+([A-Z])\n([A-Z]+)\s+([A-Z][a-z]+)/g, '## $1$2 $3');
  formatted = formatted.replace(/##\s+([A-Z])\n([A-Z]+)\n\n([A-Z][a-z]+)/g, '## $1$2 $3');
  
  // Step 3: Fix headings with numbers broken (like "## 1.\nService Name")
  formatted = formatted.replace(/##\s+(\d+\.)\s*\n\s*([A-Z][^\n]+)/g, '## $1 $2');
  
  // Step 4: Remove leading spaces from headings
  formatted = formatted.replace(/^\s+##/gm, '##');
  
  // Step 5: Fix text before headings (like "Core Services" before ##)
  formatted = formatted.replace(/^([A-Z][a-z]+\s+[A-Z][a-z]+)\s*##/gm, '## $1');
  formatted = formatted.replace(/^([A-Z][a-z]+)\s*##/gm, '## $1');
  
  // Step 6: Ensure each ## heading is on its own line with blank line before
  formatted = formatted.replace(/([^\n])\s*##\s+/g, '$1\n\n## ');
  
  // Step 7: Fix headings that are crammed together
  formatted = formatted.replace(/##\s+([^#\n]+?)\s+##\s+/g, '## $1\n\n## ');
  
  // Step 8: Fix text that appears on same line as heading - move to next line
  formatted = formatted.replace(/##\s+([^\n]+?)([A-Za-z0-9])/g, '## $1\n$2');
  
  // Step 9: Fix bullet points - ensure each is on separate line
  formatted = formatted.replace(/([^\n])\s*•\s*/g, '$1\n   • ');
  formatted = formatted.replace(/^\s*•\s*/gm, '   • ');
  formatted = formatted.replace(/\s+•\s+/g, '\n   • ');
  
  // Step 10: Ensure numbered sections have proper breaks
  formatted = formatted.replace(/([^\n])##\s+(\d+\.)/g, '$1\n\n## $2');
  
  // Step 11: Fix broken words across lines (like "CEO\nEmail" -> "CEO Email")
  formatted = formatted.replace(/([A-Z]+)\n([A-Z][a-z]+)/g, '$1 $2');
  formatted = formatted.replace(/([A-Z][a-z]+)\n([A-Z][a-z]+)/g, '$1 $2');
  formatted = formatted.replace(/([a-z])\n([a-z])/g, '$1 $2');
  
  // Step 12: Fix broken service names (like "Book valuations &\nviewings")
  formatted = formatted.replace(/([a-z])\s*&\s*\n\s*([a-z])/g, '$1 & $2');
  
  // Step 13: Ensure proper spacing between sections
  formatted = formatted.replace(/##\s+([^\n]+)\n\s*##/g, '## $1\n\n##');
  
  // Step 14: Fix contact information formatting
  formatted = formatted.replace(/(Email:|Phone:|Website:|Business Hours:|Response Time:)\s*/g, '\n$1       ');
  
  // Step 15: Clean up multiple consecutive newlines (max 2)
  formatted = formatted.replace(/\n{4,}/g, '\n\n\n');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Step 16: Ensure bullets are properly indented (3 spaces)
  formatted = formatted.replace(/^•\s+/gm, '   • ');
  
  // Step 17: Final cleanup - ensure headings start at beginning
  formatted = formatted.replace(/^\s+##/gm, '##');
  
  // Step 18: Ensure each service section is properly separated
  formatted = formatted.replace(/(##\s+\d+\.\s+[^\n]+)\n([^•\n#])/g, '$1\n\n$2');
  
  // Step 19: Final pass - fix any remaining broken headings
  formatted = formatted.replace(/##\s+([A-Z])\n([A-Z]+)/g, '## $1$2');
  formatted = formatted.replace(/##\s+([A-Z][a-z])\n([A-Z][a-z]+)/g, '## $1$2');
  
  // Step 20: Fix duplicate labels (like "CEO Email CEO Email:" -> remove duplicate)
  // Pattern: "CEO Email CEO Email: info@..." -> "info@..." (for simple answers)
  formatted = formatted.replace(/^(CEO Email|CEO Name|Phone|Email|Price|Website)\s+\1:\s*([^\n]+)$/gmi, '$2');
  
  // Pattern: "CEO Email CEO Email" (standalone) -> "CEO Email"
  formatted = formatted.replace(/^(CEO Email|CEO Name|Phone|Email|Price|Website)\s+\1\s*$/gmi, '$1');
  
  // Pattern: "CEO Email CEO Email:" -> "CEO Email:"
  formatted = formatted.replace(/(CEO Email|CEO Name|Phone|Email|Price|Website)\s+\1:\s*/gi, '$1: ');
  
  // Pattern: "CEO Email CEO Email " (with space) -> "CEO Email "
  formatted = formatted.replace(/(CEO Email|CEO Name|Phone|Email|Price|Website)\s+\1\s+/gi, '$1 ');
  
  // Step 21: For simple one-line answers, if it starts with label and value, keep it simple
  // If the entire response is just "Label: value", that's fine
  // But if it's "Label Label: value", simplify to just "value" for direct questions
  
  // Step 22: Remove duplicate words at start of response
  formatted = formatted.replace(/^(CEO Email|CEO Name|Phone|Email|Price|Website)\s+\1\s*:/gmi, '$1:');
  
  // Step 23: Trim and ensure clean start
  formatted = formatted.trim();
  
  return formatted;
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
    const systemPrompt = `You are PropertyReply's official AI chatbot assistant. Answer questions DIRECTLY, CONCISELY, and using ONLY the information provided below.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL FORMATTING INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY
═══════════════════════════════════════════════════════════════════════════════

FORMATTING PATTERN - COPY THIS EXACT STRUCTURE:

1. HEADINGS (##):
   - MUST start at the beginning of the line (column 0)
   - MUST have format: ## Heading Text (all on ONE line, never break across lines)
   - MUST have a blank line BEFORE the heading
   - MUST have a blank line AFTER the heading before content
   - NEVER break heading text across lines (## C\nEO is WRONG, ## CEO is CORRECT)

2. BULLET POINTS (•):
   - MUST start with 3 spaces, then •, then space, then text
   - Format: "   • Text here" (3 spaces, bullet, space, text)
   - Each bullet MUST be on its own separate line
   - NEVER put multiple bullets on one line

3. LINE BREAKS:
   - Press ENTER after every heading
   - Press ENTER before every heading
   - Press ENTER after every bullet point
   - Press ENTER before every bullet point
   - Use actual newline characters (\n) in your response

4. SECTION STRUCTURE:
   - Blank line
   - Heading (##)
   - Blank line
   - Content (bullets or text)
   - Blank line
   - Next heading (##)
   - Blank line

EXAMPLE OF CORRECT FORMAT (copy this exact pattern):

## Core Services

## 1. Instant Lead Response (24/7)
   • Reply to leads instantly — 24/7
   • Never miss an enquiry
   • Keep every enquiry warm, even after hours

## 2. Lead Qualification & Filtering
   • Filter serious buyers & sellers fast
   • Qualify by budget, timeline, location, and property type

═══════════════════════════════════════════════════════════════════════════════
RESPONSE RULES
═══════════════════════════════════════════════════════════════════════════════

1. ANSWER DIRECTLY - If asked for specific information (like CEO email), provide ONLY that information directly
2. BE CONCISE - Maximum 2-3 sentences for simple questions, 3-4 bullet points for lists
3. NO FLUFF - Skip introductions, skip explanations unless specifically asked
4. USE THE FORMATTING PATTERN ABOVE - Follow it exactly

DIRECT ANSWER EXAMPLES - COPY THESE EXACT FORMATS:

For SIMPLE questions asking for ONE piece of information, provide ONLY the value (NO labels, NO headings):

Question: "What is CEO email?" or "CEO email?" or "what is ceo email"
Answer: info@propertyreply.com

Question: "What is the CEO name?" or "Who is the CEO?"
Answer: Saqib Hussain

Question: "What is the phone number?" or "Phone number?"
Answer: +447878938733

Question: "What is the price?" or "How much does it cost?"
Answer: £99/month with £149 one-time setup fee

Question: "What is the website?"
Answer: https://www.propertyreply.com

For questions asking for MULTIPLE pieces of information, use labels:

Question: "How can I contact PropertyReply?"
Answer:
Email:               info@propertyreply.com
Phone:               +447878938733
Website:             https://www.propertyreply.com

Question: "What services do you provide?"
Answer: 
## Core Services

## 1. Instant Lead Response (24/7)
   • Reply to leads instantly — 24/7
   • Never miss an enquiry

## 2. Lead Qualification & Filtering
   • Filter serious buyers & sellers fast
   • Qualify by budget, timeline, location

CRITICAL RULES FOR DIRECT ANSWERS:
- If asked for ONE SPECIFIC piece of information (email, phone, CEO name, price, website), provide ONLY the value - NO labels, NO headings, NO "CEO Email:" prefix, just the answer
- For "what is CEO email?" or "CEO email?" → Answer: info@propertyreply.com (NOT "CEO Email: info@propertyreply.com" and NOT "CEO Email CEO Email: info@propertyreply.com")
- For "what is CEO name?" or "CEO name?" → Answer: Saqib Hussain (NOT "CEO Name: Saqib Hussain")
- For "what is phone?" or "phone number?" → Answer: +447878938733 (NOT "Phone: +447878938733")
- For "what is price?" or "how much?" → Answer: £99/month with £149 one-time setup (NOT "Price: £99/month")
- If asked for MULTIPLE pieces of information (like "contact information"), THEN use labels with proper formatting
- If asked for a LIST (services, features), provide well-formatted list with proper line breaks using the pattern above
- Keep responses SHORT and FOCUSED - maximum 2-3 sentences for simple questions
- NO introductions like "Here is..." or "I can help you with..." - just answer directly
- NO duplicate labels - NEVER say "CEO Email CEO Email:" - if you must use a label, say it ONCE: "CEO Email:"
- NEVER break headings across lines - keep heading text on the SAME line as ##

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

Q: What is the CEO email?
Q: What is CEO email?
Q: CEO email?
Q: How to contact CEO?
A: CEO Email: info@propertyreply.com
CEO Name: Saqib Hussain
Phone: +447878938733

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

═══════════════════════════════════════════════════════════════════════════════
RESPONSE FORMATTING REQUIREMENTS (CRITICAL - MUST FOLLOW)
═══════════════════════════════════════════════════════════════════════════════

YOU MUST FORMAT ALL RESPONSES WITH PROPER LINE BREAKS, HEADINGS, AND BULLET POINTS.

CRITICAL FORMATTING RULES:
1. ALWAYS use actual line breaks (press Enter) between sections
2. ALWAYS use bullet points (•) on separate lines for each item
3. ALWAYS put section headers on their own line with blank lines before and after
4. ALWAYS put each bullet point on a new line
5. NEVER put multiple items on the same line
6. ALWAYS use proper spacing - blank line between sections

EXAMPLE OF CORRECT FORMATTING (with actual line breaks):

## Core Services

## 1. Instant Lead Response (24/7)
   • Reply to leads instantly — 24/7
   • Never miss an enquiry
   • Respond the moment a buyer or seller asks a question on your site
   • Keep every enquiry warm, even after hours

## 2. Lead Qualification & Filtering
   • Filter serious buyers & sellers fast
   • Qualify by budget, timeline, location, and property type
   • Focus on the right prospects
   • Filter serious prospects in minutes

## 3. Valuation & Viewing Booking
   • Book valuations & viewings automatically
   • Capture seller details
   • Schedule valuations
   • Book viewings automatically
   • Turn visitors into viewings

EXAMPLE OF CORRECT CONTACT FORMAT (with line breaks):

## Contact Information

Email:               info@propertyreply.com
Phone:               +447878938733
Website:             https://www.propertyreply.com
Business Hours:      10:00 AM - 20:00 PM (Monday-Sunday)
Response Time:       Within 24 hours

EXAMPLE OF CORRECT PRICING FORMAT (with line breaks):

## Pricing

## Starter Plan
Monthly Price:       £99/month
One-Time Setup:      £149 (Early Bird Offer - Original: £249)

Plan Includes:
   ✓ Reply to every enquiry instantly
   ✓ Filter serious buyers & sellers fast
   ✓ Book valuations & viewings automatically
   ✓ Email alerts with full lead context
   ✓ GDPR-ready for UK agents
   ✓ Full working customizable chat box

FORMATTING CHECKLIST - BEFORE SENDING YOUR RESPONSE:
✓ Each section header is on its own line
✓ Blank line before each section header
✓ Blank line after each section header
✓ Each bullet point (•) is on a new line
✓ Blank line between different sections
✓ Contact information has each item on a new line
✓ No multiple items crammed on one line

NEVER DO THIS (WRONG):
## Core Services ## 1. Service Name • Item 1 • Item 2

ALWAYS DO THIS (CORRECT):
## Core Services

## 1. Service Name
   • Item 1
   • Item 2

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE OF EXACT FORMAT YOU MUST USE (COPY THIS FORMAT):
═══════════════════════════════════════════════════════════════════════════════

If asked "What services do you provide?", respond EXACTLY like this:

## Core Services

## 1. Instant Lead Response (24/7)
   • Reply to leads instantly — 24/7
   • Never miss an enquiry
   • Respond the moment a buyer or seller asks a question on your site
   • Keep every enquiry warm, even after hours

## 2. Lead Qualification & Filtering
   • Filter serious buyers & sellers fast
   • Qualify by budget, timeline, location, and property type
   • Focus on the right prospects
   • Filter serious prospects in minutes

## 3. Valuation & Viewing Booking
   • Book valuations & viewings automatically
   • Capture seller details
   • Schedule valuations
   • Book viewings automatically
   • Turn visitors into viewings

## 4. Calendar Integration
   • Sync with your calendar
   • Send confirmations and reminders
   • Ensure appointments stick — no back-and-forth

## 5. Instant Alerts & Notifications
   • Instant alerts to your inbox/phone
   • Get notified with full lead context
   • Next-best-action suggestions

## 6. UK Market Specialization
   • Built for UK estate agents
   • Language, flows, and compliance aligned to UK agencies out of the box
   • GDPR-ready and tailored to your workflows

═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Notice how:
- Each section header (##) is on its own line
- There is a blank line before each section header
- Each bullet point (•) is on its own separate line
- There are blank lines between different numbered sections
- Everything is properly spaced and formatted

YOU MUST FORMAT ALL YOUR RESPONSES EXACTLY LIKE THIS EXAMPLE ABOVE.

═══════════════════════════════════════════════════════════════════════════════
FINAL FORMATTING INSTRUCTIONS - CRITICAL
═══════════════════════════════════════════════════════════════════════════════

YOU MUST:
1. Press ENTER (newline) after EVERY heading (##)
2. Press ENTER (newline) before EVERY heading (##)  
3. Press ENTER (newline) after EVERY bullet point (•)
4. Press ENTER (newline) before EVERY bullet point (•)
5. NEVER put two headings on the same line
6. NEVER put two bullet points on the same line
7. ALWAYS use actual newline characters (\n) in your response

EXAMPLE OF WHAT NOT TO DO (WRONG):
## Core Services ## 1. Service Name • Item 1 • Item 2

EXAMPLE OF WHAT TO DO (CORRECT):
## Core Services

## 1. Service Name
   • Item 1
   • Item 2

YOUR RESPONSE MUST HAVE REAL NEWLINE CHARACTERS BETWEEN EVERY ELEMENT.
DO NOT PUT MULTIPLE ITEMS ON ONE LINE. USE ACTUAL LINE BREAKS.

═══════════════════════════════════════════════════════════════════════════════
FINAL FORMATTING CHECKLIST - VERIFY BEFORE SENDING
═══════════════════════════════════════════════════════════════════════════════

BEFORE SENDING YOUR RESPONSE, CHECK:
✓ Every heading (##) is on its own line starting at column 0
✓ Heading text is on the SAME line as ## (never break like ## C\nEO)
✓ Blank line before every heading
✓ Blank line after every heading before content
✓ Every bullet point (•) is on its own line
✓ Bullets are indented with 3 spaces: "   • "
✓ Blank line between different sections
✓ No multiple items on one line
✓ Response is short and focused
✓ Direct answer without fluff

CRITICAL RULES:
- NEVER break headings: ## CEO Email (CORRECT) NOT ## C\nEO Email (WRONG)
- ALWAYS use actual newline characters between every element
- ALWAYS follow the formatting pattern shown in examples
- KEEP IT SHORT - Maximum 3-4 bullet points per service

═══════════════════════════════════════════════════════════════════════════════
RESPONSE LENGTH REQUIREMENTS - CRITICAL
═══════════════════════════════════════════════════════════════════════════════

YOU MUST KEEP RESPONSES SHORT, FOCUSED, AND CONCISE:
- DO NOT write long, detailed paragraphs
- DO NOT provide excessive explanations
- DO provide direct, clear answers
- DO list key points with bullet points
- DO keep it brief and to the point
- Maximum 3-4 bullet points per service/feature
- Focus on the most important information only

EXAMPLE OF GOOD SHORT RESPONSE (COPY THIS EXACT FORMAT):
## Core Services

## 1. Instant Lead Response (24/7)
   • Reply to leads instantly — 24/7
   • Never miss an enquiry
   • Keep every enquiry warm, even after hours

## 2. Lead Qualification & Filtering
   • Filter serious buyers & sellers fast
   • Qualify by budget, timeline, location, and property type

CRITICAL FORMATTING RULES:
- NEVER break headings across lines (## Core Services NOT ## C\nore Services)
- ALWAYS put heading text on the SAME LINE as ##
- ALWAYS put each bullet point on a NEW LINE
- ALWAYS add a BLANK LINE before each ## heading
- ALWAYS add a BLANK LINE after each ## heading before content
- NEVER put text on the same line as a heading
- NEVER break words across lines

═══════════════════════════════════════════════════════════════════════════════
FINAL REMINDER - CRITICAL FORMATTING RULES
═══════════════════════════════════════════════════════════════════════════════

YOU MUST:
1. Use actual line breaks (newlines) - Each heading, each bullet point, and each section must be on separate lines with proper spacing
2. NEVER put multiple items on one line
3. Format your response exactly like the examples above with real line breaks between every element
4. KEEP RESPONSES SHORT AND FOCUSED - Do not write long paragraphs or excessive details
5. HEADINGS MUST START AT COLUMN 0 (no leading spaces before ##)
6. BULLETS MUST BE INDENTED WITH 3 SPACES: "   • " (3 spaces, bullet, space, text)
7. NEVER break heading text across lines - Keep heading text on the SAME line as ##
8. ALWAYS add blank lines before and after headings
9. ALWAYS put each bullet on its own line

FORMATTING PATTERN TO FOLLOW:
- Line 1: (blank)
- Line 2: ## Heading Name
- Line 3: (blank)
- Line 4:    • Bullet point 1
- Line 5:    • Bullet point 2
- Line 6: (blank)
- Line 7: ## Next Heading
- Line 8: (blank)

REMEMBER: Follow this exact pattern for all responses.`;

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
      max_tokens: 600,
      temperature: 0.3
    });

    let answer = completion.choices[0].message.content;
    console.log('OpenAI response received, length:', answer.length);
    
    // Format the response to ensure proper structure
    answer = formatChatbotResponse(answer);
    
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
