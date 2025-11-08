import { NextResponse } from "next/server";

export async function GET() {
  console.log("🔔 PING endpoint hit (GET)", new Date().toISOString());
  return NextResponse.json({ ok: true, t: Date.now() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  console.log("🔔 PING endpoint hit (POST)", { t: new Date().toISOString(), body });
  return NextResponse.json({ ok: true }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
