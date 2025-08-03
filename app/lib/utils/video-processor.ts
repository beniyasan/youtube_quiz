// YouTube動画処理ユーティリティ

import type { QuizQuestion } from '@/app/types/quiz';

export interface VideoInfo {
  id: string;
  title: string;
  duration: number; // seconds
  thumbnail: string;
}

export class VideoProcessor {
  /**
   * 動画タイトルから正解キーワードを抽出
   */
  static extractAnswersFromTitle(title: string): string[] {
    const answers: string[] = [];
    
    // 1. 年号＋レース名パターン
    const racePatterns = [
      /(\d{4}年\s*[^\s|]+(?:記念|杯|賞|ステークス|特別))/g,
      /(\d{4}\s*[^\s|]+(?:記念|杯|賞|ステークス|特別))/g,
    ];
    
    racePatterns.forEach(pattern => {
      const matches = title.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const normalized = match.replace(/\s+/g, '');
          if (normalized.length >= 4) {
            answers.push(normalized);
          }
        });
      }
    });
    
    // 2. 競走馬名パターン（|で囲まれた部分）
    const horsePattern = /\|\s*([^|\s]+)\s*\|/g;
    let horseMatch;
    while ((horseMatch = horsePattern.exec(title)) !== null) {
      const horseName = horseMatch[1].trim();
      // JRA公式などの組織名は除外
      if (!this.isOrganizationName(horseName) && horseName.length >= 2) {
        answers.push(horseName);
      }
    }
    
    // 3. カタカナの競走馬名（単語境界で区切られた3文字以上のカタカナ）
    const katakanaPattern = /[\u30A0-\u30FF]{3,}/g;
    const katakanaMatches = title.match(katakanaPattern);
    if (katakanaMatches) {
      katakanaMatches.forEach(match => {
        if (!this.isCommonWord(match) && match.length <= 12) {
          answers.push(match);
        }
      });
    }
    
    // 4. G1, G2, G3レース名
    const gradeRacePattern = /([^\s|]+(?:記念|杯|賞|ステークス))\s*（G[123]）/g;
    let gradeMatch;
    while ((gradeMatch = gradeRacePattern.exec(title)) !== null) {
      answers.push(gradeMatch[1]);
    }
    
    // 重複削除と並び替え
    return [...new Set(answers)].sort((a, b) => b.length - a.length);
  }
  
  /**
   * 組織名かどうかをチェック
   */
  private static isOrganizationName(name: string): boolean {
    const organizations = [
      'JRA公式', 'JRA', 'netkeiba', 'ウマ娘', 'UMAJO', 
      'グリーンチャンネル', 'フジテレビ', 'NHK'
    ];
    return organizations.some(org => name.includes(org));
  }
  
  /**
   * 一般的な単語かどうかをチェック
   */
  private static isCommonWord(word: string): boolean {
    const commonWords = [
      'レース', 'ダービー', 'オークス', 'スプリント',
      'マイル', 'ステークス', 'ハンデ', 'アナウンス'
    ];
    return commonWords.includes(word);
  }
  
  /**
   * プレイリストから問題データを生成
   */
  static async generateQuestionsFromPlaylist(
    sessionId: string,
    videos: VideoInfo[]
  ): Promise<Omit<QuizQuestion, 'id' | 'created_at'>[]> {
    const questions: Omit<QuizQuestion, 'id' | 'created_at'>[] = [];
    
    videos.forEach((video, index) => {
      const correctAnswers = this.extractAnswersFromTitle(video.title);
      
      // 正解が抽出できない動画はスキップ
      if (correctAnswers.length === 0) {
        console.warn(`No answers extracted for video: ${video.title}`);
        return;
      }
      
      const audioStartTime = this.generateRandomStartTime(video.duration);
      const videoStartTime = this.generateRandomStartTime(video.duration);
      
      questions.push({
        session_id: sessionId,
        video_id: video.id,
        video_title: video.title,
        correct_answers: correctAnswers,
        audio_start_time: audioStartTime,
        video_start_time: videoStartTime,
        question_order: index
      });
    });
    
    return questions;
  }
  
  /**
   * ランダムな開始時間を生成（15秒再生可能な範囲）
   */
  static generateRandomStartTime(duration: number): number {
    if (duration <= 15) {
      return 0;
    }
    
    // 最後の15秒は除外（エンディング等を避ける）
    const maxStart = Math.max(0, duration - 30);
    return Math.floor(Math.random() * maxStart);
  }
  
  /**
   * YouTube動画IDからサムネイル取得
   */
  static getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
  }
  
  /**
   * YouTube動画URLから動画IDを抽出
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
  
  /**
   * 動画タイトルのクリーニング（不要な文字列削除）
   */
  static cleanVideoTitle(title: string): string {
    return title
      .replace(/【[^】]*】/g, '') // 【】で囲まれた部分を削除
      .replace(/\[[^\]]*\]/g, '') // []で囲まれた部分を削除
      .replace(/\s+/g, ' ') // 複数のスペースを単一に
      .trim();
  }
}