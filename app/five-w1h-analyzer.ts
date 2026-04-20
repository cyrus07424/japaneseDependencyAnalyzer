// 5W1H Analysis for Japanese text
// Extracts Who, What, When, Where, Why, How elements from morphological analysis results

import { MorphemeToken, DependencyRelation, Chunk, ChunkDependency, FiveW1HElement, FiveW1HResult } from './types';

export class FiveW1HAnalyzer {
  
  /**
   * Analyze 5W1H elements using chunk-level dependency information.
   * When chunks/chunkDependencies are provided the analysis is more accurate
   * because it operates on bunsetsu (文節) units as CaboCha would produce them.
   */
  analyze(
    morphemes: MorphemeToken[],
    dependencies: DependencyRelation[],
    chunks?: Chunk[],
    chunkDependencies?: ChunkDependency[],
  ): FiveW1HResult {
    const result: FiveW1HResult = {
      who: [],
      what: [],
      when: [],
      where: [],
      why: [],
      how: []
    };

    if (chunks && chunks.length > 0) {
      result.who   = this.extractWhoFromChunks(morphemes, chunks);
      result.what  = this.extractWhatFromChunks(morphemes, chunks);
      result.when  = this.extractWhenFromChunks(morphemes, chunks);
      result.where = this.extractWhereFromChunks(morphemes, chunks);
      result.why   = this.extractWhyFromChunks(morphemes, chunks);
      result.how   = this.extractHowFromChunks(morphemes, chunks);
    } else {
      // Fallback: morpheme-level analysis
      result.who   = this.extractWho(morphemes, dependencies);
      result.what  = this.extractWhat(morphemes, dependencies);
      result.when  = this.extractWhen(morphemes, dependencies);
      result.where = this.extractWhere(morphemes, dependencies);
      result.why   = this.extractWhy(morphemes, dependencies);
      result.how   = this.extractHow(morphemes, dependencies);
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Chunk-based extraction (primary path, uses CaboCha bunsetsu output)
  // -----------------------------------------------------------------------

  /** 誰が: chunks marked with が/は/も (subject/topic particles) */
  private extractWhoFromChunks(morphemes: MorphemeToken[], chunks: Chunk[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    for (const chunk of chunks) {
      const func = chunk.funcIndex >= 0 ? morphemes[chunk.funcIndex] : null;
      const funcSurface = func?.surface_form ?? '';
      const head = morphemes[chunk.headIndex];

      if (funcSurface === 'が' || funcSurface === 'は' || funcSurface === 'も') {
        if (head.pos === '名詞' || head.pos === '代名詞') {
          const confidence = funcSurface === 'が' ? 0.9 : 0.75;
          elements.push({
            category: 'who',
            text: this.chunkSurface(morphemes, chunk),
            morphemeIndices: chunk.morphemeIndices,
            confidence,
          });
        }
      } else if (this.isPersonNoun(head.surface_form)) {
        elements.push({
          category: 'who',
          text: head.surface_form,
          morphemeIndices: [chunk.headIndex],
          confidence: 0.4,
        });
      }
    }
    return elements;
  }

  /** 何を: verb chunks + chunks marked with を */
  private extractWhatFromChunks(morphemes: MorphemeToken[], chunks: Chunk[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    for (const chunk of chunks) {
      const func = chunk.funcIndex >= 0 ? morphemes[chunk.funcIndex] : null;
      const funcSurface = func?.surface_form ?? '';
      const head = morphemes[chunk.headIndex];

      if (funcSurface === 'を') {
        elements.push({
          category: 'what',
          text: this.chunkSurface(morphemes, chunk),
          morphemeIndices: chunk.morphemeIndices,
          confidence: 0.85,
        });
      } else if (head.pos === '動詞' && chunk.funcIndex === -1) {
        elements.push({
          category: 'what',
          text: head.basic_form,
          morphemeIndices: [chunk.headIndex],
          confidence: 0.7,
        });
      }
    }
    return elements;
  }

  /** いつ: chunks containing time-related expressions */
  private extractWhenFromChunks(morphemes: MorphemeToken[], chunks: Chunk[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    for (const chunk of chunks) {
      const head = morphemes[chunk.headIndex];
      if (this.isTimeExpression(head.surface_form)) {
        elements.push({
          category: 'when',
          text: this.chunkSurface(morphemes, chunk),
          morphemeIndices: chunk.morphemeIndices,
          confidence: 0.9,
        });
      } else if (head.pos === '副詞' && this.isTimeAdverb(head.surface_form)) {
        elements.push({
          category: 'when',
          text: head.surface_form,
          morphemeIndices: [chunk.headIndex],
          confidence: 0.8,
        });
      }
    }
    return elements;
  }

  /** どこで: chunks marked with location particles / proper-noun locations */
  private extractWhereFromChunks(morphemes: MorphemeToken[], chunks: Chunk[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    for (const chunk of chunks) {
      const func = chunk.funcIndex >= 0 ? morphemes[chunk.funcIndex] : null;
      const funcSurface = func?.surface_form ?? '';
      const head = morphemes[chunk.headIndex];

      const hasLocationParticle = ['に', 'で', 'へ', 'から'].includes(funcSurface);

      if (hasLocationParticle && head.pos === '名詞') {
        elements.push({
          category: 'where',
          text: this.chunkSurface(morphemes, chunk),
          morphemeIndices: chunk.morphemeIndices,
          confidence: 0.8,
        });
      } else if (
        head.pos === '名詞' &&
        head.pos_detail_1 === '固有名詞' &&
        head.pos_detail_2 === '地域'
      ) {
        elements.push({
          category: 'where',
          text: head.surface_form,
          morphemeIndices: [chunk.headIndex],
          confidence: 0.9,
        });
      }
    }
    return elements;
  }

  /** なぜ: chunks whose functional word is a reason marker */
  private extractWhyFromChunks(morphemes: MorphemeToken[], chunks: Chunk[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    for (const chunk of chunks) {
      const func = chunk.funcIndex >= 0 ? morphemes[chunk.funcIndex] : null;
      const funcSurface = func?.surface_form ?? '';
      if (this.isReasonMarker(funcSurface)) {
        elements.push({
          category: 'why',
          text: this.chunkSurface(morphemes, chunk),
          morphemeIndices: chunk.morphemeIndices,
          confidence: 0.75,
        });
      }
    }
    return elements;
  }

  /** どのように: manner adverb chunks + instrumental で chunks */
  private extractHowFromChunks(morphemes: MorphemeToken[], chunks: Chunk[]): FiveW1HElement[] {
    const elements: FiveW1HElement[] = [];
    for (const chunk of chunks) {
      const func = chunk.funcIndex >= 0 ? morphemes[chunk.funcIndex] : null;
      const funcSurface = func?.surface_form ?? '';
      const head = morphemes[chunk.headIndex];

      if (head.pos === '副詞' && this.isMannerAdverb(head.surface_form)) {
        elements.push({
          category: 'how',
          text: head.surface_form,
          morphemeIndices: [chunk.headIndex],
          confidence: 0.75,
        });
      } else if (funcSurface === 'で' && head.pos === '名詞') {
        elements.push({
          category: 'how',
          text: this.chunkSurface(morphemes, chunk),
          morphemeIndices: chunk.morphemeIndices,
          confidence: 0.6,
        });
      }
    }
    return elements;
  }

  /** Return the concatenated surface forms of all morphemes in a chunk */
  private chunkSurface(morphemes: MorphemeToken[], chunk: Chunk): string {
    return chunk.morphemeIndices.map(i => morphemes[i].surface_form).join('');
  }

  // -----------------------------------------------------------------------
  // Morpheme-level fallback methods (legacy path)
  // -----------------------------------------------------------------------

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
    return ['ので', 'から', 'ため', 'ために'].includes(surface);
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
