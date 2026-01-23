# Authentication System Documentation

## Overview
A professional demo login system has been implemented for the Cholera Environmental Surveillance System with Nigerian government/health styling.

## Files Created

### 1. `/Users/yakky/Dev/flooding-cholera/frontend/src/store/authStore.ts`
Zustand store for authentication state management with:
- **Persistent storage**: Uses localStorage to maintain login state across sessions
- **User roles**: State Epidemiologist, LGA Health Officer, Field Worker, Data Analyst
- **User data**: Stores email, role, and auto-generated name from email
- **Actions**: `login()` and `logout()` methods

### 2. `/Users/yakky/Dev/flooding-cholera/frontend/src/components/Auth/LoginScreen.tsx`
Professional login interface featuring:
- **Nigerian government branding**:
  - Title: "Cholera Environmental Surveillance System"
  - Subtitle: "Cross River State Ministry of Health"
  - Green health shield logo with Nigerian styling
  - Federal Republic of Nigeria designation
- **Form fields**:
  - Email input with user icon
  - Password input with lock icon
  - Role dropdown selector with briefcase icon
  - Professional gradient "Sign In" button with loading state
- **Demo notice**: Amber notification explaining demo mode
- **Responsive design**: Mobile-first approach with Tailwind CSS
- **Visual features**:
  - Gradient background (blue to green)
  - Elevated card design with shadow
  - Blue gradient header
  - Smooth transitions and hover effects
  - Form validation

### 3. Updated Files

#### `/Users/yakky/Dev/flooding-cholera/frontend/src/components/Layout/Header.tsx`
Enhanced with:
- User profile display (name and role)
- Logout button with icon
- Responsive user info (desktop/mobile layouts)
- Integration with auth store

#### `/Users/yakky/Dev/flooding-cholera/frontend/src/App.tsx`
Modified to:
- Check authentication state
- Conditionally render LoginScreen or main app
- Import and use auth store

## How to Use

### For Demo/Testing
1. Navigate to the application
2. Enter any email address (e.g., `john.doe@health.gov.ng`)
3. Enter any password (not validated)
4. Select a role from the dropdown
5. Click "Sign In"
6. The app will display your name (extracted from email) and role in the header
7. Click the logout icon (arrow-right) to return to login screen

### User Roles
- **State Epidemiologist**: Senior health official overseeing disease surveillance
- **LGA Health Officer**: Local Government Area health administrator
- **Field Worker**: On-ground data collector
- **Data Analyst**: Analytics and reporting specialist

### State Persistence
- Login state persists across browser sessions via localStorage
- Refresh the page and you'll remain logged in
- Logout clears the stored authentication state

## Technical Details

### Architecture
- **State Management**: Zustand with persist middleware
- **Storage**: localStorage key: `cholera-auth-storage`
- **Type Safety**: Full TypeScript support with UserRole type
- **Styling**: Tailwind CSS with custom gradients and transitions

### Security Note
This is a **DEMO-ONLY** authentication system:
- No real password validation
- No backend API calls
- No encryption or security measures
- Suitable only for demonstrations and prototypes
- Do NOT use in production without implementing proper authentication

### Customization
To customize the login screen:
1. Edit branding in `LoginScreen.tsx` (lines 38-54)
2. Modify roles array (line 29)
3. Adjust colors in Tailwind classes
4. Update logo/icon SVG (lines 42-52)

## Screenshots Features
- Nigerian coat of arms inspired shield icon
- Professional blue and green color scheme
- Government ministry header styling
- Secure form design with icons
- Loading states and transitions
- Responsive mobile layout
