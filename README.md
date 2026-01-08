# PropertyReply Backend API

Contact form email API for PropertyReply using Node.js, Express, and Nodemailer.

## Features

- ✅ POST `/api/contact` endpoint for contact form submissions
- ✅ Email sending via Gmail using Nodemailer
- ✅ CORS enabled for frontend integration
- ✅ Input validation and error handling
- ✅ Vercel deployment ready

## API Endpoint

**POST** `/api/contact`

### Request Body
```json
{
  "name": "string (required)",
  "email": "string (required, valid email format)",
  "phone": "string (optional)",
  "message": "string (required)"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Your message has been sent successfully. We will get back to you within 24 hours."
}
```

### Error Responses

- **400 Bad Request**: Missing required fields or invalid email
- **405 Method Not Allowed**: Wrong HTTP method
- **500 Internal Server Error**: Email sending failed

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```env
   CEO_EMAIL=info@propertyreply.com
   CEO_APP_PASSWORD=ttnwkqnqwjqyrspz
   PORT=5000
   ```

3. **Run the server:**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

4. **Test the API:**
   ```bash
   curl -X POST http://localhost:5000/api/contact \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "phone": "+44 1234 567890",
       "message": "This is a test message"
     }'
   ```

## Vercel Deployment

1. **Install Vercel CLI (if not already installed):**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add:
     - `CEO_EMAIL` = `info@propertyreply.com`
     - `CEO_APP_PASSWORD` = `ttnwkqnqwjqyrspz`

4. **Or set via CLI:**
   ```bash
   vercel env add CEO_EMAIL
   vercel env add CEO_APP_PASSWORD
   ```

5. **Redeploy after adding environment variables:**
   ```bash
   vercel --prod
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CEO_EMAIL` | Gmail address for sending/receiving emails | Yes |
| `CEO_APP_PASSWORD` | Gmail App Password (not regular password) | Yes |
| `PORT` | Server port (default: 5000) | No |

## Gmail App Password Setup

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to "App passwords" section
4. Generate a new app password for "Mail"
5. Use the generated password as `CEO_APP_PASSWORD`

## Frontend Integration

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://your-api-domain.vercel.app';

const response = await fetch(`${API_URL}/api/contact`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+44 1234 567890', // optional
    message: 'Your message here'
  }),
});

const data = await response.json();
console.log(data);
```

## Dependencies

- `express` - Web framework
- `nodemailer` - Email sending
- `cors` - CORS middleware
- `dotenv` - Environment variables

## License

ISC