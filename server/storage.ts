import { and, eq, lt, or, ilike } from "drizzle-orm";
import { type User, type InsertUser, type Code21Request, type InsertCode21Request, type Code21Status, type Session, users, code21Requests, sessions } from "@shared/schema";
import { randomUUID } from "crypto";
import { generateSessionToken } from "./auth";
import { db } from "./db";

export type { Session };

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByOfficerNumber(officerNumber: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { username: string; email: string; officerNumber: string; password: string }): Promise<User>;
  createSession(userId: string): Promise<Session>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  purgeExpiredSessions(): Promise<void>;
  createCode21Request(request: InsertCode21Request): Promise<Code21Request>;
  getCode21RequestsByOfficerNumber(officerNumber: string): Promise<Code21Request[]>;
  updateCode21RequestStatus(id: string, status: Code21Status): Promise<Code21Request | null>;
  updateCode21Request(id: string, data: Partial<InsertCode21Request>): Promise<Code21Request | null>;
  getCode21RequestById(id: string): Promise<Code21Request | null>;
  appendOfficerNote(id: string, note: string): Promise<Code21Request | null>;
  searchCode21Archive(query: string, officerNumber: string): Promise<Code21Request[]>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByOfficerNumber(officerNumber: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.officerNumber, officerNumber)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return result[0];
  }

  async createUser(insertUser: { username: string; email: string; officerNumber: string; password: string }): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      email: insertUser.email.toLowerCase(),
    }).returning();
    return result[0];
  }

  async createSession(userId: string): Promise<Session> {
    const token = generateSessionToken();
    const now = new Date();
    const session: Session = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    };
    await db.insert(sessions).values(session);
    return session;
  }

  async getSession(token: string): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    const row = result[0];
    if (!row) return undefined;
    if (row.expiresAt < new Date().toISOString()) {
      await db.delete(sessions).where(eq(sessions.token, token));
      return undefined;
    }
    return row;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async purgeExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString()));
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
      .where(eq(code21Requests.officerNumber, officerNumber))
      .limit(500);

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

  async getCode21RequestById(id: string): Promise<Code21Request | null> {
    const rows = await db
      .select()
      .from(code21Requests)
      .where(eq(code21Requests.id, id))
      .limit(1);

    if (!rows[0]) return null;

    return {
      ...rows[0],
      latitude: Number(rows[0].latitude),
      longitude: Number(rows[0].longitude),
    } as unknown as Code21Request;
  }

  async updateCode21Request(id: string, data: Partial<InsertCode21Request>): Promise<Code21Request | null> {
    const updateData: Record<string, unknown> = {};
    if (data.serviceRequestNumber !== undefined) updateData.serviceRequestNumber = data.serviceRequestNumber;
    if (data.offenceDate !== undefined) updateData.offenceDate = data.offenceDate;
    if (data.offenceTime !== undefined) updateData.offenceTime = data.offenceTime;
    if (data.offenceType !== undefined) updateData.offenceType = data.offenceType;
    if (data.code21Type !== undefined) updateData.code21Type = data.code21Type;
    if (data.dispatchNotes !== undefined) updateData.dispatchNotes = data.dispatchNotes;
    if (data.attendanceNotes !== undefined) updateData.attendanceNotes = data.attendanceNotes;
    if (data.pin !== undefined) updateData.pin = data.pin;
    if (data.vehicleMake !== undefined) updateData.vehicleMake = data.vehicleMake;
    if (data.vehicleModel !== undefined) updateData.vehicleModel = data.vehicleModel;
    if (data.vehicleColour !== undefined) updateData.vehicleColour = data.vehicleColour;
    if (data.vehicleRego !== undefined) updateData.vehicleRego = data.vehicleRego;
    if (data.formattedDocument !== undefined) updateData.formattedDocument = data.formattedDocument;
    if (data.description !== undefined) updateData.description = data.description;

    if (Object.keys(updateData).length === 0) return this.getCode21RequestById(id);

    const rows = await db
      .update(code21Requests)
      .set(updateData)
      .where(eq(code21Requests.id, id))
      .returning();

    if (!rows[0]) return null;

    return {
      ...rows[0],
      latitude: Number(rows[0].latitude),
      longitude: Number(rows[0].longitude),
    } as unknown as Code21Request;
  }

  async appendOfficerNote(id: string, note: string): Promise<Code21Request | null> {
    const existing = await this.getCode21RequestById(id);
    if (!existing) return null;

    let notes: { note: string; timestamp: string }[] = [];
    try {
      notes = JSON.parse(existing.officerNotes || "[]");
    } catch {
      notes = [];
    }

    notes.push({
      note,
      timestamp: new Date().toISOString(),
    });

    const rows = await db
      .update(code21Requests)
      .set({ officerNotes: JSON.stringify(notes) })
      .where(eq(code21Requests.id, id))
      .returning();

    if (!rows[0]) return null;

    return {
      ...rows[0],
      latitude: Number(rows[0].latitude),
      longitude: Number(rows[0].longitude),
    } as unknown as Code21Request;
  }

  async searchCode21Archive(query: string, officerNumber: string): Promise<Code21Request[]> {
    const escaped = query.replace(/[%_\\]/g, (ch) => `\\${ch}`);
    const pattern = `%${escaped}%`;
    const rows = await db
      .select()
      .from(code21Requests)
      .where(
        and(
          eq(code21Requests.officerNumber, officerNumber),
          or(
            ilike(code21Requests.serviceRequestNumber, pattern),
            ilike(code21Requests.officerNumber, pattern),
          ),
        ),
      )
      .limit(100);

    return rows.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    })) as unknown as Code21Request[];
  }
}

export const storage = new DbStorage();
