export async function GET() {
  return new Response(JSON.stringify({ liffId: process.env.NEXT_PUBLIC_LIFF_ID }));
}
