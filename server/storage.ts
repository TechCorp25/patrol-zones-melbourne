import { type User, type InsertUser, type Code21Request, type InsertCode21Request } from "@shared/schema";
import { randomUUID } from "crypto";
import { generateSessionToken } from "./auth";

export interface Session {
  token: string;
  userId: string;
  createdAt: Date;
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createSession(userId: string): Promise<Session>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  createCode21Request(request: InsertCode21Request): Promise<Code21Request>;
  getCode21RequestsByOfficerNumber(officerNumber: string): Promise<Code21Request[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private code21Requests: Map<string, Code21Request>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.code21Requests = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    const saved: Code21Request = {
      ...request,
      id,
      createdAt: new Date().toISOString(),
    };

    this.code21Requests.set(id, saved);
    return saved;
  }

  async getCode21RequestsByOfficerNumber(officerNumber: string): Promise<Code21Request[]> {
    return Array.from(this.code21Requests.values()).filter(
      (request) => request.officerNumber === officerNumber,
    );
  }
}

export const storage = new MemStorage();
