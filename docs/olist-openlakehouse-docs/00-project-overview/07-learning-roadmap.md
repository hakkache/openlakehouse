# 07 — Learning Roadmap

**Content type: PROJECT IMPLEMENTATION** (navigation aid over this
repository).

## Purpose

Give a single ordered reading list tying every module in this repository
together, cross-referenced by the reader goal it serves. See also
[`README.md`](../README.md) for the same paths in a more skimmable form.

## The dependency graph between modules

```mermaid
flowchart TD
    OV[00 Project Overview] --> ARCH[01 Architecture]
    ARCH --> MODEL[02 Source & Data Model]
    MODEL --> BRONZE[03 Bronze Ingestion]
    BRONZE --> SILVER[04 Silver Transformation]
    SILVER --> PB[05 Pipeline Builder]
    PB --> DBT[06 dbt]
    MODEL --> DIM[07 Dimensional Modeling incl. full SCD2]
    SILVER --> DIM
    DBT --> DIM
    PB --> ADV[08 Advanced Data Engineering]
    DBT --> ORCH[09 Orchestration]
    PB --> ORCH
    SILVER --> DQ[10 Data Quality]
    PB --> LIN[11 Lineage & Governance]
    DIM --> BI[12 BI & Analytics]
    DIM --> ML[13 Machine Learning]
    BRONZE --> STREAM[14 Streaming & CDC]
    ORCH --> OBS[15 Observability]
    ARCH --> SEC[16 Security]
    ARCH --> DEVOPS[17 DevOps & Version Control]
    ARCH --> OPS[18 Platform Operations]
    ARCH --> AI[19 AI Assistant]
    DIM --> TEST[20 Testing]
    OBS --> PROD[21 Production Scenarios]
    SEC --> PROD
    TEST --> CAP[22 Capstone]
    PROD --> CAP
```

## Reading order by goal

1. **"I just want to understand the platform"** → `00` → `01` → skim `23-reference/glossary.md`.
2. **"I want to build the whole Olist project myself"** → follow modules
   `00` through `22` roughly in numeric order — each module's documents
   are self-contained but reference prior modules' terminology/diagrams.
3. **"I only care about dimensional modeling / SCD2"** → `02` → `07`
   (all 15 documents — this is the deepest single module in the repo).
4. **"I need to debug something right now"** →
   `23-reference/troubleshooting.md` first, then the relevant module's
   "failure scenarios" document (every module from `03` onward has one).
5. **"I'm prepping for an interview/architecture review"** →
   `01-architecture/09-architecture-decisions.md` →
   `23-reference/interview-questions.md`.

## What "done" looks like for a self-study reader

Work through the `22-capstone/01-24-phase-capstone-project.md` phase
checklist — it references every module in this repository and is the
single authoritative "have I actually built this" checklist, replacing the
original guide's Chapter 23 flat checklist with a phased implementation
project.
