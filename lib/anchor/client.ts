import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as borsh from "@coral-xyz/borsh";
import BN from "bn.js";
import { Buffer } from "buffer";

import { LOL_PROGRAM_ID, getMatchPDA } from "./pda";
import { connection } from "@/lib/solana/connection";
import type { OnChainMatch, MatchStatus } from "@/lib/game/types";

// ---------------------------------------------------------------------------
// Pre-computed 8-byte Anchor instruction discriminators
// sha256("global:<instruction_name>")[0..8]
// ---------------------------------------------------------------------------
const DISCRIMINATOR_CREATE_MATCH = Buffer.from(
  "6b02b891468e11a5",
  "hex",
);
const DISCRIMINATOR_JOIN_MATCH = Buffer.from(
  "f4082f82c03bb32c",
  "hex",
);
const DISCRIMINATOR_SUBMIT_RESULT = Buffer.from(
  "f02a59b40aef09d6",
  "hex",
);
const DISCRIMINATOR_CANCEL_MATCH = Buffer.from(
  "8e88f72d5c70b453",
  "hex",
);

// 8-byte discriminator for the MatchAccount struct (from the IDL)
export const MATCH_ACCOUNT_DISCRIMINATOR = Buffer.from([
  235, 36, 243, 39, 81, 16, 144, 87,
]);

// ---------------------------------------------------------------------------
// Borsh layouts for instruction args
// ---------------------------------------------------------------------------
const CREATE_MATCH_ARGS_LAYOUT = borsh.struct([
  borsh.str("matchId"),
  borsh.u64("boardSeed"),
  borsh.u64("skrWager"),
]);

const SUBMIT_RESULT_ARGS_LAYOUT = borsh.struct([
  borsh.u32("score"),
]);

// join_match and cancel_match have no args

// ---------------------------------------------------------------------------
// Borsh layout for MatchAccount deserialization
// ---------------------------------------------------------------------------
export const MATCH_STATUS_LAYOUT = borsh.rustEnum([
  borsh.struct([], "Waiting"),
  borsh.struct([], "Active"),
  borsh.struct([], "Settled"),
  borsh.struct([], "Cancelled"),
]);

export const MATCH_ACCOUNT_LAYOUT = borsh.struct([
  borsh.publicKey("creator"),
  borsh.publicKey("opponent"),
  borsh.str("matchId"),
  borsh.u64("boardSeed"),
  borsh.u64("skrWager"),
  borsh.publicKey("creatorNftMint"),
  borsh.publicKey("opponentNftMint"),
  borsh.option(borsh.u32(), "creatorScore"),
  borsh.option(borsh.u32(), "opponentScore"),
  MATCH_STATUS_LAYOUT.replicate("status"),
  borsh.u8("bump"),
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode instruction args and prepend the discriminator. */
function encodeInstructionData(
  discriminator: Buffer,
  layout?: borsh.Layout<unknown>,
  args?: Record<string, unknown>,
): Buffer {
  if (!layout || !args) {
    return discriminator;
  }
  const argsBuffer = Buffer.alloc(1000);
  const len = layout.encode(args, argsBuffer);
  return Buffer.concat([discriminator, argsBuffer.subarray(0, len)]);
}

// ---------------------------------------------------------------------------
// Transaction builders
// ---------------------------------------------------------------------------

/**
 * Build a transaction that calls `create_match` on the lol_escrow program.
 *
 * Accounts order (from IDL):
 *  0. creator          (mut, signer)
 *  1. match_account    (mut, PDA)
 *  2. creator_nft_mint
 *  3. creator_nft_token_account (mut)
 *  4. vault_nft_token_account   (mut, ATA of match_account for nft_mint)
 *  5. skr_mint
 *  6. creator_skr_token_account (mut)
 *  7. vault_skr_token_account   (mut, ATA of match_account for skr_mint)
 *  8. token_program
 *  9. associated_token_program
 * 10. system_program
 * 11. rent
 */
export function buildCreateMatchTransaction(
  creator: PublicKey,
  matchId: string,
  boardSeed: number,
  skrWager: number,
  nftMint: PublicKey,
  skrMint: PublicKey,
): Transaction {
  const [matchPDA] = getMatchPDA(creator, matchId);

  const creatorNftAta = getAssociatedTokenAddressSync(nftMint, creator);
  const vaultNftAta = getAssociatedTokenAddressSync(nftMint, matchPDA, true);
  const creatorSkrAta = getAssociatedTokenAddressSync(skrMint, creator);
  const vaultSkrAta = getAssociatedTokenAddressSync(skrMint, matchPDA, true);

  const data = encodeInstructionData(
    DISCRIMINATOR_CREATE_MATCH,
    CREATE_MATCH_ARGS_LAYOUT,
    {
      matchId,
      boardSeed: new BN(boardSeed),
      skrWager: new BN(skrWager),
    },
  );

  const ix = new TransactionInstruction({
    programId: LOL_PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: matchPDA, isSigner: false, isWritable: true },
      { pubkey: nftMint, isSigner: false, isWritable: false },
      { pubkey: creatorNftAta, isSigner: false, isWritable: true },
      { pubkey: vaultNftAta, isSigner: false, isWritable: true },
      { pubkey: skrMint, isSigner: false, isWritable: false },
      { pubkey: creatorSkrAta, isSigner: false, isWritable: true },
      { pubkey: vaultSkrAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = creator;
  return tx;
}

/**
 * Build a transaction that calls `join_match` on the lol_escrow program.
 *
 * Accounts order (from IDL):
 *  0. opponent             (mut, signer)
 *  1. match_account        (mut)
 *  2. opponent_nft_mint
 *  3. opponent_nft_token_account    (mut)
 *  4. vault_opponent_nft_token_account (mut, ATA of match_account for opponent nft)
 *  5. skr_mint
 *  6. opponent_skr_token_account    (mut)
 *  7. vault_skr_token_account       (mut, ATA of match_account for skr)
 *  8. token_program
 *  9. associated_token_program
 * 10. system_program
 * 11. rent
 */
export function buildJoinMatchTransaction(
  opponent: PublicKey,
  matchPDA: PublicKey,
  matchCreator: PublicKey,
  matchId: string,
  nftMint: PublicKey,
  skrMint: PublicKey,
  _skrWager: number,
): Transaction {
  const opponentNftAta = getAssociatedTokenAddressSync(nftMint, opponent);
  const vaultOpponentNftAta = getAssociatedTokenAddressSync(nftMint, matchPDA, true);
  const opponentSkrAta = getAssociatedTokenAddressSync(skrMint, opponent);
  // The vault SKR ATA was created during create_match; authority is matchPDA
  const vaultSkrAta = getAssociatedTokenAddressSync(skrMint, matchPDA, true);

  // join_match has no instruction args
  const data = encodeInstructionData(DISCRIMINATOR_JOIN_MATCH);

  const ix = new TransactionInstruction({
    programId: LOL_PROGRAM_ID,
    keys: [
      { pubkey: opponent, isSigner: true, isWritable: true },
      { pubkey: matchPDA, isSigner: false, isWritable: true },
      { pubkey: nftMint, isSigner: false, isWritable: false },
      { pubkey: opponentNftAta, isSigner: false, isWritable: true },
      { pubkey: vaultOpponentNftAta, isSigner: false, isWritable: true },
      { pubkey: skrMint, isSigner: false, isWritable: false },
      { pubkey: opponentSkrAta, isSigner: false, isWritable: true },
      { pubkey: vaultSkrAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });

  // Suppress unused variable lint — matchCreator/matchId included for caller convenience
  void matchCreator;
  void matchId;

  const tx = new Transaction().add(ix);
  tx.feePayer = opponent;
  return tx;
}

/**
 * Build a transaction that calls `submit_result` on the lol_escrow program.
 *
 * Accounts order (from IDL):
 *  0.  player                        (mut, signer)
 *  1.  match_account                 (mut)
 *  2.  creator_nft_mint
 *  3.  opponent_nft_mint
 *  4.  skr_mint
 *  5.  vault_creator_nft_token_account  (mut)
 *  6.  vault_opponent_nft_token_account (mut)
 *  7.  vault_skr_token_account          (mut)
 *  8.  creator_nft_token_account        (mut)
 *  9.  creator_skr_token_account        (mut)
 * 10.  opponent_nft_token_account       (mut)
 * 11.  opponent_skr_token_account       (mut)
 * 12.  creator_receive_opponent_nft     (mut) — ATA(creator, opponent_nft_mint)
 * 13.  opponent_receive_creator_nft     (mut) — ATA(opponent, creator_nft_mint)
 * 14.  token_program
 * 15.  associated_token_program
 * 16.  system_program
 * 17.  rent
 */
export function buildSubmitResultTransaction(
  player: PublicKey,
  matchPDA: PublicKey,
  score: number,
  creatorPubkey: PublicKey,
  opponentPubkey: PublicKey,
  creatorNftMint: PublicKey,
  opponentNftMint: PublicKey,
  skrMint: PublicKey,
): Transaction {
  // Vault token accounts (authority = matchPDA)
  const vaultCreatorNftAta = getAssociatedTokenAddressSync(creatorNftMint, matchPDA, true);
  const vaultOpponentNftAta = getAssociatedTokenAddressSync(opponentNftMint, matchPDA, true);
  const vaultSkrAta = getAssociatedTokenAddressSync(skrMint, matchPDA, true);

  // Player personal token accounts
  const creatorNftAta = getAssociatedTokenAddressSync(creatorNftMint, creatorPubkey);
  const creatorSkrAta = getAssociatedTokenAddressSync(skrMint, creatorPubkey);
  const opponentNftAta = getAssociatedTokenAddressSync(opponentNftMint, opponentPubkey);
  const opponentSkrAta = getAssociatedTokenAddressSync(skrMint, opponentPubkey);

  // Cross-NFT receive accounts
  const creatorReceiveOpponentNft = getAssociatedTokenAddressSync(opponentNftMint, creatorPubkey);
  const opponentReceiveCreatorNft = getAssociatedTokenAddressSync(creatorNftMint, opponentPubkey);

  const data = encodeInstructionData(
    DISCRIMINATOR_SUBMIT_RESULT,
    SUBMIT_RESULT_ARGS_LAYOUT,
    { score },
  );

  const ix = new TransactionInstruction({
    programId: LOL_PROGRAM_ID,
    keys: [
      { pubkey: player, isSigner: true, isWritable: true },
      { pubkey: matchPDA, isSigner: false, isWritable: true },
      { pubkey: creatorNftMint, isSigner: false, isWritable: false },
      { pubkey: opponentNftMint, isSigner: false, isWritable: false },
      { pubkey: skrMint, isSigner: false, isWritable: false },
      { pubkey: vaultCreatorNftAta, isSigner: false, isWritable: true },
      { pubkey: vaultOpponentNftAta, isSigner: false, isWritable: true },
      { pubkey: vaultSkrAta, isSigner: false, isWritable: true },
      { pubkey: creatorNftAta, isSigner: false, isWritable: true },
      { pubkey: creatorSkrAta, isSigner: false, isWritable: true },
      { pubkey: opponentNftAta, isSigner: false, isWritable: true },
      { pubkey: opponentSkrAta, isSigner: false, isWritable: true },
      { pubkey: creatorReceiveOpponentNft, isSigner: false, isWritable: true },
      { pubkey: opponentReceiveCreatorNft, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = player;
  return tx;
}

/**
 * Build a transaction that calls `cancel_match` on the lol_escrow program.
 *
 * Accounts order (from IDL):
 *  0. creator                   (mut, signer)
 *  1. match_account             (mut, PDA)
 *  2. creator_nft_mint
 *  3. creator_nft_token_account (mut)
 *  4. vault_nft_token_account   (mut)
 *  5. skr_mint
 *  6. creator_skr_token_account (mut)
 *  7. vault_skr_token_account   (mut)
 *  8. token_program
 *  9. system_program
 */
export function buildCancelMatchTransaction(
  creator: PublicKey,
  matchPDA: PublicKey,
  matchId: string,
  nftMint: PublicKey,
  skrMint: PublicKey,
): Transaction {
  const creatorNftAta = getAssociatedTokenAddressSync(nftMint, creator);
  const vaultNftAta = getAssociatedTokenAddressSync(nftMint, matchPDA, true);
  const creatorSkrAta = getAssociatedTokenAddressSync(skrMint, creator);
  const vaultSkrAta = getAssociatedTokenAddressSync(skrMint, matchPDA, true);

  // cancel_match has no instruction args
  const data = encodeInstructionData(DISCRIMINATOR_CANCEL_MATCH);

  // Suppress unused variable lint
  void matchId;

  const ix = new TransactionInstruction({
    programId: LOL_PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: matchPDA, isSigner: false, isWritable: true },
      { pubkey: nftMint, isSigner: false, isWritable: false },
      { pubkey: creatorNftAta, isSigner: false, isWritable: true },
      { pubkey: vaultNftAta, isSigner: false, isWritable: true },
      { pubkey: skrMint, isSigner: false, isWritable: false },
      { pubkey: creatorSkrAta, isSigner: false, isWritable: true },
      { pubkey: vaultSkrAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = creator;
  return tx;
}

// ---------------------------------------------------------------------------
// On-chain account reader
// ---------------------------------------------------------------------------

/** Map the borsh-decoded rustEnum status to our MatchStatus string. */
export function decodeMatchStatus(raw: Record<string, unknown>): MatchStatus {
  if ("Waiting" in raw) return "waiting";
  if ("Active" in raw) return "playing";
  if ("Settled" in raw) return "settled";
  if ("Cancelled" in raw) return "cancelled";
  return "waiting";
}

export const PUBKEY_DEFAULT = new PublicKey(new Uint8Array(32));

/**
 * Fetch and deserialize a MatchAccount from on-chain data.
 * Returns null if the account does not exist.
 */
export async function fetchMatchAccount(
  matchPDA: PublicKey,
): Promise<OnChainMatch | null> {
  const accountInfo = await connection.getAccountInfo(matchPDA);
  if (!accountInfo || !accountInfo.data) {
    return null;
  }

  // Skip the 8-byte Anchor discriminator
  const dataWithoutDiscriminator = accountInfo.data.subarray(8);

  const decoded = MATCH_ACCOUNT_LAYOUT.decode(
    Buffer.from(dataWithoutDiscriminator),
  );

  const opponent: PublicKey = decoded.opponent;
  const opponentNftMint: PublicKey = decoded.opponentNftMint;
  const hasOpponent = !opponent.equals(PUBKEY_DEFAULT);
  const hasOpponentNft = !opponentNftMint.equals(PUBKEY_DEFAULT);

  const creatorScore: number | null = decoded.creatorScore ?? null;
  const opponentScore: number | null = decoded.opponentScore ?? null;
  const status = decodeMatchStatus(decoded.status as Record<string, unknown>);

  // Determine winner if settled
  let winner: string | null = null;
  if (status === "settled" && creatorScore !== null && opponentScore !== null) {
    // Ties go to creator
    winner =
      creatorScore >= opponentScore
        ? decoded.creator.toBase58()
        : opponent.toBase58();
  }

  return {
    id: decoded.matchId as string,
    creator: decoded.creator.toBase58(),
    opponent: hasOpponent ? opponent.toBase58() : null,
    creatorScore,
    opponentScore,
    skrWager: (decoded.skrWager as BN).toNumber(),
    boardSeed: (decoded.boardSeed as BN).toNumber(),
    status,
    creatorNftMint: decoded.creatorNftMint.toBase58(),
    opponentNftMint: hasOpponentNft ? opponentNftMint.toBase58() : null,
    winner,
  };
}
