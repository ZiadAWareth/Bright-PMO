import type { Pulse, PulseManifestEntry } from './pulse.contract';

/**
 * Central registry of all Pulses. The parallel interpreter resolves a node's
 * namespaced `type` here; the designer reads the serialized manifest to render
 * palette + properties + I/O generically.
 */
export class PulseRegistry {
  private readonly pulses = new Map<string, Pulse>();

  register(pulse: Pulse): this {
    if (this.pulses.has(pulse.meta.type)) {
      throw new Error(`PulseRegistry: duplicate pulse type "${pulse.meta.type}"`);
    }
    this.pulses.set(pulse.meta.type, pulse);
    return this;
  }

  registerAll(pulses: Pulse[]): this {
    for (const p of pulses) this.register(p);
    return this;
  }

  has(type: string): boolean {
    return this.pulses.has(type);
  }

  get(type: string): Pulse | undefined {
    return this.pulses.get(type);
  }

  all(): Pulse[] {
    return [...this.pulses.values()];
  }

  /** The execute-free view the designer consumes (palette + properties + I/O). */
  manifest(): PulseManifestEntry[] {
    return this.all().map(({ meta, config, io }) => ({ meta, config, io }));
  }
}
