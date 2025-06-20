import { NextResponse } from 'next/server';

export async function POST() {
  const options = {
    name: 'session',
    value: '',
    maxAge: -1, // Expira la cookie inmediatamente
    path: '/',
  };

  const response = NextResponse.json({ status: 'success' }, { status: 200 });
  response.cookies.set(options);

  return response;
}