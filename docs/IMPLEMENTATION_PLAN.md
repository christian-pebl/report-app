# SUBCAM File Conversion System - Implementation Plan

## Project Overview

This implementation creates a complete file conversion system for SUBCAM CSV data, supporting:
- **_raw → _nmax**: Per-event annotations to daily maximum individual counts
- **_raw → _obvs**: Per-event annotations to daily observation event counts

## Architecture Design

### Core Components

1. **Conversion Engine** (`conversion-engine.js`)
   - Data normalization and cleaning
   - Timezone handling (Europe/London)
   - Taxon identification and normalization
   - Core conversion algorithms

2. **Validation System** (`validation.js`)
   - Pre-conversion data quality checks
   - Post-conversion integrity validation
   - Error reporting and logging

3. **Test Framework** (`test-suite.js`)
   - Comprehensive test data generation
   - Automated validation testing
   - Performance benchmarking

4. **UI Integration** (`conversion-ui.js`)
   - File upload and conversion selection
   - Progress tracking for large files
   - Download functionality for results

## Implementation Phases

### Phase 1: Foundation & Planning ✅
- [x] Create implementation plan
- [x] Design system architecture
- [x] Define test data requirements

### Phase 2: Test Data Generation 🔄
- [ ] Generate realistic _raw CSV test data
- [ ] Create edge case scenarios
- [ ] Produce expected output files for validation

### Phase 3: Core Conversion Engine
- [ ] Implement data normalization functions
- [ ] Build timestamp parsing with timezone handling
- [ ] Create taxon identification system
- [ ] Implement _raw → _nmax algorithm
- [ ] Implement _raw → _obvs algorithm

### Phase 4: Validation & Quality Assurance
- [ ] Build pre-conversion validation
- [ ] Implement post-conversion integrity checks
- [ ] Create error reporting system
- [ ] Add data quality metrics

### Phase 5: Testing Framework
- [ ] Automated test suite for all conversions
- [ ] Edge case testing
- [ ] Performance testing with large datasets
- [ ] Validation accuracy testing

### Phase 6: User Interface Integration
- [ ] Add conversion options to main app
- [ ] Create file upload interface
- [ ] Implement conversion parameter selection
- [ ] Add progress indicators

### Phase 7: Download & Export System
- [ ] CSV file generation
- [ ] Download functionality
- [ ] Batch conversion support
- [ ] File naming conventions

### Phase 8: Performance Optimization
- [ ] Large file handling (chunked processing)
- [ ] Memory usage optimization
- [ ] Progress tracking for long operations
- [ ] Error recovery mechanisms

### Phase 9: Documentation & Examples
- [ ] User guide creation
- [ ] API documentation
- [ ] Example workflows
- [ ] Troubleshooting guide

### Phase 10: Final Integration & Testing
- [ ] Complete system integration
- [ ] End-to-end testing
- [ ] User acceptance testing
- [ ] Production deployment preparation

## Technical Specifications

### Data Processing Pipeline

```
Raw CSV Input → Normalization → Quality Filters → Conversion → Validation → Output
```

### Key Algorithms

#### _raw → _nmax Conversion:
1. Parse and normalize timestamps (Europe/London)
2. Select best taxon identifier (Scientific > Common name)
3. Calculate per-clip maximum per species per day
4. Aggregate clip maximums to daily totals
5. Generate cumulative metrics
6. Validate output integrity

#### _raw → _obvs Conversion:
1. Parse and normalize timestamps (Europe/London)
2. Select best taxon identifier (Scientific > Common name)
3. Count observation events per species per day
4. Calculate daily and cumulative metrics
5. Validate output integrity

### File Format Requirements

#### Input (_raw format):
- Required: File Name, Timestamps, Event Observation, Quantity (Nmax), Species identifiers
- Optional: Confidence Level, Quality of Video, Additional taxonomy columns
- Timezone: Europe/London localization

#### Output (_nmax format):
```
Date | Total Observations | Cumulative Observations | All Unique Organisms Observed Today | New Unique Organisms Today | Cumulative New Unique Organisms | Cumulative Unique Species | [Species Columns...]
```

#### Output (_obvs format):
```
Date | Total Observations | Unique Organisms Observed Today | New Unique Organisms Today | Cumulative Unique Species | [Species Columns...]
```

## Test Data Requirements

### Primary Test Dataset:
- **Date Range**: 30 days (2024-03-01 to 2024-03-30)
- **Species**: 15 marine species with realistic names
- **Files**: 5 different deployment files
- **Events**: ~500 observation events total
- **Quality Levels**: Mix of confidence and video quality ratings

### Edge Case Scenarios:
- Single day with multiple species
- Species appearing for first time
- Missing timestamp scenarios
- Invalid quantity values
- Duplicate file names
- Quality filtering impacts

### Expected Outputs:
- Validated _nmax conversion results
- Validated _obvs conversion results
- Performance benchmarks
- Error case examples

## Quality Assurance Strategy

### Validation Checks:
1. **Data Type Validation**: All counts are non-negative integers
2. **Monotonic Validation**: Cumulative fields always increase
3. **Consistency Validation**: Row totals match column sums
4. **Uniqueness Validation**: One row per date
5. **Completeness Validation**: All expected columns present

### Error Handling:
- Graceful handling of invalid timestamps
- Missing species identifier recovery
- Negative quantity value correction
- Comprehensive logging system

## Performance Requirements

### Target Performance:
- **Small files** (<1K rows): <1 second processing
- **Medium files** (1K-10K rows): <5 seconds processing
- **Large files** (10K-100K rows): <30 seconds with progress tracking
- **Memory usage**: <100MB for typical conversions

### Scalability Features:
- Chunked processing for large datasets
- Progress indicators for user feedback
- Efficient memory management
- Background processing capabilities

## Integration Points

### SUBCAMreport App Integration:
1. **Main Interface**: Add conversion options to existing data processing menu
2. **File Upload**: Extend current CSV upload functionality
3. **Progress Display**: Integrate with existing progress indicators
4. **Download System**: Use current file export mechanisms
5. **Error Display**: Integrate with app notification system

## Deployment Strategy

### Development Environment:
- Local testing with generated test data
- Comprehensive test suite execution
- Performance profiling and optimization

### Production Deployment:
- Integration testing with real SUBCAM data
- User acceptance testing
- Gradual rollout with fallback options
- Documentation and training materials

## Risk Management

### Identified Risks:
1. **Data Quality Issues**: Malformed input files
2. **Performance Problems**: Large file processing
3. **Memory Limitations**: Browser memory constraints
4. **User Experience**: Complex conversion options
5. **Validation Accuracy**: False positive/negative validations

### Mitigation Strategies:
- Comprehensive input validation
- Chunked processing implementation
- Memory usage monitoring
- Simplified UI with smart defaults
- Extensive testing with real data

## Success Metrics

### Technical Metrics:
- 100% test suite pass rate
- <5% memory overhead
- Processing speed targets met
- Zero data corruption incidents

### User Experience Metrics:
- Successful conversion rate >95%
- User completion rate >90%
- Support ticket reduction
- Positive user feedback

---

*This implementation plan provides a comprehensive roadmap for building a robust SUBCAM file conversion system with extensive testing, validation, and user experience considerations.*