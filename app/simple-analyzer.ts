// Simple Japanese text analyzer without external dependencies
export interface SimpleMorpheme {
  surface: string;
  pos: string;
  reading: string;
  basicForm: string;
}

export class SimpleJapaneseAnalyzer {
  
  // Basic patterns for Japanese text analysis
  private patterns = {
    hiragana: /[\u3040-\u309F]/g,
    katakana: /[\u30A0-\u30FF]/g,
    kanji: /[\u4E00-\u9FAF]/g,
    particles: ['は', 'が', 'を', 'に', 'で', 'と', 'や', 'の', 'へ', 'より', 'から', 'まで', 'こそ', 'でも', 'なら', 'ので', 'けれど'],
    auxiliaryVerbs: ['だ', 'である', 'です', 'ます', 'た', 'て', 'で'],
    adjectives: ['い', 'しい', 'ない', 'たい'],
  };

  // Simple tokenization based on character types and known patterns
  tokenize(text: string): SimpleMorpheme[] {
    const tokens: SimpleMorpheme[] = [];
    let currentToken = '';
    let currentType = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charType = this.getCharacterType(char);
      
      // If character type changes or we hit a particle, create a new token
      if (currentType !== charType || this.isParticle(char)) {
        if (currentToken) {
          tokens.push(this.createMorpheme(currentToken, currentType));
        }
        currentToken = char;
        currentType = charType;
      } else {
        currentToken += char;
      }
    }
    
    // Add the last token
    if (currentToken) {
      tokens.push(this.createMorpheme(currentToken, currentType));
    }
    
    return this.refineMorphemes(tokens);
  }
  
  private getCharacterType(char: string): string {
    if (this.patterns.hiragana.test(char)) return 'hiragana';
    if (this.patterns.katakana.test(char)) return 'katakana';
    if (this.patterns.kanji.test(char)) return 'kanji';
    if (/[a-zA-Z]/.test(char)) return 'alphabet';
    if (/[0-9]/.test(char)) return 'number';
    return 'symbol';
  }
  
  private isParticle(char: string): boolean {
    return this.patterns.particles.includes(char);
  }
  
  private createMorpheme(surface: string, type: string): SimpleMorpheme {
    const pos = this.determinePOS(surface, type);
    return {
      surface,
      pos,
      reading: this.getReading(surface, type),
      basicForm: this.getBasicForm(surface, pos)
    };
  }
  
  private determinePOS(surface: string, type: string): string {
    // Particles
    if (this.patterns.particles.includes(surface)) {
      return '助詞';
    }
    
    // Auxiliary verbs
    if (this.patterns.auxiliaryVerbs.some(aux => surface.includes(aux))) {
      return '助動詞';
    }
    
    // Verbs (ending patterns)
    if (surface.endsWith('る') || surface.endsWith('う') || surface.endsWith('く') || 
        surface.endsWith('ぐ') || surface.endsWith('す') || surface.endsWith('つ') ||
        surface.endsWith('ぬ') || surface.endsWith('ぶ') || surface.endsWith('む')) {
      return '動詞';
    }
    
    // Adjectives
    if (surface.endsWith('い') || surface.endsWith('しい') || surface.endsWith('ない')) {
      return '形容詞';
    }
    
    // Adverbs
    if (surface.endsWith('く') && type === 'hiragana') {
      return '副詞';
    }
    
    // Based on character type
    switch (type) {
      case 'kanji':
        return '名詞';
      case 'katakana':
        return '名詞';
      case 'hiragana':
        return surface.length === 1 ? '助詞' : '名詞';
      case 'alphabet':
        return '名詞';
      case 'number':
        return '数詞';
      default:
        return '記号';
    }
  }
  
  private getReading(surface: string, type: string): string {
    // For hiragana, reading is the same as surface
    if (type === 'hiragana') return surface;
    
    // For katakana, convert to hiragana reading (simplified)
    if (type === 'katakana') {
      return surface.replace(/[\u30A0-\u30FF]/g, (match) => {
        const code = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(code);
      });
    }
    
    // For kanji and others, return surface (in real implementation, this would use a dictionary)
    return surface;
  }
  
  private getBasicForm(surface: string, pos: string): string {
    if (pos === '動詞') {
      // Simple verb conjugation rules
      if (surface.endsWith('ます')) return surface.replace('ます', 'る');
      if (surface.endsWith('た')) return surface.replace('た', 'る');
      if (surface.endsWith('て')) return surface.replace('て', 'る');
    }
    
    if (pos === '形容詞') {
      if (surface.endsWith('かった')) return surface.replace('かった', 'い');
      if (surface.endsWith('くて')) return surface.replace('くて', 'い');
    }
    
    return surface;
  }
  
  private refineMorphemes(morphemes: SimpleMorpheme[]): SimpleMorpheme[] {
    const refined: SimpleMorpheme[] = [];
    
    for (let i = 0; i < morphemes.length; i++) {
      const current = morphemes[i];
      
      // Skip empty tokens
      if (!current.surface.trim()) continue;
      
      // Merge certain patterns
      if (i < morphemes.length - 1) {
        const next = morphemes[i + 1];
        
        // Merge auxiliary verbs with preceding content
        if (next.pos === '助動詞' && current.pos !== '記号') {
          refined.push({
            surface: current.surface + next.surface,
            pos: current.pos,
            reading: current.reading + next.reading,
            basicForm: current.basicForm
          });
          i++; // Skip next token
          continue;
        }
      }
      
      refined.push(current);
    }
    
    return refined;
  }
}