// 5W1H Analysis for Japanese text
// Extracts Who, What, When, Where, Why, How elements from morphological analysis results

import { MorphemeToken, DependencyRelation, FiveW1HElement, FiveW1HResult } from './types';

export class FiveW1HAnalyzer {
  
  /**
   * Analyze 5W1H elements from morphological analysis and dependency parsing results
   */
  analyze(morphemes: MorphemeToken[], dependencies: DependencyRelation[]): FiveW1HResult {
    const result: FiveW1HResult = {
      who: [],
      what: [],
      when: [],
      where: [],
      why: [],
      how: []
    };

    // Extract each category
    result.who = this.extractWho(morphemes, dependencies);
    result.what = this.extractWhat(morphemes, dependencies);
    result.when = this.extractWhen(morphemes, dependencies);
    result.where = this.extractWhere(morphemes, dependencies);
    result.why = this.extractWhy(morphemes, dependencies);
    result.how = this.extractHow(morphemes, dependencies);

    return result;
  }

  /**
   * Extract WHO elements (subjects, agents)
   * 誰が: 主語や動作主を抽出
   */
  private extractWho(morphemes: MorphemeToken[], dependencies: DependencyRelation[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    
    for (let i = 0; i < morphemes.length; i++) {
      const morpheme = morphemes[i];
      
      // 人名、代名詞、一般名詞（人を表すもの）
      if ((morpheme.pos === '名詞' && 
           (morpheme.pos_detail_1 === '固有名詞' || 
            morpheme.pos_detail_1 === '代名詞' ||
            this.isPersonNoun(morpheme.surface_form))) ||
          (morpheme.pos === '代名詞')) {
        
        // 主語マーカー「は」「が」が後続するかチェック
        const isSubject = this.hasSubjectMarker(morphemes, i);
        const confidence = isSubject ? 0.8 : 0.4;
        
        if (confidence > 0.3) {
          elements.push({
            category: 'who',
            text: morpheme.surface_form,
            morphemeIndices: [i],
            confidence
          });
        }
      }
    }
    
    return elements;
  }

  /**
   * Extract WHAT elements (objects, actions)
   * 何を: 目的語や動作を抽出
   */
  private extractWhat(morphemes: MorphemeToken[], dependencies: DependencyRelation[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    
    for (let i = 0; i < morphemes.length; i++) {
      const morpheme = morphemes[i];
      
      // 動詞（動作）
      if (morpheme.pos === '動詞') {
        elements.push({
          category: 'what',
          text: morpheme.basic_form,
          morphemeIndices: [i],
          confidence: 0.7
        });
      }
      
      // 目的語（「を」マーカーを持つ名詞）
      if (morpheme.pos === '名詞' && this.hasObjectMarker(morphemes, i)) {
        elements.push({
          category: 'what',
          text: morpheme.surface_form,
          morphemeIndices: [i],
          confidence: 0.8
        });
      }
    }
    
    return elements;
  }

  /**
   * Extract WHEN elements (time expressions)
   * いつ: 時間表現を抽出
   */
  private extractWhen(morphemes: MorphemeToken[], dependencies: DependencyRelation[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    
    for (let i = 0; i < morphemes.length; i++) {
      const morpheme = morphemes[i];
      
      // 時間を表す名詞
      if (morpheme.pos === '名詞' && this.isTimeExpression(morpheme.surface_form)) {
        elements.push({
          category: 'when',
          text: morpheme.surface_form,
          morphemeIndices: [i],
          confidence: 0.9
        });
      }
      
      // 副詞（時間的な副詞）
      if (morpheme.pos === '副詞' && this.isTimeAdverb(morpheme.surface_form)) {
        elements.push({
          category: 'when',
          text: morpheme.surface_form,
          morphemeIndices: [i],
          confidence: 0.8
        });
      }
    }
    
    return elements;
  }

  /**
   * Extract WHERE elements (location expressions)
   * どこで: 場所表現を抽出
   */
  private extractWhere(morphemes: MorphemeToken[], dependencies: DependencyRelation[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    
    for (let i = 0; i < morphemes.length; i++) {
      const morpheme = morphemes[i];
      
      // 場所を表す名詞 + 「で」「に」「から」
      if (morpheme.pos === '名詞' && this.hasLocationMarker(morphemes, i)) {
        elements.push({
          category: 'where',
          text: morpheme.surface_form,
          morphemeIndices: [i],
          confidence: 0.8
        });
      }
      
      // 地名（固有名詞）
      if (morpheme.pos === '名詞' && 
          morpheme.pos_detail_1 === '固有名詞' && 
          morpheme.pos_detail_2 === '地域') {
        elements.push({
          category: 'where',
          text: morpheme.surface_form,
          morphemeIndices: [i],
          confidence: 0.9
        });
      }
    }
    
    return elements;
  }

  /**
   * Extract WHY elements (reason, purpose)
   * なぜ: 理由・目的を抽出
   */
  private extractWhy(morphemes: MorphemeToken[], dependencies: DependencyRelation[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    
    for (let i = 0; i < morphemes.length; i++) {
      const morpheme = morphemes[i];
      
      // 理由を表す接続助詞「ので」「から」「ため」
      if (morpheme.pos === '助詞' && this.isReasonMarker(morpheme.surface_form)) {
        // 前の語句を理由として抽出
        const reasonText = this.extractReasonPhrase(morphemes, i);
        if (reasonText) {
          elements.push({
            category: 'why',
            text: reasonText,
            morphemeIndices: this.getReasonIndices(morphemes, i),
            confidence: 0.7
          });
        }
      }
    }
    
    return elements;
  }

  /**
   * Extract HOW elements (method, manner)
   * どのように: 方法・様態を抽出
   */
  private extractHow(morphemes: MorphemeToken[], dependencies: DependencyRelation[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    
    for (let i = 0; i < morphemes.length; i++) {
      const morpheme = morphemes[i];
      
      // 様態副詞
      if (morpheme.pos === '副詞' && this.isMannerAdverb(morpheme.surface_form)) {
        elements.push({
          category: 'how',
          text: morpheme.surface_form,
          morphemeIndices: [i],
          confidence: 0.7
        });
      }
      
      // 手段・方法を表す「で」「により」「によって」
      if (morpheme.pos === '名詞' && this.hasMethodMarker(morphemes, i)) {
        elements.push({
          category: 'how',
          text: morpheme.surface_form,
          morphemeIndices: [i],
          confidence: 0.6
        });
      }
    }
    
    return elements;
  }

  // Helper methods for pattern matching

  private hasSubjectMarker(morphemes: MorphemeToken[], index: number): boolean {
    if (index + 1 < morphemes.length) {
      const nextMorpheme = morphemes[index + 1];
      return nextMorpheme.surface_form === 'は' || nextMorpheme.surface_form === 'が';
    }
    return false;
  }

  private hasObjectMarker(morphemes: MorphemeToken[], index: number): boolean {
    if (index + 1 < morphemes.length) {
      const nextMorpheme = morphemes[index + 1];
      return nextMorpheme.surface_form === 'を';
    }
    return false;
  }

  private hasLocationMarker(morphemes: MorphemeToken[], index: number): boolean {
    if (index + 1 < morphemes.length) {
      const nextMorpheme = morphemes[index + 1];
      return ['で', 'に', 'から', 'へ'].includes(nextMorpheme.surface_form);
    }
    return false;
  }

  private hasMethodMarker(morphemes: MorphemeToken[], index: number): boolean {
    if (index + 1 < morphemes.length) {
      const nextMorpheme = morphemes[index + 1];
      return nextMorpheme.surface_form === 'で' || nextMorpheme.surface_form === 'により';
    }
    return false;
  }

  private isPersonNoun(surface: string): boolean {
    const personWords = ['人', '方', '者', '学生', '先生', '友達', '家族', '母', '父', '子', '私', '僕', '君', 'あなた'];
    return personWords.some(word => surface.includes(word));
  }

  private isTimeExpression(surface: string): boolean {
    const timeWords = ['今日', '昨日', '明日', '今', 'いま', '朝', '昼', '夜', '時', '分', '秒', '年', '月', '日', '曜日'];
    return timeWords.some(word => surface.includes(word));
  }

  private isTimeAdverb(surface: string): boolean {
    const timeAdverbs = ['いつも', 'たまに', 'よく', 'すぐ', 'もう', 'まだ', 'さっき', 'これから'];
    return timeAdverbs.includes(surface);
  }

  private isReasonMarker(surface: string): boolean {
    return ['ので', 'から', 'ため'].includes(surface);
  }

  private isMannerAdverb(surface: string): boolean {
    const mannerAdverbs = ['ゆっくり', '急いで', '丁寧に', '静かに', '大きく', '小さく', 'しっかり', 'きちんと'];
    return mannerAdverbs.includes(surface);
  }

  private extractReasonPhrase(morphemes: MorphemeToken[], reasonMarkerIndex: number): string | null {
    // 簡単な実装：理由マーカーの直前の語を抽出
    if (reasonMarkerIndex > 0) {
      return morphemes[reasonMarkerIndex - 1].surface_form;
    }
    return null;
  }

  private getReasonIndices(morphemes: MorphemeToken[], reasonMarkerIndex: number): number[] {
    // 簡単な実装：理由マーカーの直前の語のインデックス
    if (reasonMarkerIndex > 0) {
      return [reasonMarkerIndex - 1, reasonMarkerIndex];
    }
    return [reasonMarkerIndex];
  }
}