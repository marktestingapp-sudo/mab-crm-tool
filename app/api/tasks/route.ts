import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { rateLimit } from "../../../src/lib/rate-limit";
import { TaskStatus } from "@prisma/client";

// ── Shared CSRF + rate-limit guard ────────────────────────────────────────────
function guardRequest(request: Request, bucket: string) {
  const origin = request.headers.get("origin");
  const csrfToken = request.headers.get("x-csrf-token");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (origin && origin !== appUrl && !csrfToken) {
    return NextResponse.json({ error: "CSRF validation failed." }, { status: 403 });
  }
  const rate = rateLimit(bucket, 30, 60000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }
  return null;
}

// ── Canonical status values (Fix 5) ──────────────────────────────────────────
const VALID_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];

// ── CORS headers helper ───────────────────────────────────────────────────────
function addCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type,x-csrf-token");
  return response;
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return addCors(new NextResponse(null, { status: 204 }));
}

// ── GET /api/tasks ────────────────────────────────────────────────────────────
// Fix 6: no hard-coded take cap; supports contactId/companyId/dealId filters;
//        limit is optional; sort = dueAt ASC NULLS LAST → createdAt DESC
export async function GET(request: Request) {
  const guard = guardRequest(request, "tasks-get");
  if (guard) return addCors(guard);

  const { searchParams } = new URL(request.url);

  const contactId = searchParams.get("contactId") ?? undefined;
  const companyId = searchParams.get("companyId") ?? undefined;
  const dealId    = searchParams.get("dealId")    ?? undefined;
  const statusParam = searchParams.get("status") as TaskStatus | null;

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;
  const page  = parseInt(searchParams.get("page") ?? "1", 10);
  const skip  = limit !== undefined ? (page - 1) * limit : undefined;

  const where = {
    deletedAt: null,
    ...(contactId && { contactId }),
    ...(companyId && { companyId }),
    ...(dealId    && { dealId }),
    ...(statusParam && VALID_STATUSES.includes(statusParam) && { status: statusParam }),
  };

  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      orderBy: [
        { dueAt: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      ...(limit !== undefined && { take: limit }),
      ...(skip  !== undefined && { skip }),
    }),
    prisma.task.count({ where }),
  ]);

  return addCors(NextResponse.json({ tasks, total, page, limit }));
}

// ── POST /api/tasks ───────────────────────────────────────────────────────────
// Fix 4: supports single task { title, ... } or batch { tasks: [...] }
// Fix 5: validates status against canonical enum
export async function POST(request: Request) {
  const guard = guardRequest(request, "tasks-post");
  if (guard) return addCors(guard);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return addCors(NextResponse.json({ error: "Invalid JSON." }, { status: 400 }));
  }

  const isBatch =
    body !== null &&
    typeof body === "object" &&
    "tasks" in (body as object) &&
    Array.isArray((body as { tasks: unknown }).tasks);

  const rawItems: unknown[] = isBatch
    ? (body as { tasks: unknown[] }).tasks
    : [body];

  // Validate each item
  const validated: {
    title: string;
    status: TaskStatus;
    description?: string;
    dueAt?: Date;
    companyId?: string;
    contactId?: string;
    dealId?: string;
  }[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i] as Record<string, unknown>;
    const idx  = isBatch ? ` (tasks[${i}])` : "";

    if (!item.title || typeof item.title !== "string" || !item.title.trim()) {
      return addCors(
        NextResponse.json({ error: `title is required${idx}` }, { status: 422 })
      );
    }

    const status: TaskStatus =
      typeof item.status === "string" ? (item.status as TaskStatus) : "TODO";

    if (!VALID_STATUSES.includes(status)) {
      return addCors(
        NextResponse.json(
          { error: `Invalid status "${item.status}"${idx}. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 422 }
        )
      );
    }

    validated.push({
      title:       item.title.trim(),
      status,
      description: typeof item.description === "string" ? item.description : undefined,
      dueAt:       item.dueAt ? new Date(item.dueAt as string) : undefined,
      companyId:   typeof item.companyId  === "string" ? item.companyId  : undefined,
      contactId:   typeof item.contactId  === "string" ? item.contactId  : undefined,
      dealId:      typeof item.dealId     === "string" ? item.dealId     : undefined,
    });
  }

  if (isBatch) {
    const created = await prisma.$transaction(
      validated.map((data) => prisma.task.create({ data }))
    );
    return addCors(NextResponse.json({ tasks: created }, { status: 201 }));
  } else {
    const task = await prisma.task.create({ data: validated[0] });
    return addCors(NextResponse.json({ task }, { status: 201 }));
  }
}
