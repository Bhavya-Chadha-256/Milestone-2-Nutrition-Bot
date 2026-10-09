import { NextRequest, NextResponse } from "next/server";
import { ragPipeline } from "@/lib/ragPipeline";
import { createSession, sessionExists, saveMessages } from "@/lib/db";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id: incomingSessionId, message } = body as {
      session_id?: string | null;
      message?: unknown;
    };

    // Validate input
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Session resolution ──────────────────────────────────
    const sessionId =
      incomingSessionId && sessionExists(incomingSessionId)
        ? incomingSessionId
        : createSession();

    // ── Run full RAG pipeline (Phases 3-6) ──────────────────
    const result = await ragPipeline(message, sessionId);

    // ── Persist (sync) ──────────────────────────────────────
    saveMessages(sessionId, message, result);

    return NextResponse.json(
      { session_id: sessionId, ...result },
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.startsWith("MODEL_PARSE_ERROR")) {
      return NextResponse.json(
        { error: msg },
        { status: 500, headers: CORS_HEADERS }
      );
    }
    console.error("[/api/chat]", err);
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
