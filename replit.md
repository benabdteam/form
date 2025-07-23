# Address Form Application

## Overview

This is a full-stack web application built with React (frontend) and Express.js (backend) that provides an address form with Google Places API integration for address autocomplete functionality. The application uses a modern tech stack with TypeScript, Tailwind CSS, and shadcn/ui components for a polished user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **API Style**: RESTful endpoints
- **Middleware**: Built-in Express middleware for JSON parsing and static file serving
- **Error Handling**: Centralized error handling middleware

### Development Setup
- **Monorepo Structure**: Single repository with separate client and server directories
- **Shared Code**: Common schemas and types in `/shared` directory
- **Hot Reload**: Vite dev server with HMR for frontend, tsx for backend development

## Key Components

### Database & ORM
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Database**: PostgreSQL (via Neon Database serverless)
- **Migrations**: Drizzle Kit for schema migrations
- **Storage**: Dual storage implementation with in-memory fallback and database persistence

### UI Components
- **Component Library**: shadcn/ui with Radix UI primitives
- **Theme**: Customizable CSS variables with light/dark mode support
- **Icons**: Lucide React icons
- **Responsive Design**: Mobile-first approach with Tailwind responsive utilities

### Form Handling
- **Validation**: Zod schemas for runtime type checking and validation
- **Form Management**: React Hook Form for form state and validation
- **User Experience**: Real-time validation feedback and error handling

### External Integrations
- **Google Places API**: Address autocomplete and place details
- **Graceful Degradation**: Fallback handling when API is unavailable
- **Error Handling**: User-friendly error messages for API failures

## Data Flow

### Address Autocomplete Flow
1. User types in address field (minimum 3 characters)
2. Debounced query triggers Google Places API call
3. Suggestions displayed in dropdown with structured formatting
4. User selects suggestion, triggering place details fetch
5. Form fields auto-populated with structured address data
6. User can modify fields and submit form
7. Address saved to database with validation

### Error Handling Flow
- API errors gracefully handled with user notifications
- Form validation errors displayed inline
- Network failures show appropriate fallback messages
- Success states provide clear user feedback

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Database ORM and query builder
- **@neondatabase/serverless**: PostgreSQL database connection
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Zod integration for form validation
- **zod**: Runtime type validation and schema definition

### UI Dependencies
- **@radix-ui/react-***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe styling variants
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `/dist/public`
- **Backend**: esbuild bundles server code to `/dist/index.js`
- **Assets**: Static assets served from build directory

### Environment Configuration
- **Development**: Hot reload with Vite dev server proxy
- **Production**: Express serves static files and API routes
- **Environment Variables**: Database URL and Google API key required

### Database Setup
- **Schema**: Defined in `/shared/schema.ts`
- **Migrations**: Generated in `/migrations` directory
- **Deployment**: `db:push` command for schema deployment

### Key Scripts
- `dev`: Start development server with hot reload
- `build`: Build production assets
- `start`: Run production server
- `db:push`: Deploy database schema changes

The application is designed to be deployed on platforms that support Node.js with PostgreSQL database connectivity, with particular optimization for Replit's environment including cartographer integration for development.