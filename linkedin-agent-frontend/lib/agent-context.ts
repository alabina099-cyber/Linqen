import { AsyncLocalStorage } from "async_hooks";

export interface AgentContext {
  userId: number | null;
}

export const agentContext = new AsyncLocalStorage<AgentContext>();
