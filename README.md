# 🎯 ATS-Lens AI

> **In-Browser Resume vs. Job Description ATS Matcher, Client-Side PDF Parser & Impact Bullet Optimizer.**

[![Live App](https://img.shields.io/badge/Launch-ATS--Lens_AI-00e5ff?style=for-the-badge&logo=google-chrome&logoColor=black)](https://krishnagupta-coder.github.io/ATS-Lens-AI/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Client_Side-10b981?style=for-the-badge)](https://krishnagupta-coder.github.io/ATS-Lens-AI/)
[![License: MIT](https://img.shields.io/badge/License-MIT-8b5cf6?style=for-the-badge)](LICENSE)

---

## ⚡ Features

- 📄 **Client-Side PDF Extraction**: Drop your `.pdf` resume directly in the browser via `PDF.js` — zero file uploads to external servers.
- 🔍 **Keyword Gap Radar**: Extracts high-signal technical & domain tokens from any Job Description and compares exact word-boundary coverage.
- 📊 **Impact Metric Auditor**: Flags weak phrasing (`Worked on`, `Helped`) and unquantified bullets missing measurable metrics (`%`, `ms`, scale).
- ✨ **Shared AI Engine Integration**: Automatically inherits your local Ollama or API configuration from [Krishna.OS](https://krishnagupta-coder.github.io/) for 1-click bullet rewrites.

---

## 🏗️ Pipeline

```mermaid
flowchart LR
    A["📄 PDF / Text Resume"] --> B["🔤 PDF.js Local Extractor"]
    C["💼 Target Job Description"] --> D["🧮 Keyword Tokenizer"]
    B --> E["🎯 ATS Match & Gap Engine"]
    D --> E
    E --> F["📊 Impact Metric & Verb Auditor"]
    F --> G["✨ Optional Shared AI Rewriter"]
```

---

## 📜 License

MIT License — see [LICENSE](LICENSE).

