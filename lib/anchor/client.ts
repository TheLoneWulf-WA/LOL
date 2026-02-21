import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { LOL_PROGRAM_ID, getMatchPDA, getVaultPDA } from "./pda";

/**
 * Transaction builders for the lol_escrow Anchor program.
 * These construct raw instructions without the full Anchor SDK
 * (which has Node.js deps that break in React Native).
 *
 * TODO: Implement instruction builders once IDL is generated (Phase 2, Day 6).
 */

export function buildCreateMatchInstruction(
  _creator: PublicKey,
  _matchId: string,
  _skrWager: number,
  _boardSeed: number,
  _nftMint: PublicKey
): TransactionInstruction {
  // Placeholder — will be implemented with borsh serialization in Phase 2
  throw new Error("Not yet implemented — waiting for Anchor IDL");
}

export function buildJoinMatchInstruction(
  _opponent: PublicKey,
  _matchPDA: PublicKey,
  _nftMint: PublicKey
): TransactionInstruction {
  throw new Error("Not yet implemented — waiting for Anchor IDL");
}

export function buildSubmitResultInstruction(
  _player: PublicKey,
  _matchPDA: PublicKey,
  _score: number
): TransactionInstruction {
  throw new Error("Not yet implemented — waiting for Anchor IDL");
}

export function buildCancelMatchInstruction(
  _creator: PublicKey,
  _matchPDA: PublicKey
): TransactionInstruction {
  throw new Error("Not yet implemented — waiting for Anchor IDL");
}
