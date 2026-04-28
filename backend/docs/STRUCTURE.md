# AlboTax Backend - Project Structure

```
AlboTax_Backend/
│
├── venv/                          # Virtual environment (excluded from git)
│
├── app/                           # Main application package
│   ├── __init__.py
│   │
│   ├── main.py                    # FastAPI app initialization & configuration
│   │
│   ├── api/                       # API layer
│   │   ├── __init__.py
│   │   └── v1/                    # API version 1
│   │       ├── __init__.py
│   │       ├── router.py          # Main router aggregating all endpoints
│   │       └── endpoints/         # Individual endpoint modules
│   │           ├── __init__.py
│   │           ├── auth.py        # Authentication endpoints
│   │           ├── riders.py      # Rider/passenger endpoints
│   │           ├── drivers.py     # Driver endpoints
│   │           ├── rides.py       # Ride management endpoints
│   │           ├── payments.py    # Payment endpoints
│   │           └── notifications.py # Notification endpoints
│   │
│   ├── core/                      # Core functionality
│   │   ├── __init__.py
│   │   ├── config.py              # Application configuration & settings
│   │   ├── security.py            # Security utilities (JWT, hashing, etc.)
│   │   ├── dependencies.py        # FastAPI dependencies
│   │   └── events.py              # Startup/shutdown events
│   │
│   ├── models/                    # Database models (Supabase/SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── user.py                # Base user model
│   │   ├── rider.py               # Rider/passenger model
│   │   ├── driver.py              # Driver model
│   │   ├── ride.py                # Ride model
│   │   ├── payment.py             # Payment model
│   │   └── notification.py        # Notification model
│   │
│   ├── schemas/                   # Pydantic schemas (request/response)
│   │   ├── __init__.py
│   │   ├── auth.py                # Auth schemas (login, register, token)
│   │   ├── rider.py               # Rider schemas
│   │   ├── driver.py              # Driver schemas
│   │   ├── ride.py                # Ride schemas
│   │   ├── payment.py             # Payment schemas
│   │   └── notification.py        # Notification schemas
│   │
│   ├── services/                  # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth/                  # Authentication service
│   │   │   ├── __init__.py
│   │   │   └── auth_service.py
│   │   ├── riders/                # Rider business logic
│   │   │   ├── __init__.py
│   │   │   └── rider_service.py
│   │   ├── drivers/               # Driver business logic
│   │   │   ├── __init__.py
│   │   │   └── driver_service.py
│   │   ├── rides/                 # Ride business logic
│   │   │   ├── __init__.py
│   │   │   ├── ride_service.py
│   │   │   └── matching_service.py  # Driver-rider matching
│   │   ├── payments/              # Payment processing
│   │   │   ├── __init__.py
│   │   │   └── payment_service.py
│   │   └── notifications/         # Notification service
│   │       ├── __init__.py
│   │       └── notification_service.py
│   │
│   ├── db/                        # Database configuration
│   │   ├── __init__.py
│   │   ├── supabase.py            # Supabase client configuration
│   │   └── session.py             # Database session management
│   │
│   ├── middleware/                # Custom middleware
│   │   ├── __init__.py
│   │   ├── cors.py                # CORS middleware
│   │   ├── error_handler.py       # Error handling middleware
│   │   └── logging.py             # Logging middleware
│   │
│   └── utils/                     # Utility functions
│       ├── __init__.py
│       ├── validators.py          # Custom validators
│       ├── helpers.py             # Helper functions
│       └── constants.py           # Application constants
│
├── tests/                         # Test suite
│   ├── __init__.py
│   ├── conftest.py                # Pytest configuration & fixtures
│   ├── unit/                      # Unit tests
│   │   ├── __init__.py
│   │   └── test_*.py
│   ├── integration/               # Integration tests
│   │   ├── __init__.py
│   │   └── test_*.py
│   ├── api/                       # API endpoint tests
│   │   ├── __init__.py
│   │   └── test_*.py
│   └── services/                  # Service layer tests
│       ├── __init__.py
│       └── test_*.py
│
├── .env                           # Environment variables (not in git)
├── .env.example                   # Example environment variables
├── .gitignore                     # Git ignore rules
├── requirements.txt               # Python dependencies
├── README.md                      # Project documentation
└── STRUCTURE.md                   # This file
```

## Module Responsibilities

### API Layer (`app/api/`)
- Route definitions and request handling
- Request validation using Pydantic schemas
- Response formatting
- Delegating business logic to services

### Core (`app/core/`)
- Application configuration and settings
- Security utilities (authentication, authorization)
- Shared dependencies
- Application lifecycle events

### Models (`app/models/`)
- Database table definitions
- ORM models for Supabase
- Model relationships and constraints

### Schemas (`app/schemas/`)
- Request/response data validation
- Data transfer objects (DTOs)
- Input/output serialization

### Services (`app/services/`)
- Business logic implementation
- Data processing and transformation
- External API integrations
- Complex operations and workflows

### Database (`app/db/`)
- Database connection and configuration
- Supabase client initialization
- Session management

### Middleware (`app/middleware/`)
- Request/response interceptors
- Cross-cutting concerns (logging, error handling)
- CORS configuration

### Utils (`app/utils/`)
- Reusable utility functions
- Helper methods
- Constants and enums

## Key Features to Implement

Based on the taxi app requirements:

1. **Authentication & Authorization**
   - User registration (riders & drivers)
   - Login/logout
   - JWT token management
   - Role-based access control

2. **Rider Management**
   - Profile management
   - Ride booking
   - Ride history
   - Payment methods

3. **Driver Management**
   - Profile management
   - Vehicle information
   - Availability status
   - Earnings tracking

4. **Ride Management**
   - Ride creation and matching
   - Real-time tracking
   - Ride status updates
   - Fare calculation

5. **Payment Processing**
   - Payment method management
   - Transaction processing
   - Payment history
   - Refunds

6. **Notifications**
   - Push notifications
   - Email notifications
   - SMS notifications
   - In-app notifications

## Next Steps

1. Set up environment variables (.env)
2. Configure Supabase connection
3. Implement core configuration
4. Create database models
5. Define Pydantic schemas
6. Implement service layer
7. Create API endpoints
8. Add middleware
9. Write tests
10. Add documentation
