import { PublicKey } from "@solana/web3.js";

// Program ID from `anchor keys list` (lol_escrow)
export const LOL_PROGRAM_ID = new PublicKey("Gxxky4YmKSaA2xN3w8h6nrfgVktB3ERNWCc8D3Qf1j6U");

/**
 * Derive the match PDA.
 * seeds = ["match", creator_pubkey, match_id_bytes]
 */
export function getMatchPDA(creator: PublicKey, matchId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("match"),
      creator.toBuffer(),
      Buffer.from(matchId),
    ],
    LOL_PROGRAM_ID
  );
}