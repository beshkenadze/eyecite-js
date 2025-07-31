# eyecite-js Roadmap

This roadmap outlines the development plan for eyecite-js based on the comprehensive gap analysis between the Python and JavaScript implementations.

## 🎯 Vision

To create the most performant and comprehensive legal citation extraction library in the JavaScript ecosystem, maintaining feature parity with Python eyecite while leveraging JavaScript's strengths.

## 📍 Current Status (v2.7.6-alpha.19)

- ✅ **Core citation extraction** - All major citation types supported
- ✅ **Id. citation resolution** - Advanced resolution with section substitution
- ✅ **Multiple section parsing** - Complex C.F.R. patterns fully supported
- ✅ **TypeScript support** - Full type safety
- ✅ **335 passing tests** - Comprehensive test coverage
- ✅ **Production ready** - For normal document processing workloads

## 🚀 Short-term Goals

### Phase 1: Testing Infrastructure

#### 1.1 Test Factory Utilities
- [ ] Port Python's `test_factories.py` to TypeScript
- [ ] Create factory functions for all citation types
- [ ] Add builders for complex citation scenarios
- [ ] Document factory usage patterns

#### 1.2 Court Extraction Tests
- [ ] Create `courts.test.ts` with all 39 Python test cases
- [ ] Add edge cases for abbreviated court names
- [ ] Test parenthetical court extraction
- [ ] Validate court code mappings

#### 1.3 Missing Test Coverage
- [ ] Add tests for `dumpCitations` utility
- [ ] Port Python's edge case tests
- [ ] Add date validation tests
- [ ] Test nominative reporter overlaps

### Phase 2: Algorithm Enhancements

#### 2.1 Court Matching Algorithm
- [ ] Implement two-pass matching (exact then startswith)
- [ ] Add fuzzy matching for common variations
- [ ] Enhance parenthetical court detection
- [ ] Support international court codes

#### 2.2 Advanced Span Tracking
- [ ] Integrate diff-match-patch library
- [ ] Optimize span updates for large documents
- [ ] Add benchmarks for span calculation
- [ ] Support incremental updates

#### 2.3 Regex Pattern Alignment
- [ ] Audit all regex patterns against Python
- [ ] Fix boundary matching differences
- [ ] Add property-based testing with fast-check
- [ ] Document pattern differences

## 🎨 Medium-term Goals

### Phase 3: Performance Optimization

#### 3.1 WebAssembly Tokenizer
- [ ] Research WebAssembly Aho-Corasick implementations
- [ ] Create WASM build pipeline
- [ ] Benchmark against current implementation
- [ ] Add fallback for environments without WASM

#### 3.2 Caching and Optimization
- [ ] Implement LRU cache for expensive operations
- [ ] Add regex compilation cache
- [ ] Optimize hot paths identified by profiling
- [ ] Reduce memory allocations

### Phase 4: Feature Enhancements

#### 4.1 Additional Citation Types
- [ ] Patent citations (U.S. Pat. No.)
- [ ] International treaties
- [ ] Administrative decisions (NLRB, FTC)
- [ ] State administrative codes

#### 4.2 Enhanced Metadata Extraction
- [ ] Judge name extraction
- [ ] Docket number parsing
- [ ] Opinion type detection
- [ ] Disposition information

#### 4.3 Confidence Scoring
- [ ] Add confidence scores to citations
- [ ] Implement fuzzy matching with scores
- [ ] Flag ambiguous citations
- [ ] Provide match explanations

## 🌟 Long-term Goals

### Phase 5: Ecosystem Integration

#### 5.1 Framework Support
- [ ] React components for citation rendering
- [ ] Vue.js integration
- [ ] Angular service
- [ ] Svelte stores

#### 5.2 Platform Extensions
- [ ] Browser extension for citation detection
- [ ] VS Code extension for legal documents
- [ ] CLI tool enhancements
- [ ] REST API server

#### 5.3 Database Integration
- [ ] PostgreSQL citation storage
- [ ] MongoDB aggregation pipelines
- [ ] Redis caching layer
- [ ] GraphQL schema

### Phase 6: Advanced Features

#### 6.1 Machine Learning Integration
- [ ] Citation disambiguation with ML
- [ ] Context-aware extraction
- [ ] Named entity recognition
- [ ] Citation graph analysis

#### 6.2 Multi-language Support
- [ ] Spanish legal citations
- [ ] Canadian bilingual citations
- [ ] UK legal citations
- [ ] EU case law citations

#### 6.3 Advanced Analysis
- [ ] Citation network visualization
- [ ] Temporal citation analysis
- [ ] Authority scoring
- [ ] Citation recommendation

## 📊 Success Metrics

### Performance Targets
- Process 1,000 pages/second on standard hardware
- < 100ms latency for single document processing
- < 1GB memory usage for 10,000 pages
- WebAssembly speedup of 5-10x

### Quality Targets
- 99.9% accuracy on standard citations
- 95% accuracy on edge cases
- Zero false positives for DOL/CFR citations
- 100% backward compatibility

### Community Targets
- Active community engagement
- Regular contributions
- Production deployments
- Comprehensive documentation

## 🤝 Contributing

We welcome contributions! Priority areas:

1. **Testing**: Port Python tests, add edge cases
2. **Performance**: Optimization ideas and benchmarks
3. **Documentation**: Examples and tutorials
4. **Integrations**: Framework bindings and tools

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📅 Release Philosophy

This is an open-source project maintained by volunteers. Features will be released when they're ready, tested, and documented. We prioritize:

1. **Quality over speed** - Thoroughly tested code
2. **Community needs** - Features requested by users
3. **Maintainability** - Clean, documented code
4. **Backward compatibility** - No breaking changes in minor versions

## 🏷️ Version Strategy

We maintain version **2.7.6** to match the Python eyecite version we're porting. Until we achieve full feature parity with Python eyecite v2.7.6, we'll use:

- **v2.7.6-alpha.X** - Development releases with new features
- **v2.7.6-beta.X** - Feature complete, testing phase
- **v2.7.6-rc.X** - Release candidates
- **v2.7.6** - Full parity with Python eyecite v2.7.6

### Post-Parity Versioning

Once we achieve feature parity:
- **v2.8.x** - JavaScript-specific enhancements
- **v3.0.0** - Major improvements (WebAssembly, breaking changes)
- **v4.0.0** - Next generation features (ML, multi-language)

## 📝 Notes

- This roadmap is aspirational and subject to change
- Community feedback shapes priorities
- Contributions welcome for any roadmap item
- No deadlines - features ship when ready

---

Last updated: July 2025
Version: 2.7.6-alpha.19