import { eq, or, ilike } from "drizzle-orm";
import { type User, type InsertUser, type Code21Request, type InsertCode21Request, type Code21Status, users, code21Requests } from "@shared/schema";
import { randomUUID } from "crypto";
import { generateSessionToken } from "./auth";
import { db } from "./db";

export interface Session {
  token: string;
  userId: string;
  createdAt: Date;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createSession(userId: string): Promise<Session>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  createCode21Request(request: InsertCode21Request): Promise<Code21Request>;
  getCode21RequestsByOfficerNumber(officerNumber: string): Promise<Code21Request[]>;
  updateCode21RequestStatus(id: string, status: Code21Status): Promise<Code21Request | null>;
  searchCode21Archive(query: string): Promise<Code21Request[]>;
}

export class DbStorage implements IStorage {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createSession(userId: string): Promise<Session> {
    const token = generateSessionToken();
    const session: Session = {
      token,
      userId,
      createdAt: new Date(),
    };
    this.sessions.set(token, session);
    return session;
  }

  async getSession(token: string): Promise<Session | undefined> {
    return this.sessions.get(token);
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async createCode21Request(request: InsertCode21Request): Promise<Code21Request> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const row = {
      ...request,
      id,
      latitude: String(request.latitude),
      longitude: String(request.longitude),
      createdAt,
    };
    await db.insert(code21Requests).values(row);
    return {
      ...request,
      id,
      createdAt,
    };
  }

  async getCode21RequestsByOfficerNumber(officerNumber: string): Promise<Code21Request[]> {
    const rows = await db
      .select()
      .from(code21Requests)
      .where(eq(code21Requests.officerNumber, officerNumber));

    return rows.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    })) as unknown as Code21Request[];
  }

  async updateCode21RequestStatus(id: string, status: Code21Status): Promise<Code21Request | null> {
    const rows = await db
      .update(code21Requests)
      .set({ status })
      .where(eq(code21Requests.id, id))
      .returning();

    if (!rows[0]) return null;

    return {
      ...rows[0],
      latitude: Number(rows[0].latitude),
      longitude: Number(rows[0].longitude),
    } as unknown as Code21Request;
  }

  async searchCode21Archive(query: string): Promise<Code21Request[]> {
    const pattern = `%${query}%`;
    const rows = await db
      .select()
      .from(code21Requests)
      .where(
        or(
          ilike(code21Requests.serviceRequestNumber, pattern),
          ilike(code21Requests.officerNumber, pattern),
        ),
      );

    return rows.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    })) as unknown as Code21Request[];
  }
}

export const storage = new DbStorage();
