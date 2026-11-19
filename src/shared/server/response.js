import { NextResponse } from 'next/server';
import { connectDb } from './db.js';

export function jsonOk(data, status = 200, init = {}) {
  return NextResponse.json(data, { status, ...init });
}

export function jsonError(error, status = 400, options = {}) {
  const { code, fields, ...extra } = options;
  const body = {
    error: typeof error === 'string' ? error : error?.message || 'Request failed',
  };
  if (code) body.code = code;
  if (fields) body.fields = fields;
  Object.assign(body, extra);

  return NextResponse.json(body, { status });
}

export async function parseJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/**
 * Standard API route wrapper that ensures DB connection and
 * catches any uncaught exception, returning Express-compatible 500 response.
 */
export function handleApiRoute(handler) {
  return async function (req, context) {
    try {
      await connectDb();
      return await handler(req, context);
    } catch (err) {
      if (err?.isCustomApiError) {
        return jsonError(err.message, err.status || 400, { code: err.code, fields: err.fields });
      }
      console.error(err);
      return jsonError('Something went wrong on our side', 500);
    }
  };
}
