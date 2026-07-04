FROM oven/bun:latest

WORKDIR /app

# Copy dependency configuration files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy prisma directory (contains schema.prisma and migrations)
COPY prisma ./prisma

# Generate Prisma Client (builds the TypeScript types for the database)
RUN bun --bun prisma generate

# Copy all TypeScript source files
COPY index.ts prompt.ts middleware.ts db.ts supabase.ts tsconfig.json ./

# Expose Express server port
EXPOSE 3000

# On container startup, apply database migrations and then start the Express server
CMD ["sh", "-c", "bun --bun prisma migrate deploy && bun run index.ts"]
