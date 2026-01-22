import { Address, parseAbi } from "viem";

export const CONTRACT_ADDRESS_RAW = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export function hasValidContractAddress() {
  return CONTRACT_ADDRESS_RAW.startsWith("0x") && CONTRACT_ADDRESS_RAW.length === 42;
}

export function getContractAddress(): Address {
  return CONTRACT_ADDRESS_RAW as Address;
}

export const glassRunAbi = parseAbi([
  "function start_run() returns (uint256)",
  "function jump(uint256 run_id, uint32 step, string choice) returns (string)",
  "function get_active_run(address player) view returns (uint256)",
  "function get_run(uint256 run_id) view returns (bool,address,uint32,uint32,bool)",
  "function get_last_jump(uint256 run_id) view returns (string,string,uint32,uint32,bool,uint32)",
  "event RunFinished(address indexed player, uint256 indexed run_id, uint256 max_step)",
  "event JumpResolved(address indexed player, uint256 indexed run_id, uint32 step, string outcome, string explanation, uint32 confidence_bp, bool alive, uint256 max_step)",
]);
