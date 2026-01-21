import { Address, parseAbi } from "viem";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as Address;

export const glassRunAbi = parseAbi([
  "function start_run() public returns (uint256)",
  "function jump(uint256 run_id, uint32 step, string choice) public returns (tuple(string,uint256,uint256,bool,string,uint32))",
  "function get_active_run(address player) public view returns (uint256)",
  "function get_run(uint256 run_id) public view returns (tuple(bool,string,uint256,uint256,bool))",
  "event RunFinished(address indexed player, uint256 indexed run_id, uint256 max_step)",
  "event JumpResolved(address indexed player, uint256 indexed run_id, uint32 step, string outcome, string explanation, uint32 confidence_bp, bool alive, uint256 max_step)"
]);
