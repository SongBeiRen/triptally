import { EventEmitter } from "node:events";

// One bus per process, surviving dev hot reloads.
const globalForBus = globalThis as unknown as { __ttBus?: EventEmitter };

export const bus =
  globalForBus.__ttBus ??
  (() => {
    const e = new EventEmitter();
    e.setMaxListeners(200); // one listener per connected SSE client
    return e;
  })();
if (!globalForBus.__ttBus) globalForBus.__ttBus = bus;

/** Broadcast that a trip changed so connected SSE clients refetch. */
export function tripChanged(tripId: string) {
  bus.emit("change", tripId);
}

export function onTripChange(tripId: string, fn: () => void) {
  const handler = (changedId: string) => {
    if (changedId === tripId) fn();
  };
  bus.on("change", handler);
  return () => bus.off("change", handler);
}
