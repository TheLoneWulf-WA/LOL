import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Buffer } from "buffer";

import { connection } from "@/lib/solana/connection";
import { LOL_PROGRAM_ID } from "./pda";
import {
  MATCH_ACCOUNT_DISCRIMINATOR,
  MATCH_ACCOUNT_LAYOUT,
  PUBKEY_DEFAULT,
  decodeMatchStatus,
} from "./client";
import type { OnChainMatch } from "@/lib/game/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Decode raw account data (including 8-byte discriminator) into OnChainMatch.
 * Returns null if the data is too short or doesn't match the discriminator.
 */
function decodeMatchAccount(data: Buffer): OnChainMatch | null {
  if (data.length < 8) return null;

  // Verify discriminator
  const disc = data.subarray(0, 8);
  if (!disc.equals(MATCH_ACCOUNT_DISCRIMINATOR)) return null;

  try {
    const dataWithoutDiscriminator = data.subarray(8);
    const decoded = MATCH_ACCOUNT_LAYOUT.decode(
      Buffer.from(dataWithoutDiscriminator),
    );

    const opponent: PublicKey = decoded.opponent;
    const opponentNftMint: PublicKey = decoded.opponentNftMint;
    const hasOpponent = !opponent.equals(PUBKEY_DEFAULT);
    const hasOpponentNft = !opponentNftMint.equals(PUBKEY_DEFAULT);

    const creatorScore: number | null = decoded.creatorScore ?? null;
    const opponentScore: number | null = decoded.opponentScore ?? null;
    const status = decodeMatchStatus(
      decoded.status as Record<string, unknown>,
    );

    // Determine winner if settled
    let winner: string | null = null;
    if (
      status === "settled" &&
      creatorScore !== null &&
      opponentScore !== null
    ) {
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
  } catch (err) {
    console.warn("Failed to decode match account:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all match accounts from the LOL program using getProgramAccounts.
 * Filters by the 8-byte MatchAccount discriminator via memcmp for efficiency.
 */
export async function fetchAllMatches(): Promise<OnChainMatch[]> {
  const accounts = await connection.getProgramAccounts(LOL_PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: MATCH_ACCOUNT_DISCRIMINATOR.toString("base64"),
          encoding: "base64",
        },
      },
    ],
  });

  const matches: OnChainMatch[] = [];
  for (const { account } of accounts) {
    const match = decodeMatchAccount(Buffer.from(account.data));
    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

/**
 * Fetch matches where status == "waiting" (open to join).
 */
export async function fetchOpenMatches(): Promise<OnChainMatch[]> {
  const allMatches = await fetchAllMatches();
  return allMatches.filter((m) => m.status === "waiting");
}

/**
 * Fetch matches involving a specific player (as creator or opponent).
 */
export async function fetchMyMatches(
  playerPubkey: string,
): Promise<OnChainMatch[]> {
  const allMatches = await fetchAllMatches();
  return allMatches.filter(
    (m) => m.creator === playerPubkey || m.opponent === playerPubkey,
  );
}
