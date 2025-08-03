// 回答検証ユーティリティ

export class AnswerValidator {
  /**
   * 回答の正誤を判定
   */
  static validate(answer: string, correctAnswers: string[]): boolean {
    const normalizedAnswer = this.normalizeAnswer(answer);
    
    if (!normalizedAnswer || normalizedAnswer.length < 2) {
      return false;
    }
    
    return correctAnswers.some(correct => {
      const normalizedCorrect = this.normalizeAnswer(correct);
      
      // 1. 完全一致チェック
      if (normalizedAnswer === normalizedCorrect) {
        return true;
      }
      
      // 2. 部分一致チェック（正解の80%以上含まれている）
      if (this.isPartialMatch(normalizedAnswer, normalizedCorrect, 0.8)) {
        return true;
      }
      
      // 3. 編集距離による曖昧マッチング
      if (this.isSimilar(normalizedAnswer, normalizedCorrect)) {
        return true;
      }
      
      // 4. 含有チェック（短い方が長い方に含まれている）
      if (this.isContained(normalizedAnswer, normalizedCorrect)) {
        return true;
      }
      
      return false;
    });
  }
  
  /**
   * 回答文字列の正規化
   */
  private static normalizeAnswer(text: string): string {
    return text
      .toLowerCase()
      .replace(/[ぁ-ん]/g, char => 
        String.fromCharCode(char.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
      .replace(/[ａ-ｚＡ-Ｚ０-９]/g, char => 
        String.fromCharCode(char.charCodeAt(0) - 0xFEE0)) // 全角→半角
      .replace(/\s+/g, '') // スペース削除
      .replace(/[^\w\u30A0-\u30FF\u4E00-\u9FAF]/g, '') // 英数字、カタカナ、漢字以外削除
      .trim();
  }
  
  /**
   * 部分一致チェック
   */
  private static isPartialMatch(answer: string, correct: string, threshold: number): boolean {
    const longer = answer.length > correct.length ? answer : correct;
    const shorter = answer.length <= correct.length ? answer : correct;
    
    // 短い方が長い方に一定割合以上含まれているかチェック
    if (longer.includes(shorter)) {
      return shorter.length / longer.length >= threshold;
    }
    
    // 共通部分文字列の長さをチェック
    const commonLength = this.getLongestCommonSubstring(answer, correct).length;
    const minLength = Math.min(answer.length, correct.length);
    
    return commonLength / minLength >= threshold;
  }
  
  /**
   * 編集距離による類似度チェック
   */
  private static isSimilar(answer: string, correct: string): boolean {
    const distance = this.getEditDistance(answer, correct);
    const maxLength = Math.max(answer.length, correct.length);
    
    if (maxLength === 0) return false;
    
    const similarity = 1 - (distance / maxLength);
    return similarity >= 0.7; // 70%以上の類似度
  }
  
  /**
   * 含有関係チェック
   */
  private static isContained(answer: string, correct: string): boolean {
    // どちらかがもう一方に含まれている場合
    if (answer.includes(correct) || correct.includes(answer)) {
      const longer = answer.length > correct.length ? answer : correct;
      const shorter = answer.length <= correct.length ? answer : correct;
      
      // 短い方が3文字以上で、長い方の50%以上の長さがある場合
      return shorter.length >= 3 && (shorter.length / longer.length) >= 0.5;
    }
    
    return false;
  }
  
  /**
   * 編集距離（レーベンシュタイン距離）を計算
   */
  private static getEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    // 初期化
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    // 動的プログラミング
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // 挿入
          matrix[j - 1][i] + 1,     // 削除
          matrix[j - 1][i - 1] + cost // 置換
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * 最長共通部分文字列を取得
   */
  private static getLongestCommonSubstring(str1: string, str2: string): string {
    let longest = '';
    
    for (let i = 0; i < str1.length; i++) {
      for (let j = i + 1; j <= str1.length; j++) {
        const substring = str1.slice(i, j);
        if (str2.includes(substring) && substring.length > longest.length) {
          longest = substring;
        }
      }
    }
    
    return longest;
  }
  
  /**
   * 回答の信頼度を計算（0-1の値）
   */
  static getConfidenceScore(answer: string, correctAnswers: string[]): number {
    const normalizedAnswer = this.normalizeAnswer(answer);
    let maxScore = 0;
    
    correctAnswers.forEach(correct => {
      const normalizedCorrect = this.normalizeAnswer(correct);
      
      // 完全一致
      if (normalizedAnswer === normalizedCorrect) {
        maxScore = Math.max(maxScore, 1.0);
        return;
      }
      
      // 部分一致スコア
      const partialScore = this.getPartialMatchScore(normalizedAnswer, normalizedCorrect);
      maxScore = Math.max(maxScore, partialScore);
      
      // 編集距離スコア
      const distance = this.getEditDistance(normalizedAnswer, normalizedCorrect);
      const maxLength = Math.max(normalizedAnswer.length, normalizedCorrect.length);
      const similarityScore = maxLength > 0 ? 1 - (distance / maxLength) : 0;
      maxScore = Math.max(maxScore, similarityScore);
    });
    
    return maxScore;
  }
  
  /**
   * 部分一致スコアを計算
   */
  private static getPartialMatchScore(answer: string, correct: string): number {
    const commonLength = this.getLongestCommonSubstring(answer, correct).length;
    const maxLength = Math.max(answer.length, correct.length);
    
    return maxLength > 0 ? commonLength / maxLength : 0;
  }
}