# 🎯 Quick Reference Card

## Start Here 👇

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your credentials

# 3. Run
npm run dev

# 4. Open browser
# http://localhost:3000
```

---

## 📚 Documentation Map

| Need | File | Time |
|------|------|------|
| Quick start | GETTING_STARTED.md | 5 min |
| Full docs | README.md | 20 min |
| API details | API_REFERENCE.md | 15 min |
| Customization | IMPLEMENTATION_GUIDE.md | 10 min |
| Architecture | ARCHITECTURE.md | 10 min |
| What's included | DELIVERABLES.md | 5 min |

---

## 🎯 Quick Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Check code quality
npm install          # Install dependencies
npm update           # Update packages
```

---

## 🔑 Add Credentials

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_ADMIN_TOKEN=your-admin-jwt-token
```

---

## 📄 Pages Available

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/` | 4 metrics, quick actions |
| Payments | `/payments` | List, detail, approve/reject |
| Drivers | `/drivers` | List, detail, approve/reject/suspend |
| Wallet | `/wallet/:id` | Balance, transactions |

---

## 🎨 Components

```typescript
import { Button, Card, Modal, Table, Badge, DocumentPreview } from '@/components'

// Button
<Button variant="success" onClick={handleClick}>Approve</Button>
// Variants: primary, success, danger, warning, secondary

// Card
<Card><h2>Title</h2><p>Content</p></Card>

// Modal
<Modal isOpen={isOpen} title="Title" onConfirm={handleConfirm}>Content</Modal>

// Table
<Table columns={cols} data={data} onRowClick={click} />

// Badge
<Badge status="pending">Pending</Badge>

// DocumentPreview
<DocumentPreview fileUrl={url} fileType="pdf" />
```

---

## 🔌 API Methods

```typescript
import { supabaseService } from '@/services/supabaseService'

// Payments
supabaseService.getPaymentRequests('pending')
supabaseService.approvePaymentRequest(id, adminId)
supabaseService.rejectPaymentRequest(id, adminId, reason)

// Drivers
supabaseService.getDrivers('pending')
supabaseService.approveDriver(driverId)
supabaseService.rejectDriver(driverId, reason)
supabaseService.suspendDriver(driverId)

// Wallet
supabaseService.getWalletBalance(driverId)
supabaseService.getWalletTransactions(driverId)

// Dashboard
supabaseService.getDashboardMetrics()
```

---

## 🎯 Common Tasks

### Add Loading State
```tsx
{isLoading ? <p>Loading...</p> : <Content />}
```

### Show Error
```tsx
{error && <div className="bg-red-100 p-4">{error}</div>}
```

### Navigate
```tsx
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
navigate('/payments')
```

### Use State
```tsx
const [count, setCount] = useState(0)
const handleClick = () => setCount(count + 1)
```

### Fetch Data
```tsx
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await supabaseService.getPayments()
      setData(data)
    } catch (err) {
      setError('Failed to load')
    }
  }
  loadData()
}, [])
```

---

## 🎨 Tailwind Classes

```
p-4         padding
m-4         margin
text-xl     large text
font-bold   bold
bg-blue-600 blue background
text-white  white text
rounded-lg  rounded corners
shadow      shadow
border      border
grid        grid layout
flex        flex layout
gap-4       gap between items
justify-center  center horizontally
items-center    center vertically
```

---

## 🚀 Deploy Commands

```bash
# Build
npm run build

# Vercel
npm i -g vercel && vercel

# Netlify
npm run build
# Upload dist/ to Netlify

# Docker
docker build -t admin-portal .
docker run -p 3000:3000 admin-portal
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Module not found | Run `npm install` |
| Port 3000 in use | `npm run dev -- --port 3001` |
| Styles not showing | Clear cache (Ctrl+Shift+Del) |
| API failing | Check `.env` credentials |
| TS errors | Restart VS Code |

---

## 📁 Project Structure

```
admin_portal/
├── src/
│   ├── components/   (UI components)
│   ├── pages/       (Page components)
│   ├── services/    (API integration)
│   ├── App.tsx      (Main app)
│   └── main.tsx     (Entry point)
├── .env             (YOUR CREDENTIALS)
├── package.json     (Dependencies)
├── vite.config.ts   (Build config)
└── README.md        (Full docs)
```

---

## 🔑 Key Files

| File | Purpose | Edit? |
|------|---------|-------|
| `.env` | Credentials | YES - Add yours |
| `App.tsx` | Main app | Maybe - Customize |
| `src/components/` | UI | Maybe - Modify styles |
| `tailwind.config.js` | Colors | Maybe - Change colors |
| `README.md` | Docs | NO - Read only |

---

## ✨ Features

✅ Payment verification  
✅ Driver approval  
✅ Wallet tracking  
✅ Admin dashboard  
✅ Real-time updates  
✅ Responsive design  
✅ Error handling  
✅ Type safety  
✅ Clean UI  
✅ Production ready  

---

## 🎯 Workflow

```
Code → Dev Server (HMR) → Browser (Auto-refresh) → Test
                ↓
            npm run build → dist/ → Deploy
```

---

## 📞 Need Help?

1. Check GETTING_STARTED.md
2. Check README.md
3. Check API_REFERENCE.md
4. Check source code comments
5. Check browser console (F12)

---

## 🎉 You're Ready!

```bash
npm install && npm run dev
```

Open http://localhost:3000 and start building! 🚀

---

**Version**: 1.0.0 | **Status**: ✅ Complete | **Date**: April 2026
