# 🚀 Quick Start Checklist

## Pre-Setup
- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm/yarn available (`npm --version`)
- [ ] Supabase account created
- [ ] Backend tables and RPC functions deployed

## Installation
- [ ] Clone repository
- [ ] Navigate to project directory: `cd admin_portal`
- [ ] Install dependencies: `npm install`
- [ ] Wait for installation to complete

## Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Get Supabase URL from Supabase dashboard
- [ ] Get admin JWT token from Supabase auth
- [ ] Update `.env` with credentials:
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_ADMIN_TOKEN=your-token-here
  ```

## Running Locally
- [ ] Start dev server: `npm run dev`
- [ ] Open browser to `http://localhost:3000`
- [ ] Test navigation between pages
- [ ] Test API connections (check browser console for errors)

## Testing Features
- [ ] Dashboard loads with metrics
- [ ] Payment Verification page shows requests
- [ ] Driver Approval page shows drivers
- [ ] Can open payment/driver detail views
- [ ] Document preview works
- [ ] Buttons are functional

## API Integration Checklist
- [ ] Confirm Supabase tables exist:
  - [ ] `payment_requests`
  - [ ] `drivers`
  - [ ] `wallet_transactions`
- [ ] Confirm RPC functions deployed:
  - [ ] `approve_wallet_topup`
  - [ ] `reject_wallet_topup`
  - [ ] `approve_driver`
  - [ ] `reject_driver`
  - [ ] `get_dashboard_metrics`
- [ ] Test API calls in browser Network tab
- [ ] Verify CORS settings in Supabase

## Customization (Optional)
- [ ] Update app name in header (src/App.tsx)
- [ ] Customize color scheme (tailwind.config.js)
- [ ] Adjust table columns in pages
- [ ] Add/remove navigation links
- [ ] Customize error messages

## Deployment Preparation
- [ ] Run build: `npm run build`
- [ ] Check dist/ folder created
- [ ] Test production build: `npm run preview`
- [ ] Choose deployment platform (Vercel/Netlify/other)
- [ ] Set up environment variables on platform
- [ ] Deploy!

## Post-Launch
- [ ] Monitor error logs
- [ ] Test all features in production
- [ ] Verify API calls working
- [ ] Check responsive design on mobile
- [ ] Set up monitoring/analytics (optional)

## Troubleshooting
If you encounter issues:

1. **Dependencies not installing**
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

2. **Port 3000 in use**
   ```bash
   npm run dev -- --port 3001
   ```

3. **Environment variables not loading**
   - Restart dev server
   - Check `.env` file exists in root
   - Verify variable names are correct

4. **API calls failing**
   - Check browser console for errors
   - Verify Supabase URL and token
   - Check CORS settings
   - Test API directly with curl/Postman

5. **Styles not showing**
   - Clear browser cache
   - Rebuild: `npm run build`
   - Check Tailwind config

## File Overview

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `.env` | Your Supabase credentials |
| `src/App.tsx` | Main app and routing |
| `src/components/*` | Reusable UI components |
| `src/pages/*` | Page components |
| `src/services/supabaseService.ts` | API integration |
| `tailwind.config.js` | Styling configuration |

## Next Steps

1. ✅ Complete checklist above
2. 📖 Read README.md for full documentation
3. 🔧 Review IMPLEMENTATION_GUIDE.md for customization
4. 🚀 Deploy to production
5. 📊 Monitor and iterate based on feedback

## Quick Commands Reference

```bash
# Development
npm run dev                # Start dev server
npm run lint              # Check code quality
npm run build             # Build for production
npm run preview           # Preview production build

# Environment
cp .env.example .env      # Create .env file
npm install               # Install dependencies
npm update                # Update packages
```

## Support Resources

- 📖 Full docs: See README.md
- 🔧 Implementation: See IMPLEMENTATION_GUIDE.md
- 🌐 Supabase docs: https://supabase.com/docs
- ⚛️ React docs: https://react.dev
- 🎨 Tailwind docs: https://tailwindcss.com/docs

---

**You're all set! Happy coding! 🎉**
