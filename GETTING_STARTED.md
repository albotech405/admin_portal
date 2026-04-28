# 🚀 Getting Started with inDrive Admin Portal

## Welcome! 👋

You now have a complete, production-ready React admin portal for managing inDrive ride-sharing payments and drivers. This guide will get you up and running in 5 minutes.

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dependencies (2 min)
```bash
cd admin_portal
npm install
```

This installs all required packages. Wait for completion.

### Step 2: Configure Environment (2 min)
```bash
# Create .env file from example
cp .env.example .env

# Open .env and add your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_ADMIN_TOKEN=your-admin-jwt-token
```

**Where to get these:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Copy **Project URL** → `VITE_SUPABASE_URL`
4. Copy **JWT token** from Auth → `VITE_ADMIN_TOKEN`

### Step 3: Start Dev Server (1 min)
```bash
npm run dev
```

**Open in browser:** `http://localhost:3000`

That's it! You should see the admin portal. 🎉

---

## 🎯 What You Can Do Now

### Dashboard
- See metrics: Pending payments, pending drivers, active drivers, active rides
- Auto-updates every 30 seconds
- Quick action buttons to navigate

### Payment Verification
- View pending payment requests in a table
- Click any row to see full details with document preview
- Approve (green button) or Reject (red button) payments
- Confirmation modal for safety

### Driver Approval
- View pending driver applications
- Filter by status (Pending, Approved, Rejected)
- See full driver details and documents
- Approve, Reject, or Suspend drivers

### Wallet
- View driver wallet balance
- See transaction history
- Track credits and debits

---

## 📂 Understanding the Project Structure

```
admin_portal/
├── src/
│   ├── components/          ← UI components (Button, Card, Modal, etc.)
│   ├── pages/              ← Page components (Dashboard, Payments, etc.)
│   ├── services/           ← API integration (Supabase)
│   ├── App.tsx            ← Main app with routing
│   ├── main.tsx           ← Entry point
│   └── index.css          ← Global styles
├── .env                    ← Your credentials (add these!)
├── package.json           ← Dependencies
├── tsconfig.json          ← TypeScript config
├── vite.config.ts         ← Vite config
├── tailwind.config.js     ← Tailwind config
└── index.html             ← HTML entry
```

---

## 🔧 Development Workflow

### Adding a New Component

Create a file in `src/components/`:

```typescript
// src/components/MyComponent.tsx
import React from 'react'

interface MyComponentProps {
  title: string
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return <div className="p-4 bg-blue-50 rounded">{title}</div>
}
```

Then export from `src/components/index.ts`:
```typescript
export { MyComponent } from './MyComponent'
```

### Adding a New Page

Create a file in `src/pages/`:

```typescript
// src/pages/MyPage.tsx
import React from 'react'
import { Card } from '../components'

export const MyPage: React.FC = () => {
  return (
    <div>
      <h1>My Page</h1>
      <Card>Content here</Card>
    </div>
  )
}
```

Add route in `src/App.tsx`:
```typescript
import { MyPage } from './pages'

// In Routes:
<Route path="/mypage" element={<MyPage />} />
```

---

## 🎨 Styling Guide

The project uses **Tailwind CSS**. All styling is done with utility classes:

```tsx
// Example: Styled card
<div className="bg-white rounded-lg shadow p-6 border border-gray-200">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
  <p className="text-gray-600 mt-2">Description</p>
</div>
```

Common classes:
- `p-4` → padding 1rem
- `m-4` → margin 1rem
- `text-xl` → large text
- `font-bold` → bold text
- `bg-blue-600` → blue background
- `text-white` → white text
- `rounded-lg` → rounded corners
- `shadow` → shadow effect

See [Tailwind Docs](https://tailwindcss.com/) for complete class list.

---

## 🔌 Using the API Service

The `supabaseService` handles all backend communication:

```typescript
import { supabaseService } from '@/services/supabaseService'

// Get payment requests
const payments = await supabaseService.getPaymentRequests('pending')

// Approve payment
await supabaseService.approvePaymentRequest(id, adminId)

// Get drivers
const drivers = await supabaseService.getDrivers('pending')

// And many more methods...
```

See `API_REFERENCE.md` for complete API documentation.

---

## 🐛 Common Tasks

### Change Primary Color
Edit `tailwind.config.js`:
```js
colors: {
  primary: '#007acc', // Your color
}
```

### Add a Loading Spinner
```tsx
{isLoading && (
  <div className="flex justify-center">
    <p className="text-gray-500">Loading...</p>
  </div>
)}
```

### Show Error Message
```tsx
{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
    {error}
  </div>
)}
```

### Create a Button
```tsx
import { Button } from '@/components'

<Button variant="success" onClick={handleClick}>
  Click Me
</Button>
// Variants: primary, success, danger, warning, secondary
// Sizes: sm, md, lg
```

---

## 📊 Available Commands

```bash
# Development
npm run dev               # Start dev server on port 3000
npm run lint             # Check code quality

# Production
npm run build            # Build optimized version
npm run preview          # Preview production build locally

# Utilities
npm install              # Install dependencies
npm update               # Update packages
```

---

## 🚀 Deploying to Production

### Build for Production
```bash
npm run build
```

This creates a `dist/` folder with optimized files.

### Deploy to Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

Follow the prompts. Add environment variables in Vercel dashboard.

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Deploy Anywhere
The `dist/` folder contains static files that can be deployed to any hosting service.

---

## ❓ FAQs

### Q: How do I change the app name?
**A:** Edit the header in `src/App.tsx`:
```tsx
<span className="text-2xl font-bold text-blue-600">My App Name</span>
```

### Q: How do I add more navigation links?
**A:** Edit the nav section in `src/App.tsx`:
```tsx
<Link to="/mypage" className="...">My Page</Link>
```

### Q: How do I customize colors?
**A:** Edit `tailwind.config.js` and update classes in components.

### Q: Can I use different fonts?
**A:** Yes! Add to `tailwind.config.js`:
```js
fontFamily: {
  sans: ['Inter', 'sans-serif'],
}
```

### Q: How do I add icons?
**A:** The project includes `lucide-react`. Use like:
```tsx
import { Heart } from 'lucide-react'
<Heart size={24} />
```

### Q: What if the API isn't working?
**A:** Check:
1. `.env` file has correct credentials
2. Supabase backend is deployed
3. RPC functions exist and are callable
4. Browser console for error messages

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Full feature & setup documentation |
| `QUICKSTART.md` | Quick checklist |
| `PROJECT_SUMMARY.md` | Project overview |
| `API_REFERENCE.md` | Complete API documentation |
| `IMPLEMENTATION_GUIDE.md` | Customization guide |
| `GETTING_STARTED.md` | This file |

---

## 🎓 Learning Resources

- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/
- **React Router**: https://reactrouter.com/
- **Vite**: https://vitejs.dev/
- **Supabase**: https://supabase.com/docs

---

## 🆘 Troubleshooting

### Problem: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

### Problem: "Port 3000 already in use"
**Solution:** Run `npm run dev -- --port 3001`

### Problem: Styles not showing
**Solution:** Clear browser cache (Ctrl+Shift+Delete), restart dev server

### Problem: API calls failing
**Solution:** 
1. Check `.env` has correct credentials
2. Check Supabase backend is set up
3. Check browser console for errors

### Problem: "Module not found"
**Solution:** Run `npm install` again

### Problem: TypeScript errors
**Solution:** Restart VS Code and dev server

---

## 📞 Need Help?

1. **Check the docs** - README.md, API_REFERENCE.md
2. **Check the console** - Press F12, look for errors
3. **Check the code** - Comments explain everything
4. **Search online** - React, TypeScript, Tailwind docs

---

## 🎉 You're Ready!

Your inDrive admin portal is ready to use. All the hard work is done. Now it's time to:

1. ✅ Start the dev server
2. ✅ Test the features
3. ✅ Customize to your needs
4. ✅ Deploy to production

**Start now:**
```bash
npm run dev
```

---

**Happy coding! 🚀**

*Questions? Check the documentation files or review the source code - everything is well-commented.*
