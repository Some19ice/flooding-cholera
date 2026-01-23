# Cholera Environmental Surveillance App
## Feature Implementation Specification

**Project:** Cross River State Cholera Early Warning System
**Current Status:** Phase 1 Partial (Core Dashboard & Data Import Complete)
**Last Updated:** January 2026

---

## IMPLEMENTATION STATUS OVERVIEW

| Category | Status | Completion |
|----------|--------|------------|
| Core Dashboard | ✅ Complete | 90% |
| Interactive Map | ✅ Complete | 85% |
| Data Upload & Import | ✅ Complete | 90% |
| Risk Calculation Engine | ✅ Complete | 80% |
| Analytics & Charts | ✅ Complete | 75% |
| User Management & Auth | ❌ Not Started | 0% |
| Alerts & Notifications | ⚠️ Partial | 20% |
| Satellite Integration | ⚠️ Partial | 30% |
| Mobile Application | ❌ Not Started | 0% |
| WASH Module | ❌ Not Started | 0% |
| Case Reporting | ⚠️ Partial | 25% |
| Laboratory Integration | ❌ Not Started | 0% |
| Resource Management | ❌ Not Started | 0% |
| Reporting Engine | ⚠️ Partial | 20% |
| External Integrations | ❌ Not Started | 0% |

---

## PHASE 1: PRIORITY FEATURES (Immediate)

### 1.1 User Authentication & Authorization

**Status:** ❌ Not Started
**Priority:** CRITICAL
**Effort:** Medium

#### Backend Implementation

```
backend/app/
├── models/user.py          # User, Role, Permission models
├── routers/auth.py         # Login, logout, password reset
├── services/auth.py        # JWT handling, password hashing
├── middleware/auth.py      # Request authentication middleware
└── schemas/auth.py         # Auth request/response schemas
```

**Database Models:**

| Model | Fields |
|-------|--------|
| User | id, email, phone, password_hash, first_name, last_name, role_id, lga_id (nullable), is_active, last_login, created_at |
| Role | id, name, description, permissions (JSON) |
| Session | id, user_id, token_hash, expires_at, ip_address, user_agent |
| AuditLog | id, user_id, action, resource, details (JSON), timestamp, ip_address |

**User Roles:**

| Role | Access Level |
|------|--------------|
| super_admin | Full system access, user management |
| state_epidemiologist | All LGAs, model calibration, alerts |
| lga_health_officer | Assigned LGA only, case reporting |
| field_worker | Mobile app, offline capability, GPS tagging |
| data_analyst | Read-only analytics, satellite data |
| public_viewer | Public dashboard only |

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Email/password login, returns JWT |
| `/api/auth/logout` | POST | Invalidate session |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/forgot-password` | POST | Send reset email/SMS |
| `/api/auth/reset-password` | POST | Reset with token |
| `/api/auth/me` | GET | Current user profile |
| `/api/users` | GET/POST | User CRUD (admin only) |
| `/api/users/{id}` | GET/PUT/DELETE | User management |
| `/api/roles` | GET | List available roles |

**Security Requirements:**
- [ ] JWT with 15-minute access token, 7-day refresh token
- [ ] Password: min 8 chars, 1 uppercase, 1 number, 1 special
- [ ] Rate limit: 5 failed logins = 15-minute lockout
- [ ] Session invalidation on password change
- [ ] Audit log all authentication events

#### Frontend Implementation

```
frontend/src/
├── pages/
│   ├── Login.tsx
│   ├── ForgotPassword.tsx
│   └── ResetPassword.tsx
├── components/Auth/
│   ├── ProtectedRoute.tsx
│   ├── RoleGuard.tsx
│   └── SessionTimeout.tsx
├── hooks/useAuth.ts
└── store/authStore.ts
```

**Features:**
- [ ] Login form with validation
- [ ] "Remember me" checkbox
- [ ] Forgot password flow
- [ ] Session timeout warning (5 min before expiry)
- [ ] Auto-logout on inactivity (30 min)
- [ ] Role-based UI rendering

---

### 1.2 Alert System Enhancement

**Status:** ⚠️ Partial (UI exists, no backend)
**Priority:** HIGH
**Effort:** Medium

#### Alert Engine Backend

**Database Models:**

| Model | Fields |
|-------|--------|
| Alert | id, lga_id, level (green/yellow/red), type, title, message, triggered_by (JSON), created_at, acknowledged_at, acknowledged_by, resolved_at |
| AlertRule | id, name, condition (JSON), level, is_active, created_by |
| AlertSubscription | id, user_id, lga_ids (array), channels (sms/email/push), min_level |
| Notification | id, alert_id, user_id, channel, sent_at, delivered_at, read_at |

**Threshold Configuration:**

```python
ALERT_THRESHOLDS = {
    "yellow": {
        "rainfall_7day_mm": 150,       # 75th percentile
        "lst_day": 30,                 # °C for 2+ consecutive days
        "flood_extent_pct": 5,         # % of LGA flooded
        "new_cases_7day": 3,           # suspected cases
    },
    "red": {
        "rainfall_7day_mm": 200,
        "ndwi": 0.5,                   # in populated areas
        "flood_extent_pct": 15,
        "new_cases_7day": 10,
        "confirmed_case_vulnerable": 1 # any confirmed in high-risk area
    }
}
```

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/alerts` | GET | List alerts with filters |
| `/api/alerts/{id}` | GET | Alert details |
| `/api/alerts/{id}/acknowledge` | POST | Mark as seen |
| `/api/alerts/{id}/resolve` | POST | Close alert |
| `/api/alerts/rules` | GET/POST | Manage alert rules |
| `/api/alerts/subscriptions` | GET/POST | User subscriptions |
| `/api/alerts/history` | GET | Historical alerts |

**Notification Channels:**
- [ ] Email (via SendGrid/Mailgun)
- [ ] SMS (via Twilio/Africa's Talking)
- [ ] In-app push notifications
- [ ] WhatsApp Business API integration
- [ ] Webhook for external systems

#### Frontend Enhancements

**Update `AlertsPanel.tsx`:**
- [ ] Real-time alert feed (WebSocket/polling)
- [ ] Alert detail modal
- [ ] Acknowledge/resolve actions
- [ ] Filter by level, LGA, date
- [ ] Subscription management UI
- [ ] Alert timeline visualization
- [ ] Sound notification option

---

### 1.3 Case Reporting Module

**Status:** ⚠️ Partial (bulk upload only)
**Priority:** HIGH
**Effort:** Medium

#### Quick Case Entry Form

**Extend CaseReport Model:**

| New Field | Type | Description |
|-----------|------|-------------|
| patient_id | string | Anonymous identifier |
| age | integer | Patient age |
| age_unit | enum | years/months |
| sex | enum | M/F/unknown |
| ward_id | FK | Ward reference |
| village | string | Specific location |
| latitude | float | GPS coordinate |
| longitude | float | GPS coordinate |
| onset_date | date | Symptom onset |
| symptoms | JSON | Checklist results |
| severity | enum | mild/moderate/severe |
| dehydration_level | enum | none/some/severe |
| treatment_status | enum | ongoing/recovered/deceased/transferred |
| outcome_date | date | Recovery/death date |
| hospitalized | boolean | Required admission |
| treatment_given | JSON | ORS, IV, antibiotics |
| water_source | enum | Type of water used |
| reported_by | FK | User reference |
| verified_by | FK | Verifier reference |
| verified_at | datetime | Verification time |
| photos | JSON | File paths array |

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cases` | GET | List with filters, pagination |
| `/api/cases` | POST | Create new case |
| `/api/cases/{id}` | GET/PUT/DELETE | Case CRUD |
| `/api/cases/{id}/verify` | POST | Verify case |
| `/api/cases/search` | POST | Advanced search |
| `/api/cases/duplicate-check` | POST | Check for duplicates |
| `/api/cases/export` | GET | Export line listing |

#### Frontend Components

```
frontend/src/components/Cases/
├── CaseEntryForm.tsx      # Quick entry form
├── CaseList.tsx           # Searchable table
├── CaseDetail.tsx         # Full case view
├── CaseMap.tsx            # Case location map
├── EpiCurve.tsx           # Epidemic curve chart
└── LineListingTable.tsx   # Exportable table
```

**Features:**
- [ ] Multi-step form with validation
- [ ] GPS auto-capture (browser geolocation)
- [ ] Photo upload with compression
- [ ] Duplicate detection warning
- [ ] Symptoms checklist component
- [ ] Quick symptom-based severity calculator
- [ ] Linked cases (contact clusters)

---

### 1.4 Satellite Data Full Integration

**Status:** ⚠️ Partial (stubs exist)
**Priority:** HIGH
**Effort:** High

#### Complete Service Implementation

**Google Earth Engine Integration (`earth_engine.py`):**

```python
# Required implementations:
class EarthEngineService:
    def get_rainfall_gpm(self, lga_geometry, start_date, end_date)
    def get_land_surface_temp(self, lga_geometry, date)  # MODIS
    def get_ndvi(self, lga_geometry, date)               # Sentinel-2
    def get_ndwi(self, lga_geometry, date)               # Water index
    def get_flood_extent(self, lga_geometry, date)       # Sentinel-1 SAR
    def get_all_metrics(self, lga_id, date)              # Combined
```

**NASA Data Integration (`nasa_gpm.py`):**
- [ ] GPM IMERG precipitation (daily, 0.1° resolution)
- [ ] TRMM historical data fallback
- [ ] Giovanni API integration for anomalies

**New Service: Copernicus/Sentinel (`copernicus.py`):**
- [ ] Sentinel-1 SAR for flood mapping
- [ ] Sentinel-2 optical for NDVI/NDWI
- [ ] Data Space API authentication

**Scheduling:**
- [ ] Daily precipitation update (4 AM)
- [ ] Every 3 days: NDVI, LST update
- [ ] After major rainfall: SAR flood check
- [ ] Archive data to time-series database

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/satellite/fetch/rainfall` | POST | Trigger rainfall fetch |
| `/api/satellite/fetch/temperature` | POST | Trigger LST fetch |
| `/api/satellite/fetch/flood` | POST | Trigger flood mapping |
| `/api/satellite/fetch/vegetation` | POST | Trigger NDVI fetch |
| `/api/satellite/fetch/all` | POST | Full update |
| `/api/satellite/schedule` | GET/PUT | View/modify schedule |
| `/api/satellite/logs` | GET | Processing logs |

#### Frontend Satellite Panel

**Update `SatellitePanel.tsx`:**
- [ ] Data freshness indicators per metric
- [ ] Last update timestamp
- [ ] Manual fetch trigger buttons
- [ ] Processing status/progress
- [ ] Historical data browser
- [ ] Layer toggle for map overlay
- [ ] Anomaly highlighting

---

## PHASE 2: ENHANCED ANALYTICS (Next Sprint)

### 2.1 Predictive Modeling Engine

**Status:** ❌ Not Started
**Priority:** HIGH
**Effort:** High

#### Model Implementation

```
backend/app/services/
├── models/
│   ├── glmm_model.py       # Generalized Linear Mixed Model
│   ├── dlnm_model.py       # Distributed Lag Non-linear Model
│   ├── time_series.py      # ARIMA/Prophet forecasting
│   └── ml_ensemble.py      # XGBoost/Random Forest
├── prediction_engine.py    # Model orchestration
└── model_validator.py      # Cross-validation, metrics
```

**Database Tables:**

| Table | Purpose |
|-------|---------|
| ModelRun | id, model_type, run_date, parameters (JSON), metrics (JSON), status |
| Prediction | id, model_run_id, lga_id, target_date, predicted_cases, lower_ci, upper_ci |
| ModelFeature | id, model_run_id, feature_name, importance_score |

**Features:**
- [ ] 4-week ahead case predictions
- [ ] 12-week seasonal forecast
- [ ] Uncertainty quantification (confidence intervals)
- [ ] Lagged environmental variable effects
- [ ] Model comparison dashboard
- [ ] Automatic model retraining schedule
- [ ] Feature importance visualization

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predictions/forecast/{lga_id}` | GET | Get predictions |
| `/api/predictions/run` | POST | Trigger model run |
| `/api/predictions/models` | GET | List available models |
| `/api/predictions/performance` | GET | Model metrics |

---

### 2.2 Advanced Spatial Analysis

**Status:** ⚠️ Partial (basic mapping)
**Priority:** MEDIUM
**Effort:** Medium

#### Spatial Statistics

**New Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/spatial/hotspots` | GET | Getis-Ord Gi* analysis |
| `/api/spatial/clusters` | GET | DBSCAN clustering |
| `/api/spatial/autocorrelation` | GET | Moran's I |
| `/api/spatial/interpolation` | GET | IDW/Kriging surfaces |

**Frontend Components:**

```
frontend/src/components/Spatial/
├── HotspotMap.tsx          # Hotspot visualization
├── ClusterAnalysis.tsx     # Cluster detection
├── SpatialStats.tsx        # Statistics panel
└── InterpolationLayer.tsx  # Continuous surface
```

---

### 2.3 Report Builder

**Status:** ⚠️ Partial (fixed reports)
**Priority:** MEDIUM
**Effort:** Medium

#### Automated Reports

**Report Types:**
- [ ] Daily Situation Report (SitRep)
- [ ] Weekly Epidemiological Bulletin
- [ ] Monthly Performance Report
- [ ] Alert Summary Report
- [ ] Custom Ad-hoc Reports

**Database Tables:**

| Table | Purpose |
|-------|---------|
| ReportTemplate | id, name, type, structure (JSON), schedule |
| ReportGeneration | id, template_id, generated_at, file_path, format |
| ReportSchedule | id, template_id, frequency, recipients (JSON), last_run |

**Features:**
- [ ] Template-based report generation
- [ ] Scheduled automatic generation
- [ ] PDF, Word, Excel export
- [ ] Email distribution
- [ ] Drag-and-drop custom builder
- [ ] Chart embedding
- [ ] WHO IDSR format compliance

---

## PHASE 3: MOBILE APPLICATION

### 3.1 React Native Mobile App

**Status:** ❌ Not Started
**Priority:** MEDIUM
**Effort:** High

#### Project Structure

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── CaseEntryScreen.tsx
│   │   ├── MapScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   ├── services/
│   │   ├── api.ts
│   │   ├── offline.ts
│   │   ├── sync.ts
│   │   └── location.ts
│   ├── store/
│   └── utils/
├── android/
├── ios/
└── package.json
```

#### Core Features

**Offline Capability:**
- [ ] SQLite local database
- [ ] Offline case entry queue
- [ ] Map tile caching
- [ ] Background sync when online
- [ ] Conflict resolution

**Field Data Collection:**
- [ ] GPS auto-tagging
- [ ] Camera integration
- [ ] Voice notes (audio recording)
- [ ] QR/barcode scanning
- [ ] Digital signature capture

**Field Worker Tools:**
- [ ] Daily task assignment
- [ ] Route optimization
- [ ] Household visit logging
- [ ] Water source GPS mapping
- [ ] Health education materials
- [ ] Push notifications

**Technical Requirements:**
- [ ] Biometric authentication
- [ ] Background location tracking
- [ ] Low-bandwidth optimization
- [ ] Battery efficiency
- [ ] Works on low-end Android devices

---

## PHASE 4: INTEGRATION & ADVANCED

### 4.1 External System Integration

**Status:** ❌ Not Started
**Priority:** MEDIUM
**Effort:** High

#### DHIS2 Integration

```python
# backend/app/services/integrations/dhis2.py
class DHIS2Integration:
    def sync_cases(self)              # Push case data
    def pull_population(self)         # Get population data
    def map_indicators(self)          # Indicator mapping
    def validate_sync(self)           # Check data consistency
```

**Configuration:**
- [ ] DHIS2 API credentials management
- [ ] Field mapping configuration
- [ ] Sync schedule (daily/weekly)
- [ ] Error handling and retry

#### NCDC SORMAS Integration

- [ ] Case notification push
- [ ] Alert escalation
- [ ] Laboratory result import
- [ ] Standard report generation

#### API for Third Parties

- [ ] RESTful API with API key auth
- [ ] Webhook registration
- [ ] Rate limiting per client
- [ ] Usage analytics
- [ ] API documentation portal

---

### 4.2 WASH Module

**Status:** ❌ Not Started
**Priority:** MEDIUM
**Effort:** Medium

#### Database Models

| Model | Fields |
|-------|--------|
| WaterSource | id, lga_id, ward_id, type, name, latitude, longitude, status, last_test_date, chlorine_level, e_coli_count, photos |
| SanitationFacility | id, lga_id, ward_id, type, condition, households_served, accessibility_rating |
| WASHIntervention | id, type, lga_id, start_date, end_date, beneficiaries, supplies_distributed (JSON), conducted_by |
| WaterTest | id, source_id, test_date, parameters (JSON), result, tested_by |

**Features:**
- [ ] Interactive water source map
- [ ] Test result tracking
- [ ] Coverage gap analysis
- [ ] Intervention planning
- [ ] Supply distribution tracking
- [ ] Community feedback collection

---

### 4.3 Resource Management

**Status:** ❌ Not Started
**Priority:** MEDIUM
**Effort:** Medium

#### Inventory System

| Model | Fields |
|-------|--------|
| InventoryItem | id, category, name, unit, min_stock_level, reorder_point |
| Stock | id, item_id, facility_id, quantity, batch_number, expiry_date |
| StockMovement | id, item_id, from_facility, to_facility, quantity, reason, moved_by, moved_at |
| Facility | id, name, type (CTC/health center/warehouse), lga_id, capacity |

**Features:**
- [ ] Real-time stock levels
- [ ] Expiry tracking
- [ ] Low stock alerts
- [ ] Transfer management
- [ ] Usage analytics
- [ ] Requisition workflow

#### RRT Management

| Model | Fields |
|-------|--------|
| TeamMember | id, user_id, skills (JSON), certifications, available |
| Team | id, name, members (array), lga_assignment, status |
| Deployment | id, team_id, lga_id, start_date, end_date, purpose, status |

---

### 4.4 Laboratory Integration

**Status:** ❌ Not Started
**Priority:** LOW
**Effort:** Medium

#### Features

- [ ] Sample registration and tracking
- [ ] Barcode/QR code generation
- [ ] Result upload (manual/API)
- [ ] Strain/serogroup recording
- [ ] AMR data tracking
- [ ] Lab network dashboard
- [ ] Turnaround time metrics

---

## PHASE 5: ADVANCED FEATURES

### 5.1 Machine Learning Enhancements

**Status:** ❌ Not Started
**Priority:** LOW
**Effort:** High

**Features:**
- [ ] Anomaly detection for outbreak patterns
- [ ] NLP for case narrative analysis
- [ ] Image recognition for water quality
- [ ] Automated risk factor identification
- [ ] Chatbot for user support

### 5.2 Cross-Border Coordination

**Status:** ❌ Not Started
**Priority:** LOW
**Effort:** Medium

**Cameroon Integration:**
- [ ] Lagdo Dam release data feed
- [ ] Upper Cross River basin monitoring
- [ ] Shared alert system
- [ ] Joint surveillance dashboard

---

## INFRASTRUCTURE REQUIREMENTS

### Backend Enhancements

**Required Additions:**
- [ ] WebSocket server (for real-time updates)
- [ ] Background task queue (Celery + Redis)
- [ ] File storage (S3-compatible)
- [ ] Email service integration
- [ ] SMS gateway integration

**Environment Variables to Add:**

```env
# Authentication
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=

# SMS
SMS_PROVIDER=           # twilio/africastalking
SMS_API_KEY=
SMS_SENDER_ID=

# Storage
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_ENDPOINT=            # For MinIO/compatible

# Satellite APIs
COPERNICUS_CLIENT_ID=
COPERNICUS_CLIENT_SECRET=
```

### Database Migrations

**New Tables Required:**

| Priority | Tables |
|----------|--------|
| Phase 1 | User, Role, Session, AuditLog, Alert, AlertRule, AlertSubscription, Notification |
| Phase 2 | ModelRun, Prediction, ReportTemplate, ReportGeneration |
| Phase 3 | SyncQueue, OfflineData, DeviceRegistration |
| Phase 4 | WaterSource, SanitationFacility, InventoryItem, Stock, TeamMember, Deployment |

### Frontend Dependencies to Add

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.x",      // Advanced tables
    "socket.io-client": "^4.x",           // WebSocket
    "react-hook-form": "^7.x",            // Forms
    "zod": "^3.x",                         // Validation
    "jspdf": "^2.x",                       // PDF generation
    "@react-pdf/renderer": "^3.x",         // PDF templates
    "date-fns": "^3.x",                    // Date utilities
    "react-dropzone": "^14.x",            // Already exists
    "framer-motion": "^11.x"              // Animations
  }
}
```

---

## TESTING REQUIREMENTS

### Backend Tests

| Area | Test Types |
|------|------------|
| Auth | Unit tests for JWT, integration for login flow |
| Alerts | Unit tests for threshold logic, integration for notification |
| Satellite | Mock API responses, integration with DB |
| Predictions | Model validation, accuracy metrics |
| API | All endpoints with pytest-asyncio |

### Frontend Tests

| Area | Test Types |
|------|------------|
| Components | Jest + React Testing Library |
| Integration | Playwright E2E tests |
| Visual | Storybook + Chromatic |

---

## DEPLOYMENT CONSIDERATIONS

### Docker Configuration

```yaml
# docker-compose.yml additions
services:
  redis:
    image: redis:alpine
  celery:
    build: ./backend
    command: celery -A app.celery worker
  celery-beat:
    build: ./backend
    command: celery -A app.celery beat
```

### CI/CD Pipeline

- [ ] GitHub Actions for tests
- [ ] Automated deployment to staging
- [ ] Database migration automation
- [ ] Environment-specific configs
- [ ] Rollback procedures

---

## SUCCESS METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| System uptime | >99.5% | Monitoring |
| API response time | <500ms | APM |
| Data sync latency | <5 min | Logs |
| Case reporting completeness | >95% | Analytics |
| Alert acknowledgment rate | >90% | Tracking |
| Mobile app crash rate | <1% | Crashlytics |
| User satisfaction | >4/5 | Surveys |

---

## NEXT IMMEDIATE ACTIONS

### Sprint 1 (Weeks 1-2): Authentication
1. Create User, Role, Session models
2. Implement JWT auth service
3. Add auth middleware
4. Build login/logout endpoints
5. Create frontend auth flow
6. Add protected routes

### Sprint 2 (Weeks 3-4): Alerts
1. Create Alert, AlertRule models
2. Build alert evaluation engine
3. Integrate with risk calculator
4. Add notification services (email first)
5. Update AlertsPanel UI
6. Add subscription management

### Sprint 3 (Weeks 5-6): Case Entry
1. Extend CaseReport model
2. Build case entry API
3. Create multi-step form UI
4. Add GPS capture
5. Implement duplicate detection
6. Add photo upload

### Sprint 4 (Weeks 7-8): Satellite
1. Complete Earth Engine integration
2. Set up scheduled fetching
3. Add Sentinel-1 flood detection
4. Update satellite panel UI
5. Add map layers for satellite data
6. Implement data quality checks

---

## APPENDIX A: API Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication | 10/min per IP |
| Upload | 10/min per user |
| Satellite fetch | 5/hour per user |
| General API | 100/min per user |
| Public endpoints | 30/min per IP |

## APPENDIX B: Data Retention

| Data Type | Retention |
|-----------|-----------|
| Case data | Indefinite |
| Environmental data | 10 years |
| Audit logs | 3 years |
| Sessions | 30 days |
| Alert history | 5 years |
| Predictions | 2 years |

## APPENDIX C: Supported File Formats

| Purpose | Formats |
|---------|---------|
| Data upload | CSV, XLSX, XLS |
| Photo upload | JPEG, PNG, WebP |
| Report export | PDF, DOCX, XLSX |
| Map export | PNG, GeoJSON, Shapefile |
| Backup | SQL dump, JSON |
