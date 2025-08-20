import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';
import { fetchNotifications, markNotificationsRead } from '@/lib/services/notifications';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  
  const result = await fetchNotifications({
    userId: session.user.id,
    page,
    limit
  });
  
  return NextResponse.json({
    success: true,
    ...result
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { ids, all } = body;
  
  if (!all && (!ids || ids.length === 0)) {
    return NextResponse.json(
      { error: "Either 'ids' array or 'all' flag must be provided" },
      { status: 400 }
    );
  }
  
  const result = await markNotificationsRead({
    userId: session.user.id,
    ids,
    all
  });
  
  return NextResponse.json({
    success: true,
    updated: result.updated
  });
}
