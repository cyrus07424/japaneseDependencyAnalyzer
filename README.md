# Japanese Dependency Analyzer (日本語係り受け解析器)

A web-based tool for performing morphological analysis and dependency parsing on Japanese text. This tool provides comprehensive analysis of Japanese sentences with visual dependency graphs.

## Features (機能)

- **Morphological Analysis (形態素解析)**: Break down Japanese text into individual morphemes with detailed grammatical information using kuromoji.js with IPAdic dictionary
- **Dependency Parsing (係り受け解析)**: Analyze grammatical dependencies between morphemes using CaboCha-inspired logic
- **5W1H Extraction (5W1H抽出)**: Extract Who, What, When, Where, Why, and How elements from the text with confidence scores
- **Visual Graph (グラフ表示)**: Interactive dependency relationship visualization using D3.js
- **Real-time Analysis (リアルタイム解析)**: Instant analysis results as you type

## Technology Stack

- **Frontend**: Next.js 15.5.3 with React 19
- **Styling**: Tailwind CSS 4
- **Visualization**: D3.js for dependency graphs
- **Language**: TypeScript
- **Analysis Engine**: kuromoji.js with IPAdic dictionary for morphological analysis and custom dependency parsing

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/cyrus07424/japaneseDependencyAnalyzer.git
cd japaneseDependencyAnalyzer
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
npm run build
npm start
```

## Usage (使い方)

1. Enter Japanese text in the input textarea (日本語テキストを入力してください)
2. Click the "解析開始" (Start Analysis) button
3. View the results in four sections:
   - **Morphological Analysis Table (形態素解析結果)**: Detailed breakdown of each morpheme
   - **Dependency Graph (係り受け関係グラフ)**: Visual representation of dependencies
   - **Dependency Relations (係り受け解析結果)**: List of all dependency relationships
   - **5W1H Extraction (5W1H抽出結果)**: Extracted Who, What, When, Where, Why, and How elements with confidence scores

## Analysis Features

### Morphological Analysis
- Surface form (表層形): The original word as it appears in the text
- Part of speech (品詞): Grammatical category (noun, verb, adjective, etc.)
- Basic form (基本形): Dictionary form of the word
- Reading (読み): Phonetic reading

### Dependency Analysis
The tool identifies various types of grammatical relationships:
- **格関係 (Case Relations)**: Relationships involving particles
- **連体修飾 (Adnominal Modification)**: Adjective-noun modifications
- **連用修飾 (Adverbial Modification)**: Adverb-verb modifications
- **述語関係 (Predicate Relations)**: Verb-auxiliary relationships
- **依存関係 (General Dependencies)**: Other grammatical dependencies

## Example

Input: `先生が教室で学生にゆっくり英語を教えました。`

The tool will:
1. Break it into morphemes: 先生, が, 教室, で, 学生, に, ゆっくり, 英語, を, 教え, まし, た, 。
2. Analyze parts of speech for each morpheme
3. Determine dependency relationships between morphemes
4. Extract 5W1H elements:
   - Who (誰が): 先生 (teacher)
   - What (何を): 英語 (English), 教える (teach)
   - Where (どこで): 教室 (classroom)
   - How (どのように): ゆっくり (slowly)
5. Visualize the dependencies in an interactive graph

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
app/
├── analyzer.tsx           # Main analyzer component
├── dependency-parser.ts   # Dependency analysis logic
├── kuromoji-analyzer.ts   # Kuromoji-based morphological analysis engine
├── types.ts              # TypeScript type definitions
├── layout.tsx            # App layout
├── page.tsx              # Main page
└── globals.css           # Global styles
```

## License

This project is licensed under the MIT License.

## Author

Created by [cyrus](https://github.com/cyrus07424)
