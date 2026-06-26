import { NextResponse } from 'next/server';

const HOTELS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/hotels/';

export async function GET() {
  const res = await fetch(HOTELS_API_URL, { cache: 'no-store' });
  const hotels = await res.json();
  return NextResponse.json(hotels);
}
