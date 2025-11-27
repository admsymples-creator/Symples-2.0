import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    // Handle webhook
    return NextResponse.json({ status: 'ok' })
}
