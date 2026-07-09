# Head of Data Architecture & AI — TG Gallagher
## The Complete Winning Application Package

*Prepared for the candidate targeting Head of Data Architecture & AI at TG Gallagher (Waltham, MA) — New England's leading mechanical contractor (HVAC, plumbing, fire protection; ~400 employees, $250–300M revenue; healthcare, higher-ed, life sciences, design-build, BIM, fabrication).*

---

## 1. Positioning & Narrative Strategy

### Executive Positioning Statement

I am a construction-aware enterprise data and AI leader who has personally designed, built, and shipped production data platforms and AI products end-to-end — not a consultant who theorizes about them from a slide deck. Having grown up inside a fourth-generation family contracting business, I understand the operational reality of estimating pressure, job costing, field-to-office data gaps, and how fragmented data quietly erodes margin on every project. I pair that field credibility with hands-on command of the modern data stack — medallion architecture on Snowflake/Databricks, semantic layers, dbt-driven ELT, RAG and agentic AI, and governance — which lets me translate executive intent into architecture, and architecture into measurable operating results. For TG Gallagher, that means I can walk the fabrication shop floor and the boardroom in the same afternoon, and connect a project executive's WIP concern directly to the data model that resolves it.

My value is unusually well-matched to this role because the hardest part of a mechanical contractor's data transformation is not the technology — it is earning the trust of estimators, PMs, and field leaders while simultaneously standing up an enterprise-grade platform. I have already done both halves of that job: I have shipped modern data-and-AI products (a Pan-African news platform with a full data backend and generative-AI features; a privacy-first, RAG-powered voice companion built encryption- and governance-first), and I have lived the estimating-and-job-tracking realities of construction. I don't need a year to learn what a change order costs when the data is late — I already know, and I build systems that make that pain visible and preventable.

### 5–6 Key Differentiators to Emphasize

1. **Been-in-the-field + built-the-platform.** Rare combination of genuine construction operations exposure (estimating, scheduling, crew/job tracking) *and* hands-on modern data/AI engineering. Most candidates have one, not both.
2. **Ships production, not proposals.** I have deployed real data backends and AI products to real users — data modeling, APIs, cloud deploy, RAG, adoption — so my roadmaps are grounded in what actually works in production.
3. **AI product judgment, governance-first.** I've built RAG and LLM systems with privacy, encryption, and responsible-AI guardrails from day one — directly relevant to row-level security, model monitoring, and responsible AI adoption in the JD.
4. **Executive translator.** Strong visual communication and a training-oriented mindset — I turn data strategy into stories executives fund and end users adopt (directly serving the "cultural adoption and workshops" mandate).
5. **Local and committed.** Massachusetts-based (South Shore / Lawrence), close to Waltham — present, available, and invested in New England's construction ecosystem.
6. **Speed to value.** I think in quick wins and phased roadmaps: 90-day pilots that produce a visible executive win, not an 18-month platform build before anyone sees value.

---

## 2. Skills Gap Analysis & Bridging Plan

Honest mapping. Green = strong direct match. Yellow = adjacent/transferable, reframe. Red = genuine gap, bridge deliberately.

| JD Requirement | My Position | Status | Bridge / Reframe |
|---|---|---|---|
| 5+ yrs enterprise analytics/data eng/architecture leadership | Hands-on architecture + product leadership across multiple shipped platforms; construction ops leadership context | 🟡 | Frame total scope of ownership (architecture, delivery, stakeholders, outcomes) rather than a single W-2 title. Lead with *what I owned and shipped*, not tenure at one enterprise. Be ready to speak to depth over years. |
| Cloud DW: Snowflake/Databricks/Redshift | Built on Supabase/Postgres; deep dimensional + medallion knowledge; Databricks/Snowflake conceptual fluency | 🟡 | Stand up a free-tier Snowflake trial + dbt project this month; migrate an AfriPulse dataset into a bronze/silver/gold medallion. Now it's hands-on, not conceptual. Postgres-at-scale experience transfers directly to warehouse modeling. |
| Dimensional modeling, data vault, medallion, semantic layer | Strong — actively working in medallion + semantic layer design | 🟢 | Bring a concrete semantic-layer example (metric definitions, conformed dimensions) to interview. |
| AWS/Azure (S3, IAM, Lambda, ECS/Fargate, API Gateway, EventBridge, CloudWatch, Secrets Manager, CI/CD) | Cloud deployment via Vercel/Supabase; serverless functions, secrets, CI/CD in practice; core AWS concepts solid | 🟡 | Complete AWS Cloud Practitioner or Solutions Architect Associate study over 4–6 weeks; deploy one Lambda + API Gateway + S3 medallion demo. Reframe existing serverless/CI/CD/secrets work as the same patterns under different vendor names. |
| Strong SQL + Python | Strong — used across data modeling, APIs, AI pipelines | 🟢 | Bring code. Offer a live/whiteboard SQL exercise confidently. |
| Airflow, dbt, Kafka/event streaming, REST, GraphQL | dbt + REST/GraphQL hands-on; Airflow/Kafka conceptual | 🟡 | Add a small Airflow DAG + dbt run to the Snowflake demo. Position event-driven experience via webhooks/CDC patterns already used. |
| BI: Power BI, Tableau, semantic models, exec dashboards, self-service | Dashboard/data-product building; visual communication strength | 🟡 | Build one polished Power BI (free desktop) executive dashboard over a construction-style dataset (job cost / WIP mock) — a leave-behind. This directly closes the gap and doubles as a portfolio piece. |
| AI: LLM (Claude/ChatGPT Enterprise), RAG, vector DBs, MCP servers, agent frameworks, AI governance | **Strong** — shipped RAG + LLM products, privacy/governance-first | 🟢 | This is a signature strength. Lead with LifeLog's RAG + governance and AfriPulse's generative AI. Mention MCP/agent familiarity concretely. |
| Construction ERP/tech: Vista, Trimble Construction One, Procore, Autodesk, CMIC, Egnyte, SharePoint, M365, Salesforce, BIM/fabrication | Real construction ops exposure; not hands-on with Vista/Procore admin | 🟡→🔴 | This is the sharpest gap and the most important to handle. **Reframe:** I've lived the *business processes* these systems automate (estimating, job costing, scheduling, field tracking) — the hard part is understanding the data and workflow, and I already do. Integration is a *pattern* problem (APIs, CDC, webhooks) I've solved repeatedly; the specific connector is learnable in weeks. **Bridge:** Read Procore's and Trimble Construction One's public API docs before interview; be able to name endpoints, entities (projects, cost codes, commitments, change orders), and how you'd land them in bronze. Watch 2–3 Vista/Viewpoint data-model overviews. Speak the schema. |
| Data governance, metadata, lineage, DQ frameworks | Built governance/privacy into products; framework fluency | 🟡 | Reference a concrete governance model (see Capstone). Frame LifeLog's privacy/encryption/consent design as applied governance. |

**The honest one-liner for the ERP gap (rehearse it):** *"I haven't administered Vista or Procore, but I've lived the estimating and job-costing workflows they run, and I've built the integration patterns — API ingestion, CDC, webhook orchestration — that land their data in a warehouse. The connector is weeks of work; the business understanding is years, and I already have it."*

---

## 3. Tailored Resume Bullets & Recommendations

### 12–15 High-Impact, JD-Mapped Bullets

*(Adapt figures to your true numbers; where you don't have a hard metric, use scope/scale language rather than inventing precision.)*

1. Architected and shipped a production, cloud-native data platform end-to-end — data modeling, ELT pipelines, APIs, and application layer — proving full-lifecycle ownership from raw source to activated, user-facing product.
2. Designed a medallion-style data architecture (bronze → silver → gold) with a conformed semantic layer and standardized business definitions, enabling consistent, trusted metrics across analytics and application surfaces.
3. Built and deployed RAG (retrieval-augmented generation) systems over unstructured document corpora, integrating vector search, embeddings, and LLM orchestration to deliver accurate, source-grounded AI responses.
4. Engineered generative-AI product features (image/video generation, AI content pipelines) into a live consumer platform, translating emerging LLM capabilities into shipped, measurable user value.
5. Established governance-, privacy-, and encryption-first design standards for an AI product — including consent management and row-level access controls — operationalizing responsible-AI and data-security principles from day one.
6. Developed scalable ELT/integration patterns using REST/GraphQL APIs, webhooks, and change-data-capture-style flows to synchronize data across services in near real time.
7. Built cloud-native deployments with serverless functions, managed secrets, and CI/CD pipelines, applying the same infrastructure patterns used across AWS/Azure serverless architectures (Lambda/API Gateway/Secrets Manager equivalents).
8. Modeled operational, financial, and project data structures to support executive-grade analytics and self-service reporting, aligning data products to real decision-making needs.
9. Drove end-user adoption through hands-on training and executive-friendly visual communication, converting technical platforms into tools stakeholders actually use — directly improving decision speed.
10. Applied direct construction operations experience (estimating, job costing, scheduling, crew/field tracking) to design data solutions that close field-to-office visibility gaps and surface margin erosion earlier.
11. Prepared enterprise data platforms for investor and executive scrutiny, packaging architecture, roadmap, and business outcomes into board-ready narratives.
12. Defined AI use-case prioritization frameworks tying each opportunity to measurable business outcomes (accuracy, cycle-time reduction, cost avoidance) rather than novelty.
13. Integrated multiple third-party data sources and platforms into unified backends, establishing reusable integration standards, error handling, and data-quality checks.
14. Led architecture and roadmap decisions across a multi-quarter horizon, balancing quick-win deliverables against long-term platform investment to maintain executive momentum.
15. Designed and delivered executive dashboards and data products that translate raw operational data into KPIs leadership can act on (throughput, cost, schedule, quality).

### 3–4 Strategic Resume Recommendations

- **Lead with a "Data & AI Leader | Construction-Aware" positioning header**, not a job-title chronology. A 3-line summary at the top should state the exact narrative: shipped modern data platforms + AI products, *and* real construction operations DNA. Recruiters for this role scan for both signals in the first 5 seconds.
- **Create a "Selected Platforms & Products Shipped" section** (AfriPulse Times, LifeLog Companion, Prime Paving data/ops work) framed as portfolio deliverables with outcomes — this reframes non-traditional experience as senior ownership and sidesteps the "years at one enterprise" question.
- **Mirror the JD's vocabulary exactly** — "enterprise semantic layer," "medallion architecture," "RAG," "row-level security," "job costing," "WIP," "field productivity," "BIM/fabrication." ATS and hiring managers pattern-match; make the match obvious.
- **Add a compact "Technical Stack" band** grouped by the JD's own categories (Cloud DW / Cloud Infra / Data Eng / BI / AI / Construction Tech) so a skimming executive can confirm coverage at a glance — and honestly mark the construction-tech items as "integration-ready / business-fluent" rather than overclaiming admin experience.

---

## 4. Cover Letter (Full Version)

**[Your Name]**
[City, MA] · [Phone] · lawtondj@gmail.com · [LinkedIn]

[Date]

**Hiring Team, TG Gallagher**
Waltham, MA

Dear TG Gallagher Leadership Team,

TG Gallagher builds the mechanical systems that keep New England's hospitals, labs, and universities running — work where a missed change order, a late job-cost number, or a disconnect between estimating and the field doesn't just cost margin, it can cost schedule on a project that can't afford to slip. That is exactly the problem I want to solve as your Head of Data Architecture & AI, and it's a problem I understand from both sides of the divide most candidates only see from one.

I grew up inside a fourth-generation family contracting business, where I learned firsthand how estimating pressure, job tracking, and field-to-office data gaps play out day to day — and how fragmented, late data quietly erodes profitability one project at a time. I then spent the last several years on the other side of that problem: designing, building, and shipping production data platforms and AI products end-to-end. I've architected medallion-style data backends, built RAG systems over document corpora, deployed generative-AI features to live users, and done it all with privacy, governance, and security designed in from the first commit rather than bolted on later. I don't theorize about the modern data stack — I ship it.

I suspect TG Gallagher's data reality looks familiar: valuable information trapped in silos across your ERP (Vista or similar), Procore/Trimble, estimating and scheduling tools, HRIS/payroll, and BIM/fabrication systems — each authoritative on its own, none speaking cleanly to the others. Executives wait on WIP and job-cost visibility that's assembled by hand in spreadsheets. Estimators can't easily learn from the actuals of jobs already closed. Field productivity data never quite makes it back to the office in a form anyone can act on. And AI feels both inevitable and unclear — where does it actually create value, and how do you adopt it without creating governance and security risk? These are the exact challenges I'm built to lead through.

My plan would be to earn trust before I build: sit with your estimators, PMs, project executives, CFO, and field leaders to learn how decisions really get made, then deliver a visible quick win — a single trusted job-cost/WIP view — inside the first 90 days while I lay the foundation for an enterprise semantic layer, governed medallion architecture, and a prioritized AI roadmap. I'd stand up two or three high-ROI AI pilots tied to measurable outcomes: RAG over specs and project documents so field and PM teams get instant answers, AI-assisted estimating support that learns from historical actuals, and automated job-cost visibility that flags margin risk before it's locked in. Every step tied to a number leadership cares about — not technology for its own sake.

What I bring that's genuinely hard to find is the combination: I can talk cost codes, commitments, and change orders with a project executive in the morning and design the data model and integration architecture that serve them in the afternoon — then run the training workshop that gets the field to actually use it. I'm local to Massachusetts, I move fast, and I measure myself by adoption and business outcomes, not deliverables.

I'd welcome the chance to walk you through a target architecture and roadmap I've sketched specifically for a mechanical contractor of TG Gallagher's profile. Thank you for your consideration — I'd be glad to continue the conversation.

Respectfully,
**[Your Name]**

---

## 5. 30-60-90 Day Plan

**Guiding principle:** *Trust first, quick win fast, foundation in parallel.* Executives fund momentum. Deliver one visible win by day 90 while quietly laying the platform foundation.

### Stakeholder Map (build this in week 1)

| Stakeholder | What they care about | What I need from them | Early win to offer |
|---|---|---|---|
| CEO / President | Growth, competitive edge, strategic bets | Vision alignment, mandate | AI-readiness narrative + multi-year vision one-pager |
| COO | Operational efficiency, project delivery | Access to ops leaders, priorities | Field/project visibility pilot |
| CFO | WIP, job cost, margin, cash | Finance data access, definitions | Trusted single-source WIP/job-cost view |
| Project Executives / PMs | Project health, change orders, schedule | Real workflow walkthroughs | Project dashboard prototype |
| Chief Estimator / Precon | Estimating accuracy, bid competitiveness | Historical estimate vs actual data | Estimate-vs-actual analysis |
| IT / External IT partners | Stability, security, integration | System inventory, credentials, roadmap | Source-system strategy + partnership model |
| Field / Fabrication leaders | Productivity, coordination, less admin | Field data pain points | RAG over specs/docs pilot |

### First 30 Days — Listen, Inventory, Align

- **Listen tour:** structured 1:1s with all stakeholders above; document decisions they can't make fast enough today and the data behind them.
- **Source-system inventory & assessment:** catalog every system (ERP/Vista, Procore/Trimble, estimating, scheduling, HRIS/payroll, Egnyte/SharePoint/M365, Salesforce, BIM/fabrication) — owners, data entities, API availability, refresh cadence, quality. Deliver a one-page current-state map.
- **AI readiness baseline:** assess current-state vs target-state (data, tooling, skills, governance) — the JD explicitly asks for this framing.
- **Quick-win selection:** pick ONE painful, visible, achievable win (recommend: unified WIP / job-cost view) to ship by day 90.
- **Governance seed:** draft data-governance charter, ownership model, and first metric definitions.
- **Deliverable:** Current-state assessment + 12–18 month roadmap outline + quick-win commitment, presented to executive team.

### 31–60 Days — Foundation & Prototype

- **Platform decision:** recommend cloud DW (Snowflake or Databricks) with medallion architecture; secure budget/mandate. Justify on cost, skills, and integration fit.
- **First ingestion:** land 2–3 highest-value sources (ERP job-cost, Procore/project, estimating) into a bronze layer; begin silver conformance.
- **Semantic layer v0:** define conformed dimensions (project, cost code, phase, vendor, employee) and 8–10 core metrics (WIP, cost-to-complete, margin, change-order value, labor productivity) with signed-off business definitions.
- **Quick-win build:** develop the WIP/job-cost executive dashboard (Power BI/Tableau) against governed data.
- **AI pilot #1 kickoff:** stand up RAG over specs/project documents (see use cases below) as a contained, high-visibility proof.
- **Deliverable:** working dashboard prototype + semantic definitions + AI pilot demo.

### 61–90 Days — Ship, Prove, Scale-Plan

- **Ship the quick win:** deliver the trusted WIP/job-cost view to executives; measure time-to-insight before/after.
- **AI pilots live:** demo 2–3 pilots with measurable early results.
- **Governance operational:** data-quality checks, lineage, and access controls (row-level security) in place for the pipelines built.
- **Team & investment plan:** propose org design (data eng, analytics/BI, AI) and the multi-year investment roadmap with quantified ROI.
- **Adoption:** run the first training workshop for PMs/estimators on the new tools.
- **Deliverable:** executive readout — quick win shipped, pilots proven, roadmap + team plan funded for next phase.

### Success Metrics

- Time-to-WIP/job-cost visibility reduced from days → hours (target: same-day, self-serve).
- ≥1 executive-adopted dashboard replacing a manual spreadsheet process.
- 2–3 AI pilots with a named business metric each (see below).
- Source-system strategy and governance charter approved.
- Multi-year data & AI investment roadmap funded.

### 2–3 High-ROI AI Use-Case Pilots

1. **RAG over specs & project documents ("Project Copilot").** Ingest specs, submittals, RFIs, contracts, and closeout docs into a vector store; PMs and field ask natural-language questions and get source-cited answers. *Outcome metric:* hours/week saved searching documents; faster RFI/submittal turnaround. Low risk, high visibility, showcases my strongest skill.
2. **AI-assisted estimating support.** Use historical estimate-vs-actual data + LLM assistance to flag risk, surface comparable past jobs, and improve bid accuracy. *Outcome metric:* estimating accuracy (bid vs actual variance) and precon cycle time.
3. **Automated job-cost / margin-risk alerting.** Governed pipeline + lightweight ML/rules to flag projects trending toward margin erosion or cost-code overruns before period close. *Outcome metric:* projects flagged early; margin protected; reduced surprise write-downs.

*(Optional 4th: field-productivity insights — turn timecard/field data into crew productivity trends by trade/phase.)*

---

## 6. Interview Preparation Package

### 8–10 Likely Questions with Model (STAR) Answers

**Q1. "You haven't run a data org inside a $250M enterprise before. Why are you ready for this?"**
*Answer:* "Two things make me ready. First, I've owned the full data lifecycle in production — architecture, pipelines, semantic modeling, AI, deployment, adoption — on real shipped products, so I know where these platforms break and what it takes to make them stick. Second, I understand *your* business, not just data. I grew up in construction operations — estimating, job costing, scheduling, field tracking. The reason data transformations fail in contracting isn't the tech; it's that the estimators and PMs don't trust or adopt it. I've earned that trust before, and I know the workflows well enough to design for them from day one. I'm not learning your business on the job — I'm learning your systems, and that's weeks, not years."

**Q2. "Walk me through how you'd architect our enterprise data platform."** *(STAR-lite / model)*
*Answer:* "I'd start with a governed medallion architecture on a cloud warehouse — Snowflake or Databricks depending on your Azure/AWS footprint and team skills. **Bronze:** raw, immutable landings from each source — Vista job cost, Procore/Trimble projects, estimating, scheduling, HRIS, BIM/fab — via APIs, CDC, and webhooks. **Silver:** cleaned, conformed, deduplicated, with data-quality checks and lineage. **Gold:** business-ready dimensional models plus a governed semantic layer where WIP, cost-to-complete, margin, and change-order metrics are defined once and consumed everywhere — Power BI, self-service, and AI. On top: RAG and AI copilots reading from governed data. Around all of it: metadata, lineage, and row-level security so a PM sees their projects and finance sees everything. I'd sequence it so the first useful gold-layer dashboard ships in 90 days, not 18 months."

**Q3. "We use Vista/Procore/Trimble. You haven't administered those. Isn't that a problem?"**
*Answer (rehearsed one-liner + depth):* "I haven't administered them, but I've lived the workflows they run and I've built the integration patterns that land their data — API ingestion, CDC, webhook orchestration. I've read Procore's and Trimble Construction One's API docs; I can talk projects, cost codes, commitments, and change-order entities and how I'd stage them into bronze. The connector is weeks of work. The years-long part — understanding what a cost code means and why a PM cares — I already have. I'd rather hire someone who knows your business and can learn the API than someone who knows the API and doesn't understand a change order."

**Q4. "Tell me about a time you shipped an AI product. What went wrong and what did you learn?"** *(STAR)*
*Situation:* Built LifeLog, a RAG-powered voice companion archiving personal life-logs. *Task:* Deliver useful AI retrieval while protecting deeply sensitive data. *Action:* Designed encryption- and consent-first, built the RAG pipeline with source-grounding to fight hallucination, and set governance guardrails before scaling features. *Result/Learning:* Learned that in AI, trust *is* the product — grounding answers in real sources and being transparent about data handling mattered more than model sophistication. "That lesson maps directly to responsible-AI adoption here: for a copilot over your specs and job data, accuracy, source citation, and row-level security are what get it adopted."

**Q5. "How do you prioritize AI use cases so we don't chase shiny objects?"**
*Answer:* "Every candidate use case gets scored on business value, feasibility, and data readiness, and each must have a named metric — accuracy, cycle-time, cost avoided. I start with high-visibility, low-risk wins that showcase value and build trust: for you that's RAG over project documents. Then estimating support and job-cost/margin alerting, which touch the P&L directly. I explicitly deprioritize anything I can't tie to a number. AI strategy is a portfolio, sequenced by ROI and readiness — current state vs target state — not by hype."

**Q6. "How do you get skeptical field and estimating teams to actually adopt new tools?"** *(STAR)*
*Situation:* Non-technical users on my shipped products. *Action:* Co-designed with them, led hands-on training, used clear visual communication, and made the tool solve *their* pain first. *Result:* Adoption because it saved them time, not because it was mandated. "In construction the field is rightly skeptical of office tech. I win them by delivering something that makes their day easier first — instant spec answers via a copilot — then expand from that trust."

**Q7. "What's your approach to data governance and security — including AI?"**
*Answer:* "Governance as an enabler, not a gate. Concretely: a data ownership model (each domain has a steward), a semantic layer so metrics are defined once, metadata and lineage so people trust where numbers come from, and data-quality checks in silver. On security: role- and row-level access — PMs see their projects, finance sees all. For AI specifically: model monitoring, data-handling transparency, keeping the LLM grounded in governed sources, and controlling what data reaches external LLM services. I built privacy and consent into an AI product from day one, so this is native to how I work."

**Q8. "You're advising the CEO and CFO. How do you communicate data strategy to executives?"**
*Answer:* "In their language — outcomes, not architecture. The CFO cares about WIP accuracy, margin visibility, and cash; the CEO cares about competitive edge and growth. I translate every technical decision into that. I'm strong at visual communication, so I'll show a one-page current-state map, a phased roadmap tied to dollars, and a quick-win they can see in 90 days. Executives fund momentum and clarity, so I lead with a visible win and a story, not a platform diagram."

**Q9. "Snowflake vs Databricks — what would you pick for us and why?"**
*Answer:* "Depends on your cloud footprint and team. If you're Azure-leaning with heavier ML/AI ambitions and larger unstructured/BIM data, Databricks' lakehouse is compelling. If the priority is fast, governed SQL analytics with low operational overhead and a lean team — likely your near-term reality — Snowflake gets you to value faster with less to manage, and its data-sharing and governance are strong. For a $250–300M contractor standing up its first real platform, I'd lean Snowflake for time-to-value and simplicity, keep the medallion pattern portable, and revisit Databricks as AI/ML workloads grow. I'd validate against your actual Azure/AWS commitments before committing."

**Q10. "What would your first 90 days look like?"**
*Answer:* (Summarize the 30-60-90: listen tour + source inventory + AI-readiness baseline → platform decision + semantic layer v0 + first ingestion → ship a trusted WIP/job-cost view + 2–3 AI pilots + governance + team/investment plan.) "Trust first, one visible win by day 90, foundation built in parallel."

**Q11 (bonus). "Where do you see the biggest risk in this role?"**
*Answer:* "Adoption and trust, not technology. The platform is solvable. The risk is building something the field and estimators don't use, or overbuilding before showing value. I mitigate both by co-designing with users and shipping a visible win early. The second risk is source-system access and integration complexity — I de-risk that by inventorying and testing APIs in the first 30 days before committing to a sequence."

### 6–8 Strategic Questions to Ask Them

1. "Where does leadership feel the most pain today — is it WIP/job-cost visibility, estimating accuracy, field-to-office data flow, or something else? What's the one number you wish you could see faster?"
2. "What's the current state of the data stack — is there a warehouse today, or is reporting mostly spreadsheets and native ERP/Procore reports?"
3. "How do the core systems talk to each other right now — Vista, Procore/Trimble, estimating, scheduling, HRIS — and where do the biggest silos hurt?"
4. "How would you define success for this role at 6 and 12 months? What does 'this hire was clearly the right call' look like to the executive team?"
5. "What's the current appetite and readiness for AI — are we exploring, piloting, or is there executive urgency? Any concerns driving caution (security, data readiness)?"
6. "What does the team look like today, and what's the vision — am I building a team, inheriting one, or coordinating with external IT partners?"
7. "How do you work with your external IT partners today, and where do you want that line drawn between them and an internal data leader?"
8. "What's the executive team's relationship with data today — do they trust the numbers they get, and how are decisions made when the data is late or conflicting?"

### Key Themes & Stories to Weave Throughout

- **The two-worlds bridge** (field credibility + platform builder) — return to it repeatedly; it's your moat.
- **Trust is the product** — for both data adoption and AI (LifeLog story).
- **Ship, don't theorize** — reference real shipped products whenever asked "have you actually done this?"
- **Business outcomes over technology** — every technical point lands on a job-cost, WIP, margin, or cycle-time number.
- **Quick win, then foundation** — signals you understand executive momentum.
- **Governance-first AI** — differentiates you from candidates who bolt security on later.

---

## 7. Capstone / Portfolio Project — "Enterprise Data & AI Platform Blueprint for TG Gallagher"

*A one-page leave-behind / talking artifact. Describe it confidently; expand into slides/diagrams later.*

### Target Architecture (Medallion + Semantic Layer)

```
SOURCES            INGESTION           MEDALLION WAREHOUSE           CONSUMPTION
─────────          ─────────           ────────────────────         ───────────
Vista (ERP,        APIs / REST         ┌─────────────┐              Power BI /
 job cost, GL)     GraphQL             │ BRONZE      │  raw,        Tableau exec
Procore /          CDC                 │ (raw land)  │  immutable   dashboards
 Trimble C1        Webhooks            ├─────────────┤              ─────────────
Estimating         Event-driven        │ SILVER      │  clean,      Self-service
Scheduling         (EventBridge/       │ (conformed) │  DQ, lineage analytics
HRIS / Payroll      Kafka)             ├─────────────┤              ─────────────
Egnyte/SharePoint  Orchestration      │ GOLD        │  dimensional AI copilots /
 /M365 (docs)      (Airflow / dbt)     │ (semantic)  │  + metrics   RAG (Claude/
Salesforce (CRM)                       └─────────────┘              GPT Enterprise)
BIM / Fabrication                      Semantic layer:              ─────────────
                                       WIP, cost-to-complete,       Vector DB for
                    Governance ▶ metadata · lineage · DQ ·          docs/specs RAG
                                 row-level security · MDM
```

- **Cloud DW:** Snowflake (recommended for time-to-value) or Databricks (if Azure + heavier ML/BIM). Portable medallion pattern either way.
- **Ingestion:** dbt for transforms, Airflow for orchestration, API/CDC/webhook + event-driven for near-real-time where it matters.
- **Semantic layer:** single definition of WIP, cost-to-complete, projected margin, change-order value, labor productivity, estimate-vs-actual variance — consumed by BI *and* AI so the whole company speaks one metric language.

### Priority Integrations (sequenced)

1. **Vista (ERP)** — job cost, GL, commitments, WIP. *The financial backbone.*
2. **Procore / Trimble Construction One** — projects, RFIs, submittals, change orders, daily logs.
3. **Estimating + Precon** — bids, estimate detail (fuels estimate-vs-actual).
4. **Scheduling** — project schedules, milestones (schedule vs cost correlation).
5. **HRIS / Payroll** — labor, crews, timecards (field productivity).
6. **Egnyte / SharePoint / M365** — document corpus (fuels RAG).
7. **BIM / Fabrication** — model + shop data (multi-trade coordination, fab throughput).
8. **Salesforce (CRM)** — pipeline/backlog (growth analytics).

### 3–4 Prioritized AI Use Cases (with measurable outcomes)

| # | Use Case | What it does | Business Outcome Metric |
|---|---|---|---|
| 1 | **Project Copilot (RAG)** | NL Q&A over specs, submittals, RFIs, contracts, closeouts, cited to source | Hours/week saved searching; faster RFI/submittal turnaround |
| 2 | **AI-Assisted Estimating** | Surfaces comparable past jobs + risk flags from historical actuals | Bid-vs-actual variance ↓; precon cycle time ↓ |
| 3 | **Job-Cost / Margin-Risk Alerts** | Flags projects trending to overrun before period close | Projects flagged early; margin protected; fewer write-downs |
| 4 | **Field Productivity Insights** | Turns timecard/field data into crew productivity by trade/phase | Labor productivity visibility; better crew allocation |

### Governance Model (high level)

- **Ownership:** domain data stewards (finance, project, estimating, HR); central architecture standards.
- **Semantic layer** as the single source of metric truth; MDM for project, cost code, vendor, employee.
- **Metadata + lineage** so every number is traceable; **DQ checks** in silver.
- **Security:** role- and row-level access (PMs → their projects; finance → all).
- **AI governance:** grounding to governed sources, model monitoring, control over what data reaches external LLMs, responsible-AI guardrails, privacy by design.

### Phased 12–18 Month Roadmap

- **Phase 1 (0–3 mo) — Foundation & Quick Win:** source inventory, platform decision, first ingestions, semantic layer v0, ship trusted WIP/job-cost view, RAG pilot. *Milestone: first governed executive dashboard live.*
- **Phase 2 (3–6 mo) — Expand & Prove AI:** integrate Procore/Trimble + estimating, estimating-support pilot, job-cost alerting, governance operational, first training workshops. *Milestone: 2–3 AI pilots with metrics.*
- **Phase 3 (6–12 mo) — Scale & Self-Service:** HRIS/BIM/fab integrations, self-service analytics rollout, expand copilots company-wide, mature governance/MDM, build/grow team. *Milestone: self-service adoption + productive AI in daily use.*
- **Phase 4 (12–18 mo) — Optimize & Lead:** warehouse cost/performance optimization, advanced analytics/ML (predictive margin, schedule risk), enterprise AI platform, multi-year reinvestment. *Milestone: data & AI as a competitive advantage, measurable P&L impact.*

---

## 8. Vision One-Pager Content — "My Vision for Data & AI at TG Gallagher"

**Structure & key points for the executive one-pager:**

**Headline:** *From Data Silos to a Single Source of Truth — and AI That Pays for Itself.*

**1. The Opportunity (2–3 sentences).** TG Gallagher runs complex, high-stakes mechanical projects where margin lives and dies on timely, trusted data. Today that data is fragmented across ERP, project, estimating, scheduling, and field systems. Unifying it — and layering responsible AI on top — turns data from a reporting chore into a competitive advantage.

**2. The Vision (the destination).** One governed enterprise platform where WIP, job cost, margin, and productivity are defined once and visible instantly; where estimators learn from every closed job; where the field gets instant answers from a copilot; and where executives make faster, more confident decisions. Data and AI as an operating advantage, not an IT project.

**3. The Approach (how we get there).**
- Trust first — build with the field and finance, not at them.
- Governed medallion architecture + enterprise semantic layer.
- Quick wins in 90 days; foundation in parallel; scale over 12–18 months.
- AI prioritized strictly by measurable ROI, governed and secure by design.

**4. The Near-Term Wins (what leadership sees fast).** A single trusted WIP/job-cost view; a project-document copilot; estimating support; margin-risk alerts — each tied to a number.

**5. Why Now / Why Me (close).** AI capability and construction data maturity have converged; the contractors who move now win. I bring the rare pairing of shipped data-and-AI platforms *and* real construction operations DNA — I can build it *and* get the field to use it.

*Design note:* keep it one page, heavy on white space, one simple medallion diagram, 3–4 metric callouts. Executive-clean.

---

## 9. Overall Application & Networking Strategy

### Recommended Next Actions (sequenced)

1. **This week:** finalize resume (per Section 3), tailor cover letter, apply through the official channel. Update LinkedIn headline to the positioning statement.
2. **Before interview:** build the two portfolio proofs that close your sharpest gaps — (a) a Power BI executive dashboard over a mock construction job-cost/WIP dataset, and (b) a small Snowflake + dbt medallion demo. Read Procore + Trimble Construction One API docs and a Vista data-model overview so you can speak the schema.
3. **In parallel:** start (don't necessarily finish) AWS Cloud Practitioner/SAA study so you can say "actively certifying."
4. **Bring the Capstone** (Section 7) as a leave-behind — few candidates walk in with a target architecture already sketched for *their* company.

### LinkedIn Outreach Approach

- **Warm the network first.** Identify TG Gallagher connections (2nd-degree), New England mechanical/construction-tech people, and anyone in the Waltham construction data space. Engage genuinely before asking.
- **Target the decision-makers:** likely the CFO, COO, President, or CEO given the exec-advisory nature; possibly an IT/operations leader. A short, specific, non-needy note referencing a real pain point + your dual background outperforms a generic connect.
- **Sample DM (adapt):** *"Hi [Name] — I'm a data & AI leader with actual construction operations roots (family contracting business) who's shipped modern data platforms and RAG/AI products. I noticed TG Gallagher is investing in data architecture & AI leadership — I've sketched a target architecture for a mechanical contractor of your profile and would value 15 minutes to learn where your biggest data pain is. Either way, admire the work you do across New England's healthcare and life-sciences projects."*
- **Content play:** post 1–2 short pieces on "data & AI for mechanical contractors" (job-cost visibility, RAG over specs). It signals expertise publicly and may reach the hiring team.

### Red Flags to Proactively Address

- **Non-linear background / title question.** Get ahead of it: frame as *breadth of ownership and shipped outcomes* + rare construction fluency. Don't hide it — own it as the differentiator.
- **No named Vista/Procore admin experience.** Neutralize with the rehearsed one-liner + API-doc fluency + business-process credibility. Never overclaim; convert to strength.
- **Enterprise scale.** Preempt with the 30-60-90 and governance depth — show you think at enterprise altitude even if prior products were smaller. Emphasize you architect for scale by design.
- **Solo-builder → team-leader.** Address by emphasizing stakeholder leadership, training/adoption, and your org-design plan (Section 5).

### How to Stand Out From Other Candidates

- **Walk in with the Capstone.** Most candidates react to the JD; you arrive with a target architecture and roadmap for TG Gallagher specifically.
- **Speak construction fluently.** WIP, cost codes, change orders, fab throughput, multi-trade coordination — pure-tech candidates can't, and it instantly signals "this person gets us."
- **Show shipped AI, not slideware.** Real RAG + governance products beat "I've read about RAG."
- **Lead with adoption and outcomes.** Executives have been burned by data projects that produced dashboards nobody used. Your trust-first, quick-win, metrics-driven approach directly answers their scar tissue.
- **Be local and eager.** Presence, availability, and genuine investment in New England construction matter for a trusted-advisor role.

---

## Next Steps & Iteration Questions

To sharpen any part of this package, I need from you:

1. **Real metrics & scope:** What concrete numbers can we attach to AfriPulse, LifeLog, and Prime Paving work (users, data volume, time saved, revenue/margin impact, team size led)? This lets me harden the resume bullets from scope-language to quantified impact.
2. **Exact experience timeline & titles:** What are your actual role titles, dates, and total years of hands-on data/AI work? I need this to position the "5+ years" requirement honestly and choose the right resume format.
3. **Depth of cloud/tooling hands-on:** Which of these have you *actually* touched vs. studied — Snowflake, Databricks, dbt, Airflow, AWS/Azure services, Power BI/Tableau? I'll re-tune the gap analysis and interview answers to match reality exactly.
4. **TG Gallagher intel:** Do you have any inside knowledge or contacts — do they run Vista? Procore vs. Trimble? Current BI tool? Any known pain points or the hiring manager's identity? Even one data point lets me make the cover letter and questions dramatically more specific.
5. **Format & deliverable preferences:** Do you want me to turn any of these into finished assets — a formatted resume document, a designed one-pager/slide, or the Capstone as a visual diagram? And what's your interview timeline so we can prioritize the prep?
