// 問題生成API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/client';
import { VideoProcessor } from '@/app/lib/utils/video-processor';
import type { VideoInfo } from '@/app/lib/utils/video-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // セッション情報取得
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('*, playlists(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // 現在のユーザーがホストかチェック
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    if (session.host_user_id !== user.id) {
      return NextResponse.json(
        { error: 'ホストのみが問題を生成できます' },
        { status: 403 }
      );
    }

    // プレイリストの動画一覧取得
    const { data: playlistVideos, error: videosError } = await supabase
      .from('playlist_videos')
      .select('*')
      .eq('playlist_id', session.playlist_id)
      .order('order_index');

    if (videosError) {
      throw new Error('プレイリスト動画取得に失敗しました');
    }

    if (!playlistVideos || playlistVideos.length === 0) {
      return NextResponse.json(
        { error: 'プレイリストに動画がありません' },
        { status: 400 }
      );
    }

    // 動画情報を VideoInfo 形式に変換
    const videoInfos: VideoInfo[] = playlistVideos.map(video => ({
      id: video.video_id,
      title: video.title,
      duration: video.duration || 300, // デフォルト5分
      thumbnail: video.thumbnail_url || VideoProcessor.getThumbnailUrl(video.video_id)
    }));

    // 問題データ生成
    const questionData = await VideoProcessor.generateQuestionsFromPlaylist(
      sessionId,
      videoInfos
    );

    if (questionData.length === 0) {
      return NextResponse.json(
        { error: '問題を生成できませんでした。動画タイトルから正解を抽出できません。' },
        { status: 400 }
      );
    }

    // 既存の問題を削除
    const { error: deleteError } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('Existing questions deletion error:', deleteError);
    }

    // 新しい問題を挿入
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('quiz_questions')
      .insert(questionData)
      .select();

    if (insertError) {
      throw new Error('問題保存に失敗しました: ' + insertError.message);
    }

    // 問題のプレビューを返す（正解は含めない）
    const questionPreviews = insertedQuestions.map(q => ({
      id: q.id,
      video_id: q.video_id,
      video_title: q.video_title,
      question_order: q.question_order,
      answersCount: q.correct_answers.length
    }));

    return NextResponse.json({
      success: true,
      message: `${insertedQuestions.length}問の問題を生成しました`,
      questionsCount: insertedQuestions.length,
      questions: questionPreviews
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '問題生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 問題一覧取得（正解は含めない）
    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .select('id, video_id, video_title, question_order, created_at')
      .eq('session_id', sessionId)
      .order('question_order');

    if (error) {
      throw new Error('問題一覧取得に失敗しました: ' + error.message);
    }

    return NextResponse.json({
      questions: questions || [],
      count: questions?.length || 0
    });

  } catch (error) {
    console.error('Get questions error:', error);
    
    return NextResponse.json(
      { error: '問題一覧取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}