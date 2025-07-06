

## Getting Started

First, run the development server:

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Database Seeding

This project includes a database seeding script that populates PostgreSQL and Pinecone with email data and knowledge pairs. There are three ways to run the seed script:

### 1. Full Mode (Uses All APIs)
Runs the complete pipeline including Google's Gemini API for knowledge extraction and Pinecone for vector storage:
```bash
npm run db:seed
```

### 2. Mock Mode (Skips Gemini API)
Uses predefined mock data to test the pipeline without consuming Gemini API quota, but still uses Pinecone:
```bash
npm run db:seed:mock
```

### 3. Local Mode (Skips All External APIs)
Tests only PostgreSQL database operations without using any external APIs (fastest for development):
```bash
npm run db:seed:local
```

### 4. Environment Variable Mode
Set environment variables to control specific operations:
```bash
# Skip Gemini API calls
SKIP_API_CALLS=true npm run db:seed

# Skip Pinecone operations
SKIP_PINECONE=true npm run db:seed

# Skip both APIs (same as local mode)
SKIP_API_CALLS=true SKIP_PINECONE=true npm run db:seed

```

**Note**: The mock and local modes are perfect for testing the database schema, Pinecone setup, and overall pipeline without burning through my API quota >o< .