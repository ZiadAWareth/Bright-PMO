import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'integration.connector',
  category: 'integration',
  label: 'Connector',
  description: 'Runs an action of a connected system (Gmail, Google Sheets, Oracle, SAP Ariba, NetSuite, SQL Server).',
  icon: 'plug',
  async: 'never',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  // The first 90 characters of each help are what the Workflow AI sees; the contract leads.
  { key: 'connector', widget: 'connector', label: 'Connector', type: 'string', required: true,
    help: 'An ENABLED connector id: gmail, google-sheets, oracle-database, sap-ariba, netsuite… (Connections page).' },
  { key: 'action', widget: 'connectorAction', label: 'Action', type: 'string', required: true,
    help: 'The connector action name, e.g. send_email, insert_row, find_rows, list_purchase_orders.' },
  { key: 'connection', widget: 'connection', label: 'Connection', type: 'string', required: true,
    help: 'Id of a connection from the Connections page — never a password or key.' },
  { key: 'props', label: 'Inputs', type: 'json', default: {},
    help: 'The action inputs; values may use {{templates}} (e.g. to: {{record.email}}).' },
  { key: 'saveAs', label: 'Save result as', type: 'string', default: 'connectorResult',
    help: 'The variable the connector answer is written to.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'props', label: 'Action inputs' }],
  outputs: [{ key: '{saveAs}', label: 'The connector answer', description: 'Written under the configured name (default connectorResult).' }],
};
