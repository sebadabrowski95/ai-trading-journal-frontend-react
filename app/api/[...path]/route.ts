import { NextRequest, NextResponse } from "next/server";
import { API_SERVER_BASE_URL } from "@/lib/api/config";

type RouteContext = {
  params: Promise<{ path: string[] }> | { path: string[] };
};

async function getPath(context: RouteContext) {
  const params = await context.params;
  return params.path;
}

async function forwardRequest(request: NextRequest, context: RouteContext) {
  try {
    const path = await getPath(context);
    const search = request.nextUrl.search;
    const targetUrl = `${API_SERVER_BASE_URL}/api/${path.join("/")}${search}`;

    const contentType = request.headers.get("content-type");
    const authorization = request.headers.get("authorization");
    const accept = request.headers.get("accept");

    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    if (authorization) headers.set("authorization", authorization);
    if (accept) headers.set("accept", accept);

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text();

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const responseText = await response.text();
    const responseContentType = response.headers.get("content-type");

    return new NextResponse(responseText, {
      status: response.status,
      headers: responseContentType
        ? { "content-type": responseContentType }
        : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Proxy request failed.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}
