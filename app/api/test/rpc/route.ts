// RPC関数テスト用のエンドポイント（デバッグ用）

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    console.log('Testing generate_room_code function...');
    const { data, error } = await supabase.rpc('generate_room_code');
    
    console.log('RPC result:', { data, error });
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        step: 'rpc_test'
      });
    }
    
    return NextResponse.json({
      success: true,
      roomCode: data,
      message: 'generate_room_code function is working'
    });
  } catch (err) {
    console.error('Test RPC error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      step: 'test_catch'
    });
  }
}