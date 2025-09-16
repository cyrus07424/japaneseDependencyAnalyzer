// Kuromoji-based Japanese text analyzer
// Uses kuromoji.js with IPAdic dictionary for accurate morphological analysis
import * as kuromoji from 'kuromoji';
import { MorphemeToken } from './types';

export class KuromojiAnalyzer {
  private tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the kuromoji tokenizer with local IPAdic dictionary
   * Dictionary files are served from /public/dict/ directory
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: '/dict' })
        .build((err: any, tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>) => {
          if (err) {
            reject(err);
            return;
          }
          this.tokenizer = tokenizer;
          this.isInitialized = true;
          resolve();
        });
    });
  }

  /**
   * Check if the analyzer is ready to use
   */
  isReady(): boolean {
    return this.isInitialized && this.tokenizer !== null;
  }

  /**
   * Tokenize Japanese text using kuromoji
   */
  tokenize(text: string): MorphemeToken[] {
    if (!this.tokenizer) {
      throw new Error('Analyzer not initialized. Call initialize() first.');
    }

    const tokens = this.tokenizer.tokenize(text);
    
    return tokens.map(token => ({
      surface_form: token.surface_form,
      pos: token.pos,
      pos_detail_1: token.pos_detail_1 || '',
      pos_detail_2: token.pos_detail_2 || '',
      pos_detail_3: token.pos_detail_3 || '',
      conjugated_type: token.conjugated_type || '',
      conjugated_form: token.conjugated_form || '',
      basic_form: token.basic_form || token.surface_form,
      reading: token.reading || token.surface_form,
      pronunciation: token.pronunciation || token.reading || token.surface_form
    }));
  }
}