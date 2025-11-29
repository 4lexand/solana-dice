import { NextResponse } from 'next/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { message, username, walletAddress } = data;

    if (!process.env.PUSHER_APP_ID) {
        return NextResponse.json({ error: 'Chat no configurado (Faltan claves)' }, { status: 500 });
    }

    await pusher.trigger('global-chat', 'new-message', {
        message,
        username,
        walletAddress,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher error:', error);
    return NextResponse.json({ error: 'Error enviando mensaje' }, { status: 500 });
  }
}