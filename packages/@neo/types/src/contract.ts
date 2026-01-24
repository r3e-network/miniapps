/**
 * Smart contract-related types for Neo MiniApp SDK
 */

/** Contract invocation argument */
export interface ContractArg {
  type: "String" | "Integer" | "Boolean" | "Hash160" | "Hash256" | "ByteArray" | "Array";
  value: unknown;
}

/** Contract invocation request */
export interface ContractInvocation {
  scriptHash: string;
  operation: string;
  args: ContractArg[];
}

/** Contract invocation result */
export interface ContractInvokeResult {
  state: "HALT" | "FAULT";
  gasConsumed: string;
  stack: StackItem[];
  exception?: string;
}

/** NEO VM stack item */
export interface StackItem {
  type: "Integer" | "Boolean" | "ByteString" | "Buffer" | "Array" | "Map" | "Struct" | "Pointer" | "InteropInterface" | "Any";
  value: unknown;
}

/** Contract manifest */
export interface ContractManifest {
  name: string;
  groups: unknown[];
  features: Record<string, unknown>;
  abi: ContractAbi;
  permissions: unknown[];
  trusts: string[];
  extra: Record<string, unknown> | null;
}

/** Contract ABI */
export interface ContractAbi {
  methods: ContractMethod[];
  events: ContractEvent[];
}

/** Contract method */
export interface ContractMethod {
  name: string;
  parameters: ContractParameter[];
  returnType: string;
  offset: number;
  safe: boolean;
}

/** Contract parameter */
export interface ContractParameter {
  name: string;
  type: string;
}

/** Contract event */
export interface ContractEvent {
  name: string;
  parameters: ContractParameter[];
}
