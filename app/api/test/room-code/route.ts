// ルームコード生成テスト用API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    console.log('Testing room code generation...');

    // ルームコード生成をテスト
    const { data: roomCodeData, error: roomCodeError } = await supabase
      .rpc('generate_room_code');

    if (roomCodeError) {
      console.error('Room code generation error:', roomCodeError);
      return NextResponse.json({
        success: false,
        error: roomCodeError.message,
        details: roomCodeError
      });
    }

    console.log('Room code generated:', roomCodeData);

    return NextResponse.json({
      success: true,
      roomCode: roomCodeData,
      message: 'ルームコード生成成功'
    });

  } catch (error) {
    console.error('Test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}