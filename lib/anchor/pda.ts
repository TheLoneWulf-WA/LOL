import { PublicKey } from "@solana/web3.js";

// Replace with deployed program ID after anchor deploy
export const LOL_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

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

/**
 * Derive the vault PDA for a match (holds escrowed assets).
 * seeds = ["vault", match_pda]
 */
export function getVaultPDA(matchPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), matchPDA.toBuffer()],
    LOL_PROGRAM_ID
  );
}
