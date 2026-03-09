import { and, eq, lt, or, ilike, sql } from "drizzle-orm";
import {
  type User, type InsertUser, type Code21Request, type InsertCode21Request,
  type Code21Status, type Session, type SectionBoardRow, type DisplayStatus,
  users, code21Requests, sessions, sectionAssignments, userPresence,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { generateSessionToken } from "./auth";
import { db } from "./db";
import { PATROL_ZONES } from "../constants/zones";

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
  upsertPresenceOnline(userId: string, sessionId?: string, clientType?: string): Promise<void>;
  updatePresenceHeartbeat(userId: string): Promise<void>;
  setPresenceOffline(userId: string): Promise<void>;
  sweepStalePresence(timeoutMs: number): Promise<number>;
  assignSection(sectionId: string, officerUserId: string, assignedByUserId: string | null): Promise<void>;
  unassignSection(sectionId: string, endedByUserId: string | null): Promise<void>;
  getAssignmentBoard(): Promise<SectionBoardRow[]>;
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

  async upsertPresenceOnline(userId: string, sessionId?: string, clientType?: string): Promise<void> {
    const now = new Date();
    await db
      .insert(userPresence)
      .values({
        userId,
        isOnline: true,
        sessionId: sessionId ?? null,
        connectedAt: now,
        lastSeenAt: now,
        offlineAt: null,
        clientType: clientType ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: {
          isOnline: true,
          sessionId: sessionId ?? sql`${userPresence.sessionId}`,
          connectedAt: now,
          lastSeenAt: now,
          offlineAt: null,
          clientType: clientType ?? sql`${userPresence.clientType}`,
          updatedAt: now,
        },
      });
  }

  async updatePresenceHeartbeat(userId: string): Promise<void> {
    const now = new Date();
    await db
      .insert(userPresence)
      .values({
        userId,
        isOnline: true,
        connectedAt: now,
        lastSeenAt: now,
        offlineAt: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: { lastSeenAt: now, isOnline: true, updatedAt: now },
      });
  }

  async setPresenceOffline(userId: string): Promise<void> {
    const now = new Date();
    await db
      .update(userPresence)
      .set({ isOnline: false, offlineAt: now, updatedAt: now })
      .where(eq(userPresence.userId, userId));
  }

  async sweepStalePresence(timeoutMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMs);
    const rows = await db
      .update(userPresence)
      .set({ isOnline: false, offlineAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(userPresence.isOnline, true),
          lt(userPresence.lastSeenAt, cutoff),
        ),
      )
      .returning({ userId: userPresence.userId });
    return rows.length;
  }

  async assignSection(sectionId: string, officerUserId: string, assignedByUserId: string | null): Promise<void> {
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(sectionAssignments)
        .set({ status: "ENDED", endedAt: now, endedByUserId: assignedByUserId })
        .where(
          and(
            eq(sectionAssignments.sectionId, sectionId),
            eq(sectionAssignments.status, "ACTIVE"),
          ),
        );

      await tx.insert(sectionAssignments).values({
        id: randomUUID(),
        sectionId,
        officerUserId,
        status: "ACTIVE",
        assignedAt: now,
        assignedByUserId,
        createdAt: now,
      });
    });
  }

  async unassignSection(sectionId: string, endedByUserId: string | null): Promise<void> {
    const now = new Date();
    await db
      .update(sectionAssignments)
      .set({ status: "ENDED", endedAt: now, endedByUserId })
      .where(
        and(
          eq(sectionAssignments.sectionId, sectionId),
          eq(sectionAssignments.status, "ACTIVE"),
        ),
      );
  }

  async getAssignmentBoard(): Promise<SectionBoardRow[]> {
    const rows = await db
      .select({
        sectionId: sectionAssignments.sectionId,
        officerNumber: users.officerNumber,
        isOnline: userPresence.isOnline,
        assignedAt: sectionAssignments.assignedAt,
      })
      .from(sectionAssignments)
      .innerJoin(users, eq(users.id, sectionAssignments.officerUserId))
      .leftJoin(userPresence, eq(userPresence.userId, sectionAssignments.officerUserId))
      .where(eq(sectionAssignments.status, "ACTIVE"));

    const assignmentMap = new Map<string, {
      officerNumber: string;
      isOnline: boolean;
      assignedAt: Date;
    }>();

    for (const row of rows) {
      assignmentMap.set(row.sectionId, {
        officerNumber: row.officerNumber,
        isOnline: row.isOnline ?? false,
        assignedAt: row.assignedAt,
      });
    }

    return PATROL_ZONES.map((zone): SectionBoardRow => {
      const assignment = assignmentMap.get(zone.id);
      if (!assignment) {
        return {
          sectionId: zone.id,
          sectionName: zone.name,
          displayStatus: "UNASSIGNED",
          assignedOfficerNumber: null,
          assignedAt: null,
        };
      }

      const displayStatus: DisplayStatus = assignment.isOnline
        ? "ASSIGNED_ONLINE"
        : "ASSIGNED_OFFLINE";

      return {
        sectionId: zone.id,
        sectionName: zone.name,
        displayStatus,
        assignedOfficerNumber: assignment.officerNumber,
        assignedAt: assignment.assignedAt.toISOString(),
      };
    });
  }
}

export const storage = new DbStorage();
