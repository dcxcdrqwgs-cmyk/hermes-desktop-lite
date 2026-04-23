# Hermes Desktop Lite Project Analysis Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conduct a comprehensive analysis of the hermes-desktop-lite project, understanding its structure, tech stack, coding conventions, features, and identifying optimization opportunities to inform subsequent development.

**Architecture:** Analysis will be performed using parallel exploration where possible: high-level metadata gathering, codebase exploration, pattern detection, and documentation review will happen concurrently. Results will be synthesized into a structured summary.

**Tech Stack:** To be discovered during analysis.

---

### Task 1: Collect Project Metadata

**Files:** N/A (reading only)

- [ ] **Step 1:** List root directory contents

Tool: `read` on `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite`

- [ ] **Step 2:** Read `package.json` (if exists) to extract dependencies, scripts, engines

Tool: `read` file at root

- [ ] **Step 3:** Read `README.md` (if exists) for project overview

- [ ] **Step 4:** Read configuration files: `tsconfig.json`, `.eslintrc.*`, `.nvmrc`, etc. (if present)

- [ ] **Step 5:** Extract tech stack: language (TypeScript/JavaScript), framework (React, etc.), build tools, test frameworks

### Task 2: Map Folder Structure

**Files:** N/A

- [ ] **Step 1:** Recursively list top-level directories (depth 2) to understand organization

Tool: `read` on root, then read subdirectories like `src/`, `app/`, `public/`, `docs/`, etc.

- [ ] **Step 2:** Identify primary source code location (likely `src/` or similar)

- [ ] **Step 3:** Identify test directories, config directories, asset directories

- [ ] **Step 4:** Document the purpose of each major folder based on its contents

### Task 3: Identify Entry Points

**Files:** N/A

- [ ] **Step 1:** From `package.json`, locate `main` field (if Node) or `scripts.start` entry

- [ ] **Step 2:** Identify browser entry point (e.g., `index.html`, `src/main.tsx`, `src/App.tsx`)

- [ ] **Step 3:** Determine bootstrapping code (ReactDOM.render, createRoot, etc.)

- [ ] **Step 4:** Document the application startup flow from entry to UI

### Task 4: Discover Core Modules and Data Flow

**Files:** N/A

- [ ] **Step 1:** Use explore agent to find state management implementation

Prompt: "Find state management store, context providers, or state-related files in src/."

- [ ] **Step 2:** Use explore agent to locate API/service layer

Prompt: "Find API client setup, service files, data fetching hooks."

- [ ] **Step 3:** Use explore agent to identify routing configuration

Prompt: "Find routing definitions, route components, page files."

- [ ] **Step 4:** Map the data flow: entry → state → UI

### Task 5: Analyze Coding Style and Conventions

**Files:** Sample 3-5 source files from different layers

- [ ] **Step 1:** Select representative files: a component, a utility, a hook, a service

- [ ] **Step 2:** Read each file to observe naming conventions, file naming, import/export style, type usage, error handling, comment style

- [ ] **Step 3:** Check for linting/formatting config (ESLint, Prettier) and note rules if evident

- [ ] **Step 4:** Summarize coding conventions in bullet points

### Task 6: Inventory Implemented Features

**Files:** Code, README, docs

- [ ] **Step 1:** Scan `src/` for component names, feature folders, route names to list UI features

- [ ] **Step 2:** Check for feature flags or conditional logic that might hide incomplete features

- [ ] **Step 3:** Review any existing documentation or changelogs

- [ ] **Step 4:** Compile a list of major functional areas

### Task 7: Identify Unfinished or Incomplete Features

**Files:** Code and documentation

- [ ] **Step 1:** Search for TODO, FIXME, @todo comments in code

Tool: `grep` for patterns "TODO", "FIXME", "@todo"

- [ ] **Step 2:** Look for placeholder components, stub functions, empty implementations

- [ ] **Step 3:** Identify any partially implemented screens or workflows

- [ ] **Step 4:** Document incomplete areas and their current state

### Task 8: Spot Potential Optimizations and Issues

**Files:** Codebase-wide

- [ ] **Step 1:** Use explore agent to find performance-sensitive code

Prompt: "Find components with large data renders, useEffect with heavy dependencies, expensive loops."

- [ ] **Step 2:** Look for repeated patterns that could be abstracted

- [ ] **Step 3:** Check for any obvious security concerns (exposed keys, unsafe innerHTML)

- [ ] **Step 4:** Note any accessibility red flags (missing alt text, ARIA misuse)

- [ ] **Step 5:** List potential improvements with brief rationale

### Task 9: Synthesize and Produce Final Summary

**Files:** N/A (writing)

- [ ] **Step 1:** Consolidate findings from all tasks into a coherent structure

- [ ] **Step 2:** Draft a concise summary with sections: Project Overview, Tech Stack, Structure, Features, Conventions, Unfinished Work, Recommendations

- [ ] **Step 3:** Ensure summary is clear, bullet-pointed, and actionable

- [ ] **Step 4:** Deliver the summary to the user

---

## Execution Notes

- Tasks 1-3 are foundational and should be completed before deeper analysis to provide context.
- Tasks 4, 5, 6, 7, 8 can be run in parallel after foundational tasks, as they are independent.
- Task 9 depends on all previous tasks.
- Use `explore` agents for discovery tasks (Tasks 4, 8) with targeted prompts.
- Use `grep` for textual searches (Task 7).
- All file reads should be done with the `read` tool; all searches with `grep` or `explore` as appropriate.
