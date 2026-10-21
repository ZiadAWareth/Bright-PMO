import type { PulseExecutor } from '../../../core';

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Connector — delegates to the host's `connector` capability (src/connectors/connector-runtime), which
 * decrypts the connection and runs the piece's action. The executor never sees a secret: it passes a
 * connection ID. A refusal keeps its name (NotEnabled, UnknownAction, MissingValue…) for an error edge.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (!ctx.services.connector) {
    return { error: { name: 'NotAvailable', message: 'This app cannot run connectors (none is enabled).' } };
  }
  const connector = String(inputs.connector ?? '').trim();
  const action = String(inputs.action ?? '').trim();
  const connection = String(inputs.connection ?? '').trim();
  if (!connector || !action || !connection) {
    return { error: { name: 'MissingConfig', message: 'A Connector step needs a connector, an action and a connection.' } };
  }
  const saveAs = String(inputs.saveAs ?? 'connectorResult').trim() || 'connectorResult';
  if (!NAME.test(saveAs)) {
    return { error: { name: 'InvalidName', message: '"Save result as" must be a variable name, e.g. connectorResult.' } };
  }
  const props = inputs.props && typeof inputs.props === 'object' && !Array.isArray(inputs.props) ? (inputs.props as Record<string, unknown>) : {};
  try {
    const output = await ctx.services.connector({ connector, action, connection, props });
    return { outputs: { [saveAs]: output } };
  } catch (err: any) {
    return { error: { name: String(err?.name || 'ConnectorFailed'), message: String(err?.message ?? err) } };
  }
};
