import { toast } from "sonner";

/**
 * The client has no backend yet: it is a pure frontend until the new
 * integration (see AGENTS.md).
 *
 * Every user action that would save, change or fetch something on a server
 * calls this instead, and every screen that would load data starts empty with
 * a `// notConnected:` comment saying what it loaded. Searching for
 * `notConnected` therefore lists every integration point.
 */
export function notConnected(action = "This action"): void {
  toast.info(`${action} is not connected to a backend yet.`);
}
