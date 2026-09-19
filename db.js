import { MongoClient } from 'mongodb';
import { randomBytes, createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');

export async function createMongoStore(env = process.env) {
  const uri = env.MONGODB_URI?.trim();
  if (!uri) throw new Error('Falta MONGODB_URI. Configúrala en .env o en Render Environment.');

  const dbName = env.MONGODB_DB?.trim() || 'ParaElAmorDeMiVida';
  const collectionName = env.MONGODB_COLLECTION?.trim() || 'ParaElAmorDeMiVida';

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10
  });

  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  await Promise.all([
    collection.createIndex({ type: 1, expires: 1 }),
    collection.createIndex({ type: 1, sessionId: 1, created: -1 }),
    collection.createIndex({ type: 1, status: 1, created: -1 }),
    collection.createIndex({ type: 1, movie_id: 1 })
  ]);

  await collection.deleteMany({ type: 'session', expires: { $lt: Date.now() } });

  return {
    dbName,
    collectionName,

    async getSession(rawCookie) {
      if (!rawCookie) return null;
      const sessionId = hash(rawCookie);
      return collection.findOne({
        _id: `session:${sessionId}`,
        type: 'session',
        expires: { $gt: Date.now() }
      });
    },

    async createSession() {
      const raw = secret();
      const sessionId = hash(raw);
      const session = {
        _id: `session:${sessionId}`,
        type: 'session',
        sessionId,
        csrf: secret(),
        expires: Date.now() + 30 * 86400000
      };
      await collection.insertOne(session);
      return { raw, session };
    },

    async getProgress() {
      return collection.find(
        { type: 'progress' },
        { projection: { _id: 0, movie_id: 1, watched: 1, updated_at: 1, watched_at: 1 } }
      ).toArray();
    },

    async getMovieProgress(movieId) {
      return collection.findOne(
        { _id: `progress:${movieId}`, type: 'progress' },
        { projection: { _id: 0, movie_id: 1, watched: 1, updated_at: 1, watched_at: 1 } }
      );
    },

    async setProgress(movieId, watched) {
      const current = await collection.findOne({ _id: `progress:${movieId}`, type: 'progress' });
      const now = new Date().toISOString();
      const watchedAt = watched ? (current?.watched ? current.watched_at : now) : null;

      await collection.updateOne(
        { _id: `progress:${movieId}` },
        {
          $set: {
            type: 'progress',
            movie_id: movieId,
            watched: Boolean(watched),
            updated_at: now,
            watched_at: watchedAt
          }
        },
        { upsert: true }
      );

      return this.getMovieProgress(movieId);
    },

    // Prevents double-click/reload duplicates for a short window, but does not
    // permanently block later visits from the same browser/session.
    async beginNotice(sessionId, cooldownMs = 2 * 60 * 1000) {
      const now = Date.now();
      const recent = await collection.findOne({
        type: 'notice',
        sessionId,
        status: { $in: ['pending', 'sent'] },
        created: { $gt: now - cooldownMs }
      });

      if (recent) return { send: false, status: recent.status };

      const document = {
        type: 'notice',
        sessionId,
        created: now,
        status: 'pending'
      };

      const result = await collection.insertOne(document);
      return { send: true, status: 'pending', noticeId: result.insertedId };
    },

    async finishNotice(noticeId, status) {
      const allowed = new Set(['sent', 'failed', 'disabled']);
      const finalStatus = allowed.has(status) ? status : 'failed';

      await collection.updateOne(
        { _id: noticeId, type: 'notice' },
        { $set: { status: finalStatus, finished: Date.now() } }
      );

      return finalStatus;
    },

    async exportAll() {
      return collection.find({}).toArray();
    },

    async close() {
      await client.close();
    }
  };
}
