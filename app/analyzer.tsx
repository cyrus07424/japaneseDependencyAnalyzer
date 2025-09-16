'use client';

import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MorphemeToken, DependencyRelation, AnalysisResult } from './types';
import { DependencyParser } from './dependency-parser';
import { KuromojiAnalyzer } from './kuromoji-analyzer';
import { FiveW1HAnalyzer } from './five-w1h-analyzer';

export default function JapaneseAnalyzer() {
  const [inputText, setInputText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dependencyParser = new DependencyParser();
  const fiveW1HAnalyzer = new FiveW1HAnalyzer();
  const [kuromojiAnalyzer] = useState(() => new KuromojiAnalyzer());

  // Initialize analyzer with kuromoji
  useEffect(() => {
    const initAnalyzer = async () => {
      try {
        await kuromojiAnalyzer.initialize();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize kuromoji analyzer:', error);
      }
    };
    
    initAnalyzer();
  }, [kuromojiAnalyzer]);

  const analyzeText = async () => {
    if (!inputText.trim() || !kuromojiAnalyzer.isReady()) return;

    setIsLoading(true);

    try {
      // Perform morphological analysis using kuromoji
      const morphemes = kuromojiAnalyzer.tokenize(inputText);

      // Perform dependency analysis
      const dependencies = dependencyParser.parseDependencies(morphemes);

      // Perform 5W1H analysis
      const fiveW1H = fiveW1HAnalyzer.analyze(morphemes, dependencies);

      setAnalysisResult({
        morphemes,
        dependencies,
        fiveW1H
      });

    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render dependency graph
  useEffect(() => {
    if (analysisResult && svgRef.current) {
      renderDependencyGraph();
    }
  }, [analysisResult]);

  const renderDependencyGraph = () => {
    if (!analysisResult || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 60, left: 20 };

    svg.attr('width', width).attr('height', height);

    const { morphemes, dependencies } = analysisResult;

    // Calculate positions for tokens
    const tokenWidth = (width - margin.left - margin.right) / morphemes.length;
    const tokenY = height - margin.bottom;
    const arcY = tokenY - 40;

    // Draw tokens
    const tokenGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`);

    tokenGroup.selectAll('.token')
      .data(morphemes)
      .enter()
      .append('g')
      .attr('class', 'token')
      .attr('transform', (d, i) => `translate(${i * tokenWidth + tokenWidth / 2}, ${tokenY})`)
      .each(function(d, i) {
        const group = d3.select(this);
        
        // Token text
        group.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('class', 'token-text')
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .text(d.surface_form);

        // POS tag
        group.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '1.5em')
          .attr('class', 'pos-text')
          .style('font-size', '10px')
          .style('fill', '#666')
          .text(d.pos);
      });

    // Draw dependency arcs
    dependencies.forEach(dep => {
      const fromX = dep.fromIndex * tokenWidth + tokenWidth / 2;
      const toX = dep.toIndex * tokenWidth + tokenWidth / 2;
      const controlY = arcY - Math.abs(toX - fromX) * 0.3;

      const path = d3.path();
      path.moveTo(fromX, tokenY - 30);
      path.quadraticCurveTo((fromX + toX) / 2, controlY, toX, tokenY - 30);

      svg.append('path')
        .attr('d', path.toString())
        .attr('transform', `translate(${margin.left}, 0)`)
        .style('fill', 'none')
        .style('stroke', '#007bff')
        .style('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)');

      // Dependency label
      svg.append('text')
        .attr('x', (fromX + toX) / 2 + margin.left)
        .attr('y', controlY + 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '8px')
        .style('fill', '#007bff')
        .text(dep.label);
    });

    // Add arrow marker
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .style('fill', '#007bff');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Japanese Dependency Analyzer
          </h1>
          <p className="text-center text-gray-600 mb-8">
            日本語文章の形態素解析・係り受け解析ツール
          </p>

          {/* Input Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              日本語テキストを入力してください：
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="例：今日は良い天気です。"
              disabled={isLoading}
            />
            <button
              onClick={analyzeText}
              disabled={isLoading || !isReady || !inputText.trim()}
              className="mt-4 bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
            >
              {isLoading ? '解析中...' : isReady ? '解析開始' : '辞書読み込み中...'}
            </button>
          </div>

          {/* Results Section */}
          {analysisResult && (
            <div className="space-y-8">
              {/* Morphological Analysis Results */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">形態素解析結果</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">表層形</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品詞</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基本形</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">読み</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysisResult.morphemes.map((morpheme, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {morpheme.surface_form}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {morpheme.pos}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {morpheme.basic_form}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {morpheme.reading}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dependency Graph */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">係り受け関係グラフ</h2>
                <div className="border border-gray-200 rounded-lg p-4 bg-white overflow-x-auto">
                  <svg ref={svgRef}></svg>
                </div>
              </div>

              {/* Dependency Analysis Results */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">係り受け解析結果</h2>
                <div className="space-y-2">
                  {analysisResult.dependencies.map((dep, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border">
                      <span className="font-medium text-blue-600">
                        {analysisResult.morphemes[dep.fromIndex].surface_form}
                      </span>
                      <span className="mx-2 text-gray-500">→</span>
                      <span className="font-medium text-green-600">
                        {analysisResult.morphemes[dep.toIndex].surface_form}
                      </span>
                      <span className="ml-4 text-sm text-gray-600">
                        ({dep.label})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5W1H Analysis Results */}
              {analysisResult.fiveW1H && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">5W1H抽出結果</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Who (誰が) */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-medium text-blue-800 mb-2">誰が (Who)</h3>
                      {analysisResult.fiveW1H.who.length > 0 ? (
                        <div className="space-y-1">
                          {analysisResult.fiveW1H.who.map((element, index) => (
                            <div key={index} className="bg-white px-2 py-1 rounded text-sm">
                              <span className="font-medium text-blue-700">{element.text}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                (信頼度: {Math.round(element.confidence * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">検出されませんでした</div>
                      )}
                    </div>

                    {/* What (何を) */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-lg font-medium text-green-800 mb-2">何を (What)</h3>
                      {analysisResult.fiveW1H.what.length > 0 ? (
                        <div className="space-y-1">
                          {analysisResult.fiveW1H.what.map((element, index) => (
                            <div key={index} className="bg-white px-2 py-1 rounded text-sm">
                              <span className="font-medium text-green-700">{element.text}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                (信頼度: {Math.round(element.confidence * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">検出されませんでした</div>
                      )}
                    </div>

                    {/* When (いつ) */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h3 className="text-lg font-medium text-purple-800 mb-2">いつ (When)</h3>
                      {analysisResult.fiveW1H.when.length > 0 ? (
                        <div className="space-y-1">
                          {analysisResult.fiveW1H.when.map((element, index) => (
                            <div key={index} className="bg-white px-2 py-1 rounded text-sm">
                              <span className="font-medium text-purple-700">{element.text}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                (信頼度: {Math.round(element.confidence * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">検出されませんでした</div>
                      )}
                    </div>

                    {/* Where (どこで) */}
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h3 className="text-lg font-medium text-orange-800 mb-2">どこで (Where)</h3>
                      {analysisResult.fiveW1H.where.length > 0 ? (
                        <div className="space-y-1">
                          {analysisResult.fiveW1H.where.map((element, index) => (
                            <div key={index} className="bg-white px-2 py-1 rounded text-sm">
                              <span className="font-medium text-orange-700">{element.text}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                (信頼度: {Math.round(element.confidence * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">検出されませんでした</div>
                      )}
                    </div>

                    {/* Why (なぜ) */}
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h3 className="text-lg font-medium text-red-800 mb-2">なぜ (Why)</h3>
                      {analysisResult.fiveW1H.why.length > 0 ? (
                        <div className="space-y-1">
                          {analysisResult.fiveW1H.why.map((element, index) => (
                            <div key={index} className="bg-white px-2 py-1 rounded text-sm">
                              <span className="font-medium text-red-700">{element.text}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                (信頼度: {Math.round(element.confidence * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">検出されませんでした</div>
                      )}
                    </div>

                    {/* How (どのように) */}
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <h3 className="text-lg font-medium text-indigo-800 mb-2">どのように (How)</h3>
                      {analysisResult.fiveW1H.how.length > 0 ? (
                        <div className="space-y-1">
                          {analysisResult.fiveW1H.how.map((element, index) => (
                            <div key={index} className="bg-white px-2 py-1 rounded text-sm">
                              <span className="font-medium text-indigo-700">{element.text}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                (信頼度: {Math.round(element.confidence * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">検出されませんでした</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="text-lg text-gray-600">解析処理中...</div>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center text-gray-400 mt-8">
        &copy; 2025 <a href="https://github.com/cyrus07424" target="_blank" rel="noopener noreferrer">cyrus</a>
      </footer>
    </div>
  );
}