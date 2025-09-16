// Types for morphological analysis results
export interface MorphemeToken {
  surface_form: string;      // 表層形
  pos: string;              // 品詞
  pos_detail_1: string;     // 品詞細分類1
  pos_detail_2: string;     // 品詞細分類2
  pos_detail_3: string;     // 品詞細分類3
  conjugated_type: string;  // 活用型
  conjugated_form: string;  // 活用形
  basic_form: string;       // 基本形
  reading: string;          // 読み
  pronunciation: string;    // 発音
}

// Types for dependency analysis
export interface DependencyRelation {
  fromIndex: number;        // 係り元のtoken index
  toIndex: number;          // 係り先のtoken index
  label: string;           // 関係ラベル
}

// Types for 5W1H analysis
export interface FiveW1HElement {
  category: 'who' | 'what' | 'when' | 'where' | 'why' | 'how';  // 5W1H カテゴリ
  text: string;                                                 // 抽出されたテキスト
  morphemeIndices: number[];                                    // 関連する形態素のインデックス
  confidence: number;                                           // 信頼度 (0-1)
}

export interface FiveW1HResult {
  who: FiveW1HElement[];      // 誰が
  what: FiveW1HElement[];     // 何を
  when: FiveW1HElement[];     // いつ
  where: FiveW1HElement[];    // どこで
  why: FiveW1HElement[];      // なぜ
  how: FiveW1HElement[];      // どのように
}

export interface AnalysisResult {
  morphemes: MorphemeToken[];
  dependencies: DependencyRelation[];
  fiveW1H?: FiveW1HResult;
}