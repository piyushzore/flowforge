<div align="center">
  <h1>⚡ FlowForge</h1>
  <p><strong>The Visual All-in-One Data Engineering Platform</strong></p>
  <p>Replaces Airflow, dbt, Fivetran, and Great Expectations with a unified, AI-powered drag-and-drop workspace.</p>

  <a href="https://flowforge-gold.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Demo-flowforge--gold.vercel.app-blue?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Groq%20AI-Llama%203%20%26%20GPT--OSS-F55036?style=for-the-badge" alt="Groq AI" />
</div>

---

## 🌟 Highlights & Capabilities

- 🤖 **AI Pipeline Designer (`⌘J`)**: Build complex multi-node visual DAGs from natural language prompts using Groq inference.
- 🎨 **Visual Canvas**: 60+ node types across Sources, Transformations, Destinations, and Control Flow powered by `@xyflow/react`.
- ⚡ **Complete Transform Engine**: In-browser execution for Joins, Group By + Aggregations, Null Handling, Type Casting, Window Functions, and Slowly Changing Dimensions (SCD Types 0–6).
- 🧠 **AI Transform & Custom Code**: Describe transformations in plain English to generate validated JavaScript arrow functions, or write custom JavaScript and SQL.
- 🔗 **Data Lineage**: Interactive table-level and column-level DAG visualization with upstream/downstream dependency tracing.
- 🛡️ **Data Quality & Profiler**: Automatic null %, cardinality, min/max metrics, and 0–100 Data Quality Health Scores.
- 📄 **GitOps YAML Export / Import**: Declarative round-trip YAML pipeline definitions ready for version control.
- ⏱️ **SLA & Realtime Monitoring**: Live run execution streaming via Supabase Realtime with SLA breach indicators and KPI metrics.
- 🔒 **Enterprise Secrets Manager**: Centralized, encrypted secret storage with `{{ secrets.NAME }}` template injection.
- 🛍️ **Marketplace & Templates**: 1-click cloneable pipelines for Salesforce, Shopify, Stripe, GA4, BigQuery, and Snowflake.

---

## 🏗️ Architecture

```mermaid
flowchart TD
  subgraph CLIENT["🖥️ Frontend (React 19 + Vite 8 + React Flow)"]
    CANVAS["Visual Canvas & DAG Editor"]
    AI_CHAT["AI Pipeline Designer (⌘J)"]
    MONITOR["Monitoring & Realtime Logs"]
    LINEAGE["Data Lineage & Profiler"]
  end

  subgraph AI_LAYER["🤖 AI Layer (Groq API)"]
    GROQ["openai/gpt-oss-120b & 20b\n(< 1s ultra-low latency)"]
  end

  subgraph BACKEND["⚡ Backend (Supabase)"]
    AUTH["Supabase Auth & RBAC"]
    DB["PostgreSQL\n(pipelines, runs, credentials, schedules)"]
    REALTIME["Supabase Realtime\n(live execution updates)"]
  end

  subgraph CONNECTORS["🔌 35+ Supported Connectors"]
    DBS["PostgreSQL / MySQL / Snowflake / BigQuery"]
    SAAS["Salesforce / HubSpot / Stripe / Shopify"]
    FILES["Google Sheets / CSV / S3 / GCS"]
    STREAMS["Kafka / Webhooks / REST APIs"]
  end

  AI_CHAT <-->|"Direct low-latency prompts"| GROQ
  CANVAS <-->|"Pipeline state"| DB
  MONITOR <-->|"Live run streaming"| REALTIME
  CANVAS -->|"Execution engine"| CONNECTORS
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘ + J` / `Ctrl + J` | Open AI Pipeline Designer |
| `⌘ + Z` / `Ctrl + Z` | Undo canvas change |
| `⌘ + Shift + Z` / `Ctrl + Y` | Redo canvas change |
| `Backspace` / `Delete` | Remove selected node |
| `Space + Drag` | Pan canvas |
| `?` | Open Keyboard Shortcuts Cheat Sheet |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Free Supabase project ([supabase.com](https://supabase.com))
- Free Groq API key ([console.groq.com](https://console.groq.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/piyushzore/flowforge.git
cd flowforge

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### Environment Configuration (`.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GROQ_API_KEY=your-groq-api-key # Optional: can also be configured in-app
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📜 Database Migrations

Apply the migration in `supabase/migrations/20261019_credentials_and_runs.sql` to your Supabase project to enable persistent credentials, pipeline runs, and schedules with Row Level Security (RLS).

---

## 📄 License

MIT License. Built with passion for data engineers.
