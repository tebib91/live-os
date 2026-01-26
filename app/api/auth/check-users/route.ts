import { NextResponse } from 'next/server';
import { hasUsers } from '@/app/actions/auth';

export async function GET() {
  try {
    const usersExist = await hasUsers();
    return NextResponse.json({ hasUsers: usersExist });
  } catch (error) {
    console.error('Failed to check users:', error);
    return NextResponse.json({ hasUsers: false }, { status: 500 });
  }
}
