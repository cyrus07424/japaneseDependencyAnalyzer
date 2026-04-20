import { MorphemeToken, DependencyRelation, Chunk, ChunkDependency } from './types';

/**
 * CaboCha-inspired Japanese dependency parser
 *
 * CaboCha (https://github.com/taku910/cabocha) is a Japanese dependency parser
 * that works in two stages:
 *   1. Bunsetsu (文節) segmentation – group morphemes into phrase chunks
 *   2. Cascade dependency parsing – determine the head chunk for each chunk
 *
 * This implementation ports CaboCha's chunking heuristics and replaces the
 * original SVM cascade model with rule-based dependency resolution derived
 * from the same particle/POS features CaboCha's model is trained on.
 */

// Self-standing word POS (自立語) – these always open a new bunsetsu
const INDEPENDENT_POS = new Set([
  '名詞', '動詞', '形容詞', '形容動詞', '副詞', '接続詞', '感動詞', '接頭詞', '接頭辞',
]);

// Dependency label map keyed by functional-word surface form
const FUNC_LABEL: Record<string, string> = {
  'が': '主格',
  'は': '主題',
  'も': '主題',
  'を': '目的格',
  'に': '与格',
  'で': '具格',
  'へ': '方向格',
  'から': '起点格',
  'より': '比較格',
  'と': '並立格',
  'の': '連体修飾',
  'て': '連用',
  'ので': '理由',
  'ため': '目的',
  'ために': '目的',
  'けど': '逆接',
  'けれど': '逆接',
  'のに': '逆接',
};

export class DependencyParser {

  // -----------------------------------------------------------------------
  // Bunsetsu segmentation (CaboCha chunking rules)
  // -----------------------------------------------------------------------

  /**
   * Segment morphemes into bunsetsu (文節) chunks.
   *
   * CaboCha's chunking rule (simplified):
   *   - A new chunk starts whenever an independent word (自立語) is encountered,
   *     UNLESS it is a non-independent nominal suffix (接尾 / 非自立).
   */
  segmentIntoChunks(morphemes: MorphemeToken[]): Chunk[] {
    if (morphemes.length === 0) return [];

    const boundaries: number[] = [0];

    for (let i = 1; i < morphemes.length; i++) {
      if (this.isIndependentWord(morphemes[i])) {
        boundaries.push(i);
      }
    }

    return boundaries.map((start, b) => {
      const end =
        b + 1 < boundaries.length ? boundaries[b + 1] - 1 : morphemes.length - 1;
      return this.buildChunk(morphemes, start, end);
    });
  }

  /** True when the morpheme acts as a self-standing word that opens a new bunsetsu */
  private isIndependentWord(m: MorphemeToken): boolean {
    // Nominal suffixes and non-independent forms attach to the previous chunk
    const detail = m.pos_detail_1;
    if ((m.pos === '名詞' || m.pos === '動詞') && detail === '非自立') return false;
    if (m.pos === '名詞' && detail === '接尾') return false;
    return INDEPENDENT_POS.has(m.pos);
  }

  private buildChunk(morphemes: MorphemeToken[], start: number, end: number): Chunk {
    const morphemeIndices: number[] = [];
    for (let i = start; i <= end; i++) morphemeIndices.push(i);

    // Head = first independent word in the span
    let headIndex = start;
    for (let i = start; i <= end; i++) {
      if (this.isIndependentWord(morphemes[i])) {
        headIndex = i;
        break;
      }
    }

    // Functional word = last particle (助詞) or auxiliary (助動詞) in the span
    let funcIndex = -1;
    for (let i = end; i >= start; i--) {
      const pos = morphemes[i].pos;
      if (pos === '助詞' || pos === '助動詞') {
        funcIndex = i;
        break;
      }
    }

    return { morphemeIndices, headIndex, funcIndex, link: -1 };
  }

  // -----------------------------------------------------------------------
  // Cascade dependency parsing (CaboCha feature-based heuristics)
  // -----------------------------------------------------------------------

  /**
   * Determine the head chunk for each chunk (except the final/root chunk).
   * The rules mirror the feature set CaboCha's cascade SVM uses:
   *   - functional word (助詞/助動詞) surface form at the end of the source chunk
   *   - POS / conjugation form of the head word of the source chunk
   *
   * CaboCha guarantees: dependency links are left-to-right and non-crossing.
   */
  parseChunkDependencies(morphemes: MorphemeToken[], chunks: Chunk[]): ChunkDependency[] {
    if (chunks.length <= 1) return [];

    const deps: ChunkDependency[] = [];
    const last = chunks.length - 1;

    for (let i = 0; i < last; i++) {
      const link = this.resolveLink(morphemes, chunks, i, last);
      chunks[i].link = link;
      deps.push({
        fromChunkIndex: i,
        toChunkIndex: link,
        label: this.resolveLabel(morphemes, chunks, i),
      });
    }

    return deps;
  }

  /**
   * Resolve which chunk is the head of chunk[i].
   *
   * Resolution order (highest to lowest priority) mirrors CaboCha features:
   *  1. の (genitive)         → nearest right noun chunk
   *  2. が / は (subject/topic) → rightmost predicate chunk
   *  3. を (accusative)       → nearest right verb chunk
   *  4. Case markers          → nearest right predicate chunk
   *  5. と (quotative)        → nearest right verb chunk
   *  6. Reason markers        → rightmost predicate chunk
   *  7. Prenominal adj        → nearest right noun chunk
   *  8. Adverb               → nearest right predicate chunk
   *  9. Verbal conjunctive    → nearest right verb chunk
   * 10. Default              → nearest right chunk (CaboCha preference for proximity)
   */
  private resolveLink(
    morphemes: MorphemeToken[],
    chunks: Chunk[],
    i: number,
    last: number,
  ): number {
    const chunk = chunks[i];
    const func = chunk.funcIndex >= 0 ? morphemes[chunk.funcIndex] : null;
    const funcSurface = func?.surface_form ?? '';
    const head = morphemes[chunk.headIndex];

    // 1. の → nearest right noun chunk
    if (funcSurface === 'の') {
      for (let j = i + 1; j <= last; j++) {
        if (morphemes[chunks[j].headIndex].pos === '名詞') return j;
      }
    }

    // 2. が / は → rightmost predicate (verb or adjective)
    if (funcSurface === 'が' || funcSurface === 'は' || funcSurface === 'も') {
      for (let j = last; j > i; j--) {
        const pos = morphemes[chunks[j].headIndex].pos;
        if (pos === '動詞' || pos === '形容詞' || pos === '形容動詞') return j;
      }
    }

    // 3. を → nearest right verb
    if (funcSurface === 'を') {
      for (let j = i + 1; j <= last; j++) {
        if (morphemes[chunks[j].headIndex].pos === '動詞') return j;
      }
    }

    // 4. Case markers → nearest right predicate
    // Disambiguate 'で': 格助詞 (case) vs 接続助詞 (conjunctive)
    const deIsCase =
      funcSurface === 'で' && func?.pos_detail_1 !== '接続助詞';
    if (['に', 'へ', 'から', 'より'].includes(funcSurface) || deIsCase) {
      for (let j = i + 1; j <= last; j++) {
        const pos = morphemes[chunks[j].headIndex].pos;
        if (pos === '動詞' || pos === '形容詞' || pos === '形容動詞') return j;
      }
    }

    // 5. と → nearest right verb
    if (funcSurface === 'と') {
      for (let j = i + 1; j <= last; j++) {
        if (morphemes[chunks[j].headIndex].pos === '動詞') return j;
      }
    }

    // 6. Reason / purpose markers → rightmost verb
    if (['ので', 'から', 'ため', 'ために'].includes(funcSurface)) {
      for (let j = last; j > i; j--) {
        if (morphemes[chunks[j].headIndex].pos === '動詞') return j;
      }
    }

    // 7. Adversative / concessive → rightmost verb
    if (['けど', 'けれど', 'のに', 'が'].includes(funcSurface) && func?.pos === '助詞') {
      for (let j = last; j > i; j--) {
        if (morphemes[chunks[j].headIndex].pos === '動詞') return j;
      }
    }

    // 8. Prenominal adjective (連体形 or な) → nearest right noun chunk
    if (
      (head.pos === '形容詞' || head.pos === '形容動詞') &&
      (head.conjugated_form === '連体形' || funcSurface === 'な')
    ) {
      for (let j = i + 1; j <= last; j++) {
        if (morphemes[chunks[j].headIndex].pos === '名詞') return j;
      }
    }

    // 9. Adverb → nearest right predicate
    if (head.pos === '副詞') {
      for (let j = i + 1; j <= last; j++) {
        const pos = morphemes[chunks[j].headIndex].pos;
        if (pos === '動詞' || pos === '形容詞' || pos === '形容動詞') return j;
      }
    }

    // 10. Verbal conjunctive (連用形 / て form / conjunctive で) → nearest right verb
    const deIsConjunctive =
      funcSurface === 'で' && func?.pos_detail_1 === '接続助詞';
    if (
      head.pos === '動詞' &&
      (head.conjugated_form === '連用形' ||
        funcSurface === 'て' ||
        deIsConjunctive)
    ) {
      for (let j = i + 1; j <= last; j++) {
        if (morphemes[chunks[j].headIndex].pos === '動詞') return j;
      }
    }

    // Default: nearest right chunk (CaboCha's proximity preference)
    return i + 1;
  }

  private resolveLabel(
    morphemes: MorphemeToken[],
    chunks: Chunk[],
    i: number,
  ): string {
    const chunk = chunks[i];
    const func = chunk.funcIndex >= 0 ? morphemes[chunk.funcIndex] : null;
    const funcSurface = func?.surface_form ?? '';
    const headPos = morphemes[chunk.headIndex].pos;

    if (funcSurface && FUNC_LABEL[funcSurface]) return FUNC_LABEL[funcSurface];
    if (headPos === '副詞') return '副詞修飾';
    if (headPos === '形容詞' || headPos === '形容動詞') return '形容修飾';
    if (headPos === '接続詞') return '接続';
    return '係り受け';
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Full CaboCha-style parse: returns chunks, chunk-level deps, and
   * morpheme-level deps (head morpheme of each chunk as node).
   */
  parseWithChunks(morphemes: MorphemeToken[]): {
    chunks: Chunk[];
    chunkDependencies: ChunkDependency[];
    dependencies: DependencyRelation[];
  } {
    const chunks = this.segmentIntoChunks(morphemes);
    const chunkDependencies = this.parseChunkDependencies(morphemes, chunks);
    const dependencies: DependencyRelation[] = chunkDependencies.map(dep => ({
      fromIndex: chunks[dep.fromChunkIndex].headIndex,
      toIndex: chunks[dep.toChunkIndex].headIndex,
      label: dep.label,
    }));
    return { chunks, chunkDependencies, dependencies };
  }

  /**
   * Convenience wrapper kept for backward compatibility.
   */
  parseDependencies(morphemes: MorphemeToken[]): DependencyRelation[] {
    return this.parseWithChunks(morphemes).dependencies;
  }
}
