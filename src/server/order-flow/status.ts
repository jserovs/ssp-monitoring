import type { JourneyStatus } from "./types";

export const STATUS: Record<string, JourneyStatus> = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In Progress",
  ERROR: "Error",
  NOT_REACHED: "Not Reached",
};

function isErrorFlag(flag: string | null | undefined): boolean {
  return typeof flag === "string" && flag.toUpperCase().startsWith("E");
}

export function mapFlagsToStatus(flags: Array<string | null | undefined>): JourneyStatus {
  if (!flags || flags.length === 0) {
    return STATUS.NOT_REACHED;
  }

  if (flags.some((flag) => isErrorFlag(flag))) {
    return STATUS.ERROR;
  }

  if (flags.some((flag) => String(flag).toLowerCase() === "x")) {
    return STATUS.IN_PROGRESS;
  }

  if (flags.some((flag) => String(flag).toUpperCase() === "P")) {
    return STATUS.COMPLETED;
  }

  return STATUS.NOT_REACHED;
}
