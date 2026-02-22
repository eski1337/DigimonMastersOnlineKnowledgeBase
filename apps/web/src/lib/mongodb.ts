import { MongoClient, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env');
}

const uri = process.env.MONGODB_URI;

// MongoDB connection options with proper error handling and timeouts
const options: MongoClientOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  minPoolSize: 2,
  
  // Timeout settings
  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  serverSelectionTimeoutMS: 10000, // 10 seconds
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Compression
  compressors: ['zlib'],
};

let _client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Connection retry logic
async function connectWithRetry(maxRetries = 3, delay = 1000): Promise<MongoClient> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[MongoDB] Connection attempt ${attempt}/${maxRetries}...`);
      const mongoClient = new MongoClient(uri, options);
      const connected = await mongoClient.connect();
      console.log('[MongoDB] Connected successfully');
      return connected;
    } catch (error) {
      lastError = error as Error;
      console.error(`[MongoDB] Connection attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        console.log(`[MongoDB] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw new Error(`[MongoDB] Failed to connect after ${maxRetries} attempts: ${lastError?.message}`);
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = connectWithRetry();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = connectWithRetry();
}

// Handle connection errors
clientPromise.catch((error) => {
  console.error('[MongoDB] Fatal connection error:', error);
  process.exit(1);
});

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    try {
      const mongoClient = await clientPromise;
      await mongoClient.close();
      console.log('[MongoDB] Connection closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('[MongoDB] Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
