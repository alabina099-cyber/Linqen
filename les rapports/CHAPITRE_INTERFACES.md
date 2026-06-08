# Chapter: User Interfaces of the Qlinqen Platform

---

## Introduction

The **Qlinqen** platform exposes its features through two complementary layers of visual interfaces: a **web dashboard** (Single Page Application) built with Next.js, accessible from any browser, and a **Chrome extension** providing contextual and immediate access to essential information. The access architecture is built on a **two-level role system** — Administrator and Member — which determines the full set of views and features available to each user profile.

---

## 1. Login Page — Unified Entry Interface

The login page (`/login`) is the first screen encountered by any user of the platform. It acts as a **role-selection entry point**: rather than imposing a single form, the interface presents two interactive cards that allow the user to identify themselves according to their profile.

**Administrator Mode — LinkedIn Login:**
The administrator connects by providing their LinkedIn session cookie (`li_at`), which can be retrieved manually from the browser DevTools or automatically via the Chrome extension using the _"Retrieve via extension"_ button. This mechanism allows the platform to act directly on the administrator's LinkedIn account without storing their credentials — a deliberate security choice. Once connected, the administrator automatically gains all platform management privileges.

**Member Mode — Credentials Login:**
Team members connect using an email address and password created by their administrator through the user management interface. Their session is managed by a JWT token stored client-side, automatically injected into all requests to the internal API.

> **Key strength:** The role separation enforced at the login page ensures a clear experience and eliminates any ambiguity in rights management. The automatic cookie retrieval integration via the Chrome extension significantly reduces friction for the administrator.

---

## 2. Web Dashboard — Next.js Application

### 2.1 Interface Architecture

The dashboard is a **Single Page Application (SPA)** orchestrated by the `Dashboard.tsx` component. Navigation relies on a **sticky Header** (`Header.tsx`) positioned at the top of the screen and present across all views. This header contains:

- The platform **logo** (Qlinqen) on the left;
- A **central navigation bar** composed of adaptive tabs based on the logged-in user's role;
- On the right: the **notifications icon**, a shortcut to **Settings**, the **user avatar** with name, email address, and a **role badge** ("Admin" in blue, "Member" in indigo), along with the **logout** button.

The active tab is highlighted with a white background, a subtle shadow, and a colored icon, providing immediate visual feedback on the current section. Navigation is also persisted in the URL hash (`#prospects`, `#campaigns`, etc.), enabling bookmarking of a specific view.

> **Key strength:** Role-adaptive navigation is fully transparent to the user — each profile only sees the tabs relevant to them, with no error pages or explicit redirects. The permanently visible role badge reinforces contextual clarity.

---

### 2.2 Administrator Interface — 7 Tabs

The administrator has full access to all platform modules. Their default landing page is the **BI Dashboard**.

#### Tab 1 — BI Dashboard _(Administrator Exclusive)_

The analytics dashboard (`BIShell`) is the strategic control center of the prospecting operation. It is structured into seven interconnected analytical modules, fed in parallel by four simultaneous API calls (`Promise.all`) to minimize loading time:

- **KPI Hero**: Six key metrics displayed as color-coded cards — prospects contacted, reply rate, conversion rate, connection requests sent, messages sent, and accepted connections — each accompanied by a percentage change relative to the previous period.
- **AI Insights**: An automatic narration module that synthesizes cross-module data into actionable observations (wins, alerts, recommendations) without any manual intervention.
- **Conversion Intelligence**: Full six-stage conversion funnel analysis featuring a Sankey diagram, a funnel chart with drop-off rates at each stage, and a cycle time table measuring the average prospect progression duration.
- **Template Lab**: A message analysis laboratory based on a message pattern normalization algorithm that automatically identifies high-reply-rate structures and keywords without any predefined catalog.
- **Prospect Map**: A two-dimensional prospect mapping by industry (treemap), sector, and ICP positioning (Score × Engagement quadrant) to identify profiles to prioritize.
- **Agent Analytics**: AI agent performance dashboard measuring tool usage, automated action success rate, and **quantified ROI** in hours saved and monetary value.
- **Forecast**: A forecasting module using an OLS linear regression implemented server-side in TypeScript (with no external ML library dependency) to project conversion trends over 30 days, complemented by an interactive what-if simulator.

A **period filter** (7 / 14 / 30 / 90 days) is available in the dashboard header and applies simultaneously to all modules. A native **PDF export** button is also integrated.

> **Major key strength:** This dashboard transforms raw agent data into actionable strategic intelligence. Automatic bottleneck detection, ROI quantification, and the predictive simulator are strong differentiating elements that elevate the platform to the level of a commercial management tool.

---

#### Tab 2 — Prospects Pipeline

The prospect management interface (`ProspectsPipeline.tsx`) presents all LinkedIn profiles identified and tracked by the agent as a **prospecting pipeline**. It offers:

- A **search bar** with real-time filtering by name, company, or sector;
- **Multi-criteria filters** (status, score, industry, location);
- A **kanban or list view** by funnel stage (discovered, contacted, replied, qualified, converted);
- A **detailed profile card** accessible by click, including profile information, ICP fit score, interaction history, and available actions;
- **Progress badges** and visual indicators (color-coded score, avatar initials, industry tags).

> **Key strength:** The pipeline provides complete, filtered visibility into each prospect's progress through the funnel, enabling manual management that complements the agent's automation.

---

#### Tab 3 — Campaigns

The campaigns interface (`Campaigns.tsx`) is the configuration and supervision module for automated LinkedIn prospecting campaigns. It enables:

- **Campaign creation** with definition of name, objective, targeting criteria (sector, job title, location), and daily action budget;
- **Message template configuration** for connection requests and follow-ups, customizable with dynamic variables;
- **Automation rules definition** (delays between actions, approval thresholds, execution time windows);
- **Real-time monitoring** of each active campaign (progress rate, reply statistics, pending actions);
- **Campaign lifecycle management** (activation, pause, archiving).

> **Key strength:** The granular campaign configuration — combining precise targeting, custom templates, and automation rules — offers a level of control comparable to specialized SaaS tools, while remaining fully integrated within the platform.

---

#### Tab 4 — Approval Queue

The approval queue (`ApprovalQueue.tsx`) is the central interface for the platform's **human control mechanism**. It lists in real time (automatic polling) all actions generated by the AI agent that require manual validation before being executed on LinkedIn. Each entry displays:

- The **action type** (connection request, follow-up message, invitation);
- The **target profile** with name and LinkedIn URL;
- The **AI-generated message content** (expandable for full reading);
- The **current status** (pending, approved, rejected, failed);
- **Action buttons**: Approve / Reject, with bulk processing support (multi-selection).

A **status filter** system and a **global counter** per category provide an instant overview of the validation workload.

> **Key strength:** The approval queue embodies the "Human-in-the-Loop" principle at the heart of the platform's architecture — the AI agent prepares, the human validates, the extension executes. This mechanism prevents any unintended action on the real LinkedIn account while preserving the full benefit of automation.

---

#### Tab 5 — AI Agent

The AI Agent interface (`AgentChat.tsx`) is a **chat-style conversational interface** allowing the user to interact in natural language with the agent to drive prospecting. It offers:

- A **conversation thread** with persisted history (by `conversationId`), visually distinguishing user messages from agent responses;
- An **input field** with Enter-to-send and an animated loader indicating the agent is processing;
- A **quick suggestions panel** as clickable buttons for frequent requests (analyze a prospect, generate a message, launch a search, check the approval queue);
- A **previous conversations history** accessible from a side panel;
- A **real-time activity feed** displaying actions currently being executed by the agent (LinkedIn actions in transit).

> **Key strength:** The conversational interface lowers the usage barrier by enabling full system control in natural language — without requiring any knowledge of the platform's internal structure.

---

#### Tab 6 — Settings

The settings panel (`Settings.tsx`) is organized into **four sub-tabs** accessible via an internal navigation bar:

- **Account**: Profile information (name, email, company), LinkedIn account integration (connect/disconnect, session status, permissions), and password management. The `LinkedInAccount` component is embedded here to display the precise connection state and LinkedIn action quotas.
- **AI Agent**: Fine-grained configuration of agent behaviors — selected AI model, daily action limits, execution time windows, inter-action delays, and minimum score threshold for targeting a prospect.
- **Notifications**: Selection of alert-triggering events (new reply, failed action, completed campaign) and notification channels (in-app, email).
- **Appearance**: Visual preferences — interface language (French / English), theme (light / dark / system), font size, and display density.

> **Key strength:** The clear segmentation of settings into four functional categories avoids cognitive overload and makes configuration accessible even to non-technical users.

---

#### Tab 7 — User Management _(Administrator Exclusive)_

The team management interface (`UsersManagement.tsx`) is **entirely reserved for the administrator** — any direct access attempt from a member account is blocked with an access-denied message. It allows the administrator to manage up to **10 secondary member accounts** on their platform:

- A **members table** listing for each account: initialized avatar, name, email, company, role ("Member"), and active/inactive status;
- A **search bar** by name or email to quickly filter the list;
- A **counter** of members created against the maximum allowed quota;
- A **creation form** (modal) to define the full name, email, company (optional), and initial password of the new member;
- An **edit form** (modal) to update information or reset the password;
- A **status toggle button** (Active / Inactive) to temporarily disable access without deleting the account;
- A **delete button** with a confirmation modal to prevent accidental deletions.

> **Key strength:** This module gives the administrator complete control over the access lifecycle — creation, editing, temporary deactivation, and permanent deletion — without requiring any technical intervention. The 10-member limit is visible and enforced directly within the interface.

---

### 2.3 User / Member Interface — 5 Tabs

Team members access a streamlined version of the dashboard focused on the operational tasks of prospecting. Their **default landing page is the AI Agent** — a direct entry point to interaction with the agent. The available tabs are:

| Tab                | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| Prospects Pipeline | Full pipeline access (identical to the admin's view)        |
| Campaigns          | Browsing and tracking of prospecting campaigns              |
| Approval Queue     | Validation of AI-generated actions within campaigns         |
| AI Agent           | Conversational interface (default landing page for members) |
| Settings           | Account, agent, notification, and appearance configuration  |

Members have no access to the **BI Dashboard** or **User Management**. These restrictions are enforced both client-side (tabs hidden in the Header) and server-side (API routes protected by JWT role verification).

> **Key strength:** The strict separation of responsibilities between the administrator (strategic oversight, team management, analytics) and the member (operational execution, agent interaction) aligns with a secure, professional delegation model.

---

## 3. Chrome Extension — Compact Contextual Interface

The Chrome extension (`linkedin-chrome-extension/`) brings the platform directly into the user's browser without requiring the dashboard to be opened. Its popup interface (380px wide), accessible by clicking the extension icon, is structured into five sections:

**Gradient Header:**
A blue-indigo-violet banner displaying the platform name, an identity icon, and the global agent status (active / paused / inactive) with a color-coded dot indicator.

**Connectivity Pills:**
Two distinctive visual indicators signaling in real time the connection state of the **backend server** and the active **LinkedIn session**. These pills turn green (connected), orange (degraded), or red (disconnected) based on the actual service state.

**Alerts Section:**
Display area for recent alerts requiring user attention (failed actions, LinkedIn quota approaching, new replies received).

**Daily Summary:**
Four numerical counters summarizing the day's activity: actions **pending** approval, **completed** actions, **failed** actions, and **total** actions generated.

**Recent Actions:**
List of the latest executed or in-progress actions (connection requests sent, messages delivered, profiles scraped), with a timestamp and status for each entry.

**Footer:**
Quick-action buttons to open the web dashboard directly in a new tab.

> **Key strength:** The extension turns the browser into a passive monitoring terminal — the user gets an instant overview of the platform's state without leaving their LinkedIn session, making it particularly well-suited for real prospecting conditions.

---

## 4. Role-Based Access Summary

| Interface / View         | Administrator |      Member      |
| ------------------------ | :-----------: | :--------------: |
| Login page (dual-mode)   | ✅ (LinkedIn) | ✅ (Credentials) |
| BI Dashboard             | ✅ (default)  |        ❌        |
| Prospects Pipeline       |      ✅       |        ✅        |
| Campaigns                |      ✅       |        ✅        |
| Approval Queue           |      ✅       |        ✅        |
| AI Agent                 |      ✅       |   ✅ (default)   |
| Settings (4 sub-tabs)    |      ✅       |        ✅        |
| User Management          |      ✅       |        ❌        |
| Chrome Extension (popup) |      ✅       |        ✅        |

---

## 5. Summary Paragraph

The Qlinqen platform offers two layers of visual interfaces designed around a **role and usage-context logic**. The web dashboard, built with Next.js, gives the administrator seven complementary views spanning from strategic analytics (the BI Dashboard with its seven intelligence modules) to team management (creation and administration of up to ten member accounts), along with operational supervision of campaigns, the prospects pipeline, and the human approval queue. Members, on the other hand, access five views focused on the daily execution of prospecting tasks, with the AI Agent conversational interface as their natural entry point. Navigation is managed by an adaptive Header that exposes only the tabs relevant to the logged-in user's role and permanently displays a role badge to eliminate ambiguity. In addition, the Chrome extension provides a compact contextual monitoring window — connectivity pills, daily summary, alerts, and recent actions — enabling platform supervision without leaving the LinkedIn environment. All interfaces share a consistent design system (Tailwind CSS, shadcn/ui components, Framer Motion animations) ensuring a smooth, professional user experience across desktop, tablet, and mobile devices.

---

_Document prepared for the Final Year Project (PFE) Report_
_Project: AI-Powered LinkedIn Prospecting Agent — Qlinqen Platform_
