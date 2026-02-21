import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { enqueueJob } from "../../../src/lib/queue";
import { rateLimit } from "../../../src/lib/rate-limit";

function addCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type,x-csrf-token");
  return response;
}

export async function OPTIONS() {
  return addCors(new NextResponse(null, { status: 204 }));
}

// ── GET /api/notes ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const csrfToken = request.headers.get("x-csrf-token");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (origin && origin !== appUrl && !csrfToken) {
    return addCors(NextResponse.json({ error: "CSRF validation failed." }, { status: 403 }));
  }
  const rate = rateLimit("notes-get", 30, 60000);
  if (!rate.allowed) {
    return addCors(NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 }));
  }

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId") ?? undefined;
  const companyId = searchParams.get("companyId") ?? undefined;
  const dealId    = searchParams.get("dealId")    ?? undefined;

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;
  const page  = parseInt(searchParams.get("page") ?? "1", 10);
  const skip  = limit !== undefined ? (page - 1) * limit : undefined;

  const where = {
    deletedAt: null,
    ...(contactId && { contactId }),
    ...(companyId && { companyId }),
    ...(dealId    && { dealId }),
  };

  const [notes, total] = await prisma.$transaction([
    prisma.note.findMany({
      where,
      // Fix 7: select title + body (current Prisma model fields)
      select: {
        id:        true,
        title:     true,
        body:      true,
        tags:      true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        contactId: true,
        dealId:    true,
      },
      orderBy: { createdAt: "desc" },
      ...(limit !== undefined && { take: limit }),
      ...(skip  !== undefined && { skip }),
    }),
    prisma.note.count({ where }),
  ]);

  return addCors(NextResponse.json({ notes, total, page, limit }));
}

// ── POST /api/notes ───────────────────────────────────────────────────────────
// Fix 7: accepts title + body; also accepts legacy rawText from rapid-capture component
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const csrfToken = request.headers.get("x-csrf-token");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (origin && origin !== appUrl && !csrfToken) {
    return addCors(NextResponse.json({ error: "CSRF validation failed." }, { status: 403 }));
  }
  const rate = rateLimit("notes", 20, 60000);
  if (!rate.allowed) {
    return addCors(NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 }));
  }

  const body = await request.json();

  // Accept either new-style { title, body } or legacy { rawText } from rapid-capture
  const title:    string = body.title    ?? "";
  const noteBody: string = body.body     ?? "";
  const rawText:  string = body.rawText  ?? "";

  // At least one content field must be non-empty
  const content = rawText || noteBody || title;
  if (!content.trim()) {
    return addCors(
      NextResponse.json({ error: "title, body, or rawText is required." }, { status: 400 })
    );
  }
  if (content.length > 800) {
    return addCors(
      NextResponse.json({ error: "Content too long (max 800 characters)." }, { status: 400 })
    );
  }

  const note = await prisma.note.create({
    data: {
      companyId: body.companyId ?? "demo-company",
      dealId:    body.dealId    ?? undefined,
      contactId: body.contactId ?? undefined,
      // Fix 7: populate title + body; keep rawText populated for worker compatibility
      title:   title   || rawText,
      body:    noteBody || rawText,
      rawText: rawText  || noteBody || title,
      tags:    body.tags ?? [],
    },
  });

  await enqueueJob({
    type: "NOTE_PROCESS",
    payload: { noteId: note.id },
    idempotencyKey: `note-process-${note.id}`,
  });

  return addCors(NextResponse.json({ note }, { status: 201 }));
}
