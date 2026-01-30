# Research Patterns Cheat Sheet

Quick reference for systematic research. Full details: [research-patterns.md](research-patterns.md)

---

## 1. Before You Start

```text
□ Question:    ___________________________________ (one sentence)
□ Type:        [ ] Factual  [ ] Procedural  [ ] Evaluative  [ ] Diagnostic
□ Budget:      ___ iterations / ___ minutes
□ Done when:   ___________________________________
```

---

## 2. Research Flow

```text
LOCAL FIRST → EXTERNAL → EVALUATE → TRIANGULATE → SYNTHESIZE → DECIDE
     ↓            ↓           ↓            ↓             ↓          ↓
  grep/find    docs/wiki   CRAAP test   2-3 sources   summarize   act/escalate
```

---

## 3. Source Quality Tiers

| Tier | Source | Trust |
|------|--------|-------|
| 🥇 | Official docs, RFCs, specs | High |
| 🥈 | Well-maintained GitHub repos | Medium-High |
| 🥉 | Stack Overflow (high-voted) | Medium |
| ⚠️ | Blog posts, tutorials | Verify claims |
| ❌ | AI-generated, random forums | Always verify |

---

## 4. CRAAP Test (Source Evaluation)

| Letter | Question | Red Flag |
|--------|----------|----------|
| **C**urrency | When updated? | >3 years for fast-moving tech |
| **R**elevance | Answers YOUR question? | Generic, different context |
| **A**uthority | Who wrote it? | Anonymous, no credentials |
| **A**ccuracy | Verifiable elsewhere? | Contradicts official docs |
| **P**urpose | Why written? | Marketing, vendor bias |

---

## 5. Key Techniques

### Five Whys (Diagnostic)

```text
Problem → Why? → Why? → Why? → Why? → Why? → ROOT CAUSE
```

### Steel Man (Counter Bias)

```text
1. Search: "problems with X", "why not X"
2. Find strongest counterargument
3. Can you refute it? If not, it's a real weakness
```

### Rubber Duck (Verify Understanding)

```text
Explain findings as if teaching someone.
Struggle to explain? → Don't understand it yet.
Saying "I think..." → Uncertainty to investigate.
```

---

## 6. When to Stop

| Signal | Meaning |
|--------|---------|
| 🔄 Saturation | Last 2-3 sources repeated same info |
| 🎯 Convergence | Multiple sources agree |
| 📉 Diminishing returns | Time spent >> value gained |
| ✅ Actionable | Can explain and defend approach |
| ⏱️ Budget hit | Reached iteration/time limit |

---

## 7. When Stuck (Lateral Thinking)

- [ ] Rephrase the question entirely
- [ ] Search the opposite ("why NOT to use X")
- [ ] Find adjacent solved problems
- [ ] Ask: "Who else has this problem?"

---

## 8. Quick Commands

```bash
# Wikipedia summary
curl -s "https://en.wikipedia.org/api/rest_v1/page/summary/TOPIC" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('extract',''))"

# GitHub raw file
curl -s "https://raw.githubusercontent.com/USER/REPO/BRANCH/FILE"

# Local search
grep -r "pattern" --include="*.py" --include="*.md" .
```

---

## 9. Confidence Levels

| Level | Criteria | Action |
|-------|----------|--------|
| **High** | 3+ sources agree, official docs confirm | Proceed |
| **Medium** | 2 sources, some uncertainty | Prototype first |
| **Low** | 1 source or contradictions | More research or escalate |

---

## 10. Common Mistakes

| ❌ Don't | ✅ Do |
|----------|-------|
| Trust first result | Cross-verify 2-3 sources |
| Research forever | Set iteration budget |
| Skip codebase | `grep` locally first |
| Copy without understanding | Understand the "why" |
| Ignore contradictions | Investigate why sources disagree |

---

## See Also

- **[Research Patterns](research-patterns.md)** - Full research methodology and detailed examples
- **[Token Efficiency](token-efficiency.md)** - Optimize research iterations and tool usage
- **[Code Hygiene](code-hygiene.md)** - Code quality practices including research documentation

---

*Full methodology: [research-patterns.md](research-patterns.md)*
