# Research Summary: Sailing Route Planning Features

**Domain:** Sailing route planning and weather routing software
**Researched:** 2026-03-02
**Overall confidence:** HIGH

## Executive Summary

The sailing route planning software landscape in 2025 is dominated by specialized tools like PredictWind, SailGrib, and FastSeas, with each offering sophisticated weather routing capabilities. The market has matured beyond simple route plotting to include advanced features like 3D wave modeling, departure time optimization, and multi-model weather comparisons. Liveaboard sailors typically use multiple tools rather than relying on a single application, combining weather routing software with navigation apps for comprehensive passage planning.

Apparent wind calculations (AWS/AWA) have emerged as a key differentiator, particularly for performance sailing and accurate polar calculations. Modern routing software performs billions of calculations considering wind, waves, currents, and vessel-specific performance data to optimize routes for either speed or comfort. The industry has moved toward cloud-based processing to handle the computational complexity while delivering lightweight results to offshore sailors with limited bandwidth.

For sailing route planning extending Windy's Measure&Plan, the opportunity lies in bridging the gap between general weather visualization and specialized sailing tools. The key differentiator would be integrating apparent wind calculations directly into route planning, something that existing weather platforms don't provide but sailors actively request.

## Key Findings

**Stack:** Web-based with offline capabilities, NOAA GFS weather integration, vessel polar data processing, and NMEA compatibility for onboard systems
**Architecture:** Cloud-based routing engine with client-side visualization, supporting multi-route comparison and real-time weather overlay
**Critical pitfall:** Over-complexity without addressing core sailing needs - apparent wind calculations and departure timing optimization are more valuable than numerous routing options

## Implications for Roadmap

Based on research, suggested phase structure:

1. **AWS/AWA Integration** - Apparent wind calculation foundation
   - Addresses: Core sailing physics missing from general weather tools
   - Avoids: Building complex routing without understanding sailor workflow

2. **Basic Sailing Route Planning** - Weather-aware route creation
   - Addresses: Table stakes route plotting with wind overlay
   - Avoids: Competing with specialized tools on advanced features

3. **Departure Time Optimization** - Weather window analysis
   - Addresses: Critical sailing decision-making process
   - Avoids: Complex multi-day routing without proven value

4. **Multi-Route Comparison** - Visual route analysis
   - Addresses: Standard sailing software pattern
   - Avoids: Feature bloat before core value proven

**Phase ordering rationale:**
- AWS/AWA calculations are fundamental to sailing and missing from general weather tools
- Basic route planning builds on Windy's existing strengths
- Departure optimization addresses highest-value sailing decision
- Multi-route comparison completes competitive feature set

**Research flags for phases:**
- Phase 2: May need deeper research on sailing-specific weather data requirements
- Phase 4: Standard patterns well-established, unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Clear patterns from multiple current tools |
| Features | HIGH | Strong consensus on table stakes vs differentiators |
| Architecture | MEDIUM | General patterns clear, sailing-specific details need validation |
| Pitfalls | HIGH | Consistent themes across multiple sources and user feedback |

## Gaps to Address

- Specific AWS/AWA calculation algorithms and accuracy requirements
- Integration patterns between weather data and sailing polars
- Offshore bandwidth constraints and data optimization needs
- NMEA protocol requirements for onboard system integration