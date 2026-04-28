# AlboTax Backend - Setup Guide

## Prerequisites

- Python 3.10 or higher
- Supabase account and project
- Git (for version control)

## Step-by-Step Setup

### 1. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Supabase

#### Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - ⚠️ Keep this secret!

#### Update `.env` File

Open `.env` file and update the Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Database URL (from Supabase Settings → Database → Connection String)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Security - Generate a secure random key
SECRET_KEY=your-super-secret-key-minimum-32-characters-long
```

#### Generate a Secure SECRET_KEY

**Option 1 - Using Python:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Option 2 - Using OpenSSL:**
```bash
openssl rand -hex 32
```

Copy the generated key and paste it as your `SECRET_KEY` in `.env`.

### 4. Set Up Database Tables in Supabase

Go to your Supabase project → **SQL Editor** and create the basic tables:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('rider', 'driver', 'admin')),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);
```

### 5. Test the Connection

Run the application:

```bash
python main.py
```

You should see:
```
🚀 Starting AlboTax Backend v1.0.0
📍 Environment: development
🔧 Debug mode: True
✅ Supabase client initialized successfully
🌐 API will be available at http://0.0.0.0:8000
📚 API docs at http://0.0.0.0:8000/docs
```

### 6. Test API Endpoints

Open your browser and visit:

- **API Documentation**: http://localhost:8000/docs
- **Root endpoint**: http://localhost:8000/
- **Health check**: http://localhost:8000/health
- **Database health**: http://localhost:8000/health/db

The database health endpoint should return:
```json
{
    "status": "healthy",
    "database": "connected",
    "supabase_url": "https://your-project.supabase.co",
    "message": "Database connection successful"
}
```

## Environment Variables Explained

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `SUPABASE_KEY` | Supabase anon/public key | ✅ Yes |
| `SUPABASE_SERVICE_KEY` | Service role key (admin access) | ✅ Yes |
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `SECRET_KEY` | JWT secret key (min 32 chars) | ✅ Yes |
| `DEBUG` | Enable debug mode | ❌ No (default: False) |
| `ENVIRONMENT` | Environment (development/staging/production) | ❌ No |
| `ALLOWED_ORIGINS` | CORS allowed origins | ❌ No |

## Security Best Practices

### ✅ DO:
- Use strong, randomly generated `SECRET_KEY`
- Keep `.env` file out of version control (already in `.gitignore`)
- Use `SUPABASE_SERVICE_KEY` only for admin operations
- Rotate credentials regularly
- Use different credentials for each environment

### ❌ DON'T:
- Commit `.env` file to Git
- Share `SUPABASE_SERVICE_KEY` publicly
- Use weak or predictable `SECRET_KEY`
- Use production credentials in development
- Hardcode sensitive values in code

## Troubleshooting

### Error: "Failed to initialize Supabase"

**Solution:**
- Verify your `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check if your Supabase project is active
- Ensure you have internet connection

### Error: "SECRET_KEY must be at least 32 characters long"

**Solution:**
- Generate a new secret key using the commands in step 3
- Update `.env` with the new key

### Error: "Database connection failed"

**Solution:**
- Verify `DATABASE_URL` is correct
- Check if the `users` table exists in Supabase
- Ensure your database is accessible

## Next Steps

Now that your backend is connected to Supabase:

1. ✅ Virtual environment activated
2. ✅ Dependencies installed
3. ✅ Supabase connected
4. ✅ Environment variables configured
5. ✅ Basic tables created

**Ready to build!** 🚀

What would you like to implement next?
- Authentication endpoints (login, register, logout)
- Rider management
- Driver management
- Ride booking system
- Payment integration
