# Inquiro

A knowledge base search application that extracts Q&A pairs from email threads and provides intelligent search capabilities.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Seeding

This project includes an enhanced database seeding script that populates PostgreSQL and Pinecone with email data and knowledge pairs. The seeding system now supports incremental updates and prevents duplicates.

### Seeding Modes

#### 1. Incremental Mode (Default)
Processes new threads each time, building a diverse knowledge base over time:
```bash
npm run db:seed
```
- ✅ **Preserves existing data**
- ✅ **Processes 5 new threads per run**
- ✅ **Prevents duplicate knowledge pairs**
- ✅ **Respects API rate limits**
- ✅ **Builds variety over time**

#### 2. Force Reset Mode
Clears all existing data and starts fresh:
```bash
npm run db:seed:force
```
- 🗑️ **Clears all existing data**
- 🆕 **Processes first 5 threads**
- 🔄 **Complete fresh start**

#### 3. Mock Mode (Skips Gemini API)
Uses predefined mock data without consuming API quota:
```bash
npm run db:seed:mock
```

#### 4. Local Mode (Skips All External APIs)
Tests only PostgreSQL operations (fastest for development):
```bash
npm run db:seed:local
```

### Environment Variables

Control specific operations with environment variables:
```bash
# Skip Gemini API calls
SKIP_API_CALLS=true npm run db:seed

# Skip Pinecone operations
SKIP_PINECONE=true npm run db:seed

# Skip both APIs (same as local mode)
SKIP_API_CALLS=true SKIP_PINECONE=true npm run db:seed
```

### Enhanced Features

#### Incremental Seeding
- **Smart thread selection**: Automatically picks unprocessed threads
- **Duplicate prevention**: Checks for existing knowledge pairs before adding
- **Variety building**: Different knowledge each time you seed
- **Progress tracking**: Shows exactly what was added

#### Rate Limiting
- **API quota management**: Processes 5 threads per run
- **4-second delays**: Between API calls to respect limits
- **Batch processing**: Efficient handling of multiple threads

#### Detailed Logging
```
🔍 Checking for duplicate knowledge (15 existing pairs)
✅ Adding new knowledge: "Is the cost of a new office espresso machine..."
⚠️ Skipping duplicate: "What documentation do I need for business..."
📊 Summary: Added 2 new knowledge pairs (17 total)
```

### When to Use Each Mode

| Mode | Use Case | Data Impact |
|------|----------|-------------|
| `npm run db:seed` | Normal development | Incremental, preserves existing |
| `npm run db:seed:force` | Fresh start needed | Clears everything |
| `npm run db:seed:mock` | Testing without API costs | Uses mock data |
| `npm run db:seed:local` | Fast development testing | PostgreSQL only |

**Note**: The incremental mode is perfect for building a diverse knowledge base over time while respecting API quotas and preventing duplicates.