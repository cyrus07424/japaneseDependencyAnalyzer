import { MorphemeToken, DependencyRelation } from './types';

/**
 * Simple dependency parser inspired by CaboCha logic
 * This is a simplified version focusing on basic Japanese dependency patterns
 */
export class DependencyParser {
  
  /**
   * Parse dependencies from morpheme tokens
   */
  parseDependencies(morphemes: MorphemeToken[]): DependencyRelation[] {
    const dependencies: DependencyRelation[] = [];
    
    for (let i = 0; i < morphemes.length; i++) {
      const token = morphemes[i];
      
      // Find dependency target for this token
      const target = this.findDependencyTarget(morphemes, i);
      if (target !== -1) {
        dependencies.push({
          fromIndex: i,
          toIndex: target,
          label: this.getDependencyLabel(morphemes[i], morphemes[target])
        });
      }
    }
    
    return dependencies;
  }
  
  /**
   * Find the dependency target for a given token index
   */
  private findDependencyTarget(morphemes: MorphemeToken[], currentIndex: number): number {
    const current = morphemes[currentIndex];
    
    // If it's the last token, no dependency
    if (currentIndex >= morphemes.length - 1) {
      return -1;
    }
    
    // Basic rules based on POS tags
    switch (current.pos) {
      case '名詞':
        return this.findNounTarget(morphemes, currentIndex);
      case '動詞':
        return this.findVerbTarget(morphemes, currentIndex);
      case '形容詞':
        return this.findAdjectiveTarget(morphemes, currentIndex);
      case '副詞':
        return this.findAdverbTarget(morphemes, currentIndex);
      case '助詞':
        return this.findParticleTarget(morphemes, currentIndex);
      case '助動詞':
        return this.findAuxiliaryTarget(morphemes, currentIndex);
      default:
        return this.findDefaultTarget(morphemes, currentIndex);
    }
  }
  
  private findNounTarget(morphemes: MorphemeToken[], index: number): number {
    // Look for particles, verbs, or other nouns to the right
    for (let i = index + 1; i < morphemes.length; i++) {
      const pos = morphemes[i].pos;
      if (pos === '助詞' || pos === '動詞' || pos === '形容詞') {
        return i;
      }
    }
    return morphemes.length - 1; // Default to last token
  }
  
  private findVerbTarget(morphemes: MorphemeToken[], index: number): number {
    // Verbs often depend on the sentence end or auxiliary verbs
    for (let i = index + 1; i < morphemes.length; i++) {
      const pos = morphemes[i].pos;
      if (pos === '助動詞' || pos === '記号') {
        return i;
      }
    }
    return morphemes.length - 1;
  }
  
  private findAdjectiveTarget(morphemes: MorphemeToken[], index: number): number {
    // Adjectives often modify nouns or connect to auxiliary verbs
    for (let i = index + 1; i < morphemes.length; i++) {
      const pos = morphemes[i].pos;
      if (pos === '名詞' || pos === '助動詞') {
        return i;
      }
    }
    return morphemes.length - 1;
  }
  
  private findAdverbTarget(morphemes: MorphemeToken[], index: number): number {
    // Adverbs modify verbs or adjectives
    for (let i = index + 1; i < morphemes.length; i++) {
      const pos = morphemes[i].pos;
      if (pos === '動詞' || pos === '形容詞') {
        return i;
      }
    }
    return morphemes.length - 1;
  }
  
  private findParticleTarget(morphemes: MorphemeToken[], index: number): number {
    // Particles connect to following content words
    for (let i = index + 1; i < morphemes.length; i++) {
      const pos = morphemes[i].pos;
      if (pos === '動詞' || pos === '形容詞' || pos === '名詞') {
        return i;
      }
    }
    return morphemes.length - 1;
  }
  
  private findAuxiliaryTarget(morphemes: MorphemeToken[], index: number): number {
    // Auxiliary verbs usually depend on main verbs or sentence end
    return morphemes.length - 1;
  }
  
  private findDefaultTarget(morphemes: MorphemeToken[], index: number): number {
    // Default: depend on the next content word or sentence end
    for (let i = index + 1; i < morphemes.length; i++) {
      const pos = morphemes[i].pos;
      if (pos === '動詞' || pos === '名詞' || pos === '形容詞') {
        return i;
      }
    }
    return morphemes.length - 1;
  }
  
  /**
   * Get dependency label based on POS tags
   */
  private getDependencyLabel(from: MorphemeToken, to: MorphemeToken): string {
    if (from.pos === '名詞' && to.pos === '助詞') return '格関係';
    if (from.pos === '形容詞' && to.pos === '名詞') return '連体修飾';
    if (from.pos === '副詞' && to.pos === '動詞') return '連用修飾';
    if (from.pos === '助詞' && to.pos === '動詞') return '格関係';
    if (from.pos === '動詞' && to.pos === '助動詞') return '述語関係';
    return '依存関係';
  }
}